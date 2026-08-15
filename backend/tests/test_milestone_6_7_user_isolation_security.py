"""Milestone 6.7: User Isolation & Security Tests."""

from datetime import UTC, datetime
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-00000000007a"
USER_B_ID = "00000000-0000-0000-0000-00000000007b"


def _make_doc(
    user_id_str: str,
    *,
    filename: str = "receipt.pdf",
    status: str = "completed",
    content_hash: str | None = "hash_12345",
    created_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    doc_id = uuid4()
    return CreatedDocumentMetadata(
        id=doc_id,
        user_id=UUID(user_id_str),
        filename=filename,
        storage_path=f"{user_id_str}/{doc_id}/original.pdf",
        content_type="application/pdf",
        size=2048,
        status=status,
        created_at=created_at or datetime(2026, 3, 15, 12, 0, 0, tzinfo=UTC),
        processed_at=created_at or datetime(2026, 3, 15, 12, 0, 0, tzinfo=UTC),
        content_hash=content_hash,
        extraction_result={"vendor_company": f"Vendor of {user_id_str[:6]}", "total": 150.0},
        quality_result={"confidence_level": "HIGH", "needs_review": False},
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


# ─── TEST 1: User A lists documents ──────────────────────────

def test_user_a_lists_only_user_a_documents(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A listing documents retrieves only documents owned by User A."""
    doc_a = _make_doc(USER_A_ID, filename="user_a_receipt.pdf")

    async def mock_list(user_id: str, **kwargs):
        assert user_id == USER_A_ID
        return [doc_a], 1

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_a.get("/documents")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["filename"] == "user_a_receipt.pdf"


# ─── TEST 2: User B lists documents ──────────────────────────

def test_user_b_lists_only_user_b_documents(
    client_user_b: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User B listing documents retrieves only documents owned by User B."""
    doc_b = _make_doc(USER_B_ID, filename="user_b_invoice.pdf")

    async def mock_list(user_id: str, **kwargs):
        assert user_id == USER_B_ID
        return [doc_b], 1

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_b.get("/documents")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["filename"] == "user_b_invoice.pdf"


# ─── TEST 3: User A retrieves User B document ─────────────────

def test_user_a_cannot_get_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting User B's document ID receives 404 (Not Found)."""
    doc_b = _make_doc(USER_B_ID)

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None  # User isolation filter

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)

    response = client_user_a.get(f"/documents/{doc_b.id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


# ─── TEST 4: User B retrieves User A document ─────────────────

def test_user_b_cannot_get_user_a_document(
    client_user_b: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User B requesting User A's document ID receives 404 (Not Found)."""
    doc_a = _make_doc(USER_A_ID)

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_a.id) and str(user_id) == USER_A_ID:
            return doc_a
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)

    response = client_user_b.get(f"/documents/{doc_a.id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


# ─── TEST 5: User A previews User B document ──────────────────

def test_user_a_cannot_preview_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting preview for User B's document receives 404 and generates no signed URL."""
    doc_b = _make_doc(USER_B_ID)
    mock_signed_url = AsyncMock()

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "create_signed_storage_url", mock_signed_url)

    response = client_user_a.get(f"/documents/{doc_b.id}/preview")
    assert response.status_code == 404
    mock_signed_url.assert_not_called()


# ─── TEST 6: User A downloads User B document ─────────────────

def test_user_a_cannot_download_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting download for User B's document receives 404 and accesses no storage bytes."""
    doc_b = _make_doc(USER_B_ID)
    mock_storage_download = AsyncMock()

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "download_document_from_storage", mock_storage_download)

    response = client_user_a.get(f"/documents/{doc_b.id}/download")
    assert response.status_code == 404
    mock_storage_download.assert_not_called()


# ─── TEST 7: User A deletes User B document ───────────────────

def test_user_a_cannot_delete_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting deletion of User B's document receives 404 and leaves User B record untouched."""
    doc_b = _make_doc(USER_B_ID)
    mock_storage_delete = AsyncMock()
    mock_metadata_delete = AsyncMock()

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "delete_document_from_storage", mock_storage_delete)
    monkeypatch.setattr(document_routes, "delete_document_metadata", mock_metadata_delete)

    response = client_user_a.delete(f"/documents/{doc_b.id}")
    assert response.status_code == 404
    mock_storage_delete.assert_not_called()
    mock_metadata_delete.assert_not_called()


# ─── TEST 8: User A triggers extraction on User B document ───

def test_user_a_cannot_extract_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting extraction on User B's document receives 404 and triggers no AI processing."""
    doc_b = _make_doc(USER_B_ID)
    mock_ai_extract = AsyncMock()

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "extract_receipt_invoice_document", mock_ai_extract)

    response = client_user_a.post(f"/documents/{doc_b.id}/extract")
    assert response.status_code == 404
    mock_ai_extract.assert_not_called()


# ─── TEST 9: Duplicate lookup is user-scoped ──────────────────

def test_user_a_duplicate_upload_returns_existing_user_a_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A uploading content already in User A's library triggers duplicate fast-path."""
    doc_a = _make_doc(USER_A_ID, filename="common.pdf", content_hash="same_hash_999")

    monkeypatch.setattr(document_routes, "hash_document_content", lambda content: "same_hash_999")

    async def mock_find_duplicate(*, content_hash: str, user_id: str, settings=None):
        if content_hash == "same_hash_999" and user_id == USER_A_ID:
            return [doc_a]
        return []

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", mock_find_duplicate)

    fake_file = ("common.pdf", BytesIO(b"%PDF-1.4 Identical Content Bytes"), "application/pdf")
    res_a = client_user_a.post("/documents/upload", files={"file": fake_file})

    assert res_a.status_code == 200
    assert res_a.json()["is_duplicate"] is True
    assert res_a.json()["document_id"] == str(doc_a.id)


def test_user_b_same_content_upload_creates_independent_user_b_document(
    client_user_b: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User B uploading same content bytes as User A is NOT marked duplicate of User A."""
    doc_a = _make_doc(USER_A_ID, filename="common.pdf", content_hash="same_hash_999")

    async def mock_find_duplicate(*, content_hash: str, user_id: str, settings=None):
        # Searching under User B returns empty list because User B has no existing document
        if content_hash == "same_hash_999" and user_id == USER_A_ID:
            return [doc_a]
        return []

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", mock_find_duplicate)
    monkeypatch.setattr(document_routes, "upload_document_to_storage", AsyncMock(return_value=f"{USER_B_ID}/new/original.pdf"))

    fake_file = ("common.pdf", BytesIO(b"%PDF-1.4 Identical Content Bytes"), "application/pdf")
    res_b = client_user_b.post("/documents/upload", files={"file": fake_file})

    assert res_b.status_code == 200
    assert res_b.json()["is_duplicate"] is False
    assert res_b.json()["document_id"]



# ─── TEST 10: Search cannot expose another user's documents ───

def test_search_is_user_scoped(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Search queries pass authenticated user_id to query layer."""
    mock_list = AsyncMock(return_value=([], 0))
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    client_user_a.get("/documents?q=secret_vendor")
    mock_list.assert_awaited_once_with(
        user_id=USER_A_ID, page=1, page_size=20, search="secret_vendor", settings=ANY
    )


# ─── TEST 11: Filtering cannot expose another user's documents ─

def test_filtering_is_user_scoped(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Status filtering passes authenticated user_id to query layer."""
    mock_list = AsyncMock(return_value=([], 0))
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    client_user_a.get("/documents?status_filter=review")
    mock_list.assert_awaited_once_with(
        user_id=USER_A_ID, page=1, page_size=20, needs_review=True, settings=ANY
    )


# ─── TEST 12: Sorting cannot expose another user's documents ──

def test_sorting_is_user_scoped(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Sorting order passes authenticated user_id to query layer."""
    mock_list = AsyncMock(return_value=([], 0))
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    client_user_a.get("/documents?sort_by=oldest")
    mock_list.assert_awaited_once_with(
        user_id=USER_A_ID, page=1, page_size=20, sort_by="oldest", settings=ANY
    )


# ─── TEST 13: Pagination cannot expose another user's documents

def test_pagination_is_user_scoped(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Pagination parameters pass authenticated user_id to query layer."""
    mock_list = AsyncMock(return_value=([], 0))
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    client_user_a.get("/documents?page=2&page_size=5")
    mock_list.assert_awaited_once_with(
        user_id=USER_A_ID, page=2, page_size=5, settings=ANY
    )


# ─── TEST 14: Summary statistics are user-specific ─────────────

def test_summary_stats_are_user_specific(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Stats calculation counts only documents belonging to current authenticated user."""
    doc_a1 = _make_doc(USER_A_ID, status="completed")
    doc_a2 = _make_doc(USER_A_ID, status="completed")

    async def mock_list(user_id: str, **kwargs):
        assert user_id == USER_A_ID
        return [doc_a1, doc_a2], 2

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_a.get("/documents")
    assert response.status_code == 200
    stats = response.json()["stats"]
    assert stats["total"] == 2
    assert stats["processed"] == 2
    assert stats["needs_review"] == 0


# ─── TEST 15: Empty library for a user remains correctly isolated

def test_empty_library_isolated(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A user with no documents receives total=0 and items=[] cleanly."""
    async def mock_empty(user_id: str, **kwargs):
        assert user_id == USER_A_ID
        return [], 0

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_empty)

    response = client_user_a.get("/documents")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["stats"]["total"] == 0


# ─── TEST 16: Missing document returns safe 404 ───────────────

def test_missing_document_returns_safe_404(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A non-existent document UUID returns safe 404."""
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))

    response = client_user_a.get(f"/documents/{uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


# ─── TEST 17: Client-supplied user_id query parameter is ignored

def test_client_supplied_user_id_ignored(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Query parameter user_id=other_user cannot override the authenticated session user_id."""
    mock_list = AsyncMock(return_value=([], 0))
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    # Attempting to supply ?user_id=USER_B_ID as query parameter
    client_user_a.get(f"/documents?user_id={USER_B_ID}")
    
    # Must still query using USER_A_ID from JWT session context!
    mock_list.assert_awaited_once_with(
        user_id=USER_A_ID, page=1, page_size=20, settings=ANY
    )
