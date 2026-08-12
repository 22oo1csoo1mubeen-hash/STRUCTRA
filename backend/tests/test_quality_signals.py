"""Tests for deterministic STRUCTRA extraction quality signals."""

from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.quality_signals import derive_extraction_quality_signals


def test_quality_signals_report_validated_field_presence_without_a_score() -> None:
    extraction = ReceiptInvoiceExtraction(
        vendor_company="STRUCTRA Store",
        address="1 Main Street",
        date="2026-08-09",
        total=10.0,
        line_items=[{"description": "Item", "line_total": 10.0}],
    )

    result = derive_extraction_quality_signals(extraction)

    assert result.schema_validation_succeeded is True
    assert result.present_document_fields == ["vendor_company", "address", "date", "total"]
    assert result.missing_document_fields == []
    assert result.line_item_count == 1
    assert result.line_items_missing_total == 0
    assert result.mathematical_validation.total_matches is True
    assert "confidence" not in result.model_dump()


def test_quality_signals_report_missing_values_without_claiming_ai_certainty() -> None:
    extraction = ReceiptInvoiceExtraction(
        vendor_company="STRUCTRA Store",
        line_items=[
            {"description": "Known", "line_total": 5.0},
            {"description": "Unknown amount", "line_total": None},
        ],
    )

    result = derive_extraction_quality_signals(extraction)

    assert result.present_document_fields == ["vendor_company"]
    assert result.missing_document_fields == ["address", "date", "total"]
    assert result.line_items_missing_total == 1
    assert result.mathematical_validation.validation_performed is False
    assert result.mathematical_validation.reason == "document_total_missing"


def test_quality_signals_preserve_existing_mathematical_mismatch() -> None:
    extraction = ReceiptInvoiceExtraction(
        total=12.0,
        discount=0.0,
        tax=0.0,
        line_items=[
            {"description": "First", "line_total": 5.0},
            {"description": "Second", "line_total": 6.0},
        ],
    )

    result = derive_extraction_quality_signals(extraction)

    assert result.line_item_count == 2
    assert result.mathematical_validation.validation_performed is True
    assert result.mathematical_validation.total_matches is False
    assert str(result.mathematical_validation.difference) == "-1.00"


def test_quality_signals_keep_empty_line_items_distinct_from_a_match() -> None:
    result = derive_extraction_quality_signals(ReceiptInvoiceExtraction(total=0.0))

    assert result.line_item_count == 0
    assert result.line_items_missing_total == 0
    assert result.mathematical_validation.total_matches is None
    assert result.mathematical_validation.reason == "line_items_empty"
