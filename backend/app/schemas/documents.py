"""Request and response schemas for document endpoints."""

from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    """Confirmation returned after a document passes upload validation."""

    success: bool = True
    filename: str = Field(description="Original filename supplied by the client.")
    content_type: str = Field(description="Validated MIME type of the document.")
    size: int = Field(ge=1, description="Validated file size in bytes.")
    message: str = "Document received successfully."
