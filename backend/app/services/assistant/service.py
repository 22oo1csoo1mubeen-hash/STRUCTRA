"""Main orchestrator service for the STRUCTRA AI Assistant.

Coordinates ephemeral session resolution, intent understanding,
deterministic document retrieval/calculations, RAG context construction,
and LLM provider turn execution with derived structured metadata and fallback synthesis.
"""

from datetime import datetime
from decimal import Decimal
import logging
import time
from typing import Any

from app.core.config import Settings, get_settings
from app.schemas.assistant import AssistantChatResponse, AssistantResultType
from app.services.assistant.context import AssistantContextBuilder, _fmt_currency
from app.services.assistant.intent import AssistantIntent, AssistantIntentEngine
from app.services.assistant.provider import AssistantChatProvider
from app.services.assistant.retrieval import AssistantRetrievalService
from app.services.assistant.session import AssistantSessionManager, default_session_manager

logger = logging.getLogger(__name__)


def _build_deterministic_fallback_reply(
    intent: AssistantIntent,
    retrieved_payload: dict[str, Any],
    vendor: str | None = None,
    item_query: str | None = None,
    default_summary: str | None = None,
) -> str | None:
    """Synthesize a clean deterministic natural-language answer if LLM generation is unavailable."""
    if default_summary:
        return default_summary

    ambiguous = retrieved_payload.get("ambiguous_vendors")
    if ambiguous and vendor:
        return f"I found multiple vendors matching '{vendor}': {', '.join(ambiguous)}. Which one did you mean?"

    if intent == AssistantIntent.VENDOR_COMPARISON:
        comp = retrieved_payload.get("vendor_comparison") or {}
        v_a = comp.get("vendor_a", vendor or "Vendor A")
        v_b = comp.get("vendor_b", "Vendor B")
        s_a = comp.get("vendor_a_spent", 0.0)
        s_b = comp.get("vendor_b_spent", 0.0)
        diff = comp.get("difference", 0.0)
        higher = comp.get("higher_vendor")
        if higher:
            return f"You spent {_fmt_currency(diff)} more at {higher} ({_fmt_currency(s_a if higher == v_a else s_b)} vs {_fmt_currency(s_b if higher == v_a else s_a)})."
        return f"Your total spending is equal at both {v_a} and {v_b} ({_fmt_currency(s_a)})."

    if intent == AssistantIntent.FILTERED_RECEIPTS:
        f_items = retrieved_payload.get("filtered_line_items") or []
        f_docs = retrieved_payload.get("filtered_documents") or []
        if f_items:
            tot = sum(float(it.get("total") or it.get("amount") or 0.0) for it in f_items)
            lines = [f"{it['item_name']} ({_fmt_currency(it.get('total') or it.get('amount'))})" for it in f_items[:10]]
            return f"Found {len(f_items)} item{'s' if len(f_items) != 1 else ''} matching your filter totaling {_fmt_currency(tot)}: {', '.join(lines)}."
        if f_docs:
            tot = sum(float((d.extraction_result or {}).get("total") or 0.0) for d in f_docs)
            return f"Found {len(f_docs)} matching receipts totaling {_fmt_currency(tot)}."
        return "No saved items or receipts matching your filter criteria were found."

    if intent == AssistantIntent.TEMPORAL_SPENDING:
        t_docs = retrieved_payload.get("temporal_documents") or []
        tot = sum(float((d.extraction_result or {}).get("total") or 0.0) for d in t_docs)
        if t_docs:
            return f"You spent {_fmt_currency(tot)} across {len(t_docs)} receipts during this period."
        return "No receipts found for the requested time period in your library."

    if intent == AssistantIntent.ITEM_HISTORY:
        hist = retrieved_payload.get("item_history") or {}
        q = hist.get("item_query", item_query or "Item")
        qty = hist.get("total_quantity", 0.0)
        spend = hist.get("total_spent", 0.0)
        cnt = hist.get("document_count", 0)
        latest_d = hist.get("latest_date")
        if cnt > 0:
            d_str = f" on {latest_d}" if latest_d else ""
            return f"You bought {qty:g} {q} totaling {_fmt_currency(spend)} across {cnt} receipt{'s' if cnt != 1 else ''}{d_str}."
        return f"No saved purchases of '{q}' found in your library."

    if intent == AssistantIntent.VENDOR_SPENDING:
        v_data = retrieved_payload.get("vendor_spending") or {}
        v_name = v_data.get("vendor") or vendor or "this vendor"
        total = v_data.get("total_spent", 0.0)
        cnt = v_data.get("document_count", 0)
        if cnt == 0:
            return f"I couldn't find any saved documents from {v_name} in your library."
        return f"You have spent {_fmt_currency(total)} across {cnt} receipt{'s' if cnt != 1 else ''} at {v_name}."

    if intent == AssistantIntent.VENDOR_ITEMS:
        docs = retrieved_payload.get("documents") or []
        v_name = vendor or "this vendor"
        if not docs:
            return f"I couldn't find any saved documents from {v_name} in your library."
        all_items = []
        for d in docs:
            ext = d.extraction_result or {}
            for li in ext.get("line_items") or []:
                if isinstance(li, dict) and li.get("description"):
                    all_items.append(li["description"])
        if not all_items:
            return f"Found {len(docs)} document{'s' if len(docs) != 1 else ''} from {v_name}, but no line items were extracted."
        return f"From {v_name}, you bought: {', '.join(all_items[:10])}."

    if intent in (AssistantIntent.ITEM_QUANTITY, AssistantIntent.ITEM_SEARCH):
        item_stats = retrieved_payload.get("item_stats") or {}
        q = item_stats.get("item_query") or item_query or "items"
        qty = item_stats.get("total_quantity", 0.0)
        spend = item_stats.get("total_spent", 0.0)
        cnt = item_stats.get("document_count", 0)
        items_list = item_stats.get("items") or []
        if cnt == 0:
            return f"I couldn't find any purchases of '{q}' in your saved receipts."
        if items_list and items_list[0].get("unit_price") is not None:
            up_str = _fmt_currency(items_list[0]["unit_price"])
            v_name = items_list[0].get("vendor")
            v_str = f" from {v_name}" if v_name else ""
            return f"You purchased {qty:g} {q} at {up_str} each{v_str}, totaling {_fmt_currency(spend)} across {cnt} receipt{'s' if cnt != 1 else ''}."
        return f"You have purchased {qty:g} {q} totaling {_fmt_currency(spend)} across {cnt} receipt{'s' if cnt != 1 else ''}."

    if intent == AssistantIntent.LATEST_RECEIPT_ITEMS:
        doc = retrieved_payload.get("document")
        if not doc:
            return f"I couldn't find any saved receipts{' from ' + vendor if vendor else ''} in your library."
        ext = doc.extraction_result or {}
        v_name = ext.get("vendor_company") or "Unknown Vendor"
        items = ext.get("line_items") or []
        item_names = [li.get("description") for li in items if isinstance(li, dict) and li.get("description")]
        tot_str = _fmt_currency(ext.get("total"))
        if item_names:
            return f"Your latest receipt from {v_name} ({tot_str}) contains: {', '.join(item_names[:10])}."
        return f"Your latest receipt from {v_name} totals {tot_str}."

    if intent == AssistantIntent.LATEST_RECEIPT:
        doc = retrieved_payload.get("document")
        if not doc:
            return f"I couldn't find any saved receipts{' from ' + vendor if vendor else ''} in your library."
        ext = doc.extraction_result or {}
        v_name = ext.get("vendor_company") or "Unknown Vendor"
        tot_str = _fmt_currency(ext.get("total"))
        d_str = ext.get("date") or "recently"
        return f"Your latest receipt is from {v_name} on {d_str} for a total of {tot_str}."

    if intent == AssistantIntent.OLDEST_RECEIPT:
        doc = retrieved_payload.get("document") or retrieved_payload.get("oldest_document")
        if not doc:
            return f"I couldn't find any saved receipts{' from ' + vendor if vendor else ''} in your library."
        ext = doc.extraction_result or {}
        v_name = ext.get("vendor_company") or "Unknown Vendor"
        tot_str = _fmt_currency(ext.get("total"))
        d_str = ext.get("date") or "in the past"
        return f"Your oldest receipt is from {v_name} on {d_str} for a total of {tot_str} ({doc.filename})."

    if intent == AssistantIntent.OLDEST_ITEM:
        it = retrieved_payload.get("oldest_item")
        if not it:
            return "No line items found in your library."
        v_str = f" from {it['vendor']}" if it.get("vendor") else ""
        d_str = f" on {it['date']}" if it.get("date") else ""
        return f"Your oldest recorded purchase is '{it['name']}' costing {_fmt_currency(it.get('amount') or it.get('unit_price'))}{v_str}{d_str}."

    if intent == AssistantIntent.TOTAL_SPENDING:
        tot = retrieved_payload.get("total_spending") or {}
        tot_str = _fmt_currency(tot.get("total_spent", 0.0))
        cnt = tot.get("total_documents", 0)
        return f"Your total spending across {cnt} receipt{'s' if cnt != 1 else ''} is {tot_str}."

    if intent == AssistantIntent.MOST_EXPENSIVE_RECEIPT:
        rec = retrieved_payload.get("most_expensive_receipt")
        if not rec:
            return "No receipts found in your library."
        return f"Your most expensive receipt is from {rec.get('vendor') or 'Unknown'} ({rec.get('filename')}) totaling {_fmt_currency(rec.get('total_amount'))}."

    if intent == AssistantIntent.MOST_EXPENSIVE_ITEM:
        it = retrieved_payload.get("most_expensive_item")
        if not it:
            return "No line items found in your library."
        return f"Your most expensive purchased item is '{it['name']}' costing {_fmt_currency(it['amount'])}{' from ' + it['vendor'] if it.get('vendor') else ''}."

    if intent == AssistantIntent.CHEAPEST_RECEIPT:
        rec = retrieved_payload.get("cheapest_receipt")
        if not rec:
            return "No receipts found in your library."
        return f"Your cheapest receipt is from {rec.get('vendor') or 'Unknown'} ({rec.get('filename')}) totaling {_fmt_currency(rec.get('total_amount'))}."

    if intent == AssistantIntent.CHEAPEST_ITEM:
        it = retrieved_payload.get("cheapest_item")
        if not it:
            return "No line items found in your library."
        return f"Your cheapest purchased item is '{it['name']}' costing {_fmt_currency(it['amount'])}{' from ' + it['vendor'] if it.get('vendor') else ''}."

    return None


async def run_assistant_chat(
    *,
    user_id: str,
    message: str,
    conversation_history: list[dict[str, str]] | None = None,
    session_id: str | None = None,
    settings: Settings | None = None,
    chat_provider: AssistantChatProvider | None = None,
    session_manager: AssistantSessionManager | None = None,
    now: datetime | None = None,
) -> AssistantChatResponse:
    """Execute one conversation turn for the authenticated user."""
    t_start = time.perf_counter()
    cfg = settings or get_settings()
    s_mgr = session_manager or default_session_manager
    provider = chat_provider or AssistantChatProvider(cfg)

    # 1. Resolve / create ephemeral session
    active_session = None
    if session_id:
        active_session = await s_mgr.get_session(session_id, user_id=user_id)
        if not active_session:
            active_session = await s_mgr.create_session(user_id=user_id)
    else:
        active_session = await s_mgr.create_session(user_id=user_id)

    # 2. Combine client-carried history with session turns (bounded to last 8 turns)
    history: list[dict[str, str]] = []
    if conversation_history:
        history = [{"role": t["role"], "content": t["content"]} for t in conversation_history[-8:]]
    elif active_session.turns:
        history = list(active_session.turns[-8:])

    # 3. Intent understanding & entity extraction with follow-up resolution
    parsed_intent = AssistantIntentEngine.parse_query(message, conversation_history=history, now=now)
    intent = parsed_intent.intent
    t_intent = time.perf_counter()

    # 4. Deterministic retrieval & calculations
    retrieval = AssistantRetrievalService(user_id=user_id, settings=cfg)
    retrieved_payload: dict[str, Any] = {}

    # Check vendor ambiguity if a single-vendor query is performed
    if parsed_intent.vendor and not parsed_intent.vendor_b and intent in (
        AssistantIntent.VENDOR_SPENDING,
        AssistantIntent.VENDOR_ITEMS,
        AssistantIntent.LATEST_RECEIPT_ITEMS,
        AssistantIntent.LATEST_RECEIPT,
    ):
        is_ambig, candidates = await retrieval.check_vendor_ambiguity(parsed_intent.vendor)
        if is_ambig:
            retrieved_payload["ambiguous_vendors"] = candidates

    if not retrieved_payload.get("ambiguous_vendors"):
        if intent == AssistantIntent.VENDOR_COMPARISON and parsed_intent.vendor and parsed_intent.vendor_b:
            comp_res = await retrieval.compare_vendors(parsed_intent.vendor, parsed_intent.vendor_b)
            retrieved_payload["vendor_comparison"] = comp_res

        elif intent == AssistantIntent.FILTERED_RECEIPTS:
            filt_docs = await retrieval.get_filtered_documents(
                vendor=parsed_intent.vendor,
                start_date=parsed_intent.start_date,
                end_date=parsed_intent.end_date,
                min_amount=parsed_intent.min_amount,
                max_amount=parsed_intent.max_amount,
            )
            filt_items = await retrieval.get_filtered_line_items(
                item_query=parsed_intent.item_query,
                vendor=parsed_intent.vendor,
                start_date=parsed_intent.start_date,
                end_date=parsed_intent.end_date,
                min_amount=parsed_intent.min_amount,
                max_amount=parsed_intent.max_amount,
            )
            retrieved_payload["filtered_documents"] = filt_docs
            retrieved_payload["filtered_line_items"] = filt_items

        elif intent == AssistantIntent.TEMPORAL_SPENDING:
            temp_docs = await retrieval.get_filtered_documents(
                vendor=parsed_intent.vendor,
                start_date=parsed_intent.start_date,
                end_date=parsed_intent.end_date,
            )
            lib_stats = await retrieval.get_library_stats()
            retrieved_payload["temporal_documents"] = temp_docs
            retrieved_payload["library_stats"] = lib_stats

        elif intent == AssistantIntent.ITEM_HISTORY and parsed_intent.item_query:
            hist_res = await retrieval.get_item_history(
                item_query=parsed_intent.item_query,
                vendor=parsed_intent.vendor,
            )
            retrieved_payload["item_history"] = hist_res

        elif intent in (AssistantIntent.LATEST_RECEIPT_ITEMS, AssistantIntent.LATEST_RECEIPT):
            latest_doc = await retrieval.get_latest_document(vendor=parsed_intent.vendor)
            retrieved_payload["document"] = latest_doc

        elif intent == AssistantIntent.OLDEST_RECEIPT:
            oldest_doc = await retrieval.get_oldest_document(vendor=parsed_intent.vendor)
            retrieved_payload["document"] = oldest_doc
            retrieved_payload["oldest_document"] = oldest_doc

        elif intent == AssistantIntent.OLDEST_ITEM:
            oldest_it = await retrieval.get_oldest_item(vendor=parsed_intent.vendor)
            retrieved_payload["oldest_item"] = oldest_it

        elif intent == AssistantIntent.VENDOR_SPENDING:
            v_spend = await retrieval.calculate_vendor_spending(vendor=parsed_intent.vendor or "")
            retrieved_payload["vendor_spending"] = v_spend

        elif intent == AssistantIntent.VENDOR_ITEMS:
            docs = await retrieval.get_documents_by_vendor(vendor=parsed_intent.vendor or "")
            retrieved_payload["documents"] = docs

        elif intent in (AssistantIntent.ITEM_QUANTITY, AssistantIntent.ITEM_SEARCH):
            item_stats = await retrieval.calculate_item_quantities(
                item_query=parsed_intent.item_query or "",
                vendor=parsed_intent.vendor,
            )
            retrieved_payload["item_stats"] = item_stats

        elif intent == AssistantIntent.MOST_EXPENSIVE_ITEM:
            most_exp = await retrieval.get_most_expensive_item()
            retrieved_payload["most_expensive_item"] = most_exp

        elif intent == AssistantIntent.MOST_EXPENSIVE_RECEIPT:
            most_exp_rec = await retrieval.get_most_expensive_receipt()
            retrieved_payload["most_expensive_receipt"] = most_exp_rec

        elif intent == AssistantIntent.CHEAPEST_ITEM:
            cheap_it = await retrieval.get_cheapest_item(vendor=parsed_intent.vendor)
            retrieved_payload["cheapest_item"] = cheap_it

        elif intent == AssistantIntent.CHEAPEST_RECEIPT:
            cheap_rec = await retrieval.get_cheapest_receipt(vendor=parsed_intent.vendor)
            retrieved_payload["cheapest_receipt"] = cheap_rec

        elif intent in (AssistantIntent.TOTAL_SPENDING, AssistantIntent.DOCUMENT_COUNT):
            tot_spend = await retrieval.calculate_total_spending()
            retrieved_payload["total_spending"] = tot_spend

        elif intent == AssistantIntent.TOP_VENDORS:
            top_v = await retrieval.get_top_vendors()
            retrieved_payload["top_vendors"] = top_v

        elif intent == AssistantIntent.MOST_FREQUENT_ITEMS:
            freq_i = await retrieval.get_most_bought_items()
            retrieved_payload["most_bought_items"] = freq_i

        elif intent == AssistantIntent.CLARIFICATION:
            pass

        else:
            # General query: retrieve complete library overview and summary
            all_docs = await retrieval.get_all_documents()
            tot_spend = await retrieval.calculate_total_spending()
            lib_stats = await retrieval.get_library_stats()
            retrieved_payload["all_documents"] = all_docs
            retrieved_payload["recent_documents"] = all_docs[:10]
            retrieved_payload["total_spending"] = tot_spend
            retrieved_payload["library_stats"] = lib_stats

    t_retrieval = time.perf_counter()

    # 5. Build compact RAG context, source references, and canonical metadata
    context_json, sources, metadata = AssistantContextBuilder.build_context_for_intent(
        parsed_intent=parsed_intent,
        retrieved_payload=retrieved_payload,
    )

    # Derive non-duplicated display properties directly from canonical metadata & sources
    result_type = metadata.get("type", AssistantResultType.GENERAL_QUERY.value)
    title = metadata.get("title")
    summary = metadata.get("summary")
    source_count = len(sources)
    t_context = time.perf_counter()

    # 6. Generate natural language reply via LLM or deterministic synthesis
    reply_text = await provider.generate_reply(
        context_json=context_json,
        user_message=message,
        conversation_history=history,
    )
    t_provider = time.perf_counter()

    # If provider returned generic error fallback message, attempt deterministic answer synthesis
    if "trouble generating an answer" in reply_text or "Please check your connection" in reply_text:
        fallback_synth = _build_deterministic_fallback_reply(
            intent=intent,
            retrieved_payload=retrieved_payload,
            vendor=parsed_intent.vendor,
            item_query=parsed_intent.item_query,
            default_summary=summary,
        )
        if fallback_synth:
            reply_text = fallback_synth

    # 7. Record turn into ephemeral session
    await s_mgr.add_turn(active_session.session_id, user_id, role="user", content=message)
    await s_mgr.add_turn(active_session.session_id, user_id, role="assistant", content=reply_text)

    total_ms = (time.perf_counter() - t_start) * 1000
    logger.info(
        "[ASSISTANT] session=%s intent=%s retrieval_ms=%.1f provider_ms=%.1f total_ms=%.1f",
        active_session.session_id[:8] if active_session.session_id else "new",
        intent.value,
        (t_retrieval - t_intent) * 1000,
        (t_provider - t_context) * 1000,
        total_ms,
    )

    # 8. Assemble structured response with canonical metadata
    return AssistantChatResponse(
        session_id=active_session.session_id,
        message=reply_text,
        reply=reply_text,
        result_type=result_type,
        title=title,
        summary=summary,
        sources=sources,
        source_count=source_count,
        metadata=metadata,
    )
