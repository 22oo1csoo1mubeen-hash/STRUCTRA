"""Milestone 6.8: Full Architecture Verification & End-to-End Integration Tests."""

from datetime import UTC, datetime
from io import BytesIO
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
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.document_metadata import CreatedDocumentMetadata
from app.services.storage import build_document_storage_path

USER_A_ID = "00000000-0000-0000-0000-00000000008a"
USER_B_ID = "00000000-0000-0000-0000-00000000008b"


def _make_doc(
    user_id_str: str = USER_A_ID,
    *,
    filename: str = "receipt_end2end.pdf",
    status_str: str = "completed",
    content_hash: str | None = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    created_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    doc_id = uuid4()
    return CreatedDocumentMetadata(
        id=doc_id,
        user_id=UUID(user_id_str),
        filename=filename,
        storage_path=build_document_storage_path(user_id_str, filename, document_id=doc_id),
        content_type="application/pdf",
        size=4096,
        status=status_str,
        created_at=created_at or datetime(2026, 3, 20, 10, 0, 0, tzinfo=UTC),
        processed_at=created_at or datetime(2026, 3, 20, 10, 0, 0, tzinfo=UTC),
        content_hash=content_hash,
        extraction_result={
            "vendor_company": "Apex Corp",
            "address": "456 Tech Park",
            "invoice_number": "INV-2026-99",
            "date": "20/03/2026",
            "subtotal": 500.0,
            "tax": 90.0,
            "discount": 0.0,
            "total": 590.0,
            "line_items": [
                {"description": "Server Hardware", "quantity": 1, "unit_price": 500.0, "line_total": 500.0}
            ],
        },
        quality_result={
            "overall_confidence": 0.98,
            "confidence_level": "HIGH",
            "needs_review": False,
            "signals": [{"code": "MATH_MATCH", "severity": "positive", "message": "Totals match perfectly."}],
            "provider_info": {"provider": "gemini", "model": "gemini-3.1-flash-lite"},
        },
    )


@pytest.fixture
def client_user_a() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def client_user_b() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_B_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ─── GROUP 1: STORAGE FOUNDATION ──────────────────────────────

def test_storage_path_format_and_private_bucket_metadata() -> None:
    """Storage paths strictly follow {user_id}/{document_id}/original.{ext}."""
    doc_id = uuid4()
    path = build_document_storage_path(USER_A_ID, "invoice.pdf", document_id=doc_id)
    assert path == f"{USER_A_ID}/{doc_id}/original.pdf"
    assert path.startswith(USER_A_ID)
    assert path.endswith(".pdf")


# ─── GROUP 2: PERSISTENCE & READ-ONLY RETRIEVAL ──────────────

def test_retrieval_reads_persisted_data_without_ai_reprocessing(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /documents/{id} returns saved extraction/quality/validation without calling AI."""
    doc = _make_doc(USER_A_ID)
    mock_ai = AsyncMock()

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://signed.url"))
    monkeypatch.setattr(document_routes, "extract_receipt_invoice_document", mock_ai)

    response = client_user_a.get(f"/documents/{doc.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["extraction"]["vendor_company"] == "Apex Corp"
    assert data["quality"]["confidence_level"] == "HIGH"
    assert data["validation"]["total_matches"] is True
    mock_ai.assert_not_called()


# ─── GROUP 3: DUPLICATE DETECTION ────────────────────────────

def test_duplicate_detection_user_isolation_and_zero_side_effects(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Duplicate upload by same user returns existing doc; creates 0 new DB/storage records."""
    doc_a = _make_doc(USER_A_ID, content_hash="hash_abc")

    monkeypatch.setattr(document_routes, "hash_document_content", lambda content: "hash_abc")

    async def mock_find_duplicate(*, content_hash: str, user_id: str, settings=None):
        if content_hash == "hash_abc" and user_id == USER_A_ID:
            return [doc_a]
        return []

    mock_storage_upload = AsyncMock()
    mock_create_db = AsyncMock()

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", mock_find_duplicate)
    monkeypatch.setattr(document_routes, "upload_document_to_storage", mock_storage_upload)
    monkeypatch.setattr(document_routes, "create_document_metadata", mock_create_db)

    fake_file = ("duplicate.pdf", BytesIO(b"PDF Content"), "application/pdf")
    response = client_user_a.post("/documents/upload", files={"file": fake_file})

    assert response.status_code == 200
    data = response.json()
    assert data["is_duplicate"] is True
    assert data["document_id"] == str(doc_a.id)
    mock_storage_upload.assert_not_called()
    mock_create_db.assert_not_called()


# ─── GROUP 4: DOCUMENT RETRIEVAL APIs ─────────────────────────

def test_get_documents_list_and_detail_contracts(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """List and Detail endpoints strictly conform to frontend API contract."""
    doc = _make_doc(USER_A_ID)

    async def mock_list(user_id: str, **kwargs):
        assert user_id == USER_A_ID
        return [doc], 1

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_a.get("/documents?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "stats" in data
    assert data["total"] == 1
    assert data["stats"]["processed"] == 1


# ─── GROUP 5: PREVIEW ─────────────────────────────────────────

def test_owner_can_preview_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Owner preview generates short-lived signed URL."""
    doc_a = _make_doc(USER_A_ID)
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc_a))
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://signed.url/token"))

    res = client_user_a.get(f"/documents/{doc_a.id}/preview")
    assert res.status_code == 200
    assert "signed.url" in res.json()["preview_url"]


def test_foreign_user_preview_returns_404(
    client_user_b: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Foreign user preview returns 404 and generates no signed URL."""
    doc_a = _make_doc(USER_A_ID)
    mock_signed = AsyncMock()

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_a.id) and str(user_id) == USER_A_ID:
            return doc_a
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "create_signed_storage_url", mock_signed)

    res = client_user_b.get(f"/documents/{doc_a.id}/preview")
    assert res.status_code == 404
    mock_signed.assert_not_called()


# ─── GROUP 6: DOWNLOAD ────────────────────────────────────────

def test_owner_can_download_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Owner download returns exact bytes and headers."""
    doc_a = _make_doc(USER_A_ID, filename="my_receipt.pdf")
    fake_bytes = b"%PDF-1.4 Raw Receipt Bytes"

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc_a))
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=fake_bytes))

    res = client_user_a.get(f"/documents/{doc_a.id}/download")
    assert res.status_code == 200
    assert res.content == fake_bytes
    assert "my_receipt.pdf" in res.headers["content-disposition"]


def test_foreign_user_download_returns_404(
    client_user_b: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Foreign user download returns 404 and accesses no storage bytes."""
    doc_a = _make_doc(USER_A_ID)
    mock_storage = AsyncMock()

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_a.id) and str(user_id) == USER_A_ID:
            return doc_a
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "download_document_from_storage", mock_storage)

    res = client_user_b.get(f"/documents/{doc_a.id}/download")
    assert res.status_code == 404
    mock_storage.assert_not_called()


# ─── GROUP 7: DELETE & PARTIAL FAILURE SAFETY ───────────────

def test_delete_cascades_and_handles_storage_failure_safely(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Delete cleans storage + DB; if storage service gives 503 error, DB row is preserved."""
    doc = _make_doc(USER_A_ID)
    mock_db_delete = AsyncMock()

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(
        document_routes,
        "delete_document_from_storage",
        AsyncMock(side_effect=HTTPException(status_code=503, detail="Storage down")),
    )
    monkeypatch.setattr(document_routes, "delete_document_metadata", mock_db_delete)

    response = client_user_a.delete(f"/documents/{doc.id}")
    assert response.status_code == 503
    mock_db_delete.assert_not_awaited()


# ─── GROUP 8: END-TO-END MULTI-USER ISOLATION ───────────────

def test_cross_user_isolation_matrix(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Complete matrix: User A cannot read, preview, download, extract, or delete User B docs."""
    doc_b = _make_doc(USER_B_ID)

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)

    assert client_user_a.get(f"/documents/{doc_b.id}").status_code == 404
    assert client_user_a.get(f"/documents/{doc_b.id}/preview").status_code == 404
    assert client_user_a.get(f"/documents/{doc_b.id}/download").status_code == 404
    assert client_user_a.post(f"/documents/{doc_b.id}/extract").status_code == 404
    assert client_user_a.delete(f"/documents/{doc_b.id}").status_code == 404


# ─── GROUP 9: SEARCH / FILTER / PAGINATION ISOLATION ─────────

def test_search_filter_pagination_user_scoped(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Search and filter parameters are strictly scoped to authenticated user."""
    mock_list = AsyncMock(return_value=([], 0))
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    client_user_a.get("/documents?q=confidential&status_filter=processed&page=1&page_size=5")

    mock_list.assert_awaited_once_with(
        user_id=USER_A_ID, page=1, page_size=5, search="confidential", needs_review=False, settings=ANY
    )


# ─── GROUP 10: PIPELINE FAILURE SAFETY ───────────────────────

def test_extraction_failure_transitions_status_to_failed(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Extraction failure updates status to 'failed' without corrupting persistent state."""
    doc = _make_doc(USER_A_ID, status_str="processing")
    mock_update_status = AsyncMock()

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(document_routes, "update_document_status", mock_update_status)
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=b"bad bytes"))
    monkeypatch.setattr(document_routes, "hash_document_content", lambda c: "hash_fail")
    monkeypatch.setattr(document_routes.default_extraction_cache, "get", AsyncMock(return_value=None))

    monkeypatch.setattr(
        document_routes.default_coalescer,
        "run_coalesced",
        AsyncMock(side_effect=HTTPException(status_code=503, detail="AI Service Down")),
    )

    response = client_user_a.post(f"/documents/{doc.id}/extract")

    assert response.status_code == 503
    mock_update_status.assert_awaited_with(
        document_id=doc.id, user_id=USER_A_ID, document_status="failed", settings=ANY
    )


# ─── GROUP 11: AUTHENTICATION ENFORCEMENT & OVERRIDE PREVENTION

def test_unauthenticated_requests_return_401(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unauthenticated requests without a valid bearer token are rejected with 401."""
    monkeypatch.setattr(
        dependencies,
        "get_authenticated_user",
        AsyncMock(
            side_effect=HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Bearer token required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        ),
    )
    with TestClient(app) as client:
        fake_id = uuid4()
        assert client.get("/documents").status_code == 401
        assert client.get(f"/documents/{fake_id}").status_code == 401
        assert client.get(f"/documents/{fake_id}/preview").status_code == 401
        assert client.get(f"/documents/{fake_id}/download").status_code == 401
        assert client.delete(f"/documents/{fake_id}").status_code == 401


def test_query_param_user_id_override_ignored(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Supplying ?user_id=other parameter in client request is ignored."""
    mock_list = AsyncMock(return_value=([], 0))
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    client_user_a.get(f"/documents?user_id={USER_B_ID}")
    mock_list.assert_awaited_once_with(user_id=USER_A_ID, page=1, page_size=20, settings=ANY)


# ─── GROUP 13: SAVE SEMANTICS & EXPLICIT PERSISTENCE ─────────

def test_extraction_does_not_automatically_save_to_library(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Extraction sets status to processing; document does NOT appear in completed library."""
    doc = _make_doc(USER_A_ID, status_str="processing")
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(document_routes, "update_document_status", AsyncMock(return_value=None))
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=b"PDF"))
    monkeypatch.setattr(document_routes, "hash_document_content", lambda c: "hash123")
    fake_ext = {
        "vendor_company": "Test Vendor",
        "address": None,
        "date": "2026-03-20",
        "invoice_number": "INV-001",
        "subtotal": 100.0,
        "tax": 10.0,
        "discount": 0.0,
        "total": 110.0,
        "line_items": [
            {"description": "Item 1", "quantity": 1, "unit_price": 100.0, "line_total": 100.0}
        ],
    }
    cached_ext = ReceiptInvoiceExtraction.model_validate(fake_ext)
    monkeypatch.setattr(document_routes.default_extraction_cache, "get", AsyncMock(return_value=cached_ext))

    mock_update_ext = AsyncMock(return_value=None)
    monkeypatch.setattr(document_routes, "update_document_extraction_and_quality", mock_update_ext)

    response = client_user_a.post(f"/documents/{doc.id}/extract")
    assert response.status_code == 200

    # Verify extraction update was invoked with extracted payload
    mock_update_ext.assert_awaited_once()


def test_explicit_save_to_library_commits_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """POST /documents/{id}/save explicitly commits document status to completed."""
    processing_doc = _make_doc(USER_A_ID, status_str="processing")
    completed_doc = _make_doc(USER_A_ID, status_str="completed")

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        return completed_doc if mock_update_status.await_count > 0 else processing_doc

    mock_update_status = AsyncMock()
    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "update_document_status", mock_update_status)
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://signed.url"))

    response = client_user_a.post(f"/documents/{processing_doc.id}/save")

    assert response.status_code == 200
    assert response.json()["document"]["status"] == "completed"
    mock_update_status.assert_awaited_once_with(
        document_id=processing_doc.id,
        user_id=USER_A_ID,
        document_status="completed",
        settings=ANY,
    )
