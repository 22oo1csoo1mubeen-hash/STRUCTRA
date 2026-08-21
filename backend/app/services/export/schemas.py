"""Pydantic schemas for the STRUCTRA Document Export data layer."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ExportTaxComponent(BaseModel):
    """Extracted tax breakdown item."""
    model_config = ConfigDict(extra="ignore")

    name: str
    rate: float | None = None
    amount: float | None = None


class ExportLineItem(BaseModel):
    """Extracted purchased line item."""
    model_config = ConfigDict(extra="ignore")

    description: str
    quantity: float | None = None
    unit_price: float | None = None
    line_total: float | None = None


class ExportDocumentData(BaseModel):
    """Complete, normalized, null-safe representation of a document ready for export."""
    model_config = ConfigDict(extra="ignore")

    # Document Metadata
    document_id: str
    filename: str
    created_at: datetime | None = None
    processed_at: datetime | None = None
    status: str = "completed"

    # Vendor Information
    vendor_name: str | None = None
    vendor_address: str | None = None

    # Document Facts
    document_date: str | None = None
    invoice_number: str | None = None
    currency_symbol: str = "₹"

    # Financial Summary
    subtotal: float | None = None
    discount: float | None = None
    taxable_amount: float | None = None
    tax: float | None = None
    tax_components: list[ExportTaxComponent] = Field(default_factory=list)
    service_charge: float | None = None
    round_off: float | None = None
    total: float | None = None

    # Line Items
    line_items: list[ExportLineItem] = Field(default_factory=list)

    # Quality & Validation
    confidence_level: str | None = None
    confidence_score: float | None = None
    confidence_override: str | None = None
    arithmetic_validated: bool | None = None
    arithmetic_matches: bool | None = None
    needs_review: bool | None = None
    issues: list[str] = Field(default_factory=list)
