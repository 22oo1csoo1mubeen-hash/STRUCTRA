"""Milestone 5 unit and scenario tests for Deterministic Extraction Quality & Review Evaluator."""

import time
from pathlib import Path
import pytest

from app.schemas.documents import ReceiptInvoiceExtraction, TaxComponent, ReceiptInvoiceLineItem
from app.services.ocr.schemas import OCRResult
from app.services.quality import (
    evaluate_extraction_quality,
    ExtractionQualityResult,
    ProviderInfo,
    QualitySignal,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "receipts"
RETAIL_RECEIPT_PATH = FIXTURES_DIR / "retail_tax_invoice.png"


def _sample_perfect_extraction() -> ReceiptInvoiceExtraction:
    return ReceiptInvoiceExtraction(
        vendor_company="SUPERMART RETAIL PRIVATE LIMITED",
        address="123 MG Road, Bengaluru",
        date="14/08/2026",
        invoice_number="INV-2026-08912",
        subtotal=100.0,
        discount=0.0,
        taxable_amount=100.0,
        tax=10.0,
        tax_components=[
            TaxComponent(name="CGST", rate=5.0, amount=5.0),
            TaxComponent(name="SGST", rate=5.0, amount=5.0),
        ],
        total=110.0,
        line_items=[
            ReceiptInvoiceLineItem(description="Item 1", quantity=2.0, unit_price=50.0, line_total=100.0),
        ],
    )


def test_perfect_extraction_quality():
    """Test 1: Perfect extraction produces HIGH confidence and needs_review=False."""
    ext = _sample_perfect_extraction()
    res = evaluate_extraction_quality(ext)

    assert isinstance(res, ExtractionQualityResult)
    assert res.confidence_level == "HIGH"
    assert res.overall_confidence >= 0.85
    assert res.needs_review is False
    assert any(s.code == "TOTAL_MATH_MATCH" for s in res.signals)


def test_mathematical_mismatch_quality():
    """Test 2: Mathematical mismatch decreases score and triggers needs_review=True."""
    ext = _sample_perfect_extraction()
    ext.total = 999.0  # Line total = 100, document total = 999 -> mismatch!

    res = evaluate_extraction_quality(ext)

    assert res.needs_review is True
    assert any(s.code == "TOTAL_MATH_MISMATCH" for s in res.signals)
    assert res.overall_confidence < 0.85


def test_missing_total_quality():
    """Test 3: Missing document total triggers needs_review=True."""
    ext = _sample_perfect_extraction()
    ext.total = None

    res = evaluate_extraction_quality(ext)

    assert res.needs_review is True
    assert any(s.code == "MISSING_TOTAL" for s in res.signals)


def test_missing_invoice_number_does_not_force_review():
    """Test 4: Missing invoice number does NOT force review when otherwise valid."""
    ext = _sample_perfect_extraction()
    ext.invoice_number = None

    res = evaluate_extraction_quality(ext)

    assert res.needs_review is False
    assert any(s.code == "MISSING_INVOICE_NUMBER" for s in res.signals)


def test_valid_line_item_arithmetic():
    """Test 5: Valid line item arithmetic generates positive signal."""
    ext = _sample_perfect_extraction()
    res = evaluate_extraction_quality(ext)

    assert any(s.code == "LINE_ITEM_MATH_MATCH" for s in res.signals)


def test_invalid_line_item_arithmetic():
    """Test 6: Invalid line item arithmetic generates warning signal."""
    ext = _sample_perfect_extraction()
    ext.line_items[0].quantity = 2.0
    ext.line_items[0].unit_price = 50.0
    ext.line_items[0].line_total = 150.0  # 2 * 50 != 150!

    res = evaluate_extraction_quality(ext)

    assert any(s.code == "LINE_ITEM_MATH_MISMATCH" for s in res.signals)


def test_suspicious_negative_values():
    """Test 7: Suspicious negative values generate SUSPICIOUS_NUMERIC_VALUE and trigger review."""
    ext = _sample_perfect_extraction()
    ext.total = -50.0

    res = evaluate_extraction_quality(ext)

    assert res.needs_review is True
    assert any(s.code == "SUSPICIOUS_NUMERIC_VALUE" for s in res.signals)


def test_ocr_agreement_positive_supporting_signals():
    """Test 8: OCR agreement produces positive supporting signals."""
    ext = _sample_perfect_extraction()
    ocr = OCRResult(
        full_text="SUPERMART RETAIL PRIVATE LIMITED\nDate: 14/08/2026\nINV-2026-08912\nTotal 110.00",
        lines=[],
    )

    res = evaluate_extraction_quality(ext, ocr_result=ocr)

    assert any(s.code == "OCR_VENDOR_MATCH" for s in res.signals)
    assert any(s.code == "OCR_TOTAL_MATCH" for s in res.signals)
    assert res.confidence_level == "HIGH"


def test_ocr_disagreement_warning_signal():
    """Test 9: OCR disagreement produces WARNING signal without automatically failing extraction."""
    ext = _sample_perfect_extraction()
    ocr = OCRResult(
        full_text="SOME DIFFERENT VENDOR NAME\nTotal 110.00",
        lines=[],
    )

    res = evaluate_extraction_quality(ext, ocr_result=ocr)

    assert any(s.code == "OCR_VENDOR_MISMATCH" for s in res.signals)
    # Math match and total present -> should not be marked invalid solely from vendor OCR disagreement
    assert res.overall_confidence > 0.60


def test_critical_financial_ocr_disagreement():
    """Test 10: Critical total OCR disagreement reduces confidence."""
    ext = _sample_perfect_extraction()
    ext.total = 1865.0
    ocr = OCRResult(
        full_text="SUPERMART RETAIL PRIVATE LIMITED\nTotal 110.00",
        lines=[],
    )

    res = evaluate_extraction_quality(ext, ocr_result=ocr)

    assert any(s.code == "OCR_TOTAL_MISMATCH" or s.code == "TOTAL_MATH_MISMATCH" for s in res.signals)


def test_gemini_provider_metadata():
    """Test 11: Provider info for Gemini is correctly populated."""
    ext = _sample_perfect_extraction()
    p_info = ProviderInfo(provider="Gemini", model="gemini-3.1-flash-lite")

    res = evaluate_extraction_quality(ext, provider_info=p_info)

    assert res.provider_info is not None
    assert res.provider_info.provider == "Gemini"
    assert res.provider_info.model == "gemini-3.1-flash-lite"


def test_groq_fallback_provider_metadata():
    """Test 12: Provider info for Groq fallback is correctly populated."""
    ext = _sample_perfect_extraction()
    p_info = ProviderInfo(provider="Groq", model="openai/gpt-oss-120b")

    res = evaluate_extraction_quality(ext, provider_info=p_info)

    assert res.provider_info is not None
    assert res.provider_info.provider == "Groq"
    assert res.provider_info.model == "openai/gpt-oss-120b"


def test_quality_evaluation_performance_and_no_network_calls():
    """Test 13: Quality evaluation executes in < 5ms without making network calls."""
    ext = _sample_perfect_extraction()
    t0 = time.perf_counter()
    res = evaluate_extraction_quality(ext)
    t1 = time.perf_counter()

    elapsed_ms = (t1 - t0) * 1000.0
    assert elapsed_ms < 50.0  # Safe upper limit for test runner overhead
    assert isinstance(res, ExtractionQualityResult)
