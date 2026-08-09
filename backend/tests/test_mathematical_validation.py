"""Tests for independent, decimal-safe extraction total validation."""

from decimal import Decimal

import pytest

from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.mathematical_validation import validate_extraction_totals


def _extraction(*, total: float | None, line_totals: list[float | None]) -> ReceiptInvoiceExtraction:
    return ReceiptInvoiceExtraction(
        total=total,
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
