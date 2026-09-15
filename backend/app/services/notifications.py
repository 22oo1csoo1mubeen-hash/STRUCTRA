"""Notification / activity service for STRUCTRA.

Reuses the existing public.security_activity table with an added read_at
column (migration 011) so that document-lifecycle and account events can be
surfaced through the notification bell without introducing a second table.

All operations are strictly user-scoped.  A notification belonging to user A
will never be returned for user B.
"""

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.core.config import Settings
from app.services.document_metadata import _extract_settings, _get_shared_client

logger = logging.getLogger(__name__)

# ─── Event type labels ────────────────────────────────────────────────────────

EVENT_LABELS: dict[str, str] = {
    # Document events
    "document_saved": "Document saved to library",
    "document_edited": "Document edited",
    "document_deleted": "Document deleted",
    "document_exported": "Document exported",
    # Account events
    "profile_updated": "Profile information updated",
    "avatar_changed": "Profile picture updated",
    "avatar_removed": "Profile picture removed",
    # Security events (already recorded by existing profile service)
    "sign_in": "Signed in",
    "sign_out": "Signed out",
    "password_changed": "Password changed",
    "password_created": "Password added",
    "password_reset": "Password reset",
    "password_reset_requested": "Password reset requested",
    "account_created": "Account created",
    "google_linked": "Google account linked",
}


# ─── Notification schema ──────────────────────────────────────────────────────

class NotificationItem:
    """A single notification/activity item returned to the frontend."""

    def __init__(
        self,
        *,
        id: str,
        event_type: str,
        title: str,
        description: str,
        document_id: str | None = None,
        document_name: str | None = None,
        created_at: str,
        read_at: str | None = None,
    ) -> None:
        self.id = id
        self.event_type = event_type
        self.title = title
        self.description = description
        self.document_id = document_id
        self.document_name = document_name
        self.created_at = created_at
        self.read_at = read_at

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "event_type": self.event_type,
            "title": self.title,
            "description": self.description,
            "document_id": self.document_id,
            "document_name": self.document_name,
            "created_at": self.created_at,
            "read_at": self.read_at,
            "is_read": self.read_at is not None,
        }


# ─── Public API ───────────────────────────────────────────────────────────────

async def create_notification(
    *,
    user_id: str,
    event_type: str,
    document_name: str | None = None,
    document_id: str | None = None,
    description: str | None = None,
    settings: Settings,
) -> None:
    """Insert a notification row into security_activity (fire-and-forget).

    Failures are silently swallowed so that the primary operation is never
    affected by a non-critical notification logging issue.
    """
    try:
        supabase_url, secret_key = _extract_settings(settings)
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        # Build human-readable description
        base_label = EVENT_LABELS.get(event_type, event_type.replace("_", " ").title())
        if document_name:
            if event_type == "document_saved":
                human_desc = f"{document_name} was saved to your library"
            elif event_type == "document_edited":
                human_desc = f"{document_name} was edited"
            elif event_type == "document_deleted":
                human_desc = f"{document_name} was deleted"
            elif event_type == "document_exported":
                human_desc = f"{document_name} was exported"
            else:
                human_desc = description or base_label
        else:
            human_desc = description or base_label

        payload: dict[str, Any] = {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": event_type,
            "description": human_desc,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Store document metadata in device_info field (JSON-encoded) so we
        # don't need a schema change beyond the read_at column.
        if document_id or document_name:
            import json
            meta: dict[str, Any] = {}
            if document_id:
                meta["document_id"] = document_id
            if document_name:
                meta["document_name"] = document_name
            payload["device_info"] = json.dumps(meta)

        activity_url = f"{supabase_url.rstrip('/')}/rest/v1/security_activity"
        client = _get_shared_client()
        resp = await client.post(activity_url, headers=headers, json=payload)
        if not resp.is_success:
            logger.warning("Supabase security_activity post failed [%s]: %s", resp.status_code, resp.text)
        else:
            await _prune_old_notifications(user_id=user_id, settings=settings, max_count=50)
    except Exception as exc:
        # Never propagate — notifications are non-critical
        logger.warning("create_notification exception: %s", exc)


async def _prune_old_notifications(
    *,
    user_id: str,
    settings: Settings,
    max_count: int = 50,
) -> None:
    """Keep only the latest max_count notifications for the user, pruning older ones."""
    try:
        supabase_url, secret_key = _extract_settings(settings)
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
        }
        activity_url = f"{supabase_url.rstrip('/')}/rest/v1/security_activity"
        client = _get_shared_client()
        params = {
            "select": "id",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "offset": str(max_count),
            "limit": "100",
        }
        resp = await client.get(activity_url, headers=headers, params=params)
        if resp.is_success:
            old_rows = resp.json()
            if isinstance(old_rows, list) and old_rows:
                old_ids = [str(r["id"]) for r in old_rows if "id" in r]
                if old_ids:
                    delete_params = {
                        "id": f"in.({','.join(old_ids)})",
                        "user_id": f"eq.{user_id}",
                    }
                    await client.delete(activity_url, headers=headers, params=delete_params)
    except Exception as exc:
        logger.warning("Failed to prune old notifications: %s", exc)


async def get_user_notifications(
    *,
    user_id: str,
    settings: Settings,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Return the most recent notification/activity items for a user.

    Queries security_activity for the user's events, sorted newest first.
    Tries to include the read_at column (migration 011); falls back
    gracefully to the base columns if the column does not yet exist.
    """
    import json as _json

    async def _fetch(select_cols: str) -> list | None:
        """Run the Supabase query and return the JSON rows, or None on failure."""
        try:
            supabase_url, secret_key = _extract_settings(settings)
            headers = {
                "apikey": secret_key,
                "Authorization": f"Bearer {secret_key}",
            }
            params = {
                "select": select_cols,
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": str(limit),
            }
            activity_url = f"{supabase_url.rstrip('/')}/rest/v1/security_activity"
            client = _get_shared_client()
            response = await client.get(activity_url, headers=headers, params=params)
            if not response.is_success:
                return None
            rows = response.json()
            return rows if isinstance(rows, list) else None
        except Exception:
            return None

    # Try with read_at first (requires migration 011)
    rows = await _fetch("id,event_type,description,device_info,ip_address,created_at,read_at")

    # If that failed (column missing), fall back to base columns
    has_read_at = rows is not None
    if rows is None:
        rows = await _fetch("id,event_type,description,device_info,ip_address,created_at")

    if rows is None:
        return []

    items: list[dict[str, Any]] = []
    for r in rows:
        event_type = str(r.get("event_type") or "")
        raw_desc = str(r.get("description") or "")
        device_info_raw = r.get("device_info") or ""
        document_id: str | None = None
        document_name: str | None = None

        # Parse document metadata stored in device_info as JSON
        if device_info_raw and device_info_raw.startswith("{"):
            try:
                meta = _json.loads(device_info_raw)
                document_id = meta.get("document_id")
                document_name = meta.get("document_name")
            except Exception:
                pass

        # read_at is None when column doesn't exist (treat all as unread)
        read_at_val = r.get("read_at") if has_read_at else None

        item = NotificationItem(
            id=str(r.get("id")),
            event_type=event_type,
            title=EVENT_LABELS.get(event_type, event_type.replace("_", " ").title()),
            description=raw_desc,
            document_id=document_id,
            document_name=document_name,
            created_at=str(r.get("created_at") or ""),
            read_at=read_at_val,
        )
        items.append(item.to_dict())

    return items


async def get_unread_notification_count(
    *,
    user_id: str,
    settings: Settings,
) -> int:
    """Return the count of unread notifications for the user.

    If migration 011 has been applied, counts rows where read_at IS NULL.
    Otherwise counts all notifications for the user (graceful fallback).
    """
    try:
        supabase_url, secret_key = _extract_settings(settings)
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
            "Prefer": "count=exact",
        }
        activity_url = f"{supabase_url.rstrip('/')}/rest/v1/security_activity"
        client = _get_shared_client()

        # First try: filter by read_at IS NULL (requires migration 011)
        params_with_read = {
            "select": "id",
            "user_id": f"eq.{user_id}",
            "read_at": "is.null",
            "limit": "0",
        }
        response = await client.get(activity_url, headers=headers, params=params_with_read)

        if not response.is_success:
            # Fallback: count all user notifications (read_at column missing)
            params_no_read = {
                "select": "id",
                "user_id": f"eq.{user_id}",
                "limit": "0",
            }
            response = await client.get(activity_url, headers=headers, params=params_no_read)
            if not response.is_success:
                return 0

        content_range = response.headers.get("content-range", "")
        if content_range and "/" in content_range:
            total_str = content_range.rsplit("/", 1)[-1]
            if total_str.isdigit():
                return int(total_str)
        return 0
    except Exception:
        return 0


async def mark_notifications_read(
    *,
    user_id: str,
    settings: Settings,
) -> int:
    """Set read_at = now() for all unread notifications belonging to user.

    Requires migration 011 (read_at column).  Returns 0 gracefully if the
    column doesn't exist yet.
    """
    try:
        supabase_url, secret_key = _extract_settings(settings)
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal,count=exact",
        }
        params = {
            "user_id": f"eq.{user_id}",
            "read_at": "is.null",
        }
        patch_payload = {
            "read_at": datetime.now(timezone.utc).isoformat(),
        }
        activity_url = f"{supabase_url.rstrip('/')}/rest/v1/security_activity"
        client = _get_shared_client()
        response = await client.patch(
            activity_url, headers=headers, params=params, json=patch_payload
        )
        if not response.is_success:
            # read_at column may not exist yet — not an error, return 0
            return 0

        content_range = response.headers.get("content-range", "")
        if content_range and "/" in content_range:
            total_str = content_range.rsplit("/", 1)[-1]
            if total_str.isdigit():
                return int(total_str)
        return 0
    except Exception:
        return 0
