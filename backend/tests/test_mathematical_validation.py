"""Tests for independent, decimal-safe extraction total validation."""

from decimal import Decimal

import pytest

from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.mathematical_validation import validate_extraction_totals


def _extraction(
    *, 
    total: float | None, 
    line_totals: list[float | None],
    subtotal: float | None = None,
    discount: float | None = 0.0,
    taxable_amount: float | None = None,
    tax: float | None = 0.0,
    tax_components: list[dict] | None = None,
) -> ReceiptInvoiceExtraction:
    return ReceiptInvoiceExtraction(
        total=total,
        subtotal=subtotal,
        discount=discount,
        taxable_amount=taxable_amount,
        tax=tax,
        tax_components=tax_components or [],
        line_items=[
            {"description": f"Item {index}", "line_total": line_total}
            for index, line_total in enumerate(line_totals, start=1)
        ],
    )


def test_exact_matching_totals_are_validated_independently() -> None:
    result = validate_extraction_totals(_extraction(total=1365.0, line_totals=[1365.0]))

    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.calculated_total == Decimal("1365.00")
    assert result.difference == Decimal("0.00")


def test_known_receipt_mismatch_reports_calculated_difference() -> None:
    result = validate_extraction_totals(
        _extraction(total=1365.0, line_totals=[289, 126, 349, 139, 159, 299])
    )

    assert result.validation_performed is True
    assert result.total_matches is False
    assert result.calculated_total == Decimal("1361.00")
    assert result.document_total == Decimal("1365.00")
    assert result.difference == Decimal("-4.00")


def test_decimal_currency_values_do_not_use_float_equality() -> None:
    result = validate_extraction_totals(_extraction(total=0.3, line_totals=[0.1, 0.2]))

    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.calculated_total == Decimal("0.30")
    assert result.difference == Decimal("0.00")


@pytest.mark.parametrize(
    ("total", "line_totals"),
    [
        (0.0, [0.0]),
        (9.99, [9.99]),
        (15.0, [5.0, 10.0]),
        (-2.0, [-3.0, 1.0]),
    ],
)
def test_reliable_line_items_support_zero_single_multiple_and_negative_values(
    total: float, line_totals: list[float]
) -> None:
    result = validate_extraction_totals(_extraction(total=total, line_totals=line_totals))

    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.difference == Decimal("0.00")


@pytest.mark.parametrize(
    ("total", "line_totals", "reason", "calculated_total"),
    [
        (10.0, [], "line_items_empty", Decimal("0.00")),
        (None, [5.0, 5.0], "document_total_missing", Decimal("10.00")),
        (10.0, [5.0, None], "line_item_total_missing", Decimal("5.00")),
    ],
)
def test_missing_information_is_not_reported_as_a_match(
    total: float | None,
    line_totals: list[float | None],
    reason: str,
    calculated_total: Decimal,
) -> None:
    result = validate_extraction_totals(_extraction(total=total, line_totals=line_totals))

    assert result.validation_performed is False
    assert result.total_matches is None
    assert result.reason == reason
    assert result.calculated_total == calculated_total
    assert result.difference is None


def test_half_up_currency_rounding_is_applied_before_comparison() -> None:
    result = validate_extraction_totals(_extraction(total=1.01, line_totals=[1.005]))

    assert result.total_matches is True
    assert result.calculated_total == Decimal("1.01")


def test_abc_mart_receipt_is_valid() -> None:
    # subtotal=1361, discount=61, taxable=1300, CGST=32.50, SGST=32.50, total=1365
    result = validate_extraction_totals(
        _extraction(
            total=1365.0,
            line_totals=[289.0, 126.0, 349.0, 139.0, 159.0, 299.0],
            subtotal=1361.0,
            discount=61.0,
            taxable_amount=1300.0,
            tax=None,
            tax_components=[
                {"name": "CGST", "rate": 2.5, "amount": 32.50},
                {"name": "SGST", "rate": 2.5, "amount": 32.50},
            ]
        )
    )
    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.calculated_total == Decimal("1365.00")


def test_single_gst_amount_is_valid() -> None:
    # subtotal=1000, discount=0, tax=180, total=1180
    result = validate_extraction_totals(
        _extraction(
            total=1180.0,
            line_totals=[1000.0],
            subtotal=1000.0,
            discount=0.0,
            tax=180.0,
            tax_components=[]
        )
    )
    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.calculated_total == Decimal("1180.00")


def test_cgst_and_sgst_are_valid() -> None:
    # subtotal=1000, discount=0, CGST=90, SGST=90, total=1180
    result = validate_extraction_totals(
        _extraction(
            total=1180.0,
            line_totals=[1000.0],
            subtotal=1000.0,
            discount=0.0,
            tax=None,
            tax_components=[
                {"name": "CGST", "amount": 90.0},
                {"name": "SGST", "amount": 90.0},
            ]
        )
    )
    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.calculated_total == Decimal("1180.00")


def test_wrong_final_total_reports_difference() -> None:
    # subtotal=1000, CGST=90, SGST=90, document_total=1200
    result = validate_extraction_totals(
        _extraction(
            total=1200.0,
            line_totals=[1000.0],
            subtotal=1000.0,
            discount=0.0,
            tax=None,
            tax_components=[
                {"name": "CGST", "amount": 90.0},
                {"name": "SGST", "amount": 90.0},
            ]
        )
    )
    assert result.validation_performed is True
    assert result.total_matches is False
    assert result.calculated_total == Decimal("1180.00")
    assert result.document_total == Decimal("1200.00")
    assert result.difference == Decimal("-20.00")


def test_wrong_subtotal_is_reported() -> None:
    # line-item sum = 1000, document subtotal = 950
    result = validate_extraction_totals(
        _extraction(
            total=950.0,
            line_totals=[1000.0],
            subtotal=950.0,
            discount=0.0,
            tax=0.0,
            tax_components=[]
        )
    )
    assert result.validation_performed is True
    # total matches because 950 + 0 = 950
    assert result.total_matches is True
    # but subtotal does not match
    assert result.subtotal_matches is False
    assert result.calculated_subtotal == Decimal("1000.00")
    assert result.document_subtotal == Decimal("950.00")
    assert result.subtotal_difference == Decimal("50.00")


def test_missing_tax_information_is_unreconciled() -> None:
    # subtotal=1000, discount=50, document_total=1050, tax information unavailable
    result = validate_extraction_totals(
        _extraction(
            total=1050.0,
            line_totals=[1000.0],
            subtotal=1000.0,
            discount=50.0,
            taxable_amount=None,
            tax=None,
            tax_components=[]
        )
    )
    assert result.validation_performed is False
    assert result.reason == "unreconciled_missing_fields"

def test_multiple_tax_components_sums_correctly() -> None:
    # subtotal=1361, CGST=32.50, SGST=32.50, IGST is absent
    # total tax should be 65.00
    result = validate_extraction_totals(
        _extraction(
            total=1426.0,
            line_totals=[1361.0],
            subtotal=1361.0,
            discount=0.0,
            tax=None,
            tax_components=[
                {"name": "CGST", "amount": 32.50},
                {"name": "SGST", "amount": 32.50},
            ]
        )
    )
    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.calculated_total == Decimal("1426.00")

def test_legacy_tax_ignored_when_components_present() -> None:
    # subtotal=1000, CGST=32.50, SGST=32.50 (Sum = 65)
    # legacy tax = 65.00
    # Expected total = 1065, NOT 1130.
    result = validate_extraction_totals(
        _extraction(
            total=1065.0,
            line_totals=[1000.0],
            subtotal=1000.0,
            discount=0.0,
            tax=65.00,
            tax_components=[
                {"name": "CGST", "amount": 32.50},
                {"name": "SGST", "amount": 32.50},
            ]
        )
    )
    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.calculated_total == Decimal("1065.00")

