"""Supabase PostgreSQL document metadata operations."""

from datetime import datetime
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError

from app.core.config import Settings


class CreatedDocumentMetadata(BaseModel):
    """Database fields returned after inserting a document record."""

    id: UUID
    user_id: UUID
    filename: str
    storage_path: str
    content_type: str
    size: int
    status: str
    created_at: datetime


async def create_document_metadata(
    *,
    user_id: str,
    filename: str,
    storage_path: str,
    content_type: str,
    size: int,
    settings: Settings,
) -> CreatedDocumentMetadata:
    """Insert metadata for an already-stored document using the service key."""
    secret_key = settings.supabase_secret_key.get_secret_value()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    payload = {
        "user_id": user_id,
        "filename": filename,
        "storage_path": storage_path,
        "content_type": content_type,
        "size": size,
        "status": "uploaded",
    }
    documents_url = f"{settings.supabase_url.rstrip('/')}/rest/v1/documents"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(documents_url, headers=headers, json=payload)
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service is unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save document metadata.",
        )

    try:
        return CreatedDocumentMetadata.model_validate(response.json()[0])
    except (IndexError, TypeError, ValidationError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service returned an invalid response.",
        ) from None
