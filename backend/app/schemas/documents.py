"""Request and response schemas for document endpoints."""

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictFloat, StrictStr, field_validator
from typing import Any
import re



class DocumentUploadResponse(BaseModel):
    """Confirmation returned after a document passes upload validation."""

    success: bool = True
    filename: str = Field(description="Original filename supplied by the client.")
    content_type: str = Field(description="Validated MIME type of the document.")
    size: int = Field(ge=1, description="Validated file size in bytes.")
    storage_path: str = Field(description="Private path of the stored document.")
    document_id: UUID = Field(description="ID of the persisted document metadata record.")
    status: str = Field(description="Initial document lifecycle status.")
    created_at: datetime = Field(description="Time the metadata record was created.")
    message: str = "Document uploaded successfully."
    is_duplicate: bool = Field(default=False, description="True if document content already exists for this user.")
    existing_document_id: UUID | None = Field(default=None, description="ID of the existing matching document if duplicate.")


class DocumentMetadataResponse(BaseModel):
    """Public metadata returned for a document owned by the current user."""

    document_id: UUID
    filename: str
    storage_path: str
    content_type: str
    size: int = Field(ge=1)
    status: str
    created_at: datetime


class DocumentDeleteResponse(BaseModel):
    """Confirmation returned after a document is fully deleted."""

    success: bool = True
    message: str = "Document deleted successfully."


class ReceiptInvoiceLineItem(BaseModel):
    """One strictly validated extracted receipt or invoice line item."""

    model_config = ConfigDict(extra="forbid")

    description: StrictStr
    quantity: float | None = None
    unit_price: float | None = None
    line_total: float | None = None

    @field_validator("quantity", "unit_price", "line_total", mode="before")
    @classmethod
    def parse_numeric(cls, v: Any) -> float | None:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            cleaned = re.sub(r"[^\d.-]", "", v)
            try:
                return float(cleaned) if cleaned else None
            except ValueError:
                return None
        return None


class TaxComponent(BaseModel):
    """Detailed extraction of a specific tax component."""
    model_config = ConfigDict(extra="forbid")

    name: str
    rate: float | None = None
    amount: float | None = None

    @field_validator("rate", "amount", mode="before")
    @classmethod
    def parse_numeric(cls, v: Any) -> float | None:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            cleaned = re.sub(r"[^\d.-]", "", v)
            try:
                return float(cleaned) if cleaned else None
            except ValueError:
                return None
        return None


class ReceiptInvoiceExtraction(BaseModel):
    """Strictly validated receipt or invoice data returned by Gemini."""

    model_config = ConfigDict(extra="forbid")

    vendor_company: StrictStr | None = None
    address: StrictStr | None = None
    date: StrictStr | None = None
    invoice_number: StrictStr | None = None
    subtotal: float | None = None
    discount: float | None = None
    taxable_amount: float | None = None
    tax: float | None = None
    tax_components: list[TaxComponent] = Field(default_factory=list)
    total: float | None = None
    line_items: list[ReceiptInvoiceLineItem] = Field(default_factory=list)

    @field_validator("subtotal", "discount", "taxable_amount", "tax", "total", mode="before")
    @classmethod
    def parse_numeric(cls, v: Any) -> float | None:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            cleaned = re.sub(r"[^\d.-]", "", v)
            try:
                return float(cleaned) if cleaned else None
            except ValueError:
                return None
        return None


class MathematicalValidationResult(BaseModel):
    """Independent arithmetic check for a validated receipt or invoice extraction."""

    validation_performed: bool
    total_matches: bool | None
    calculated_total: Decimal | None
    document_total: Decimal | None
    difference: Decimal | None
    
    # Subtotal check fields (optional for backward compatibility)
    subtotal_matches: bool | None = None
    calculated_subtotal: Decimal | None = None
    document_subtotal: Decimal | None = None
    subtotal_difference: Decimal | None = None
    
    reason: Literal[
        "document_total_missing", "line_items_empty", "line_item_total_missing", "unreconciled_missing_fields"
    ] | None = None


class ExtractionQualitySignals(BaseModel):
    """Deterministic STRUCTRA signals; these are not Gemini confidence scores."""

    schema_validation_succeeded: Literal[True] = True
    present_document_fields: list[str]
    missing_document_fields: list[str]
    line_item_count: int = Field(ge=0)
    line_items_missing_total: int = Field(ge=0)
    mathematical_validation: MathematicalValidationResult


class DuplicateDocumentCandidate(BaseModel):
    """Internal metadata and extraction facts used for duplicate comparisons."""

    document_id: UUID
    user_id: UUID
    content_hash: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    extraction: ReceiptInvoiceExtraction | None = None


class DuplicateDetectionResult(BaseModel):
    """A deterministic duplicate classification, never a probability score."""

    classification: Literal[
        "definite_duplicate", "likely_duplicate", "not_duplicate", "insufficient_information"
    ]
    matched_document_id: UUID | None = None
    evidence: list[str]


from app.services.quality.schemas import ExtractionQualityResult


class DocumentExtractionResponse(BaseModel):
    """Validated extraction returned for one owned document."""

    document_id: UUID
    extraction: ReceiptInvoiceExtraction
    quality: ExtractionQualityResult | None = None


DocumentValidationStatus = Literal["valid", "warning", "invalid", "unable_to_validate"]


class ValidationIssue(BaseModel):
    """Structured information about a single validation issue."""
    type: str
    title: str
    message: str
    expected: Decimal | str | None = None
    actual: Decimal | str | None = None
    difference: Decimal | None = None
    field: str | None = None
    severity: Literal["warning", "invalid"] = "warning"

class DocumentValidationResult(BaseModel):
    """Aggregate result combining all M5 validation components."""

    overall_status: DocumentValidationStatus
    quality_signals: ExtractionQualitySignals
    duplicate_detection: DuplicateDetectionResult
    issues: list[ValidationIssue]


class DocumentListItem(BaseModel):
    """High-level summary view for a document in the Document Library list."""

    document_id: UUID
    filename: str
    storage_path: str
    content_type: str
    size: int = Field(ge=1)
    status: str
    created_at: datetime
    processed_at: datetime | None = None
    content_hash: str | None = None
    has_extraction: bool = False
    vendor_name: str | None = None
    total_amount: float | None = None
    document_date: str | None = None
    confidence_level: str | None = None
    needs_review: bool | None = None


class DocumentLibraryStats(BaseModel):
    """Aggregate summary statistics for the user's document library."""

    total: int = Field(ge=0, description="Total count of documents owned by user.")
    processed: int = Field(ge=0, description="Count of successfully processed documents.")
    needs_review: int = Field(ge=0, description="Count of documents requiring review.")


class DocumentListResponse(BaseModel):
    """Paginated collection of user-owned documents for the Document Library."""

    items: list[DocumentListItem]
    page: int = Field(ge=1, description="Current 1-indexed page number.")
    page_size: int = Field(ge=1, le=100, description="Items returned per page.")
    total: int = Field(ge=0, description="Total count of documents owned by user.")
    has_next: bool = Field(description="True if more pages exist.")
    stats: DocumentLibraryStats | None = None


class OriginalDocumentInfo(BaseModel):
    """Access information for retrieving the original stored document."""

    download_url: str
    content_type: str
    filename: str


class DocumentPreviewResponse(BaseModel):
    """Short-lived preview access information for an owned document."""

    preview_url: str = Field(description="Short-lived signed URL for previewing the original document.")
    expires_in: int = Field(default=3600, description="Expiration duration in seconds.")
    content_type: str = Field(description="Content MIME type.")
    filename: str = Field(description="Original document filename.")


class DocumentDetailResponse(BaseModel):
    """Detailed view for a single document owned by the authenticated user."""

    document: DocumentMetadataResponse
    extraction: ReceiptInvoiceExtraction | None = None
    quality: ExtractionQualityResult | None = None
    validation: MathematicalValidationResult | None = None
    original: OriginalDocumentInfo

