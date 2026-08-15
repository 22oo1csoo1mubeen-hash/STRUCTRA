"""Comprehensive tests for Document Persistence & Duplicate Detection Lifecycle."""

import asyncio
from datetime import UTC, datetime
from hashlib import sha256
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.document_metadata import CreatedDocumentMetadata
from app.services.quality.schemas import ExtractionQualityResult

USER_A_ID = "00000000-0000-0000-0000-00000000000a"
USER_B_ID = "00000000-0000-0000-0000-00000000000b"
USER_C_ID = "00000000-0000-0000-0000-00000000000c"


class InMemoryDocumentDB:
    """Simulates Supabase PostgreSQL public.documents table with RLS and uniqueness constraints."""

    def __init__(self):
        self.rows: dict[UUID, CreatedDocumentMetadata] = {}

    def insert(
        self,
        *,
        document_id: UUID,
        user_id: str,
        filename: str,
        storage_path: str,
        content_type: str,
        size: int,
        content_hash: str | None = None,
        status: str = "completed",
        processed_at: datetime | None = None,
        extraction_result: dict | None = None,
        quality_result: dict | None = None,
        settings=None,
    ) -> CreatedDocumentMetadata:
        # Enforce unique constraint on (user_id, content_hash) where content_hash is not null
        if content_hash is not None:
            for existing in self.rows.values():
                if str(existing.user_id) == user_id and existing.content_hash == content_hash:
                    raise HTTPException(
                        status_code=503,
                        detail="duplicate key value violates unique constraint idx_documents_user_content_hash_unique",
                    )

        now = datetime.now(UTC)
        record = CreatedDocumentMetadata(
            id=document_id,
            user_id=UUID(user_id),
            filename=filename,
            storage_path=storage_path,
            content_type=content_type,
            size=size,
            status=status,
            created_at=now,
            processed_at=processed_at or now,
            content_hash=content_hash,
            extraction_result=extraction_result,
            quality_result=quality_result,
        )
        self.rows[document_id] = record
        return record

    def get(self, document_id: UUID, user_id: str, settings=None) -> CreatedDocumentMetadata | None:
        rec = self.rows.get(document_id)
        if rec and str(rec.user_id) == user_id:
            return rec
        return None

    def find_by_content_hash(
        self, content_hash: str, user_id: str, settings=None
    ) -> list[CreatedDocumentMetadata]:
        return [
            rec
            for rec in self.rows.values()
            if str(rec.user_id) == user_id
            and rec.content_hash == content_hash
            and rec.status == "completed"
        ]

    def list_docs(
        self, user_id: str, page: int = 1, page_size: int = 20, settings=None, **kwargs
    ) -> tuple[list[CreatedDocumentMetadata], int]:
        user_records = [
            rec
            for rec in self.rows.values()
            if str(rec.user_id) == user_id and rec.status == "completed"
        ]
        return user_records, len(user_records)


@pytest.fixture
def mock_db() -> InMemoryDocumentDB:
    return InMemoryDocumentDB()


@pytest.fixture
def mock_storage() -> dict[str, bytes]:
    return {}


def get_user_client(user_id: str) -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        document_max_upload_size_bytes=10 * 1024 * 1024,
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=user_id)
    return TestClient(app)


@pytest.fixture
def client_user_a() -> TestClient:
    client = get_user_client(USER_A_ID)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def client_user_b() -> TestClient:
    client = get_user_client(USER_B_ID)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def setup_mocks(mock_db: InMemoryDocumentDB, mock_storage: dict[str, bytes], monkeypatch: pytest.MonkeyPatch):
    document_routes._TEMP_UPLOAD_SESSIONS.clear()

    async def mock_upload(file, user_id: str, settings, document_id=None):
        doc_id = document_id or uuid4()
        path = f"{user_id}/{doc_id}/original.pdf"
        file_bytes = await file.read()
        mock_storage[path] = file_bytes
        return path

    async def mock_download(storage_path: str, settings):
        if storage_path in mock_storage:
            return mock_storage[storage_path]
        return b"%PDF-1.4 Default Mock Content"

    async def mock_create_meta(**kwargs):
        return mock_db.insert(**kwargs)

    async def mock_get_meta(*, document_id: UUID, user_id: str, settings):
        return mock_db.get(document_id, user_id, settings)

    async def mock_find_hash(*, content_hash: str, user_id: str, settings):
        return mock_db.find_by_content_hash(content_hash, user_id, settings)

    async def mock_list_meta(*, user_id: str, **kwargs):
        return mock_db.list_docs(user_id=user_id, **kwargs)

    monkeypatch.setattr(document_routes, "upload_document_to_storage", mock_upload)
    monkeypatch.setattr(document_routes, "download_document_from_storage", mock_download)
    monkeypatch.setattr(document_routes, "create_document_metadata", mock_create_meta)
    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get_meta)
    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", mock_find_hash)
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list_meta)
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://signed.url/token"))

    # AI and OCR mocks
    fake_extraction = ReceiptInvoiceExtraction.model_validate({
        "vendor_company": "Starbucks Coffee",
        "date": "2026-04-01",
        "total": 12.50,
        "subtotal": 11.50,
        "tax": 1.00,
        "discount": 0.0,
        "invoice_number": "SB-1001",
        "line_items": [{"description": "Latte", "quantity": 1, "unit_price": 11.50, "line_total": 11.50}],
    })
    monkeypatch.setattr(document_routes.default_ai_manager, "extract_document", AsyncMock(return_value=fake_extraction))
    monkeypatch.setattr(document_routes.default_ocr_service, "extract_text_from_bytes_async", AsyncMock(return_value="Mock OCR Text"))



# ─── TEST 1 — NEW UPLOAD ─────────────────────────────────────────────────────
def test_1_new_upload_does_not_create_db_row(client_user_a: TestClient, mock_db: InMemoryDocumentDB):
    """Upload new document: is_duplicate = false AND public.documents count does NOT increase."""
    content = b"%PDF-1.4 Brand New Invoice Bytes 1"
    response = client_user_a.post(
        "/documents/upload",
        files={"file": ("invoice1.pdf", BytesIO(content), "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_duplicate"] is False
    assert data["existing_document_id"] is None
    assert data["document_id"] is not None

    # STRICT REQUIREMENT: ZERO records in database table
    assert len(mock_db.rows) == 0


# ─── TEST 2 — NEW DOCUMENT PROCESSING ───────────────────────────────────────
def test_2_new_document_processing_does_not_create_db_row(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Upload new document + Process Document + extraction complete: public.documents count does NOT increase."""
    content = b"%PDF-1.4 Processing Extraction Bytes 2"
    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("invoice2.pdf", BytesIO(content), "application/pdf")},
    )
    assert up_res.status_code == 200
    doc_id = up_res.json()["document_id"]

    # Process / Extract
    ext_res = client_user_a.post(f"/documents/{doc_id}/extract")
    assert ext_res.status_code == 200
    assert ext_res.json()["extraction"]["vendor_company"] == "Starbucks Coffee"

    # STRICT REQUIREMENT: Database record count MUST STILL BE 0
    assert len(mock_db.rows) == 0


# ─── TEST 3 — UNSAVED RESULT ─────────────────────────────────────────────────
def test_3_unsaved_result_not_in_get_documents(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Reach extraction result without clicking Save to Library: GET /documents does NOT contain document."""
    content = b"%PDF-1.4 Unsaved Result Bytes 3"
    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("invoice3.pdf", BytesIO(content), "application/pdf")},
    )
    doc_id = up_res.json()["document_id"]

    client_user_a.post(f"/documents/{doc_id}/extract")

    # Fetch document library
    list_res = client_user_a.get("/documents")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 0
    assert len(list_data["items"]) == 0


# ─── TEST 4 — SAVE TO LIBRARY ────────────────────────────────────────────────
def test_4_save_to_library_creates_exactly_one_row(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Click Save to Library: exactly ONE new persistent document, GET /documents contains it."""
    content = b"%PDF-1.4 Saved Document Bytes 4"
    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("invoice4.pdf", BytesIO(content), "application/pdf")},
    )
    doc_id = up_res.json()["document_id"]
    client_user_a.post(f"/documents/{doc_id}/extract")

    # Click Save to Library
    save_res = client_user_a.post(f"/documents/{doc_id}/save")
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data["document"]["status"] == "completed"

    # Exactly ONE persistent document in database
    assert len(mock_db.rows) == 1
    assert UUID(doc_id) in mock_db.rows

    # GET /documents contains it
    list_res = client_user_a.get("/documents")
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1
    assert list_res.json()["items"][0]["document_id"] == doc_id


# ─── TEST 5 — SAME USER DUPLICATE ───────────────────────────────────────────
def test_5_same_user_duplicate_detection_prevents_ai_and_db_rows(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Save Receipt X. Upload exact same Receipt X again: is_duplicate = true, existing_document_id = original ID, 0 new rows, 0 AI calls."""
    content = b"%PDF-1.4 Receipt X Constant Bytes"
    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("receipt_x.pdf", BytesIO(content), "application/pdf")},
    )
    original_id = up_res.json()["document_id"]
    client_user_a.post(f"/documents/{original_id}/extract")
    client_user_a.post(f"/documents/{original_id}/save")
    assert len(mock_db.rows) == 1

    # Upload exact same Receipt X again
    ai_mock = AsyncMock()
    document_routes.default_ai_manager.extract_document = ai_mock

    dup_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("receipt_x_renamed.pdf", BytesIO(content), "application/pdf")},
    )
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["is_duplicate"] is True
    assert dup_data["existing_document_id"] == original_id

    # ZERO new rows in DB, ZERO AI calls
    assert len(mock_db.rows) == 1
    ai_mock.assert_not_called()


# ─── TEST 6 — DIFFERENT USER SAME FILE ──────────────────────────────────────
def test_6_different_user_same_file_not_duplicate(mock_db: InMemoryDocumentDB):
    """User A saves Receipt X. User B uploads exact same bytes: is_duplicate = false. User B can process and save own copy."""
    content = b"%PDF-1.4 MultiUser Shared Receipt Bytes"

    # User A saves
    client_a = get_user_client(USER_A_ID)
    res_a = client_a.post(
        "/documents/upload",
        files={"file": ("user_a_receipt.pdf", BytesIO(content), "application/pdf")},
    )
    doc_a_id = res_a.json()["document_id"]
    client_a.post(f"/documents/{doc_a_id}/extract")
    client_a.post(f"/documents/{doc_a_id}/save")
    assert len(mock_db.rows) == 1

    # User B uploads exact same bytes
    client_b = get_user_client(USER_B_ID)
    res_b = client_b.post(
        "/documents/upload",
        files={"file": ("user_b_receipt.pdf", BytesIO(content), "application/pdf")},
    )
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["is_duplicate"] is False
    assert data_b["existing_document_id"] is None
    doc_b_id = data_b["document_id"]

    # User B processes and saves
    client_b.post(f"/documents/{doc_b_id}/extract")
    client_b.post(f"/documents/{doc_b_id}/save")

    # Now DB contains exactly 2 documents (1 for User A, 1 for User B)
    assert len(mock_db.rows) == 2
    assert UUID(doc_a_id) in mock_db.rows
    assert UUID(doc_b_id) in mock_db.rows



# ─── TEST 7 — REPEATED DUPLICATE UPLOADS ─────────────────────────────────────
def test_7_repeated_duplicate_uploads_never_increase_db_count(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """User A uploads the same already-saved file 5 times: all 5 duplicate checks return true, DB row count does not increase."""
    content = b"%PDF-1.4 Repeated Duplicate Check Bytes"
    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("saved.pdf", BytesIO(content), "application/pdf")},
    )
    doc_id = up_res.json()["document_id"]
    client_user_a.post(f"/documents/{doc_id}/extract")
    client_user_a.post(f"/documents/{doc_id}/save")
    assert len(mock_db.rows) == 1

    for i in range(5):
        r = client_user_a.post(
            "/documents/upload",
            files={"file": (f"dup_{i}.pdf", BytesIO(content), "application/pdf")},
        )
        assert r.status_code == 200
        assert r.json()["is_duplicate"] is True
        assert r.json()["existing_document_id"] == doc_id
        assert len(mock_db.rows) == 1


# ─── TEST 8 — CONTENT HASH MATCHES SHA256 ───────────────────────────────────
def test_8_saved_document_content_hash_is_sha256_of_original_bytes(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Save document: verify content_hash == SHA256(original uploaded bytes)."""
    content = b"%PDF-1.4 Strict Deterministic SHA-256 Check Bytes"
    expected_hash = sha256(content).hexdigest()

    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("hash_check.pdf", BytesIO(content), "application/pdf")},
    )
    doc_id = up_res.json()["document_id"]
    client_user_a.post(f"/documents/{doc_id}/extract")
    client_user_a.post(f"/documents/{doc_id}/save")

    saved_doc = mock_db.rows[UUID(doc_id)]
    assert saved_doc.content_hash == expected_hash
    assert len(saved_doc.content_hash) == 64


# ─── TEST 9 — DATABASE UNIQUENESS CONCURRENCY BOUNDARY ───────────────────────
def test_9_database_uniqueness_prevents_accidental_duplicates(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Attempt duplicate persistence: uniqueness constraint prevents duplicate DB rows."""
    content = b"%PDF-1.4 Uniqueness Constraint Test"
    expected_hash = sha256(content).hexdigest()

    # Pre-populate 1 existing saved doc
    mock_db.insert(
        document_id=uuid4(),
        user_id=USER_A_ID,
        filename="existing.pdf",
        storage_path=f"{USER_A_ID}/existing/original.pdf",
        content_type="application/pdf",
        size=len(content),
        content_hash=expected_hash,
        status="completed",
    )
    assert len(mock_db.rows) == 1

    # Attempting to directly insert another document with same (user_id, content_hash) raises unique violation
    with pytest.raises(HTTPException) as exc:
        mock_db.insert(
            document_id=uuid4(),
            user_id=USER_A_ID,
            filename="concurrent.pdf",
            storage_path=f"{USER_A_ID}/concurrent/original.pdf",
            content_type="application/pdf",
            size=len(content),
            content_hash=expected_hash,
            status="completed",
        )
    assert "unique constraint" in exc.value.detail


# ─── TEST 10 — USER ISOLATION ────────────────────────────────────────────────
def test_10_user_a_cannot_detect_user_b_document_as_own_duplicate(mock_db: InMemoryDocumentDB):
    """User A cannot detect or access User B's document as their own duplicate."""
    content = b"%PDF-1.4 Isolation Test Bytes"
    expected_hash = sha256(content).hexdigest()

    # User B saves document
    mock_db.insert(
        document_id=uuid4(),
        user_id=USER_B_ID,
        filename="user_b_private.pdf",
        storage_path=f"{USER_B_ID}/private/original.pdf",
        content_type="application/pdf",
        size=len(content),
        content_hash=expected_hash,
        status="completed",
    )

    # User A uploads same content
    client_a = get_user_client(USER_A_ID)
    res_a = client_a.post(
        "/documents/upload",
        files={"file": ("user_a_upload.pdf", BytesIO(content), "application/pdf")},
    )
    assert res_a.status_code == 200
    assert res_a.json()["is_duplicate"] is False
    assert res_a.json()["existing_document_id"] is None



# ─── TEST 11 — SAVE ONCE ────────────────────────────────────────────────────
def test_11_save_once_creates_exactly_one_document(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Click Save to Library exactly once: exactly one persistent document."""
    content = b"%PDF-1.4 Save Once Test Bytes"
    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("once.pdf", BytesIO(content), "application/pdf")},
    )
    doc_id = up_res.json()["document_id"]
    client_user_a.post(f"/documents/{doc_id}/extract")
    save_res = client_user_a.post(f"/documents/{doc_id}/save")

    assert save_res.status_code == 200
    assert len(mock_db.rows) == 1


# ─── TEST 12 — SAVE BUTTON DOUBLE CLICK (IDEMPOTENCY) ───────────────────────
def test_12_save_button_double_click_is_idempotent(
    client_user_a: TestClient, mock_db: InMemoryDocumentDB
):
    """Rapidly click Save to Library multiple times: exactly one persistent document."""
    content = b"%PDF-1.4 Rapid Double Click Bytes"
    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("rapid.pdf", BytesIO(content), "application/pdf")},
    )
    doc_id = up_res.json()["document_id"]
    client_user_a.post(f"/documents/{doc_id}/extract")

    # Send 3 rapid Save requests for same document_id
    res1 = client_user_a.post(f"/documents/{doc_id}/save")
    res2 = client_user_a.post(f"/documents/{doc_id}/save")
    res3 = client_user_a.post(f"/documents/{doc_id}/save")

    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res3.status_code == 200
    assert res1.json()["document"]["document_id"] == doc_id
    assert res2.json()["document"]["document_id"] == doc_id
    assert res3.json()["document"]["document_id"] == doc_id

    # Strictly 1 database record
    assert len(mock_db.rows) == 1
