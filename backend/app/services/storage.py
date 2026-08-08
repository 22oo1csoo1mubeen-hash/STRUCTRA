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


async def download_document_from_storage(storage_path: str, settings: Settings) -> bytes:
    """Retrieve one private object using its database-provided Storage path."""
    storage_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{quote(settings.supabase_storage_bucket, safe='')}/"
        f"{quote(storage_path, safe='/')}"
    )
    secret_key = settings.supabase_secret_key.get_secret_value()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(storage_url, headers=headers)
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document storage is unavailable.",
        ) from error

    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document storage object was not found.",
        )
    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve document from storage.",
        )

    return response.content


async def delete_document_from_storage(storage_path: str, settings: Settings) -> None:
    """Delete one private object using its database-provided Storage path."""
    storage_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{quote(settings.supabase_storage_bucket, safe='')}"
    )
    secret_key = settings.supabase_secret_key.get_secret_value()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.request(
                "DELETE", storage_url, headers=headers, json={"prefixes": [storage_path]}
            )
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document storage is unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to delete document from storage.",
        )

    try:
        deleted_objects = response.json()
    except ValueError:
        deleted_objects = None
    if (
        not isinstance(deleted_objects, list)
        or len(deleted_objects) != 1
        or not isinstance(deleted_objects[0], dict)
        or deleted_objects[0].get("name") != storage_path
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to delete document from storage.",
        )


def build_document_storage_path(user_id: str, filename: str) -> str:
    """Build a collision-resistant, user-owned storage path for a document."""
    extension = PurePath(filename).suffix.lower()
    return f"{user_id}/{uuid4()}{extension}"
