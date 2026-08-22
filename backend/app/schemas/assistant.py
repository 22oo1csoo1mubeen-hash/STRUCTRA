"""Pydantic schemas for the AI Assistant chat and session endpoints."""

from datetime import datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ConversationTurn(BaseModel):
    """A single conversation turn (user or assistant message)."""

    role: Literal["user", "assistant"] = Field(description="The speaker role.")
    content: str = Field(min_length=1, description="The message content.")


class AssistantSessionCreateResponse(BaseModel):
    """Response returned upon creating an ephemeral assistant session."""

    session_id: str = Field(description="Unique ephemeral session identifier.")
    created_at: datetime = Field(description="Timestamp when the session was created (UTC).")
    expires_at: datetime = Field(description="Timestamp when the session expires (UTC).")


class AssistantSource(BaseModel):
    """Lightweight reference to a source document used in answering a question."""

    document_id: UUID | str = Field(description="UUID of the source document in the Document Library.")
    filename: str = Field(description="Original filename of the source document.")
    vendor: str | None = Field(default=None, description="Extracted vendor/merchant name.")
    document_date: str | None = Field(default=None, description="Extracted receipt/invoice date.")
    total: float | None = Field(default=None, description="Total amount on the document.")


class AssistantResultType(str, Enum):
    """Classified structured result types for AI assistant responses."""

    RECENT_RECEIPTS = "recent_receipts"
    RECENT_UPLOADS = "recent_uploads"
    VENDOR_ITEMS = "vendor_items"
    ITEM_QUANTITY = "item_quantity"
    ITEM_SEARCH = "item_search"
    VENDOR_SPENDING = "vendor_spending"
    SPENDING_SUMMARY = "spending_summary"
    RECEIPT = "receipt"
    LATEST_RECEIPT = "latest_receipt"
    OLDEST_RECEIPT = "oldest_receipt"
    MOST_EXPENSIVE_ITEM = "most_expensive_item"
    MOST_EXPENSIVE_RECEIPT = "most_expensive_receipt"
    CHEAPEST_ITEM = "cheapest_item"
    CHEAPEST_RECEIPT = "cheapest_receipt"
    OLDEST_ITEM = "oldest_item"
    DOCUMENT_COUNT = "document_count"
    TOP_VENDORS = "top_vendors"
    MOST_FREQUENT_ITEMS = "most_frequent_items"
    AMBIGUOUS_VENDOR = "ambiguous_vendor"
    VENDOR_COMPARISON = "vendor_comparison"
    FILTERED_RECEIPTS = "filtered_receipts"
    TEMPORAL_SPENDING = "temporal_spending"
    ITEM_HISTORY = "item_history"
    CLARIFICATION = "clarification"
    NO_RESULTS = "no_results"
    GENERAL_QUERY = "general_query"


class AssistantChatRequest(BaseModel):
    """Incoming chat request from the user."""

    session_id: str | None = Field(
        default=None,
        description="Optional ephemeral session ID. If not provided, a session will be created/resolved.",
    )
    message: str = Field(
        min_length=1,
        max_length=2000,
        description="The user's natural-language question for the AI assistant.",
    )
    history: list[ConversationTurn] = Field(
        default_factory=list,
        description=(
            "Previous conversation turns (up to last 8 are used). "
            "Pass an empty list for the first message in a session."
        ),
    )


class AssistantChatResponse(BaseModel):
    """Structured reply returned by the AI assistant."""

    session_id: str | None = Field(
        default=None,
        description="Active ephemeral session ID.",
    )
    message: str | None = Field(
        default=None,
        description="The assistant's natural-language message/reply.",
    )
    reply: str = Field(
        description="The assistant's reply (alias for message for frontend backward compatibility).",
    )
    result_type: AssistantResultType | str | None = Field(
        default=None,
        description="Canonical structured result classification type.",
    )
    title: str | None = Field(
        default=None,
        description="Display title for the response or card.",
    )
    summary: str | None = Field(
        default=None,
        description="Deterministic factual summary derived from the canonical result data.",
    )
    sources: list[AssistantSource] = Field(
        default_factory=list,
        description="List of relevant source documents retrieved from the user's Document Library.",
    )
    source_count: int = Field(
        default=0,
        description="Count of contributing source documents.",
    )
    metadata: dict[str, Any] | None = Field(
        default=None,
        description=(
            "Canonical structured data payload containing all verified facts, "
            "metrics, item lists, and card attributes."
        ),
    )


class AssistantSessionResetResponse(BaseModel):
    """Response returned upon resetting an ephemeral assistant session."""

    session_id: str = Field(description="Identifier of the reset session.")
    status: str = Field(default="reset", description="Status indicator.")
    message: str = Field(default="Session conversation cleared.", description="Human-readable status.")
