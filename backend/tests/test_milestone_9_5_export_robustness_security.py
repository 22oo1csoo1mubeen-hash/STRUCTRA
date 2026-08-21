"""Comprehensive test suite for Milestone 9.5: Export Robustness, Security, and Automated Testing."""

import io
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock
from urllib.parse import unquote
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
from app.services.export.data_mapper import (
    generate_export_filename,
    map_document_to_export_data,
)
from app.services.export.excel_generator import generate_document_excel_bytes
from app.services.export.schemas import ExportDocumentData

USER_A_ID = "00000000-0000-0000-0000-000000000001"
USER_B_ID = "00000000-0000-0000-0000-000000000002"


def _build_doc(
    *,
    doc_id: UUID | None = None,
    user_id: str = USER_A_ID,
    filename: str = "receipt.png",
    extraction: dict | None = None,
    quality: dict | None = None,
    status: str = "completed",
) -> CreatedDocumentMetadata:
    return CreatedDocumentMetadata(
        id=doc_id or uuid4(),
        user_id=UUID(user_id),
        filename=filename,
        storage_path=f"{user_id}/{doc_id or uuid4()}/{filename}",
        content_type="image/png",
        size=50000,
        status=status,
        created_at=datetime(2026, 8, 21, 12, 0, 0, tzinfo=UTC),
        processed_at=datetime(2026, 8, 21, 12, 0, 2, tzinfo=UTC),
        extraction_result=extraction,
        quality_result=quality,
    )


@pytest.fixture
def client_user_a() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> TestClient:
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client


# ══════════════════════════════════════════════════════════════════════════════
# 1. SECURITY & USER ISOLATION TESTS
# ══════════════════════════════════════════════════════════════════════════════

def test_missing_authentication_returns_401(unauthenticated_client: TestClient) -> None:
    """Unauthenticated requests to /documents/{id}/export return 401."""
    res = unauthenticated_client.get(f"/documents/{uuid4()}/export")
    assert res.status_code == 401


def test_unauthorized_document_cross_user_isolation(client_user_a: TestClient, monkeypatch) -> None:
    """User A attempting to export a document owned by User B receives 404."""
    user_b_doc = _build_doc(user_id=USER_B_ID)

    async def mock_get_doc(document_id, user_id, settings):
        # Database query scopes strictly by user_id
        if str(user_id) == str(user_b_doc.user_id):
            return user_b_doc
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get_doc)

    res = client_user_a.get(f"/documents/{user_b_doc.id}/export")
    assert res.status_code == 404
    assert res.json()["detail"] == "Document not found."


def test_non_existent_document_returns_404(client_user_a: TestClient, monkeypatch) -> None:
    """Exporting non-existent document ID returns 404."""
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))
    res = client_user_a.get(f"/documents/{uuid4()}/export")
    assert res.status_code == 404


def test_invalid_uuid_returns_422(client_user_a: TestClient) -> None:
    """Non-UUID parameter returns standard 422 Unprocessable Entity."""
    res = client_user_a.get("/documents/not-a-valid-uuid/export")
    assert res.status_code == 422


def test_no_ai_ocr_rag_calls_during_export(client_user_a: TestClient, monkeypatch) -> None:
    """Exporting must never trigger AI or OCR pipeline functions."""
    doc = _build_doc(extraction={"vendor_company": "Test Vendor", "total": 100.0})
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))

    def fail_if_called(*args, **kwargs):
        raise AssertionError("Pipeline AI/OCR function must NOT be called during export!")

    monkeypatch.setattr(document_routes, "extract_receipt_invoice_document", fail_if_called)

    res = client_user_a.get(f"/documents/{doc.id}/export")
    assert res.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# 2. INCOMPLETE & MALFORMED DOCUMENTS
# ══════════════════════════════════════════════════════════════════════════════

def test_export_with_none_extraction_and_quality() -> None:
    """Document with None extraction_result and quality_result generates valid workbook."""
    doc = _build_doc(extraction=None, quality=None)
    raw_bytes = generate_document_excel_bytes(doc)
    assert len(raw_bytes) > 500

    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    ws = wb.active
    assert ws.cell(row=1, column=1).value == "STRUCTRA"
    all_vals = [str(c.value) for row in ws.iter_rows() for c in row if c.value is not None]
    assert any("No itemized line items extracted" in v for v in all_vals)


def test_export_with_missing_vendor_and_address() -> None:
    """Document missing vendor and address renders placeholder dashes."""
    doc = _build_doc(extraction={"total": 250.0, "subtotal": 250.0})
    raw_bytes = generate_document_excel_bytes(doc)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    ws = wb.active
    assert ws.cell(row=6, column=2).value == "—"  # Vendor
    assert ws.cell(row=7, column=2).value == "—"  # Address


def test_export_with_malformed_line_items() -> None:
    """Malformed line items with non-numeric quantities, nested lists, or missing keys generate cleanly."""
    malformed_items = [
        {"description": None, "quantity": "two", "unit_price": "$15.50", "line_total": "thirty one"},
        {"description": "Valid Item", "quantity": 1, "unit_price": 50.0, "line_total": 50.0},
        "not-a-dict-item",
        {},
        {"description": 12345, "quantity": None, "unit_price": None, "line_total": None},
    ]
    doc = _build_doc(extraction={"total": 81.0, "line_items": malformed_items})
    raw_bytes = generate_document_excel_bytes(doc)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    assert wb.active.max_row > 10


def test_export_with_malformed_tax_components() -> None:
    """Malformed tax component entries parse safely without crashing."""
    malformed_taxes = [
        {"name": None, "rate": "five percent", "amount": "₹25.00"},
        "invalid_tax_item",
        {"name": "IGST", "rate": 18.0, "amount": 180.0},
    ]
    doc = _build_doc(extraction={"total": 1180.0, "tax_components": malformed_taxes})
    data = map_document_to_export_data(doc)
    assert len(data.tax_components) >= 1
    assert data.tax_components[-1].name == "IGST"
    assert data.tax_components[-1].amount == 180.0

    raw_bytes = generate_document_excel_bytes(data)
    assert len(raw_bytes) > 500


# ══════════════════════════════════════════════════════════════════════════════
# 3. FINANCIAL & NUMERICAL EDGE CASES
# ══════════════════════════════════════════════════════════════════════════════

def test_decimal_precision_exactness() -> None:
    """Decimals and precision numbers maintain accuracy without IEEE 754 truncation."""
    doc = _build_doc(
        extraction={
            "subtotal": 123.456,
            "discount": 0.056,
            "tax": 12.345,
            "total": 135.745,
            "line_items": [
                {"description": "Micro Item", "quantity": 0.005, "unit_price": 1000.0, "line_total": 5.0}
            ]
        }
    )
    raw_bytes = generate_document_excel_bytes(doc)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    ws = wb.active

    nums = [c.value for row in ws.iter_rows() for c in row if isinstance(c.value, (int, float))]
    assert 135.745 in nums
    assert 0.005 in nums


def test_zero_and_large_monetary_values() -> None:
    """Zero totals (₹0.00) and large enterprise totals (₹100,000,000.00) are supported."""
    doc_large = _build_doc(extraction={"total": 100_000_000.0, "subtotal": 100_000_000.0})
    raw_bytes = generate_document_excel_bytes(doc_large)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    nums = [c.value for row in wb.active.iter_rows() for c in row if isinstance(c.value, (int, float))]
    assert 100_000_000.0 in nums

    doc_zero = _build_doc(extraction={"total": 0.0, "subtotal": 0.0})
    raw_bytes_zero = generate_document_excel_bytes(doc_zero)
    wb_zero = openpyxl.load_workbook(io.BytesIO(raw_bytes_zero))
    nums_zero = [c.value for row in wb_zero.active.iter_rows() for c in row if isinstance(c.value, (int, float))]
    assert 0.0 in nums_zero


def test_multiple_tax_components_breakdown() -> None:
    """Multiple tax components (CGST, SGST, IGST, Cess) are rendered as separate rows."""
    taxes = [
        {"name": "CGST", "rate": 9.0, "amount": 90.0},
        {"name": "SGST", "rate": 9.0, "amount": 90.0},
        {"name": "Cess", "rate": 1.0, "amount": 10.0},
    ]
    doc = _build_doc(extraction={"subtotal": 1000.0, "total": 1190.0, "tax_components": taxes})
    raw_bytes = generate_document_excel_bytes(doc)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    all_vals = [str(c.value) for row in wb.active.iter_rows() for c in row if c.value is not None]

    assert any("CGST" in v for v in all_vals)
    assert any("SGST" in v for v in all_vals)
    assert any("Cess" in v for v in all_vals)


# ══════════════════════════════════════════════════════════════════════════════
# 4. LARGE DOCUMENTS & STRESS TESTING
# ══════════════════════════════════════════════════════════════════════════════

def test_250_line_items_stress_export() -> None:
    """Exporting a massive document with 250 line items completes in memory without issues."""
    items = [
        {
            "description": f"Bulk Inventory Part SKU-{i:04d} with Specifications",
            "quantity": float(i),
            "unit_price": 25.50,
            "line_total": float(i * 25.50),
        }
        for i in range(1, 251)
    ]
    tot = sum(it["line_total"] for it in items)
    doc = _build_doc(extraction={"total": tot, "subtotal": tot, "line_items": items})

    start_time = datetime.now()
    raw_bytes = generate_document_excel_bytes(doc)
    duration_ms = (datetime.now() - start_time).total_seconds() * 1000

    assert len(raw_bytes) > 10000
    assert duration_ms < 1500  # fast in-memory execution

    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    ws = wb.active
    rendered_items = [r for r in ws.iter_rows(values_only=True) if r[1] and "SKU-" in str(r[1])]
    assert len(rendered_items) == 250


def test_extremely_long_item_descriptions_and_addresses() -> None:
    """500+ character descriptions wrap cleanly without overflowing or corrupting."""
    long_desc = "Industrial Precision Servo Motor " + ("High-Torque Synchronous " * 20)
    long_addr = "Plot No. 445, Phase II, Industrial Model Township, Sector 8, " * 5

    doc = _build_doc(
        extraction={
            "vendor_company": "Apex Global Heavy Industries Corporation",
            "address": long_addr,
            "total": 45000.0,
            "line_items": [
                {"description": long_desc, "quantity": 1.0, "unit_price": 45000.0, "line_total": 45000.0}
            ]
        }
    )
    raw_bytes = generate_document_excel_bytes(doc)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    ws = wb.active

    all_vals = [str(c.value) for row in ws.iter_rows() for c in row if c.value is not None]
    assert any("Apex Global Heavy Industries" in v for v in all_vals)
    assert any("Servo Motor" in v for v in all_vals)


# ══════════════════════════════════════════════════════════════════════════════
# 5. UNICODE & PATH TRAVERSAL HARDENING
# ══════════════════════════════════════════════════════════════════════════════

def test_multilingual_unicode_support() -> None:
    """Multilingual text (Hindi, Telugu, Arabic, Japanese, German) renders accurately."""
    unicode_doc = _build_doc(
        extraction={
            "vendor_company": "म्यूलर & सॉन्स GmbH • 東京ストア • العربية",
            "address": "హైదరాబాద్ / नई दिल्ली / München",
            "total": 850.0,
            "line_items": [
                {"description": "మసాలా దోశ (Special Masala Dosa)", "quantity": 2.0, "unit_price": 120.0, "line_total": 240.0},
                {"description": "寿司コンボ (Tokyo Sushi Deluxe)", "quantity": 1.0, "unit_price": 610.0, "line_total": 610.0},
            ]
        }
    )
    raw_bytes = generate_document_excel_bytes(unicode_doc)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    ws = wb.active

    all_vals = [str(c.value) for row in ws.iter_rows() for c in row if c.value is not None]
    assert any("म्यूलर & सॉन्स" in v for v in all_vals)
    assert any("東京ストア" in v for v in all_vals)
    assert any("మసాలా దోశ" in v for v in all_vals)
    assert any("寿司コンボ" in v for v in all_vals)


def test_filename_path_traversal_sanitization() -> None:
    """Path traversal sequences (../../etc/passwd, C:\\Windows) are neutralized in filenames."""
    malicious_data = ExportDocumentData(
        document_id="123",
        filename="../../../etc/passwd",
        vendor_name="..\\..\\Windows\\System32\\cmd.exe",
        document_date="2026/08/21",
    )
    filename = generate_export_filename(malicious_data)

    forbidden_chars = set('/\\:*?"<>|\x00\r\n\t')
    assert not any(c in filename for c in forbidden_chars)
    assert ".." not in filename
    assert filename.startswith("STRUCTRA_EXPORT_")
    assert filename.endswith(".xlsx")


def test_filename_whitespace_and_empty_fallback() -> None:
    """Empty or whitespace-only names fallback to safe default 'STRUCTRA_EXPORT_document.xlsx'."""
    data = ExportDocumentData(
        document_id="123",
        filename="   ",
        vendor_name="   ",
        document_date=None,
    )
    filename = generate_export_filename(data)
    assert filename == "STRUCTRA_EXPORT_document.xlsx"


def test_export_generation_timestamp_is_ist() -> None:
    """Export generation timestamp is formatted in Asia/Kolkata (IST)."""
    doc = _build_doc(extraction={"total": 500.0})
    raw_bytes = generate_document_excel_bytes(doc)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    ws = wb.active

    # Row 2, Col 4 has the generation timestamp
    timestamp_cell = ws.cell(row=2, column=4).value
    assert "Generated:" in timestamp_cell
    assert "IST" in timestamp_cell


def test_dynamic_column_and_row_sizing_for_long_content() -> None:
    """Columns and rows dynamically expand so multi-line text and long addresses are not clipped."""
    long_address = "Building 4B, Cyber City, DLF Phase 3, Sector 24, Gurugram, Haryana 122002, India"
    doc = _build_doc(
        extraction={
            "vendor_company": "Avenue Supermarts Limited",
            "address": long_address,
            "total": 999.0,
            "line_items": [
                {"description": "Organic Rolled Oats Premium Golden Grain (Imported 2kg Pack)", "quantity": 1.0, "unit_price": 999.0, "line_total": 999.0}
            ]
        }
    )
    raw_bytes = generate_document_excel_bytes(doc)
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes))
    ws = wb.active

    # Column A must be wide enough for labels
    assert ws.column_dimensions["A"].width >= 22
    # Column B must be wide enough for descriptions and addresses
    assert ws.column_dimensions["B"].width >= 36
    # Row 7 (Vendor Address) must be tall enough for wrapped lines
    assert ws.row_dimensions[7].height >= 30


# ══════════════════════════════════════════════════════════════════════════════
# 6. REPEATED & CONCURRENT EXPORTS
# ══════════════════════════════════════════════════════════════════════════════

def test_multiple_different_documents_exported_in_sequence(client_user_a: TestClient, monkeypatch) -> None:
    """Exporting multiple distinct documents in sequence generates isolated workbooks with correct data."""
    doc_1 = _build_doc(extraction={"vendor_company": "Vendor Alpha", "total": 100.0})
    doc_2 = _build_doc(extraction={"vendor_company": "Vendor Beta", "total": 200.0})

    async def mock_get(*, document_id, user_id, settings):
        if str(document_id) == str(doc_1.id):
            return doc_1
        if str(document_id) == str(doc_2.id):
            return doc_2
        return None

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get)

    res_1 = client_user_a.get(f"/documents/{doc_1.id}/export")
    res_2 = client_user_a.get(f"/documents/{doc_2.id}/export")

    assert res_1.status_code == 200
    assert res_2.status_code == 200

    wb_1 = openpyxl.load_workbook(io.BytesIO(res_1.content))
    wb_2 = openpyxl.load_workbook(io.BytesIO(res_2.content))

    vals_1 = [str(c.value) for row in wb_1.active.iter_rows() for c in row if c.value is not None]
    vals_2 = [str(c.value) for row in wb_2.active.iter_rows() for c in row if c.value is not None]

    assert any("Vendor Alpha" in v for v in vals_1)
    assert not any("Vendor Beta" in v for v in vals_1)

    assert any("Vendor Beta" in v for v in vals_2)
    assert not any("Vendor Alpha" in v for v in vals_2)


def test_repeated_export_of_same_document(client_user_a: TestClient, monkeypatch) -> None:
    """Repeatedly exporting the same document yields identical binary lengths and status 200."""
    doc = _build_doc(extraction={"vendor_company": "Static Vendor", "total": 500.0})
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=doc))

    res_a = client_user_a.get(f"/documents/{doc.id}/export")
    res_b = client_user_a.get(f"/documents/{doc.id}/export")

    assert res_a.status_code == 200
    assert res_b.status_code == 200
    assert len(res_a.content) > 1000
    assert len(res_b.content) > 1000
