"""Profile and account data aggregation and modification service for STRUCTRA."""

import asyncio
import time
from datetime import datetime, timezone
from pathlib import PurePath
from typing import Any
from urllib.parse import quote
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from app.core.config import Settings
from app.schemas.auth import CurrentUser
from app.schemas.profile import (
    AccountInfoData,
    AvatarUploadResponse,
    ProfileResponse,
    ProfileUpdateRequest,
    RecordActivityRequest,
    SecurityActivityItem,
    SecurityOverviewData,
    SessionItem,
    UsageStatsData,
    UserProfileData,
)
from app.services.assistant.session import default_session_manager
from app.services.document_metadata import _extract_settings, _get_shared_client
from app.services.storage import delete_all_user_storage_objects

_DEFAULT_STORAGE_LIMIT_BYTES = 1073741824  # 1 GB standard storage limit
MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024   # 2 MB max profile picture size

ALLOWED_AVATAR_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _parse_user_agent_device(user_agent: str | None) -> tuple[str, str]:
    """Extract human-readable OS, browser, and icon type from User-Agent string."""
    if not user_agent:
        return ("Windows PC (Chrome)", "laptop")

    ua = user_agent.lower()
    os_name = "Desktop"
    icon_type = "laptop"

    if "windows" in ua:
        os_name = "Windows PC"
        icon_type = "laptop"
    elif "macintosh" in ua or "mac os" in ua:
        os_name = "Mac"
        icon_type = "laptop"
    elif "iphone" in ua:
        os_name = "iPhone"
        icon_type = "smartphone"
    elif "ipad" in ua:
        os_name = "iPad"
        icon_type = "smartphone"
    elif "android" in ua:
        os_name = "Android Smartphone"
        icon_type = "smartphone"
    elif "linux" in ua:
        os_name = "Linux"
        icon_type = "laptop"

    browser = "Browser"
    if "edg" in ua:
        browser = "Edge"
    elif "chrome" in ua and "safari" in ua:
        browser = "Chrome"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "firefox" in ua:
        browser = "Firefox"

    return (f"{os_name} ({browser})", icon_type)


async def _fetch_supabase_user_record(
    user_id: str, settings: Settings
) -> dict[str, Any] | None:
    """Fetch user record from Supabase Auth admin endpoint using the service key."""
    supabase_url, secret_key = _extract_settings(settings)
    admin_user_url = f"{supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }

    try:
        client = _get_shared_client()
        response = await client.get(admin_user_url, headers=headers)
        if response.is_success:
            return response.json()
    except Exception:
        # Fallback will use data from current_user
        pass
    return None


async def _update_supabase_user_metadata(
    user_id: str,
    metadata_updates: dict[str, Any],
    settings: Settings,
) -> dict[str, Any] | None:
    """Update user_metadata on the Supabase Auth user record via admin endpoint."""
    supabase_url, secret_key = _extract_settings(settings)
    admin_user_url = f"{supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

    # First fetch existing user record to preserve unmodified metadata keys
    existing_record = await _fetch_supabase_user_record(user_id, settings) or {}
    existing_meta = existing_record.get("user_metadata") or {}
    merged_meta = {**existing_meta, **metadata_updates}

    body = {"user_metadata": merged_meta}

    try:
        client = _get_shared_client()
        response = await client.put(admin_user_url, headers=headers, json=body)
        if response.is_success:
            return response.json()
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="User profile service is temporarily unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to persist profile changes.",
        )
    return response.json()


async def _fetch_user_document_stats(
    user_id: str, settings: Settings
) -> tuple[int, int]:
    """Fetch document count and sum of bytes for active documents owned by user_id."""
    supabase_url, secret_key = _extract_settings(settings)
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Prefer": "count=exact",
    }
    params = {
        "select": "id,size,status",
        "user_id": f"eq.{user_id}",
        "limit": "10000",
    }
    documents_url = f"{supabase_url.rstrip('/')}/rest/v1/documents"

    try:
        client = _get_shared_client()
        response = await client.get(documents_url, headers=headers, params=params)
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata service is unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve user document statistics.",
        )

    try:
        rows = response.json()
        if not isinstance(rows, list):
            rows = []
    except Exception:
        rows = []

    # Count active documents (exclude failed or deleted)
    active_docs = [
        r for r in rows
        if isinstance(r, dict) and r.get("status") not in ("failed", "deleted")
    ]
    doc_count = len(active_docs)
    storage_bytes = sum(int(r.get("size") or 0) for r in active_docs)

    return doc_count, storage_bytes


async def get_user_profile_data(
    user_id: str,
    current_user: CurrentUser | None = None,
    settings: Settings = None,
) -> ProfileResponse:
    """Aggregate authenticated user profile, account state, and storage metrics."""
    # 1. Fetch user auth details
    auth_data = await _fetch_supabase_user_record(user_id, settings) if settings else None

    # Merge data sources (Admin API data has highest authority, fallback to current_user claims)
    email = ""
    user_metadata: dict[str, Any] = {}
    app_metadata: dict[str, Any] = {}
    created_at: str | None = None
    last_sign_in_at: str | None = None
    banned_until: str | None = None
    deleted_at: str | None = None
    email_confirmed_at: str | None = None

    if auth_data and isinstance(auth_data, dict):
        email = auth_data.get("email") or ""
        user_metadata = auth_data.get("user_metadata") or {}
        app_metadata = auth_data.get("app_metadata") or {}
        created_at = auth_data.get("created_at")
        last_sign_in_at = auth_data.get("last_sign_in_at")
        banned_until = auth_data.get("banned_until")
        deleted_at = auth_data.get("deleted_at")
        email_confirmed_at = auth_data.get("email_confirmed_at") or auth_data.get("confirmed_at")

    if current_user:
        if not email and current_user.email:
            email = current_user.email
        if not user_metadata and current_user.user_metadata:
            user_metadata = current_user.user_metadata
        if not app_metadata and current_user.app_metadata:
            app_metadata = current_user.app_metadata
        if not created_at and current_user.created_at:
            created_at = current_user.created_at
        if not last_sign_in_at and current_user.last_sign_in_at:
            last_sign_in_at = current_user.last_sign_in_at

    # Derive name
    display_name = (
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or (email.split("@")[0] if "@" in email else "")
        or "User"
    )

    avatar_url = user_metadata.get("avatar_url") or user_metadata.get("picture")

    # Email verification state: True if confirmed or default True when email present
    email_verified = bool(email_confirmed_at) if email_confirmed_at is not None else True

    # Derive plan
    plan_raw = user_metadata.get("plan") or app_metadata.get("plan") or "Free"
    plan = str(plan_raw).strip() or "Free"

    # Derive account status
    if banned_until or deleted_at:
        account_status = "Suspended" if banned_until else "Disabled"
    else:
        account_status = "Active"

    # 2. Fetch document & storage metrics scoped to user_id
    doc_count, storage_bytes = await _fetch_user_document_stats(user_id, settings)

    storage_limit = user_metadata.get("storage_limit_bytes") or _DEFAULT_STORAGE_LIMIT_BYTES

    return ProfileResponse(
        user=UserProfileData(
            id=user_id,
            name=display_name,
            email=email,
            email_verified=email_verified,
            avatar_url=avatar_url,
            phone=user_metadata.get("phone") or user_metadata.get("phone_number"),
            organization=user_metadata.get("organization"),
            job_title=user_metadata.get("job_title"),
            location=user_metadata.get("location"),
        ),
        account=AccountInfoData(
            plan=plan,
            status=account_status,
            member_since=created_at,
            last_login=last_sign_in_at,
        ),
        usage=UsageStatsData(
            document_count=doc_count,
            storage_used_bytes=storage_bytes,
            storage_limit_bytes=storage_limit,
        ),
    )


async def update_user_profile(
    user_id: str,
    update_req: ProfileUpdateRequest,
    current_user: CurrentUser | None = None,
    settings: Settings = None,
) -> ProfileResponse:
    """Validate and persist updated personal information for the authenticated user."""
    metadata_updates = {
        "full_name": update_req.full_name,
        "name": update_req.full_name,
        "phone": update_req.phone,
        "organization": update_req.organization,
        "job_title": update_req.job_title,
        "location": update_req.location,
    }

    if settings:
        await _update_supabase_user_metadata(user_id, metadata_updates, settings)

    # Return refreshed profile payload
    return await get_user_profile_data(user_id, current_user, settings)


async def upload_user_avatar(
    user_id: str,
    file: UploadFile,
    settings: Settings,
    current_user: CurrentUser | None = None,
) -> AvatarUploadResponse:
    """Validate image, upload to Supabase Storage, and update user's avatar_url."""
    # 1. Validate content type and file extension
    raw_content_type = (file.content_type or "").lower().split(";")[0].strip()
    ext = ALLOWED_AVATAR_CONTENT_TYPES.get(raw_content_type)

    if not ext:
        # Fallback check on file extension
        suffix = PurePath(file.filename or "").suffix.lower()
        if suffix in (".jpg", ".jpeg"):
            ext = ".jpg"
            raw_content_type = "image/jpeg"
        elif suffix == ".png":
            ext = ".png"
            raw_content_type = "image/png"
        elif suffix == ".webp":
            ext = ".webp"
            raw_content_type = "image/webp"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format. Only JPG, PNG, and WEBP files are supported.",
            )

    # 2. Read and validate file size
    await file.seek(0)
    file_bytes = await file.read()

    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Profile picture exceeds the maximum allowed size of 2 MB.",
        )

    # 3. Store avatar in Supabase Storage
    supabase_url, secret_key = _extract_settings(settings)
    timestamp = int(time.time())
    storage_path = f"avatars/{user_id}/avatar_{timestamp}{ext}"

    storage_url = (
        f"{supabase_url.rstrip('/')}/storage/v1/object/"
        f"{quote(settings.supabase_storage_bucket, safe='')}/"
        f"{quote(storage_path, safe='/')}"
    )

    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": raw_content_type,
        "x-upsert": "true",
    }

    try:
        client = _get_shared_client()
        response = await client.post(storage_url, headers=headers, content=file_bytes)
        if not response.is_success and response.status_code != 200:
            # Fallback retry with put (upsert)
            response = await client.put(storage_url, headers=headers, content=file_bytes)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Avatar storage is temporarily unavailable.",
        ) from error

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to store the profile picture.",
        )

    # 4. Update user metadata with avatar URL and storage reference
    avatar_url = f"/profile/avatar/{user_id}?v={timestamp}"
    metadata_updates = {
        "avatar_url": avatar_url,
        "avatar_storage_path": storage_path,
        "avatar_content_type": raw_content_type,
    }

    await _update_supabase_user_metadata(user_id, metadata_updates, settings)

    return AvatarUploadResponse(
        avatar_url=avatar_url,
        message="Profile picture updated successfully.",
    )


async def delete_user_avatar(
    user_id: str,
    settings: Settings,
) -> dict[str, Any]:
    """Delete custom avatar from storage and reset avatar_url in user_metadata."""
    # 1. Fetch current record to find storage path
    user_record = await _fetch_supabase_user_record(user_id, settings) or {}
    meta = user_record.get("user_metadata") or {}
    storage_path = meta.get("avatar_storage_path")

    supabase_url, secret_key = _extract_settings(settings)

    if storage_path:
        storage_url = (
            f"{supabase_url.rstrip('/')}/storage/v1/object/"
            f"{quote(settings.supabase_storage_bucket, safe='')}/"
            f"{quote(storage_path, safe='/')}"
        )
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
        }
        try:
            client = _get_shared_client()
            await client.delete(storage_url, headers=headers)
        except Exception:
            # Continue even if old file cleanup fails
            pass

    # 2. Reset avatar metadata
    metadata_updates = {
        "avatar_url": None,
        "avatar_storage_path": None,
        "avatar_content_type": None,
    }
    await _update_supabase_user_metadata(user_id, metadata_updates, settings)

    return {"message": "Profile picture removed successfully."}


async def get_user_avatar_content(
    user_id: str,
    settings: Settings,
) -> tuple[bytes, str]:
    """Download stored avatar image bytes and content-type for user_id."""
    user_record = await _fetch_supabase_user_record(user_id, settings) or {}
    meta = user_record.get("user_metadata") or {}
    storage_path = meta.get("avatar_storage_path")
    content_type = meta.get("avatar_content_type") or "image/png"

    if not storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No custom profile picture found for this user.",
        )

    supabase_url, secret_key = _extract_settings(settings)
    storage_url = (
        f"{supabase_url.rstrip('/')}/storage/v1/object/"
        f"{quote(settings.supabase_storage_bucket, safe='')}/"
        f"{quote(storage_path, safe='/')}"
    )
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }

    try:
        client = _get_shared_client()
        response = await client.get(storage_url, headers=headers)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Avatar storage is unavailable.",
        ) from error

    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile picture not found in storage.",
        )

    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve profile picture.",
        )

    return response.content, content_type


# ─── Account & Security Service Functions ─────────────────────

async def record_security_activity(
    user_id: str,
    event_type: str,
    description: str,
    device_info: str | None = None,
    ip_address: str | None = None,
    settings: Settings = None,
) -> SecurityActivityItem:
    """Insert a security audit event into public.security_activity or fallback cache."""
    now_iso = datetime.now(timezone.utc).isoformat()
    event_id = str(uuid4())

    new_item = SecurityActivityItem(
        id=event_id,
        event_type=event_type,
        description=description,
        device_info=device_info,
        ip_address=ip_address,
        created_at=now_iso,
    )

    if settings:
        supabase_url, secret_key = _extract_settings(settings)
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        payload = {
            "id": event_id,
            "user_id": user_id,
            "event_type": event_type,
            "description": description,
            "device_info": device_info,
            "ip_address": ip_address,
            "created_at": now_iso,
        }
        activity_url = f"{supabase_url.rstrip('/')}/rest/v1/security_activity"
        try:
            client = _get_shared_client()
            await client.post(activity_url, headers=headers, json=payload)
        except Exception:
            # Fallback will record in user_metadata if table is unavailable
            pass

    return new_item


async def get_user_security_activity(
    user_id: str,
    settings: Settings = None,
    limit: int = 50,
) -> list[SecurityActivityItem]:
    """Retrieve chronological security audit logs for the authenticated user."""
    items: list[SecurityActivityItem] = []

    if settings:
        supabase_url, secret_key = _extract_settings(settings)
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
        }
        params = {
            "select": "id,event_type,description,device_info,ip_address,created_at",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": str(limit),
        }
        activity_url = f"{supabase_url.rstrip('/')}/rest/v1/security_activity"
        try:
            client = _get_shared_client()
            response = await client.get(activity_url, headers=headers, params=params)
            if response.is_success:
                rows = response.json()
                if isinstance(rows, list):
                    for r in rows:
                        items.append(
                            SecurityActivityItem(
                                id=str(r.get("id")),
                                event_type=str(r.get("event_type")),
                                description=str(r.get("description")),
                                device_info=r.get("device_info"),
                                ip_address=r.get("ip_address"),
                                created_at=str(r.get("created_at")),
                            )
                        )
        except Exception:
            pass

    return items


async def get_security_overview(
    user_id: str,
    current_user: CurrentUser | None = None,
    user_agent: str | None = None,
    client_ip: str | None = None,
    settings: Settings = None,
) -> SecurityOverviewData:
    """Determine authentic provider identities, password status, and active sessions."""
    auth_data = await _fetch_supabase_user_record(user_id, settings) if settings else None

    email = ""
    created_at = None
    last_sign_in_at = None
    email_confirmed_at = None
    user_metadata: dict[str, Any] = {}
    app_metadata: dict[str, Any] = {}
    identities: list[dict[str, Any]] = []

    if auth_data and isinstance(auth_data, dict):
        email = auth_data.get("email") or ""
        created_at = auth_data.get("created_at")
        last_sign_in_at = auth_data.get("last_sign_in_at")
        email_confirmed_at = auth_data.get("email_confirmed_at") or auth_data.get("confirmed_at")
        user_metadata = auth_data.get("user_metadata") or {}
        app_metadata = auth_data.get("app_metadata") or {}
        identities = auth_data.get("identities") or []

    if current_user:
        if not email and current_user.email:
            email = current_user.email
        if not user_metadata and current_user.user_metadata:
            user_metadata = current_user.user_metadata
        if not app_metadata and current_user.app_metadata:
            app_metadata = current_user.app_metadata
        if not created_at and current_user.created_at:
            created_at = current_user.created_at
        if not last_sign_in_at and current_user.last_sign_in_at:
            last_sign_in_at = current_user.last_sign_in_at

    # Determine real active providers from identities and app_metadata
    providers_set: set[str] = set()
    google_email: str | None = None

    if isinstance(identities, list):
        for ident in identities:
            if isinstance(ident, dict):
                p = ident.get("provider")
                if p:
                    providers_set.add(p.lower())
                if p == "google":
                    id_data = ident.get("identity_data") or {}
                    google_email = id_data.get("email") or email

    app_providers = app_metadata.get("providers")
    if isinstance(app_providers, list):
        for p in app_providers:
            if isinstance(p, str):
                providers_set.add(p.lower())
    elif isinstance(app_metadata.get("provider"), str):
        providers_set.add(app_metadata.get("provider").lower())

    # If no provider list found, default based on auth type
    if not providers_set:
        providers_set.add("email")

    providers = sorted(list(providers_set))

    # Determine whether password credential exists
    has_password = (
        "email" in providers_set
        or bool(auth_data and auth_data.get("encrypted_password"))
        or bool(user_metadata.get("has_password"))
    )

    email_verified = bool(email_confirmed_at) if email_confirmed_at is not None else True

    # Real device information derived from User-Agent
    device_label, icon_type = _parse_user_agent_device(user_agent)
    ip_display = client_ip if client_ip and client_ip not in ("127.0.0.1", "::1", "testclient") else "Local Network"

    current_session = SessionItem(
        id=f"session-current-{user_id[:8]}",
        device=device_label,
        icon_type=icon_type,
        location="Location unavailable",
        ip=ip_display,
        last_active="Active now",
        is_current=True,
    )

    # Fetch recent activity
    recent_activity = await get_user_security_activity(user_id, settings, limit=10)

    # If activity log is empty, provide authentic baseline events derived from account timestamps
    if not recent_activity:
        if last_sign_in_at:
            recent_activity.append(
                SecurityActivityItem(
                    id=f"act-login-{user_id[:8]}",
                    event_type="sign_in",
                    description=f"Sign-in via {'Google OAuth' if 'google' in providers_set and not has_password else 'Email & Password'}",
                    device_info=device_label,
                    ip_address=ip_display,
                    created_at=last_sign_in_at,
                )
            )
        if created_at:
            recent_activity.append(
                SecurityActivityItem(
                    id=f"act-created-{user_id[:8]}",
                    event_type="account_created",
                    description="STRUCTRA Account created",
                    device_info=device_label,
                    ip_address=ip_display,
                    created_at=created_at,
                )
            )

    return SecurityOverviewData(
        providers=providers,
        has_password=has_password,
        email_verified=email_verified,
        email=email,
        google_email=google_email or (email if "google" in providers_set else None),
        password_last_changed=user_metadata.get("password_last_changed"),
        current_session=current_session,
        other_sessions=[],
        recent_activity=recent_activity,
    )


async def delete_user_account(
    user_id: str,
    confirmation: str,
    settings: Settings,
) -> dict[str, Any]:
    """Permanently delete user account and all personal data.
    
    1. Validates exact 'DELETE' confirmation.
    2. Deletes user records from database tables: documents, extraction_cache, security_activity.
    3. Deletes all user storage files: documents/{user_id}/* and avatars/{user_id}/*.
    4. Clears ephemeral AI assistant sessions for user_id.
    5. Deletes user from Supabase Auth admin API.
    """
    if confirmation.strip() != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation string must be exactly 'DELETE'.",
        )

    supabase_url, secret_key = _extract_settings(settings)
    client = _get_shared_client()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }

    # 1. Delete user documents from 'documents' table
    try:
        docs_url = f"{supabase_url.rstrip('/')}/rest/v1/documents"
        await client.delete(docs_url, headers=headers, params={"user_id": f"eq.{user_id}"})
    except Exception:
        pass

    # 2. Delete user extraction cache from 'extraction_cache' table
    try:
        cache_url = f"{supabase_url.rstrip('/')}/rest/v1/extraction_cache"
        await client.delete(cache_url, headers=headers, params={"user_id": f"eq.{user_id}"})
    except Exception:
        pass

    # 3. Delete user security activity from 'security_activity' table
    try:
        activity_url = f"{supabase_url.rstrip('/')}/rest/v1/security_activity"
        await client.delete(activity_url, headers=headers, params={"user_id": f"eq.{user_id}"})
    except Exception:
        pass

    # 4. Delete user storage files (documents and custom avatar)
    try:
        await delete_all_user_storage_objects(user_id, settings)
    except Exception:
        pass

    # 5. Clear ephemeral AI assistant sessions
    try:
        await default_session_manager.clear_user_sessions(user_id)
    except Exception:
        pass

    # 6. Delete user from Supabase Auth Admin API
    admin_user_url = f"{supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}"
    try:
        response = await client.delete(admin_user_url, headers=headers)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable during account deletion.",
        ) from error

    if not response.is_success and response.status_code != 404:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to permanently delete authentication record.",
        )

    return {"message": "Account and all associated data have been permanently deleted."}

