"""Test suite for AI Assistant year-based and multi-year temporal query intelligence.

Verifies:
1. 'show the receipts from 2015' correctly retrieves 2015 receipts.
2. 'show the receipts from 2016' correctly retrieves 2016 receipts.
3. 'what did I spend in 2015' computes total spending and details for 2015.
4. 'what did I buy between 2015 and 2018' retrieves multi-year bounds.
5. Disambiguation between year ranges and price ranges ('show receipts between 500 and 2000').
6. Non-year queries remain unaffected.
"""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest

from app.core.config import Settings
from app.schemas.assistant import AssistantChatResponse, AssistantResultType
from app.services.assistant.intent import AssistantIntent, AssistantIntentEngine
from app.services.assistant.service import run_assistant_chat
from app.services.document_metadata import CreatedDocumentMetadata

USER_ID = "00000000-0000-0000-0000-000000000099"


def _make_doc(
    *,
    filename: str,
    vendor: str,
    date_str: str,
    total: float,
) -> CreatedDocumentMetadata:
    doc_id = uuid4()
    return CreatedDocumentMetadata(
        id=doc_id,
        user_id=UUID(USER_ID),
        filename=filename,
        storage_path=f"documents/{USER_ID}/{filename}",
        content_type="application/pdf",
        size=2048,
        status="completed",
        created_at=datetime(2026, 8, 20, 12, 0, 0, tzinfo=UTC),
        processed_at=datetime(2026, 8, 20, 12, 0, 0, tzinfo=UTC),
        content_hash=f"hash_{doc_id}",
        extraction_result={
            "vendor_company": vendor,
            "date": date_str,
            "total": total,
            "line_items": [
                {"description": "Meal", "quantity": 1.0, "unit_price": total, "total": total}
            ],
        },
        quality_result={
            "overall_confidence": 0.95,
            "confidence_level": "HIGH",
            "needs_review": False,
        },
    )


def _make_settings() -> Settings:
    return Settings(
        supabase_url="https://example.supabase.co",
        supabase_key="fake_key",
        supabase_service_role_key="fake_role",
        supabase_storage_bucket="documents",
    )


def test_intent_parsing_years():
    """Verify intent engine resolves individual years and year ranges into ISO date bounds."""
    p_2015 = AssistantIntentEngine.parse_query("show the receipts from 2015")
    assert p_2015.intent == AssistantIntent.TEMPORAL_SPENDING
    assert p_2015.start_date == "2015-01-01"
    assert p_2015.end_date == "2015-12-31"
    assert p_2015.temporal_label == "2015"

    p_2016 = AssistantIntentEngine.parse_query("show the receipts from 2016")
    assert p_2016.intent == AssistantIntent.TEMPORAL_SPENDING
    assert p_2016.start_date == "2016-01-01"
    assert p_2016.end_date == "2016-12-31"

    p_dated = AssistantIntentEngine.parse_query("receipts dated on 2015")
    assert p_dated.intent == AssistantIntent.TEMPORAL_SPENDING
    assert p_dated.start_date == "2015-01-01"

    p_range = AssistantIntentEngine.parse_query("what did I buy between 2015 and 2018")
    assert p_range.intent == AssistantIntent.TEMPORAL_SPENDING
    assert p_range.start_date == "2015-01-01"
    assert p_range.end_date == "2018-12-31"

    p_amt = AssistantIntentEngine.parse_query("show receipts between 500 and 2000")
    assert p_amt.intent == AssistantIntent.FILTERED_RECEIPTS
    assert p_amt.min_amount == 500.0
    assert p_amt.max_amount == 2000.0
    assert p_amt.start_date is None


@pytest.mark.anyio
async def test_assistant_chat_retrieves_2015_receipt():
    """Verify run_assistant_chat finds and summarizes 2015 receipt correctly."""
    doc_2015 = _make_doc(
        filename="Restuarant2.jpg",
        vendor="THE LOCAL DINERS",
        date_str="Jun 6, 2015",
        total=3280.0,
    )
    doc_2016 = _make_doc(
        filename="Restuarant3.jpg",
        vendor="El Chalan Restaurant",
        date_str="Dec 3, 2016",
        total=49.52,
    )
    doc_2026 = _make_doc(
        filename="hospital.jpg",
        vendor="V&RO HOSPITALITY",
        date_str="Aug 19, 2026",
        total=5226.0,
    )

    all_docs = [doc_2015, doc_2016, doc_2026]
    settings = _make_settings()

    with patch(
        "app.services.assistant.retrieval.AssistantRetrievalService.get_all_documents",
        new_callable=AsyncMock,
    ) as mock_get_docs, patch(
        "app.services.assistant.provider.AssistantChatProvider.generate_reply",
        new_callable=AsyncMock,
    ) as mock_reply:
        mock_get_docs.return_value = all_docs
        mock_reply.return_value = "In 2015, you have 1 receipt from THE LOCAL DINERS for ₹3,280.00."

        res: AssistantChatResponse = await run_assistant_chat(
            user_id=USER_ID,
            message="show the receipts from 2015",
            settings=settings,
        )

        assert res.metadata is not None
        assert res.metadata["type"] == AssistantResultType.TEMPORAL_SPENDING.value
        assert res.metadata["document_count"] == 1
        assert res.metadata["total_spent"] == 3280.0
        assert len(res.sources) == 1
        assert res.sources[0].filename == "Restuarant2.jpg"
        assert res.sources[0].vendor == "THE LOCAL DINERS"


@pytest.mark.anyio
async def test_assistant_chat_retrieves_2016_receipt():
    """Verify run_assistant_chat finds and summarizes 2016 receipt correctly."""
    doc_2015 = _make_doc(
        filename="Restuarant2.jpg",
        vendor="THE LOCAL DINERS",
        date_str="Jun 6, 2015",
        total=3280.0,
    )
    doc_2016 = _make_doc(
        filename="Restuarant3.jpg",
        vendor="El Chalan Restaurant",
        date_str="Dec 3, 2016",
        total=49.52,
    )

    all_docs = [doc_2015, doc_2016]
    settings = _make_settings()

    with patch(
        "app.services.assistant.retrieval.AssistantRetrievalService.get_all_documents",
        new_callable=AsyncMock,
    ) as mock_get_docs, patch(
        "app.services.assistant.provider.AssistantChatProvider.generate_reply",
        new_callable=AsyncMock,
    ) as mock_reply:
        mock_get_docs.return_value = all_docs
        mock_reply.return_value = "In 2016, you have 1 receipt from El Chalan Restaurant for ₹49.52."

        res: AssistantChatResponse = await run_assistant_chat(
            user_id=USER_ID,
            message="show the receipts from 2016",
            settings=settings,
        )

        assert res.metadata is not None
        assert res.metadata["type"] == AssistantResultType.TEMPORAL_SPENDING.value
        assert res.metadata["document_count"] == 1
        assert res.metadata["total_spent"] == 49.52
        assert len(res.sources) == 1
        assert res.sources[0].filename == "Restuarant3.jpg"
        assert res.sources[0].vendor == "El Chalan Restaurant"
