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
    document_subtotal = (
        _to_currency(extraction.subtotal) if extraction.subtotal is not None else None
    )
    line_item_values = [item.line_total for item in extraction.line_items]
    calculated_subtotal = sum(
        (_to_currency(value) for value in line_item_values if value is not None),
        start=Decimal("0.00"),
    )

    if document_total is None:
        return MathematicalValidationResult(
            validation_performed=False,
            total_matches=None,
            calculated_total=calculated_subtotal,
            document_total=None,
            difference=None,
            reason="document_total_missing",
        )
    if not line_item_values and document_subtotal is None:
        return MathematicalValidationResult(
            validation_performed=False,
            total_matches=None,
            calculated_total=calculated_subtotal,
            document_total=document_total,
            difference=None,
            reason="line_items_empty",
        )
    if any(value is None for value in line_item_values) and document_subtotal is None:
        return MathematicalValidationResult(
            validation_performed=False,
            total_matches=None,
            calculated_total=calculated_subtotal,
            document_total=document_total,
            difference=None,
            reason="line_item_total_missing",
        )

    # Subtotal check A (Line Items -> Subtotal)
    subtotal_matches = None
    subtotal_diff = None
    can_check_line_items = bool(line_item_values and not any(value is None for value in line_item_values))
    
    if can_check_line_items and document_subtotal is not None:
        subtotal_diff = (calculated_subtotal - document_subtotal).quantize(
            _CURRENCY_QUANTUM, rounding=ROUND_HALF_UP
        )
        subtotal_matches = subtotal_diff == Decimal("0.00")

    # Check B: base for total calculation
    if document_subtotal is not None:
        base_for_total = document_subtotal
    else:
        base_for_total = calculated_subtotal

    discount = _to_currency(extraction.discount) if extraction.discount is not None else Decimal("0.00")
    if getattr(extraction, 'taxable_amount', None) is not None:
        expected_taxable_amount = _to_currency(extraction.taxable_amount)
    else:
        expected_taxable_amount = base_for_total - discount
        
    tax_basis_ambiguous = (extraction.discount is None and getattr(extraction, 'taxable_amount', None) is None)
    calculated_tax = None
    tax_missing = False

    service_charge = (
        _to_currency(extraction.service_charge)
        if getattr(extraction, "service_charge", None) is not None
        else Decimal("0.00")
    )
    round_off = (
        _to_currency(extraction.round_off)
        if getattr(extraction, "round_off", None) is not None
        else Decimal("0.00")
    )

    if getattr(extraction, 'tax_components', None):
        total_component_tax = Decimal("0.00")
        has_tax = False
        extracted_round_off_in_components = None
        
        for comp in extraction.tax_components:
            comp_name = (getattr(comp, 'name', '') or '').strip().lower()
            if getattr(comp, 'amount', None) is not None:
                comp_amt = _to_currency(comp.amount)
                if "round" in comp_name:
                    extracted_round_off_in_components = comp_amt
                else:
                    total_component_tax += comp_amt
                    has_tax = True
            elif getattr(comp, 'rate', None) is not None:
                if tax_basis_ambiguous:
                    tax_missing = True
                else:
                    comp_tax = (Decimal(str(comp.rate)) * expected_taxable_amount / Decimal("100")).quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)
                    total_component_tax += comp_tax
                    has_tax = True
                    
        if has_tax and not tax_missing:
            calculated_tax = total_component_tax

        # If round_off was extracted inside tax_components and extraction.round_off is 0/None, use it
        if extracted_round_off_in_components is not None and getattr(extraction, 'round_off', None) is None:
            round_off = extracted_round_off_in_components

    if calculated_tax is None:
        if getattr(extraction, 'tax', None) is not None:
            calculated_tax = _to_currency(extraction.tax)
        else:
            tax_missing = True
            calculated_tax = Decimal("0.00")

    calculated_total = (
        expected_taxable_amount + calculated_tax + service_charge + round_off
    ).quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)
    difference = (calculated_total - document_total).quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)

    if difference != Decimal("0.00") and tax_missing:
        return MathematicalValidationResult(
            validation_performed=False,
            total_matches=None,
            calculated_total=calculated_total,
            document_total=document_total,
            difference=difference,
            subtotal_matches=subtotal_matches,
            calculated_subtotal=calculated_subtotal if can_check_line_items else None,
            document_subtotal=document_subtotal,
            subtotal_difference=subtotal_diff,
            reason="unreconciled_missing_fields",
        )

    return MathematicalValidationResult(
        validation_performed=True,
        total_matches=difference == Decimal("0.00"),
        calculated_total=calculated_total,
        document_total=document_total,
        difference=difference,
        subtotal_matches=subtotal_matches,
        calculated_subtotal=calculated_subtotal if can_check_line_items else None,
        document_subtotal=document_subtotal,
        subtotal_difference=subtotal_diff,
    )


def _to_currency(value: float | Decimal) -> Decimal:
    """Convert one validated numeric value to a two-decimal currency amount."""
    if isinstance(value, Decimal):
        return value.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)
    return Decimal(str(value)).quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)
