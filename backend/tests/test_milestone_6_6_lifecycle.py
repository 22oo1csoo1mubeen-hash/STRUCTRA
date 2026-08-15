"""Milestone 6.6: Preview / Download / Delete Document Lifecycle tests."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-00000000006a"
USER_B_ID = "00000000-0000-0000-0000-00000000006b"


def _make_doc(user_id_str: str = USER_A_ID, filename: str = "receipt_store.pdf") -> CreatedDocumentMetadata:
    doc_id = uuid4()
    return CreatedDocumentMetadata(
        id=doc_id,
        user_id=UUID(user_id_str),
        filename=filename,
        storage_path=f"{user_id_str}/{doc_id}/original.pdf",
        content_type="application/pdf",
        size=1024,
        status="completed",
        created_at=datetime(2026, 3, 1, 12, 0, 0, tzinfo=UTC),
    )


@pytest.fixture
def client_user_a() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def client_user_b() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_B_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ─── 6.6.1 PREVIEW TESTS ─────────────────────────────────────

def test_preview_authenticated_user_retrieves_signed_url(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Authenticated owner receives a short-lived signed URL for document preview."""
    doc = _make_doc(USER_A_ID, filename="tax_invoice.pdf")
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(
        document_routes,
        "create_signed_storage_url",
        AsyncMock(return_value="https://supabase.co/storage/v1/object/sign/documents/signed_path?token=xyz"),
    )

    response = client_user_a.get(f"/documents/{doc.id}/preview?expires_in=1800")

    assert response.status_code == 200
    data = response.json()
    assert "token=xyz" in data["preview_url"]
    assert data["expires_in"] == 1800
    assert data["content_type"] == "application/pdf"
    assert data["filename"] == "tax_invoice.pdf"


def test_preview_user_a_cannot_preview_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting User B's document preview receives 404 (Not Found)."""
    doc_b = _make_doc(USER_B_ID)

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)

    response = client_user_a.get(f"/documents/{doc_b.id}/preview")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_preview_unauthenticated_request_rejected(
    unauthenticated_client: TestClient
) -> None:
    """Preview request without auth headers is rejected with 401 or 403."""
    response = unauthenticated_client.get(f"/documents/{uuid4()}/preview")
    assert response.status_code in (401, 403)


# ─── 6.6.2 DOWNLOAD TESTS ────────────────────────────────────

def test_download_authenticated_user_retrieves_file_stream(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Authenticated owner downloads the exact file bytes with correct headers."""
    doc = _make_doc(USER_A_ID, filename="expense_receipt.pdf")
    fake_content = b"%PDF-1.4 Fake PDF Content Header"

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(
        document_routes, "download_document_from_storage", AsyncMock(return_value=fake_content)
    )

    response = client_user_a.get(f"/documents/{doc.id}/download")

    assert response.status_code == 200
    assert response.content == fake_content
    assert response.headers["content-type"] == "application/pdf"
    assert "filename*=UTF-8''expense_receipt.pdf" in response.headers["content-disposition"]


def test_download_user_a_cannot_download_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting User B's document download receives 404 (Not Found)."""
    doc_b = _make_doc(USER_B_ID)

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)

    response = client_user_a.get(f"/documents/{doc_b.id}/download")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_download_missing_storage_object_returns_404(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If DB metadata exists but storage object is missing, returns clean 404."""
    doc = _make_doc(USER_A_ID)
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
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

    response = client_user_a.get(f"/documents/{doc.id}/download")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document storage object was not found."


# ─── 6.6.3 DELETE TESTS ──────────────────────────────────────

def test_delete_authenticated_user_deletes_storage_and_metadata(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Owner successfully deletes storage object and database metadata."""
    doc = _make_doc(USER_A_ID)
    storage_delete = AsyncMock()
    metadata_delete = AsyncMock()

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(document_routes, "delete_document_from_storage", storage_delete)
    monkeypatch.setattr(document_routes, "delete_document_metadata", metadata_delete)

    response = client_user_a.delete(f"/documents/{doc.id}")

    assert response.status_code == 200
    assert response.json()["success"] is True
    storage_delete.assert_awaited_once_with(doc.storage_path, ANY)
    metadata_delete.assert_awaited_once_with(document_id=doc.id, user_id=USER_A_ID, settings=ANY)


def test_delete_user_a_cannot_delete_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A trying to delete User B's document receives 404 (Not Found)."""
    doc_b = _make_doc(USER_B_ID)
    storage_delete = AsyncMock()
    metadata_delete = AsyncMock()

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "delete_document_from_storage", storage_delete)
    monkeypatch.setattr(document_routes, "delete_document_metadata", metadata_delete)

    response = client_user_a.delete(f"/documents/{doc_b.id}")

    assert response.status_code == 404
    storage_delete.assert_not_awaited()
    metadata_delete.assert_not_awaited()


def test_delete_already_missing_storage_object_proceeds_to_delete_metadata(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If storage object is already missing, metadata deletion still completes safely."""
    doc = _make_doc(USER_A_ID)
    metadata_delete = AsyncMock()

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    # Simulates delete_document_from_storage returning safely when ignore_missing=True
    monkeypatch.setattr(document_routes, "delete_document_from_storage", AsyncMock(return_value=None))
    monkeypatch.setattr(document_routes, "delete_document_metadata", metadata_delete)

    response = client_user_a.delete(f"/documents/{doc.id}")

    assert response.status_code == 200
    assert response.json()["success"] is True
    metadata_delete.assert_awaited_once()


def test_delete_storage_service_error_preserves_db_record(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If Storage network/503 error occurs, DB row is NOT deleted and 503 is returned."""
    doc = _make_doc(USER_A_ID)
    metadata_delete = AsyncMock()

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
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

    response = client_user_a.delete(f"/documents/{doc.id}")

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to delete document from storage."
    metadata_delete.assert_not_awaited()  # Database metadata record remains untouched
