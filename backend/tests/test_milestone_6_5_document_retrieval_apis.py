"""Milestone 6.5: Document Retrieval APIs tests."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-00000000000a"
USER_B_ID = "00000000-0000-0000-0000-00000000000b"


def _make_doc(
    user_id_str: str,
    *,
    filename: str = "invoice.pdf",
    status: str = "completed",
    created_at: datetime | None = None,
    extraction: dict | None = None,
    quality: dict | None = None,
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
        created_at=created_at or datetime(2026, 2, 15, 12, 0, 0, tzinfo=UTC),
        processed_at=created_at or datetime(2026, 2, 15, 12, 0, 0, tzinfo=UTC),
        content_hash="a" * 64,
        extraction_result=extraction or {
            "vendor_company": "ACME Supplies",
            "address": "123 Main St",
            "invoice_number": "INV-1001",
            "date": "29/07/2026",
            "subtotal": 1000.0,
            "tax": 180.0,
            "discount": 0.0,
            "total": 1180.0,
            "line_items": [
                {
                    "description": "Office Chair",
                    "quantity": 2,
                    "unit_price": 500.0,
                    "line_total": 1000.0,
                }
            ],
        },
        quality_result=quality or {
            "overall_confidence": 0.95,
            "confidence_level": "HIGH",
            "needs_review": False,
            "signals": [
                {"code": "MATH_MATCH", "severity": "positive", "message": "Totals match."}
            ],
            "field_confidence": {},
            "provider_info": {"provider": "gemini", "model": "gemini-3.1-flash-lite"},
        },
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


# ─── 1. LIST DOCUMENTS ────────────────────────────────────────

def test_list_documents_authenticated_user_retrieves_own_documents(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /documents returns only the authenticated user's documents and stats."""
    doc1 = _make_doc(USER_A_ID, filename="receipt1.pdf", created_at=datetime(2026, 2, 15, 12, 0, tzinfo=UTC))
    doc2 = _make_doc(USER_A_ID, filename="receipt2.pdf", created_at=datetime(2026, 2, 14, 12, 0, tzinfo=UTC))

    async def mock_list(user_id: str, page: int = 1, page_size: int = 20, settings=None, **kwargs):
        assert user_id == USER_A_ID
        return [doc1, doc2], 2

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_a.get("/documents?page=1&page_size=8")

    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 8
    assert data["total"] == 2
    assert data["has_next"] is False
    assert len(data["items"]) == 2
    assert data["items"][0]["filename"] == "receipt1.pdf"
    assert data["items"][1]["filename"] == "receipt2.pdf"
    assert data["stats"]["total"] == 2
    assert data["stats"]["processed"] == 2
    assert data["stats"]["needs_review"] == 0


def test_list_documents_unauthenticated_request_rejected(
    unauthenticated_client: TestClient
) -> None:
    """GET /documents without authentication headers returns 401 or 403."""
    response = unauthenticated_client.get("/documents")
    assert response.status_code in (401, 403)


def test_list_documents_pagination_validation(
    client_user_a: TestClient
) -> None:
    """GET /documents validates page and page_size bounds (rejects page_size > 100)."""
    # page_size > 100 must fail with 422 Unprocessable Entity
    resp_over = client_user_a.get("/documents?page=1&page_size=200")
    assert resp_over.status_code == 422

    # page < 1 must fail with 422 Unprocessable Entity
    resp_under = client_user_a.get("/documents?page=0&page_size=20")
    assert resp_under.status_code == 422


def test_list_documents_empty_library_handling(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /documents for a user with no documents returns 200 with empty items and stats=0."""
    async def mock_empty(user_id: str, page: int = 1, page_size: int = 20, settings=None, **kwargs):
        return [], 0

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_empty)

    response = client_user_a.get("/documents")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["has_next"] is False
    assert data["stats"]["total"] == 0
    assert data["stats"]["processed"] == 0
    assert data["stats"]["needs_review"] == 0


# ─── 2. SINGLE DOCUMENT RETRIEVAL ─────────────────────────────

def test_get_single_document_returns_persisted_data(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /documents/{id} returns metadata, extraction, validation, quality and signed URL."""
    doc = _make_doc(USER_A_ID, filename="invoice_acme.pdf")

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://storage.signed.url/doc"))

    response = client_user_a.get(f"/documents/{doc.id}")

    assert response.status_code == 200
    data = response.json()

    # Metadata
    assert data["document"]["document_id"] == str(doc.id)
    assert data["document"]["filename"] == "invoice_acme.pdf"
    assert data["document"]["content_type"] == "application/pdf"
    assert data["document"]["size"] == 2048
    assert data["document"]["status"] == "completed"

    # Extraction
    assert data["extraction"]["vendor_company"] == "ACME Supplies"
    assert data["extraction"]["invoice_number"] == "INV-1001"
    assert data["extraction"]["date"] == "29/07/2026"
    assert data["extraction"]["subtotal"] == 1000.0
    assert data["extraction"]["tax"] == 180.0
    assert data["extraction"]["total"] == 1180.0
    assert len(data["extraction"]["line_items"]) == 1
    assert data["extraction"]["line_items"][0]["description"] == "Office Chair"

    # Validation
    assert data["validation"]["validation_performed"] is True
    assert data["validation"]["total_matches"] is True

    # Quality & Provider Info
    assert data["quality"]["confidence_level"] == "HIGH"
    assert data["quality"]["overall_confidence"] == 0.95
    assert data["quality"]["needs_review"] is False
    assert data["quality"]["provider_info"]["provider"] == "gemini"
    assert data["quality"]["provider_info"]["model"] == "gemini-3.1-flash-lite"

    # Original document signed URL info
    assert data["original"]["download_url"] == "https://storage.signed.url/doc"
    assert data["original"]["filename"] == "invoice_acme.pdf"


# ─── 3. USER ISOLATION ────────────────────────────────────────

def test_user_a_can_retrieve_own_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A can retrieve User A's document."""
    doc_a = _make_doc(USER_A_ID, filename="doc_a.pdf")

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_a.id) and str(user_id) == USER_A_ID:
            return doc_a
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://storage.signed.url/doc"))

    response = client_user_a.get(f"/documents/{doc_a.id}")
    assert response.status_code == 200
    assert response.json()["document"]["filename"] == "doc_a.pdf"


def test_user_a_cannot_retrieve_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting User B's document receives 404 (Not Found) without leaking existence."""
    doc_b = _make_doc(USER_B_ID, filename="doc_b.pdf")

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        # Service function get_document_metadata filters by user_id = USER_A_ID
        # so searching for User B's document under User A returns None
        if str(document_id) == str(doc_b.id) and str(user_id) == USER_B_ID:
            return doc_b
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)

    response = client_user_a.get(f"/documents/{doc_b.id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_user_b_cannot_retrieve_user_a_document(
    client_user_b: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User B requesting User A's document receives 404 (Not Found)."""
    doc_a = _make_doc(USER_A_ID, filename="doc_a.pdf")

    async def mock_get(document_id: UUID, user_id: str, settings=None):
        if str(document_id) == str(doc_a.id) and str(user_id) == USER_A_ID:
            return doc_a
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)

    response = client_user_b.get(f"/documents/{doc_a.id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


# ─── 4. NO REPROCESSING ──────────────────────────────────────

def test_get_document_is_read_only_and_does_not_trigger_ai(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /documents/{id} must be a read-only operation and never call AI extraction."""
    doc = _make_doc(USER_A_ID)

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://storage.signed.url/doc"))

    mock_gemini = AsyncMock()
    monkeypatch.setattr(document_routes, "extract_receipt_invoice_document", mock_gemini)

    response = client_user_a.get(f"/documents/{doc.id}")

    assert response.status_code == 200
    # Verify AI extraction pipeline was NOT called
    mock_gemini.assert_not_called()


# ─── 5. DATE SERIALIZATION ────────────────────────────────────

def test_date_serialization_integrity(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Timestamps and document dates serialize as valid strings without causing Invalid Date."""
    doc = _make_doc(
        USER_A_ID,
        created_at=datetime(2026, 7, 29, 14, 30, 0, tzinfo=UTC),
        extraction={"vendor_company": "FreshMart", "date": "29/07/2026", "total": 842.75},
    )

    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://storage.signed.url/doc"))

    response = client_user_a.get(f"/documents/{doc.id}")

    assert response.status_code == 200
    data = response.json()
    assert "2026-07-29" in data["document"]["created_at"]
    assert data["extraction"]["date"] == "29/07/2026"
