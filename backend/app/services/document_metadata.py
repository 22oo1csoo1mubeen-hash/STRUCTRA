"""Supabase PostgreSQL document metadata operations."""

from datetime import datetime
from typing import Literal
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError

from app.core.config import Settings

DocumentProcessingStatus = Literal["pending", "processing", "completed", "failed"]


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
        "status": "pending",
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


async def list_document_metadata(
    *, user_id: str, settings: Settings
) -> list[CreatedDocumentMetadata]:
    """Return metadata records owned by one authenticated user."""
    return await _get_document_metadata(
        params={
            "select": "id,user_id,filename,storage_path,content_type,size,status,created_at",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
        },
        settings=settings,
    )


async def get_document_metadata(
    *, document_id: UUID, user_id: str, settings: Settings
) -> CreatedDocumentMetadata | None:
    """Return one metadata record only when it belongs to the current user."""
    records = await _get_document_metadata(
        params={
            "select": "id,user_id,filename,storage_path,content_type,size,status,created_at",
            "id": f"eq.{document_id}",
            "user_id": f"eq.{user_id}",
        },
        settings=settings,
    )
    return records[0] if records else None


async def delete_document_metadata(
    *, document_id: UUID, user_id: str, settings: Settings
) -> None:
    """Delete one metadata row owned by the authenticated user."""
    secret_key = settings.supabase_secret_key.get_secret_value()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Prefer": "return=representation",
    }
    documents_url = f"{settings.supabase_url.rstrip('/')}/rest/v1/documents"
    params = {
        "id": f"eq.{document_id}",
        "user_id": f"eq.{user_id}",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.delete(documents_url, headers=headers, params=params)
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service is unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to delete document metadata.",
        )

    try:
        deleted_records = response.json()
    except ValueError:
        deleted_records = None
    if not isinstance(deleted_records, list) or len(deleted_records) != 1:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to delete document metadata.",
        )


async def update_document_status(
    *,
    document_id: UUID,
    user_id: str,
    document_status: DocumentProcessingStatus,
    settings: Settings,
) -> None:
    """Persist one extraction lifecycle status for an owned document."""
    secret_key = settings.supabase_secret_key.get_secret_value()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    documents_url = f"{settings.supabase_url.rstrip('/')}/rest/v1/documents"
    params = {
        "id": f"eq.{document_id}",
        "user_id": f"eq.{user_id}",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.patch(
                documents_url,
                headers=headers,
                params=params,
                json={"status": document_status},
            )
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service is unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to update document status.",
        )

    try:
        updated_records = response.json()
    except ValueError:
        updated_records = None
    if not isinstance(updated_records, list) or len(updated_records) != 1:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to update document status.",
        )


async def _get_document_metadata(
    *, params: dict[str, str], settings: Settings
) -> list[CreatedDocumentMetadata]:
    """Fetch document rows through the backend-only Supabase REST client."""
    secret_key = settings.supabase_secret_key.get_secret_value()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }
    documents_url = f"{settings.supabase_url.rstrip('/')}/rest/v1/documents"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(documents_url, headers=headers, params=params)
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service is unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve document metadata.",
        )

    try:
        return [CreatedDocumentMetadata.model_validate(record) for record in response.json()]
    except (TypeError, ValidationError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service returned an invalid response.",
        ) from None
