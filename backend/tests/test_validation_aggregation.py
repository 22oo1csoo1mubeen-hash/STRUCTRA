"""Tests for M5.4 validation aggregation."""

from decimal import Decimal
from uuid import uuid4

from app.schemas.documents import (
    DuplicateDetectionResult,
    ExtractionQualitySignals,
    MathematicalValidationResult,
)
from app.services.validation_aggregation import aggregate_validation_results


def _math_result(
    *,
    validation_performed: bool = True,
    total_matches: bool | None = True,
    reason: str | None = None,
) -> MathematicalValidationResult:
    return MathematicalValidationResult(
        validation_performed=validation_performed,
        total_matches=total_matches,
        calculated_total=Decimal("100.00") if total_matches else None,
        document_total=Decimal("100.00") if total_matches else None,
        difference=Decimal("0.00") if total_matches else None,
        reason=reason,
    )


def _quality_signals(
    *,
    math: MathematicalValidationResult | None = None,
    missing_fields: list[str] | None = None,
    line_items_missing_total: int = 0,
) -> ExtractionQualitySignals:
    return ExtractionQualitySignals(
        present_document_fields=["vendor_company", "date", "total"],
        missing_document_fields=missing_fields or [],
        line_item_count=1,
        line_items_missing_total=line_items_missing_total,
        mathematical_validation=math or _math_result(),
    )


def _duplicate_result(
    *,
    classification: str = "not_duplicate",
) -> DuplicateDetectionResult:
    return DuplicateDetectionResult(
        classification=classification,
        matched_document_id=uuid4() if classification != "not_duplicate" else None,
        evidence=["test evidence"],
    )


def test_completely_valid_document() -> None:
    result = aggregate_validation_results(
        quality_signals=_quality_signals(),
        duplicate_detection=_duplicate_result(),
    )

    assert result.overall_status == "valid"
    assert not result.issues


def test_mathematical_mismatch_is_warning() -> None:
    result = aggregate_validation_results(
        quality_signals=_quality_signals(math=_math_result(total_matches=False)),
        duplicate_detection=_duplicate_result(),
    )

    assert result.overall_status == "warning"
    assert "The calculated document total does not match the total displayed on the document." in [i.message for i in result.issues]


def test_likely_duplicate_is_warning() -> None:
    result = aggregate_validation_results(
        quality_signals=_quality_signals(),
        duplicate_detection=_duplicate_result(classification="likely_duplicate"),
    )

    assert result.overall_status == "warning"
    assert "Document may be a duplicate of an existing document." in [i.message for i in result.issues]


def test_definite_duplicate_is_warning() -> None:
    result = aggregate_validation_results(
        quality_signals=_quality_signals(),
        duplicate_detection=_duplicate_result(classification="definite_duplicate"),
    )

    assert result.overall_status == "warning"
    assert "Document is a definite duplicate of an existing document." in [i.message for i in result.issues]


def test_missing_quality_information_is_warning() -> None:
    result = aggregate_validation_results(
        quality_signals=_quality_signals(missing_fields=["vendor_company"]),
        duplicate_detection=_duplicate_result(),
    )

    assert result.overall_status == "warning"
    assert "Document is missing fields: vendor_company." in [i.message for i in result.issues]


def test_multiple_simultaneous_issues_respect_invalid_precedence() -> None:
    result = aggregate_validation_results(
        quality_signals=_quality_signals(
            math=_math_result(total_matches=False),
            missing_fields=["date"],
        ),
        duplicate_detection=_duplicate_result(classification="likely_duplicate"),
    )

    assert result.overall_status == "warning"
    assert "The calculated document total does not match the total displayed on the document." in [i.message for i in result.issues]
    assert "Document is missing fields: date." in [i.message for i in result.issues]
    assert "Document may be a duplicate of an existing document." in [i.message for i in result.issues]


def test_insufficient_duplicate_information_is_valid_with_warning_issue() -> None:
    result = aggregate_validation_results(
        quality_signals=_quality_signals(),
        duplicate_detection=_duplicate_result(classification="insufficient_information"),
    )

    assert result.overall_status == "valid"
    assert "Insufficient information to determine whether the document is a duplicate." in [i.message for i in result.issues]


def test_missing_math_totals_is_unable_to_validate_and_reports_correct_issue() -> None:
    result = aggregate_validation_results(
        quality_signals=_quality_signals(
            math=_math_result(
                validation_performed=False,
                total_matches=None,
                reason="line_item_total_missing",
            ),
            line_items_missing_total=1,
        ),
        duplicate_detection=_duplicate_result(),
    )

    assert result.overall_status == "unable_to_validate"
    assert [i.message for i in result.issues].count("Some line items are missing totals.") == 1


def test_existing_results_are_preserved() -> None:
    quality = _quality_signals()
    duplicate = _duplicate_result()

    result = aggregate_validation_results(
        quality_signals=quality,
        duplicate_detection=duplicate,
    )

    assert result.quality_signals is quality
    assert result.duplicate_detection is duplicate
