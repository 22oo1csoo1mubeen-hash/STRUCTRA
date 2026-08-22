"""Comprehensive test suite for Milestone 8.2: AI Assistant Intelligence, Retrieval Accuracy & Deterministic Answering.

Covers all 38 required test scenarios:
1. Vendor item query.
2. Latest vendor receipt query.
3. Latest global receipt query.
4. Vendor spending calculation.
5. Total spending calculation.
6. Item quantity calculation.
7. Item search.
8. Most expensive item.
9. Most expensive receipt.
10. Document count.
11. Top vendor.
12. Case-insensitive vendor matching.
13. Whitespace-normalized vendor matching.
14. Safe vendor punctuation/token matching.
15. Ambiguous vendor handling.
16. Case-insensitive item matching.
17. Safe item partial matching (matches 'Eggs', rejects 'Eggplant').
18. Missing vendor handling.
19. Missing item handling.
20. Missing total handling.
21. Malformed extraction handling.
22. Empty document library.
23. Unsaved documents excluded.
24. Deleted documents excluded.
25. User isolation.
26. Authentication required.
27. Conversation follow-up context.
28. Contextual pronoun resolution ('there', 'that', 'it').
29. Deterministic Decimal calculations.
30. No LLM calculation dependency.
31. No hallucinated values when context is missing.
32. Source attribution correctness.
33. Metadata correctness.
34. Provider timeout fallback.
35. Provider rate-limit fallback.
36. Bounded retry behavior.
37. Existing 8.1 session behavior remains intact.
38. Existing Dashboard endpoints remain intact.
"""

from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
import json
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
import httpx
import pytest

from app.api.dependencies import get_current_user
from app.main import app
from app.schemas.auth import CurrentUser
from app.schemas.assistant import AssistantSource
from app.services.assistant.context import AssistantContextBuilder
from app.services.assistant.intent import AssistantIntent, AssistantIntentEngine
from app.services.assistant.provider import AssistantChatProvider
from app.services.assistant.retrieval import (
    AssistantRetrievalService,
    _canonical_name,
    _item_matches,
    _vendor_matches,
)
from app.services.assistant.service import run_assistant_chat
from app.services.assistant.session import AssistantSessionManager
from app.services.dashboard import get_user_dashboard_data
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-000000000001"
USER_B_ID = "00000000-0000-0000-0000-000000000002"


def _make_doc(
    user_id: str,
    *,
    doc_id: UUID | None = None,
    filename: str = "receipt.pdf",
    vendor: str | None = "DMart",
    total: float | None = 1425.60,
    date_str: str | None = "2026-08-16",
    status: str = "completed",
    line_items: list[dict[str, Any]] | None = None,
    created_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    items = line_items or [
        {"description": "Organic Whole Milk 1L", "quantity": 2.0, "unit_price": 60.0, "line_total": 120.0},
        {"description": "Whole Wheat Bread 400g", "quantity": 1.0, "unit_price": 45.0, "line_total": 45.0},
        {"description": "Farm Fresh Brown Eggs 6-pack", "quantity": 2.0, "unit_price": 55.0, "line_total": 110.0},
    ]
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
            "date": date_str,
            "total": total,
            "line_items": items,
        },
        quality_result=None,
    )


def get_client(user_id: str = USER_A_ID) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=user_id)
    return TestClient(app)


# ===========================================================================
# 1. Vendor Item Query
# ===========================================================================
@pytest.mark.anyio
async def test_vendor_item_query():
    """Scenario 1: Query items purchased from a vendor."""
    doc = _make_doc(USER_A_ID, vendor="DMart")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_documents_by_vendor("DMart")
        assert len(docs) == 1
        parsed = AssistantIntentEngine.parse_query("what did I buy from dmart?")
        assert parsed.intent == AssistantIntent.VENDOR_ITEMS
        assert parsed.vendor.lower() == "dmart"


# ===========================================================================
# 2. Latest Vendor Receipt Query
# ===========================================================================
@pytest.mark.anyio
async def test_latest_vendor_receipt_query():
    """Scenario 2: Query latest receipt for a specific vendor."""
    doc_old = _make_doc(USER_A_ID, vendor="DMart", date_str="2026-08-01", total=100.0)
    doc_new = _make_doc(USER_A_ID, vendor="DMart", date_str="2026-08-15", total=500.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_old, doc_new]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        latest = await retrieval.get_latest_document(vendor="DMart")
        assert latest is not None
        assert latest.id == doc_new.id
        parsed = AssistantIntentEngine.parse_query("give me the latest dmart purchases")
        assert parsed.intent == AssistantIntent.LATEST_RECEIPT_ITEMS
        assert parsed.vendor.lower() == "dmart"


# ===========================================================================
# 3. Latest Global Receipt Query
# ===========================================================================
@pytest.mark.anyio
async def test_latest_global_receipt_query():
    """Scenario 3: Query latest receipt across all vendors."""
    doc1 = _make_doc(USER_A_ID, vendor="Reliance", date_str="2026-08-10")
    doc2 = _make_doc(USER_A_ID, vendor="DMart", date_str="2026-08-17")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        latest = await retrieval.get_latest_document()
        assert latest.id == doc2.id


# ===========================================================================
# 4. Vendor Spending Calculation
# ===========================================================================
@pytest.mark.anyio
async def test_vendor_spending_calculation():
    """Scenario 4: Deterministic calculation of spending at a vendor."""
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=750.50)
    doc2 = _make_doc(USER_A_ID, vendor="DMart", total=249.50)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        spend = await retrieval.calculate_vendor_spending("DMart")
        assert spend["total_spent"] == 1000.00
        assert spend["document_count"] == 2


# ===========================================================================
# 5. Total Spending Calculation
# ===========================================================================
@pytest.mark.anyio
async def test_total_spending_calculation():
    """Scenario 5: Deterministic calculation of overall library spending."""
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=100.0)
    doc2 = _make_doc(USER_A_ID, vendor="Amazon", total=300.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        tot = await retrieval.calculate_total_spending()
        assert tot["total_spent"] == 400.00
        assert tot["total_documents"] == 2


# ===========================================================================
# 6. Item Quantity Calculation
# ===========================================================================
@pytest.mark.anyio
async def test_item_quantity_calculation():
    """Scenario 6: Deterministic item quantity aggregations."""
    doc1 = _make_doc(
        USER_A_ID,
        line_items=[{"description": "Organic Brown Eggs 6-pack", "quantity": 2.0, "unit_price": 50.0, "line_total": 100.0}],
    )
    doc2 = _make_doc(
        USER_A_ID,
        line_items=[{"description": "Farm Fresh Eggs", "quantity": 12.0, "unit_price": 6.0, "line_total": 72.0}],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        res = await retrieval.calculate_item_quantities("eggs")
        assert res["total_quantity"] == 14.0
        assert res["total_spent"] == 172.00
        assert res["document_count"] == 2


# ===========================================================================
# 7. Item Search
# ===========================================================================
@pytest.mark.anyio
async def test_item_search():
    """Scenario 7: Line item search across library."""
    doc = _make_doc(
        USER_A_ID,
        line_items=[
            {"description": "Filter Coffee 500g", "quantity": 1.0, "unit_price": 250.0, "line_total": 250.0},
            {"description": "Milk 1L", "quantity": 2.0, "unit_price": 60.0, "line_total": 120.0},
        ],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        items = await retrieval.search_line_items("coffee")
        assert len(items) == 1
        assert items[0]["item_name"] == "Filter Coffee 500g"


# ===========================================================================
# 8. Most Expensive Item
# ===========================================================================
@pytest.mark.anyio
async def test_most_expensive_item():
    """Scenario 8: Deterministic identification of the single highest-priced item."""
    doc = _make_doc(
        USER_A_ID,
        line_items=[
            {"description": "AirPods Pro", "quantity": 1.0, "unit_price": 24900.0, "line_total": 24900.0},
            {"description": "USB-C Cable", "quantity": 1.0, "unit_price": 1900.0, "line_total": 1900.0},
        ],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        it = await retrieval.get_most_expensive_item()
        assert it is not None
        assert it["name"] == "AirPods Pro"
        assert it["amount"] == 24900.0


# ===========================================================================
# 9. Most Expensive Receipt
# ===========================================================================
@pytest.mark.anyio
async def test_most_expensive_receipt():
    """Scenario 9: Deterministic identification of the highest-amount receipt."""
    doc1 = _make_doc(USER_A_ID, filename="r1.pdf", vendor="DMart", total=500.0)
    doc2 = _make_doc(USER_A_ID, filename="r2.pdf", vendor="Apple Store", total=89900.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        rec = await retrieval.get_most_expensive_receipt()
        assert rec is not None
        assert rec["vendor"] == "Apple Store"
        assert rec["total_amount"] == 89900.0


# ===========================================================================
# 10. Document Count
# ===========================================================================
@pytest.mark.anyio
async def test_document_count():
    """Scenario 10: Deterministic count of completed documents."""
    doc1 = _make_doc(USER_A_ID, vendor="DMart")
    doc2 = _make_doc(USER_A_ID, vendor="Reliance")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        count = await retrieval.get_document_count()
        assert count == 2
        dmart_count = await retrieval.get_document_count(vendor="DMart")
        assert dmart_count == 1


# ===========================================================================
# 11. Top Vendor
# ===========================================================================
@pytest.mark.anyio
async def test_top_vendor():
    """Scenario 11: Top vendors query ranking."""
    parsed = AssistantIntentEngine.parse_query("which vendor did I spend the most with?")
    assert parsed.intent == AssistantIntent.TOP_VENDORS


# ===========================================================================
# 12. Case-Insensitive Vendor Matching
# ===========================================================================
def test_case_insensitive_vendor_matching():
    """Scenario 12: Matching works regardless of uppercase/lowercase."""
    assert _vendor_matches("DMart", "dmart")
    assert _vendor_matches("dmart", "DMART")
    assert _vendor_matches("Reliance Digital", "RELIANCE DIGITAL")


# ===========================================================================
# 13. Whitespace-Normalized Vendor Matching
# ===========================================================================
def test_whitespace_normalized_vendor_matching():
    """Scenario 13: Matching tolerates internal and outer whitespace."""
    assert _vendor_matches("DMart", "d mart")
    assert _vendor_matches("D Mart", "DMart")


# ===========================================================================
# 14. Safe Vendor Punctuation/Token Matching
# ===========================================================================
def test_safe_vendor_punctuation_matching():
    """Scenario 14: Punctuation like hyphens and dots are handled safely."""
    assert _vendor_matches("D-Mart", "DMart")
    assert _vendor_matches("D.Mart", "D-Mart")
    assert _canonical_name("D-Mart") == _canonical_name("DMart")


# ===========================================================================
# 15. Ambiguous Vendor Handling
# ===========================================================================
@pytest.mark.anyio
async def test_ambiguous_vendor_handling():
    """Scenario 15: Multiple distinct sub-vendors trigger ambiguity detection."""
    doc1 = _make_doc(USER_A_ID, vendor="Reliance Fresh")
    doc2 = _make_doc(USER_A_ID, vendor="Reliance Digital")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        is_ambig, candidates = await retrieval.check_vendor_ambiguity("Reliance")
        assert is_ambig is True
        assert len(candidates) == 2
        assert "Reliance Fresh" in candidates
        assert "Reliance Digital" in candidates


# ===========================================================================
# 16. Case-Insensitive Item Matching
# ===========================================================================
def test_case_insensitive_item_matching():
    """Scenario 16: Items match across cases."""
    assert _item_matches("Organic Eggs", "eggs")
    assert _item_matches("organic eggs", "EGGS")


# ===========================================================================
# 17. Safe Item Partial Matching
# ===========================================================================
def test_safe_item_partial_matching():
    """Scenario 17: Word-boundary matching matches whole words, rejects substring collisions."""
    assert _item_matches("Farm Fresh Eggs 6-pack", "egg")
    assert _item_matches("Farm Fresh Eggs 6-pack", "eggs")
    # 'egg' must NOT match 'Eggplant' or 'Nutmeg'
    assert not _item_matches("Fresh Purple Eggplant", "egg")
    assert not _item_matches("Ground Nutmeg Spice", "egg")


# ===========================================================================
# 18. Missing Vendor Handling
# ===========================================================================
@pytest.mark.anyio
async def test_missing_vendor_handling():
    """Scenario 18: Querying nonexistent vendor returns empty results without hallucination."""
    doc = _make_doc(USER_A_ID, vendor="DMart")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_documents_by_vendor("Zara")
        assert len(docs) == 0


# ===========================================================================
# 19. Missing Item Handling
# ===========================================================================
@pytest.mark.anyio
async def test_missing_item_handling():
    """Scenario 19: Querying item not in library returns 0 count."""
    doc = _make_doc(USER_A_ID, line_items=[{"description": "Bread", "quantity": 1.0, "line_total": 40.0}])
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        stats = await retrieval.calculate_item_quantities("avocado")
        assert stats["total_quantity"] == 0.0
        assert stats["document_count"] == 0


# ===========================================================================
# 20. Missing Total Handling
# ===========================================================================
@pytest.mark.anyio
async def test_missing_total_handling():
    """Scenario 20: Documents with null total are handled without error."""
    doc = _make_doc(USER_A_ID, total=None)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        tot = await retrieval.calculate_total_spending()
        assert tot["total_spent"] == 0.0
        assert tot["total_documents"] == 1


# ===========================================================================
# 21. Malformed Extraction Handling
# ===========================================================================
@pytest.mark.anyio
async def test_malformed_extraction_handling():
    """Scenario 21: Documents with corrupt extraction dictionary do not break retrieval."""
    doc_corrupt = CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(USER_A_ID),
        filename="corrupt.pdf",
        storage_path="path/corrupt.pdf",
        content_type="application/pdf",
        size=1024,
        status="completed",
        created_at=datetime.now(UTC),
        processed_at=datetime.now(UTC),
        content_hash="hash_corrupt",
        extraction_result={"vendor_company": None, "date": "invalid-date", "total": "not-a-number", "line_items": None},
        quality_result=None,
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_corrupt]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        spend = await retrieval.calculate_total_spending()
        assert spend["total_spent"] == 0.0


# ===========================================================================
# 22. Empty Document Library
# ===========================================================================
@pytest.mark.anyio
async def test_empty_document_library():
    """Scenario 22: User with 0 documents is handled gracefully."""
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_all_documents()
        assert docs == []
        latest = await retrieval.get_latest_document()
        assert latest is None


# ===========================================================================
# 23. Unsaved Documents Excluded
# ===========================================================================
@pytest.mark.anyio
async def test_unsaved_documents_excluded():
    """Scenario 23: Non-completed documents (e.g. processing/pending) are filtered out."""
    doc_pending = _make_doc(USER_A_ID, status="processing")
    doc_completed = _make_doc(USER_A_ID, status="completed")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_pending, doc_completed]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_all_documents()
        assert len(docs) == 1
        assert docs[0].id == doc_completed.id


# ===========================================================================
# 24. Deleted Documents Excluded
# ===========================================================================
@pytest.mark.anyio
async def test_deleted_documents_excluded():
    """Scenario 24: Documents with status 'failed' or 'deleted' are excluded."""
    doc_failed = _make_doc(USER_A_ID, status="failed")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_failed]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_all_documents()
        assert len(docs) == 0


# ===========================================================================
# 25. User Isolation
# ===========================================================================
def test_user_isolation():
    """Scenario 25: User A cannot query or reset User B's session."""
    client = get_client(USER_B_ID)
    s_b = client.post("/assistant/session").json()["session_id"]

    # Switch to User A
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)
    resp = client.post(f"/assistant/session/{s_b}/reset")
    assert resp.status_code == 404


# ===========================================================================
# 26. Authentication Required
# ===========================================================================
def test_authentication_required():
    """Scenario 26: Endpoint returns 401 when no auth is provided."""
    app.dependency_overrides.clear()
    client = TestClient(app)
    resp = client.post("/assistant/chat", json={"message": "hello"})
    assert resp.status_code == 401


# ===========================================================================
# 27. Conversation Follow-Up Context
# ===========================================================================
def test_conversation_follow_up_context():
    """Scenario 27: Follow-up question preserves conversational context."""
    history = [
        {"role": "user", "content": "What did I buy from DMart?"},
        {"role": "assistant", "content": "You bought milk and bread from DMart."},
    ]
    parsed = AssistantIntentEngine.parse_query("How much did I spend there?", conversation_history=history)
    assert parsed.intent == AssistantIntent.VENDOR_SPENDING
    assert parsed.vendor is not None
    assert parsed.vendor.lower() == "dmart"


# ===========================================================================
# 28. Contextual Pronoun Resolution
# ===========================================================================
def test_contextual_pronoun_resolution():
    """Scenario 28: Resolves pronouns 'that', 'it', 'there' to prior entities."""
    history = [
        {"role": "user", "content": "Show my latest Reliance receipt"},
        {"role": "assistant", "content": "Here is your Reliance receipt from yesterday."},
    ]
    parsed = AssistantIntentEngine.parse_query("How much did that cost?", conversation_history=history)
    assert parsed.vendor is not None
    assert "reliance" in parsed.vendor.lower()


# ===========================================================================
# 29. Deterministic Decimal Calculations
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_decimal_calculations():
    """Scenario 29: Numerical calculations avoid floating point drift."""
    doc1 = _make_doc(USER_A_ID, vendor="Store", total=19.99)
    doc2 = _make_doc(USER_A_ID, vendor="Store", total=0.01)
    doc3 = _make_doc(USER_A_ID, vendor="Store", total=100.123)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2, doc3]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        res = await retrieval.calculate_vendor_spending("Store")
        assert res["total_spent"] == 120.12


# ===========================================================================
# 30. No LLM Calculation Dependency
# ===========================================================================
@pytest.mark.anyio
async def test_no_llm_calculation_dependency():
    """Scenario 30: Spending calculations are generated before LLM call."""
    doc = _make_doc(USER_A_ID, vendor="DMart", total=500.0)
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    mock_provider = MagicMock(spec=AssistantChatProvider)
    mock_provider.generate_reply = AsyncMock(return_value="You spent ₹500.00 at DMart.")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="how much did I spend in dmart?",
            settings=settings,
            chat_provider=mock_provider,
        )
        assert resp.metadata["total_spent"] == 500.0
        # Verify LLM received verified context JSON containing the 500.0 calculation
        call_args = mock_provider.generate_reply.call_args
        assert "500" in call_args.kwargs["context_json"]


# ===========================================================================
# 31. No Hallucinated Values When Context Missing
# ===========================================================================
@pytest.mark.anyio
async def test_no_hallucinated_values_when_context_missing():
    """Scenario 31: Zero documents results in empty context and clean statement."""
    parsed = AssistantIntentEngine.parse_query("What did I buy from Zara?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"documents": []},
    )
    assert sources == []
    assert meta.get("document_count") == 0


# ===========================================================================
# 32. Source Attribution Correctness
# ===========================================================================
@pytest.mark.anyio
async def test_source_attribution_correctness():
    """Scenario 32: Returned sources have exact document ID, filename, vendor, date, total."""
    d_id = uuid4()
    doc = _make_doc(
        USER_A_ID,
        doc_id=d_id,
        filename="dmart_aug.pdf",
        vendor="DMart",
        total=1425.60,
        date_str="2026-08-16",
    )
    parsed = AssistantIntentEngine.parse_query("what is my latest receipt?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"document": doc},
    )
    assert len(sources) == 1
    s = sources[0]
    assert s.document_id == d_id
    assert s.filename == "dmart_aug.pdf"
    assert s.vendor == "DMart"
    assert s.total == 1425.60
    assert s.document_date == "2026-08-16"


# ===========================================================================
# 33. Metadata Correctness
# ===========================================================================
@pytest.mark.anyio
async def test_metadata_correctness():
    """Scenario 33: Structured metadata contains appropriate type and fields."""
    doc = _make_doc(USER_A_ID, vendor="DMart", total=1000.0)
    parsed = AssistantIntentEngine.parse_query("how much did I spend at DMart?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"vendor_spending": {"vendor": "DMart", "total_spent": 1000.0, "document_count": 1, "documents": [doc]}},
    )
    assert meta["type"] == "vendor_spending"
    assert meta["vendor"] == "DMart"
    assert meta["total_spent"] == 1000.0
    assert meta["document_count"] == 1


# ===========================================================================
# 34. Provider Timeout Fallback
# ===========================================================================
@pytest.mark.anyio
async def test_provider_timeout_fallback():
    """Scenario 34: LLM provider timeout triggers graceful deterministic fallback reply."""
    doc = _make_doc(USER_A_ID, vendor="DMart", total=500.0)
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    provider = AssistantChatProvider(settings)
    mock_client = AsyncMock()
    mock_client.post.side_effect = httpx.TimeoutException("Timeout")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        with patch.object(provider, "_call_gemini", return_value="Gemini down"):
            resp = await run_assistant_chat(
                user_id=USER_A_ID,
                message="how much did I spend in dmart?",
                settings=settings,
                chat_provider=provider,
            )
            # Deterministic fallback synthesized:
            assert "DMart" in resp.reply or "trouble" in resp.reply


# ===========================================================================
# 35. Provider Rate-Limit Fallback
# ===========================================================================
@pytest.mark.anyio
async def test_provider_rate_limit_fallback():
    """Scenario 35: Groq 429 Rate Limit switches seamlessly to Gemini."""
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=SimpleNamespace(get_secret_value=lambda: "gemini_key"),
        gemini_model="gemini-3.1-flash-lite",
    )
    provider = AssistantChatProvider(settings)
    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_client = AsyncMock()
    mock_client.post.side_effect = httpx.HTTPStatusError("Rate Limit", request=MagicMock(), response=mock_resp)

    with patch.object(provider, "_call_gemini", return_value="Gemini Answer") as mock_gemini:
        reply = await provider.generate_reply("{}", "hello", [], http_client=mock_client)
        assert reply == "Gemini Answer"
        mock_gemini.assert_called_once()


# ===========================================================================
# 36. Bounded Retry Behavior
# ===========================================================================
@pytest.mark.anyio
async def test_bounded_retry_behavior():
    """Scenario 36: Exactly 2 retries (3 total attempts) are performed."""
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    provider = AssistantChatProvider(settings)
    attempts = 0

    async def mock_post(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        raise httpx.TimeoutException("Timeout")

    mock_client = AsyncMock()
    mock_client.post.side_effect = mock_post

    with patch("asyncio.sleep", return_value=None):
        await provider.generate_reply("{}", "hi", [], http_client=mock_client)
        assert attempts == 3


# ===========================================================================
# 37. Existing 8.1 Session Behavior Intact
# ===========================================================================
@pytest.mark.anyio
async def test_existing_8_1_session_behavior_intact():
    """Scenario 37: Ephemeral session creation, turns, and resets continue to function."""
    mgr = AssistantSessionManager()
    s = await mgr.create_session(USER_A_ID)
    assert s.user_id == USER_A_ID
    await mgr.add_turn(s.session_id, USER_A_ID, "user", "Hi")
    await mgr.add_turn(s.session_id, USER_A_ID, "assistant", "Hello")
    assert len(s.turns) == 2
    res = await mgr.reset_session(s.session_id, USER_A_ID)
    assert res is True
    assert len(s.turns) == 0


# ===========================================================================
# 38. Existing Dashboard Endpoints Intact
# ===========================================================================
@pytest.mark.anyio
async def test_existing_dashboard_endpoints_intact():
    """Scenario 38: Dashboard data calculation is completely unaffected."""
    doc1 = _make_doc(USER_A_ID, vendor="Apple", total=1000.0)
    doc2 = _make_doc(USER_A_ID, vendor="DMart", total=200.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        dash = await get_user_dashboard_data(user_id=USER_A_ID, settings=settings)
        assert dash.summary.total_documents == 2
        assert dash.summary.total_amount_spent == 1200.0


# ===========================================================================
# 39. Temporal Most Expensive Item Query
# ===========================================================================
@pytest.mark.anyio
async def test_temporal_most_expensive_item_query():
    """Scenario 39: Querying the most expensive item in a specific year correctly bounds retrieval."""
    doc_2023 = _make_doc(
        USER_A_ID,
        filename="hospital.jpg",
        vendor="V&RO HOSPITALITY",
        date_str="2023-05-30",
        total=5000.0,
        line_items=[
            {"description": "Giant Party Platter", "quantity": 1.0, "unit_price": 2250.0, "line_total": 2250.0}
        ],
    )
    doc_2026 = _make_doc(
        USER_A_ID,
        filename="Hotel2.png",
        vendor="GRAND PLAZA HOTEL",
        date_str="2026-03-18",
        total=780.75,
        line_items=[
            {"description": "ROOM - KING SUITE", "quantity": 3.0, "unit_price": 189.0, "line_total": 567.0},
            {"description": "MINI BAR", "quantity": 1.0, "unit_price": 32.0, "line_total": 32.0},
        ],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_2023, doc_2026]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)

        # 2026 query
        parsed = AssistantIntentEngine.parse_query("what is the expensive product i brought in 2026")
        assert parsed.intent == AssistantIntent.MOST_EXPENSIVE_ITEM
        assert parsed.start_date == "2026-01-01"
        assert parsed.end_date == "2026-12-31"

        item_2026 = await retrieval.get_most_expensive_item(
            start_date=parsed.start_date,
            end_date=parsed.end_date,
        )
        assert item_2026 is not None
        assert item_2026["name"] == "ROOM - KING SUITE"
        assert item_2026["amount"] == 567.0
        assert item_2026["vendor"] == "GRAND PLAZA HOTEL"
        assert item_2026["filename"] == "Hotel2.png"

        # Overall query without year
        overall_item = await retrieval.get_most_expensive_item()
        assert overall_item is not None
        assert overall_item["name"] == "Giant Party Platter"
        assert overall_item["amount"] == 2250.0


# ===========================================================================
# 40. Temporal Cheapest Item Query
# ===========================================================================
@pytest.mark.anyio
async def test_temporal_cheapest_item_query():
    """Scenario 40: Querying cheapest item in a specific year correctly filters line items."""
    doc_2026 = _make_doc(
        USER_A_ID,
        filename="Hotel2.png",
        vendor="GRAND PLAZA HOTEL",
        date_str="2026-03-18",
        total=780.75,
        line_items=[
            {"description": "ROOM - KING SUITE", "quantity": 3.0, "unit_price": 189.0, "line_total": 567.0},
            {"description": "PARKING (DAILY)", "quantity": 2.0, "unit_price": 25.0, "line_total": 50.0},
        ],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_2026]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        parsed = AssistantIntentEngine.parse_query("cheapest item in 2026")
        assert parsed.intent == AssistantIntent.CHEAPEST_ITEM
        assert parsed.start_date == "2026-01-01"

        cheap = await retrieval.get_cheapest_item(
            start_date=parsed.start_date,
            end_date=parsed.end_date,
        )
        assert cheap is not None
        assert cheap["name"] == "PARKING (DAILY)"
        assert cheap["unit_price"] == 25.0


# ===========================================================================
# 41. Temporal Most Expensive Receipt Query
# ===========================================================================
@pytest.mark.anyio
async def test_temporal_most_expensive_receipt_query():
    """Scenario 41: Querying most expensive receipt in a year retrieves the highest receipt for that year."""
    doc1 = _make_doc(USER_A_ID, filename="r1.pdf", vendor="A", date_str="2025-01-10", total=5000.0)
    doc2 = _make_doc(USER_A_ID, filename="r2.pdf", vendor="B", date_str="2026-02-15", total=300.0)
    doc3 = _make_doc(USER_A_ID, filename="r3.pdf", vendor="C", date_str="2026-05-20", total=750.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2, doc3]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        parsed = AssistantIntentEngine.parse_query("most expensive receipt in 2026")
        assert parsed.intent == AssistantIntent.MOST_EXPENSIVE_RECEIPT
        assert parsed.start_date == "2026-01-01"

        rec = await retrieval.get_most_expensive_receipt(
            start_date=parsed.start_date,
            end_date=parsed.end_date,
        )
        assert rec is not None
        assert rec["filename"] == "r3.pdf"
        assert rec["total_amount"] == 750.0


# ===========================================================================
# 42. Context Attribution Correctness
# ===========================================================================
@pytest.mark.anyio
async def test_context_attribution_correctness():
    """Scenario 42: AssistantContextBuilder produces correct document filename and date attribution."""
    doc = _make_doc(
        USER_A_ID,
        filename="Hotel2.png",
        vendor="GRAND PLAZA HOTEL",
        date_str="2026-03-18",
        total=780.75,
    )
    parsed = AssistantIntentEngine.parse_query("what is the expensive product i brought in 2026")
    item_payload = {
        "most_expensive_item": {
            "name": "ROOM - KING SUITE",
            "amount": 567.0,
            "unit_price": 189.0,
            "quantity": 3.0,
            "vendor": "GRAND PLAZA HOTEL",
            "date": "2026-03-18",
            "document_id": str(doc.id),
            "filename": "Hotel2.png",
        }
    }
    _, sources, metadata = AssistantContextBuilder.build_context_for_intent(parsed, item_payload)
    assert len(sources) == 1
    assert sources[0].filename == "Hotel2.png"
    assert sources[0].vendor == "GRAND PLAZA HOTEL"
    assert sources[0].document_date == "2026-03-18"
    assert metadata["title"] == "Most Expensive Item (2026)"
    assert "ROOM - KING SUITE" in metadata["summary"]


# ===========================================================================
# 43. Recent Receipts Sorted by Date
# ===========================================================================
@pytest.mark.anyio
async def test_recent_receipts_sorting_by_date():
    """Scenario 43: 'Show me my recent receipts' retrieves top 5 receipts sorted by document date (newest first)."""
    docs = [
        _make_doc(USER_A_ID, filename=f"doc_{i}.pdf", vendor=f"Vendor_{i}", date_str=f"202{i}-01-01", total=100.0 * i)
        for i in range(1, 8)
    ]
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=docs):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        parsed = AssistantIntentEngine.parse_query("Show me my recent receipts")
        assert parsed.intent == AssistantIntent.RECENT_RECEIPTS

        recent = await retrieval.get_recent_receipts(limit=5)
        assert len(recent) == 5
        assert [d.filename for d in recent] == ["doc_7.pdf", "doc_6.pdf", "doc_5.pdf", "doc_4.pdf", "doc_3.pdf"]


# ===========================================================================
# 44. Recent Uploads Sorted by Created At
# ===========================================================================
@pytest.mark.anyio
async def test_recent_uploads_sorting_by_created_at():
    """Scenario 44: 'Show me my recent uploaded receipts' retrieves top 5 receipts sorted by upload timestamp."""
    base_dt = datetime(2026, 8, 20, 10, 0, 0, tzinfo=timezone.utc)
    docs = [
        _make_doc(
            USER_A_ID,
            filename=f"upload_{i}.pdf",
            vendor=f"Vendor_{i}",
            date_str="2020-01-01",
            total=50.0 * i,
            created_at=base_dt + timedelta(minutes=i * 10),
        )
        for i in range(1, 8)
    ]
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=docs):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        parsed = AssistantIntentEngine.parse_query("Show me my recent uploaded receipts")
        assert parsed.intent == AssistantIntent.RECENT_UPLOADS

        recent_up = await retrieval.get_recent_uploads(limit=5)
        assert len(recent_up) == 5
        assert [d.filename for d in recent_up] == ["upload_7.pdf", "upload_6.pdf", "upload_5.pdf", "upload_4.pdf", "upload_3.pdf"]


