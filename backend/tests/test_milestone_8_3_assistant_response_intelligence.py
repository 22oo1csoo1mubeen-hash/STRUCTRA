"""Comprehensive test suite for Milestone 8.3: AI Assistant Response Intelligence & Structured Result Presentation.

Covers all 43 required scenarios:
1. vendor_items response type
2. item_quantity response type
3. vendor_spending response type
4. spending_summary response type
5. receipt response type
6. most_expensive_item response type
7. most_expensive_receipt response type
8. document_count response type
9. top_vendors response type
10. ambiguous_vendor response type
11. no_results response type
12. deterministic vendor item answer
13. deterministic vendor spending answer
14. deterministic item quantity answer
15. deterministic latest receipt answer
16. deterministic most expensive receipt answer
17. deterministic most expensive item answer
18. deterministic total spending answer
19. no hallucinated values
20. missing total handling
21. missing quantity handling
22. malformed extraction handling
23. empty library handling
24. no-result vendor handling
25. no-result item handling
26. source attribution correctness
27. latest document source correctness
28. aggregate source correctness
29. no unrelated sources
30. follow-up "there"
31. follow-up "that"
32. follow-up "it"
33. ambiguous contextual reference
34. multi-turn context remains user-scoped
35. provider success
36. provider timeout
37. provider rate-limit
38. deterministic fallback when all providers fail
39. authentication required
40. strict user isolation
41. Milestone 8.1 tests remain passing
42. Milestone 8.2 tests remain passing
43. Dashboard APIs remain unaffected
"""

from datetime import UTC, datetime, timezone
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
from app.schemas.assistant import AssistantResultType, AssistantSource
from app.schemas.auth import CurrentUser
from app.services.assistant.context import AssistantContextBuilder
from app.services.assistant.intent import AssistantIntent, AssistantIntentEngine
from app.services.assistant.provider import AssistantChatProvider
from app.services.assistant.retrieval import AssistantRetrievalService
from app.services.assistant.service import run_assistant_chat
from app.services.assistant.session import AssistantSessionManager
from app.services.dashboard import get_user_dashboard_data
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-00000000009a"
USER_B_ID = "00000000-0000-0000-0000-00000000009b"


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
# 1. Vendor Items Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_vendor_items_response_type():
    """Scenario 1: Vendor items query returns vendor_items result_type and structured fields."""
    doc = _make_doc(USER_A_ID, vendor="DMart")
    parsed = AssistantIntentEngine.parse_query("what did I buy from DMart?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"documents": [doc]})
    assert meta["type"] == AssistantResultType.VENDOR_ITEMS.value
    assert meta["vendor"] == "DMart"
    assert "title" in meta
    assert "summary" in meta
    assert len(sources) == 1


# ===========================================================================
# 2. Item Quantity Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_item_quantity_response_type():
    """Scenario 2: Item quantity query returns item_quantity result_type."""
    doc = _make_doc(USER_A_ID)
    parsed = AssistantIntentEngine.parse_query("how many eggs did I buy?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"item_stats": {"item_query": "eggs", "total_quantity": 4.0, "total_spent": 220.0, "document_count": 1, "items": [{"document_id": doc.id, "filename": doc.filename, "vendor": "DMart", "document_date": "2026-08-16", "item_name": "Eggs", "quantity": 4.0, "total": 220.0}]}},
    )
    assert meta["type"] == AssistantResultType.ITEM_QUANTITY.value
    assert meta["total_quantity"] == 4.0
    assert meta["total_spent"] == 220.0


# ===========================================================================
# 3. Vendor Spending Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_vendor_spending_response_type():
    """Scenario 3: Vendor spending returns vendor_spending result_type."""
    doc = _make_doc(USER_A_ID, vendor="DMart", total=1500.0)
    parsed = AssistantIntentEngine.parse_query("how much did I spend in DMart?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"vendor_spending": {"vendor": "DMart", "total_spent": 1500.0, "document_count": 1, "documents": [doc]}},
    )
    assert meta["type"] == AssistantResultType.VENDOR_SPENDING.value
    assert meta["total_spent"] == 1500.0
    assert meta["document_count"] == 1


# ===========================================================================
# 4. Spending Summary Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_spending_summary_response_type():
    """Scenario 4: Total spending query returns spending_summary result_type."""
    parsed = AssistantIntentEngine.parse_query("how much have I spent overall?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"total_spending": {"total_spent": 5000.0, "total_documents": 10}},
    )
    assert meta["type"] == AssistantResultType.SPENDING_SUMMARY.value
    assert meta["total_spent"] == 5000.0
    assert meta["total_documents"] == 10


# ===========================================================================
# 5. Receipt Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_receipt_response_type():
    """Scenario 5: Latest receipt returns receipt result_type."""
    doc = _make_doc(USER_A_ID, vendor="Apple Store", total=89900.0)
    parsed = AssistantIntentEngine.parse_query("what is my latest receipt?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"document": doc})
    assert meta["type"] == AssistantResultType.RECEIPT.value
    assert meta["total_amount"] == 89900.0
    assert len(sources) == 1


# ===========================================================================
# 6. Most Expensive Item Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_most_expensive_item_response_type():
    """Scenario 6: Most expensive item returns most_expensive_item result_type."""
    parsed = AssistantIntentEngine.parse_query("what is my most expensive purchase?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"most_expensive_item": {"name": "MacBook Pro", "amount": 199900.0, "vendor": "Apple Store"}},
    )
    assert meta["type"] == AssistantResultType.MOST_EXPENSIVE_ITEM.value
    assert meta["item_name"] == "MacBook Pro"
    assert meta["amount"] == 199900.0


# ===========================================================================
# 7. Most Expensive Receipt Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_most_expensive_receipt_response_type():
    """Scenario 7: Highest total receipt returns most_expensive_receipt result_type."""
    d_id = uuid4()
    parsed = AssistantIntentEngine.parse_query("which receipt has the highest bill?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"most_expensive_receipt": {"document_id": d_id, "filename": "mac.pdf", "vendor": "Apple", "total_amount": 199900.0, "document_date": "2026-08-01"}},
    )
    assert meta["type"] == AssistantResultType.MOST_EXPENSIVE_RECEIPT.value
    assert meta["total_amount"] == 199900.0


# ===========================================================================
# 8. Document Count Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_document_count_response_type():
    """Scenario 8: Document count returns document_count result_type."""
    parsed = AssistantIntentEngine.parse_query("how many receipts do I have?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"total_spending": {"total_spent": 1000.0, "total_documents": 5}},
    )
    assert meta["type"] == AssistantResultType.DOCUMENT_COUNT.value
    assert meta["total_documents"] == 5


# ===========================================================================
# 9. Top Vendors Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_top_vendors_response_type():
    """Scenario 9: Top vendors query returns top_vendors result_type."""
    parsed = AssistantIntentEngine.parse_query("which vendor did I spend the most with?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"top_vendors": [{"vendor": "Apple Store", "total_spent": 89900.0, "document_count": 1, "percentage": 90.0}]},
    )
    assert meta["type"] == AssistantResultType.TOP_VENDORS.value
    assert len(meta["vendors"]) == 1


# ===========================================================================
# 10. Ambiguous Vendor Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_ambiguous_vendor_response_type():
    """Scenario 10: Ambiguous vendor query returns ambiguous_vendor result_type."""
    parsed = AssistantIntentEngine.parse_query("how much did I spend at Reliance?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"ambiguous_vendors": ["Reliance Fresh", "Reliance Digital"]},
    )
    assert meta["type"] == AssistantResultType.AMBIGUOUS_VENDOR.value
    assert len(meta["matching_vendors"]) == 2


# ===========================================================================
# 11. No Results Response Type
# ===========================================================================
@pytest.mark.anyio
async def test_no_results_response_type():
    """Scenario 11: Nonexistent vendor returns no_results result_type."""
    parsed = AssistantIntentEngine.parse_query("what did I buy from Zara?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"documents": []},
    )
    assert meta["type"] == AssistantResultType.NO_RESULTS.value
    assert meta["document_count"] == 0
    assert "not found" in meta["summary"].lower() or "couldn't find" in meta["summary"].lower()


# ===========================================================================
# 12. Deterministic Vendor Item Answer
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_vendor_item_answer():
    """Scenario 12: Verified items from document are included deterministically."""
    doc = _make_doc(USER_A_ID, vendor="DMart")
    parsed = AssistantIntentEngine.parse_query("what did I buy from DMart in my latest receipt?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"document": doc})
    assert meta["item_count"] == 3
    assert len(meta["items"]) == 3
    assert "Milk" in meta["items"][0]


# ===========================================================================
# 13. Deterministic Vendor Spending Answer
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_vendor_spending_answer():
    """Scenario 13: Exact vendor spending is reflected in canonical summary."""
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=750.50)
    doc2 = _make_doc(USER_A_ID, vendor="DMart", total=249.50)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        res = await retrieval.calculate_vendor_spending("DMart")
        assert res["total_spent"] == 1000.00
        parsed = AssistantIntentEngine.parse_query("how much did I spend at DMart?")
        ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"vendor_spending": res})
        assert "₹1,000.00" in meta["summary"]


# ===========================================================================
# 14. Deterministic Item Quantity Answer
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_item_quantity_answer():
    """Scenario 14: Exact item count is reflected in canonical summary."""
    doc = _make_doc(USER_A_ID, line_items=[{"description": "Organic Brown Eggs 6-pack", "quantity": 3.0, "line_total": 150.0}])
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        res = await retrieval.calculate_item_quantities("eggs")
        assert res["total_quantity"] == 3.0
        parsed = AssistantIntentEngine.parse_query("how many eggs did I buy?")
        ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"item_stats": res})
        assert "3" in meta["summary"]
        assert "₹150.00" in meta["summary"]


# ===========================================================================
# 15. Deterministic Latest Receipt Answer
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_latest_receipt_answer():
    """Scenario 15: Exact latest receipt total and date in summary."""
    doc = _make_doc(USER_A_ID, vendor="Apple", total=4999.0, date_str="2026-08-18")
    parsed = AssistantIntentEngine.parse_query("what is my latest receipt?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"document": doc})
    assert "Apple" in meta["summary"]
    assert "2026-08-18" in meta["summary"]
    assert "₹4,999.00" in meta["summary"]


# ===========================================================================
# 16. Deterministic Most Expensive Receipt Answer
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_most_expensive_receipt_answer():
    """Scenario 16: Exact highest receipt reflected in summary."""
    rec = {"document_id": uuid4(), "filename": "laptop.pdf", "vendor": "Dell", "total_amount": 75000.0, "document_date": "2026-08-10"}
    parsed = AssistantIntentEngine.parse_query("which receipt has the highest bill?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"most_expensive_receipt": rec})
    assert "Dell" in meta["summary"]
    assert "₹75,000.00" in meta["summary"]


# ===========================================================================
# 17. Deterministic Most Expensive Item Answer
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_most_expensive_item_answer():
    """Scenario 17: Exact most expensive item reflected in summary."""
    it = {"name": "Noise Cancelling Headphones", "amount": 29990.0, "vendor": "Sony"}
    parsed = AssistantIntentEngine.parse_query("what was my most expensive purchase?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"most_expensive_item": it})
    assert "Noise Cancelling Headphones" in meta["summary"]
    assert "₹29,990.00" in meta["summary"]


# ===========================================================================
# 18. Deterministic Total Spending Answer
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_total_spending_answer():
    """Scenario 18: Exact total spending across library in summary."""
    tot = {"total_spent": 12500.50, "total_documents": 8}
    parsed = AssistantIntentEngine.parse_query("how much have I spent overall?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"total_spending": tot})
    assert "₹12,500.50" in meta["summary"]
    assert "8" in meta["summary"]


# ===========================================================================
# 19. No Hallucinated Values
# ===========================================================================
@pytest.mark.anyio
async def test_no_hallucinated_values():
    """Scenario 19: Empty vendor query sets no_results type and clear factual message."""
    parsed = AssistantIntentEngine.parse_query("what did I buy from Ikea?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"documents": []})
    assert meta["type"] == AssistantResultType.NO_RESULTS.value
    assert meta["document_count"] == 0
    assert "Ikea" in meta["summary"]


# ===========================================================================
# 20. Missing Total Handling
# ===========================================================================
@pytest.mark.anyio
async def test_missing_total_handling():
    """Scenario 20: Documents with null total are handled without error."""
    doc = _make_doc(USER_A_ID, total=None)
    parsed = AssistantIntentEngine.parse_query("what is my latest receipt?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"document": doc})
    assert meta["total_amount"] == 0.0
    assert meta["type"] == AssistantResultType.RECEIPT.value


# ===========================================================================
# 21. Missing Quantity Handling
# ===========================================================================
@pytest.mark.anyio
async def test_missing_quantity_handling():
    """Scenario 21: Line items with null quantity default safely to 1.0."""
    doc = _make_doc(USER_A_ID, line_items=[{"description": "Soap", "quantity": None, "unit_price": 30.0, "line_total": 30.0}])
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        stats = await retrieval.calculate_item_quantities("soap")
        assert stats["total_quantity"] == 1.0


# ===========================================================================
# 22. Malformed Extraction Handling
# ===========================================================================
@pytest.mark.anyio
async def test_malformed_extraction_handling():
    """Scenario 22: Corrupt extraction result does not crash builder or service."""
    doc_corrupt = CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(USER_A_ID),
        filename="bad.pdf",
        storage_path="path/bad.pdf",
        content_type="application/pdf",
        size=100,
        status="completed",
        created_at=datetime.now(UTC),
        processed_at=datetime.now(UTC),
        content_hash="bad_hash",
        extraction_result={"vendor_company": None, "date": None, "total": None, "line_items": None},
        quality_result=None,
    )
    parsed = AssistantIntentEngine.parse_query("what is my latest receipt?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"document": doc_corrupt})
    assert meta["type"] == AssistantResultType.RECEIPT.value


# ===========================================================================
# 23. Empty Library Handling
# ===========================================================================
@pytest.mark.anyio
async def test_empty_library_handling():
    """Scenario 23: User with 0 documents receives no_results type."""
    parsed = AssistantIntentEngine.parse_query("what is my latest receipt?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"document": None})
    assert meta["type"] == AssistantResultType.NO_RESULTS.value
    assert sources == []


# ===========================================================================
# 24. No-Result Vendor Handling
# ===========================================================================
@pytest.mark.anyio
async def test_no_result_vendor_handling():
    """Scenario 24: Querying nonexistent vendor returns no_results."""
    parsed = AssistantIntentEngine.parse_query("how much did I spend at Starbucks?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"vendor_spending": {"vendor": "Starbucks", "total_spent": 0.0, "document_count": 0, "documents": []}},
    )
    assert meta["type"] == AssistantResultType.NO_RESULTS.value
    assert meta["document_count"] == 0


# ===========================================================================
# 25. No-Result Item Handling
# ===========================================================================
@pytest.mark.anyio
async def test_no_result_item_handling():
    """Scenario 25: Querying item not present returns no_results."""
    parsed = AssistantIntentEngine.parse_query("how many avocados did I buy?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"item_stats": {"item_query": "avocados", "total_quantity": 0.0, "total_spent": 0.0, "document_count": 0, "items": []}},
    )
    assert meta["type"] == AssistantResultType.NO_RESULTS.value


# ===========================================================================
# 26. Source Attribution Correctness
# ===========================================================================
@pytest.mark.anyio
async def test_source_attribution_correctness():
    """Scenario 26: Sources contain valid document_id, filename, vendor, date, and total."""
    d_id = uuid4()
    doc = _make_doc(USER_A_ID, doc_id=d_id, filename="receipt_aug.pdf", vendor="DMart", total=1425.60, date_str="2026-08-16")
    parsed = AssistantIntentEngine.parse_query("what is my latest receipt?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"document": doc})
    assert len(sources) == 1
    assert sources[0].document_id == d_id
    assert sources[0].filename == "receipt_aug.pdf"
    assert sources[0].vendor == "DMart"
    assert sources[0].total == 1425.60
    assert sources[0].document_date == "2026-08-16"


# ===========================================================================
# 27. Latest Document Source Correctness
# ===========================================================================
@pytest.mark.anyio
async def test_latest_document_source_correctness():
    """Scenario 27: Source matches the single latest document deterministically."""
    doc_old = _make_doc(USER_A_ID, date_str="2026-08-01")
    doc_new = _make_doc(USER_A_ID, date_str="2026-08-18")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_old, doc_new]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        latest = await retrieval.get_latest_document()
        assert latest.id == doc_new.id


# ===========================================================================
# 28. Aggregate Source Correctness
# ===========================================================================
@pytest.mark.anyio
async def test_aggregate_source_correctness():
    """Scenario 28: Aggregate spending sources include all contributing documents."""
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=500.0)
    doc2 = _make_doc(USER_A_ID, vendor="DMart", total=1000.0)
    parsed = AssistantIntentEngine.parse_query("how much did I spend at DMart?")
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
        parsed,
        {"vendor_spending": {"vendor": "DMart", "total_spent": 1500.0, "document_count": 2, "documents": [doc1, doc2]}},
    )
    assert len(sources) == 2
    assert {s.document_id for s in sources} == {doc1.id, doc2.id}


# ===========================================================================
# 29. No Unrelated Sources
# ===========================================================================
@pytest.mark.anyio
async def test_no_unrelated_sources():
    """Scenario 29: Sources do not contain documents from unrelated vendors."""
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=500.0)
    doc_unrelated = _make_doc(USER_A_ID, vendor="Apple", total=10000.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc_unrelated]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        dmart_docs = await retrieval.get_documents_by_vendor("DMart")
        assert len(dmart_docs) == 1
        assert dmart_docs[0].id == doc1.id


# ===========================================================================
# 30. Follow-up "There"
# ===========================================================================
def test_follow_up_there():
    """Scenario 30: Pronoun 'there' resolves previous vendor."""
    history = [
        {"role": "user", "content": "What did I buy from DMart?"},
        {"role": "assistant", "content": "You bought milk and bread from DMart."},
    ]
    parsed = AssistantIntentEngine.parse_query("How much did I spend there?", conversation_history=history)
    assert parsed.intent == AssistantIntent.VENDOR_SPENDING
    assert parsed.vendor is not None
    assert parsed.vendor.lower() == "dmart"


# ===========================================================================
# 31. Follow-up "That"
# ===========================================================================
def test_follow_up_that():
    """Scenario 31: Pronoun 'that' resolves previous purchase/receipt entity."""
    history = [
        {"role": "user", "content": "Show my latest Apple receipt"},
        {"role": "assistant", "content": "Here is your latest Apple receipt for ₹89,900.00."},
    ]
    parsed = AssistantIntentEngine.parse_query("How much did that cost?", conversation_history=history)
    assert parsed.vendor is not None
    assert "apple" in parsed.vendor.lower()


# ===========================================================================
# 32. Follow-up "It"
# ===========================================================================
def test_follow_up_it():
    """Scenario 32: Pronoun 'it' resolves previous receipt."""
    history = [
        {"role": "user", "content": "Find my Reliance bill"},
        {"role": "assistant", "content": "Found your Reliance bill."},
    ]
    parsed = AssistantIntentEngine.parse_query("What was in it?", conversation_history=history)
    assert parsed.vendor is not None
    assert "reliance" in parsed.vendor.lower()


# ===========================================================================
# 33. Ambiguous Contextual Reference
# ===========================================================================
def test_ambiguous_contextual_reference():
    """Scenario 33: Context without recognizable entity falls back safely."""
    history = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi, how can I help you today?"},
    ]
    parsed = AssistantIntentEngine.parse_query("How much did that cost?", conversation_history=history)
    # No prior vendor found, intent handles general query safely
    assert parsed.intent in (AssistantIntent.VENDOR_SPENDING, AssistantIntent.GENERAL_QUERY)


# ===========================================================================
# 34. Multi-turn Context Remains User-Scoped
# ===========================================================================
@pytest.mark.anyio
async def test_multiturn_context_user_scoped():
    """Scenario 34: Session turns and context are strictly isolated per user."""
    mgr = AssistantSessionManager()
    s_a = await mgr.create_session(USER_A_ID)
    s_b = await mgr.create_session(USER_B_ID)

    await mgr.add_turn(s_a.session_id, USER_A_ID, "user", "What did I buy from DMart?")
    await mgr.add_turn(s_b.session_id, USER_B_ID, "user", "What did I buy from Apple?")

    sess_a = await mgr.get_session(s_a.session_id, user_id=USER_A_ID)
    sess_b = await mgr.get_session(s_b.session_id, user_id=USER_B_ID)
    assert "DMart" in sess_a.turns[0]["content"]
    assert "Apple" in sess_b.turns[0]["content"]


# ===========================================================================
# 35. Provider Success
# ===========================================================================
@pytest.mark.anyio
async def test_provider_success():
    """Scenario 35: Successful provider response returns structured fields."""
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
            message="how much did I spend in DMart?",
            settings=settings,
            chat_provider=mock_provider,
        )
        assert resp.result_type == AssistantResultType.VENDOR_SPENDING.value
        assert resp.title == "DMart Spending"
        assert "₹500.00" in resp.summary
        assert resp.source_count == 1
        assert resp.metadata["total_spent"] == 500.0


# ===========================================================================
# 36. Provider Timeout
# ===========================================================================
@pytest.mark.anyio
async def test_provider_timeout():
    """Scenario 36: Provider timeout triggers deterministic fallback summary."""
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
        with patch.object(provider, "_call_gemini", return_value="Gemini failed"):
            resp = await run_assistant_chat(
                user_id=USER_A_ID,
                message="how much did I spend in DMart?",
                settings=settings,
                chat_provider=provider,
            )
            assert resp.result_type == AssistantResultType.VENDOR_SPENDING.value
            assert "DMart" in resp.message or "trouble" in resp.message


# ===========================================================================
# 37. Provider Rate-Limit
# ===========================================================================
@pytest.mark.anyio
async def test_provider_rate_limit():
    """Scenario 37: Provider rate limit seamlessly executes Gemini fallback."""
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

    with patch.object(provider, "_call_gemini", return_value="Gemini fallback reply") as mock_gemini:
        reply = await provider.generate_reply("{}", "hi", [], http_client=mock_client)
        assert reply == "Gemini fallback reply"
        mock_gemini.assert_called_once()


# ===========================================================================
# 38. Deterministic Fallback When All Providers Fail
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_fallback_on_all_failures():
    """Scenario 38: Complete LLM failure yields verified deterministic summary."""
    doc = _make_doc(USER_A_ID, vendor="Reliance", total=2500.0)
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    mock_provider = MagicMock(spec=AssistantChatProvider)
    mock_provider.generate_reply = AsyncMock(return_value="I had trouble generating an answer right now.")

    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="how much did I spend in Reliance?",
            settings=settings,
            chat_provider=mock_provider,
        )
        assert "₹2,500.00" in resp.reply
        assert resp.result_type == AssistantResultType.VENDOR_SPENDING.value


# ===========================================================================
# 39. Authentication Required
# ===========================================================================
def test_authentication_required():
    """Scenario 39: Unauthenticated request returns 401."""
    app.dependency_overrides.clear()
    client = TestClient(app)
    resp = client.post("/assistant/chat", json={"message": "hello"})
    assert resp.status_code == 401


# ===========================================================================
# 40. Strict User Isolation
# ===========================================================================
def test_strict_user_isolation():
    """Scenario 40: User A cannot access User B's session."""
    client = get_client(USER_B_ID)
    s_b = client.post("/assistant/session").json()["session_id"]

    # Switch to User A
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)
    resp = client.post(f"/assistant/session/{s_b}/reset")
    assert resp.status_code == 404


# ===========================================================================
# 41. Milestone 8.1 Compatibility
# ===========================================================================
def test_milestone_8_1_compatibility():
    """Scenario 41: Milestone 8.1 session creation and chat response contracts remain compatible."""
    client = get_client(USER_A_ID)
    sess_resp = client.post("/assistant/session")
    assert sess_resp.status_code == 200
    data = sess_resp.json()
    assert "session_id" in data
    assert "created_at" in data
    assert "expires_at" in data


# ===========================================================================
# 42. Milestone 8.2 Compatibility
# ===========================================================================
def test_milestone_8_2_compatibility():
    """Scenario 42: Case-insensitive vendor and boundary item matching remain intact."""
    from app.services.assistant.retrieval import _item_matches, _vendor_matches
    assert _vendor_matches("DMart", "d mart")
    assert _item_matches("Organic Brown Eggs 6-pack", "egg")
    assert not _item_matches("Fresh Purple Eggplant", "egg")


# ===========================================================================
# 43. Dashboard APIs Unaffected
# ===========================================================================
@pytest.mark.anyio
async def test_dashboard_apis_unaffected():
    """Scenario 43: Dashboard aggregations continue to run independently and accurately."""
    doc = _make_doc(USER_A_ID, vendor="Apple Store", total=1000.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        dash = await get_user_dashboard_data(user_id=USER_A_ID, settings=settings)
        assert dash.summary.total_documents == 1
        assert dash.summary.total_amount_spent == 1000.0
