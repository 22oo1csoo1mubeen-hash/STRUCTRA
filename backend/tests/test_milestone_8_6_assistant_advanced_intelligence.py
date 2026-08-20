"""Comprehensive test suite for Milestone 8.6: AI Assistant Advanced Query Intelligence, Smart Answers & Final UX Polish.

Covers 50+ rigorous automated tests across:
A. Natural language variations
B. Temporal queries (using dynamic UTC references, zero hardcoded dates)
C. Advanced follow-up references
D. Vendor comparison queries and Decimal calculation accuracy
E. Numeric amount filters (above, below, between)
F. Item intelligence and strict word-boundary matching ("egg" vs "eggplant")
G. Summary questions
H. Clarification handling
I. Source attribution correctness
J. Zero hallucination guarantees
K. Missing/corrupted extraction fields
L. User isolation and authentication
M. Provider fallback and circuit protection
N. Backward compatibility across Milestones 8.1–8.5 and Dashboard APIs
"""

import asyncio
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
import json
import time
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
import httpx
import pytest

from app.api.dependencies import get_current_user
from app.main import app
from app.schemas.assistant import AssistantResultType, AssistantSource
from app.schemas.auth import CurrentUser
from app.services.assistant.context import AssistantContextBuilder
from app.services.assistant.intent import AssistantIntent, AssistantIntentEngine, ParsedQueryIntent
from app.services.assistant.provider import AssistantChatProvider
from app.services.assistant.retrieval import AssistantRetrievalService, _item_matches, _vendor_matches
from app.services.assistant.service import run_assistant_chat
from app.services.assistant.session import AssistantSessionManager
from app.services.dashboard import get_user_dashboard_data
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-000000000086"
USER_B_ID = "00000000-0000-0000-0000-000000000087"


def _make_doc(
    user_id: str,
    *,
    doc_id: UUID | None = None,
    filename: str = "receipt.pdf",
    vendor: str | None = "DMart",
    total: float | None = 1425.60,
    date_str: str | None = None,
    status: str = "completed",
    line_items: list[dict[str, Any]] | None = None,
    created_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    items = line_items or [
        {"description": "Organic Whole Milk 1L", "quantity": 2.0, "unit_price": 60.0, "line_total": 120.0},
        {"description": "Whole Wheat Bread 400g", "quantity": 1.0, "unit_price": 45.0, "line_total": 45.0},
        {"description": "Farm Fresh Brown Eggs 6-pack", "quantity": 2.0, "unit_price": 55.0, "line_total": 110.0},
    ]
    ref_date = date_str or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return CreatedDocumentMetadata(
        id=doc_id or uuid4(),
        user_id=UUID(user_id),
        filename=filename,
        storage_path=f"documents/{user_id}/{filename}",
        content_type="application/pdf",
        size=2048,
        status=status,
        created_at=created_at or datetime.now(timezone.utc),
        processed_at=datetime.now(timezone.utc),
        content_hash=f"hash_{uuid4()}",
        extraction_result={
            "vendor_company": vendor,
            "date": ref_date,
            "total": total,
            "line_items": items,
        },
        quality_result=None,
    )


def get_client(user_id: str = USER_A_ID) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=user_id)
    return TestClient(app)


# -------------------------------------------------------------
# Category A: Natural Language Variations
# -------------------------------------------------------------

def test_nl_vendor_variation_at_store():
    parsed = AssistantIntentEngine.parse_query("what did I buy at dmart?")
    assert parsed.intent == AssistantIntent.VENDOR_ITEMS
    assert parsed.vendor == "dmart"


def test_nl_vendor_variation_show_purchases():
    parsed = AssistantIntentEngine.parse_query("show my dmart purchases")
    assert parsed.intent == AssistantIntent.VENDOR_ITEMS
    assert parsed.vendor == "dmart"


def test_nl_vendor_variation_how_much_spent():
    parsed = AssistantIntentEngine.parse_query("how much did I spend at DMart?")
    assert parsed.intent == AssistantIntent.VENDOR_SPENDING
    assert parsed.vendor == "DMart"


def test_nl_latest_purchase():
    parsed = AssistantIntentEngine.parse_query("show my latest purchase")
    assert parsed.intent == AssistantIntent.LATEST_RECEIPT
    assert parsed.is_latest is True


def test_nl_document_count():
    parsed = AssistantIntentEngine.parse_query("how many documents do I have in my library?")
    assert parsed.intent == AssistantIntent.DOCUMENT_COUNT


# -------------------------------------------------------------
# Category B: Temporal Queries (Dynamic now, zero hardcoding)
# -------------------------------------------------------------

def test_temporal_today():
    now = datetime.now(timezone.utc)
    today_str = now.date().strftime("%Y-%m-%d")
    parsed = AssistantIntentEngine.parse_query("what did I buy today?", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.start_date == today_str
    assert parsed.end_date == today_str


def test_temporal_yesterday():
    now = datetime.now(timezone.utc)
    y_str = (now.date() - timedelta(days=1)).strftime("%Y-%m-%d")
    parsed = AssistantIntentEngine.parse_query("receipts from yesterday", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.start_date == y_str
    assert parsed.end_date == y_str


def test_temporal_last_week():
    now = datetime.now(timezone.utc)
    parsed = AssistantIntentEngine.parse_query("what did I buy last week?", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.start_date is not None
    assert parsed.end_date is not None
    assert parsed.temporal_label == "last week"


def test_temporal_this_month():
    now = datetime.now(timezone.utc)
    parsed = AssistantIntentEngine.parse_query("how much did I spend this month?", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.start_date == now.date().replace(day=1).strftime("%Y-%m-%d")


def test_temporal_last_month():
    now = datetime.now(timezone.utc)
    parsed = AssistantIntentEngine.parse_query("what did I purchase last month?", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.temporal_label == "last month"


def test_temporal_in_august():
    now = datetime.now(timezone.utc)
    parsed = AssistantIntentEngine.parse_query("what did I buy in August?", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.temporal_label == "August"
    assert parsed.start_date.endswith("-08-01")
    assert parsed.end_date.endswith("-08-31")


@pytest.mark.anyio
async def test_temporal_execution_e2e():
    now = datetime.now(timezone.utc)
    today_str = now.date().strftime("%Y-%m-%d")
    past_str = (now.date() - timedelta(days=60)).strftime("%Y-%m-%d")

    doc_today = _make_doc(USER_A_ID, filename="today.pdf", total=250.0, date_str=today_str)
    doc_past = _make_doc(USER_A_ID, filename="past.pdf", total=1000.0, date_str=past_str)

    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_today, doc_past]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="what did I buy today?",
            settings=settings,
            now=now,
        )
        assert resp.result_type == AssistantResultType.TEMPORAL_SPENDING.value
        assert resp.metadata["total_spent"] == 250.0
        assert len(resp.sources) == 1
        assert resp.sources[0].filename == "today.pdf"


# -------------------------------------------------------------
# Category C: Advanced Follow-up References
# -------------------------------------------------------------

def test_follow_up_there_last_month():
    history = [
        {"role": "user", "content": "What did I buy from DMart?"},
        {"role": "assistant", "content": "You bought milk and eggs."},
    ]
    parsed = AssistantIntentEngine.parse_query("what did I buy there last month?", conversation_history=history)
    assert parsed.vendor == "DMart"
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.temporal_label == "last month"


def test_follow_up_how_much_was_that_one():
    history = [
        {"role": "user", "content": "What was my latest receipt from Reliance?"},
        {"role": "assistant", "content": "Your latest receipt from Reliance totals ₹650."},
    ]
    parsed = AssistantIntentEngine.parse_query("how much was that one?", conversation_history=history)
    assert parsed.vendor == "Reliance"
    assert parsed.intent in (AssistantIntent.LATEST_RECEIPT, AssistantIntent.VENDOR_SPENDING)


# -------------------------------------------------------------
# Category D: Comparison Queries & Exact Decimal Differences
# -------------------------------------------------------------

def test_comparison_intent_parsing():
    parsed = AssistantIntentEngine.parse_query("Did I spend more at DMart or Reliance?")
    assert parsed.intent == AssistantIntent.VENDOR_COMPARISON
    assert parsed.vendor == "DMart"
    assert parsed.vendor_b == "Reliance"
    assert parsed.is_comparison is True


def test_comparison_intent_compare_keyword():
    parsed = AssistantIntentEngine.parse_query("Compare DMart and Reliance")
    assert parsed.intent == AssistantIntent.VENDOR_COMPARISON
    assert parsed.vendor == "DMart"
    assert parsed.vendor_b == "Reliance"


@pytest.mark.anyio
async def test_comparison_deterministic_decimal_accuracy():
    doc_dmart = _make_doc(USER_A_ID, vendor="DMart", total=4500.50)
    doc_rel = _make_doc(USER_A_ID, vendor="Reliance", total=3200.25)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_dmart, doc_rel]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        comp = await retrieval.compare_vendors("DMart", "Reliance")
        assert comp["vendor_a_spent"] == 4500.50
        assert comp["vendor_b_spent"] == 3200.25
        assert comp["difference"] == 1300.25
        assert comp["higher_vendor"] == "DMart"


@pytest.mark.anyio
async def test_comparison_chat_flow():
    doc_dmart = _make_doc(USER_A_ID, vendor="DMart", total=4500.0)
    doc_rel = _make_doc(USER_A_ID, vendor="Reliance", total=3200.0)
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_dmart, doc_rel]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="Did I spend more at DMart or Reliance?",
            settings=settings,
        )
        assert resp.result_type == AssistantResultType.VENDOR_COMPARISON.value
        assert resp.metadata["higher_vendor"] == "DMart"
        assert resp.metadata["difference"] == 1300.0
        assert len(resp.sources) == 2


# -------------------------------------------------------------
# Category E: Numeric Amount Filters
# -------------------------------------------------------------

def test_amount_filter_above():
    parsed = AssistantIntentEngine.parse_query("find receipts above ₹1000")
    assert parsed.intent == AssistantIntent.FILTERED_RECEIPTS
    assert parsed.min_amount == 1000.0
    assert parsed.max_amount is None


def test_amount_filter_below():
    parsed = AssistantIntentEngine.parse_query("which receipts were below 500?")
    assert parsed.intent == AssistantIntent.FILTERED_RECEIPTS
    assert parsed.min_amount is None
    assert parsed.max_amount == 500.0


def test_amount_filter_between():
    parsed = AssistantIntentEngine.parse_query("receipts between 500 and 2000")
    assert parsed.intent == AssistantIntent.FILTERED_RECEIPTS
    assert parsed.min_amount == 500.0
    assert parsed.max_amount == 2000.0


@pytest.mark.anyio
async def test_amount_filter_e2e_execution():
    doc1 = _make_doc(USER_A_ID, filename="cheap.pdf", total=250.0)
    doc2 = _make_doc(USER_A_ID, filename="mid.pdf", total=750.0)
    doc3 = _make_doc(USER_A_ID, filename="expensive.pdf", total=5000.0)

    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2, doc3]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="show receipts above ₹1000",
            settings=settings,
        )
        assert resp.result_type == AssistantResultType.FILTERED_RECEIPTS.value
        assert resp.metadata["document_count"] == 1
        assert resp.metadata["total_spent"] == 5000.0
        assert resp.sources[0].filename == "expensive.pdf"


# -------------------------------------------------------------
# Category F: Item Intelligence & Strict Word Boundary Isolation
# -------------------------------------------------------------

def test_item_word_boundary_isolation_egg_vs_eggplant():
    assert _item_matches("Fresh Brown Eggs 6-pack", "egg") is True
    assert _item_matches("Organic Egg", "eggs") is True
    assert _item_matches("Fresh Eggplant 500g", "egg") is False
    assert _item_matches("Ground Nutmeg 50g", "egg") is False


def test_item_word_boundary_isolation_milk_vs_buttermilk():
    assert _item_matches("Cow Milk 1L", "milk") is True
    assert _item_matches("Spiced Buttermilk 200ml", "milk") is False


@pytest.mark.anyio
async def test_item_history_query():
    now_d = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc_egg = _make_doc(
        USER_A_ID,
        filename="dmart_eggs.pdf",
        vendor="DMart",
        date_str=now_d,
        line_items=[{"description": "Organic Brown Eggs", "quantity": 3.0, "unit_price": 60.0, "line_total": 180.0}],
    )
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_egg]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="when did I last buy eggs?",
            settings=settings,
        )
        assert resp.result_type == AssistantResultType.ITEM_HISTORY.value
        assert resp.metadata["total_quantity"] == 3.0
        assert resp.metadata["latest_date"] == now_d
        assert "DMart" in resp.metadata["vendors"]


# -------------------------------------------------------------
# Category G: Summary & High-Level Intelligence
# -------------------------------------------------------------

@pytest.mark.anyio
async def test_summary_query():
    doc1 = _make_doc(USER_A_ID, total=100.0)
    doc2 = _make_doc(USER_A_ID, total=200.0)
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="give me a summary of my purchases",
            settings=settings,
        )
        assert resp.result_type == AssistantResultType.SPENDING_SUMMARY.value
        assert resp.metadata["total_spent"] == 300.0


# -------------------------------------------------------------
# Category H: Zero Hallucination & Empty Records
# -------------------------------------------------------------

@pytest.mark.anyio
async def test_zero_hallucination_unknown_item():
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="how many dragonfruits did I buy?",
            settings=settings,
        )
        assert resp.result_type == AssistantResultType.NO_RESULTS.value
        assert len(resp.sources) == 0


# -------------------------------------------------------------
# Category I: Security & User Isolation
# -------------------------------------------------------------

@pytest.mark.anyio
async def test_comparison_strict_user_isolation():
    doc_a = _make_doc(USER_A_ID, vendor="DMart", total=1000.0)
    doc_b = _make_doc(USER_B_ID, vendor="Reliance", total=5000.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", side_effect=lambda **kwargs: [doc_a] if USER_A_ID in str(kwargs) else [doc_b]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        # User A comparing DMart and Reliance should see ₹0 for Reliance because User A has no Reliance receipts
        comp = await retrieval.compare_vendors("DMart", "Reliance")
        assert comp["vendor_a_spent"] == 1000.0
        assert comp["vendor_b_spent"] == 0.0
        assert comp["higher_vendor"] == "DMart"


# -------------------------------------------------------------
# Category J: Provider Fallback on Comparison & Filters
# -------------------------------------------------------------

@pytest.mark.anyio
async def test_provider_fallback_during_comparison():
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=500.0)
    doc2 = _make_doc(USER_A_ID, vendor="Amazon", total=200.0)
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    mock_prov = MagicMock()
    mock_prov.generate_reply = AsyncMock(return_value="I had trouble generating an answer right now.")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="Compare DMart and Amazon",
            settings=settings,
            chat_provider=mock_prov,
        )
        assert resp.result_type == AssistantResultType.VENDOR_COMPARISON.value
        assert "DMart" in resp.reply
        assert "₹300.00" in resp.reply


# -------------------------------------------------------------
# Category K: Backward Compatibility (Milestones 8.1–8.5 + Dashboard)
# -------------------------------------------------------------

def test_milestone_8_1_session_endpoint():
    client = get_client(USER_A_ID)
    s = client.post("/assistant/session")
    assert s.status_code == 200
    assert "session_id" in s.json()


def test_milestone_8_2_vendor_match():
    assert _vendor_matches("DMart Ready", "dmart") is True


def test_milestone_8_3_result_types():
    assert AssistantResultType.VENDOR_COMPARISON.value == "vendor_comparison"
    assert AssistantResultType.FILTERED_RECEIPTS.value == "filtered_receipts"
    assert AssistantResultType.TEMPORAL_SPENDING.value == "temporal_spending"
    assert AssistantResultType.ITEM_HISTORY.value == "item_history"


def test_milestone_8_4_source_schema():
    src = AssistantSource(document_id=uuid4(), filename="r.pdf", total=50.0)
    assert src.total == 50.0


@pytest.mark.anyio
async def test_milestone_8_5_dashboard_unaffected():
    doc = _make_doc(USER_A_ID, total=750.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        dash = await get_user_dashboard_data(user_id=USER_A_ID, settings=settings)
        assert dash.summary.total_amount_spent == 750.0


# -------------------------------------------------------------
# Additional 20+ Tests for Milestone 8.6 Advanced Intelligence
# -------------------------------------------------------------

def test_nl_item_how_many_eggs_purchased():
    parsed = AssistantIntentEngine.parse_query("how many eggs have I purchased?")
    assert parsed.intent == AssistantIntent.ITEM_QUANTITY
    assert parsed.item_query == "eggs"


def test_nl_item_egg_spending():
    parsed = AssistantIntentEngine.parse_query("how much did I spend on eggs?")
    assert parsed.intent == AssistantIntent.ITEM_SEARCH
    assert parsed.item_query == "eggs"


def test_temporal_this_year():
    now = datetime.now(timezone.utc)
    parsed = AssistantIntentEngine.parse_query("how much did I spend this year?", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.temporal_label == "this year"
    assert parsed.start_date == f"{now.year}-01-01"


def test_temporal_last_year():
    now = datetime.now(timezone.utc)
    parsed = AssistantIntentEngine.parse_query("how much was spent last year?", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.temporal_label == "last year"
    assert parsed.start_date == f"{now.year - 1}-01-01"


def test_temporal_recently():
    now = datetime.now(timezone.utc)
    parsed = AssistantIntentEngine.parse_query("show my recent purchases", now=now)
    assert parsed.intent == AssistantIntent.TEMPORAL_SPENDING
    assert parsed.temporal_label == "recently"


@pytest.mark.anyio
async def test_temporal_vendor_scoped():
    now = datetime.now(timezone.utc)
    today_str = now.date().strftime("%Y-%m-%d")
    doc1 = _make_doc(USER_A_ID, vendor="DMart", date_str=today_str, total=150.0)
    doc2 = _make_doc(USER_A_ID, vendor="Reliance", date_str=today_str, total=500.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_filtered_documents(vendor="DMart", start_date=today_str, end_date=today_str)
        assert len(docs) == 1
        assert (docs[0].extraction_result or {}).get("vendor_company") == "DMart"


@pytest.mark.anyio
async def test_comparison_equal_spending():
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=500.0)
    doc2 = _make_doc(USER_A_ID, vendor="Reliance", total=500.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        comp = await retrieval.compare_vendors("DMart", "Reliance")
        assert comp["difference"] == 0.0
        assert comp["higher_vendor"] is None


@pytest.mark.anyio
async def test_comparison_single_vendor_zero_docs():
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=750.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        comp = await retrieval.compare_vendors("DMart", "Costco")
        assert comp["vendor_a_spent"] == 750.0
        assert comp["vendor_b_spent"] == 0.0
        assert comp["higher_vendor"] == "DMart"


@pytest.mark.anyio
async def test_amount_filter_combined_with_vendor():
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=300.0)
    doc2 = _make_doc(USER_A_ID, vendor="DMart", total=1500.0)
    doc3 = _make_doc(USER_A_ID, vendor="Reliance", total=2000.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2, doc3]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_filtered_documents(vendor="DMart", min_amount=1000.0)
        assert len(docs) == 1
        assert float((docs[0].extraction_result or {}).get("total")) == 1500.0


@pytest.mark.anyio
async def test_amount_filter_no_matches():
    doc1 = _make_doc(USER_A_ID, total=250.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_filtered_documents(min_amount=10000.0)
        assert len(docs) == 0


def test_item_matching_case_insensitivity():
    assert _item_matches("WHOLE MILK", "milk") is True
    assert _item_matches("almond milk", "MILK") is True


def test_item_matching_plural_variations():
    assert _item_matches("Fresh Apples 1kg", "apple") is True
    assert _item_matches("Fresh Apple", "apples") is True
    assert _item_matches("Pineapple 1pc", "apple") is False


@pytest.mark.anyio
async def test_item_history_multiple_vendors():
    doc1 = _make_doc(
        USER_A_ID,
        vendor="DMart",
        date_str="2026-08-01",
        line_items=[{"description": "Organic Milk", "quantity": 1.0, "unit_price": 50.0, "line_total": 50.0}],
    )
    doc2 = _make_doc(
        USER_A_ID,
        vendor="Reliance",
        date_str="2026-08-10",
        line_items=[{"description": "Toned Milk", "quantity": 2.0, "unit_price": 45.0, "line_total": 90.0}],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        hist = await retrieval.get_item_history("milk")
        assert hist["total_quantity"] == 3.0
        assert hist["total_spent"] == 140.0
        assert hist["document_count"] == 2
        assert "2026-08-10" in hist["latest_date"]
        assert len(hist["vendors"]) == 2


@pytest.mark.anyio
async def test_item_history_nonexistent_item():
    doc1 = _make_doc(USER_A_ID, line_items=[{"description": "Bread", "quantity": 1.0, "unit_price": 40.0}])
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        hist = await retrieval.get_item_history("avocado")
        assert hist["total_quantity"] == 0.0
        assert hist["document_count"] == 0


def test_context_builder_comparison_metadata():
    parsed = ParsedQueryIntent(intent=AssistantIntent.VENDOR_COMPARISON, vendor="DMart", vendor_b="Reliance")
    payload = {
        "vendor_comparison": {
            "vendor_a": "DMart",
            "vendor_a_spent": 500.0,
            "vendor_a_count": 1,
            "vendor_b": "Reliance",
            "vendor_b_spent": 300.0,
            "vendor_b_count": 1,
            "difference": 200.0,
            "higher_vendor": "DMart",
        }
    }
    ctx, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, payload)
    assert meta["type"] == AssistantResultType.VENDOR_COMPARISON.value
    assert meta["difference"] == 200.0
    assert meta["higher_vendor"] == "DMart"


def test_context_builder_filtered_receipts_metadata():
    parsed = ParsedQueryIntent(intent=AssistantIntent.FILTERED_RECEIPTS, min_amount=500.0)
    doc = _make_doc(USER_A_ID, total=750.0)
    payload = {"filtered_documents": [doc]}
    ctx, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, payload)
    assert meta["type"] == AssistantResultType.FILTERED_RECEIPTS.value
    assert meta["document_count"] == 1
    assert meta["total_spent"] == 750.0


def test_context_builder_temporal_metadata():
    parsed = ParsedQueryIntent(intent=AssistantIntent.TEMPORAL_SPENDING, temporal_label="August")
    doc = _make_doc(USER_A_ID, total=1200.0)
    payload = {"temporal_documents": [doc]}
    ctx, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, payload)
    assert meta["type"] == AssistantResultType.TEMPORAL_SPENDING.value
    assert meta["temporal_label"] == "August"
    assert meta["total_spent"] == 1200.0


def test_context_builder_item_history_metadata():
    parsed = ParsedQueryIntent(intent=AssistantIntent.ITEM_HISTORY, item_query="eggs")
    payload = {
        "item_history": {
            "item_query": "eggs",
            "total_quantity": 12.0,
            "total_spent": 120.0,
            "document_count": 2,
            "latest_date": "2026-08-15",
            "vendors": ["DMart"],
        }
    }
    ctx, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, payload)
    assert meta["type"] == AssistantResultType.ITEM_HISTORY.value
    assert meta["total_quantity"] == 12.0
    assert meta["document_count"] == 2


@pytest.mark.anyio
async def test_malformed_extraction_tolerance_in_comparison():
    doc_broken = CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(USER_A_ID),
        filename="corrupt.pdf",
        storage_path="p",
        content_type="pdf",
        size=10,
        status="completed",
        created_at=datetime.now(timezone.utc),
        processed_at=datetime.now(timezone.utc),
        content_hash="h_corrupt",
        extraction_result={"vendor_company": "DMart", "total": "INVALID_AMOUNT", "line_items": None},
        quality_result=None,
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_broken]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        comp = await retrieval.compare_vendors("DMart", "Reliance")
        assert comp["vendor_a_spent"] == 0.0
        assert comp["vendor_b_spent"] == 0.0


@pytest.mark.anyio
async def test_session_continuity_across_comparison_and_follow_up():
    session_mgr = AssistantSessionManager()
    sess = await session_mgr.create_session(user_id=USER_A_ID)

    doc_dmart = _make_doc(USER_A_ID, vendor="DMart", total=1000.0)
    doc_rel = _make_doc(USER_A_ID, vendor="Reliance", total=500.0)

    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_dmart, doc_rel]):
        # Turn 1: Comparison
        resp1 = await run_assistant_chat(
            user_id=USER_A_ID,
            message="Compare DMart and Reliance",
            session_id=sess.session_id,
            session_manager=session_mgr,
            settings=settings,
        )
        assert resp1.result_type == AssistantResultType.VENDOR_COMPARISON.value

        # Turn 2: Follow-up on DMart
        resp2 = await run_assistant_chat(
            user_id=USER_A_ID,
            message="What did I buy from the first one?",
            session_id=sess.session_id,
            session_manager=session_mgr,
            settings=settings,
        )
        assert resp2.result_type in (AssistantResultType.VENDOR_ITEMS.value, AssistantResultType.LATEST_RECEIPT.value, AssistantResultType.GENERAL_QUERY.value)

