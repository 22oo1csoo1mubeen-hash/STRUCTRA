"""Deterministic quality signals for validated document extractions.

These signals report observable validation facts only. They are deliberately
not an AI confidence score and do not estimate Gemini's certainty.
"""

from app.schemas.documents import ExtractionQualitySignals, ReceiptInvoiceExtraction
from app.services.mathematical_validation import validate_extraction_totals

_DOCUMENT_FIELDS = ("vendor_company", "address", "date", "total")


def derive_extraction_quality_signals(
    extraction: ReceiptInvoiceExtraction,
) -> ExtractionQualitySignals:
    """Summarize validated-field presence and existing arithmetic validation."""
    present_fields = [field for field in _DOCUMENT_FIELDS if getattr(extraction, field) is not None]
    missing_fields = [field for field in _DOCUMENT_FIELDS if field not in present_fields]

    return ExtractionQualitySignals(
        present_document_fields=present_fields,
        missing_document_fields=missing_fields,
        line_item_count=len(extraction.line_items),
        line_items_missing_total=sum(
            item.line_total is None for item in extraction.line_items
        ),
        mathematical_validation=validate_extraction_totals(extraction),
    )
