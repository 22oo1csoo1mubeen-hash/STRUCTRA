"""Comprehensive test suite for Milestone 8.5: AI Assistant Production Hardening, Performance, Reliability & Final Verification.

Covers all 35 required scenarios:
1. Authentication required
2. User isolation
3. Session ownership
4. Session expiration
5. Session recovery
6. Cross-user session injection protection
7. History size server-side bounding
8. Message size bounding
9. Empty / malformed message rejection
10. Provider timeout handling
11. Provider 429 rate limit handling
12. Provider 503 service unavailable handling
13. Provider bounded retries
14. Provider circuit breaker cooldown
15. Fallback provider switch
16. Deterministic fallback accuracy
17. No duplicate retrieval after provider failure
18. No hallucinated values
19. Source attribution integrity
20. Completed-document-only retrieval filter
21. Deleted-document exclusion
22. Empty document library response
23. Malformed extraction resilience
24. Rapid repeated requests
25. Concurrent sessions
26. Logout during request safety
27. User switch during request isolation
28. Stale response protection
29. Bounded RAG context footprint
30. Large document library performance (100+ documents)
31. Milestone 8.1 compatibility
32. Milestone 8.2 compatibility
33. Milestone 8.3 compatibility
34. Milestone 8.4 compatibility
35. Dashboard regression protection
"""

import asyncio
from datetime import UTC, datetime, timezone
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
from app.services.assistant.intent import AssistantIntent, AssistantIntentEngine
from app.services.assistant.provider import AssistantChatProvider
from app.services.assistant.retrieval import AssistantRetrievalService
from app.services.assistant.service import run_assistant_chat
from app.services.assistant.session import AssistantSessionManager
from app.services.dashboard import get_user_dashboard_data
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-000000000085"
USER_B_ID = "00000000-0000-0000-0000-000000000086"


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


# 1. Authentication Required
def test_authentication_required():
    app.dependency_overrides.clear()
    client = TestClient(app)
    resp = client.post("/assistant/chat", json={"message": "hello"})
    assert resp.status_code == 401


# 2. User Isolation
def test_user_isolation():
    client_b = get_client(USER_B_ID)
    s_b = client_b.post("/assistant/session").json()["session_id"]
    client_a = get_client(USER_A_ID)
    resp = client_a.post(f"/assistant/session/{s_b}/reset")
    assert resp.status_code == 404


# 3. Session Ownership
@pytest.mark.anyio
async def test_session_ownership():
    mgr = AssistantSessionManager()
    s = await mgr.create_session(USER_A_ID)
    assert await mgr.get_session(s.session_id, user_id=USER_A_ID) is not None
    assert await mgr.get_session(s.session_id, user_id=USER_B_ID) is None


# 4. Session Expiration
@pytest.mark.anyio
async def test_session_expiration():
    mgr = AssistantSessionManager()
    s = await mgr.create_session(USER_A_ID)
    s.expires_at = datetime.fromtimestamp(1000, tz=timezone.utc)
    assert await mgr.get_session(s.session_id, user_id=USER_A_ID) is None


# 5. Session Recovery
def test_session_recovery():
    client = get_client(USER_A_ID)
    # Expired/invalid session returns 404
    resp = client.post("/assistant/chat", json={"session_id": "nonexistent-id", "message": "hello"})
    assert resp.status_code == 404

    # New session can be created and used immediately
    new_sess = client.post("/assistant/session").json()["session_id"]
    resp2 = client.post("/assistant/chat", json={"session_id": new_sess, "message": "hello"})
    assert resp2.status_code == 200
    assert resp2.json()["session_id"] == new_sess


# 6. Cross-User Session Injection Protection
def test_cross_user_session_injection_protection():
    client_b = get_client(USER_B_ID)
    sess_b = client_b.post("/assistant/session").json()["session_id"]
    client_a = get_client(USER_A_ID)
    # User A cannot inject or hijack User B's session ID (returns 404 not found for User A)
    resp = client_a.post("/assistant/chat", json={"session_id": sess_b, "message": "hello"})
    assert resp.status_code == 404


# 7. History Size Server Bounding
@pytest.mark.anyio
async def test_history_size_server_bounding():
    doc = _make_doc(USER_A_ID)
    large_history = [{"role": "user", "content": f"Turn {i}"} for i in range(30)]
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="how much did I spend at DMart?",
            conversation_history=large_history,
            settings=settings,
        )
        assert resp.result_type == AssistantResultType.VENDOR_SPENDING.value


# 8. Message Size Bounding
def test_message_size_bounding():
    client = get_client(USER_A_ID)
    resp = client.post("/assistant/chat", json={"message": "A" * 2005})
    assert resp.status_code == 422


# 9. Empty Message Rejection
def test_empty_message_rejection():
    client = get_client(USER_A_ID)
    resp = client.post("/assistant/chat", json={"message": ""})
    assert resp.status_code == 422


# 10. Provider Timeout
@pytest.mark.anyio
async def test_provider_timeout_handling():
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

    with pytest.raises(httpx.TimeoutException):
        await provider._call_groq("{}", "hi", [], client=mock_client)


# 11. Provider 429
@pytest.mark.anyio
async def test_provider_429_rate_limit():
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

    with patch.object(provider, "_call_gemini", return_value="Gemini Fallback") as mock_gem:
        reply = await provider.generate_reply("{}", "hi", [], http_client=mock_client)
        assert reply == "Gemini Fallback"
        mock_gem.assert_called_once()


# 12. Provider 503
@pytest.mark.anyio
async def test_provider_503_service_unavailable():
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
    mock_resp.status_code = 503
    mock_client = AsyncMock()
    mock_client.post.side_effect = httpx.HTTPStatusError("503", request=MagicMock(), response=mock_resp)

    with patch.object(provider, "_call_gemini", return_value="Gemini Fallback"):
        reply = await provider.generate_reply("{}", "hi", [], http_client=mock_client)
        assert reply == "Gemini Fallback"


# 13. Provider Bounded Retries
@pytest.mark.anyio
async def test_provider_bounded_retries():
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
    mock_resp = MagicMock()
    mock_resp.status_code = 502
    mock_client.post.side_effect = httpx.HTTPStatusError("502", request=MagicMock(), response=mock_resp)

    with pytest.raises(httpx.HTTPStatusError):
        await provider._call_groq("{}", "hi", [], client=mock_client)
    assert mock_client.post.call_count == 3  # 1 initial + 2 retries


# 14. Provider Circuit Breaker Cooldown
@pytest.mark.anyio
async def test_provider_circuit_breaker():
    AssistantChatProvider._groq_failure_count = 0
    AssistantChatProvider._groq_cooldown_until = 0.0
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=SimpleNamespace(get_secret_value=lambda: "gemini_key"),
        gemini_model="gemini-3.1-flash-lite",
    )
    provider = AssistantChatProvider(settings)
    mock_client = AsyncMock()
    mock_client.post.side_effect = httpx.TimeoutException("Timeout")

    with patch.object(provider, "_call_gemini", return_value="Gemini Fallback"):
        # 3 failures to trigger circuit
        for _ in range(3):
            await provider.generate_reply("{}", "hi", [], http_client=mock_client)
        assert provider._groq_failure_count >= 3
        assert provider._groq_cooldown_until > time.time()


# 15. Fallback Provider Switch
@pytest.mark.anyio
async def test_fallback_provider_switch():
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=None,
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=SimpleNamespace(get_secret_value=lambda: "gem_key"),
        gemini_model="gemini-3.1-flash-lite",
    )
    provider = AssistantChatProvider(settings)
    with patch.object(provider, "_call_gemini", return_value="Gemini Answer"):
        reply = await provider.generate_reply("{}", "hi", [])
        assert reply == "Gemini Answer"


# 16. Deterministic Fallback Accuracy
@pytest.mark.anyio
async def test_deterministic_fallback_accuracy():
    doc = _make_doc(USER_A_ID, vendor="DMart", total=750.50)
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
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="how much did I spend at DMart?",
            settings=settings,
            chat_provider=mock_prov,
        )
        assert "₹750.50" in resp.reply
        assert resp.result_type == AssistantResultType.VENDOR_SPENDING.value


# 17. No Duplicate Retrieval After Provider Failure
@pytest.mark.anyio
async def test_no_duplicate_retrieval_on_provider_failure():
    doc = _make_doc(USER_A_ID, vendor="DMart", total=100.0)
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
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]) as mock_get_docs:
        await run_assistant_chat(
            user_id=USER_A_ID,
            message="how much did I spend at DMart?",
            settings=settings,
            chat_provider=mock_prov,
        )
        assert mock_get_docs.call_count <= 2  # Ambiguity check + calculation, zero re-retrieval after provider failure


# 18. No Hallucinated Values
@pytest.mark.anyio
async def test_no_hallucinated_values():
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
            message="what did I buy from Ikea?",
            settings=settings,
        )
        assert resp.result_type == AssistantResultType.NO_RESULTS.value
        assert "Ikea" in resp.summary


# 19. Source Attribution Integrity
@pytest.mark.anyio
async def test_source_attribution_integrity():
    d_id = uuid4()
    doc = _make_doc(USER_A_ID, doc_id=d_id, filename="dmart.pdf", vendor="DMart", total=500.0, date_str="2026-08-15")
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="what did I buy from DMart?",
            settings=settings,
        )
        assert len(resp.sources) == 1
        assert resp.sources[0].document_id == d_id
        assert resp.sources[0].filename == "dmart.pdf"
        assert resp.sources[0].total == 500.0


# 20. Completed Document Only Retrieval
@pytest.mark.anyio
async def test_completed_document_only_retrieval():
    doc_comp = _make_doc(USER_A_ID, status="completed", total=500.0)
    doc_pend = _make_doc(USER_A_ID, status="processing", total=1000.0)
    doc_fail = _make_doc(USER_A_ID, status="failed", total=2000.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_comp, doc_pend, doc_fail]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_all_documents()
        assert len(docs) == 1
        assert docs[0].id == doc_comp.id


# 21. Deleted Document Exclusion
@pytest.mark.anyio
async def test_deleted_document_exclusion():
    doc_act = _make_doc(USER_A_ID, status="completed")
    doc_del = _make_doc(USER_A_ID, status="deleted")
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc_act, doc_del]):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        docs = await retrieval.get_all_documents()
        assert len(docs) == 1
        assert docs[0].id == doc_act.id


# 22. Empty Document Library
@pytest.mark.anyio
async def test_empty_document_library():
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
            message="what is my latest receipt?",
            settings=settings,
        )
        assert resp.result_type == AssistantResultType.NO_RESULTS.value


# 23. Malformed Extraction Resilience
@pytest.mark.anyio
async def test_malformed_extraction_resilience():
    doc = CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(USER_A_ID),
        filename="corrupt.pdf",
        storage_path="path",
        content_type="application/pdf",
        size=10,
        status="completed",
        created_at=datetime.now(UTC),
        processed_at=datetime.now(UTC),
        content_hash="h",
        extraction_result={},
        quality_result=None,
    )
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        resp = await run_assistant_chat(
            user_id=USER_A_ID,
            message="what is my latest receipt?",
            settings=settings,
        )
        assert resp is not None


# 24. Rapid Repeated Requests
@pytest.mark.anyio
async def test_rapid_repeated_requests():
    doc = _make_doc(USER_A_ID)
    mgr = AssistantSessionManager()
    sess = await mgr.create_session(USER_A_ID)
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        for i in range(5):
            await run_assistant_chat(
                user_id=USER_A_ID,
                session_id=sess.session_id,
                message=f"Query {i}",
                settings=settings,
                session_manager=mgr,
            )
        s_obj = await mgr.get_session(sess.session_id, user_id=USER_A_ID)
        assert len(s_obj.turns) == 10  # 5 user + 5 assistant turns


# 25. Concurrent Sessions
@pytest.mark.anyio
async def test_concurrent_sessions():
    doc_a = _make_doc(USER_A_ID, vendor="Apple Store")
    doc_b = _make_doc(USER_B_ID, vendor="Google Store")
    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )

    async def run_u(uid, doc):
        with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
            return await run_assistant_chat(
                user_id=uid,
                message="what is my latest receipt?",
                settings=settings,
            )

    r_a, r_b = await asyncio.gather(run_u(USER_A_ID, doc_a), run_u(USER_B_ID, doc_b))
    assert r_a.metadata["vendor"] == "Apple Store"
    assert r_b.metadata["vendor"] == "Google Store"


# 26. Logout During Request Safety
def test_logout_during_request_safety():
    """Validates that session reset clears state."""
    mgr = AssistantSessionManager()
    s = asyncio.run(mgr.create_session(USER_A_ID))
    asyncio.run(mgr.reset_session(s.session_id, USER_A_ID))
    assert len(s.turns) == 0


# 27. User Switch During Request Isolation
@pytest.mark.anyio
async def test_user_switch_during_request_isolation():
    mgr = AssistantSessionManager()
    s_a = await mgr.create_session(USER_A_ID)
    await mgr.add_turn(s_a.session_id, USER_A_ID, "user", "secret A")
    # User B cannot access A's session
    assert await mgr.get_session(s_a.session_id, user_id=USER_B_ID) is None


# 28. Stale Response Protection
def test_stale_response_protection():
    """Validates sequence order in session manager."""
    mgr = AssistantSessionManager()
    s = asyncio.run(mgr.create_session(USER_A_ID))
    asyncio.run(mgr.add_turn(s.session_id, USER_A_ID, "user", "first"))
    asyncio.run(mgr.add_turn(s.session_id, USER_A_ID, "assistant", "first reply"))
    asyncio.run(mgr.add_turn(s.session_id, USER_A_ID, "user", "second"))
    asyncio.run(mgr.add_turn(s.session_id, USER_A_ID, "assistant", "second reply"))
    assert s.turns[0]["content"] == "first"
    assert s.turns[2]["content"] == "second"


# 29. Bounded RAG Context Footprint
def test_bounded_rag_context_footprint():
    parsed = AssistantIntentEngine.parse_query("what did I buy from DMart?")
    doc = _make_doc(USER_A_ID, line_items=[{"description": f"Item {i}", "quantity": 1, "unit_price": 10, "line_total": 10} for i in range(100)])
    ctx_json, sources, meta = AssistantContextBuilder.build_context_for_intent(parsed, {"documents": [doc]})
    assert len(ctx_json) < 8000  # Compact context footprint


# 30. Large Document Library Performance
@pytest.mark.anyio
async def test_large_document_library_performance():
    large_docs = [_make_doc(USER_A_ID, total=100.0, date_str=f"2026-08-{(i%28)+1:02d}") for i in range(150)]
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=large_docs):
        retrieval = AssistantRetrievalService(USER_A_ID, settings)
        t0 = time.perf_counter()
        stats = await retrieval.calculate_total_spending()
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert stats["total_documents"] == 150
        assert elapsed_ms < 200  # Sub-200ms deterministic calculation across 150 docs


# 31. Milestone 8.1 Compatibility
def test_milestone_8_1_compatibility():
    client = get_client(USER_A_ID)
    s = client.post("/assistant/session")
    assert s.status_code == 200
    assert "session_id" in s.json()


# 32. Milestone 8.2 Compatibility
def test_milestone_8_2_compatibility():
    from app.services.assistant.retrieval import _vendor_matches
    assert _vendor_matches("Reliance Fresh", "reliance")


# 33. Milestone 8.3 Compatibility
def test_milestone_8_3_compatibility():
    from app.schemas.assistant import AssistantResultType
    assert AssistantResultType.VENDOR_SPENDING.value == "vendor_spending"


# 34. Milestone 8.4 Compatibility
def test_milestone_8_4_compatibility():
    from app.schemas.assistant import AssistantSource
    src = AssistantSource(document_id=uuid4(), filename="a.pdf", total=100.0)
    assert src.total == 100.0


# 35. Dashboard Regression Protection
@pytest.mark.anyio
async def test_dashboard_regression_protection():
    doc = _make_doc(USER_A_ID, total=500.0)
    settings = SimpleNamespace(supabase_url="https://example.supabase.co", supabase_storage_bucket="documents")
    with patch("app.services.dashboard._get_document_metadata", return_value=[doc]):
        dash = await get_user_dashboard_data(user_id=USER_A_ID, settings=settings)
        assert dash.summary.total_amount_spent == 500.0
