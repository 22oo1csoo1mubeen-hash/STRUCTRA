"""RAG context builder and source attribution for the AI Assistant.

Constructs compact, targeted context blocks for the LLM prompt and formats
canonical structured sources and typed metadata for frontend card rendering.
"""

from decimal import Decimal
import json
from typing import Any

from app.schemas.assistant import AssistantResultType, AssistantSource
from app.services.assistant.intent import AssistantIntent, ParsedQueryIntent
from app.services.dashboard import parse_decimal_safe
from app.services.document_metadata import CreatedDocumentMetadata


def _fmt_currency(val: Any) -> str:
    """Format numeric value as INR currency string."""
    if val is None:
        return "N/A"
    try:
        d = Decimal(str(val))
        return f"₹{d:,.2f}"
    except Exception:
        return str(val)


def _doc_to_source(doc: CreatedDocumentMetadata) -> AssistantSource:
    """Convert a CreatedDocumentMetadata record into an AssistantSource model."""
    ext = doc.extraction_result or {}
    tot_dec = parse_decimal_safe(ext.get("total"))
    tot_float = float(tot_dec) if tot_dec is not None else None
    return AssistantSource(
        document_id=doc.id,
        filename=doc.filename,
        vendor=ext.get("vendor_company"),
        document_date=ext.get("date"),
        total=tot_float,
    )


class AssistantContextBuilder:
    """Builds concise RAG context, source attribution, and canonical structured metadata."""

    @staticmethod
    def build_context_for_intent(
        parsed_intent: ParsedQueryIntent,
        retrieved_payload: dict[str, Any],
    ) -> tuple[str, list[AssistantSource], dict[str, Any]]:
        """Construct prompt context string, source list, and canonical metadata dictionary."""
        intent = parsed_intent.intent
        sources: list[AssistantSource] = []
        metadata: dict[str, Any] = {"intent": intent.value}
        context_dict: dict[str, Any] = {}

        # 0. Ambiguous Vendor Handling
        ambiguous_vendors = retrieved_payload.get("ambiguous_vendors")
        if ambiguous_vendors:
            title = f"Multiple Matches for '{parsed_intent.vendor}'"
            summary = f"I found multiple matching vendors: {', '.join(ambiguous_vendors)}. Which one did you mean?"
            context_dict["ambiguity"] = {
                "query_vendor": parsed_intent.vendor,
                "matching_vendors": ambiguous_vendors,
                "instruction": f"Multiple distinct vendors in the user's library match '{parsed_intent.vendor}'. Please ask the user to clarify which vendor they meant ({', '.join(ambiguous_vendors)}).",
            }
            metadata.update({
                "type": AssistantResultType.AMBIGUOUS_VENDOR.value,
                "vendor": parsed_intent.vendor,
                "matching_vendors": ambiguous_vendors,
                "title": title,
                "summary": summary,
            })
            context_json = json.dumps(context_dict, ensure_ascii=False, default=str)
            return context_json, sources, metadata

        # 1. Vendor Comparison
        if intent == AssistantIntent.VENDOR_COMPARISON:
            comp = retrieved_payload.get("vendor_comparison") or {}
            v_a = comp.get("vendor_a", parsed_intent.vendor or "Vendor A")
            v_b = comp.get("vendor_b", parsed_intent.vendor_b or "Vendor B")
            s_a = comp.get("vendor_a_spent", 0.0)
            s_b = comp.get("vendor_b_spent", 0.0)
            c_a = comp.get("vendor_a_count", 0)
            c_b = comp.get("vendor_b_count", 0)
            diff = comp.get("difference", 0.0)
            higher = comp.get("higher_vendor")

            # Attach contributing sources
            for d in (comp.get("vendor_a_docs") or [])[:3]:
                sources.append(_doc_to_source(d))
            for d in (comp.get("vendor_b_docs") or [])[:3]:
                sources.append(_doc_to_source(d))

            title = f"Comparing {v_a} vs {v_b}"
            if higher:
                summary = f"You spent {_fmt_currency(diff)} more at {higher} ({_fmt_currency(s_a if higher == v_a else s_b)} vs {_fmt_currency(s_b if higher == v_a else s_a)})."
            else:
                summary = f"Your total spending is equal at both {v_a} and {v_b} ({_fmt_currency(s_a)})."

            context_dict["vendor_comparison"] = {
                "vendor_a": v_a,
                "vendor_a_total": _fmt_currency(s_a),
                "vendor_a_receipts": c_a,
                "vendor_b": v_b,
                "vendor_b_total": _fmt_currency(s_b),
                "vendor_b_receipts": c_b,
                "difference": _fmt_currency(diff),
                "higher_vendor": higher,
            }
            metadata.update({
                "type": AssistantResultType.VENDOR_COMPARISON.value,
                "vendor_a": v_a,
                "vendor_a_spent": s_a,
                "vendor_a_count": c_a,
                "vendor_b": v_b,
                "vendor_b_spent": s_b,
                "vendor_b_count": c_b,
                "difference": diff,
                "higher_vendor": higher,
                "title": title,
                "summary": summary,
            })

        # 2. Filtered Receipts (Amount / Bounds)
        elif intent == AssistantIntent.FILTERED_RECEIPTS:
            f_docs = retrieved_payload.get("filtered_documents") or []
            tot_amt = 0.0
            for d in f_docs:
                sources.append(_doc_to_source(d))
                ext = d.extraction_result or {}
                tot_amt += float(parse_decimal_safe(ext.get("total")) or 0.0)

            crit_parts = []
            if parsed_intent.min_amount is not None:
                crit_parts.append(f"above {_fmt_currency(parsed_intent.min_amount)}")
            if parsed_intent.max_amount is not None:
                crit_parts.append(f"below {_fmt_currency(parsed_intent.max_amount)}")
            if parsed_intent.vendor:
                crit_parts.append(f"from {parsed_intent.vendor}")
            if parsed_intent.temporal_label:
                crit_parts.append(f"in {parsed_intent.temporal_label}")

            crit_str = ", ".join(crit_parts) if crit_parts else "matching your filter"
            title = f"Filtered Receipts ({crit_str})"
            if f_docs:
                summary = f"Found {len(f_docs)} receipt{'s' if len(f_docs) != 1 else ''} {crit_str} totaling {_fmt_currency(tot_amt)}."
            else:
                summary = f"No saved receipts found {crit_str} in your library."

            context_dict["filtered_receipts"] = {
                "criteria": crit_str,
                "document_count": len(f_docs),
                "total_amount": _fmt_currency(tot_amt),
                "documents": [
                    {
                        "filename": d.filename,
                        "vendor": (d.extraction_result or {}).get("vendor_company"),
                        "date": (d.extraction_result or {}).get("date"),
                        "total": _fmt_currency((d.extraction_result or {}).get("total")),
                    }
                    for d in f_docs[:10]
                ],
            }
            metadata.update({
                "type": AssistantResultType.FILTERED_RECEIPTS.value if f_docs else AssistantResultType.NO_RESULTS.value,
                "document_count": len(f_docs),
                "total_spent": tot_amt,
                "title": title,
                "summary": summary,
            })

        # 3. Temporal Spending (e.g. "last month", "in August")
        elif intent == AssistantIntent.TEMPORAL_SPENDING:
            t_docs = retrieved_payload.get("temporal_documents") or []
            tot_amt = 0.0
            for d in t_docs:
                sources.append(_doc_to_source(d))
                ext = d.extraction_result or {}
                tot_amt += float(parse_decimal_safe(ext.get("total")) or 0.0)

            label = parsed_intent.temporal_label or "the selected period"
            v_str = f" from {parsed_intent.vendor}" if parsed_intent.vendor else ""
            title = f"Spending for {label.capitalize()}{v_str}"
            if t_docs:
                summary = f"In {label}{v_str}, you spent {_fmt_currency(tot_amt)} across {len(t_docs)} receipt{'s' if len(t_docs) != 1 else ''}."
            else:
                summary = f"No receipts found for {label}{v_str} in your library."

            context_dict["temporal_spending"] = {
                "period": label,
                "vendor": parsed_intent.vendor,
                "document_count": len(t_docs),
                "total_spent": _fmt_currency(tot_amt),
                "documents": [
                    {
                        "filename": d.filename,
                        "vendor": (d.extraction_result or {}).get("vendor_company"),
                        "date": (d.extraction_result or {}).get("date"),
                        "total": _fmt_currency((d.extraction_result or {}).get("total")),
                    }
                    for d in t_docs[:10]
                ],
            }
            metadata.update({
                "type": AssistantResultType.TEMPORAL_SPENDING.value if t_docs else AssistantResultType.NO_RESULTS.value,
                "document_count": len(t_docs),
                "total_spent": tot_amt,
                "temporal_label": label,
                "title": title,
                "summary": summary,
            })

        # 4. Item History & Specific Item Intelligence
        elif intent == AssistantIntent.ITEM_HISTORY:
            hist = retrieved_payload.get("item_history") or {}
            q = hist.get("item_query", parsed_intent.item_query or "Item")
            qty = hist.get("total_quantity", 0.0)
            spend = hist.get("total_spent", 0.0)
            cnt = hist.get("document_count", 0)
            latest_d = hist.get("latest_date")
            vendors = hist.get("vendors") or []
            purchases = hist.get("purchases", [])

            for d in (hist.get("documents") or [])[:5]:
                sources.append(_doc_to_source(d))

            title = f"{q.title()} Purchase History"
            if cnt > 0:
                v_str = f" from {', '.join(vendors[:3])}" if vendors else ""
                d_str = f", most recently on {latest_d}" if latest_d else ""
                if purchases and purchases[0].get("unit_price") is not None:
                    up_str = _fmt_currency(purchases[0].get("unit_price"))
                    summary = f"You bought {qty:g} {q} at {up_str} each{v_str}{d_str}, spending {_fmt_currency(spend)} across {cnt} receipt{'s' if cnt != 1 else ''}."
                else:
                    summary = f"You bought {qty:g} {q}{v_str}{d_str}, spending {_fmt_currency(spend)} across {cnt} receipt{'s' if cnt != 1 else ''}."
            else:
                summary = f"No saved purchases of '{q}' found in your library."

            context_dict["item_history"] = {
                "item": q,
                "total_quantity": qty,
                "total_spent": _fmt_currency(spend),
                "document_count": cnt,
                "latest_date": latest_d,
                "vendors": vendors,
                "purchases": [
                    {
                        "item_name": p.get("item_name"),
                        "quantity": p.get("quantity"),
                        "unit_price": _fmt_currency(p.get("unit_price")),
                        "line_total": _fmt_currency(p.get("total")),
                        "vendor": p.get("vendor"),
                        "receipt": p.get("filename"),
                        "date": p.get("date"),
                    }
                    for p in purchases[:10]
                ],
            }
            metadata.update({
                "type": AssistantResultType.ITEM_HISTORY.value if cnt > 0 else AssistantResultType.NO_RESULTS.value,
                "item_name": q,
                "item": q,
                "total_quantity": qty,
                "total_spent": spend,
                "document_count": cnt,
                "latest_date": latest_d,
                "vendors": vendors,
                "unit_price": purchases[0].get("unit_price") if purchases else None,
                "purchases": purchases[:10],
                "title": title,
                "summary": summary,
            })

        # 5. Clarification
        elif intent == AssistantIntent.CLARIFICATION:
            prompt = parsed_intent.clarification_prompt or "Could you clarify your request?"
            options = parsed_intent.clarification_options or []
            title = "Clarification Needed"
            summary = prompt
            context_dict["clarification"] = {
                "prompt": prompt,
                "options": options,
            }
            metadata.update({
                "type": AssistantResultType.CLARIFICATION.value,
                "prompt": prompt,
                "options": options,
                "title": title,
                "summary": summary,
            })

        # 6. Latest Receipt Items
        elif intent == AssistantIntent.LATEST_RECEIPT_ITEMS:
            doc = retrieved_payload.get("document")
            if doc:
                sources.append(_doc_to_source(doc))
                ext = doc.extraction_result or {}
                line_items = ext.get("line_items") or []
                clean_items = []
                total_qty = 0.0
                for li in line_items:
                    if isinstance(li, dict):
                        qty = float(parse_decimal_safe(li.get("quantity")) or 1.0)
                        total_qty += qty
                        clean_items.append({
                            "description": li.get("description"),
                            "quantity": qty,
                            "unit_price": _fmt_currency(li.get("unit_price")),
                            "total": _fmt_currency(li.get("total") or li.get("line_total")),
                        })
                v_name = ext.get("vendor_company") or parsed_intent.vendor or "Unknown Vendor"
                tot_val = float(parse_decimal_safe(ext.get("total")) or 0)
                tot_str = _fmt_currency(ext.get("total"))
                title = f"Latest Receipt: {v_name}"
                item_names = [it["description"] for it in clean_items if it.get("description")]
                summary = f"From your latest {v_name} receipt ({tot_str}), you bought {len(clean_items)} item{'s' if len(clean_items) != 1 else ''}."

                context_dict["latest_receipt"] = {
                    "filename": doc.filename,
                    "vendor": v_name,
                    "date": ext.get("date"),
                    "total": tot_str,
                    "item_count": len(clean_items),
                    "total_quantity": total_qty,
                    "line_items": clean_items,
                }
                metadata.update({
                    "type": AssistantResultType.VENDOR_ITEMS.value,
                    "vendor": v_name,
                    "total_amount": tot_val,
                    "item_count": len(clean_items),
                    "total_quantity": total_qty,
                    "document_date": ext.get("date"),
                    "items": item_names,
                    "title": title,
                    "summary": summary,
                })
            else:
                v_str = f" from {parsed_intent.vendor}" if parsed_intent.vendor else ""
                title = f"{parsed_intent.vendor or 'Receipt'} Not Found"
                summary = f"I couldn't find any saved receipts{v_str} in your library."
                context_dict["error"] = summary
                metadata.update({
                    "type": AssistantResultType.NO_RESULTS.value,
                    "vendor": parsed_intent.vendor,
                    "title": title,
                    "summary": summary,
                })

        # 7. Vendor Items
        elif intent == AssistantIntent.VENDOR_ITEMS:
            docs = retrieved_payload.get("documents") or []
            all_items = []
            detailed_items = []
            v_name = parsed_intent.vendor or "Vendor"
            for d in docs:
                sources.append(_doc_to_source(d))
                ext = d.extraction_result or {}
                if not v_name or v_name == "Vendor":
                    v_name = ext.get("vendor_company") or v_name
                for li in ext.get("line_items") or []:
                    if isinstance(li, dict) and li.get("description"):
                        desc = li["description"].strip()
                        all_items.append(desc)
                        raw_qty = parse_decimal_safe(li.get("quantity")) or Decimal("1.0")
                        raw_up = parse_decimal_safe(li.get("unit_price"))
                        raw_tot = parse_decimal_safe(li.get("line_total") or li.get("total"))
                        if raw_tot is None and raw_up is not None:
                            raw_tot = raw_up * raw_qty
                        elif raw_up is None and raw_tot is not None and raw_qty > Decimal("0"):
                            raw_up = raw_tot / raw_qty

                        detailed_items.append({
                            "description": desc,
                            "quantity": float(raw_qty),
                            "unit_price": _fmt_currency(raw_up),
                            "total": _fmt_currency(raw_tot),
                            "receipt": d.filename,
                            "date": ext.get("date"),
                        })

            unique_items = sorted(list(set(all_items)))
            title = f"{v_name} Purchases"
            if docs and unique_items:
                summary = f"You bought {len(unique_items)} unique item{'s' if len(unique_items) != 1 else ''} from {v_name} across {len(docs)} receipt{'s' if len(docs) != 1 else ''}."
            elif docs:
                summary = f"I found {len(docs)} saved receipt{'s' if len(docs) != 1 else ''} from {v_name}."
            else:
                summary = f"I couldn't find any saved documents from {v_name} in your library."

            context_dict["vendor_purchases"] = {
                "vendor": v_name,
                "document_count": len(docs),
                "unique_item_count": len(unique_items),
                "items": unique_items[:25],
                "line_items": detailed_items[:25],
            }
            metadata.update({
                "type": AssistantResultType.VENDOR_ITEMS.value if docs else AssistantResultType.NO_RESULTS.value,
                "vendor": v_name,
                "document_count": len(docs),
                "items": unique_items,
                "line_items": detailed_items[:25],
                "title": title,
                "summary": summary,
            })

        # 8. Latest Receipt (Single Overview)
        elif intent == AssistantIntent.LATEST_RECEIPT:
            doc = retrieved_payload.get("document")
            if doc:
                sources.append(_doc_to_source(doc))
                ext = doc.extraction_result or {}
                v_name = ext.get("vendor_company") or "Unknown Vendor"
                tot_val = float(parse_decimal_safe(ext.get("total")) or 0)
                tot_str = _fmt_currency(ext.get("total"))
                d_str = ext.get("date") or "Unknown date"
                title = f"Latest Receipt: {v_name}"
                summary = f"Your latest receipt from {v_name} on {d_str} totals {tot_str}."

                context_dict["latest_receipt"] = {
                    "filename": doc.filename,
                    "vendor": v_name,
                    "date": d_str,
                    "total": tot_str,
                }
                metadata.update({
                    "type": AssistantResultType.RECEIPT.value,
                    "vendor": v_name,
                    "total_amount": tot_val,
                    "document_date": d_str,
                    "title": title,
                    "summary": summary,
                })
            else:
                v_str = f" from {parsed_intent.vendor}" if parsed_intent.vendor else ""
                title = f"{parsed_intent.vendor or 'Receipt'} Not Found"
                summary = f"I couldn't find any saved receipts{v_str} in your library."
                context_dict["error"] = summary
                metadata.update({
                    "type": AssistantResultType.NO_RESULTS.value,
                    "vendor": parsed_intent.vendor,
                    "title": title,
                    "summary": summary,
                })

        # 9. Vendor Spending
        elif intent == AssistantIntent.VENDOR_SPENDING:
            v_spend = retrieved_payload.get("vendor_spending") or {}
            v_name = v_spend.get("vendor") or parsed_intent.vendor or "Vendor"
            tot_amt = v_spend.get("total_spent", 0.0)
            doc_cnt = v_spend.get("document_count", 0)
            for d in v_spend.get("documents") or []:
                sources.append(_doc_to_source(d))

            title = f"{v_name} Spending"
            if doc_cnt > 0:
                summary = f"You have spent {_fmt_currency(tot_amt)} across {doc_cnt} receipt{'s' if doc_cnt != 1 else ''} at {v_name}."
            else:
                summary = f"I couldn't find any saved documents from {v_name} in your library."

            context_dict["vendor_spending"] = {
                "vendor": v_name,
                "total_spent": _fmt_currency(tot_amt),
                "document_count": doc_cnt,
            }
            metadata.update({
                "type": AssistantResultType.VENDOR_SPENDING.value if doc_cnt > 0 else AssistantResultType.NO_RESULTS.value,
                "vendor": v_name,
                "total_spent": tot_amt,
                "document_count": doc_cnt,
                "title": title,
                "summary": summary,
            })

        # 10. Item Quantity & Item Search
        elif intent in (AssistantIntent.ITEM_QUANTITY, AssistantIntent.ITEM_SEARCH):
            item_stats = retrieved_payload.get("item_stats") or {}
            q = item_stats.get("item_query") or parsed_intent.item_query or "Item"
            qty = item_stats.get("total_quantity", 0.0)
            spend = item_stats.get("total_spent", 0.0)
            cnt = item_stats.get("document_count", 0)
            items_list = item_stats.get("items") or []

            seen_docs: set[str] = set()
            for it in items_list:
                doc_id = it.get("document_id")
                if doc_id and str(doc_id) not in seen_docs:
                    seen_docs.add(str(doc_id))
                    sources.append(
                        AssistantSource(
                            document_id=doc_id,
                            filename=it.get("filename") or "receipt",
                            vendor=it.get("vendor"),
                            document_date=it.get("document_date"),
                            total=it.get("total"),
                        )
                    )

            title = f"{q.title()} Quantity" if intent == AssistantIntent.ITEM_QUANTITY else f"{q.title()} Purchases"
            if cnt > 0:
                if items_list and items_list[0].get("unit_price") is not None:
                    unit_p_str = _fmt_currency(items_list[0].get("unit_price"))
                    summary = f"You bought {qty:g} {q} at {unit_p_str} each, totaling {_fmt_currency(spend)} across {cnt} receipt{'s' if cnt != 1 else ''}."
                else:
                    summary = f"You have purchased {qty:g} {q} totaling {_fmt_currency(spend)} across {cnt} receipt{'s' if cnt != 1 else ''}."
            else:
                summary = f"I couldn't find any purchases of '{q}' in your saved receipts."

            context_dict["item_analytics"] = {
                "item": q,
                "total_quantity": qty,
                "total_spent": _fmt_currency(spend),
                "document_count": cnt,
                "purchases": [
                    {
                        "item_name": it.get("item_name"),
                        "quantity": it.get("quantity"),
                        "unit_price": _fmt_currency(it.get("unit_price")),
                        "line_total": _fmt_currency(it.get("total")),
                        "vendor": it.get("vendor") or "Unknown Vendor",
                        "receipt": it.get("filename"),
                        "date": it.get("document_date"),
                    }
                    for it in items_list[:15]
                ],
            }
            metadata.update({
                "type": AssistantResultType.ITEM_QUANTITY.value if (intent == AssistantIntent.ITEM_QUANTITY and cnt > 0) else (AssistantResultType.ITEM_SEARCH.value if cnt > 0 else AssistantResultType.NO_RESULTS.value),
                "item_name": q,
                "item": q,
                "quantity": qty,
                "total_quantity": qty,
                "total_spent": spend,
                "document_count": cnt,
                "unit_price": items_list[0].get("unit_price") if items_list else None,
                "purchases": [
                    {
                        "item_name": it.get("item_name"),
                        "quantity": it.get("quantity"),
                        "unit_price": it.get("unit_price"),
                        "total": it.get("total"),
                        "vendor": it.get("vendor"),
                        "receipt": it.get("filename"),
                        "date": it.get("document_date"),
                    }
                    for it in items_list[:15]
                ],
                "title": title,
                "summary": summary,
            })

        # 11. Most Expensive Item
        elif intent == AssistantIntent.MOST_EXPENSIVE_ITEM:
            exp_it = retrieved_payload.get("most_expensive_item")
            if exp_it:
                doc_id = exp_it.get("document_id")
                if doc_id:
                    sources.append(
                        AssistantSource(
                            document_id=doc_id,
                            filename=exp_it.get("name", "Document"),
                            vendor=exp_it.get("vendor"),
                            total=exp_it.get("amount"),
                        )
                    )
                title = "Most Expensive Item"
                v_str = f" from {exp_it['vendor']}" if exp_it.get("vendor") else ""
                summary = f"Your most expensive purchased item is '{exp_it['name']}' costing {_fmt_currency(exp_it['amount'])}{v_str}."

                context_dict["most_expensive_item"] = {
                    "name": exp_it["name"],
                    "amount": _fmt_currency(exp_it["amount"]),
                    "quantity": exp_it.get("quantity", 1),
                    "vendor": exp_it.get("vendor"),
                }
                metadata.update({
                    "type": AssistantResultType.MOST_EXPENSIVE_ITEM.value,
                    "item_name": exp_it["name"],
                    "amount": exp_it["amount"],
                    "vendor": exp_it.get("vendor"),
                    "title": title,
                    "summary": summary,
                })
            else:
                title = "No Items Found"
                summary = "No line items found in your library."
                context_dict["error"] = summary
                metadata.update({
                    "type": AssistantResultType.NO_RESULTS.value,
                    "title": title,
                    "summary": summary,
                })

        # 12. Most Expensive Receipt
        elif intent == AssistantIntent.MOST_EXPENSIVE_RECEIPT:
            exp_rec = retrieved_payload.get("most_expensive_receipt")
            if exp_rec:
                sources.append(
                    AssistantSource(
                        document_id=exp_rec.get("document_id"),
                        filename=exp_rec.get("filename", "receipt.pdf"),
                        vendor=exp_rec.get("vendor"),
                        document_date=exp_rec.get("document_date"),
                        total=exp_rec.get("total_amount"),
                    )
                )
                title = "Most Expensive Receipt"
                v_name = exp_rec.get("vendor") or "Unknown Vendor"
                tot_str = _fmt_currency(exp_rec.get("total_amount"))
                d_str = f" on {exp_rec['document_date']}" if exp_rec.get("document_date") else ""
                summary = f"Your most expensive receipt is from {v_name}{d_str} totaling {tot_str}."

                context_dict["most_expensive_receipt"] = {
                    "filename": exp_rec.get("filename"),
                    "vendor": v_name,
                    "date": exp_rec.get("document_date"),
                    "total": tot_str,
                }
                metadata.update({
                    "type": AssistantResultType.MOST_EXPENSIVE_RECEIPT.value,
                    "vendor": v_name,
                    "total_amount": exp_rec.get("total_amount"),
                    "document_date": exp_rec.get("document_date"),
                    "title": title,
                    "summary": summary,
                })
            else:
                title = "No Receipts Found"
                summary = "No receipts found in your library."
                context_dict["error"] = summary
                metadata.update({
                    "type": AssistantResultType.NO_RESULTS.value,
                    "title": title,
                    "summary": summary,
                })

        # 12b. Cheapest Item
        elif intent == AssistantIntent.CHEAPEST_ITEM:
            cheap_it = retrieved_payload.get("cheapest_item")
            if cheap_it:
                doc_id = cheap_it.get("document_id")
                if doc_id:
                    sources.append(
                        AssistantSource(
                            document_id=doc_id,
                            filename=cheap_it.get("filename", "Document"),
                            vendor=cheap_it.get("vendor"),
                            document_date=cheap_it.get("date"),
                            total=cheap_it.get("amount"),
                        )
                    )
                title = "Cheapest Item"
                v_str = f" from {cheap_it['vendor']}" if cheap_it.get("vendor") else ""
                d_str = f" on {cheap_it['date']}" if cheap_it.get("date") else ""
                summary = f"Your cheapest purchased item is '{cheap_it['name']}' costing {_fmt_currency(cheap_it['amount'])}{v_str}{d_str}."

                context_dict["cheapest_item"] = {
                    "name": cheap_it["name"],
                    "unit_price": _fmt_currency(cheap_it.get("unit_price")),
                    "amount": _fmt_currency(cheap_it["amount"]),
                    "quantity": cheap_it.get("quantity", 1),
                    "vendor": cheap_it.get("vendor"),
                    "date": cheap_it.get("date"),
                    "receipt": cheap_it.get("filename"),
                }
                metadata.update({
                    "type": AssistantResultType.CHEAPEST_ITEM.value,
                    "item_name": cheap_it["name"],
                    "amount": cheap_it["amount"],
                    "unit_price": cheap_it.get("unit_price"),
                    "vendor": cheap_it.get("vendor"),
                    "document_date": cheap_it.get("date"),
                    "title": title,
                    "summary": summary,
                })
            else:
                title = "No Items Found"
                summary = "No line items found in your library."
                context_dict["error"] = summary
                metadata.update({
                    "type": AssistantResultType.NO_RESULTS.value,
                    "title": title,
                    "summary": summary,
                })

        # 12c. Cheapest Receipt
        elif intent == AssistantIntent.CHEAPEST_RECEIPT:
            cheap_rec = retrieved_payload.get("cheapest_receipt")
            if cheap_rec:
                sources.append(
                    AssistantSource(
                        document_id=cheap_rec.get("document_id"),
                        filename=cheap_rec.get("filename", "receipt.pdf"),
                        vendor=cheap_rec.get("vendor"),
                        document_date=cheap_rec.get("document_date"),
                        total=cheap_rec.get("total_amount"),
                    )
                )
                title = "Cheapest Receipt"
                v_name = cheap_rec.get("vendor") or "Unknown Vendor"
                tot_str = _fmt_currency(cheap_rec.get("total_amount"))
                d_str = f" on {cheap_rec['document_date']}" if cheap_rec.get("document_date") else ""
                summary = f"Your cheapest receipt is from {v_name}{d_str} totaling {tot_str}."

                context_dict["cheapest_receipt"] = {
                    "filename": cheap_rec.get("filename"),
                    "vendor": v_name,
                    "date": cheap_rec.get("document_date"),
                    "total": tot_str,
                }
                metadata.update({
                    "type": AssistantResultType.CHEAPEST_RECEIPT.value,
                    "vendor": v_name,
                    "total_amount": cheap_rec.get("total_amount"),
                    "document_date": cheap_rec.get("document_date"),
                    "title": title,
                    "summary": summary,
                })
            else:
                title = "No Receipts Found"
                summary = "No receipts found in your library."
                context_dict["error"] = summary
                metadata.update({
                    "type": AssistantResultType.NO_RESULTS.value,
                    "title": title,
                    "summary": summary,
                })

        # 13. Total Spending & Document Count
        elif intent in (AssistantIntent.TOTAL_SPENDING, AssistantIntent.DOCUMENT_COUNT):
            tot_spend = retrieved_payload.get("total_spending") or {}
            tot_amt = tot_spend.get("total_spent", 0.0)
            tot_docs = tot_spend.get("total_documents", 0)

            if intent == AssistantIntent.DOCUMENT_COUNT:
                res_type = AssistantResultType.DOCUMENT_COUNT.value
                title = "Saved Document Count"
                summary = f"You have {tot_docs} saved document{'s' if tot_docs != 1 else ''} in your library."
            else:
                res_type = AssistantResultType.SPENDING_SUMMARY.value
                title = "Total Library Spending"
                summary = f"Your total spending across {tot_docs} receipt{'s' if tot_docs != 1 else ''} is {_fmt_currency(tot_amt)}."

            context_dict["library_summary"] = {
                "total_spent": _fmt_currency(tot_amt),
                "total_documents": tot_docs,
                "processed_documents": tot_spend.get("processed_documents", 0),
                "needs_review": tot_spend.get("needs_review", 0),
            }
            metadata.update({
                "type": res_type,
                "total_spent": tot_amt,
                "total_documents": tot_docs,
                "title": title,
                "summary": summary,
            })

        # 14. Top Vendors
        elif intent == AssistantIntent.TOP_VENDORS:
            top_v = retrieved_payload.get("top_vendors") or []
            title = "Top Spending Vendors"
            summary = (
                f"Your top spending vendor is {top_v[0]['vendor']} with {_fmt_currency(top_v[0]['total_spent'])}."
                if top_v else "No vendor spending data available."
            )
            context_dict["top_vendors"] = [
                {
                    "vendor": v["vendor"],
                    "total_spent": _fmt_currency(v["total_spent"]),
                    "document_count": v["document_count"],
                    "percentage_of_total": f"{v.get('percentage', 0)}%",
                }
                for v in top_v
            ]
            metadata.update({
                "type": AssistantResultType.TOP_VENDORS.value,
                "vendors": top_v,
                "top_vendors": top_v,
                "title": title,
                "summary": summary,
            })

        # 15. Most Frequent Items
        elif intent == AssistantIntent.MOST_FREQUENT_ITEMS:
            freq_i = retrieved_payload.get("most_bought_items") or []
            title = "Most Frequently Purchased Items"
            summary = (
                f"Your most frequently purchased item is {freq_i[0]['name']} (quantity: {freq_i[0]['quantity']})."
                if freq_i else "No item purchase data available."
            )
            context_dict["most_purchased_items"] = [
                {
                    "name": i["name"],
                    "total_quantity": i["quantity"],
                    "document_count": i["document_count"],
                    "total_spent": _fmt_currency(i["total_spent"]),
                }
                for i in freq_i
            ]
            metadata.update({
                "type": AssistantResultType.MOST_FREQUENT_ITEMS.value,
                "items": freq_i,
                "most_frequent_items": freq_i,
                "title": title,
                "summary": summary,
            })

        # 16. General Fallback
        else:
            raw_docs = retrieved_payload.get("recent_documents") or []
            for doc in raw_docs[:5]:
                sources.append(_doc_to_source(doc))
            tot_spend = retrieved_payload.get("total_spending") or {}
            tot_docs = tot_spend.get("total_documents", len(raw_docs))
            tot_amt = tot_spend.get("total_spent", 0.0)
            title = "Library Overview"
            summary = f"Your library contains {tot_docs} saved document{'s' if tot_docs != 1 else ''} totaling {_fmt_currency(tot_amt)}."

            recent_doc_details = []
            for d in raw_docs[:8]:
                ext = d.extraction_result or {}
                items = ext.get("line_items") or []
                recent_doc_details.append({
                    "filename": d.filename,
                    "vendor": ext.get("vendor_company"),
                    "date": ext.get("date"),
                    "total": _fmt_currency(ext.get("total")),
                    "items": [
                        {
                            "description": it.get("description"),
                            "quantity": it.get("quantity"),
                            "unit_price": _fmt_currency(it.get("unit_price")),
                            "line_total": _fmt_currency(it.get("line_total") or it.get("total")),
                        }
                        for it in items if isinstance(it, dict) and it.get("description")
                    ][:12],
                })

            context_dict["library_overview"] = {
                "total_documents": tot_docs,
                "total_spent": _fmt_currency(tot_amt),
                "recent_documents": recent_doc_details,
            }
            metadata.update({
                "type": AssistantResultType.GENERAL_QUERY.value,
                "total_documents": tot_docs,
                "title": title,
                "summary": summary,
            })

        context_json = json.dumps(context_dict, ensure_ascii=False, default=str)
        return context_json, sources, metadata
