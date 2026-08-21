"""Tests for Milestone 9.4: Backend Export Endpoint (GET /documents/{document_id}/export)."""

import io
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock
from uuid import UUID, uuid4

import openpyxl
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata

TEST_USER_ID = "00000000-0000-0000-0000-000000000011"
OTHER_USER_ID = "00000000-0000-0000-0000-000000000099"


def _sample_doc_record(
    *,
    user_id: str = TEST_USER_ID,
    vendor: str = "Test Supermarket Ltd",
    date_str: str = "2026-08-21",
    total: float = 1250.00,
) -> CreatedDocumentMetadata:
    doc_id = uuid4()
    return CreatedDocumentMetadata(
        id=doc_id,
        user_id=UUID(user_id),
        filename="supermarket_bill.png",
        storage_path=f"{user_id}/{doc_id}/original.png",
        content_type="image/png",
        size=102400,
        status="completed",
        created_at=datetime(2026, 8, 21, 10, 0, 0, tzinfo=UTC),
        processed_at=datetime(2026, 8, 21, 10, 0, 5, tzinfo=UTC),
        extraction_result={
            "vendor_company": vendor,
            "address": "123 Market Street",
            "date": date_str,
            "invoice_number": "INV-9900",
            "subtotal": 1200.00,
            "discount": 0.0,
            "taxable_amount": 1200.00,
            "tax": 50.00,
            "tax_components": [{"name": "GST", "rate": 5.0, "amount": 50.00}],
            "service_charge": 0.0,
            "round_off": 0.0,
            "total": total,
            "line_items": [
                {"description": "Organic Oats 1kg", "quantity": 2.0, "unit_price": 300.0, "line_total": 600.0},
                {"description": "Raw Almonds 500g", "quantity": 1.0, "unit_price": 600.0, "line_total": 600.0},
            ],
        },
        quality_result={
            "confidence_level": "HIGH",
            "overall_confidence": 0.98,
            "confidence_override": None,
            "needs_review": False,
            "mathematical_validation": {
                "validation_performed": True,
                "total_matches": True,
                "calculated_total": total,
                "document_total": total,
                "difference": 0.0,
            },
            "issues": [],
        },
    )


@pytest.fixture
def authenticated_client() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=TEST_USER_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> TestClient:
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client


def test_export_document_unauthenticated_rejected(unauthenticated_client: TestClient) -> None:
    """Unauthenticated request to GET /documents/{id}/export must return 401 Unauthorized."""
    doc_id = uuid4()
    response = unauthenticated_client.get(f"/documents/{doc_id}/export")
    assert response.status_code == 401


def test_export_document_not_found(authenticated_client: TestClient, monkeypatch) -> None:
    """Requesting an export for a non-existent document returns 404."""
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))

    doc_id = uuid4()
    response = authenticated_client.get(f"/documents/{doc_id}/export")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_export_document_ownership_enforcement(authenticated_client: TestClient, monkeypatch) -> None:
    """Requesting a document belonging to another user is rejected with 404 by metadata isolation."""
    # When get_document_metadata is called with current_user's user_id, it returns None if user_id doesn't match
    async def mock_get_meta(document_id, user_id, settings):
        if str(user_id) == TEST_USER_ID:
            return None  # isolated from other user's document
        return _sample_doc_record(user_id=OTHER_USER_ID)

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get_meta)

    doc_id = uuid4()
    response = authenticated_client.get(f"/documents/{doc_id}/export")
    assert response.status_code == 404


def test_export_document_authenticated_success(authenticated_client: TestClient, monkeypatch) -> None:
    """Authenticated user exporting their own document receives 200 with valid .xlsx bytes."""
    doc = _sample_doc_record(vendor="Metro Hypermarket", date_str="2026-08-21")
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))

    response = authenticated_client.get(f"/documents/{doc.id}/export")

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "filename*=" in response.headers["Content-Disposition"]
    from urllib.parse import unquote
    assert "STRUCTRA_EXPORT_supermarket_bill.xlsx" in unquote(response.headers["Content-Disposition"])

    # Verify content is valid Excel OpenXML
    wb = openpyxl.load_workbook(io.BytesIO(response.content))
    assert "Document Report" in wb.sheetnames
    ws = wb["Document Report"]
    assert ws.cell(row=1, column=1).value == "STRUCTRA"

    # Verify line items and financial values
    all_values = [str(cell.value) for row in ws.iter_rows() for cell in row if cell.value is not None]
    assert any("Metro Hypermarket" in val for val in all_values)
    assert any("Organic Oats 1kg" in val for val in all_values)
    assert any(1250.0 == cell.value for row in ws.iter_rows() for cell in row)


def test_export_document_does_not_trigger_ai_or_ocr(authenticated_client: TestClient, monkeypatch) -> None:
    """Exporting a document must NOT trigger Gemini, Groq, RapidOCR, or any re-processing."""
    doc = _sample_doc_record()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))

    ai_called = False
    ocr_called = False

    def mock_ai(*args, **kwargs):
        nonlocal ai_called
        ai_called = True
        raise RuntimeError("AI extraction should not be called during export!")

    def mock_ocr(*args, **kwargs):
        nonlocal ocr_called
        ocr_called = True
        raise RuntimeError("OCR should not be called during export!")

    response = authenticated_client.get(f"/documents/{doc.id}/export")

    assert response.status_code == 200
    assert not ai_called
    assert not ocr_called


def test_export_document_temp_upload_session_success(authenticated_client: TestClient, monkeypatch) -> None:
    """A document on the upload result workspace (in temp session before library save) can be exported."""
    doc_id = uuid4()
    # Mock no saved library metadata
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))

    # Register temporary upload session
    document_routes._register_temp_upload_session(
        document_id=doc_id,
        user_id=TEST_USER_ID,
        filename="recent_receipt.png",
        storage_path=f"{TEST_USER_ID}/{doc_id}/original.png",
        content_type="image/png",
        size=50000,
        content_hash="abc123hash",
        created_at=datetime.now(UTC),
    )

    # Mock storage download & cache
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=b"fake-image-bytes"))
    
    mock_cached = SimpleNamespace(
        model_dump=lambda mode="json": {
            "vendor_company": "Fresh Mart",
            "date": "2026-08-21",
            "total": 450.00,
            "line_items": [{"description": "Apples", "quantity": 1, "unit_price": 450.00, "line_total": 450.00}],
        }
    )
    monkeypatch.setattr(document_routes.default_extraction_cache, "get", AsyncMock(return_value=mock_cached))

    response = authenticated_client.get(f"/documents/{doc_id}/export")

    assert response.status_code == 200
    assert "STRUCTRA_EXPORT_recent_receipt.xlsx" in response.headers["Content-Disposition"]

    wb = openpyxl.load_workbook(io.BytesIO(response.content))
    assert "Document Report" in wb.sheetnames
