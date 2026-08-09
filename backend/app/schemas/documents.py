"""Request and response schemas for document endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictFloat, StrictStr



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
    line_total: StrictFloat | None = None


class ReceiptInvoiceExtraction(BaseModel):
    """Strictly validated receipt or invoice data returned by Gemini."""

    model_config = ConfigDict(extra="forbid")

    vendor_company: StrictStr | None = None
    address: StrictStr | None = None
    date: StrictStr | None = None
    total: StrictFloat | None = None
    line_items: list[ReceiptInvoiceLineItem] = Field(default_factory=list)


class DocumentExtractionResponse(BaseModel):
    """Validated extraction returned for one owned document."""

    document_id: UUID
    extraction: ReceiptInvoiceExtraction
