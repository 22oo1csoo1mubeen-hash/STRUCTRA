"""Intent and query understanding layer for the AI Assistant.

Performs deterministic query classification, entity extraction, temporal resolution,
amount filtering, vendor comparison detection, and conversational follow-up resolution.
"""

import calendar
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from enum import Enum
import re
from typing import Any


class AssistantIntent(str, Enum):
    """Classified user intent for document intelligence querying."""

    LATEST_RECEIPT_ITEMS = "LATEST_RECEIPT_ITEMS"
    LATEST_RECEIPT = "LATEST_RECEIPT"
    OLDEST_RECEIPT = "OLDEST_RECEIPT"
    OLDEST_ITEM = "OLDEST_ITEM"
    VENDOR_ITEMS = "VENDOR_ITEMS"
    VENDOR_SPENDING = "VENDOR_SPENDING"
    ITEM_QUANTITY = "ITEM_QUANTITY"
    ITEM_SEARCH = "ITEM_SEARCH"
    ITEM_HISTORY = "ITEM_HISTORY"
    MOST_EXPENSIVE_ITEM = "MOST_EXPENSIVE_ITEM"
    MOST_EXPENSIVE_RECEIPT = "MOST_EXPENSIVE_RECEIPT"
    CHEAPEST_ITEM = "CHEAPEST_ITEM"
    CHEAPEST_RECEIPT = "CHEAPEST_RECEIPT"
    TOTAL_SPENDING = "TOTAL_SPENDING"
    DOCUMENT_COUNT = "DOCUMENT_COUNT"
    TOP_VENDORS = "TOP_VENDORS"
    MOST_FREQUENT_ITEMS = "MOST_FREQUENT_ITEMS"
    VENDOR_COMPARISON = "VENDOR_COMPARISON"
    FILTERED_RECEIPTS = "FILTERED_RECEIPTS"
    TEMPORAL_SPENDING = "TEMPORAL_SPENDING"
    CLARIFICATION = "CLARIFICATION"
    GENERAL_QUERY = "GENERAL_QUERY"


@dataclass
class ParsedQueryIntent:
    """Structured intent and extracted entities from user natural-language message."""

    intent: AssistantIntent
    vendor: str | None = None
    vendor_b: str | None = None
    item_query: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    min_amount: float | None = None
    max_amount: float | None = None
    temporal_label: str | None = None
    is_latest: bool = False
    is_oldest: bool = False
    is_most_expensive: bool = False
    is_comparison: bool = False
    confidence: float = 1.0
    raw_message: str = ""
    clarification_prompt: str | None = None
    clarification_options: list[str] | None = None


# Common vendor stop-words to prevent false positive extraction
_VENDOR_STOPWORDS = {
    "my", "the", "a", "an", "all", "latest", "recent", "most", "last", "any", "some",
    "document", "documents", "receipt", "receipts", "invoice", "invoices", "bill", "bills",
    "paper", "papers", "statement", "statements", "transaction", "transactions", "entry", "entries",
    "library", "libraries", "items", "item", "purchase", "purchases", "store", "stores", "shop", "shops",
    "month", "year", "today", "yesterday", "supermarket", "there", "that", "it", "those",
    "here", "total", "totals", "spending", "spend", "spent", "cost", "costs", "costing",
    "money", "overall", "highest", "much", "many", "what", "did", "have", "you", "bought",
    "purchased", "uploaded", "here", "found", "saved", "processed", "duplicate", "original",
    "new", "old", "single", "multiple", "first", "second", "one", "two", "both", "either",
    "neither", "other", "another", "exact", "valid", "invalid", "needs", "review", "than",
    "or", "and", "between", "above", "below", "more", "less", "under", "over", "show", "find",
    "get", "list", "view", "see", "display", "search", "give", "tell", "check", "me", "from",
    "at", "with", "by", "in", "to", "ai", "api", "model", "key", "keys", "system", "assistant",
    "service", "provider", "structra", "connection", "trouble", "generating", "answer",
    "price", "prices", "rate", "rates", "quantity", "quantities", "qty", "amount", "amounts",
    "detail", "details", "info", "information", "pricing", "range", "ranges", "bracket", "brackets",
    "hello", "hi", "hey", "greetings", "thanks", "thank", "welcome", "please", "yes", "no",
    "ok", "okay", "bye", "goodbye", "good", "morning", "afternoon", "evening", "night", "test", "help",
    "i", "we", "he", "she", "they", "me", "us", "him", "her", "them", "my", "our", "your", "his", "their",
    "has", "had", "having", "do", "does", "done", "am", "is", "are", "was", "were", "be", "been", "being",
    "got", "take", "took", "taken", "order", "orders", "ordered", "buy", "buys", "buying",
    "where", "when", "why", "which", "who", "whom", "whose", "how", "time", "times", "place", "places", "vendor", "vendors",
    "week", "weeks", "day", "days", "months", "years", "weekend", "weekends", "quarter", "quarters", "recently", "current", "previous",
    "cheap", "cheapest", "chepeast", "least", "lowest", "minimum", "min", "max", "highest", "maximum", "expensive", "costly", "costliest", "smallest", "biggest", "largest",
    "of", "for", "on", "off", "with", "without", "about", "into", "onto", "upon",
    "oldest", "earliest", "first", "starting", "old", "new", "inventory", "collection", "database",
    "record", "records", "archive", "archives", "file", "files", "folder", "folders", "account",
    "accounts", "vault", "cabinet", "storage", "profile", "history", "app", "application", "dashboard",
    "wallet", "docs", "doc",
}

_MONTH_NAMES = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}


def _clean_token(t: str) -> str:
    """Clean punctuation from a word token."""
    return t.strip(".,;:?!'\"()[]{}").lower()


def _extract_vendor(text: str) -> str | None:
    """Extract vendor name from prepositions or compound noun phrases."""
    # 1. Standard prepositions: e.g. "from DMart", "at Reliance", "with Amazon", "in DMart", "to Starbucks"
    m_prep = re.search(
        r"\b(?:from|at|with|by|in|to)\s+(?:your\s+|the\s+|my\s+)?(?:latest\s+|recent\s+|saved\s+)?([A-Za-z0-9&'\.\-]+(?:\s+[A-Za-z0-9&'\.\-]+)?)",
        text,
        re.IGNORECASE,
    )
    if m_prep:
        candidate = m_prep.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in candidate.split()]
        valid_tokens = [
            t for t in tokens
            if _clean_token(t) not in _VENDOR_STOPWORDS
            and len(t) > 1
            and not re.match(r"^\d", t)
            and not re.match(r"^[\d\.\-–—]+$", t)
        ]
        if valid_tokens:
            return " ".join(valid_tokens)

    # 2. Compound noun: e.g. "latest dmart purchases", "dmart receipt", "reliance bill", "amazon spending"
    m_noun = re.search(
        r"\b(?:your\s+|the\s+|my\s+|latest\s+|recent\s+|saved\s+)*([A-Za-z0-9&'\.\-]+)\s+(?:purchases?|receipts?|invoices?|bills?|spending|orders?)\b",
        text,
        re.IGNORECASE,
    )
    if m_noun:
        cand = m_noun.group(1).strip().strip(".,;:?!'\"")
        if _clean_token(cand) not in _VENDOR_STOPWORDS and len(cand) > 1 and not re.match(r"^\d", cand):
            return cand

    return None


def _extract_item_name(text: str) -> str | None:
    """Extract item name with strict word boundary protection and comprehensive natural language patterns."""
    lower = text.lower().strip()

    # Guard: pure numeric/amount range queries or single 4-digit years without item noun
    if re.search(r"^\s*(?:19\d\d|20\d\d)\s*$", lower):
        return None

    clean_amt = text.replace("₹", " ").replace("rs.", " ").replace("rs", " ").replace("inr", " ")
    clean_amt = re.sub(r"(\d+),(\d+)", r"\1\2", clean_amt).strip()
    if re.search(r"^\s*(?:in\s+)?(?:the\s+)?(?:range\s+(?:of\s+|:\s*)?)?\d+(?:\.\d+)?\s*(?:-|–|—|to|and)\s*\d+(?:\.\d+)?(?:\s*(?:range|bracket))?\s*$", clean_amt, re.IGNORECASE):
        return None

    def _sanitize_cand(cand_str: str) -> str | None:
        if not cand_str:
            return None
        cleaned = re.sub(
            r"\b(?:range|ranges|bracket|brackets|in|the|of|to|and|from|between|above|below|under|over|more|less|than|receipt|receipts|invoice|invoices|document|documents|bill|bills|record|records|paper|papers|statement|statements|year|month)\b",
            " ",
            cand_str,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"[\d\s\.\-–—,₹]", "", cleaned)
        if not cleaned:
            return None
        tokens = [
            t.strip(".,;:?!'\"")
            for t in cand_str.split()
            if _clean_token(t) not in _VENDOR_STOPWORDS and not re.match(r"^\d+$", t) and _clean_token(t) not in _MONTH_NAMES and len(t) > 1
        ]
        return " ".join(tokens) if tokens else None

    # 1. "quantity and price of X" / "price and quantity of X"
    m_prop_and = re.search(
        r"(?:price|cost|rate|quantity|qty|amount|details|info|information|pricing)\s+(?:and|&)\s+(?:price|cost|rate|quantity|qty|amount|details|info|information|pricing)\s+of\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in|on|for)\b|[?.]|$)",
        lower,
    )
    if m_prop_and:
        res = _sanitize_cand(m_prop_and.group(1))
        if res:
            return res

    # 2. "price of X" / "cost of X" / "quantity of X" / "rate of X" / "amount of X"
    m_prop_of = re.search(
        r"\b(?:price|cost|rate|quantity|qty|amount|details|info|information|pricing)\s+of\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in|on|for)\b|[?.]|$)",
        lower,
    )
    if m_prop_of:
        res = _sanitize_cand(m_prop_of.group(1))
        if res:
            return res

    # 3. "what is/was/are the price/cost/rate/quantity/total of/for X"
    m_what_prop = re.search(
        r"what\s+(?:is|was|are|were)\s+(?:the\s+)?(?:price|cost|rate|quantity|qty|amount|total)\s+(?:of|for)\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in|on)\b|[?.]|$)",
        lower,
    )
    if m_what_prop:
        res = _sanitize_cand(m_what_prop.group(1))
        if res:
            return res

    # 4. "where / from where / when / which store did i buy/bought X"
    m_where_when = re.search(
        r"(?:from\s+)?(?:where|when|which\s+(?:store|vendor|shop|place)|what\s+(?:store|vendor|shop|place))\s+(?:did\s+i|have\s+i|i\s+have|i|was|were)\s+(?:last\s+)?(?:buy|bought|purchase|purchased|get|got|order|ordered)\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:last\s+time|recently|before|yesterday|at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_where_when:
        res = _sanitize_cand(m_where_when.group(1))
        if res:
            return res

    # 5. "how much is/was X"
    m_how_much_item = re.search(
        r"how\s+much\s+(?:is|was|are|were)\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in|cost|costing)\b|[?.]|$)",
        lower,
    )
    if m_how_much_item:
        res = _sanitize_cand(m_how_much_item.group(1))
        if res:
            return res

    # 6. "how much did X cost"
    m_item_cost = re.search(
        r"how\s+much\s+did\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)\s+cost(?:\s+me)?(?:\s+(?:at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_item_cost:
        res = _sanitize_cand(m_item_cost.group(1))
        if res:
            return res

    # 7. "how many X did I buy"
    m_many = re.search(
        r"how\s+many\s+(?:units\s+of\s+|packs\s+of\s+|packets\s+of\s+|boxes\s+of\s+|bottles\s+of\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:did\s+i|have\s+i|i\s+have|i\s+did|i\s+bought|i\s+purchased|i\s+got|were|was|bought|purchased|spend|cost|at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_many:
        res = _sanitize_cand(m_many.group(1))
        if res:
            return res

    # 8. "did I buy X" / "have I bought X" / "i bought X"
    if not re.search(r"^\s*what\s+(?:did\s+i|have\s+i|i)\s+(?:buy|bought|get|purchase|order)\b", lower):
        m_did_buy = re.search(
            r"\b(?:did\s+i|have\s+i|i\s+have|i)\s+(?:buy|bought|purchase|purchased|get|got|order|ordered)\s+(?:the\s+|a\s+|an\s+|any\s+|some\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:last\s+time|recently|from|at|in|before|yesterday|between|under|above|below|more|less)\b|[?.]|$)",
            lower,
        )
        if m_did_buy:
            res = _sanitize_cand(m_did_buy.group(1))
            if res:
                return res

    # 9. "did I pay for X" / "spend on X"
    m_pay_for = re.search(
        r"(?:did\s+i|have\s+i|i)\s+(?:pay|spend)\s+(?:for|on)\s+([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_pay_for:
        res = _sanitize_cand(m_pay_for.group(1))
        if res:
            return res

    # 10. Item name before amount filter: e.g. "trackpant under 500", "coffee between 100 and 200"
    m_item_filter = re.search(
        r"^(?:show\s+|find\s+|get\s+|list\s+|give\s+)?(?:me\s+)?([A-Za-z\s&'\-]+?)\s+(?:under|below|above|over|between|from|in\s+the\s+range|priced|costing)\s+\d+",
        lower,
    )
    if m_item_filter:
        res = _sanitize_cand(m_item_filter.group(1))
        if res and _clean_token(res) not in _VENDOR_STOPWORDS:
            return res

    # Guard: general spending inquiries
    if re.search(r"how\s+much\s+(?:did\s+i\s+spend|have\s+i\s+spent|did\s+that\s+cost|was\s+spent|spent|in\s+total|overall)", lower):
        m_on = re.search(r"spend\s+on\s+([A-Za-z0-9\s]+?)(?:\s+(?:at|from|in)\b|[?.]|$)", lower)
        if m_on:
            cand = m_on.group(1).strip()
            tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS and not re.match(r"^\d+$", t)]
            if tokens:
                return " ".join(tokens)
        return None

    # 10. "tell me about X" / "show me X" / "find X" / "search for X" / "lookup X" / "info about X"
    m_lookup = re.search(
        r"\b(?:tell\s+me\s+about|info\s+(?:about|on)|information\s+(?:about|on)|show\s+me|find|search\s+for|lookup)\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_lookup:
        cand = m_lookup.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS and not re.match(r"^\d+$", t)]
        if tokens:
            return " ".join(tokens)

    # 11. "X quantity and price" / "X price and quantity" / "X price" / "X cost" / "X quantity" / "X rate"
    m_suffix = re.search(
        r"^([A-Za-z0-9\s&'\-]+?)\s+(?:quantity\s+and\s+price|price\s+and\s+quantity|price|cost|quantity|qty|rate)(?:\s+(?:at|from|in)\s+[A-Za-z0-9\s&'\-]+)?\??$",
        lower,
    )
    if m_suffix:
        cand = m_suffix.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS and not re.match(r"^\d+$", t)]
        if tokens:
            return " ".join(tokens)

    # 12. "what did I buy that contains eggs", "receipts containing coffee"
    m_contains = re.search(
        r"\b(?:contains?|containing|with|for)\s+([A-Za-z0-9\s]+?)(?:\s+(?:in|from|at|for)\b|[?.]|$)",
        text,
        re.IGNORECASE,
    )
    if m_contains:
        item = m_contains.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in item.split() if _clean_token(t) not in _VENDOR_STOPWORDS and not re.match(r"^\d+$", t)]
        if tokens:
            return " ".join(tokens)

    # 13. Single noun or short phrase that is purely an item name (e.g. "crunchy salad", "brownie", "ginger ale")
    tokens = [t.strip(".,;:?!'\"") for t in lower.split()]
    valid_tokens = [
        t for t in tokens
        if _clean_token(t) not in _VENDOR_STOPWORDS
        and len(t) > 1
        and not re.match(r"^\d+$", t)
        and _clean_token(t) not in _MONTH_NAMES
    ]
    if len(tokens) <= 4 and valid_tokens and len(valid_tokens) == len(tokens):
        return " ".join(valid_tokens)

    return None


def _resolve_temporal_range(
    text: str,
    now: datetime | None = None,
) -> tuple[str | None, str | None, str | None]:
    """Deterministically convert natural language temporal expressions into ISO date bounds.

    Uses dynamic UTC reference from `now` (never hardcoded).
    Returns (start_date_iso, end_date_iso, temporal_label).
    """
    ref = now or datetime.now(timezone.utc)
    today = ref.date()
    lower = text.lower()

    # 1. "today"
    if re.search(r"\btoday\b", lower):
        d_str = today.strftime("%Y-%m-%d")
        return d_str, d_str, "today"

    # 2. "yesterday"
    if re.search(r"\byesterday\b", lower):
        y_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")
        return y_str, y_str, "yesterday"

    # 3. "this week"
    if re.search(r"\bthis\s+week\b", lower):
        start_w = today - timedelta(days=today.weekday())
        return start_w.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "this week"

    # 4. "last week"
    if re.search(r"\blast\s+week\b", lower):
        start_this_w = today - timedelta(days=today.weekday())
        end_last_w = start_this_w - timedelta(days=1)
        start_last_w = end_last_w - timedelta(days=6)
        return start_last_w.strftime("%Y-%m-%d"), end_last_w.strftime("%Y-%m-%d"), "last week"

    # 5. "this month"
    if re.search(r"\bthis\s+month\b", lower):
        start_m = today.replace(day=1)
        return start_m.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "this month"

    # 6. "last month"
    if re.search(r"\blast\s+month\b", lower):
        first_this_m = today.replace(day=1)
        last_prev_m = first_this_m - timedelta(days=1)
        first_prev_m = last_prev_m.replace(day=1)
        return first_prev_m.strftime("%Y-%m-%d"), last_prev_m.strftime("%Y-%m-%d"), "last month"

    # 7. "this year"
    if re.search(r"\bthis\s+year\b", lower):
        start_y = today.replace(month=1, day=1)
        return start_y.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "this year"

    # 8. "last year"
    if re.search(r"\blast\s+year\b", lower):
        prev_y = today.year - 1
        return f"{prev_y}-01-01", f"{prev_y}-12-31", "last year"

    # 9. "N years ago" (e.g. "2 years ago")
    m_yrs_ago = re.search(r"\b(\d+)\s+years?\s+ago\b", lower)
    if m_yrs_ago:
        n = int(m_yrs_ago.group(1))
        target_year = today.year - n
        return f"{target_year:04d}-01-01", f"{target_year:04d}-12-31", f"{n} years ago"

    # 10. Specific exact date: e.g. "10-Aug-1995", "10 Aug 1995", "10/08/1995", "1995-08-10", "August 10 1995"
    m_exact_date = re.search(
        r"\b(?:on\s+|dated\s+)?(\d{1,2})[\s\-\/\.]([A-Za-z]{3,9}|\d{1,2})[\s\-\/\.](\d{2,4})\b",
        lower,
    )
    if m_exact_date:
        p1, p2, p3 = m_exact_date.group(1), m_exact_date.group(2), m_exact_date.group(3)
        m_num = _MONTH_NAMES.get(p2.lower())
        if m_num:
            d_val = int(p1)
            y_val = int(p3)
            if y_val < 100:
                y_val += 1900 if y_val >= 50 else 2000
            iso_d = f"{y_val:04d}-{m_num:02d}-{d_val:02d}"
            return iso_d, iso_d, f"{d_val} {p2.capitalize()} {y_val}"

    # 11. "in <month>" / "<month> 2026" / "last August"
    for m_name, m_num in _MONTH_NAMES.items():
        if re.search(rf"\b(?:in\s+|last\s+)?{m_name}(?:\s+(\d{{4}}))?\b", lower):
            m_year_match = re.search(rf"\b{m_name}\s+(\d{{4}})\b", lower)
            target_year = int(m_year_match.group(1)) if m_year_match else today.year
            if "last " + m_name in lower and m_num >= today.month and not m_year_match:
                target_year -= 1
            _, last_day = calendar.monthrange(target_year, m_num)
            start_iso = f"{target_year:04d}-{m_num:02d}-01"
            end_iso = f"{target_year:04d}-{m_num:02d}-{last_day:02d}"
            return start_iso, end_iso, m_name.capitalize()

    # 12. "before <year>" / "prior to <year>" / "earlier than <year>" / "until <year>" / "up to <year>"
    m_before_yr = re.search(
        r"\b(?:before|prior\s+to|earlier\s+than|until|up\s+to)\s+(?:year\s+)?(19\d\d|20\d\d)(?:\s+year)?\b",
        lower,
    )
    if m_before_yr and not re.search(r"(?:₹|rs\.?|inr)\s*\d", lower):
        target_y = int(m_before_yr.group(1))
        end_y = target_y - 1 if ("before" in lower or "prior" in lower or "earlier" in lower) else target_y
        return "1970-01-01", f"{end_y:04d}-12-31", f"before {target_y}"

    # 13. "after <year>" / "since <year>" / "from <year> onwards" / "later than <year>"
    m_after_yr = re.search(
        r"\b(?:after|since|later\s+than|from)\s+(?:year\s+)?(19\d\d|20\d\d)(?:\s+(?:onwards|onward|year))?\b",
        lower,
    )
    if m_after_yr and not re.search(r"(?:₹|rs\.?|inr)\s*\d", lower) and ("after" in lower or "since" in lower or "onward" in lower or "later than" in lower):
        target_y = int(m_after_yr.group(1))
        start_y = target_y if ("since" in lower or "from" in lower) else target_y + 1
        return f"{start_y:04d}-01-01", today.strftime("%Y-%m-%d"), f"after {target_y}"

    # 14. Decades: "in the 90s", "in 90s", "in the 80s", "in 2000s", "in 2010s"
    m_decade = re.search(r"\b(?:in\s+(?:the\s+)?)?((?:19)?[89]0s|20[012]0s)\b", lower)
    if m_decade:
        dec_str = m_decade.group(1).rstrip("s")
        dec_num = int(dec_str)
        if dec_num < 100:
            dec_num += 1900
        return f"{dec_num:04d}-01-01", f"{dec_num + 9:04d}-12-31", f"{dec_num}s"

    # 15. Explicit Year Range: e.g. "from 2015 to 2018", "between 2015 and 2020", "2015 - 2018"
    m_yr_range = re.search(
        r"\b(?:between|from|in)?\s*(19\d\d|20\d\d)\s*(?:-|–|—|to|and)\s*(19\d\d|20\d\d)\b",
        lower,
    )
    if m_yr_range and not re.search(r"(?:₹|rs\.?|inr)\s*\d", lower):
        if not re.search(r"\b(?:priced|costing|price\s+range|amount\s+range)\b", lower):
            y1, y2 = int(m_yr_range.group(1)), int(m_yr_range.group(2))
            min_y, max_y = min(y1, y2), max(y1, y2)
            return f"{min_y:04d}-01-01", f"{max_y:04d}-12-31", f"{min_y} - {max_y}"

    # 16. Explicit 4-digit Year: e.g. "from 2015", "in 2015", "of 2015", "for 2015", "during 2016", "dated 2015", "dated on 2015", "year 2015", "2015 receipts", "2016", "receipt which is from year 1995"
    if not re.search(r"\b(?:between|from)\s+\d{1,3}\s+(?:and|to|-)\s+\d+", lower) and not re.search(r"\b\d{1,3}\s*(?:-|to)\s*\d+\b", lower):
        m_year = re.search(
            r"\b(?:from|in|of|for|during|dated(?:\s+on)?|year\s+)?(19\d\d|20\d\d)(?:\s+(?:receipts?|documents?|bills?|invoices?|purchases?|spending|expenses?|year))?\b",
            lower,
        )
        if m_year and not re.search(r"(?:₹|rs\.?|inr)\s*\d", lower):
            target_y = int(m_year.group(1))
            if not re.search(rf"\b(?:range|bracket|above|below|under|over|more|less|greater|priced|costing|cost|bill\s+of|total\s+of)\s+(?:of\s+|than\s+)?{target_y}\b", lower):
                return f"{target_y:04d}-01-01", f"{target_y:04d}-12-31", str(target_y)

    # 17. "recently" / "recent"
    if re.search(r"\b(recently|recent)\b", lower):
        start_rec = today - timedelta(days=30)
        return start_rec.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "recently"

    return None, None, None


def _clean_amount_text(text: str) -> str:
    """Normalize text for amount extraction: remove currency symbols and strip commas in digits."""
    t = text.replace("₹", " ").replace("rs.", " ").replace("rs", " ").replace("inr", " ")
    return re.sub(r"(\d+),(\d+)", r"\1\2", t)


def _extract_amount_filters(text: str) -> tuple[float | None, float | None]:
    """Extract numeric amount filter boundaries (min_amount, max_amount) across all natural language patterns."""
    clean = _clean_amount_text(text)

    # Guard against pure year ranges like "between 2015 and 2018" or "from 2015 to 2018"
    if re.search(r"\b(?:between|from|in)?\s*(?:19\d\d|20\d\d)\s*(?:-|–|—|to|and)\s*(?:19\d\d|20\d\d)\b", clean, re.IGNORECASE):
        if not re.search(r"(?:₹|rs\.?|inr|priced|costing|amount|price\s+range)", clean, re.IGNORECASE):
            return None, None

    # 1. Range with 'range' / 'bracket' keywords:
    # 'in the range 0 - 500', 'in 500 - 1000 range', 'range of 500 to 1000', 'range: 0-500', '0 - 500 range'
    m_range = re.search(
        r"(?:in\s+)?(?:the\s+)?range\s+(?:of\s+|:\s*)?(\d+(?:\.\d+)?)\s*(?:-|–|—|to|and)\s*(\d+(?:\.\d+)?)\b",
        clean,
        re.IGNORECASE,
    )
    if m_range:
        a = float(m_range.group(1))
        b = float(m_range.group(2))
        return min(a, b), max(a, b)

    m_range2 = re.search(
        r"\b(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(?:range|bracket)\b",
        clean,
        re.IGNORECASE,
    )
    if m_range2:
        a = float(m_range2.group(1))
        b = float(m_range2.group(2))
        return min(a, b), max(a, b)

    # 2. 'between X and Y' / 'between X to Y' / 'from X to Y' / 'from X - Y'
    m_between = re.search(
        r"\b(?:between|from)\s+(\d+(?:\.\d+)?)\s*(?:and|to|-|–|—)\s*(\d+(?:\.\d+)?)\b",
        clean,
        re.IGNORECASE,
    )
    if m_between:
        a = float(m_between.group(1))
        b = float(m_between.group(2))
        return min(a, b), max(a, b)

    # 3. Explicit numeric range 'X - Y' when surrounded by price/amount/bought/cost/in context:
    m_num_range = re.search(
        r"(?:in|priced|costing|for|between|at)?\s*(\d+(?:\.\d+)?)\s*(?:-|–|—)\s*(\d+(?:\.\d+)?)\b",
        clean,
        re.IGNORECASE,
    )
    if m_num_range and any(k in text.lower() for k in ["item", "bought", "purchase", "receipt", "price", "range", "cost", "spend", "bill", "order"]):
        a = float(m_num_range.group(1))
        b = float(m_num_range.group(2))
        if a != b:
            return min(a, b), max(a, b)

    # 4. Above / more than / greater than / over / exceeding / at least / min
    m_above = re.search(
        r"\b(?:above|more\s+than|greater\s+than|over|exceeding|at\s+least|min(?:imum)?\s+(?:of\s+)?|costing\s+more\s+than)\s+(\d+(?:\.\d+)?)\b",
        clean,
        re.IGNORECASE,
    )
    if m_above:
        return float(m_above.group(1)), None

    # 5. Below / less than / under / within / up to / at most / max
    m_below = re.search(
        r"\b(?:below|less\s+than|under|within|up\s+to|at\s+most|max(?:imum)?\s+(?:of\s+)?|costing\s+less\s+than|cheaper\s+than)\s+(\d+(?:\.\d+)?)\b",
        clean,
        re.IGNORECASE,
    )
    if m_below:
        return None, float(m_below.group(1))

    return None, None


def _extract_comparison_vendors(text: str) -> tuple[str | None, str | None]:
    """Extract vendor A and vendor B for comparison queries."""
    # Guard against amount filters like "between 500 and 2000"
    if re.search(r"\bbetween\s+\d+\s+and\s+\d+\b", text, re.IGNORECASE):
        return None, None

    # "Did I spend more at DMart or Reliance?" / "Compare DMart and Reliance"
    m_comp = re.search(
        r"\b(?:compare|spend\s+more\s+at|between)\s+([A-Za-z0-9&'\.\-]+)\s+(?:and|or|than)\s+([A-Za-z0-9&'\.\-]+)",
        text,
        re.IGNORECASE,
    )
    if m_comp:
        v1 = m_comp.group(1).strip()
        v2 = m_comp.group(2).strip()
        if not v1.isdigit() and not v2.isdigit():
            if _clean_token(v1) not in _VENDOR_STOPWORDS and _clean_token(v2) not in _VENDOR_STOPWORDS:
                return v1, v2

    m_more = re.search(
        r"\bmore\s+(?:at|from)\s+([A-Za-z0-9&'\.\-]+)\s+(?:than|or)\s+(?:at|from)?\s*([A-Za-z0-9&'\.\-]+)",
        text,
        re.IGNORECASE,
    )
    if m_more:
        v1 = m_more.group(1).strip()
        v2 = m_more.group(2).strip()
        if not v1.isdigit() and not v2.isdigit():
            if _clean_token(v1) not in _VENDOR_STOPWORDS and _clean_token(v2) not in _VENDOR_STOPWORDS:
                return v1, v2

    return None, None


def _resolve_follow_up_context(
    message: str,
    conversation_history: list[dict[str, str]] | None,
) -> tuple[str | None, str | None, bool]:
    """Inspect previous conversation turns to resolve pronouns like 'there', 'that', 'it'.
    
    Prioritizes explicit user queries first to avoid extracting noise from LLM replies.
    """
    if not conversation_history:
        return None, None, False

    resolved_vendor = None
    resolved_item = None
    resolved_latest = False

    # 1. First pass: inspect previous user turns (newest first)
    for turn in reversed(conversation_history[-8:]):
        if turn.get("role") == "user":
            content = turn.get("content", "")
            if not resolved_vendor:
                prev_v = _extract_vendor(content)
                if prev_v:
                    resolved_vendor = prev_v
            if not resolved_item:
                prev_i = _extract_item_name(content)
                if prev_i:
                    resolved_item = prev_i
            if "latest" in content.lower():
                resolved_latest = True

            if resolved_vendor and resolved_item:
                return resolved_vendor, resolved_item, resolved_latest

    # 2. Second pass: inspect assistant turns if still unresolved
    for turn in reversed(conversation_history[-8:]):
        if turn.get("role") == "assistant":
            content = turn.get("content", "")
            if not resolved_vendor:
                prev_v = _extract_vendor(content)
                if prev_v:
                    resolved_vendor = prev_v
            if not resolved_item:
                prev_i = _extract_item_name(content)
                if prev_i:
                    resolved_item = prev_i
            if "latest" in content.lower():
                resolved_latest = True

            if resolved_vendor and resolved_item:
                break

    return resolved_vendor, resolved_item, resolved_latest


class AssistantIntentEngine:
    """Rule-based deterministic intent classification, entity extractor, and temporal resolver."""

    @staticmethod
    def parse_query(
        message: str,
        conversation_history: list[dict[str, str]] | None = None,
        now: datetime | None = None,
    ) -> ParsedQueryIntent:
        """Parse natural language query into intent and entities with conversational follow-up support."""
        msg = message.strip()
        lower = msg.lower()

        vendor = _extract_vendor(msg)
        item_query = _extract_item_name(msg)
        start_date, end_date, temporal_label = _resolve_temporal_range(msg, now=now)
        min_amount, max_amount = _extract_amount_filters(msg)
        comp_v1, comp_v2 = _extract_comparison_vendors(msg)

        is_latest = bool(re.search(r"\b(latest|most recent|newest|last receipt|last purchase|newest receipt)\b", lower))
        is_oldest = bool(re.search(r"\b(oldest|earliest|first receipt|first document|first purchase|oldest receipt|earliest receipt|oldest purchase|earliest purchase|oldest bill|earliest invoice|first item|oldest item|earliest item)\b", lower))
        is_expensive = bool(re.search(r"\b(most expensive|highest|costliest|largest purchase|biggest spend|highest bill|expensive|costly)\b", lower))
        is_cheap = bool(re.search(r"\b(cheap|cheapest|chepeast|least expensive|lowest price|lowest cost|lowest bill|lowest receipt|smallest purchase|smallest bill|minimum spend|min spend|cheaper|least costly)\b", lower))

        # Check follow-up context if entities are missing but anaphoric references exist
        if conversation_history:
            ctx_vendor, ctx_item, ctx_latest = _resolve_follow_up_context(msg, conversation_history)
            if not vendor and ctx_vendor:
                if re.search(r"\b(there|that|it|those|that store|that vendor|spend there|cost)\b", lower) or ("how much" in lower and not vendor and not comp_v1):
                    vendor = ctx_vendor
            if not item_query and ctx_item:
                if re.search(r"\b(that|it|those|them|that item)\b", lower):
                    item_query = ctx_item
            if not is_latest and ctx_latest and re.search(r"\b(that|it|those)\b", lower):
                is_latest = True

        # 1. Vendor Comparison
        if comp_v1 and comp_v2:
            return ParsedQueryIntent(
                intent=AssistantIntent.VENDOR_COMPARISON,
                vendor=comp_v1,
                vendor_b=comp_v2,
                is_comparison=True,
                raw_message=msg,
            )

        # 2. Amount Filters: "receipts above 1000", "purchases from DMart above 500"
        if min_amount is not None or max_amount is not None:
            return ParsedQueryIntent(
                intent=AssistantIntent.FILTERED_RECEIPTS,
                vendor=vendor,
                item_query=item_query,
                min_amount=min_amount,
                max_amount=max_amount,
                start_date=start_date,
                end_date=end_date,
                temporal_label=temporal_label,
                raw_message=msg,
            )

        # 3. Document count check
        if re.search(r"(how many|count of|number of|total).*(receipts?|documents?|invoices?|bills?|records?|files?|statements?|transactions?|docs?)", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.DOCUMENT_COUNT,
                raw_message=msg,
            )

        # 4. Oldest / Earliest Receipt or Item
        if is_oldest:
            if re.search(r"\b(item|product|thing|bought)\b", lower):
                return ParsedQueryIntent(
                    intent=AssistantIntent.OLDEST_ITEM,
                    vendor=vendor,
                    is_oldest=True,
                    raw_message=msg,
                )
            return ParsedQueryIntent(
                intent=AssistantIntent.OLDEST_RECEIPT,
                vendor=vendor,
                is_oldest=True,
                raw_message=msg,
            )

        # 5. Item History / Specific Item Intelligence: "when did I last buy eggs", "where did I buy eggs", "how much did eggs cost me"
        if item_query and (
            re.search(r"\b(when|where|cost\s+me|last\s+buy|which\s+store)\b", lower)
            or "most expensive" in lower
            or is_cheap
        ):
            return ParsedQueryIntent(
                intent=AssistantIntent.ITEM_HISTORY,
                item_query=item_query,
                vendor=vendor,
                is_most_expensive=is_expensive,
                raw_message=msg,
            )

        # 6. Top vendors / highest spending vendor
        if (
            re.search(r"(which|who|what)\s+(store|vendor).*(most\s+money|highest\s+spend|most\s+spend|spend.*most|top\s+vendor)", lower)
            or re.search(r"\b(top\s+vendors?|where\s+do\s+i\s+spend\s+the\s+most)\b", lower)
        ):
            return ParsedQueryIntent(
                intent=AssistantIntent.TOP_VENDORS,
                vendor=vendor,
                raw_message=msg,
            )

        # 7. Most bought / frequent items
        if re.search(r"(most (bought|purchased|frequent)|buy most frequently|items?.*most often|frequently\s+purchased)", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.MOST_FREQUENT_ITEMS,
                raw_message=msg,
            )

        # 8. Cheapest item vs receipt / invoice / document
        if is_cheap:
            if re.search(r"\b(receipt|invoice|bill|document|record|file|paper|statement|transaction|doc)s?\b", lower):
                return ParsedQueryIntent(
                    intent=AssistantIntent.CHEAPEST_RECEIPT,
                    vendor=vendor,
                    raw_message=msg,
                )
            return ParsedQueryIntent(
                intent=AssistantIntent.CHEAPEST_ITEM,
                vendor=vendor,
                raw_message=msg,
            )

        # 9. Most expensive item vs receipt / invoice / document
        if is_expensive:
            if re.search(r"\b(receipt|invoice|bill|document|record|file|paper|statement|transaction|doc)s?\b", lower):
                return ParsedQueryIntent(
                    intent=AssistantIntent.MOST_EXPENSIVE_RECEIPT,
                    vendor=vendor,
                    is_most_expensive=True,
                    raw_message=msg,
                )
            return ParsedQueryIntent(
                intent=AssistantIntent.MOST_EXPENSIVE_ITEM,
                vendor=vendor,
                is_most_expensive=True,
                raw_message=msg,
            )

        # 10. Temporal Spending: "what did I buy last month?", "spending in August", "purchases this week", "receipts before 2000 year", "2002", "receipts in 2002", "invoices in 2002", "documents from 2002"
        if start_date is not None and end_date is not None:
            if item_query and not re.search(r"^(?:19\d\d|20\d\d)$", item_query):
                if re.search(r"(how many|count of|quantity of|number of|total quantity)", lower):
                    return ParsedQueryIntent(
                        intent=AssistantIntent.ITEM_QUANTITY,
                        item_query=item_query,
                        vendor=vendor,
                        start_date=start_date,
                        end_date=end_date,
                        temporal_label=temporal_label,
                        raw_message=msg,
                    )
                return ParsedQueryIntent(
                    intent=AssistantIntent.FILTERED_RECEIPTS,
                    vendor=vendor,
                    item_query=item_query,
                    start_date=start_date,
                    end_date=end_date,
                    temporal_label=temporal_label,
                    raw_message=msg,
                )
            return ParsedQueryIntent(
                intent=AssistantIntent.TEMPORAL_SPENDING,
                vendor=vendor,
                start_date=start_date,
                end_date=end_date,
                temporal_label=temporal_label,
                raw_message=msg,
            )

        # 11. Item quantity (e.g. "how many eggs did I buy", "how many eggs have I purchased")
        if item_query and re.search(r"(how many|count of|quantity of|number of|total quantity)", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.ITEM_QUANTITY,
                item_query=item_query,
                vendor=vendor,
                raw_message=msg,
            )

        # 12. Item search / purchases (e.g. "show my egg purchases", "where is milk", "find coffee")
        if item_query:
            return ParsedQueryIntent(
                intent=AssistantIntent.ITEM_SEARCH,
                item_query=item_query,
                vendor=vendor,
                raw_message=msg,
            )

        # 13. Latest receipt items (e.g. "what did I buy in my latest DMart receipt?", "give me the latest dmart purchases")
        if is_latest and vendor and re.search(r"\b(buy|items?|products?|bought|contain|contents?|list|purchases?)\b", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.LATEST_RECEIPT_ITEMS,
                vendor=vendor,
                is_latest=True,
                raw_message=msg,
            )

        # 14. Vendor items (e.g. "what did I buy from DMart?", "show my DMart purchases")
        if vendor and re.search(r"\b(buy|bought|purchases?|items?|products?|order|what.*get)\b", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.VENDOR_ITEMS,
                vendor=vendor,
                raw_message=msg,
            )

        # 15. Latest receipt (e.g. "what is my latest receipt?", "show my latest receipt from DMart")
        if is_latest:
            return ParsedQueryIntent(
                intent=AssistantIntent.LATEST_RECEIPT,
                vendor=vendor,
                is_latest=True,
                raw_message=msg,
            )

        # 16. Vendor spending (e.g. "how much did I spend at DMart?", "DMart total", "how much was that")
        if vendor:
            return ParsedQueryIntent(
                intent=AssistantIntent.VENDOR_SPENDING,
                vendor=vendor,
                raw_message=msg,
            )

        # Contextual pronoun query without prior entity resolution
        if re.search(r"\b(that|it)\b", lower) and not vendor and not item_query and not comp_v1:
            return ParsedQueryIntent(
                intent=AssistantIntent.GENERAL_QUERY,
                raw_message=msg,
            )

        # 17. Total spending / general spending
        if re.search(r"(how much.*(spend|spent|total|cost)|total spending|overall spend|my spending|summary of my purchases|summary)", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.TOTAL_SPENDING,
                raw_message=msg,
            )

        return ParsedQueryIntent(
            intent=AssistantIntent.GENERAL_QUERY,
            raw_message=msg,
        )
