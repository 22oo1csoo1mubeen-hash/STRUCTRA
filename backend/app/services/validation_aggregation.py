"""M5.4 Validation aggregation service."""

from app.schemas.documents import (
    DocumentValidationResult,
    DocumentValidationStatus,
    DuplicateDetectionResult,
    ExtractionQualitySignals,
)


def aggregate_validation_results(
    *,
    quality_signals: ExtractionQualitySignals,
    duplicate_detection: DuplicateDetectionResult,
) -> DocumentValidationResult:
    """Combine M5 components into a single deterministic validation result.

    Precedence: invalid > unable_to_validate > warning > valid.
    """
    issues: list[str] = []
    status_ranks: list[DocumentValidationStatus] = []

    def _add_issue(message: str) -> None:
        if message not in issues:
            issues.append(message)

    # 1. Mathematical Validation
    math = quality_signals.mathematical_validation
    if math.total_matches is False:
        status_ranks.append("invalid")
        _add_issue("Line-item total does not match document total.")
    elif not math.validation_performed:
        status_ranks.append("unable_to_validate")
        if math.reason == "line_item_total_missing":
            _add_issue("Some line items are missing totals.")
        elif math.reason == "document_total_missing":
            _add_issue("Document total is missing.")
        elif math.reason == "line_items_empty":
            _add_issue("No line items found.")

    # 2. Quality Signals
    if quality_signals.missing_document_fields:
        status_ranks.append("warning")
        fields_str = ", ".join(quality_signals.missing_document_fields)
        _add_issue(f"Document is missing fields: {fields_str}.")

    if quality_signals.line_items_missing_total > 0:
        status_ranks.append("warning")
        _add_issue("Some line items are missing totals.")

    # 3. Duplicate Detection
    dup = duplicate_detection.classification
    if dup == "definite_duplicate":
        status_ranks.append("warning")
        _add_issue("Document is a definite duplicate of an existing document.")
    elif dup == "likely_duplicate":
        status_ranks.append("warning")
        _add_issue("Document may be a duplicate of an existing document.")
    elif dup == "insufficient_information":
        status_ranks.append("unable_to_validate")
        _add_issue("Insufficient information to determine whether the document is a duplicate.")

    # 4. Resolve Precedence
    overall_status: DocumentValidationStatus = "valid"
    if status_ranks:
        rank_map = {
            "invalid": 4,
            "unable_to_validate": 3,
            "warning": 2,
            "valid": 1,
        }
        overall_status = max(status_ranks, key=lambda s: rank_map[s])

    return DocumentValidationResult(
        overall_status=overall_status,
        quality_signals=quality_signals,
        duplicate_detection=duplicate_detection,
        issues=issues,
    )
