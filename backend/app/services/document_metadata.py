"""Supabase PostgreSQL document metadata operations."""

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError

from app.core.config import Settings

DocumentProcessingStatus = Literal["pending", "processing", "completed", "failed"]

SELECT_DOCUMENT_FIELDS = (
    "id,user_id,filename,storage_path,content_type,size,status,created_at,"
    "content_hash,processed_at,extraction_result,quality_result"
)


class CreatedDocumentMetadata(BaseModel):
    """Database fields returned after inserting or querying a document record."""

    id: UUID
    user_id: UUID
    filename: str
    storage_path: str
    content_type: str
    size: int
    status: str
    created_at: datetime
    content_hash: str | None = None
    processed_at: datetime | None = None
    extraction_result: dict[str, Any] | None = None
    quality_result: dict[str, Any] | None = None


def _extract_settings(settings: Settings) -> tuple[str, str]:
    """Safely extract supabase_url and secret_key string even if settings is a mock SimpleNamespace."""
    supabase_url = str(getattr(settings, "supabase_url", "https://example.supabase.co"))
    secret_key_attr = getattr(settings, "supabase_secret_key", "test-secret-key")
    if hasattr(secret_key_attr, "get_secret_value"):
        secret_key = secret_key_attr.get_secret_value()
    else:
        secret_key = str(secret_key_attr)
    return supabase_url, secret_key


async def create_document_metadata(
    *,
    user_id: str,
    filename: str,
    storage_path: str,
    content_type: str,
    size: int,
    content_hash: str | None = None,
    document_id: UUID | str | None = None,
    status: DocumentProcessingStatus = "pending",
    processed_at: datetime | None = None,
    extraction_result: dict[str, Any] | None = None,
    quality_result: dict[str, Any] | None = None,
    settings: Settings,
) -> CreatedDocumentMetadata:
    """Insert metadata for an already-stored document using the service key."""
    supabase_url, secret_key = _extract_settings(settings)
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    payload: dict[str, Any] = {
        "user_id": user_id,
        "filename": filename,
        "storage_path": storage_path,
        "content_type": content_type,
        "size": size,
        "status": status,
    }
    if content_hash is not None:
        payload["content_hash"] = content_hash
    if document_id is not None:
        payload["id"] = str(document_id)
    if processed_at is not None:
        payload["processed_at"] = processed_at.isoformat()
    if extraction_result is not None:
        payload["extraction_result"] = extraction_result
    if quality_result is not None:
        payload["quality_result"] = quality_result

    documents_url = f"{supabase_url.rstrip('/')}/rest/v1/documents"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(documents_url, headers=headers, json=payload)
    except httpx.RequestError as error:
        print(f"METADATA REQUEST ERROR: {error}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service is unavailable.",
        ) from error

    if not response.is_success:
        print(f"METADATA ERROR {response.status_code}: {response.text}")
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
    *,
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    needs_review: bool | None = None,
    search: str | None = None,
    sort_by: str | None = "newest",
    settings: Settings,
) -> tuple[list[CreatedDocumentMetadata], int]:
    """Return paginated metadata records owned by one authenticated user along with total count."""
    offset = (page - 1) * page_size
    supabase_url, secret_key = _extract_settings(settings)
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Prefer": "count=exact",
    }
    params: dict[str, str] = {
        "select": SELECT_DOCUMENT_FIELDS,
        "user_id": f"eq.{user_id}",
        "limit": str(page_size),
        "offset": str(offset),
    }

    effective_status = status_filter if status_filter is not None else "completed"
    if effective_status and effective_status != "all":
        params["status"] = f"eq.{effective_status.strip()}"

    if needs_review is True:
        params["quality_result->needs_review"] = "eq.true"
    elif needs_review is False:
        params["or"] = "(quality_result->needs_review.is.null,quality_result->needs_review.eq.false)"

    if search and search.strip():
        q_str = search.strip()
        params["filename"] = f"ilike.*{q_str}*"

    if sort_by == "oldest":
        params["order"] = "created_at.asc"
    else:
        params["order"] = "created_at.desc"

    documents_url = f"{supabase_url.rstrip('/')}/rest/v1/documents"

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

    total_count = 0
    content_range = response.headers.get("content-range")
    if content_range and "/" in content_range:
        total_str = content_range.rsplit("/", 1)[-1]
        if total_str.isdigit():
            total_count = int(total_str)

    try:
        records = [CreatedDocumentMetadata.model_validate(record) for record in response.json()]
        if total_count == 0 and records:
            total_count = len(records)
        return records, total_count
    except (TypeError, ValidationError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service returned an invalid response.",
        ) from None


async def get_document_metadata(
    *, document_id: UUID, user_id: str, settings: Settings
) -> CreatedDocumentMetadata | None:
    """Return one metadata record only when it belongs to the current user."""
    records = await _get_document_metadata(
        params={
            "select": SELECT_DOCUMENT_FIELDS,
            "id": f"eq.{document_id}",
            "user_id": f"eq.{user_id}",
        },
        settings=settings,
    )
    return records[0] if records else None


async def find_document_metadata_by_content_hash(
    *, content_hash: str, user_id: str, settings: Settings
) -> list[CreatedDocumentMetadata]:
    """Find same-user saved library document rows with matching content hash."""
    try:
        return await _get_document_metadata(
            params={
                "select": SELECT_DOCUMENT_FIELDS,
                "user_id": f"eq.{user_id}",
                "content_hash": f"eq.{content_hash}",
                "status": "eq.completed",
            },
            settings=settings,
        )
    except HTTPException:
        return []


async def delete_document_metadata(
    *, document_id: UUID, user_id: str, settings: Settings
) -> None:
    """Delete one metadata row owned by the authenticated user."""
    supabase_url, secret_key = _extract_settings(settings)
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Prefer": "return=representation",
    }
    documents_url = f"{supabase_url.rstrip('/')}/rest/v1/documents"
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
    processed_at: datetime | None = None,
    settings: Settings,
) -> None:
    """Persist one extraction lifecycle status for an owned document."""
    supabase_url, secret_key = _extract_settings(settings)
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    documents_url = f"{supabase_url.rstrip('/')}/rest/v1/documents"
    params = {
        "id": f"eq.{document_id}",
        "user_id": f"eq.{user_id}",
    }
    patch_payload: dict[str, str] = {"status": document_status}
    if document_status in ("completed", "failed"):
        dt = processed_at or datetime.now(timezone.utc)
        patch_payload["processed_at"] = dt.isoformat()

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.patch(
                documents_url,
                headers=headers,
                params=params,
                json=patch_payload,
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


async def update_document_extraction_and_quality(
    *,
    document_id: UUID,
    user_id: str,
    extraction: dict[str, Any],
    quality: dict[str, Any] | None = None,
    settings: Settings,
) -> None:
    """Save final extraction and quality JSON to the user's document row and set status to completed."""
    supabase_url, secret_key = _extract_settings(settings)
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    documents_url = f"{supabase_url.rstrip('/')}/rest/v1/documents"
    params = {
        "id": f"eq.{document_id}",
        "user_id": f"eq.{user_id}",
    }
    patch_payload: dict[str, Any] = {
        "status": "processing",
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "extraction_result": extraction,
    }
    if quality is not None:
        patch_payload["quality_result"] = quality

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.patch(
                documents_url,
                headers=headers,
                params=params,
                json=patch_payload,
            )
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service is unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save document extraction.",
        )


async def _get_document_metadata(
    *, params: dict[str, str], settings: Settings
) -> list[CreatedDocumentMetadata]:
    """Fetch document rows through the backend-only Supabase REST client."""
    supabase_url, secret_key = _extract_settings(settings)
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }
    documents_url = f"{supabase_url.rstrip('/')}/rest/v1/documents"

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


