"""Validation boundary for raw Gemini receipt and invoice extraction output."""

from pydantic import ValidationError

from app.schemas.documents import ReceiptInvoiceExtraction


class GeminiExtractionValidationError(RuntimeError):
    """Raised when raw Gemini JSON does not satisfy STRUCTRA's extraction schema."""


def validate_receipt_invoice_extraction(
    raw_extraction: dict[str, object],
) -> ReceiptInvoiceExtraction:
    """Validate raw Gemini JSON without coercing or repairing invalid values."""
    try:
        return ReceiptInvoiceExtraction.model_validate(raw_extraction)
    except ValidationError as error:
        raise GeminiExtractionValidationError("Gemini returned an invalid extraction.") from error
