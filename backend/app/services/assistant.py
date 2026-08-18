"""AI Assistant service — builds context from the user's Document Library and calls Groq LLM."""

import asyncio
import json
import logging
from decimal import Decimal

import httpx

from app.core.config import Settings
from app.schemas.assistant import AssistantChatResponse
from app.services.dashboard import (
    get_user_dashboard_data,
    get_user_item_analytics,
    get_user_vendor_analytics,
    _fetch_user_documents,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Groq chat-completions endpoint
# ---------------------------------------------------------------------------
_GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
_ASSISTANT_MODEL = "llama-3.3-70b-versatile"
_MAX_TOKENS = 1024
_TEMPERATURE = 0.4


# ---------------------------------------------------------------------------
# Currency formatter
# ---------------------------------------------------------------------------
def _fmt_currency(val) -> str:
    """Format a numeric value as a compact currency string."""
    if val is None:
        return "N/A"
    try:
        d = Decimal(str(val))
        return f"₹{d:,.2f}"
    except Exception:
        return str(val)


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------
async def _build_library_context(user_id: str, settings: Settings) -> str:
    """
    Fetch the user's actual Document Library data and serialise it as a
    compact JSON context block for the LLM system prompt.
    Reuses existing dashboard service internals — no new DB queries are introduced.
    """
    try:
        results = await asyncio.gather(
            get_user_dashboard_data(user_id=user_id, settings=settings),
            _fetch_user_documents(user_id, settings),
            get_user_vendor_analytics(user_id=user_id, limit=20, settings=settings),
            get_user_item_analytics(user_id=user_id, limit=20, settings=settings),
            return_exceptions=True,
        )
        dashboard, raw_docs, vendors, items = results
    except Exception as exc:
        logger.warning("Assistant context fetch error: %s", exc)
        return "{}"

    ctx: dict = {}

    # --- summary ---
    if not isinstance(dashboard, Exception) and dashboard:
        s = getattr(dashboard, "summary", None)
        if s:
            ctx["library_summary"] = {
                "total_documents": getattr(s, "total_documents", None),
                "total_amount_spent": _fmt_currency(getattr(s, "total_amount_spent", None)),
                "needs_review": getattr(s, "needs_review_documents", None),
            }

    # --- recent / all documents with line items ---
    if not isinstance(raw_docs, Exception) and raw_docs:
        # Sort by created_at descending (newest first)
        sorted_docs = sorted(
            raw_docs,
            key=lambda d: (-(d.created_at.timestamp() if d.created_at else 0)),
        )
        docs_list = []
        for doc in sorted_docs[:30]:
            ext = doc.extraction_result or {}
            line_items_raw = ext.get("line_items") or []
            doc_entry = {
                "filename": doc.filename,
                "vendor": ext.get("vendor_company"),
                "date": ext.get("date"),
                "total": _fmt_currency(ext.get("total")),
                "document_type": ext.get("document_type", "receipt"),
                "invoice_number": ext.get("invoice_number"),
                "line_items_count": len(line_items_raw),
                "line_items": [
                    {
                        "description": li.get("description") if isinstance(li, dict) else str(li),
                        "quantity": li.get("quantity") if isinstance(li, dict) else None,
                        "unit_price": _fmt_currency(li.get("unit_price")) if isinstance(li, dict) else None,
                        "total": _fmt_currency(li.get("total")) if isinstance(li, dict) else None,
                    }
                    for li in (line_items_raw[:40] if isinstance(line_items_raw, list) else [])
                ],
            }
            docs_list.append(doc_entry)
        ctx["documents"] = docs_list

    # --- top vendors ---
    if not isinstance(vendors, Exception) and vendors:
        vlist = getattr(vendors, "vendors", []) or []
        ctx["top_vendors"] = [
            {
                "vendor": getattr(v, "vendor", None),
                "total_spent": _fmt_currency(getattr(v, "total_spent", None)),
                "document_count": getattr(v, "document_count", None),
                "percentage": round(float(getattr(v, "percentage_of_total", 0) or 0), 1),
            }
            for v in vlist[:20]
        ]

    # --- top items ---
    if not isinstance(items, Exception) and items:
        ilist = getattr(items, "items", []) or []
        ctx["most_purchased_items"] = [
            {
                "item": getattr(i, "name", None),
                "total_quantity": getattr(i, "quantity", None),
                "total_spent": _fmt_currency(getattr(i, "total_spent", None)),
                "document_count": getattr(i, "document_count", None),
            }
            for i in ilist[:20]
        ]

    return json.dumps(ctx, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT_TEMPLATE = """\
You are STRUCTRA, an intelligent AI assistant embedded inside the STRUCTRA \
document-management application. You help users understand their saved \
receipts, invoices, spending patterns, and vendor history.

RULES YOU MUST FOLLOW:
1. ONLY answer using the data provided in the <library_context> block below.
2. NEVER fabricate vendor names, totals, item quantities, dates, or document counts.
3. If the answer is not in the context, say so clearly and briefly.
4. Keep answers concise, structured, and easy to read.
5. Use ₹ for Indian Rupee amounts. Format large numbers with commas.
6. When referencing a specific document, mention its filename, vendor, and date.
7. Do NOT ask follow-up clarification questions unless genuinely necessary.
8. Respond in plain English. Use markdown sparingly (bold for key values is fine).
9. When listing items, use a clean bulleted list format.

<library_context>
{context}
</library_context>
"""


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
async def run_assistant_chat(
    user_id: str,
    message: str,
    conversation_history: list[dict],
    settings: Settings,
) -> AssistantChatResponse:
    """
    Run one turn of the AI assistant conversation.

    Args:
        user_id: Authenticated user's ID (for scoped data fetching).
        message: The user's current question.
        conversation_history: Previous turns as [{role, content}] dicts
                              (already trimmed by the caller to keep context small).
        settings: App settings (contains GROQ_API_KEY).

    Returns:
        AssistantChatResponse with reply text and optional metadata.
    """
    if not settings.groq_api_key:
        return AssistantChatResponse(
            reply=(
                "The AI assistant is not configured. "
                "Please contact your administrator to set up the GROQ_API_KEY."
            )
        )

    # Build fresh library context from user's actual data
    context_json = await _build_library_context(user_id=user_id, settings=settings)
    system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(context=context_json)

    # Assemble messages for the API call
    messages = [{"role": "system", "content": system_prompt}]
    # Include recent conversation history (up to last 8 turns to stay within token budget)
    for turn in conversation_history[-8:]:
        messages.append({"role": turn["role"], "content": turn["content"]})
    # Append the current user message
    messages.append({"role": "user", "content": message})

    api_key = settings.groq_api_key.get_secret_value()

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                _GROQ_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": _ASSISTANT_MODEL,
                    "messages": messages,
                    "max_tokens": _MAX_TOKENS,
                    "temperature": _TEMPERATURE,
                },
            )
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        logger.error("Groq assistant call timed out for user %s", user_id)
        return AssistantChatResponse(
            reply="I'm having trouble reaching my AI backend right now. Please try again in a moment."
        )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Groq assistant HTTP error %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
        return AssistantChatResponse(
            reply="Something went wrong while generating your answer. Please try again."
        )
    except Exception as exc:
        logger.exception("Unexpected assistant error for user %s: %s", user_id, exc)
        return AssistantChatResponse(
            reply="An unexpected error occurred. Please try again."
        )

    try:
        reply_text = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Failed to parse Groq response: %s | Raw: %s", exc, data)
        return AssistantChatResponse(
            reply="I received an unexpected response format. Please try again."
        )

    return AssistantChatResponse(reply=reply_text)
