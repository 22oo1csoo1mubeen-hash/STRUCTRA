"""Pydantic response models for the Dashboard and Analytics API."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Milestone 7.1 Schemas (Preserved) ────────────────────────────────────────

class DashboardSummary(BaseModel):
    """Core lifetime document summary metrics for the authenticated user."""

    total_documents: int = Field(ge=0, description="Total count of persisted library documents.")
    total_amount_spent: float = Field(ge=0.0, description="Total monetary spend across all saved documents.")
    processed_documents: int = Field(default=0, ge=0, description="Count of successfully processed documents.")
    needs_review_documents: int = Field(default=0, ge=0, description="Count of documents requiring review.")


class TopVendorSummary(BaseModel):
    """Vendor with the highest document/receipt frequency."""

    name: str = Field(description="Vendor or company name.")
    document_count: int = Field(ge=1, description="Number of saved documents from this vendor.")


class HighestSpendVendorSummary(BaseModel):
    """Vendor against which the user has spent the most total monetary amount."""

    name: str = Field(description="Vendor or company name.")
    total_spent: float = Field(ge=0.0, description="Total monetary amount spent at this vendor.")
    document_count: int = Field(ge=1, description="Number of saved documents from this vendor.")


class MostBoughtItemSummary(BaseModel):
    """Item with the highest aggregated purchase quantity across saved documents."""

    name: str = Field(description="Normalized item description/name.")
    quantity: float = Field(gt=0.0, description="Aggregated total quantity purchased.")
    document_count: int | None = Field(default=None, description="Number of documents containing this item.")


class MostExpensiveItemSummary(BaseModel):
    """Single line item with the highest monetary purchase value."""

    name: str = Field(description="Item description/name.")
    amount: float = Field(gt=0.0, description="Monetary line total or purchase value.")
    quantity: float | None = Field(default=None, description="Quantity of the item if extracted.")
    vendor: str | None = Field(default=None, description="Vendor from which the item was purchased.")
    document_id: UUID | None = Field(default=None, description="ID of the document containing this line item.")


class MostExpensiveReceiptSummary(BaseModel):
    """Saved document with the highest extracted total monetary amount."""

    document_id: UUID = Field(description="Unique document identifier.")
    filename: str = Field(description="Original document filename.")
    vendor: str | None = Field(default=None, description="Extracted vendor name.")
    document_date: str | None = Field(default=None, description="Extracted document date string.")
    total_amount: float = Field(ge=0.0, description="Extracted total monetary amount.")
    confidence_level: str | None = Field(default=None, description="Effective confidence level (HIGH, MEDIUM, LOW).")
    needs_review: bool | None = Field(default=None, description="Whether the document requires review.")


class DashboardHighlights(BaseModel):
    """Key spending and purchase highlights derived from persisted documents."""

    top_vendor: TopVendorSummary | None = None
    highest_spend_vendor: HighestSpendVendorSummary | None = None
    most_bought_item: MostBoughtItemSummary | None = None
    most_expensive_item: MostExpensiveItemSummary | None = None
    most_expensive_receipt: MostExpensiveReceiptSummary | None = None


class ConfidenceDistribution(BaseModel):
    """Distribution of effective document confidence across the user's library."""

    high: int = Field(default=0, ge=0, description="Count of documents with HIGH confidence.")
    medium: int = Field(default=0, ge=0, description="Count of documents with MEDIUM confidence.")
    low: int = Field(default=0, ge=0, description="Count of documents with LOW confidence.")


class DashboardConfidence(BaseModel):
    """Aggregated extraction quality and confidence summary for the user."""

    overall_level: Literal["HIGH", "MEDIUM", "LOW"] | None = Field(
        default=None,
        description="Overall user confidence level derived deterministically from distribution.",
    )
    distribution: ConfidenceDistribution = Field(
        default_factory=ConfidenceDistribution,
        description="Count of documents in each confidence bracket.",
    )


class DashboardResponse(BaseModel):
    """Complete aggregated dashboard payload for the authenticated user."""

    summary: DashboardSummary
    highlights: DashboardHighlights
    confidence: DashboardConfidence


# ─── Milestone 7.2 Schemas (Spending & Purchase Analytics) ───────────────────

SpendingPeriod = Literal["day", "week", "month", "year"]


class SpendingPoint(BaseModel):
    """A single chronological data point in a spending time series."""

    label: str = Field(description="Human-readable label for the time interval (e.g. '15 Mar 2026', 'Mar 2026').")
    start_date: str = Field(description="ISO format start date (YYYY-MM-DD) of the interval.")
    end_date: str = Field(description="ISO format end date (YYYY-MM-DD) of the interval.")
    amount: float = Field(ge=0.0, description="Aggregated monetary amount spent in this interval.")
    document_count: int = Field(ge=0, description="Number of saved documents contributing to this interval.")


class SpendingAnalyticsResponse(BaseModel):
    """Spending-over-time time series response."""

    period: SpendingPeriod = Field(description="Aggregation period: day, week, month, or year.")
    data: list[SpendingPoint] = Field(description="Chronologically sorted spending data points.")
    total_spent: float = Field(ge=0.0, description="Total monetary spend across all points in the series.")


class VendorSpending(BaseModel):
    """Detailed spending breakdown for one vendor."""

    vendor: str = Field(description="Normalized vendor or company name.")
    total_spent: float = Field(ge=0.0, description="Total monetary amount spent with this vendor.")
    document_count: int = Field(ge=1, description="Number of saved documents from this vendor.")
    percentage_of_total: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Percentage of user's total monetary spend attributed to this vendor.",
    )


class VendorAnalyticsResponse(BaseModel):
    """Spending-by-vendor analytics response."""

    vendors: list[VendorSpending] = Field(description="Ranked list of vendors sorted by total spend descending.")
    total_spent: float = Field(ge=0.0, description="Total monetary spend across all user vendors.")


class PurchasedItem(BaseModel):
    """Aggregated purchase metrics for one line item."""

    name: str = Field(description="Normalized line item description/name.")
    quantity: float = Field(gt=0.0, description="Aggregated total quantity purchased across documents.")
    document_count: int = Field(ge=1, description="Number of distinct documents containing this item.")
    total_spent: float = Field(ge=0.0, description="Total monetary spend on this item where available.")


class ItemAnalyticsResponse(BaseModel):
    """Most purchased items analytics response."""

    items: list[PurchasedItem] = Field(description="Ranked list of items sorted by quantity descending.")
    total_item_spend: float = Field(ge=0.0, description="Total monetary spend across all returned items.")


class PurchaseHighlightsResponse(BaseModel):
    """Purchase highlights response for expensive items and receipts."""

    most_expensive_item: MostExpensiveItemSummary | None = Field(
        default=None, description="Most expensive individual line item purchase."
    )
    most_expensive_receipt: MostExpensiveReceiptSummary | None = Field(
        default=None, description="Document with the highest total amount."
    )


# ─── Milestone 7.3 Schemas (Quality & Review Intelligence) ────────────────────

class DashboardQualityResponse(BaseModel):
    """Quality and confidence distribution analytics response."""

    overall_level: Literal["HIGH", "MEDIUM", "LOW"] | None = Field(
        default=None,
        description="Overall user confidence level derived deterministically from distribution.",
    )
    high_count: int = Field(default=0, ge=0, description="Count of documents with HIGH confidence.")
    medium_count: int = Field(default=0, ge=0, description="Count of documents with MEDIUM confidence.")
    low_count: int = Field(default=0, ge=0, description="Count of documents with LOW confidence.")
    total_documents: int = Field(ge=0, description="Total count of persisted library documents.")
    review_count: int = Field(default=0, ge=0, description="Count of documents requiring review.")
    average_system_confidence: float | None = Field(
        default=None, description="Average raw numeric system confidence score across classified documents."
    )
    distribution: ConfidenceDistribution = Field(
        default_factory=ConfidenceDistribution,
        description="Confidence distribution breakdown.",
    )


class ReviewQueueItem(BaseModel):
    """A document requiring user review in the review queue."""

    document_id: UUID = Field(description="Unique document identifier.")
    filename: str = Field(description="Original document filename.")
    vendor: str | None = Field(default=None, description="Extracted vendor name.")
    document_date: str | None = Field(default=None, description="Extracted document date.")
    total_amount: float | None = Field(default=None, description="Extracted total monetary amount.")
    confidence_level: str | None = Field(default=None, description="Effective confidence level (HIGH, MEDIUM, LOW).")
    needs_review: bool = Field(default=True, description="Whether the document requires review.")
    created_at: datetime = Field(description="Creation timestamp of the document record.")
    processed_at: datetime | None = Field(default=None, description="Processing timestamp if completed.")


class ReviewQueueResponse(BaseModel):
    """Review queue list response for documents needing attention."""

    items: list[ReviewQueueItem] = Field(description="Ranked list of documents needing review.")
    total_review_needed: int = Field(ge=0, description="Total number of documents needing review.")


class RecentDocumentItem(BaseModel):
    """Summary of a recently saved document."""

    document_id: UUID = Field(description="Unique document identifier.")
    filename: str = Field(description="Original document filename.")
    vendor: str | None = Field(default=None, description="Extracted vendor name.")
    document_date: str | None = Field(default=None, description="Extracted document date.")
    total_amount: float | None = Field(default=None, description="Extracted total monetary amount.")
    confidence_level: str | None = Field(default=None, description="Effective confidence level (HIGH, MEDIUM, LOW).")
    needs_review: bool = Field(default=False, description="Whether the document requires review.")
    created_at: datetime = Field(description="Creation timestamp of the document record.")
    processed_at: datetime | None = Field(default=None, description="Processing timestamp if completed.")


class RecentDocumentsResponse(BaseModel):
    """Recent documents list response."""

    documents: list[RecentDocumentItem] = Field(description="Recently saved documents sorted newest first.")
    total: int = Field(ge=0, description="Total count of persisted documents owned by user.")
