"""Document retrieval and deterministic analytics service for the AI Assistant.

Queries completed documents exclusively scoped to the authenticated user via _fetch_user_documents.
Performs deterministic calculations (totals, item counts, quantities, highlights)
in Python using Decimal rather than delegating arithmetic to the LLM.
"""

from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Any

from app.core.config import Settings
from app.services.dashboard import (
    _fetch_user_documents,
    _normalize_text,
    get_user_dashboard_data,
    get_user_item_analytics,
    get_user_vendor_analytics,
    parse_decimal_safe,
    parse_document_date,
)
from app.services.document_metadata import CreatedDocumentMetadata

_CURRENCY_QUANTUM = Decimal("0.01")


def _canonical_name(text: str | None) -> str:
    """Normalize string by removing all punctuation, hyphens, and whitespace."""
    if not text:
        return ""
    return re.sub(r"[^\w]", "", text).lower()


def _vendor_matches(doc_vendor: str | None, query_vendor: str | None) -> bool:
    """Check if document vendor matches query vendor with punctuation-tolerant token matching."""
    if not doc_vendor or not query_vendor:
        return False

    canon_doc = _canonical_name(doc_vendor)
    canon_query = _canonical_name(query_vendor)
    if not canon_doc or not canon_query:
        return False

    # Exact canonical match (e.g. "D-Mart" == "DMart" == "d mart")
    if canon_doc == canon_query:
        return True

    # Substring / token matching if safe
    norm_doc = _normalize_text(doc_vendor)
    norm_query = _normalize_text(query_vendor)

    doc_tokens = set(norm_doc.split())
    query_tokens = set(norm_query.split())

    # If query is a single token, ensure whole word match or prefix match in doc
    if len(query_tokens) == 1:
        q_token = next(iter(query_tokens))
        if q_token in doc_tokens:
            return True
        if canon_query in canon_doc and len(canon_query) >= 4:
            return True
        return False

    # If query has multiple tokens, all query tokens should be present
    if query_tokens.issubset(doc_tokens):
        return True

    return False


_CATEGORY_WORDS = {
    "chocolate", "chocolates", "chololate", "chololates", "choclate", "choclates",
    "drink", "drinks", "packet", "packets", "biscuit", "biscuits", "chips",
    "soap", "soaps", "oil", "oils", "bar", "bars", "item", "items",
    "snack", "snacks", "pack", "packs", "bottle", "bottles", "box", "boxes",
    "piece", "pieces", "can", "cans", "product", "products", "good", "goods",
}


def _item_matches(item_desc: str | None, query_item: str | None) -> bool:
    """Check if line item description matches query item text using word boundaries and stem matching.
    
    Prevents false substring positives (e.g. 'egg' will match 'Fresh Eggs' but not 'Eggplant').
    """
    if not item_desc or not query_item:
        return False

    norm_desc = _normalize_text(item_desc)
    norm_query = _normalize_text(query_item)
    if not norm_desc or not norm_query:
        return False

    # Exact normalized match
    if norm_query == norm_desc:
        return True

    # Strip simple plural 's' ending from query for stem matching
    stem = norm_query[:-1] if norm_query.endswith("s") and len(norm_query) > 2 else norm_query

    # Safe word-boundary regex matching: \b{stem}(?:s|es)?\b
    pattern = r"\b" + re.escape(stem) + r"(?:s|es)?\b"
    if re.search(pattern, norm_desc, re.IGNORECASE):
        return True

    # Multi-word token matching
    tokens = [t for t in norm_query.split() if len(t) > 1]
    if len(tokens) > 1:
        all_matched = True
        for t in tokens:
            t_stem = t[:-1] if t.endswith("s") and len(t) > 2 else t
            t_pat = r"\b" + re.escape(t_stem) + r"(?:s|es)?\b"
            if not re.search(t_pat, norm_desc, re.IGNORECASE):
                all_matched = False
                break
        if all_matched:
            return True

        # Check if non-category distinctive tokens match
        distinctive_tokens = [t for t in tokens if t not in _CATEGORY_WORDS and len(t) > 2]
        if distinctive_tokens:
            all_dist_matched = True
            for t in distinctive_tokens:
                t_stem = t[:-1] if t.endswith("s") and len(t) > 2 else t
                t_pat = r"\b" + re.escape(t_stem) + r"(?:s|es)?\b"
                if not re.search(t_pat, norm_desc, re.IGNORECASE):
                    all_dist_matched = False
                    break
            if all_dist_matched:
                return True

    return False


class AssistantRetrievalService:
    """Retrieval service providing deterministic query & calculation methods for user documents."""

    def __init__(self, user_id: str, settings: Settings) -> None:
        """Initialize retrieval service for a specific authenticated user."""
        self.user_id = str(user_id)
        self.settings = settings

    async def get_all_documents(self) -> list[CreatedDocumentMetadata]:
        """Fetch all persisted completed documents for the user."""
        raw_docs = await _fetch_user_documents(self.user_id, self.settings)
        # Exclude in-progress / failed / unsaved documents to enforce persistence boundary
        return [d for d in raw_docs if getattr(d, "status", None) == "completed"]

    async def check_vendor_ambiguity(self, vendor: str) -> tuple[bool, list[str]]:
        """Detect whether a vendor query matches multiple distinct vendors in the user's library.
        
        Returns:
            (is_ambiguous, list_of_matching_display_names)
        """
        if not vendor:
            return False, []

        docs = await self.get_all_documents()
        matched_vendors: dict[str, str] = {}  # canonical -> display_name

        for d in docs:
            ext = d.extraction_result or {}
            v_name = ext.get("vendor_company")
            if v_name and isinstance(v_name, str) and v_name.strip():
                clean_v = v_name.strip()
                if _vendor_matches(clean_v, vendor):
                    canon = _canonical_name(clean_v)
                    if canon not in matched_vendors:
                        matched_vendors[canon] = clean_v

        distinct_candidates = list(matched_vendors.values())
        if len(distinct_candidates) > 1:
            return True, distinct_candidates
        return False, distinct_candidates

    async def get_latest_document(
        self,
        vendor: str | None = None,
    ) -> CreatedDocumentMetadata | None:
        """Retrieve the most recent document following STRUCTRA document date policy."""
        docs = await self.get_all_documents()
        if not docs:
            return None

        if vendor:
            filtered = [
                d for d in docs
                if _vendor_matches((d.extraction_result or {}).get("vendor_company"), vendor)
            ]
            if not filtered:
                return None
            docs = filtered

        def sort_key(d: CreatedDocumentMetadata):
            ext = d.extraction_result or {}
            doc_date = parse_document_date(ext.get("date"), fallback_dt=d.created_at)
            ts = doc_date.toordinal() if doc_date else 0
            created_ts = d.created_at.timestamp() if d.created_at else 0
            doc_id_str = str(d.id)
            return (ts, created_ts, doc_id_str)

        sorted_docs = sorted(docs, key=sort_key, reverse=True)
        return sorted_docs[0] if sorted_docs else None

    async def get_documents_by_vendor(
        self,
        vendor: str,
        limit: int = 20,
    ) -> list[CreatedDocumentMetadata]:
        """Retrieve documents for a specific vendor, newest first."""
        docs = await self.get_all_documents()
        matched = [
            d for d in docs
            if _vendor_matches((d.extraction_result or {}).get("vendor_company"), vendor)
        ]

        def sort_key(d: CreatedDocumentMetadata):
            ext = d.extraction_result or {}
            doc_date = parse_document_date(ext.get("date"), fallback_dt=d.created_at)
            ts = doc_date.toordinal() if doc_date else 0
            created_ts = d.created_at.timestamp() if d.created_at else 0
            return (ts, created_ts)

        sorted_docs = sorted(matched, key=sort_key, reverse=True)
        return sorted_docs[:limit]

    async def get_documents_by_date_range(
        self,
        start_date: date,
        end_date: date,
    ) -> list[CreatedDocumentMetadata]:
        """Retrieve documents within a specific date range."""
        docs = await self.get_all_documents()
        matched = []
        for d in docs:
            ext = d.extraction_result or {}
            doc_d = parse_document_date(ext.get("date"), fallback_dt=d.created_at)
            if doc_d and start_date <= doc_d <= end_date:
                matched.append(d)

        def sort_key(d: CreatedDocumentMetadata):
            ext = d.extraction_result or {}
            doc_date = parse_document_date(ext.get("date"), fallback_dt=d.created_at)
            ts = doc_date.toordinal() if doc_date else 0
            created_ts = d.created_at.timestamp() if d.created_at else 0
            return (ts, created_ts)

        return sorted(matched, key=sort_key, reverse=True)

    async def search_line_items(
        self,
        item_query: str,
        vendor: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Search line items across all documents matching item_query with safe boundary matching."""
        docs = await self.get_all_documents()
        results: list[dict[str, Any]] = []

        for doc in docs:
            ext = doc.extraction_result or {}
            doc_vendor = ext.get("vendor_company")
            if vendor and not _vendor_matches(doc_vendor, vendor):
                continue

            raw_items = ext.get("line_items") or []
            if not isinstance(raw_items, list):
                continue

            for item in raw_items:
                if not isinstance(item, dict):
                    continue
                desc = item.get("description")
                if not _item_matches(desc, item_query):
                    continue

                raw_qty = item.get("quantity")
                qty_dec = parse_decimal_safe(raw_qty)
                if qty_dec is None or qty_dec <= Decimal("0"):
                    qty_dec = Decimal("1.0")

                raw_up = item.get("unit_price")
                up_dec = parse_decimal_safe(raw_up)

                raw_lt = item.get("line_total") or item.get("total")
                lt_dec = parse_decimal_safe(raw_lt)
                if lt_dec is None and up_dec is not None:
                    lt_dec = up_dec * qty_dec
                elif up_dec is None and lt_dec is not None and qty_dec > Decimal("0"):
                    up_dec = lt_dec / qty_dec

                results.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "vendor": doc_vendor,
                    "document_date": ext.get("date"),
                    "item_name": desc.strip() if desc else "Unknown Item",
                    "quantity": float(qty_dec),
                    "unit_price": float(up_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if up_dec is not None else None,
                    "total": float(lt_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if lt_dec is not None else None,
                })
                if len(results) >= limit:
                    break
            if len(results) >= limit:
                break

        return results

    async def calculate_vendor_spending(self, vendor: str) -> dict[str, Any]:
        """Calculate total spending, receipt count, and matching documents for a vendor deterministically."""
        docs = await self.get_documents_by_vendor(vendor)
        total_dec = Decimal("0.00")
        display_vendor = vendor

        for d in docs:
            ext = d.extraction_result or {}
            v_name = ext.get("vendor_company")
            if v_name and isinstance(v_name, str) and v_name.strip():
                display_vendor = v_name.strip()
            raw_tot = ext.get("total")
            d_dec = parse_decimal_safe(raw_tot)
            if d_dec is not None and d_dec > Decimal("0"):
                total_dec += d_dec

        total_float = float(total_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))
        return {
            "vendor": display_vendor,
            "total_spent": total_float,
            "document_count": len(docs),
            "documents": docs,
        }

    async def calculate_total_spending(self) -> dict[str, Any]:
        """Calculate overall library spending and document counts deterministically."""
        docs = await self.get_all_documents()
        total_dec = Decimal("0.00")

        for d in docs:
            ext = d.extraction_result or {}
            raw_tot = ext.get("total")
            d_dec = parse_decimal_safe(raw_tot)
            if d_dec is not None and d_dec > Decimal("0"):
                total_dec += d_dec

        total_float = float(total_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))
        return {
            "total_spent": total_float,
            "total_documents": len(docs),
            "processed_documents": len(docs),
            "needs_review": 0,
        }

    async def calculate_item_quantities(
        self,
        item_query: str,
        vendor: str | None = None,
    ) -> dict[str, Any]:
        """Calculate total quantity purchased and total spend for an item deterministically."""
        items = await self.search_line_items(item_query, vendor=vendor)
        total_qty = Decimal("0.0")
        total_spend = Decimal("0.00")
        doc_ids = set()

        for item in items:
            total_qty += Decimal(str(item["quantity"]))
            if item.get("total") is not None:
                total_spend += Decimal(str(item["total"]))
            doc_ids.add(str(item["document_id"]))

        return {
            "item_query": item_query,
            "total_quantity": float(total_qty),
            "total_spent": float(total_spend.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
            "document_count": len(doc_ids),
            "occurrences": len(items),
            "items": items,
        }

    async def get_most_expensive_item(self) -> dict[str, Any] | None:
        """Find the single most expensive line item across user's completed documents."""
        docs = await self.get_all_documents()
        most_exp: dict[str, Any] | None = None

        for doc in docs:
            ext = doc.extraction_result or {}
            raw_vendor = ext.get("vendor_company")
            vendor_str = str(raw_vendor).strip() if (raw_vendor and isinstance(raw_vendor, str)) else None
            raw_items = ext.get("line_items") or []
            if not isinstance(raw_items, list):
                continue

            for item in raw_items:
                if not isinstance(item, dict):
                    continue
                desc = item.get("description")
                if not desc or not isinstance(desc, str) or not desc.strip():
                    continue

                raw_qty = item.get("quantity")
                qty_dec = parse_decimal_safe(raw_qty) or Decimal("1.0")

                raw_lt = item.get("line_total") or item.get("total")
                amt_dec = parse_decimal_safe(raw_lt)
                if amt_dec is None:
                    raw_up = item.get("unit_price")
                    up_dec = parse_decimal_safe(raw_up)
                    if up_dec is not None:
                        amt_dec = up_dec * qty_dec

                if amt_dec is not None and amt_dec > Decimal("0"):
                    if (
                        most_exp is None
                        or amt_dec > most_exp["amount_dec"]
                        or (amt_dec == most_exp["amount_dec"] and desc.casefold() < most_exp["name"].casefold())
                    ):
                        most_exp = {
                            "name": desc.strip(),
                            "amount_dec": amt_dec,
                            "amount": float(amt_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                            "quantity": float(qty_dec),
                            "vendor": vendor_str,
                            "document_id": str(doc.id),
                        }

        return most_exp

    async def get_most_expensive_receipt(self) -> dict[str, Any] | None:
        """Find the highest amount receipt across user's completed documents."""
        docs = await self.get_all_documents()
        most_exp_rec: dict[str, Any] | None = None

        for doc in docs:
            ext = doc.extraction_result or {}
            tot_dec = parse_decimal_safe(ext.get("total"))
            if tot_dec is not None and tot_dec > Decimal("0"):
                if (
                    most_exp_rec is None
                    or tot_dec > most_exp_rec["total_dec"]
                    or (tot_dec == most_exp_rec["total_dec"] and doc.created_at > most_exp_rec["created_at"])
                ):
                    raw_v = ext.get("vendor_company")
                    vendor_str = str(raw_v).strip() if (raw_v and isinstance(raw_v, str)) else None
                    most_exp_rec = {
                        "total_dec": tot_dec,
                        "document_id": str(doc.id),
                        "filename": doc.filename,
                        "vendor": vendor_str,
                        "document_date": ext.get("date"),
                        "total_amount": float(tot_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                        "created_at": doc.created_at,
                    }

        return most_exp_rec

    async def get_cheapest_item(self, vendor: str | None = None) -> dict[str, Any] | None:
        """Find the single lowest price/amount line item across user's completed documents."""
        if vendor:
            docs = await self.get_documents_by_vendor(vendor)
        else:
            docs = await self.get_all_documents()

        cheapest_it: dict[str, Any] | None = None

        for doc in docs:
            ext = doc.extraction_result or {}
            raw_vendor = ext.get("vendor_company")
            vendor_str = str(raw_vendor).strip() if (raw_vendor and isinstance(raw_vendor, str)) else None
            doc_date = ext.get("date")
            raw_items = ext.get("line_items") or []
            if not isinstance(raw_items, list):
                continue

            for item in raw_items:
                if not isinstance(item, dict):
                    continue
                desc = item.get("description") or item.get("item")
                if not desc or not isinstance(desc, str) or not desc.strip():
                    continue

                raw_qty = item.get("quantity")
                qty_dec = parse_decimal_safe(raw_qty) or Decimal("1.0")

                raw_lt = item.get("line_total") or item.get("total")
                amt_dec = parse_decimal_safe(raw_lt)
                raw_up = item.get("unit_price")
                up_dec = parse_decimal_safe(raw_up)

                if amt_dec is None and up_dec is not None:
                    amt_dec = up_dec * qty_dec
                elif up_dec is None and amt_dec is not None and qty_dec > Decimal("0"):
                    up_dec = amt_dec / qty_dec

                eval_dec = up_dec if up_dec is not None and up_dec > Decimal("0") else amt_dec

                if eval_dec is not None and eval_dec > Decimal("0"):
                    if (
                        cheapest_it is None
                        or eval_dec < cheapest_it["amount_dec"]
                        or (eval_dec == cheapest_it["amount_dec"] and desc.casefold() < cheapest_it["name"].casefold())
                    ):
                        cheapest_it = {
                            "name": desc.strip(),
                            "amount_dec": eval_dec,
                            "amount": float(eval_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                            "unit_price": float(up_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if up_dec is not None else float(eval_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                            "total": float(amt_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if amt_dec is not None else float(eval_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                            "quantity": float(qty_dec),
                            "vendor": vendor_str,
                            "date": doc_date,
                            "document_id": str(doc.id),
                            "filename": doc.filename,
                        }

        return cheapest_it

    async def get_cheapest_receipt(self, vendor: str | None = None) -> dict[str, Any] | None:
        """Find the lowest amount receipt across user's completed documents."""
        if vendor:
            docs = await self.get_documents_by_vendor(vendor)
        else:
            docs = await self.get_all_documents()

        cheapest_rec: dict[str, Any] | None = None

        for doc in docs:
            ext = doc.extraction_result or {}
            tot_dec = parse_decimal_safe(ext.get("total"))
            if tot_dec is not None and tot_dec > Decimal("0"):
                if (
                    cheapest_rec is None
                    or tot_dec < cheapest_rec["total_dec"]
                    or (tot_dec == cheapest_rec["total_dec"] and doc.created_at > cheapest_rec["created_at"])
                ):
                    raw_v = ext.get("vendor_company")
                    vendor_str = str(raw_v).strip() if (raw_v and isinstance(raw_v, str)) else None
                    cheapest_rec = {
                        "total_dec": tot_dec,
                        "document_id": str(doc.id),
                        "filename": doc.filename,
                        "vendor": vendor_str,
                        "document_date": ext.get("date"),
                        "total_amount": float(tot_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                        "created_at": doc.created_at,
                    }

        return cheapest_rec

    async def get_document_count(self, vendor: str | None = None) -> int:
        """Return count of completed documents, optionally filtered by vendor."""
        if vendor:
            docs = await self.get_documents_by_vendor(vendor)
            return len(docs)
        docs = await self.get_all_documents()
        return len(docs)

    async def get_top_vendors(self, limit: int = 5) -> list[dict[str, Any]]:
        """Retrieve ranked top vendors by spending."""
        v_analytics = await get_user_vendor_analytics(user_id=self.user_id, limit=limit, settings=self.settings)
        return [
            {
                "vendor": v.vendor,
                "total_spent": v.total_spent,
                "document_count": v.document_count,
                "percentage": v.percentage_of_total,
            }
            for v in v_analytics.vendors
        ]

    async def get_most_bought_items(self, limit: int = 5) -> list[dict[str, Any]]:
        """Retrieve top purchased items by quantity."""
        i_analytics = await get_user_item_analytics(user_id=self.user_id, limit=limit, settings=self.settings)
        return [
            {
                "name": i.name,
                "quantity": i.quantity,
                "document_count": i.document_count,
                "total_spent": i.total_spent,
            }
            for i in i_analytics.items
        ]

    async def compare_vendors(self, vendor_a: str, vendor_b: str) -> dict[str, Any]:
        """Deterministically compare spending, receipts, and delta between two vendors."""
        v_a = await self.calculate_vendor_spending(vendor_a)
        v_b = await self.calculate_vendor_spending(vendor_b)

        tot_a_dec = Decimal(str(v_a["total_spent"]))
        tot_b_dec = Decimal(str(v_b["total_spent"]))
        diff_dec = abs(tot_a_dec - tot_b_dec)

        higher_v = None
        if tot_a_dec > tot_b_dec:
            higher_v = v_a["vendor"] or vendor_a
        elif tot_b_dec > tot_a_dec:
            higher_v = v_b["vendor"] or vendor_b

        return {
            "vendor_a": v_a["vendor"] or vendor_a,
            "vendor_a_spent": v_a["total_spent"],
            "vendor_a_count": v_a["document_count"],
            "vendor_a_docs": v_a["documents"],
            "vendor_b": v_b["vendor"] or vendor_b,
            "vendor_b_spent": v_b["total_spent"],
            "vendor_b_count": v_b["document_count"],
            "vendor_b_docs": v_b["documents"],
            "difference": float(diff_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
            "higher_vendor": higher_v,
        }

    async def get_filtered_documents(
        self,
        vendor: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        min_amount: float | None = None,
        max_amount: float | None = None,
    ) -> list[CreatedDocumentMetadata]:
        """Retrieve completed documents filtered deterministically by vendor, date bounds, and amount bounds."""
        if vendor:
            docs = await self.get_documents_by_vendor(vendor)
        else:
            docs = await self.get_all_documents()

        filtered: list[CreatedDocumentMetadata] = []
        for doc in docs:
            ext = doc.extraction_result or {}

            # Amount filter
            if min_amount is not None or max_amount is not None:
                tot_dec = parse_decimal_safe(ext.get("total"))
                if tot_dec is None:
                    continue
                if min_amount is not None and tot_dec < Decimal(str(min_amount)):
                    continue
                if max_amount is not None and tot_dec > Decimal(str(max_amount)):
                    continue

            # Date filter
            if start_date is not None or end_date is not None:
                raw_d = ext.get("date")
                parsed_d = parse_document_date(raw_d) if raw_d else None
                if not parsed_d:
                    continue
                d_iso = parsed_d.strftime("%Y-%m-%d")
                if start_date is not None and d_iso < start_date:
                    continue
                if end_date is not None and d_iso > end_date:
                    continue

            filtered.append(doc)

        return filtered

    async def get_filtered_line_items(
        self,
        item_query: str | None = None,
        vendor: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        min_amount: float | None = None,
        max_amount: float | None = None,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        """Retrieve completed line items filtered deterministically by price/amount bounds, item query, vendor, and date."""
        if vendor:
            docs = await self.get_documents_by_vendor(vendor)
        else:
            docs = await self.get_all_documents()

        matched_items: list[dict[str, Any]] = []

        min_dec = Decimal(str(min_amount)) if min_amount is not None else None
        max_dec = Decimal(str(max_amount)) if max_amount is not None else None

        for doc in docs:
            ext = doc.extraction_result or {}
            doc_date_str = ext.get("date")
            doc_vendor = ext.get("vendor_company") or "Unknown Vendor"

            # Date filter
            if start_date is not None or end_date is not None:
                parsed_d = parse_document_date(doc_date_str) if doc_date_str else None
                if not parsed_d:
                    continue
                d_iso = parsed_d.strftime("%Y-%m-%d")
                if start_date is not None and d_iso < start_date:
                    continue
                if end_date is not None and d_iso > end_date:
                    continue

            raw_items = ext.get("line_items") or ext.get("items") or ext.get("products") or []
            if not isinstance(raw_items, list):
                continue

            for it in raw_items:
                if not isinstance(it, dict):
                    continue
                desc = it.get("description") or it.get("item") or it.get("name") or it.get("product") or it.get("title") or ""
                if not desc or not isinstance(desc, str) or not desc.strip():
                    continue

                if item_query and not _item_matches(desc, item_query):
                    continue

                raw_qty = it.get("quantity") or it.get("qty") or it.get("count")
                qty_dec = parse_decimal_safe(raw_qty) or Decimal("1.0")

                raw_lt = it.get("line_total") or it.get("total") or it.get("amount")
                amt_dec = parse_decimal_safe(raw_lt)
                raw_up = it.get("unit_price") or it.get("price") or it.get("rate") or it.get("unit_rate") or it.get("item_price")
                up_dec = parse_decimal_safe(raw_up)

                if amt_dec is None and up_dec is not None:
                    amt_dec = up_dec * qty_dec
                elif up_dec is None and amt_dec is not None and qty_dec > Decimal("0"):
                    up_dec = amt_dec / qty_dec
                elif amt_dec is None and up_dec is None:
                    continue

                # An item is in the requested price range if EITHER:
                # 1) Its unit_price is within [min_amount, max_amount]
                # 2) Its line_total is within [min_amount, max_amount]
                unit_in_range = True
                if min_dec is not None and (up_dec is None or up_dec < min_dec):
                    unit_in_range = False
                if max_dec is not None and (up_dec is None or up_dec > max_dec):
                    unit_in_range = False

                total_in_range = True
                if min_dec is not None and (amt_dec is None or amt_dec < min_dec):
                    total_in_range = False
                if max_dec is not None and (amt_dec is None or amt_dec > max_dec):
                    total_in_range = False

                if not unit_in_range and not total_in_range:
                    continue

                eval_amount = up_dec if (unit_in_range and up_dec is not None) else (amt_dec or Decimal("0.0"))

                matched_items.append({
                    "item_name": desc.strip(),
                    "quantity": float(qty_dec),
                    "unit_price": float(up_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if up_dec is not None else None,
                    "total": float(amt_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if amt_dec is not None else float(eval_amount.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                    "amount": float(eval_amount.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                    "vendor": str(doc_vendor).strip(),
                    "document_date": doc_date_str,
                    "date": doc_date_str,
                    "filename": doc.filename,
                    "document_id": str(doc.id),
                })
                if len(matched_items) >= limit:
                    break
            if len(matched_items) >= limit:
                break

        return matched_items

    async def get_item_history(
        self,
        item_query: str,
        vendor: str | None = None,
    ) -> dict[str, Any]:
        """Retrieve detailed purchase history for a specific line item."""
        if vendor:
            docs = await self.get_documents_by_vendor(vendor)
        else:
            docs = await self.get_all_documents()

        total_qty_dec = Decimal("0.0")
        total_spend_dec = Decimal("0.0")
        matching_docs: list[CreatedDocumentMetadata] = []
        purchases: list[dict[str, Any]] = []
        vendors_seen: set[str] = set()
        latest_date: str | None = None

        for doc in docs:
            ext = doc.extraction_result or {}
            items = ext.get("line_items") or []
            v_name = ext.get("vendor_company") or "Unknown Vendor"
            d_str = ext.get("date")

            doc_matched = False
            for it in items:
                if not isinstance(it, dict):
                    continue
                desc = it.get("description") or it.get("item") or ""
                if _item_matches(desc, item_query):
                    doc_matched = True
                    raw_qty = it.get("quantity") or 1.0
                    qty_dec = parse_decimal_safe(raw_qty) or Decimal("1.0")

                    raw_lt = it.get("line_total") or it.get("total")
                    amt_dec = parse_decimal_safe(raw_lt)
                    raw_up = it.get("unit_price")
                    up_dec = parse_decimal_safe(raw_up)

                    if amt_dec is None and up_dec is not None:
                        amt_dec = up_dec * qty_dec
                    elif up_dec is None and amt_dec is not None and qty_dec > Decimal("0"):
                        up_dec = amt_dec / qty_dec
                    elif amt_dec is None:
                        amt_dec = Decimal("0.0")

                    total_qty_dec += qty_dec
                    total_spend_dec += amt_dec
                    vendors_seen.add(v_name)

                    purchases.append({
                        "item_name": desc,
                        "quantity": float(qty_dec),
                        "unit_price": float(up_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if up_dec is not None else None,
                        "total": float(amt_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
                        "vendor": v_name,
                        "date": d_str,
                        "document_id": str(doc.id),
                        "filename": doc.filename,
                    })

            if doc_matched:
                matching_docs.append(doc)
                if d_str and (latest_date is None or d_str > latest_date):
                    latest_date = d_str

        return {
            "item_query": item_query,
            "total_quantity": float(total_qty_dec),
            "total_spent": float(total_spend_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
            "document_count": len(matching_docs),
            "latest_date": latest_date,
            "vendors": sorted(list(vendors_seen)),
            "purchases": purchases,
            "documents": matching_docs,
        }
