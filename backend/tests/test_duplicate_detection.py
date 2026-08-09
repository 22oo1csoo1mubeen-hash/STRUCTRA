"""Tests for deterministic, user-scoped duplicate detection."""

from uuid import UUID, uuid4

from app.schemas.documents import DuplicateDocumentCandidate, ReceiptInvoiceExtraction
from app.services.duplicate_detection import detect_duplicate, hash_document_content

USER_A = UUID("00000000-0000-0000-0000-000000000051")
USER_B = UUID("00000000-0000-0000-0000-000000000052")


def _extraction(
    *,
    vendor: str | None = "ABC Mart",
    date: str | None = "2026-08-09",
    total: float | None = 1365.0,
    line_items: list[dict[str, object]] | None = None,
) -> ReceiptInvoiceExtraction:
    return ReceiptInvoiceExtraction(
        vendor_company=vendor,
        date=date,
        total=total,
        line_items=line_items
        or [
            {"description": "Rice", "line_total": 289.0},
            {"description": "Oil", "line_total": 126.0},
        ],
    )


def _candidate(
    *,
    user_id: UUID = USER_A,
    content: bytes = b"existing document",
    extraction: ReceiptInvoiceExtraction | None = None,
) -> DuplicateDocumentCandidate:
    return DuplicateDocumentCandidate(
        document_id=uuid4(),
        user_id=user_id,
        content_hash=hash_document_content(content),
        extraction=extraction,
    )


def test_same_bytes_are_a_definite_duplicate_even_when_renamed() -> None:
    content = b"identical receipt bytes"
    existing = _candidate(content=content)

    result = detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(content),
        extraction=None,
        existing_documents=[existing],
    )

    assert result.classification == "definite_duplicate"
    assert result.matched_document_id == existing.document_id
    assert result.evidence == ["same_user_sha256_content_hash"]


def test_hash_is_deterministic_and_ignores_filename() -> None:
    receipt = b"same bytes"

    assert hash_document_content(receipt) == hash_document_content(receipt)
    assert hash_document_content(receipt) != hash_document_content(b"different bytes")


def test_different_bytes_with_same_filename_are_not_an_exact_duplicate() -> None:
    existing = _candidate(content=b"first receipt")

    result = detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(b"second receipt"),
        extraction=None,
        existing_documents=[existing],
    )

    assert result.classification == "insufficient_information"
    assert result.classification != "definite_duplicate"


def test_identical_content_from_another_user_is_not_a_duplicate() -> None:
    content = b"same receipt bytes"

    result = detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(content),
        extraction=None,
        existing_documents=[_candidate(user_id=USER_B, content=content)],
    )

    assert result.classification == "not_duplicate"
    assert result.matched_document_id is None


def test_different_encodings_with_complete_matching_identity_are_likely_duplicates() -> None:
    existing = _candidate(content=b"png encoding", extraction=_extraction())

    result = detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(b"pdf encoding"),
        extraction=_extraction(),
        existing_documents=[existing],
    )

    assert result.classification == "likely_duplicate"
    assert result.matched_document_id == existing.document_id
    assert result.evidence == ["matching_vendor_date_total_and_line_items"]


def test_different_line_items_are_contradictory_not_automatically_duplicates() -> None:
    existing = _candidate(extraction=_extraction())
    current = _extraction(
        line_items=[
            {"description": "Rice", "line_total": 289.0},
            {"description": "Different item", "line_total": 126.0},
        ]
    )

    result = detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(b"new content"),
        extraction=current,
        existing_documents=[existing],
    )

    assert result.classification == "not_duplicate"
    assert result.evidence == ["all_comparable_same_user_documents_have_contradictory_identity_data"]


def test_different_date_is_contradictory_not_automatically_duplicate() -> None:
    existing = _candidate(extraction=_extraction())

    result = detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(b"new content"),
        extraction=_extraction(date="2026-08-10"),
        existing_documents=[existing],
    )

    assert result.classification == "not_duplicate"


def test_missing_identity_fields_are_insufficient_information() -> None:
    existing = _candidate(extraction=_extraction())

    result = detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(b"new content"),
        extraction=_extraction(total=None),
        existing_documents=[existing],
    )

    assert result.classification == "insufficient_information"


def test_multiple_existing_documents_return_the_matching_logical_candidate() -> None:
    unrelated = _candidate(extraction=_extraction(date="2026-08-10"))
    matching = _candidate(extraction=_extraction())

    result = detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(b"new encoding"),
        extraction=_extraction(),
        existing_documents=[unrelated, matching],
    )

    assert result.classification == "likely_duplicate"
    assert result.matched_document_id == matching.document_id


def test_duplicate_result_has_no_probability_or_confidence_score() -> None:
    fields = set(type(detect_duplicate(
        user_id=USER_A,
        content_hash=hash_document_content(b"new"),
        extraction=None,
        existing_documents=[],
    )).model_fields)

    assert "confidence" not in fields
    assert "score" not in fields
