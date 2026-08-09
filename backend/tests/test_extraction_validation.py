"""Tests for strict validation of raw Gemini extraction output."""

import pytest

from app.services.extraction_validation import (
    GeminiExtractionValidationError,
    validate_receipt_invoice_extraction,
)


def test_completely_valid_extraction_validates() -> None:
    extraction = validate_receipt_invoice_extraction(
        {
            "vendor_company": "STRUCTRA Cafe",
            "address": "123 Main Street",
            "date": "2026-08-09",
            "total": 7.75,
            "line_items": [{"description": "Coffee", "line_total": 3.5}],
        }
    )

    assert extraction.total == 7.75
    assert extraction.line_items[0].description == "Coffee"


def test_missing_nullable_fields_and_empty_line_items_validate() -> None:
    extraction = validate_receipt_invoice_extraction({})

    assert extraction.vendor_company is None
    assert extraction.address is None
    assert extraction.date is None
    assert extraction.total is None
    assert extraction.line_items == []


def test_multiple_line_items_validate() -> None:
    extraction = validate_receipt_invoice_extraction(
        {
            "line_items": [
                {"description": "Coffee", "line_total": 3.5},
                {"description": "Pastry", "line_total": None},
            ]
        }
    )

    assert len(extraction.line_items) == 2
    assert extraction.line_items[1].line_total is None


@pytest.mark.parametrize(
    "raw_extraction",
    [
        {"total": "7.75"},
        {"line_items": "not a list"},
        {"line_items": [{"description": 42, "line_total": 3.5}]},
        {"line_items": [{"line_total": 3.5}]},
        {"unexpected": "field"},
    ],
)
def test_invalid_gemini_extraction_is_rejected(raw_extraction: dict[str, object]) -> None:
    with pytest.raises(GeminiExtractionValidationError, match="invalid extraction"):
        validate_receipt_invoice_extraction(raw_extraction)
