"""Decimal-safe mathematical validation for receipt and invoice extractions."""

from decimal import Decimal, ROUND_HALF_UP

from app.schemas.documents import MathematicalValidationResult, ReceiptInvoiceExtraction

_CURRENCY_QUANTUM = Decimal("0.01")


def validate_extraction_totals(
    extraction: ReceiptInvoiceExtraction,
) -> MathematicalValidationResult:
    """Independently compare document total to the sum of line-item totals.

    Monetary values are converted via ``str`` and rounded to two decimal places
    with ``ROUND_HALF_UP`` before summing or comparing. This avoids binary
    floating-point equality while matching normal currency precision.
    """
    document_total = (
        _to_currency(extraction.total) if extraction.total is not None else None
    )
    line_item_values = [item.line_total for item in extraction.line_items]
    calculated_total = sum(
        (_to_currency(value) for value in line_item_values if value is not None),
        start=Decimal("0.00"),
    )

    if document_total is None:
        return MathematicalValidationResult(
            validation_performed=False,
            total_matches=None,
            calculated_total=calculated_total,
            document_total=None,
            difference=None,
            reason="document_total_missing",
        )
    if not line_item_values:
        return MathematicalValidationResult(
            validation_performed=False,
            total_matches=None,
            calculated_total=calculated_total,
            document_total=document_total,
            difference=None,
            reason="line_items_empty",
        )
    if any(value is None for value in line_item_values):
        return MathematicalValidationResult(
            validation_performed=False,
            total_matches=None,
            calculated_total=calculated_total,
            document_total=document_total,
            difference=None,
            reason="line_item_total_missing",
        )

    difference = (calculated_total - document_total).quantize(
        _CURRENCY_QUANTUM, rounding=ROUND_HALF_UP
    )
    return MathematicalValidationResult(
        validation_performed=True,
        total_matches=difference == Decimal("0.00"),
        calculated_total=calculated_total,
        document_total=document_total,
        difference=difference,
    )


def _to_currency(value: float) -> Decimal:
    """Convert one validated numeric value to a two-decimal currency amount."""
    return Decimal(str(value)).quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)
