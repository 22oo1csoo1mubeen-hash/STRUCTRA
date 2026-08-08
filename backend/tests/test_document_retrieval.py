"""Document metadata retrieval endpoint tests."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api import dependencies
from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata

TEST_USER_ID = "00000000-0000-0000-0000-000000000011"


def _record(*, user_id: str = TEST_USER_ID) -> CreatedDocumentMetadata:
    """Build metadata matching a database row."""
    return CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(user_id),
        filename="receipt.pdf",
        storage_path=f"{user_id}/{uuid4()}.pdf",
        content_type="application/pdf",
        size=42,
        status="uploaded",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


@pytest.fixture
def authenticated_client() -> TestClient:
    """Provide an authenticated client without touching Supabase."""
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=TEST_USER_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_list_documents_returns_only_authenticated_user_records(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """The list route returns the metadata supplied for the current user."""
    records = [_record(), _record()]
    listed = AsyncMock(return_value=records)
    monkeypatch.setattr(document_routes, "list_document_metadata", listed)

    response = authenticated_client.get("/documents")

    assert response.status_code == 200
    assert [item["document_id"] for item in response.json()] == [
        str(record.id) for record in records
    ]
    assert all(item["storage_path"].startswith(f"{TEST_USER_ID}/") for item in response.json())
    listed.assert_awaited_once_with(user_id=TEST_USER_ID, settings=ANY)


def test_list_documents_returns_empty_list_when_user_has_no_documents(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """An authenticated user with no rows receives an empty list."""
    monkeypatch.setattr(document_routes, "list_document_metadata", AsyncMock(return_value=[]))

    response = authenticated_client.get("/documents")

    assert response.status_code == 200
    assert response.json() == []


def test_get_document_returns_owned_metadata(authenticated_client: TestClient, monkeypatch) -> None:
    """A metadata record owned by the current user is returned."""
    record = _record()
    retrieved = AsyncMock(return_value=record)
    monkeypatch.setattr(document_routes, "get_document_metadata", retrieved)

    response = authenticated_client.get(f"/documents/{record.id}")

    assert response.status_code == 200
    assert response.json()["document_id"] == str(record.id)
    assert response.json()["filename"] == "receipt.pdf"
    retrieved.assert_awaited_once_with(document_id=record.id, user_id=TEST_USER_ID, settings=ANY)


@pytest.mark.parametrize("document_id", [uuid4(), uuid4()])
def test_get_document_returns_not_found_for_missing_or_other_user_document(
    authenticated_client: TestClient, monkeypatch, document_id
) -> None:
    """Missing and foreign records are both hidden behind the same 404 response."""
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))

    response = authenticated_client.get(f"/documents/{document_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_list_documents_rejects_missing_authentication() -> None:
    """Retrieval uses the same bearer authentication requirement as uploads."""
    response = TestClient(app).get("/documents")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_get_document_rejects_invalid_authentication(monkeypatch) -> None:
    """A rejected Supabase token remains a safe 401 response."""
    rejected_token = AsyncMock(
        side_effect=HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    )
    monkeypatch.setattr(dependencies, "get_authenticated_user", rejected_token)

    response = TestClient(app).get(
        f"/documents/{uuid4()}", headers={"Authorization": "Bearer invalid-token"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired authentication token."
