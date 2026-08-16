"""Tests for Document Library detail view, previewing, user isolation, and in-place updates."""

from datetime import UTC, datetime
from io import BytesIO
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.routes import documents as document_routes
from app.schemas.documents import ReceiptInvoiceExtraction
from tests.test_persistence_duplicate_lifecycle import (
    InMemoryDocumentDB,
    USER_A_ID,
    USER_B_ID,
    get_user_client,
)


@pytest.fixture
def mock_db() -> InMemoryDocumentDB:
    return InMemoryDocumentDB()


@pytest.fixture
def client_user_a() -> TestClient:
    client = get_user_client(USER_A_ID)
    yield client
    from app.main import app
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def setup_mocks(mock_db: InMemoryDocumentDB, monkeypatch: pytest.MonkeyPatch):
    document_routes._TEMP_UPLOAD_SESSIONS.clear()

    async def mock_create_meta(**kwargs):
        return mock_db.insert(**kwargs)

    async def mock_get_meta(*, document_id: UUID, user_id: str, settings):
        return mock_db.get(document_id, user_id, settings)

    async def mock_find_hash(*, content_hash: str, user_id: str, settings):
        return mock_db.find_by_content_hash(content_hash, user_id, settings)

    async def mock_list_meta(*, user_id: str, **kwargs):
        return mock_db.list_docs(user_id=user_id, **kwargs)

    monkeypatch.setattr(document_routes, "create_document_metadata", mock_create_meta)
    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get_meta)
    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", mock_find_hash)
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list_meta)
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://signed.url/token"))


def _seed_saved_document(
    mock_db: InMemoryDocumentDB,
    user_id: str,
    doc_id: UUID | None = None,
    filename: str = "receipt_test.pdf",
    vendor: str = "ABC Mart",
    total: float = 1200.0,
) -> UUID:
    target_id = doc_id or uuid4()
    mock_db.insert(
        document_id=target_id,
        user_id=user_id,
        filename=filename,
        storage_path=f"{user_id}/{target_id}/original.pdf",
        content_type="application/pdf",
        size=1024,
        content_hash=f"hash_{target_id}",
        status="completed",
        extraction_result={
            "vendor_company": vendor,
            "date": "2026-08-16",
            "total": total,
            "subtotal": total,
            "tax": 0.0,
            "discount": 0.0,
            "invoice_number": "INV-001",
            "line_items": [{"description": "Item 1", "quantity": 1, "unit_price": total, "line_total": total}],
        },
        quality_result={
            "overall_confidence": 0.95,
            "confidence_level": "HIGH",
            "needs_review": False,
        },
    )
    return target_id


# ─── 1. OPEN SAVED DOCUMENT (READ-ONLY) ──────────────────────────────────────
def test_open_saved_document_is_read_only_and_does_not_create_rows(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Opening an existing document fetches details without AI extraction or DB creation."""
    doc_id = _seed_saved_document(mock_db, USER_A_ID, vendor="Store A", total=500.0)
    initial_count = len(mock_db.rows)

    ai_mock = AsyncMock()
    document_routes.default_ai_manager.extract_document = ai_mock

    # Fetch document detail
    response = client_user_a.get(f"/documents/{doc_id}")
    assert response.status_code == 200
    data = response.json()

    assert data["document"]["document_id"] == str(doc_id)
    assert data["extraction"]["vendor_company"] == "Store A"
    assert data["extraction"]["total"] == 500.0

    # Invariants: 0 AI extraction calls, 0 new rows in database
    ai_mock.assert_not_called()
    assert len(mock_db.rows) == initial_count


# ─── 2. PREVIEW SAVED DOCUMENT ──────────────────────────────────────────────
def test_preview_saved_document_returns_signed_url(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """GET /documents/{id}/preview returns a signed URL for owned document."""
    doc_id = _seed_saved_document(mock_db, USER_A_ID)
    response = client_user_a.get(f"/documents/{doc_id}/preview")
    assert response.status_code == 200
    data = response.json()
    assert "preview_url" in data
    assert data["preview_url"].startswith("http")


# ─── 3. USER ISOLATION (SECURITY) ───────────────────────────────────────────
def test_user_cannot_access_or_preview_other_users_document(mock_db: InMemoryDocumentDB):
    """User B cannot GET or preview User A's document; returns 404."""
    doc_a_id = _seed_saved_document(mock_db, USER_A_ID)
    client_b = get_user_client(USER_B_ID)

    # User B tries to get User A's document
    get_res = client_b.get(f"/documents/{doc_a_id}")
    assert get_res.status_code == 404
    assert get_res.json()["detail"] == "Document not found."

    # User B tries to preview User A's document
    prev_res = client_b.get(f"/documents/{doc_a_id}/preview")
    assert prev_res.status_code == 404
    assert prev_res.json()["detail"] == "Document not found."


# ─── 4. SAVE WITHOUT EDITS (IDEMPOTENT) ─────────────────────────────────────
def test_save_without_edits_does_not_create_new_row(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Opening a saved document and clicking Save to Library without edits creates 0 new rows."""
    doc_id = _seed_saved_document(mock_db, USER_A_ID, total=1200.0)
    assert len(mock_db.rows) == 1

    # Save to library without edits
    res = client_user_a.post(f"/documents/{doc_id}/save")
    assert res.status_code == 200
    assert res.json()["document"]["document_id"] == str(doc_id)
    assert res.json()["extraction"]["total"] == 1200.0

    # Row count MUST remain exactly 1
    assert len(mock_db.rows) == 1
    assert UUID(str(doc_id)) in mock_db.rows


# ─── 5. EDIT AND SAVE (IN-PLACE UPDATE) ──────────────────────────────────────
def test_edit_and_save_updates_existing_row(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB, monkeypatch: pytest.MonkeyPatch
):
    """Editing extracted fields and clicking Save updates existing DB row and recalculates validation."""
    doc_id = _seed_saved_document(mock_db, USER_A_ID, vendor="Old Vendor", total=1200.0)
    assert len(mock_db.rows) == 1

    # Mock update_document_extraction_and_quality to update mock_db
    async def mock_update_ext(*, document_id: UUID, user_id: str, extraction: dict, quality: dict = None, **kwargs):
        rec = mock_db.get(document_id, user_id)
        if rec:
            rec.extraction_result = extraction
            if quality:
                rec.quality_result = quality
            return rec
        return None

    monkeypatch.setattr(document_routes, "update_document_extraction_and_quality", mock_update_ext)

    # Edit payload
    updated_payload = {
        "extraction": {
            "vendor_company": "New Edited Vendor",
            "date": "2026-08-16",
            "total": 1350.0,
            "subtotal": 1350.0,
            "tax": 0.0,
            "discount": 0.0,
            "invoice_number": "INV-002",
            "line_items": [{"description": "Updated Item", "quantity": 1, "unit_price": 1350.0, "line_total": 1350.0}],
        }
    }

    save_res = client_user_a.post(f"/documents/{doc_id}/save", json=updated_payload)
    assert save_res.status_code == 200
    data = save_res.json()

    assert data["document"]["document_id"] == str(doc_id)
    assert data["extraction"]["vendor_company"] == "New Edited Vendor"
    assert data["extraction"]["total"] == 1350.0

    # Invariants: Row count STILL 1, document_id unchanged
    assert len(mock_db.rows) == 1
    stored_doc = mock_db.rows[doc_id]
    assert stored_doc.extraction_result["vendor_company"] == "New Edited Vendor"
    assert stored_doc.extraction_result["total"] == 1350.0


# ─── 6. PUT /documents/{id} UPDATE ENDPOINT ─────────────────────────────────
def test_put_document_updates_existing_row(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB, monkeypatch: pytest.MonkeyPatch
):
    """PUT /documents/{id} updates extraction data and re-evaluates validation."""
    doc_id = _seed_saved_document(mock_db, USER_A_ID, vendor="Original Vendor", total=100.0)

    async def mock_update_ext(*, document_id: UUID, user_id: str, extraction: dict, quality: dict = None, **kwargs):
        rec = mock_db.get(document_id, user_id)
        if rec:
            rec.extraction_result = extraction
            if quality:
                rec.quality_result = quality
            return rec
        return None

    monkeypatch.setattr(document_routes, "update_document_extraction_and_quality", mock_update_ext)

    payload = {
        "vendor_company": "PUT Vendor",
        "date": "2026-08-16",
        "total": 150.0,
        "subtotal": 150.0,
        "tax": 0.0,
        "discount": 0.0,
        "invoice_number": "INV-PUT",
        "line_items": [{"description": "Item", "quantity": 1, "unit_price": 150.0, "line_total": 150.0}],
    }

    put_res = client_user_a.put(f"/documents/{doc_id}", json=payload)
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["extraction"]["vendor_company"] == "PUT Vendor"
    assert data["extraction"]["total"] == 150.0
    assert len(mock_db.rows) == 1


# ─── 7. USER ISOLATION ON UPDATE ────────────────────────────────────────────
def test_user_cannot_update_other_users_document(mock_db: InMemoryDocumentDB):
    """User B cannot update User A's document via save or PUT; returns 404."""
    doc_a_id = _seed_saved_document(mock_db, USER_A_ID)
    client_b = get_user_client(USER_B_ID)

    payload = {
        "extraction": {
            "vendor_company": "Hacker Vendor",
            "total": 9999.0,
        }
    }

    save_res = client_b.post(f"/documents/{doc_a_id}/save", json=payload)
    assert save_res.status_code == 404

    put_payload = {
        "vendor_company": "Hacker Vendor",
        "total": 9999.0,
    }
    put_res = client_b.put(f"/documents/{doc_a_id}", json=put_payload)
    assert put_res.status_code == 404
