"""Tests for Continuous Confidence System, Non-Bimodal Scoring, and Manual Confidence Override."""

import pytest
from uuid import uuid4
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from app.schemas.documents import (
    ReceiptInvoiceExtraction,
    ReceiptInvoiceLineItem,
    TaxComponent,
    DocumentListItem,
)
from app.services.quality import (
    evaluate_extraction_quality,
    ExtractionQualityResult,
    ProviderInfo,
)


def _build_extraction(
    total=100.0,
    subtotal=100.0,
    tax=0.0,
    discount=0.0,
    vendor="Supermart",
    date="14/08/2026",
    invoice_no="INV-100",
    address="123 Street",
    line_items=None,
) -> ReceiptInvoiceExtraction:
    if line_items is None:
        line_items = [
            ReceiptInvoiceLineItem(description="Item 1", quantity=1.0, unit_price=100.0, line_total=100.0)
        ]
    return ReceiptInvoiceExtraction(
        vendor_company=vendor,
        address=address,
        date=date,
        invoice_number=invoice_no,
        subtotal=subtotal,
        discount=discount,
        taxable_amount=subtotal,
        tax=tax,
        total=total,
        line_items=line_items,
    )


def test_confidence_continuous_and_non_bimodal():
    """Verify that confidence produces continuous non-bimodal variation across different document scenarios."""
    # Scenario A: High quality perfect receipt
    ext_perfect = _build_extraction(
        total=110.0,
        subtotal=100.0,
        tax=10.0,
        line_items=[
            ReceiptInvoiceLineItem(description="Item 1", quantity=2.0, unit_price=50.0, line_total=100.0)
        ],
    )
    res_perfect = evaluate_extraction_quality(ext_perfect)
    assert res_perfect.system_confidence is not None
    assert res_perfect.system_confidence_level == "HIGH"
    assert 0.85 <= res_perfect.system_confidence <= 1.0

    # Scenario B: Missing invoice number and address (minor header fields missing)
    ext_missing_headers = _build_extraction(
        total=100.0,
        subtotal=100.0,
        invoice_no=None,
        address=None,
    )
    res_missing_headers = evaluate_extraction_quality(ext_missing_headers)
    assert res_missing_headers.system_confidence is not None
    # Score should be strictly lower than perfect but still valid
    assert res_missing_headers.system_confidence < res_perfect.system_confidence

    # Scenario C: Math mismatch in line items (Medium quality)
    ext_math_mismatch = _build_extraction(
        total=100.0,
        subtotal=100.0,
        line_items=[
            ReceiptInvoiceLineItem(description="Item 1", quantity=2.0, unit_price=40.0, line_total=100.0)
        ],
    )
    res_math_mismatch = evaluate_extraction_quality(ext_math_mismatch)
    assert res_math_mismatch.system_confidence is not None
    assert res_math_mismatch.system_confidence < res_missing_headers.system_confidence

    # Scenario D: Missing critical total and vendor (Low quality)
    ext_low = _build_extraction(
        total=None,
        subtotal=None,
        vendor=None,
        date=None,
        line_items=[],
    )
    res_low = evaluate_extraction_quality(ext_low)
    assert res_low.system_confidence is not None
    assert res_low.system_confidence_level == "LOW"
    assert res_low.system_confidence < 0.55

    # Verify score diversity: all 4 scenarios have distinct continuous scores (not collapsed to 1.0 or 0.70)
    scores = [
        res_perfect.system_confidence,
        res_missing_headers.system_confidence,
        res_math_mismatch.system_confidence,
        res_low.system_confidence,
    ]
    assert len(set(scores)) == 4, f"Scores should all be distinct, got {scores}"


def test_confidence_override_resolution():
    """Verify confidence_level = confidence_override ?? system_confidence_level."""
    ext = _build_extraction()
    res_sys = evaluate_extraction_quality(ext)
    assert res_sys.system_confidence_level == "HIGH"
    assert res_sys.confidence_level == "HIGH"
    assert res_sys.confidence_override is None

    # Override to LOW
    res_override_low = evaluate_extraction_quality(ext, confidence_override="LOW")
    assert res_override_low.confidence_override == "LOW"
    assert res_override_low.confidence_level == "LOW"
    # System confidence and level must remain HIGH and untouched!
    assert res_override_low.system_confidence_level == "HIGH"
    assert res_override_low.system_confidence == res_sys.system_confidence

    # Override to MEDIUM
    res_override_med = evaluate_extraction_quality(ext, confidence_override="MEDIUM")
    assert res_override_med.confidence_override == "MEDIUM"
    assert res_override_med.confidence_level == "MEDIUM"
    assert res_override_med.system_confidence_level == "HIGH"

    # Clearing override restores system confidence level
    res_cleared = evaluate_extraction_quality(ext, confidence_override=None)
    assert res_cleared.confidence_override is None
    assert res_cleared.confidence_level == res_sys.system_confidence_level


def test_manual_high_override_clears_needs_review():
    """Verify that manual HIGH confidence override resolves needs_review to False (marking as processed)."""
    # Mismatch extraction has system needs_review = True
    ext_mismatch = _build_extraction(total=999.0, subtotal=100.0)
    res = evaluate_extraction_quality(ext_mismatch, confidence_override="HIGH")

    # With manual HIGH override, confidence is HIGH and needs_review is cleared to False
    assert res.confidence_level == "HIGH"
    assert res.confidence_override == "HIGH"
    assert res.needs_review is False
    # System confidence remains independent and unaffected
    assert res.system_confidence_level == "MEDIUM"


def test_legacy_document_backward_compatibility():
    """Verify that legacy documents missing system_confidence_level or confidence_override deserialize properly."""
    legacy_data = {
        "overall_confidence": 0.88,
        "confidence_level": "HIGH",
        "needs_review": False,
        "signals": [],
    }
    model = ExtractionQualityResult.model_validate(legacy_data)
    assert model.confidence_level == "HIGH"
    assert model.confidence_override is None
    assert model.system_confidence is None
    assert model.system_confidence_level is None


def test_document_list_item_confidence_fields():
    """Verify DocumentListItem supports system_confidence_level and confidence_override."""
    item = DocumentListItem(
        document_id=uuid4(),
        filename="invoice.pdf",
        storage_path="path/to/invoice.pdf",
        content_type="application/pdf",
        size=1024,
        status="completed",
        created_at=datetime.now(timezone.utc),
        confidence_level="MEDIUM",
        confidence_score=0.92,
        system_confidence_level="HIGH",
        confidence_override="MEDIUM",
        needs_review=False,
    )
    assert item.confidence_level == "MEDIUM"
    assert item.system_confidence_level == "HIGH"
    assert item.confidence_override == "MEDIUM"


USER_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
USER_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def test_confidence_override_transitions_and_status_synchronization(monkeypatch: pytest.MonkeyPatch):
    """Verify full matrix of confidence override transitions, persistence, and status synchronization."""
    from types import SimpleNamespace
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.config import get_settings
    from app.api.dependencies import get_current_user
    from app.schemas.auth import CurrentUser
    from app.services.document_metadata import CreatedDocumentMetadata
    import app.api.routes.documents as document_routes

    mock_db: dict[str, CreatedDocumentMetadata] = {}

    doc_id = uuid4()
    original_hash = "h" * 64
    initial_ext = {
        "vendor_company": "Apex Mart",
        "date": "16/08/2026",
        "invoice_number": "INV-001",
        "total": 100.0,
        "subtotal": 100.0,
        "line_items": [{"description": "Item 1", "quantity": 1.0, "unit_price": 100.0, "line_total": 100.0}],
    }
    initial_qual = {
        "overall_confidence": 0.95,
        "confidence_level": "HIGH",
        "system_confidence": 0.95,
        "system_confidence_level": "HIGH",
        "confidence_override": None,
        "needs_review": False,
        "signals": [],
    }
    doc = CreatedDocumentMetadata(
        id=doc_id,
        user_id=uuid4(),  # placeholder, set per user
        filename="Apex_Receipt.pdf",
        storage_path=f"{USER_A_ID}/{doc_id}/Apex_Receipt.pdf",
        content_type="application/pdf",
        size=1024,
        status="completed",
        created_at=datetime.now(timezone.utc),
        processed_at=datetime.now(timezone.utc),
        content_hash=original_hash,
        extraction_result=initial_ext,
        quality_result=initial_qual,
    )
    doc.user_id = uuid4()
    # Assign User A
    from uuid import UUID
    doc.user_id = UUID(USER_A_ID)
    mock_db[str(doc_id)] = doc

    async def mock_get_metadata(*, document_id, user_id, settings):
        d = mock_db.get(str(document_id))
        if d and str(d.user_id) == str(user_id):
            return d
        return None

    async def mock_update_ext(*, document_id, user_id, extraction, quality=None, status="completed", settings):
        d = mock_db.get(str(document_id))
        if d and str(d.user_id) == str(user_id):
            d.extraction_result = extraction
            if quality:
                d.quality_result = quality
            d.status = status
            d.processed_at = datetime.now(timezone.utc)
            return d
        return None

    async def mock_list_paginated(*, user_id, page=1, page_size=20, doc_type=None, status_filter=None, needs_review=None, search=None, sort_by="newest", settings):
        docs = [d for d in mock_db.values() if str(d.user_id) == str(user_id)]
        return docs, len(docs)

    async def mock_get_stats(*, user_id, settings):
        docs = [d for d in mock_db.values() if str(d.user_id) == str(user_id)]
        tot = len(docs)
        nr = sum(1 for d in docs if (d.quality_result or {}).get("needs_review") is True)
        return tot, tot - nr, nr

    monkeypatch.setattr(document_routes, "get_document_metadata", mock_get_metadata)
    monkeypatch.setattr(document_routes, "update_document_extraction_and_quality", mock_update_ext)
    monkeypatch.setattr(document_routes, "list_document_metadata", mock_list_paginated)
    monkeypatch.setattr(document_routes, "get_user_document_library_stats", mock_get_stats)
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://storage.signed.url/doc"))

    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)

    with TestClient(app) as client:
        # Initial state: HIGH, Processed
        res0 = client.get(f"/documents/{doc_id}")
        assert res0.status_code == 200
        data0 = res0.json()
        assert data0["quality"]["confidence_level"] == "HIGH"
        assert data0["quality"]["system_confidence_level"] == "HIGH"
        assert data0["quality"]["confidence_override"] is None
        assert data0["quality"]["needs_review"] is False

        list0 = client.get("/documents")
        assert list0.json()["items"][0]["confidence_level"] == "HIGH"
        assert list0.json()["items"][0]["needs_review"] is False

        # TRANSITION 1: HIGH -> LOW
        res1 = client.post(f"/documents/{doc_id}/save", json={"confidence_override": "LOW"})
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["quality"]["confidence_level"] == "LOW"
        assert data1["quality"]["confidence_override"] == "LOW"
        assert data1["quality"]["system_confidence_level"] == "HIGH"  # Untouched!
        assert data1["quality"]["needs_review"] is True

        list1 = client.get("/documents")
        assert list1.json()["items"][0]["confidence_level"] == "LOW"
        assert list1.json()["items"][0]["confidence_override"] == "LOW"
        assert list1.json()["items"][0]["needs_review"] is True  # Needs Review
        assert len(mock_db) == 1  # In-place update, row count unchanged
        assert mock_db[str(doc_id)].content_hash == original_hash  # Hash unchanged

        # TRANSITION 2: LOW -> HIGH
        res2 = client.post(f"/documents/{doc_id}/save", json={"confidence_override": "HIGH"})
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["quality"]["confidence_level"] == "HIGH"
        assert data2["quality"]["confidence_override"] == "HIGH"
        assert data2["quality"]["system_confidence_level"] == "HIGH"
        assert data2["quality"]["needs_review"] is False

        list2 = client.get("/documents")
        assert list2.json()["items"][0]["confidence_level"] == "HIGH"
        assert list2.json()["items"][0]["needs_review"] is False  # Processed
        assert len(mock_db) == 1

        # TRANSITION 3: HIGH -> MEDIUM
        res3 = client.post(f"/documents/{doc_id}/save", json={"confidence_override": "MEDIUM"})
        assert res3.status_code == 200
        data3 = res3.json()
        assert data3["quality"]["confidence_level"] == "MEDIUM"
        assert data3["quality"]["confidence_override"] == "MEDIUM"
        assert data3["quality"]["system_confidence_level"] == "HIGH"
        assert data3["quality"]["needs_review"] is True

        list3 = client.get("/documents")
        assert list3.json()["items"][0]["confidence_level"] == "MEDIUM"
        assert list3.json()["items"][0]["needs_review"] is True  # Needs Review

        # TRANSITION 4: MEDIUM -> HIGH
        res4 = client.post(f"/documents/{doc_id}/save", json={"confidence_override": "HIGH"})
        assert res4.status_code == 200
        data4 = res4.json()
        assert data4["quality"]["confidence_level"] == "HIGH"
        assert data4["quality"]["needs_review"] is False

        # TRANSITION 5: Clear override (confidence_override = None) -> restores system evaluation
        res5 = client.post(f"/documents/{doc_id}/save", json={"confidence_override": None})
        assert res5.status_code == 200
        data5 = res5.json()
        assert data5["quality"]["confidence_level"] == "HIGH"
        assert data5["quality"]["confidence_override"] is None
        assert data5["quality"]["system_confidence_level"] == "HIGH"
        assert data5["quality"]["needs_review"] is False

        list5 = client.get("/documents")
        assert list5.json()["items"][0]["confidence_override"] is None
        assert list5.json()["items"][0]["confidence_level"] == "HIGH"
        assert list5.json()["items"][0]["needs_review"] is False

        # USER ISOLATION: User B cannot modify User A's document
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_B_ID)
        res_b = client.post(f"/documents/{doc_id}/save", json={"confidence_override": "LOW"})
        assert res_b.status_code == 404
        assert mock_db[str(doc_id)].quality_result["confidence_override"] is None  # User A's doc not modified

    app.dependency_overrides.clear()

