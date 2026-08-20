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
    "library", "items", "item", "purchase", "purchases", "store", "stores", "shop", "shops",
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
    "detail", "details", "info", "information", "pricing",
    "hello", "hi", "hey", "greetings", "thanks", "thank", "welcome", "please", "yes", "no",
    "ok", "okay", "bye", "goodbye", "good", "morning", "afternoon", "evening", "night", "test", "help",
    "i", "we", "he", "she", "they", "me", "us", "him", "her", "them", "my", "our", "your", "his", "their",
    "has", "had", "having", "do", "does", "done", "am", "is", "are", "was", "were", "be", "been", "being",
    "got", "take", "took", "taken", "order", "orders", "ordered",
    "where", "when", "why", "which", "who", "whom", "whose", "how", "time", "times", "place", "places", "vendor", "vendors",
    "week", "weeks", "day", "days", "months", "years", "weekend", "weekends", "quarter", "quarters", "recently", "current", "previous",
    "cheap", "cheapest", "chepeast", "least", "lowest", "minimum", "min", "max", "highest", "maximum", "expensive", "costly", "costliest", "smallest", "biggest", "largest",
}

_MONTH_NAMES = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5, "jun": 6,
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
        valid_tokens = [t for t in tokens if _clean_token(t) not in _VENDOR_STOPWORDS and len(t) > 1]
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
        if _clean_token(cand) not in _VENDOR_STOPWORDS and len(cand) > 1:
            return cand

    return None


def _extract_item_name(text: str) -> str | None:
    """Extract item name with strict word boundary protection and comprehensive natural language patterns."""
    lower = text.lower().strip()

    # 1. "quantity and price of X" / "price and quantity of X"
    m_prop_and = re.search(
        r"(?:price|cost|rate|quantity|qty|amount|details|info|information|pricing)\s+(?:and|&)\s+(?:price|cost|rate|quantity|qty|amount|details|info|information|pricing)\s+of\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in|on|for)\b|[?.]|$)",
        lower,
    )
    if m_prop_and:
        cand = m_prop_and.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 2. "price of X" / "cost of X" / "quantity of X" / "rate of X" / "amount of X" / "details of X" / "info of X"
    m_prop_of = re.search(
        r"\b(?:price|cost|rate|quantity|qty|amount|details|info|information|pricing)\s+of\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in|on|for)\b|[?.]|$)",
        lower,
    )
    if m_prop_of:
        cand = m_prop_of.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 3. "what is/was/are the price/cost/rate/quantity/total of/for X"
    m_what_prop = re.search(
        r"what\s+(?:is|was|are|were)\s+(?:the\s+)?(?:price|cost|rate|quantity|qty|amount|total)\s+(?:of|for)\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in|on)\b|[?.]|$)",
        lower,
    )
    if m_what_prop:
        cand = m_what_prop.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 4. "where / from where / when / which store did i buy/bought X"
    m_where_when = re.search(
        r"(?:from\s+)?(?:where|when|which\s+(?:store|vendor|shop|place)|what\s+(?:store|vendor|shop|place))\s+(?:did\s+i|have\s+i|i\s+have|i|was|were)\s+(?:last\s+)?(?:buy|bought|purchase|purchased|get|got|order|ordered)\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:last\s+time|recently|before|yesterday|at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_where_when:
        cand = m_where_when.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 5. "how much is/was X" (e.g. "how much is brownie", "how much was the brownie at V&RO")
    m_how_much_item = re.search(
        r"how\s+much\s+(?:is|was|are|were)\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in|cost|costing)\b|[?.]|$)",
        lower,
    )
    if m_how_much_item:
        cand = m_how_much_item.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 6. "how much did X cost" (e.g. "how much did brownie cost", "how much did the brownie cost")
    m_item_cost = re.search(
        r"how\s+much\s+did\s+(?:the\s+|a\s+|an\s+|my\s+)?([A-Za-z0-9\s&'\-]+?)\s+cost(?:\s+me)?(?:\s+(?:at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_item_cost:
        cand = m_item_cost.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 7. "how many X did I buy" / "how many X i have bought"
    m_many = re.search(
        r"how\s+many\s+(?:units\s+of\s+|packs\s+of\s+|packets\s+of\s+|boxes\s+of\s+|bottles\s+of\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:did\s+i|have\s+i|i\s+have|i\s+did|i\s+bought|i\s+purchased|i\s+got|were|was|bought|purchased|spend|cost|at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_many:
        cand = m_many.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 8. "did I buy X" / "have I bought X" / "did I purchase X" / "i bought X"
    # Guard: if the query is asking about vendor or temporal scope (e.g. "what did i buy from dmart", "what did i buy last week"), do not capture scope as item
    if not re.search(r"^\s*what\s+(?:did\s+i|have\s+i|i)\s+(?:buy|bought|get|purchase)\s+(?:from|at|in|last|this|yesterday|recently)\b", lower):
        m_did_buy = re.search(
            r"\b(?:did\s+i|have\s+i|i\s+have|i)\s+(?:buy|bought|purchase|purchased|get|got|order|ordered)\s+(?:the\s+|a\s+|an\s+|any\s+|some\s+)?([A-Za-z0-9\s&'\-]+?)(?:\s+(?:last\s+time|recently|from|at|in|before|yesterday)\b|[?.]|$)",
            lower,
        )
        if m_did_buy:
            cand = m_did_buy.group(1).strip()
            tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
            if tokens:
                return " ".join(tokens)

    # 9. "did I pay for X" / "spend on X"
    m_pay_for = re.search(
        r"(?:did\s+i|have\s+i|i)\s+(?:pay|spend)\s+(?:for|on)\s+([A-Za-z0-9\s&'\-]+?)(?:\s+(?:at|from|in)\b|[?.]|$)",
        lower,
    )
    if m_pay_for:
        cand = m_pay_for.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # Guard: general spending inquiries
    if re.search(r"how\s+much\s+(?:did\s+i\s+spend|have\s+i\s+spent|did\s+that\s+cost|was\s+spent|spent|in\s+total|overall)", lower):
        m_on = re.search(r"spend\s+on\s+([A-Za-z0-9\s]+?)(?:\s+(?:at|from|in)\b|[?.]|$)", lower)
        if m_on:
            cand = m_on.group(1).strip()
            tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
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
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 11. "X quantity and price" / "X price and quantity" / "X price" / "X cost" / "X quantity" / "X rate"
    m_suffix = re.search(
        r"^([A-Za-z0-9\s&'\-]+?)\s+(?:quantity\s+and\s+price|price\s+and\s+quantity|price|cost|quantity|qty|rate)(?:\s+(?:at|from|in)\s+[A-Za-z0-9\s&'\-]+)?\??$",
        lower,
    )
    if m_suffix:
        cand = m_suffix.group(1).strip()
        tokens = [t.strip(".,;:?!'\"") for t in cand.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
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
        tokens = [t.strip(".,;:?!'\"") for t in item.split() if _clean_token(t) not in _VENDOR_STOPWORDS]
        if tokens:
            return " ".join(tokens)

    # 13. Single noun or short phrase that is purely an item name (e.g. "crunchy salad", "brownie", "ginger ale")
    tokens = [t.strip(".,;:?!'\"") for t in lower.split()]
    valid_tokens = [t for t in tokens if _clean_token(t) not in _VENDOR_STOPWORDS and len(t) > 1]
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

    # 9. "in <month>" / "<month> 2026" / "last August"
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

    # 10. "recently" / "recent"
    if re.search(r"\b(recently|recent)\b", lower):
        start_rec = today - timedelta(days=30)
        return start_rec.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "recently"

    return None, None, None


def _extract_amount_filters(text: str) -> tuple[float | None, float | None]:
    """Extract numeric amount filter boundaries (min_amount, max_amount)."""
    clean = text.replace("₹", " ").replace("rs.", " ").replace("rs", " ")

    # 1. Between X and Y: "between 500 and 2000", "from 500 to 2000"
    m_between = re.search(r"\b(?:between|from)\s+(\d+(?:\.\d+)?)\s+(?:and|to)\s+(\d+(?:\.\d+)?)\b", clean, re.IGNORECASE)
    if m_between:
        a = float(m_between.group(1))
        b = float(m_between.group(2))
        return min(a, b), max(a, b)

    # 2. Above / more than / greater than / over: "above 1000", "more than 500"
    m_above = re.search(r"\b(?:above|more\s+than|greater\s+than|over|exceeding)\s+(\d+(?:\.\d+)?)\b", clean, re.IGNORECASE)
    if m_above:
        return float(m_above.group(1)), None

    # 3. Below / less than / under: "below 500", "under 1000", "less than 200"
    m_below = re.search(r"\b(?:below|less\s+than|under)\s+(\d+(?:\.\d+)?)\b", clean, re.IGNORECASE)
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

        is_latest = bool(re.search(r"\b(latest|most recent|newest|last receipt|last purchase)\b", lower))
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
                min_amount=min_amount,
                max_amount=max_amount,
                start_date=start_date,
                end_date=end_date,
                temporal_label=temporal_label,
                raw_message=msg,
            )

        # 3. Document count check
        if re.search(r"(how many|count of|number of|total).*(receipts?|documents?|invoices?|bills?)", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.DOCUMENT_COUNT,
                raw_message=msg,
            )

        # 4. Item History / Specific Item Intelligence: "when did I last buy eggs", "where did I buy eggs", "how much did eggs cost me"
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

        # 5. Top vendors / highest spending vendor
        if (
            re.search(r"(which|who|what)\s+(store|vendor).*(most\s+money|highest\s+spend|most\s+spend|spend.*most|top\s+vendor)", lower)
            or re.search(r"\b(top\s+vendors?|where\s+do\s+i\s+spend\s+the\s+most)\b", lower)
        ):
            return ParsedQueryIntent(
                intent=AssistantIntent.TOP_VENDORS,
                vendor=vendor,
                raw_message=msg,
            )

        # 6. Most bought / frequent items
        if re.search(r"(most (bought|purchased|frequent)|buy most frequently|items?.*most often|frequently\s+purchased)", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.MOST_FREQUENT_ITEMS,
                raw_message=msg,
            )

        # 7. Cheapest item vs receipt
        if is_cheap:
            if re.search(r"\b(receipt|invoice|bill|document)\b", lower):
                return ParsedQueryIntent(
                    intent=AssistantIntent.CHEAPEST_RECEIPT,
                    vendor=vendor,
                    raw_message=msg,
                )
            if re.search(r"\b(item|product|thing|purchase|bought)\b", lower) or "purchase" in lower:
                return ParsedQueryIntent(
                    intent=AssistantIntent.CHEAPEST_ITEM,
                    vendor=vendor,
                    raw_message=msg,
                )
            return ParsedQueryIntent(
                intent=AssistantIntent.CHEAPEST_ITEM,
                vendor=vendor,
                raw_message=msg,
            )

        # 8. Most expensive item vs receipt
        if is_expensive:
            if re.search(r"\b(receipt|invoice|bill|document)\b", lower):
                return ParsedQueryIntent(
                    intent=AssistantIntent.MOST_EXPENSIVE_RECEIPT,
                    vendor=vendor,
                    is_most_expensive=True,
                    raw_message=msg,
                )
            if re.search(r"\b(item|product|thing|purchase|bought)\b", lower) or "purchase" in lower:
                return ParsedQueryIntent(
                    intent=AssistantIntent.MOST_EXPENSIVE_ITEM,
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

        # 8. Item quantity (e.g. "how many eggs did I buy", "how many eggs have I purchased")
        if item_query and re.search(r"(how many|count of|quantity of|number of|total quantity)", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.ITEM_QUANTITY,
                item_query=item_query,
                vendor=vendor,
                raw_message=msg,
            )

        # 9. Item search / purchases (e.g. "show my egg purchases", "where is milk", "find coffee")
        if item_query:
            return ParsedQueryIntent(
                intent=AssistantIntent.ITEM_SEARCH,
                item_query=item_query,
                vendor=vendor,
                raw_message=msg,
            )

        # 10. Temporal Spending: "what did I buy last month?", "spending in August", "purchases this week"
        if start_date is not None and end_date is not None:
            return ParsedQueryIntent(
                intent=AssistantIntent.TEMPORAL_SPENDING,
                vendor=vendor,
                start_date=start_date,
                end_date=end_date,
                temporal_label=temporal_label,
                raw_message=msg,
            )

        # 11. Latest receipt items (e.g. "what did I buy in my latest DMart receipt?", "give me the latest dmart purchases")
        if is_latest and vendor and re.search(r"\b(buy|items?|products?|bought|contain|contents?|list|purchases?)\b", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.LATEST_RECEIPT_ITEMS,
                vendor=vendor,
                is_latest=True,
                raw_message=msg,
            )

        # 12. Vendor items (e.g. "what did I buy from DMart?", "show my DMart purchases")
        if vendor and re.search(r"\b(buy|bought|purchases?|items?|products?|order|what.*get)\b", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.VENDOR_ITEMS,
                vendor=vendor,
                raw_message=msg,
            )

        # 13. Latest receipt (e.g. "what is my latest receipt?", "show my latest receipt from DMart")
        if is_latest:
            return ParsedQueryIntent(
                intent=AssistantIntent.LATEST_RECEIPT,
                vendor=vendor,
                is_latest=True,
                raw_message=msg,
            )

        # 14. Vendor spending (e.g. "how much did I spend at DMart?", "DMart total", "how much was that")
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

        # 15. Total spending / general spending
        if re.search(r"(how much.*(spend|spent|total|cost)|total spending|overall spend|my spending|summary of my purchases|summary)", lower):
            return ParsedQueryIntent(
                intent=AssistantIntent.TOTAL_SPENDING,
                raw_message=msg,
            )

        return ParsedQueryIntent(
            intent=AssistantIntent.GENERAL_QUERY,
            raw_message=msg,
        )
