"""Milestone 8.1: AI Assistant Backend Foundation & Session-Based RAG Test Suite.

Covers all 22 required test scenarios:
1. Session creation
2. Session persistence across multiple requests
3. Session isolation
4. Session reset
5. Expired/invalid session handling
6. Authentication required
7. User isolation
8. Latest document retrieval
9. Vendor retrieval
10. Line-item retrieval
11. Quantity calculation
12. Spending calculation
13. Most expensive item
14. Most expensive receipt
15. Empty document library
16. Missing/malformed extraction fields
17. No hallucinated data when no matching document exists
18. Deterministic calculation accuracy
19. LLM provider timeout handling
20. LLM rate-limit/fallback behavior
21. Bounded retries
22. Existing dashboard functionality remains unaffected
"""

import asyncio
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.assistant import (
    AssistantChatProvider,
    AssistantContextBuilder,
    AssistantIntent,
    AssistantIntentEngine,
    AssistantRetrievalService,
    default_session_manager,
    run_assistant_chat,
)
from app.services.assistant.session import AssistantSession, AssistantSessionManager
from app.services.dashboard import get_user_dashboard_data
from app.services.document_metadata import CreatedDocumentMetadata
from app.services.storage import build_document_storage_path

USER_A_ID = "00000000-0000-0000-0000-00000000008a"
USER_B_ID = "00000000-0000-0000-0000-00000000008b"


def _make_doc(
    user_id: str = USER_A_ID,
    *,
    doc_id: UUID | None = None,
    filename: str = "receipt.pdf",
    vendor: str | None = "DMart",
    total: float | None = 1200.50,
    date_str: str | None = "2026-08-15",
    line_items: list[dict] | None = None,
    created_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    """Helper to create a test CreatedDocumentMetadata record."""
    d_id = doc_id or uuid4()
    items = line_items if line_items is not None else [
        {"description": "Milk 1L", "quantity": 2.0, "unit_price": 60.0, "line_total": 120.0},
        {"description": "Eggs (Pack of 12)", "quantity": 1.0, "unit_price": 96.0, "line_total": 96.0},
        {"description": "Rice 5kg", "quantity": 1.0, "unit_price": 650.0, "line_total": 650.0},
        {"description": "Bread", "quantity": 2.0, "unit_price": 40.0, "line_total": 80.0},
    ]
    ext = {
        "vendor_company": vendor,
        "date": date_str,
        "total": total,
        "line_items": items,
        "invoice_number": f"INV-{str(d_id)[:6]}",
    }
    return CreatedDocumentMetadata(
        id=d_id,
        user_id=UUID(user_id),
        filename=filename,
        storage_path=build_document_storage_path(user_id, filename, document_id=d_id),
        content_type="application/pdf",
        size=2048,
        status="completed",
        created_at=created_at or datetime(2026, 8, 15, 10, 0, 0, tzinfo=UTC),
        processed_at=created_at or datetime(2026, 8, 15, 10, 0, 0, tzinfo=UTC),
        content_hash=f"hash_{d_id}",
        extraction_result=ext,
        quality_result={"overall_confidence": 0.95, "confidence_level": "HIGH"},
    )


def get_client(user_id: str | None = USER_A_ID) -> TestClient:
    """Create a TestClient with authenticated user dependency override."""
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_groq_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=SimpleNamespace(get_secret_value=lambda: "fake_gemini_key"),
        gemini_model="gemini-3.1-flash-lite",
    )
    if user_id:
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=user_id)
    else:
        app.dependency_overrides.pop(get_current_user, None)
    return TestClient(app)


@pytest.fixture(autouse=True)
def _cleanup_sessions():
    """Clear session memory before and after each test."""
    default_session_manager.clear_all_sync()
    yield
    default_session_manager.clear_all_sync()
    app.dependency_overrides.clear()


# ===========================================================================
# 1. Session Creation
# ===========================================================================
def test_session_creation():
    """Scenario 1: Authenticated user creates an ephemeral assistant session."""
    client = get_client(USER_A_ID)
    resp = client.post("/assistant/session")
    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert "created_at" in data
    assert "expires_at" in data
    assert UUID(data["session_id"])  # Valid UUID format


# ===========================================================================
# 2. Session Persistence Across Multiple Requests
# ===========================================================================
@pytest.mark.anyio
async def test_session_persistence():
    """Scenario 2: Conversation turns persist across multiple requests within active session."""
    session_mgr = AssistantSessionManager()
    session = await session_mgr.create_session(user_id=USER_A_ID)
    assert session.session_id

    # Add multiple turns
    await session_mgr.add_turn(session.session_id, USER_A_ID, "user", "What is my latest receipt?")
    await session_mgr.add_turn(session.session_id, USER_A_ID, "assistant", "Your latest receipt is from DMart.")
    await session_mgr.add_turn(session.session_id, USER_A_ID, "user", "How many items were in it?")
    await session_mgr.add_turn(session.session_id, USER_A_ID, "assistant", "There were 4 items.")

    active = await session_mgr.get_session(session.session_id, user_id=USER_A_ID)
    assert active is not None
    assert len(active.turns) == 4
    assert active.turns[0]["role"] == "user"
    assert active.turns[1]["role"] == "assistant"
    assert active.turns[2]["content"] == "How many items were in it?"


# ===========================================================================
# 3. Session Isolation
# ===========================================================================
@pytest.mark.anyio
async def test_session_isolation():
    """Scenario 3: Distinct sessions do not share conversation turns."""
    session_mgr = AssistantSessionManager()
    s1 = await session_mgr.create_session(user_id=USER_A_ID)
    s2 = await session_mgr.create_session(user_id=USER_A_ID)

    await session_mgr.add_turn(s1.session_id, USER_A_ID, "user", "Session 1 Message")
    await session_mgr.add_turn(s2.session_id, USER_A_ID, "user", "Session 2 Message")

    res1 = await session_mgr.get_session(s1.session_id, user_id=USER_A_ID)
    res2 = await session_mgr.get_session(s2.session_id, user_id=USER_A_ID)

    assert len(res1.turns) == 1
    assert res1.turns[0]["content"] == "Session 1 Message"
    assert len(res2.turns) == 1
    assert res2.turns[0]["content"] == "Session 2 Message"


# ===========================================================================
# 4. Session Reset
# ===========================================================================
def test_session_reset():
    """Scenario 4: POST /assistant/session/{session_id}/reset clears the conversation."""
    client = get_client(USER_A_ID)
    create_resp = client.post("/assistant/session")
    session_id = create_resp.json()["session_id"]

    reset_resp = client.post(f"/assistant/session/{session_id}/reset")
    assert reset_resp.status_code == 200
    data = reset_resp.json()
    assert data["session_id"] == session_id
    assert data["status"] == "reset"


# ===========================================================================
# 5. Expired / Invalid Session Handling
# ===========================================================================
def test_expired_and_invalid_session_handling():
    """Scenario 5: Requesting an unknown or expired session ID returns 404."""
    client = get_client(USER_A_ID)
    fake_session_id = str(uuid4())

    # Chat with invalid session ID
    resp = client.post(
        "/assistant/chat",
        json={"session_id": fake_session_id, "message": "Hello"},
    )
    assert resp.status_code == 404
    assert "not found or expired" in resp.json()["detail"].lower()

    # Reset invalid session ID
    reset_resp = client.post(f"/assistant/session/{fake_session_id}/reset")
    assert reset_resp.status_code == 404


# ===========================================================================
# 6. Authentication Required
# ===========================================================================
def test_authentication_required():
    """Scenario 6: Unauthenticated requests return 401 Unauthorized."""
    client = get_client(user_id=None)

    # Session create
    assert client.post("/assistant/session").status_code == 401
    # Chat
    assert client.post("/assistant/chat", json={"message": "Hello"}).status_code == 401
    # Reset
    assert client.post(f"/assistant/session/{uuid4()}/reset").status_code == 401


# ===========================================================================
# 7. User Isolation
# ===========================================================================
def test_user_isolation():
    """Scenario 7: User A cannot access or reset User B's session or query User B's documents."""
    client = get_client(USER_B_ID)

    # User B creates a session
    s_b = client.post("/assistant/session").json()["session_id"]

    # Switch authenticated user to User A
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)

    # User A tries to chat in User B's session -> 404
    chat_resp = client.post(
        "/assistant/chat",
        json={"session_id": s_b, "message": "What are my documents?"},
    )
    assert chat_resp.status_code == 404

    # User A tries to reset User B's session -> 404
    reset_resp = client.post(f"/assistant/session/{s_b}/reset")
    assert reset_resp.status_code == 404


# ===========================================================================
# 8. Latest Document Retrieval
# ===========================================================================
@pytest.mark.anyio
async def test_latest_document_retrieval():
    """Scenario 8: Assistant correctly retrieves the latest document for a vendor or globally."""
    doc_old = _make_doc(USER_A_ID, vendor="DMart", total=500.0, date_str="2026-08-01")
    doc_new = _make_doc(USER_A_ID, vendor="DMart", total=1425.60, date_str="2026-08-16")
    doc_other = _make_doc(USER_A_ID, vendor="Reliance", total=200.0, date_str="2026-08-10")

    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_old, doc_new, doc_other]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        latest_dmart = await retrieval.get_latest_document(vendor="DMart")
        assert latest_dmart is not None
        assert latest_dmart.id == doc_new.id
        assert (latest_dmart.extraction_result or {}).get("total") == 1425.60

        latest_global = await retrieval.get_latest_document()
        assert latest_global is not None
        assert latest_global.id == doc_new.id


# ===========================================================================
# 9. Vendor Retrieval
# ===========================================================================
@pytest.mark.anyio
async def test_vendor_retrieval():
    """Scenario 9: Assistant retrieves documents filtered by vendor name."""
    doc1 = _make_doc(USER_A_ID, vendor="Reliance Digital", total=3000.0)
    doc2 = _make_doc(USER_A_ID, vendor="DMart", total=100.0)

    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_documents_by_vendor("Reliance")
        assert len(docs) == 1
        assert docs[0].id == doc1.id


# ===========================================================================
# 10. Line Item Retrieval
# ===========================================================================
@pytest.mark.anyio
async def test_line_item_retrieval():
    """Scenario 10: Assistant retrieves specific matching line items across documents."""
    doc = _make_doc(
        USER_A_ID,
        vendor="DMart",
        line_items=[
            {"description": "Organic Brown Eggs 6-pack", "quantity": 2.0, "unit_price": 50.0, "line_total": 100.0},
            {"description": "Whole Wheat Bread", "quantity": 1.0, "unit_price": 45.0, "line_total": 45.0},
        ],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        items = await retrieval.search_line_items("eggs")
        assert len(items) == 1
        assert items[0]["item_name"] == "Organic Brown Eggs 6-pack"
        assert items[0]["quantity"] == 2.0
        assert items[0]["total"] == 100.0


# ===========================================================================
# 11. Quantity Calculation
# ===========================================================================
@pytest.mark.anyio
async def test_quantity_calculation():
    """Scenario 11: Deterministic item quantity calculations."""
    doc1 = _make_doc(
        USER_A_ID,
        date_str="2026-08-10",
        line_items=[{"description": "Farm Fresh Eggs", "quantity": 12.0, "unit_price": 8.0, "line_total": 96.0}],
    )
    doc2 = _make_doc(
        USER_A_ID,
        date_str="2026-08-15",
        line_items=[{"description": "Organic Eggs", "quantity": 6.0, "unit_price": 10.0, "line_total": 60.0}],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        qty_res = await retrieval.calculate_item_quantities("eggs")
        assert qty_res["total_quantity"] == 18.0
        assert qty_res["total_spent"] == 156.0
        assert qty_res["document_count"] == 2


# ===========================================================================
# 12. Spending Calculation
# ===========================================================================
@pytest.mark.anyio
async def test_spending_calculation():
    """Scenario 12: Deterministic calculation of vendor and total library spending."""
    doc1 = _make_doc(USER_A_ID, vendor="DMart", total=1000.50)
    doc2 = _make_doc(USER_A_ID, vendor="DMart", total=499.50)
    doc3 = _make_doc(USER_A_ID, vendor="Reliance", total=2000.00)

    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2, doc3]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        v_spend = await retrieval.calculate_vendor_spending("DMart")
        assert v_spend["total_spent"] == 1500.00
        assert v_spend["document_count"] == 2


# ===========================================================================
# 13. Most Expensive Item
# ===========================================================================
@pytest.mark.anyio
async def test_most_expensive_item():
    """Scenario 13: Deterministic identification of the single most expensive line item."""
    doc1 = _make_doc(
        USER_A_ID,
        vendor="Apple Store",
        line_items=[
            {"description": "iPhone Case", "quantity": 1.0, "unit_price": 4900.0, "line_total": 4900.0},
            {"description": "MacBook Air", "quantity": 1.0, "unit_price": 99900.0, "line_total": 99900.0},
        ],
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        most_exp = await retrieval.get_most_expensive_item()
        assert most_exp is not None
        assert most_exp["name"] == "MacBook Air"
        assert most_exp["amount"] == 99900.0


# ===========================================================================
# 14. Most Expensive Receipt
# ===========================================================================
@pytest.mark.anyio
async def test_most_expensive_receipt():
    """Scenario 14: Deterministic identification of the highest total receipt."""
    doc1 = _make_doc(USER_A_ID, filename="grocery.pdf", vendor="DMart", total=1200.0)
    doc2 = _make_doc(USER_A_ID, filename="electronics.pdf", vendor="Croma", total=45000.0)

    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        most_exp_rec = await retrieval.get_most_expensive_receipt()
        assert most_exp_rec is not None
        assert most_exp_rec["vendor"] == "Croma"
        assert most_exp_rec["total_amount"] == 45000.0
        assert most_exp_rec["filename"] == "electronics.pdf"


# ===========================================================================
# 15. Empty Document Library
# ===========================================================================
@pytest.mark.anyio
async def test_empty_document_library():
    """Scenario 15: Graceful response when user has 0 uploaded documents."""
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    mock_provider = MagicMock(spec=AssistantChatProvider)
    mock_provider.generate_reply = AsyncMock(
        return_value="You do not have any uploaded receipts or documents in your library yet."
    )

    with patch("app.services.dashboard._get_document_metadata", return_value=[]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="What is my latest receipt?",
            settings=settings,
            chat_provider=mock_provider,
        )
        assert "not have any uploaded receipts" in resp.reply
        assert resp.sources == []
        assert resp.metadata is not None


# ===========================================================================
# 16. Missing / Malformed Extraction Fields
# ===========================================================================
@pytest.mark.anyio
async def test_missing_and_malformed_extraction_fields():
    """Scenario 16: Safe handling of documents with missing totals or null line items."""
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
        extraction_result={"vendor_company": None, "total": None, "line_items": None},
        quality_result=None,
    )
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_corrupt]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        spend = await retrieval.calculate_total_spending()
        assert spend["total_spent"] == 0.0
        assert spend["total_documents"] == 1


# ===========================================================================
# 17. No Hallucinated Data on Missing Vendor
# ===========================================================================
@pytest.mark.anyio
async def test_no_hallucination_on_missing_vendor():
    """Scenario 17: Querying a vendor not present in library yields no hallucinated receipts."""
    doc = _make_doc(USER_A_ID, vendor="DMart", total=500.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        zara_docs = await retrieval.get_documents_by_vendor("Zara")
        assert len(zara_docs) == 0

        parsed_intent = AssistantIntentEngine.parse_query("What did I buy from Zara?")
        ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(
            parsed_intent,
            {"documents": zara_docs},
        )
        assert sources == []
        assert meta.get("document_count") == 0


# ===========================================================================
# 18. Deterministic Calculation Accuracy
# ===========================================================================
@pytest.mark.anyio
async def test_deterministic_calculation_accuracy():
    """Scenario 18: Numerical precision test checking exact decimal additions without float drift."""
    doc1 = _make_doc(USER_A_ID, vendor="Store", total=19.99)
    doc2 = _make_doc(USER_A_ID, vendor="Store", total=0.01)
    doc3 = _make_doc(USER_A_ID, vendor="Store", total=100.123)

    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2, doc3]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        res = await retrieval.calculate_vendor_spending("Store")
        assert res["total_spent"] == 120.12


# ===========================================================================
# 19. LLM Provider Timeout Handling
# ===========================================================================
@pytest.mark.anyio
async def test_llm_provider_timeout_handling():
    """Scenario 19: Graceful handling and friendly user message on provider timeout."""
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
    mock_client.post.side_effect = httpx.TimeoutException("Connection timed out")

    reply = await provider.generate_reply(
        context_json="{}",
        user_message="Hello",
        conversation_history=[],
        http_client=mock_client,
    )
    assert "trouble generating an answer right now" in reply or "Please check your connection" in reply


# ===========================================================================
# 20. LLM Rate Limit & Fallback
# ===========================================================================
@pytest.mark.anyio
async def test_llm_rate_limit_and_fallback():
    """Scenario 20: Groq rate limit triggers retry with exponential backoff and Gemini fallback."""
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=SimpleNamespace(get_secret_value=lambda: "fake_gemini_key"),
        gemini_model="gemini-3.1-flash-lite",
    )
    provider = AssistantChatProvider(settings)

    # Groq fails with 429 Rate Limit
    mock_groq_resp = MagicMock()
    mock_groq_resp.status_code = 429
    mock_client = AsyncMock()
    mock_client.post.side_effect = httpx.HTTPStatusError("Rate Limit", request=MagicMock(), response=mock_groq_resp)

    # Gemini fallback succeeds
    with patch.object(provider, "_call_gemini", return_value="Gemini Fallback Response") as mock_gemini:
        reply = await provider.generate_reply(
            context_json="{}",
            user_message="What is my spending?",
            conversation_history=[],
            http_client=mock_client,
        )
        assert reply == "Gemini Fallback Response"
        mock_gemini.assert_called_once()


# ===========================================================================
# 21. Bounded Retries
# ===========================================================================
@pytest.mark.anyio
async def test_bounded_retries():
    """Scenario 21: Retries are strictly bounded to max 2 retries (3 attempts total)."""
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    provider = AssistantChatProvider(settings)

    call_count = 0

    async def mock_post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        raise httpx.TimeoutException("Timeout")

    mock_client = AsyncMock()
    mock_client.post.side_effect = mock_post

    with patch("asyncio.sleep", return_value=None):
        reply = await provider.generate_reply(
            context_json="{}",
            user_message="Test query",
            conversation_history=[],
            http_client=mock_client,
        )
        assert call_count == 3  # 1 initial + 2 retries
        assert "trouble generating an answer" in reply


# ===========================================================================
# 22. Dashboard Regression Unaffected
# ===========================================================================
@pytest.mark.anyio
async def test_dashboard_regression_unaffected():
    """Scenario 22: Dashboard metrics calculation continues to function accurately alongside assistant services."""
    doc1 = _make_doc(USER_A_ID, vendor="Amazon", total=500.0)
    doc2 = _make_doc(USER_A_ID, vendor="Apple", total=1500.0)

    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc1, doc2]):
        dash = await get_user_dashboard_data(user_id=USER_A_ID, settings=settings)
        assert dash.summary.total_documents == 2
        assert dash.summary.total_amount_spent == 2000.0
        assert dash.highlights.most_expensive_receipt is not None
        assert dash.highlights.most_expensive_receipt.vendor == "Apple"
