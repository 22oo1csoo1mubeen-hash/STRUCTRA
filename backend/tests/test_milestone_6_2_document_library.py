"""Milestone 6.2: Document Persistence & Document Library API tests."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
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
        created_at=created_at or datetime(2026, 2, 1, 12, 0, 0, tzinfo=UTC),
        processed_at=created_at or datetime(2026, 2, 1, 12, 0, 0, tzinfo=UTC),
        content_hash="b" * 64,
        extraction_result=extraction or {"vendor_company": "STRUCTRA Corp", "total": 250.0, "date": "2026-02-01"},
        quality_result=quality or {
            "overall_confidence": 0.95,
            "confidence_level": "HIGH",
            "needs_review": False,
            "signals": [],
            "field_confidence": {},
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


def test_list_documents_authenticated_returns_paginated_summary(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /documents returns user's paginated documents with high-level summary metadata."""
    doc1 = _make_doc(USER_A_ID, filename="first.pdf", created_at=datetime(2026, 2, 2, tzinfo=UTC))
    doc2 = _make_doc(USER_A_ID, filename="second.pdf", created_at=datetime(2026, 2, 1, tzinfo=UTC))

    async def mock_list(user_id: str, page: int = 1, page_size: int = 20, settings=None, **kwargs):
        return [doc1, doc2], 2

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_a.get("/documents?page=1&page_size=20")

    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert data["total"] == 2
    assert data["has_next"] is False
    assert len(data["items"]) == 2

    item0 = data["items"][0]
    assert item0["document_id"] == str(doc1.id)
    assert item0["filename"] == "first.pdf"
    assert item0["has_extraction"] is True
    assert item0["vendor_name"] == "STRUCTRA Corp"
    assert item0["total_amount"] == 250.0
    assert item0["confidence_level"] == "HIGH"


def test_list_documents_search_and_doctype_passed_to_metadata(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Search query, doc_type, and sort_by filters are forwarded to list_document_metadata."""
    doc1 = _make_doc(USER_A_ID)
    captured_kwargs = {}

    async def mock_list(user_id: str, page: int = 1, page_size: int = 20, settings=None, **kwargs):
        captured_kwargs.update(kwargs)
        return [doc1], 1

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_a.get("/documents?q=MART&doc_type=RECEIPT&sort_by=amount_desc")
    assert response.status_code == 200
    assert captured_kwargs.get("search") == "MART"
    assert captured_kwargs.get("doc_type") == "RECEIPT"
    assert captured_kwargs.get("sort_by") == "amount_desc"


def test_list_documents_pagination_has_next(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Pagination metadata calculates has_next correctly when total > page * page_size."""
    doc1 = _make_doc(USER_A_ID)

    async def mock_list(user_id: str, page: int = 1, page_size: int = 1, settings=None, **kwargs):
        return [doc1], 5

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_a.get("/documents?page=1&page_size=1")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5
    assert data["page"] == 1
    assert data["page_size"] == 1
    assert data["has_next"] is True


def test_list_documents_invalid_pagination_returns_422(client_user_a: TestClient) -> None:
    """Invalid page or page_size parameters return HTTP 422 validation error."""
    resp1 = client_user_a.get("/documents?page=0")
    assert resp1.status_code == 422

    resp2 = client_user_a.get("/documents?page_size=0")
    assert resp2.status_code == 422

    resp3 = client_user_a.get("/documents?page_size=101")
    assert resp3.status_code == 422


def test_get_single_document_returns_metadata_extraction_and_quality(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /documents/{id} returns full metadata, saved extraction, quality signals, and original file access."""
    doc = _make_doc(USER_A_ID)
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(
        document_routes, "create_signed_storage_url", AsyncMock(return_value="https://example.supabase.co/signed-path")
    )

    response = client_user_a.get(f"/documents/{doc.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["document"]["document_id"] == str(doc.id)
    assert data["document"]["filename"] == "invoice.pdf"
    assert data["extraction"]["vendor_company"] == "STRUCTRA Corp"
    assert data["extraction"]["total"] == 250.0
    assert data["quality"]["overall_confidence"] == 0.95
    assert data["quality"]["confidence_level"] == "HIGH"
    assert data["original"]["download_url"] == "https://example.supabase.co/signed-path"
    assert data["original"]["content_type"] == "application/pdf"


def test_user_a_cannot_get_user_b_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User A requesting User B's document receives a safe HTTP 404 response."""
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))

    response = client_user_a.get(f"/documents/{uuid4()}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_unauthenticated_request_rejected() -> None:
    """Unauthenticated requests to /documents return HTTP 401."""
    client = TestClient(app)
    resp1 = client.get("/documents")
    assert resp1.status_code == 401

    resp2 = client.get(f"/documents/{uuid4()}")
    assert resp2.status_code == 401


@pytest.mark.anyio
async def test_extraction_persists_extraction_result_and_quality(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Successful extraction updates public.documents with extraction_result and quality_result JSON."""
    doc = _make_doc(USER_A_ID, status="pending")
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=b"pdf_bytes"))
    monkeypatch.setattr(document_routes, "update_document_status", AsyncMock())
    monkeypatch.setattr(
        document_routes.default_ocr_service,
        "extract_text_from_bytes",
        MagicMock(return_value=MagicMock(full_text="text", lines=[])),
    )
    monkeypatch.setattr(
        document_routes.default_ai_manager,
        "last_used_provider_info",
        document_routes.ProviderInfo(provider="mock_provider", model="mock_model"),
    )

    extracted_model = ReceiptInvoiceExtraction(vendor_company="Persisted Vendor", total=100.0)
    monkeypatch.setattr(
        document_routes.default_ai_manager, "extract_document", AsyncMock(return_value=extracted_model)
    )

    update_ext_mock = AsyncMock()
    monkeypatch.setattr(document_routes, "update_document_extraction_and_quality", update_ext_mock)

    response = client_user_a.post(f"/documents/{doc.id}/extract")

    assert response.status_code == 200
    assert update_ext_mock.called
    kwargs = update_ext_mock.call_args.kwargs
    assert kwargs["document_id"] == doc.id
    assert kwargs["user_id"] == USER_A_ID
    assert kwargs["extraction"]["vendor_company"] == "Persisted Vendor"
    assert "quality" in kwargs


@pytest.mark.parametrize(
    "sort_param,expected_sort",
    [
        ("newest", None),
        ("oldest", "oldest"),
        ("date_desc", "date_desc"),
        ("date_asc", "date_asc"),
        ("amount_desc", "amount_desc"),
        ("amount_asc", "amount_asc"),
    ],
)
def test_list_documents_all_sort_options(
    client_user_a: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    sort_param: str,
    expected_sort: str | None,
) -> None:
    """All sorting parameters (newest, oldest, date_desc, date_asc, amount_desc, amount_asc) are routed correctly."""
    captured_kwargs = {}

    async def mock_list(user_id: str, page: int = 1, page_size: int = 20, settings=None, **kwargs):
        captured_kwargs.update(kwargs)
        return [], 0

    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list)

    response = client_user_a.get(f"/documents?sort_by={sort_param}")
    assert response.status_code == 200
    assert captured_kwargs.get("sort_by") == expected_sort

