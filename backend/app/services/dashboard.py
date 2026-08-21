"""Dashboard, Analytics, and Quality & Review Intelligence service for STRUCTRA."""

import asyncio
import calendar
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import re
import time
from typing import Any
from uuid import UUID

from app.core.config import Settings
from app.schemas.dashboard import (
    ConfidenceDistribution,
    DashboardConfidence,
    DashboardHighlights,
    DashboardQualityResponse,
    DashboardResponse,
    DashboardSummary,
    HighestSpendVendorSummary,
    ItemAnalyticsResponse,
    MostBoughtItemSummary,
    MostExpensiveItemSummary,
    MostExpensiveReceiptSummary,
    PurchaseHighlightsResponse,
    PurchasedItem,
    RecentDocumentItem,
    RecentDocumentsResponse,
    ReviewQueueItem,
    ReviewQueueResponse,
    SpendingAnalyticsResponse,
    SpendingPeriod,
    SpendingPoint,
    TopVendorSummary,
    VendorAnalyticsResponse,
    VendorSpending,
)
from app.services.document_metadata import CreatedDocumentMetadata, SELECT_DOCUMENT_FIELDS, _get_document_metadata


_CURRENCY_QUANTUM = Decimal("0.01")

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%d-%m-%Y",
    "%m-%d-%Y",
    "%Y/%m/%d",
    "%d.%m.%Y",
    "%m.%d.%Y",
    "%d %b %Y",
    "%d %B %Y",
    "%b %d, %Y",
    "%B %d, %Y",
    "%b %d %Y",
    "%B %d %Y",
    "%d-%b-%Y",
    "%d-%B-%Y",
    # 2-digit years
    "%d/%m/%y",
    "%m/%d/%y",
    "%d-%m-%y",
    "%m-%d-%y",
    "%y-%m-%d",
    "%d.%m.%y",
    "%m.%d.%y",
    "%d %b %y",
    "%d %B %y",
    "%b %d, %y",
    "%B %d, %y",
    "%b %d %y",
    "%d-%b-%y",
    "%d-%B-%y",
)


def parse_decimal_safe(val: Any) -> Decimal | None:
    """Parse a value safely to Decimal, stripping currency formatting and handling negatives."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        try:
            return Decimal(str(val))
        except Exception:
            return None
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        is_negative = False
        if s.startswith("(") and s.endswith(")"):
            is_negative = True
            s = s[1:-1].strip()
        s = s.replace("−", "-").replace("–", "-").replace("—", "-")
        if "-" in s:
            is_negative = True
        cleaned = re.sub(r"[^\d.]", "", s)
        try:
            if not cleaned:
                return None
            d = Decimal(cleaned)
            return -d if is_negative else d
        except Exception:
            return None
    return None


def _normalize_text(val: str | None) -> str:
    """Normalize text for deterministic key grouping (lowercase, collapsed spaces)."""
    return " ".join((val or "").casefold().split())


def parse_document_date(date_val: Any, fallback_dt: datetime | None = None) -> date | None:
    """Parse extracted document date safely and deterministically.
    
    Tries common date formats (including 2-digit years). If missing or unparseable,
    falls back to fallback_dt.date().
    """
    if isinstance(date_val, date) and not isinstance(date_val, datetime):
        return date_val
    if isinstance(date_val, datetime):
        return date_val.date()

    if isinstance(date_val, str) and date_val.strip():
        s = date_val.strip()
        # ISO timestamp check (e.g. 2026-03-15T10:00:00)
        if "T" in s or len(s) >= 19:
            try:
                clean_iso = s.replace("Z", "+00:00")
                dt = datetime.fromisoformat(clean_iso)
                return dt.date()
            except Exception:
                pass

        # Try standard date formats
        for fmt in _DATE_FORMATS:
            try:
                dt = datetime.strptime(s, fmt)
                return dt.date()
            except Exception:
                continue

        # Regex fallback for YYYY-MM-DD or YY-MM-DD or DD/MM/YYYY or DD/MM/YY
        m_ymd = re.match(r"^(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})$", s)
        if m_ymd:
            try:
                y = int(m_ymd.group(1))
                m = int(m_ymd.group(2))
                d = int(m_ymd.group(3))
                if y < 100:
                    y += 2000
                return date(y, m, d)
            except Exception:
                pass

        m_dmy = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$", s)
        if m_dmy:
            try:
                d_val = int(m_dmy.group(1))
                m_val = int(m_dmy.group(2))
                y_val = int(m_dmy.group(3))
                if y_val < 100:
                    y_val += 2000
                if m_val > 12 >= d_val:
                    d_val, m_val = m_val, d_val
                return date(y_val, m_val, d_val)
            except Exception:
                pass

    if fallback_dt is not None:
        if isinstance(fallback_dt, datetime):
            return fallback_dt.date()
        if isinstance(fallback_dt, date):
            return fallback_dt

    return None


_USER_DOCS_INFLIGHT: dict[str, asyncio.Future] = {}


def invalidate_dashboard_cache(user_id: str | None = None) -> None:
    """Invalidate in-flight references."""
    _USER_DOCS_INFLIGHT.clear()


async def _fetch_user_documents(user_id: str, settings: Settings) -> list[CreatedDocumentMetadata]:
    """Fetch all persisted library documents for the authenticated user with real-time request coalescing."""
    # 1. Join in-flight fetch if another parallel endpoint is already querying Supabase
    if user_id in _USER_DOCS_INFLIGHT:
        try:
            return await _USER_DOCS_INFLIGHT[user_id]
        except Exception:
            pass

    # 2. Launch single in-flight fetch and share among all parallel requests
    loop = asyncio.get_running_loop()
    fut = loop.create_future()
    _USER_DOCS_INFLIGHT[user_id] = fut

    try:
        docs = await _get_document_metadata(
            params={
                "select": SELECT_DOCUMENT_FIELDS,
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": "10000",
            },
            settings=settings,
        )
        if not fut.done():
            fut.set_result(docs)
        return docs
    except Exception as err:
        if not fut.done():
            fut.set_exception(err)
        raise
    finally:
        _USER_DOCS_INFLIGHT.pop(user_id, None)


# ─── Canonical Quality & Review Helpers ───────────────────────────────────────

def get_effective_confidence_level(
    quality_result: dict[str, Any] | None,
    status: str = "completed",
) -> str | None:
    """Determine effective confidence level with strict priority:
    confidence_override -> system_confidence_level -> confidence_level -> score derivation.
    """
    if quality_result:
        # 1. Manual confidence override
        override = quality_result.get("confidence_override")
        if override and isinstance(override, str) and override.strip():
            up = override.strip().upper()
            if up in ("HIGH", "MEDIUM", "LOW"):
                return up

        # 2. System evaluated confidence level
        sys_level = quality_result.get("system_confidence_level")
        if sys_level and isinstance(sys_level, str) and sys_level.strip():
            up = sys_level.strip().upper()
            if up in ("HIGH", "MEDIUM", "LOW"):
                return up

        # 3. Legacy confidence level
        legacy_level = quality_result.get("confidence_level")
        if legacy_level and isinstance(legacy_level, str) and legacy_level.strip():
            up = legacy_level.strip().upper()
            if up in ("HIGH", "MEDIUM", "LOW"):
                return up

        # 4. Numeric score derivation
        score_val = quality_result.get("overall_confidence")
        if score_val is None:
            score_val = quality_result.get("system_confidence")
        if score_val is not None:
            try:
                s = float(score_val)
                if s >= 0.80:
                    return "HIGH"
                elif s >= 0.55:
                    return "MEDIUM"
                else:
                    return "LOW"
            except (ValueError, TypeError):
                pass

    if status == "completed":
        return "HIGH"
    if status == "failed":
        return "LOW"
    return None


def get_document_review_state(
    quality_result: dict[str, Any] | None,
    effective_conf: str | None,
    status: str = "completed",
) -> bool:
    """Determine whether document requires user attention."""
    if status == "failed":
        return True
    if effective_conf == "HIGH":
        return False
    if effective_conf in ("MEDIUM", "LOW"):
        return True
    return bool((quality_result or {}).get("needs_review", False))


def get_effective_confidence_score(quality_result: dict[str, Any] | None) -> float | None:
    """Extract raw numeric system confidence score if available."""
    if quality_result:
        s = quality_result.get("system_confidence")
        if s is None:
            s = quality_result.get("overall_confidence")
        if s is not None:
            try:
                return float(s)
            except (ValueError, TypeError):
                pass
    return None


# ─── Milestone 7.1 Master Dashboard Aggregation ───────────────────────────────

async def get_user_dashboard_data(
    *,
    user_id: str,
    settings: Settings,
) -> DashboardResponse:
    """Aggregate dashboard metrics exclusively from the authenticated user's persisted documents."""
    records = await _fetch_user_documents(user_id, settings)

    total_documents = len(records)
    total_amount_spent_dec = Decimal("0.00")
    processed_documents = 0
    needs_review_documents = 0

    high_count = 0
    medium_count = 0
    low_count = 0

    vendor_stats: dict[str, dict[str, Any]] = {}
    item_stats: dict[str, dict[str, Any]] = {}

    most_expensive_item_record: dict[str, Any] | None = None
    most_expensive_receipt_record: dict[str, Any] | None = None

    for doc in records:
        ext = doc.extraction_result or {}
        qual = doc.quality_result or {}

        clean_conf = get_effective_confidence_level(qual, doc.status)
        doc_needs_review = get_document_review_state(qual, clean_conf, doc.status)

        if clean_conf == "HIGH":
            high_count += 1
        elif clean_conf == "MEDIUM":
            medium_count += 1
        elif clean_conf == "LOW":
            low_count += 1

        if doc.status == "completed":
            if doc_needs_review:
                needs_review_documents += 1
            else:
                processed_documents += 1
        elif doc.status == "failed":
            needs_review_documents += 1

        # Document Total & Most Expensive Receipt
        raw_doc_total = ext.get("total")
        doc_total_dec = parse_decimal_safe(raw_doc_total)

        if doc_total_dec is not None and doc_total_dec >= Decimal("0"):
            total_amount_spent_dec += doc_total_dec

            if doc_total_dec > Decimal("0"):
                if (
                    most_expensive_receipt_record is None
                    or doc_total_dec > most_expensive_receipt_record["total_dec"]
                    or (
                        doc_total_dec == most_expensive_receipt_record["total_dec"]
                        and doc.created_at > most_expensive_receipt_record["created_at"]
                    )
                ):
                    raw_vendor_val = ext.get("vendor_company")
                    vendor_name_val = str(raw_vendor_val).strip() if (raw_vendor_val and isinstance(raw_vendor_val, str) and raw_vendor_val.strip()) else None
                    most_expensive_receipt_record = {
                        "document_id": doc.id,
                        "filename": doc.filename,
                        "vendor": vendor_name_val,
                        "document_date": ext.get("date"),
                        "total_dec": doc_total_dec,
                        "confidence_level": clean_conf,
                        "needs_review": doc_needs_review,
                        "created_at": doc.created_at,
                    }

        # Vendor Aggregation
        raw_vendor = ext.get("vendor_company")
        if raw_vendor and isinstance(raw_vendor, str) and raw_vendor.strip():
            clean_vendor_str = raw_vendor.strip()
            norm_vendor_key = _normalize_text(clean_vendor_str)
            if norm_vendor_key:
                if norm_vendor_key not in vendor_stats:
                    vendor_stats[norm_vendor_key] = {
                        "display_name": clean_vendor_str,
                        "count": 0,
                        "total_spent": Decimal("0.00"),
                    }
                vendor_stats[norm_vendor_key]["count"] += 1
                if doc_total_dec is not None and doc_total_dec > Decimal("0"):
                    vendor_stats[norm_vendor_key]["total_spent"] += doc_total_dec

        # Line Items Aggregation
        raw_items = ext.get("line_items")
        if isinstance(raw_items, list):
            for item in raw_items:
                if not isinstance(item, dict):
                    continue
                raw_desc = item.get("description")
                if not raw_desc or not isinstance(raw_desc, str) or not raw_desc.strip():
                    continue

                clean_item_desc = raw_desc.strip()
                norm_item_key = _normalize_text(clean_item_desc)
                if not norm_item_key:
                    continue

                raw_qty = item.get("quantity")
                qty_dec = parse_decimal_safe(raw_qty)
                if qty_dec is None or qty_dec <= Decimal("0"):
                    qty_dec = Decimal("1.0")

                if norm_item_key not in item_stats:
                    item_stats[norm_item_key] = {
                        "display_name": clean_item_desc,
                        "quantity": Decimal("0.0"),
                        "count": 0,
                    }
                item_stats[norm_item_key]["quantity"] += qty_dec
                item_stats[norm_item_key]["count"] += 1

                raw_lt = item.get("line_total")
                item_amount_dec = parse_decimal_safe(raw_lt)
                if item_amount_dec is None or item_amount_dec <= Decimal("0"):
                    raw_up = item.get("unit_price")
                    up_dec = parse_decimal_safe(raw_up)
                    if up_dec is not None and up_dec > Decimal("0"):
                        item_amount_dec = up_dec * qty_dec

                if item_amount_dec is not None and item_amount_dec > Decimal("0"):
                    raw_vendor_val = ext.get("vendor_company")
                    item_vendor = str(raw_vendor_val).strip() if (raw_vendor_val and isinstance(raw_vendor_val, str) and raw_vendor_val.strip()) else None

                    if (
                        most_expensive_item_record is None
                        or item_amount_dec > most_expensive_item_record["amount_dec"]
                        or (
                            item_amount_dec == most_expensive_item_record["amount_dec"]
                            and clean_item_desc.casefold() < most_expensive_item_record["name"].casefold()
                        )
                    ):
                        most_expensive_item_record = {
                            "name": clean_item_desc,
                            "amount_dec": item_amount_dec,
                            "quantity": float(qty_dec),
                            "vendor": item_vendor,
                            "document_id": doc.id,
                        }

    # Highlights Resolutions
    top_vendor_summary: TopVendorSummary | None = None
    if vendor_stats:
        sorted_by_count = sorted(
            vendor_stats.values(),
            key=lambda v: (-v["count"], -v["total_spent"], v["display_name"].casefold()),
        )
        top_v = sorted_by_count[0]
        top_vendor_summary = TopVendorSummary(
            name=top_v["display_name"],
            document_count=top_v["count"],
        )

    highest_spend_vendor_summary: HighestSpendVendorSummary | None = None
    spending_vendors = [v for v in vendor_stats.values() if v["total_spent"] > Decimal("0")]
    if spending_vendors:
        sorted_by_spend = sorted(
            spending_vendors,
            key=lambda v: (-v["total_spent"], -v["count"], v["display_name"].casefold()),
        )
        h_spend = sorted_by_spend[0]
        spend_float = float(h_spend["total_spent"].quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))
        highest_spend_vendor_summary = HighestSpendVendorSummary(
            name=h_spend["display_name"],
            total_spent=spend_float,
            document_count=h_spend["count"],
        )

    most_bought_item_summary: MostBoughtItemSummary | None = None
    if item_stats:
        sorted_by_qty = sorted(
            item_stats.values(),
            key=lambda i: (-i["quantity"], -i["count"], i["display_name"].casefold()),
        )
        top_item = sorted_by_qty[0]
        qty_float = float(top_item["quantity"])
        most_bought_item_summary = MostBoughtItemSummary(
            name=top_item["display_name"],
            quantity=qty_float,
            document_count=top_item["count"],
        )

    most_expensive_item_summary: MostExpensiveItemSummary | None = None
    if most_expensive_item_record is not None:
        amt_float = float(most_expensive_item_record["amount_dec"].quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))
        most_expensive_item_summary = MostExpensiveItemSummary(
            name=most_expensive_item_record["name"],
            amount=amt_float,
            quantity=most_expensive_item_record["quantity"],
            vendor=most_expensive_item_record["vendor"],
            document_id=most_expensive_item_record["document_id"],
        )

    most_expensive_receipt_summary: MostExpensiveReceiptSummary | None = None
    if most_expensive_receipt_record is not None:
        rec_total_float = float(most_expensive_receipt_record["total_dec"].quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))
        most_expensive_receipt_summary = MostExpensiveReceiptSummary(
            document_id=most_expensive_receipt_record["document_id"],
            filename=most_expensive_receipt_record["filename"],
            vendor=most_expensive_receipt_record["vendor"],
            document_date=most_expensive_receipt_record["document_date"],
            total_amount=rec_total_float,
            confidence_level=most_expensive_receipt_record["confidence_level"],
            needs_review=most_expensive_receipt_record["needs_review"],
        )

    evaluated_total = high_count + medium_count + low_count
    overall_confidence_level = None
    if evaluated_total > 0:
        if high_count >= medium_count and high_count >= low_count:
            overall_confidence_level = "HIGH"
        elif medium_count >= low_count:
            overall_confidence_level = "MEDIUM"
        else:
            overall_confidence_level = "LOW"

    total_spent_float = float(total_amount_spent_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))

    return DashboardResponse(
        summary=DashboardSummary(
            total_documents=total_documents,
            total_amount_spent=total_spent_float,
            processed_documents=processed_documents,
            needs_review_documents=needs_review_documents,
        ),
        highlights=DashboardHighlights(
            top_vendor=top_vendor_summary,
            highest_spend_vendor=highest_spend_vendor_summary,
            most_bought_item=most_bought_item_summary,
            most_expensive_item=most_expensive_item_summary,
            most_expensive_receipt=most_expensive_receipt_summary,
        ),
        confidence=DashboardConfidence(
            overall_level=overall_confidence_level,
            distribution=ConfidenceDistribution(
                high=high_count,
                medium=medium_count,
                low=low_count,
            ),
        ),
    )


# ─── Milestone 7.2 Spending Over Time Analytics ──────────────────────────────

# Display limits for each granularity as per specification:
# DAY: latest ~7–8 relevant date buckets
# WEEK: latest ~3–5 week buckets
# MONTH: latest ~5–7 month buckets
# YEAR: latest ~5–7 year buckets
_SPENDING_BUCKET_LIMITS: dict[SpendingPeriod, int | None] = {
    "day": 8,
    "week": 4,
    "month": 7,
    "year": None,  # Cover ALL receipts across all years
}


async def get_user_spending_analytics(
    *,
    user_id: str,
    period: SpendingPeriod,
    settings: Settings,
) -> SpendingAnalyticsResponse:
    """Aggregate spending over time chronologically into day, week, month, or year buckets.
    
    1. Filter valid documents with non-negative totals and parseable dates.
    2. Aggregate ALL documents by requested time granularity (day, week, month, year) BEFORE limiting.
    3. Chronologically sort buckets (oldest to newest).
    4. Select the latest N buckets according to mode display limits (DAY: ~8, WEEK: ~5, MONTH: ~7, YEAR: ~7).
    5. Calculate visible total_spent and doc_count strictly matching visible points.
    """
    records = await _fetch_user_documents(user_id, settings)

    # 1. Filter usable documents with valid amounts and dates
    valid_docs: list[tuple[date, Decimal]] = []
    for doc in records:
        ext = doc.extraction_result or {}
        raw_total = ext.get("total")
        doc_total_dec = parse_decimal_safe(raw_total)

        if doc_total_dec is not None and doc_total_dec >= Decimal("0"):
            doc_date = parse_document_date(ext.get("date"), fallback_dt=doc.created_at)
            if doc_date is not None:
                valid_docs.append((doc_date, doc_total_dec))

    if not valid_docs:
        return SpendingAnalyticsResponse(
            period=period,
            data=[],
            total_spent=0.0,
        )

    # 2. Aggregate ALL documents by requested period granularity BEFORE limiting
    buckets_map: dict[str, dict[str, Any]] = {}

    for doc_date, amount_dec in valid_docs:
        if period == "day":
            key = doc_date.isoformat()
            if key not in buckets_map:
                buckets_map[key] = {
                    "start_date": key,
                    "end_date": key,
                    "label": doc_date.strftime("%d %b %Y"),
                    "amount_dec": Decimal("0.00"),
                    "doc_count": 0,
                    "sort_key": doc_date,
                }
            buckets_map[key]["amount_dec"] += amount_dec
            buckets_map[key]["doc_count"] += 1

        elif period == "week":
            mon = doc_date - timedelta(days=doc_date.weekday())
            sun = mon + timedelta(days=6)
            iso_year, iso_week, _ = doc_date.isocalendar()
            key = f"{iso_year:04d}-W{iso_week:02d}"
            if key not in buckets_map:
                buckets_map[key] = {
                    "start_date": mon.isoformat(),
                    "end_date": sun.isoformat(),
                    "label": f"{mon.strftime('%d %b')} - {sun.strftime('%d %b %Y')}",
                    "amount_dec": Decimal("0.00"),
                    "doc_count": 0,
                    "sort_key": mon,
                }
            buckets_map[key]["amount_dec"] += amount_dec
            buckets_map[key]["doc_count"] += 1

        elif period == "month":
            key = f"{doc_date.year:04d}-{doc_date.month:02d}"
            if key not in buckets_map:
                st = date(doc_date.year, doc_date.month, 1)
                _, last_day = calendar.monthrange(doc_date.year, doc_date.month)
                en = date(doc_date.year, doc_date.month, last_day)
                buckets_map[key] = {
                    "start_date": st.isoformat(),
                    "end_date": en.isoformat(),
                    "label": st.strftime("%b %Y"),
                    "amount_dec": Decimal("0.00"),
                    "doc_count": 0,
                    "sort_key": st,
                }
            buckets_map[key]["amount_dec"] += amount_dec
            buckets_map[key]["doc_count"] += 1

        elif period == "year":
            key = str(doc_date.year)
            if key not in buckets_map:
                st = date(doc_date.year, 1, 1)
                en = date(doc_date.year, 12, 31)
                buckets_map[key] = {
                    "start_date": st.isoformat(),
                    "end_date": en.isoformat(),
                    "label": key,
                    "amount_dec": Decimal("0.00"),
                    "doc_count": 0,
                    "sort_key": st,
                }
            buckets_map[key]["amount_dec"] += amount_dec
            buckets_map[key]["doc_count"] += 1

    # 3. Sort buckets chronologically (oldest to newest)
    sorted_buckets = sorted(buckets_map.values(), key=lambda b: b["sort_key"])

    # 4. Slicing: select latest N buckets based on granularity limit (or all if None)
    limit = _SPENDING_BUCKET_LIMITS.get(period)
    visible_buckets = sorted_buckets[-limit:] if limit is not None else sorted_buckets

    # 5. Compute total_spent strictly as the sum of visible points in the series
    visible_total_dec = sum((b["amount_dec"] for b in visible_buckets), Decimal("0.00"))
    total_spent_float = float(visible_total_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))

    points = [
        SpendingPoint(
            label=b["label"],
            start_date=b["start_date"],
            end_date=b["end_date"],
            amount=float(b["amount_dec"].quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)),
            document_count=b["doc_count"],
        )
        for b in visible_buckets
    ]

    return SpendingAnalyticsResponse(
        period=period,
        data=points,
        total_spent=total_spent_float,
    )


# ─── Milestone 7.2 Vendor Spending Analytics ──────────────────────────────────

async def get_user_vendor_analytics(
    *,
    user_id: str,
    limit: int = 10,
    settings: Settings,
) -> VendorAnalyticsResponse:
    """Rank user vendors by total spending and calculate percentage of overall spend."""
    records = await _fetch_user_documents(user_id, settings)

    vendor_stats: dict[str, dict[str, Any]] = {}
    total_user_spent_dec = Decimal("0.00")

    for doc in records:
        ext = doc.extraction_result or {}
        doc_total_dec = parse_decimal_safe(ext.get("total"))

        if doc_total_dec is not None and doc_total_dec > Decimal("0"):
            total_user_spent_dec += doc_total_dec

        raw_vendor = ext.get("vendor_company")
        if raw_vendor and isinstance(raw_vendor, str) and raw_vendor.strip():
            clean_vendor_str = raw_vendor.strip()
            norm_vendor_key = _normalize_text(clean_vendor_str)
            if norm_vendor_key:
                if norm_vendor_key not in vendor_stats:
                    vendor_stats[norm_vendor_key] = {
                        "display_name": clean_vendor_str,
                        "count": 0,
                        "total_spent": Decimal("0.00"),
                    }
                vendor_stats[norm_vendor_key]["count"] += 1
                if doc_total_dec is not None and doc_total_dec > Decimal("0"):
                    vendor_stats[norm_vendor_key]["total_spent"] += doc_total_dec

    sorted_vendors = sorted(
        vendor_stats.values(),
        key=lambda v: (-v["total_spent"], -v["count"], v["display_name"].casefold()),
    )

    sliced_vendors = sorted_vendors[:limit]
    vendor_models: list[VendorSpending] = []

    for v in sliced_vendors:
        spent_float = float(v["total_spent"].quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))
        if total_user_spent_dec > Decimal("0"):
            pct = float(round((v["total_spent"] / total_user_spent_dec) * Decimal("100"), 2))
        else:
            pct = 0.0

        vendor_models.append(
            VendorSpending(
                vendor=v["display_name"],
                total_spent=spent_float,
                document_count=v["count"],
                percentage_of_total=pct,
            )
        )

    total_spent_float = float(total_user_spent_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))

    return VendorAnalyticsResponse(
        vendors=vendor_models,
        total_spent=total_spent_float,
    )


# ─── Milestone 7.2 Purchased Items Analytics ─────────────────────────────────

async def get_user_item_analytics(
    *,
    user_id: str,
    limit: int = 10,
    settings: Settings,
) -> ItemAnalyticsResponse:
    """Aggregate user's line items by quantity purchased, document occurrences, and line spending."""
    records = await _fetch_user_documents(user_id, settings)

    item_stats: dict[str, dict[str, Any]] = {}

    for doc in records:
        ext = doc.extraction_result or {}
        raw_items = ext.get("line_items")
        if isinstance(raw_items, list):
            for item in raw_items:
                if not isinstance(item, dict):
                    continue
                raw_desc = item.get("description")
                if not raw_desc or not isinstance(raw_desc, str) or not raw_desc.strip():
                    continue

                clean_item_desc = raw_desc.strip()
                norm_item_key = _normalize_text(clean_item_desc)
                if not norm_item_key:
                    continue

                raw_qty = item.get("quantity")
                qty_dec = parse_decimal_safe(raw_qty)
                if qty_dec is None or qty_dec <= Decimal("0"):
                    qty_dec = Decimal("1.0")

                raw_lt = item.get("line_total")
                item_amount_dec = parse_decimal_safe(raw_lt)
                if item_amount_dec is None or item_amount_dec <= Decimal("0"):
                    raw_up = item.get("unit_price")
                    up_dec = parse_decimal_safe(raw_up)
                    if up_dec is not None and up_dec > Decimal("0"):
                        item_amount_dec = up_dec * qty_dec

                if norm_item_key not in item_stats:
                    item_stats[norm_item_key] = {
                        "display_name": clean_item_desc,
                        "quantity": Decimal("0.0"),
                        "doc_ids": set(),
                        "total_spent": Decimal("0.00"),
                    }

                item_stats[norm_item_key]["quantity"] += qty_dec
                item_stats[norm_item_key]["doc_ids"].add(str(doc.id))
                if item_amount_dec is not None and item_amount_dec > Decimal("0"):
                    item_stats[norm_item_key]["total_spent"] += item_amount_dec

    sorted_items = sorted(
        item_stats.values(),
        key=lambda i: (-i["quantity"], -i["total_spent"], i["display_name"].casefold()),
    )

    sliced_items = sorted_items[:limit]
    item_models: list[PurchasedItem] = []
    total_item_spend_dec = Decimal("0.00")

    for i in sliced_items:
        spent_float = float(i["total_spent"].quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))
        total_item_spend_dec += i["total_spent"]
        item_models.append(
            PurchasedItem(
                name=i["display_name"],
                quantity=float(i["quantity"]),
                document_count=len(i["doc_ids"]),
                total_spent=spent_float,
            )
        )

    total_item_spend_float = float(total_item_spend_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP))

    return ItemAnalyticsResponse(
        items=item_models,
        total_item_spend=total_item_spend_float,
    )


# ─── Milestone 7.2 Purchase Highlights ────────────────────────────────────────

async def get_user_highlights(
    *,
    user_id: str,
    settings: Settings,
) -> PurchaseHighlightsResponse:
    """Retrieve purchase highlights (most expensive item and most expensive receipt)."""
    dash_resp = await get_user_dashboard_data(user_id=user_id, settings=settings)
    return PurchaseHighlightsResponse(
        most_expensive_item=dash_resp.highlights.most_expensive_item,
        most_expensive_receipt=dash_resp.highlights.most_expensive_receipt,
    )


# ─── Milestone 7.3 Quality & Review Intelligence ──────────────────────────────

async def get_user_quality_summary(
    *,
    user_id: str,
    settings: Settings,
) -> DashboardQualityResponse:
    """Aggregate overall library quality, review counts, and confidence distribution."""
    records = await _fetch_user_documents(user_id, settings)

    total_documents = len(records)
    high_count = 0
    medium_count = 0
    low_count = 0
    review_count = 0
    scores: list[float] = []

    for doc in records:
        qual = doc.quality_result or {}
        eff_conf = get_effective_confidence_level(qual, doc.status)
        needs_rev = get_document_review_state(qual, eff_conf, doc.status)

        if needs_rev:
            review_count += 1

        if eff_conf == "HIGH":
            high_count += 1
        elif eff_conf == "MEDIUM":
            medium_count += 1
        elif eff_conf == "LOW":
            low_count += 1

        score = get_effective_confidence_score(qual)
        if score is not None:
            scores.append(score)

    evaluated_total = high_count + medium_count + low_count
    overall_confidence_level = None
    if evaluated_total > 0:
        if high_count >= medium_count and high_count >= low_count:
            overall_confidence_level = "HIGH"
        elif medium_count >= low_count:
            overall_confidence_level = "MEDIUM"
        else:
            overall_confidence_level = "LOW"

    avg_score = round(sum(scores) / len(scores), 2) if scores else None

    return DashboardQualityResponse(
        overall_level=overall_confidence_level,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        total_documents=total_documents,
        review_count=review_count,
        average_system_confidence=avg_score,
        distribution=ConfidenceDistribution(
            high=high_count,
            medium=medium_count,
            low=low_count,
        ),
    )


async def get_user_review_queue(
    *,
    user_id: str,
    limit: int = 10,
    settings: Settings,
) -> ReviewQueueResponse:
    """Retrieve ranked queue of documents currently requiring review."""
    records = await _fetch_user_documents(user_id, settings)

    review_candidates: list[dict[str, Any]] = []

    for doc in records:
        ext = doc.extraction_result or {}
        qual = doc.quality_result or {}

        eff_conf = get_effective_confidence_level(qual, doc.status)
        needs_rev = get_document_review_state(qual, eff_conf, doc.status)

        if needs_rev or eff_conf == "LOW":
            raw_total = ext.get("total")
            tot_dec = parse_decimal_safe(raw_total)
            tot_float = float(tot_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if tot_dec is not None else None

            raw_v = ext.get("vendor_company")
            vendor_name = str(raw_v).strip() if (raw_v and isinstance(raw_v, str) and raw_v.strip()) else None

            raw_date = ext.get("date")
            doc_date_str = str(raw_date).strip() if (raw_date and isinstance(raw_date, str) and raw_date.strip()) else None

            review_candidates.append({
                "document_id": doc.id,
                "filename": doc.filename,
                "vendor": vendor_name,
                "document_date": doc_date_str,
                "total_amount": tot_float,
                "confidence_level": eff_conf,
                "needs_review": True,
                "created_at": doc.created_at,
                "processed_at": doc.processed_at,
                # Sorting priority: LOW before MEDIUM, newest first, then doc.id ASC
                "priority_rank": 0 if eff_conf == "LOW" else 1,
            })

    # Sort: priority_rank ASC (LOW first), created_at DESC (newest first), document_id ASC
    sorted_candidates = sorted(
        review_candidates,
        key=lambda r: (r["priority_rank"], -(r["created_at"].timestamp() if r["created_at"] else 0), str(r["document_id"])),
    )

    sliced = sorted_candidates[:limit]
    items = [
        ReviewQueueItem(
            document_id=c["document_id"],
            filename=c["filename"],
            vendor=c["vendor"],
            document_date=c["document_date"],
            total_amount=c["total_amount"],
            confidence_level=c["confidence_level"],
            needs_review=c["needs_review"],
            created_at=c["created_at"],
            processed_at=c["processed_at"],
        )
        for c in sliced
    ]

    return ReviewQueueResponse(
        items=items,
        total_review_needed=len(review_candidates),
    )


async def get_user_recent_documents(
    *,
    user_id: str,
    limit: int = 10,
    settings: Settings,
) -> RecentDocumentsResponse:
    """Retrieve recently saved documents sorted newest first."""
    records = await _fetch_user_documents(user_id, settings)

    # Sort newest first, then doc.id ASC
    sorted_records = sorted(
        records,
        key=lambda d: (-(d.created_at.timestamp() if d.created_at else 0), str(d.id)),
    )

    sliced_records = sorted_records[:limit]
    items: list[RecentDocumentItem] = []

    for doc in sliced_records:
        ext = doc.extraction_result or {}
        qual = doc.quality_result or {}

        eff_conf = get_effective_confidence_level(qual, doc.status)
        needs_rev = get_document_review_state(qual, eff_conf, doc.status)

        raw_total = ext.get("total")
        tot_dec = parse_decimal_safe(raw_total)
        tot_float = float(tot_dec.quantize(_CURRENCY_QUANTUM, rounding=ROUND_HALF_UP)) if tot_dec is not None else None

        raw_v = ext.get("vendor_company")
        vendor_name = str(raw_v).strip() if (raw_v and isinstance(raw_v, str) and raw_v.strip()) else None

        raw_date = ext.get("date")
        doc_date_str = str(raw_date).strip() if (raw_date and isinstance(raw_date, str) and raw_date.strip()) else None

        items.append(
            RecentDocumentItem(
                document_id=doc.id,
                filename=doc.filename,
                vendor=vendor_name,
                document_date=doc_date_str,
                total_amount=tot_float,
                confidence_level=eff_conf,
                needs_review=needs_rev,
                created_at=doc.created_at,
                processed_at=doc.processed_at,
            )
        )

    return RecentDocumentsResponse(
        documents=items,
        total=len(records),
    )
