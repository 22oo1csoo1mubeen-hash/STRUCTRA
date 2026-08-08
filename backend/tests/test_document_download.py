"""Private document download endpoint tests."""

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

TEST_USER_ID = "00000000-0000-0000-0000-000000000021"


def _record(filename: str, content_type: str) -> CreatedDocumentMetadata:
    """Build an owned metadata record for a private object."""
    extension = filename.rsplit(".", maxsplit=1)[-1]
    return CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(TEST_USER_ID),
        filename=filename,
        storage_path=f"{TEST_USER_ID}/{uuid4()}.{extension}",
        content_type=content_type,
        size=7,
        status="uploaded",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


@pytest.fixture
def authenticated_client() -> TestClient:
    """Provide an authenticated client without using live Supabase services."""
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=TEST_USER_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("filename", "content_type"),
    [
        ("receipt.pdf", "application/pdf"),
        ("receipt.jpg", "image/jpeg"),
        ("receipt.png", "image/png"),
    ],
)
def test_owner_downloads_private_document(
    authenticated_client: TestClient, monkeypatch, filename: str, content_type: str
) -> None:
    """Owned PDF and image documents are returned with their stored MIME type."""
    record = _record(filename, content_type)
    retrieved = AsyncMock(return_value=record)
    downloaded = AsyncMock(return_value=b"content")
    monkeypatch.setattr(document_routes, "get_document_metadata", retrieved)
    monkeypatch.setattr(document_routes, "download_document_from_storage", downloaded)

    response = authenticated_client.get(f"/documents/{record.id}/download")

    assert response.status_code == 200
    assert response.content == b"content"
    assert response.headers["content-type"] == content_type
    assert f"filename*=UTF-8''{filename}" in response.headers["content-disposition"]
    retrieved.assert_awaited_once_with(document_id=record.id, user_id=TEST_USER_ID, settings=ANY)
    downloaded.assert_awaited_once_with(record.storage_path, ANY)


def test_download_returns_not_found_for_missing_or_foreign_document(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """A foreign document is never looked up in Storage and is hidden as a 404."""
    document_id = uuid4()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))
    storage_download = AsyncMock()
    monkeypatch.setattr(document_routes, "download_document_from_storage", storage_download)

    response = authenticated_client.get(f"/documents/{document_id}/download")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."
    storage_download.assert_not_awaited()


def test_download_returns_safe_not_found_for_missing_storage_object(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """A missing private object does not expose storage implementation details."""
    record = _record("receipt.pdf", "application/pdf")
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(
        document_routes,
        "download_document_from_storage",
        AsyncMock(
            side_effect=HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document storage object was not found.",
            )
        ),
    )

    response = authenticated_client.get(f"/documents/{record.id}/download")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document storage object was not found."


def test_download_returns_safe_503_for_storage_failure(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """Storage failures are represented as a safe service-unavailable response."""
    record = _record("receipt.pdf", "application/pdf")
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(
        document_routes,
        "download_document_from_storage",
        AsyncMock(
            side_effect=HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Document storage is unavailable.",
            )
        ),
    )

    response = authenticated_client.get(f"/documents/{record.id}/download")

    assert response.status_code == 503
    assert response.json()["detail"] == "Document storage is unavailable."


def test_download_rejects_missing_authentication() -> None:
    """The download route requires the established bearer dependency."""
    response = TestClient(app).get(f"/documents/{uuid4()}/download")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_download_rejects_invalid_authentication(monkeypatch) -> None:
    """A rejected token is not allowed to reach metadata or Storage access."""
    rejected_token = AsyncMock(
        side_effect=HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    )
    monkeypatch.setattr(dependencies, "get_authenticated_user", rejected_token)

    response = TestClient(app).get(
        f"/documents/{uuid4()}/download", headers={"Authorization": "Bearer invalid-token"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired authentication token."
