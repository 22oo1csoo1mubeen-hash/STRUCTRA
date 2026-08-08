"""Supabase Storage operations for original documents."""

from pathlib import PurePath
from urllib.parse import quote
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from app.core.config import Settings


async def upload_document_to_storage(
    file: UploadFile, user_id: str, settings: Settings
) -> str:
    """Upload a validated document to the authenticated user's storage path."""
    storage_path = build_document_storage_path(user_id, file.filename or "")
    storage_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{quote(settings.supabase_storage_bucket, safe='')}/"
        f"{quote(storage_path, safe='/')}"
    )
    secret_key = settings.supabase_secret_key.get_secret_value()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": file.content_type or "application/octet-stream",
        "x-upsert": "false",
    }

    await file.seek(0)
    file_content = await file.read()

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(storage_url, headers=headers, content=file_content)
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document storage is unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to store the document.",
        )

    return storage_path


def build_document_storage_path(user_id: str, filename: str) -> str:
    """Build a collision-resistant, user-owned storage path for a document."""
    extension = PurePath(filename).suffix.lower()
    return f"{user_id}/{uuid4()}{extension}"
