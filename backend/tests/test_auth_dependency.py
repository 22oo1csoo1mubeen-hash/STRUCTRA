"""Authentication dependency tests."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api import dependencies
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser


@pytest.mark.parametrize("token", ["invalid-token", "expired-token"])
def test_upload_rejects_invalid_or_expired_token(monkeypatch, token: str) -> None:
    """A Supabase-rejected token returns 401 without exposing token details."""
    rejected_token = AsyncMock(
        side_effect=HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    )
    monkeypatch.setattr(dependencies, "get_authenticated_user", rejected_token)

    response = TestClient(app).post(
        "/documents/upload",
        files={"file": ("receipt.pdf", b"valid", "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired authentication token."
    rejected_token.assert_awaited_once_with(token)


def test_upload_accepts_verified_token(monkeypatch) -> None:
    """A Supabase-verified token allows normal document validation to proceed."""
    verified_token = AsyncMock(return_value=CurrentUser(user_id="user-123"))
    monkeypatch.setattr(dependencies, "get_authenticated_user", verified_token)
    monkeypatch.setattr(
        document_routes,
        "upload_document_to_storage",
        AsyncMock(return_value="user-123/test-document.pdf"),
    )
    monkeypatch.setattr(
        document_routes,
        "create_document_metadata",
        AsyncMock(
            return_value=SimpleNamespace(
                id=uuid4(), status="uploaded", created_at=datetime(2026, 1, 1, tzinfo=UTC)
            )
        ),
    )
    app.dependency_overrides[get_settings] = lambda: type(
        "Settings", (), {"document_max_upload_size_bytes": 10}
    )()
    try:
        response = TestClient(app).post(
            "/documents/upload",
            files={"file": ("receipt.pdf", b"valid", "application/pdf")},
            headers={"Authorization": "Bearer verified-token"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    verified_token.assert_awaited_once_with("verified-token")
