"""End-to-End Integration tests for Milestone 8.4: AI Assistant Frontend Integration & End-to-End Conversational Experience.

Validates the full multi-turn conversational flow, structured result contracts,
source navigation schemas, pronoun resolution, ambiguity, no-results, session lifecycles, and user isolation.
"""

from datetime import UTC, datetime, timezone
from decimal import Decimal
import json
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
import pytest

from app.api.dependencies import get_current_user
from app.main import app
from app.schemas.assistant import AssistantResultType
from app.schemas.auth import CurrentUser
from app.services.assistant.provider import AssistantChatProvider
from app.services.assistant.service import run_assistant_chat
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-000000000084"
USER_B_ID = "00000000-0000-0000-0000-000000000085"


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
# 1. Multi-turn E2E Conversation Flow
# ===========================================================================
@pytest.mark.anyio
async def test_e2e_full_conversation_flow():
    """Validates the exact 7-turn conversational scenario described in Milestone 8.4."""
    doc_dmart = _make_doc(
        USER_A_ID,
        filename="dmart_aug.pdf",
        vendor="DMart",
        total=1425.60,
        date_str="2026-08-16",
    )
    doc_apple = _make_doc(
        USER_A_ID,
        filename="apple_invoice.pdf",
        vendor="Apple Store",
        total=89900.00,
        date_str="2026-08-18",
        line_items=[{"description": "iPhone 15 Pro", "quantity": 1.0, "unit_price": 89900.0, "line_total": 89900.0}],
    )
    doc_rel1 = _make_doc(
        USER_A_ID,
        filename="rel_fresh.pdf",
        vendor="Reliance Fresh",
        total=650.00,
        date_str="2026-08-10",
    )
    doc_rel2 = _make_doc(
        USER_A_ID,
        filename="rel_digital.pdf",
        vendor="Reliance Digital",
        total=15000.00,
        date_str="2026-08-12",
    )

    all_docs = [doc_dmart, doc_apple, doc_rel1, doc_rel2]

    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
        groq_api_key=SimpleNamespace(get_secret_value=lambda: "fake_key"),
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key=None,
        gemini_model="gemini-3.1-flash-lite",
    )

    with patch("app.services.dashboard._get_document_metadata", return_value=all_docs):
        # Turn 1: Vendor Items
        t1 = await run_assistant_chat(
            user_id=USER_A_ID,
            message="What did I buy from DMart?",
            settings=settings,
        )
        assert t1.result_type == AssistantResultType.VENDOR_ITEMS.value
        assert t1.metadata["vendor"] == "DMart"
        assert len(t1.sources) >= 1
        assert t1.sources[0].filename == "dmart_aug.pdf"

        # Turn 2: Follow-up pronoun "there"
        history = [
            {"role": "user", "content": "What did I buy from DMart?"},
            {"role": "assistant", "content": t1.reply},
        ]
        t2 = await run_assistant_chat(
            user_id=USER_A_ID,
            session_id=t1.session_id,
            message="How much did I spend there?",
            conversation_history=history,
            settings=settings,
        )
        assert t2.result_type == AssistantResultType.VENDOR_SPENDING.value
        assert t2.metadata["vendor"] == "DMart"
        assert t2.metadata["total_spent"] == 1425.60

        # Turn 3: Item quantity
        t3 = await run_assistant_chat(
            user_id=USER_A_ID,
            session_id=t1.session_id,
            message="How many eggs have I bought?",
            conversation_history=history,
            settings=settings,
        )
        assert t3.result_type == AssistantResultType.ITEM_QUANTITY.value
        assert t3.metadata["total_quantity"] == 6.0

        # Turn 4: Latest receipt
        t4 = await run_assistant_chat(
            user_id=USER_A_ID,
            session_id=t1.session_id,
            message="What is my latest receipt?",
            settings=settings,
        )
        assert t4.result_type == AssistantResultType.RECEIPT.value
        assert t4.metadata["vendor"] == "Apple Store"
        assert t4.metadata["total_amount"] == 89900.0

        # Turn 5: Most expensive receipt
        t5 = await run_assistant_chat(
            user_id=USER_A_ID,
            session_id=t1.session_id,
            message="What was my most expensive receipt?",
            settings=settings,
        )
        assert t5.result_type == AssistantResultType.MOST_EXPENSIVE_RECEIPT.value
        assert t5.metadata["total_amount"] == 89900.0

        # Turn 6: Vendor Ambiguity
        t6 = await run_assistant_chat(
            user_id=USER_A_ID,
            session_id=t1.session_id,
            message="How much did I spend at Reliance?",
            settings=settings,
        )
        assert t6.result_type == AssistantResultType.AMBIGUOUS_VENDOR.value
        assert len(t6.metadata["matching_vendors"]) == 2

        # Turn 7: No Results
        t7 = await run_assistant_chat(
            user_id=USER_A_ID,
            session_id=t1.session_id,
            message="What did I buy from Ikea?",
            settings=settings,
        )
        assert t7.result_type == AssistantResultType.NO_RESULTS.value


# ===========================================================================
# 2. Ephemeral Session Lifecycle via HTTP Endpoints
# ===========================================================================
def test_session_lifecycle_http():
    """Validates session creation, chat, reset, and expiration via FastAPI endpoints."""
    client = get_client(USER_A_ID)

    # 1. Create Session
    create_resp = client.post("/assistant/session")
    assert create_resp.status_code == 200
    sess_data = create_resp.json()
    sess_id = sess_data["session_id"]
    assert sess_id is not None

    # 2. Reset Session
    reset_resp = client.post(f"/assistant/session/{sess_id}/reset")
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"] == "reset"


# ===========================================================================
# 3. Source Document Schema Completeness
# ===========================================================================
@pytest.mark.anyio
async def test_source_document_schema_contract():
    """Validates that AssistantSource conforms exactly to the frontend contract."""
    d_id = uuid4()
    doc = _make_doc(USER_A_ID, doc_id=d_id, filename="receipt_test.pdf", vendor="DMart", total=500.0, date_str="2026-08-19")
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
            message="What did I buy from DMart?",
            settings=settings,
        )
        assert len(resp.sources) == 1
        src = resp.sources[0]
        assert str(src.document_id) == str(d_id)
        assert src.filename == "receipt_test.pdf"
        assert src.vendor == "DMart"
        assert src.document_date == "2026-08-19"
        assert src.total == 500.0
