"""Deterministic exact and conservative logical duplicate detection."""

from decimal import Decimal, ROUND_HALF_UP
from hashlib import sha256
from uuid import UUID

from app.schemas.documents import (
    DuplicateDetectionResult,
    DuplicateDocumentCandidate,
    ReceiptInvoiceExtraction,
)

_CURRENCY_QUANTUM = Decimal("0.01")


def hash_document_content(content: bytes) -> str:
    """Return the SHA-256 hash of document bytes, independent of filename."""
    return sha256(content).hexdigest()


def detect_duplicate(
    *,
    user_id: UUID,
    content_hash: str,
    extraction: ReceiptInvoiceExtraction | None,
    existing_documents: list[DuplicateDocumentCandidate],
) -> DuplicateDetectionResult:
    """Classify a new document using same-user hash and identity evidence only.

    A matching SHA-256 hash is definite. Logical matching is only likely when
    vendor, date, total, and every non-null line item agree exactly after
    deterministic normalization. The current extraction has no invoice/order
    identifier, so incomplete identity evidence is never promoted to likely.
    """
    same_user_documents = [document for document in existing_documents if document.user_id == user_id]
    exact_match = next(
        (document for document in same_user_documents if document.content_hash == content_hash),
        None,
    )
    if exact_match is not None:
        return DuplicateDetectionResult(
            classification="definite_duplicate",
            matched_document_id=exact_match.document_id,
            evidence=["same_user_sha256_content_hash"],
        )
    if not same_user_documents:
        return DuplicateDetectionResult(
            classification="not_duplicate",
            evidence=["no_same_user_documents_with_matching_content"],
        )

    outcomes = [_logical_comparison(extraction, document) for document in same_user_documents]
    likely_match = next((outcome for outcome in outcomes if outcome[0] == "likely_duplicate"), None)
    if likely_match is not None:
        return DuplicateDetectionResult(
            classification="likely_duplicate",
            matched_document_id=likely_match[1],
            evidence=[likely_match[2]],
        )
    if any(outcome[0] == "insufficient_information" for outcome in outcomes):
        return DuplicateDetectionResult(
            classification="insufficient_information",
            evidence=["at_least_one_same_user_document_lacks_comparable_identity_data"],
        )
    return DuplicateDetectionResult(
        classification="not_duplicate",
        evidence=["all_comparable_same_user_documents_have_contradictory_identity_data"],
    )


def _logical_comparison(
    extraction: ReceiptInvoiceExtraction | None,
    existing: DuplicateDocumentCandidate,
) -> tuple[str, UUID | None, str]:
    if extraction is None or existing.extraction is None:
        return "insufficient_information", None, "extraction_unavailable"
    if not _has_complete_logical_identity(extraction) or not _has_complete_logical_identity(existing.extraction):
        return "insufficient_information", None, "logical_identity_incomplete"

    if _normalise_text(extraction.vendor_company) != _normalise_text(existing.extraction.vendor_company):
        return "not_duplicate", None, "vendor_conflicts"
    if extraction.date != existing.extraction.date:
        return "not_duplicate", None, "date_conflicts"
    if _currency(extraction.total) != _currency(existing.extraction.total):
        return "not_duplicate", None, "total_conflicts"
    if (
        extraction.address is not None
        and existing.extraction.address is not None
        and _normalise_text(extraction.address) != _normalise_text(existing.extraction.address)
    ):
        return "not_duplicate", None, "address_conflicts"
    if _normalised_line_items(extraction) != _normalised_line_items(existing.extraction):
        return "not_duplicate", None, "line_items_conflict"
    return "likely_duplicate", existing.document_id, "matching_vendor_date_total_and_line_items"


def _has_complete_logical_identity(extraction: ReceiptInvoiceExtraction) -> bool:
    return (
        extraction.vendor_company is not None
        and extraction.date is not None
        and extraction.total is not None
        and bool(extraction.line_items)
        and all(item.line_total is not None for item in extraction.line_items)
    )


def _normalised_line_items(extraction: ReceiptInvoiceExtraction) -> tuple[tuple[str, Decimal], ...]:
    return tuple(
        sorted(
            (_normalise_text(item.description), _currency(item.line_total))
            for item in extraction.line_items
            if item.line_total is not None
        )
    )


def _normalise_text(value: str | None) -> str:
    return " ".join((value or "").casefold().split())


def _currency(value: float | None) -> Decimal:
    return Decimal(str(value)).quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)
