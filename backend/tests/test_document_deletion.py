"""Document deletion endpoint tests (M3.7)."""

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

TEST_USER_ID = "00000000-0000-0000-0000-000000000031"
OTHER_USER_ID = "00000000-0000-0000-0000-000000000032"


def _record(*, user_id: str = TEST_USER_ID) -> CreatedDocumentMetadata:
    """Build a metadata record that looks like a database row."""
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
    """Provide an authenticated client without touching live Supabase services."""
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=TEST_USER_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 1. Owner deletes an existing document — success
# ---------------------------------------------------------------------------

def test_owner_deletes_document_returns_success(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """An authenticated owner receives a 200 success response."""
    record = _record()
    retrieved = AsyncMock(return_value=record)
    monkeypatch.setattr(document_routes, "get_document_metadata", retrieved)
    monkeypatch.setattr(document_routes, "delete_document_from_storage", AsyncMock())
    monkeypatch.setattr(document_routes, "delete_document_metadata", AsyncMock())

    response = authenticated_client.delete(f"/documents/{record.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Document deleted successfully."
    retrieved.assert_awaited_once_with(
        document_id=record.id, user_id=TEST_USER_ID, settings=ANY
    )


# ---------------------------------------------------------------------------
# 2. Storage object is deleted (the storage service was called)
# ---------------------------------------------------------------------------

def test_owner_deletion_calls_storage_delete(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """Storage delete is called with the exact path from the database record."""
    record = _record()
    storage_delete = AsyncMock()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(document_routes, "delete_document_from_storage", storage_delete)
    monkeypatch.setattr(document_routes, "delete_document_metadata", AsyncMock())

    authenticated_client.delete(f"/documents/{record.id}")

    storage_delete.assert_awaited_once_with(record.storage_path, ANY)


# ---------------------------------------------------------------------------
# 3. Database metadata row is deleted (the metadata service was called)
# ---------------------------------------------------------------------------

def test_owner_deletion_calls_metadata_delete(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """Metadata delete is called with the correct document_id and user_id."""
    record = _record()
    metadata_delete = AsyncMock()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(document_routes, "delete_document_from_storage", AsyncMock())
    monkeypatch.setattr(document_routes, "delete_document_metadata", metadata_delete)

    authenticated_client.delete(f"/documents/{record.id}")

    metadata_delete.assert_awaited_once_with(
        document_id=record.id, user_id=TEST_USER_ID, settings=ANY
    )


# ---------------------------------------------------------------------------
# 4. Missing document → 404
# ---------------------------------------------------------------------------

def test_delete_returns_404_for_missing_document(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """A document that does not exist (or belongs to another user) is a 404."""
    document_id = uuid4()
    monkeypatch.setattr(
        document_routes, "get_document_metadata", AsyncMock(return_value=None)
    )
    storage_delete = AsyncMock()
    metadata_delete = AsyncMock()
    monkeypatch.setattr(document_routes, "delete_document_from_storage", storage_delete)
    monkeypatch.setattr(document_routes, "delete_document_metadata", metadata_delete)

    response = authenticated_client.delete(f"/documents/{document_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."
    storage_delete.assert_not_awaited()
    metadata_delete.assert_not_awaited()


# ---------------------------------------------------------------------------
# 5. User A attempts to delete User B's document → 404
# ---------------------------------------------------------------------------

def test_delete_returns_404_for_another_users_document(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """Cross-user deletion attempts are indistinguishable from missing documents."""
    # get_document_metadata already filters by user_id; returning None simulates
    # the query finding no row for this (document_id, user_id) pair.
    monkeypatch.setattr(
        document_routes, "get_document_metadata", AsyncMock(return_value=None)
    )
    storage_delete = AsyncMock()
    metadata_delete = AsyncMock()
    monkeypatch.setattr(document_routes, "delete_document_from_storage", storage_delete)
    monkeypatch.setattr(document_routes, "delete_document_metadata", metadata_delete)

    # The document belongs to OTHER_USER_ID but the authenticated user is TEST_USER_ID.
    foreign_doc_id = uuid4()
    response = authenticated_client.delete(f"/documents/{foreign_doc_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."
    storage_delete.assert_not_awaited()
    metadata_delete.assert_not_awaited()


# ---------------------------------------------------------------------------
# 6. Missing Authorization → 401
# ---------------------------------------------------------------------------

def test_delete_rejects_missing_authorization() -> None:
    """Requests without a bearer token are rejected with 401."""
    response = TestClient(app).delete(f"/documents/{uuid4()}")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


# ---------------------------------------------------------------------------
# 7. Invalid token → 401
# ---------------------------------------------------------------------------

def test_delete_rejects_invalid_token(monkeypatch) -> None:
    """A token rejected by Supabase Auth never reaches metadata or Storage."""
    rejected = AsyncMock(
        side_effect=HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    )
    monkeypatch.setattr(dependencies, "get_authenticated_user", rejected)

    response = TestClient(app).delete(
        f"/documents/{uuid4()}", headers={"Authorization": "Bearer invalid-token"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired authentication token."


# ---------------------------------------------------------------------------
# 8. Storage deletion failure → 503, database row remains untouched
# ---------------------------------------------------------------------------

def test_storage_failure_during_deletion_returns_503_and_preserves_db_row(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """If Storage deletion fails the DB row must not be deleted."""
    record = _record()
    metadata_delete = AsyncMock()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(
        document_routes,
        "delete_document_from_storage",
        AsyncMock(
            side_effect=HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to delete document from storage.",
            )
        ),
    )
    monkeypatch.setattr(document_routes, "delete_document_metadata", metadata_delete)

    response = authenticated_client.delete(f"/documents/{record.id}")

    assert response.status_code == 503
    assert "storage" in response.json()["detail"].lower()
    # The DB row must NOT be touched after a failed Storage deletion.
    metadata_delete.assert_not_awaited()


# ---------------------------------------------------------------------------
# 9. Database deletion failure after successful Storage deletion → safe 503
# ---------------------------------------------------------------------------

def test_metadata_failure_after_storage_deletion_returns_safe_503(
    authenticated_client: TestClient, monkeypatch
) -> None:
    """A DB failure after successful Storage deletion surfaces as a safe 503."""
    record = _record()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(document_routes, "delete_document_from_storage", AsyncMock())
    monkeypatch.setattr(
        document_routes,
        "delete_document_metadata",
        AsyncMock(
            side_effect=HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to delete document metadata.",
            )
        ),
    )

    response = authenticated_client.delete(f"/documents/{record.id}")

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to delete document metadata."
