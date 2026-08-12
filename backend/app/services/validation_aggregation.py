"""M5.4 Validation aggregation service."""

from app.schemas.documents import (
    DocumentValidationResult,
    DocumentValidationStatus,
    DuplicateDetectionResult,
    ExtractionQualitySignals,
    ValidationIssue,
)


def aggregate_validation_results(
    *,
    quality_signals: ExtractionQualitySignals,
    duplicate_detection: DuplicateDetectionResult,
) -> DocumentValidationResult:
    """Combine M5 components into a single deterministic validation result.

    Precedence: invalid > unable_to_validate > warning > valid.
    """
    issues: list[ValidationIssue] = []
    status_ranks: list[DocumentValidationStatus] = []

    def _add_issue(issue: ValidationIssue) -> None:
        if not any(existing.type == issue.type and existing.field == issue.field for existing in issues):
            issues.append(issue)

    # 1. Mathematical Validation
    math = quality_signals.mathematical_validation
    if math.subtotal_matches is False:
        status_ranks.append("warning")
        _add_issue(ValidationIssue(
            type="subtotal_mismatch",
            title="Line Items Do Not Match Subtotal",
            message="The sum of the extracted line items does not match the subtotal shown on the document.",
            expected=math.calculated_subtotal,
            actual=math.document_subtotal,
            difference=math.subtotal_difference,
            field="subtotal",
            severity="warning"
        ))

    if math.total_matches is False:
        status_ranks.append("warning")
        _add_issue(ValidationIssue(
            type="total_mismatch",
            title="Total Amount Mismatch",
            message="The calculated document total does not match the total displayed on the document.",
            expected=math.calculated_total,
            actual=math.document_total,
            difference=math.difference,
            field="total",
            severity="warning"
        ))
    elif not math.validation_performed:
        if math.reason == "unreconciled_missing_fields":
            # No status rank adjustment, it's just unreconciled.
            pass
        else:
            status_ranks.append("unable_to_validate")
            if math.reason == "line_item_total_missing":
                _add_issue(ValidationIssue(
                    type="line_item_total_missing",
                    title="Missing Line Item Totals",
                    message="Some line items are missing totals, preventing mathematical validation.",
                    severity="warning"
                ))
            elif math.reason == "document_total_missing":
                _add_issue(ValidationIssue(
                    type="document_total_missing",
                    title="Missing Document Total",
                    message="The document total is missing, preventing mathematical validation.",
                    severity="warning"
                ))
            elif math.reason == "line_items_empty":
                _add_issue(ValidationIssue(
                    type="line_items_empty",
                    title="No Line Items",
                    message="No line items were found, preventing mathematical validation.",
                    severity="warning"
                ))

    # 2. Quality Signals
    if quality_signals.missing_document_fields:
        status_ranks.append("warning")
        fields_str = ", ".join(quality_signals.missing_document_fields)
        _add_issue(ValidationIssue(
            type="missing_fields",
            title="Missing Extracted Fields",
            message=f"Document is missing fields: {fields_str}.",
            severity="warning"
        ))

    if quality_signals.line_items_missing_total > 0:
        status_ranks.append("warning")
        _add_issue(ValidationIssue(
            type="line_item_missing_total",
            title="Incomplete Line Items",
            message="Some line items are missing totals.",
            severity="warning"
        ))

    # 3. Duplicate Detection
    dup = duplicate_detection.classification
    if dup == "definite_duplicate":
        status_ranks.append("warning")
        _add_issue(ValidationIssue(
            type="definite_duplicate",
            title="Definite Duplicate",
            message="Document is a definite duplicate of an existing document.",
            severity="warning"
        ))
    elif dup == "likely_duplicate":
        status_ranks.append("warning")
        _add_issue(ValidationIssue(
            type="likely_duplicate",
            title="Likely Duplicate",
            message="Document may be a duplicate of an existing document.",
            severity="warning"
        ))
    elif dup == "insufficient_information":
        # Do not treat insufficient_information as a document-level failure
        _add_issue(ValidationIssue(
            type="insufficient_information",
            title="Duplicate Detection Incomplete",
            message="Insufficient information to determine whether the document is a duplicate.",
            severity="warning"
        ))

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
