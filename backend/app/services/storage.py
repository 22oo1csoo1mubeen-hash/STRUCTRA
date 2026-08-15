"""Supabase Storage operations for original documents."""

from pathlib import PurePath
from urllib.parse import quote
from uuid import UUID, uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from app.core.config import Settings


async def upload_document_to_storage(
    file: UploadFile,
    user_id: str,
    settings: Settings,
    document_id: UUID | str | None = None,
) -> str:
    """Upload a validated document to the authenticated user's storage path."""
    storage_path = build_document_storage_path(
        user_id, file.filename or "", document_id=document_id
    )
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
        print(f"STORAGE REQUEST ERROR: {error}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document storage is unavailable.",
        ) from error

    if not response.is_success:
        print(f"STORAGE ERROR {response.status_code}: {response.text}")
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


async def delete_document_from_storage(
    storage_path: str, settings: Settings, ignore_missing: bool = True
) -> None:
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

    if response.status_code == status.HTTP_404_NOT_FOUND:
        if ignore_missing:
            return
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document storage object was not found.",
        )

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to delete document from storage.",
        )

    try:
        deleted_objects = response.json()
    except ValueError:
        deleted_objects = None

    if isinstance(deleted_objects, list):
        if len(deleted_objects) == 0 and ignore_missing:
            return  # Storage object was already missing, proceed safely
        if (
            len(deleted_objects) == 1
            and isinstance(deleted_objects[0], dict)
            and deleted_objects[0].get("name") == storage_path
        ):
            return  # Successfully deleted object

    if not ignore_missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to delete document from storage.",
        )


def build_document_storage_path(
    user_id: str, filename: str, document_id: UUID | str | None = None
) -> str:
    """Build a user-specific and document-specific storage path for a document.

    Follows path structure: {user_id}/{document_id}/original.{extension}
    """
    extension = PurePath(filename).suffix.lower()
    doc_id = str(document_id) if document_id else str(uuid4())
    return f"{user_id}/{doc_id}/original{extension}"


async def create_signed_storage_url(
    storage_path: str, settings: Settings, expires_in: int = 3600
) -> str:
    """Create a short-lived signed URL for a private storage object."""
    supabase_url = getattr(settings, "supabase_url", "https://example.supabase.co")
    bucket = getattr(settings, "supabase_storage_bucket", "documents")
    secret_key_attr = getattr(settings, "supabase_secret_key", None)
    if secret_key_attr is None:
        return f"/documents/storage/{quote(storage_path, safe='/')}"

    secret_key = (
        secret_key_attr.get_secret_value()
        if hasattr(secret_key_attr, "get_secret_value")
        else str(secret_key_attr)
    )
    storage_url = (
        f"{str(supabase_url).rstrip('/')}/storage/v1/object/sign/"
        f"{quote(str(bucket), safe='')}/"
        f"{quote(storage_path, safe='/')}"
    )
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                storage_url, headers=headers, json={"expiresIn": expires_in}
            )
            if response.is_success:
                data = response.json()
                signed_path = data.get("signedURL")
                if signed_path:
                    return f"{str(supabase_url).rstrip('/')}/storage/v1{signed_path}"
    except Exception:
        pass

    return f"/documents/storage/{quote(storage_path, safe='/')}"


async def find_document_storage_path(
    user_id: str, document_id: UUID | str, settings: Settings
) -> str | None:
    """Locate the storage path for a document directly from Supabase Storage."""
    supabase_url = getattr(settings, "supabase_url", "https://example.supabase.co")
    bucket = getattr(settings, "supabase_storage_bucket", "documents")
    secret_key_attr = getattr(settings, "supabase_secret_key", None)
    if not secret_key_attr:
        return None
    secret_key = (
        secret_key_attr.get_secret_value()
        if hasattr(secret_key_attr, "get_secret_value")
        else str(secret_key_attr)
    )
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }
    list_url = f"{str(supabase_url).rstrip('/')}/storage/v1/object/list/{quote(str(bucket), safe='')}"
    prefix = f"{user_id}/{document_id}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                list_url,
                headers=headers,
                json={"prefix": prefix, "limit": 10},
            )
            if response.is_success:
                items = response.json()
                if isinstance(items, list):
                    for item in items:
                        name = item.get("name", "")
                        if name:
                            return f"{prefix}/{name}"
    except Exception:
        pass

    # Fallback to checking typical extensions
    for ext in (".pdf", ".png", ".jpg", ".jpeg"):
        candidate = f"{user_id}/{document_id}/original{ext}"
        try:
            content = await download_document_from_storage(candidate, settings)
            if content:
                return candidate
        except Exception:
            continue
    return None


async def cleanup_unsaved_temporary_storage(
    *,
    user_id: str | None = None,
    saved_storage_paths: set[str],
    settings: Settings,
    dry_run: bool = True,
) -> list[str]:
    """Identify and safely remove unsaved temporary storage objects that have no persistent DB record."""
    supabase_url = getattr(settings, "supabase_url", "https://example.supabase.co")
    bucket = getattr(settings, "supabase_storage_bucket", "documents")
    secret_key_attr = getattr(settings, "supabase_secret_key", None)
    if not secret_key_attr:
        return []
    secret_key = (
        secret_key_attr.get_secret_value()
        if hasattr(secret_key_attr, "get_secret_value")
        else str(secret_key_attr)
    )
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }
    list_url = f"{str(supabase_url).rstrip('/')}/storage/v1/object/list/{quote(str(bucket), safe='')}"
    
    # List top level user prefixes if user_id is None
    prefixes_to_check = [user_id] if user_id else []
    if not prefixes_to_check:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(list_url, headers=headers, json={"prefix": "", "limit": 100})
                if r.is_success:
                    prefixes_to_check = [item.get("name") for item in r.json() if item.get("name")]
        except Exception:
            pass

    orphaned_paths: list[str] = []
    for prefix in prefixes_to_check:
        if not prefix:
            continue
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(list_url, headers=headers, json={"prefix": prefix, "limit": 100})
                if not r.is_success:
                    continue
                subfolders = r.json()
                for sub in subfolders:
                    sub_name = sub.get("name", "")
                    doc_prefix = f"{prefix}/{sub_name}"
                    r_doc = await client.post(list_url, headers=headers, json={"prefix": doc_prefix, "limit": 10})
                    if not r_doc.is_success:
                        continue
                    files = r_doc.json()
                    for f in files:
                        fname = f.get("name", "")
                        full_path = f"{doc_prefix}/{fname}"
                        if full_path not in saved_storage_paths:
                            orphaned_paths.append(full_path)
                            if not dry_run:
                                await delete_document_from_storage(full_path, settings, ignore_missing=True)
        except Exception:
            pass

    return orphaned_paths




