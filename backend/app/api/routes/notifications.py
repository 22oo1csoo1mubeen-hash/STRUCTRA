"""Notification / activity API endpoints for STRUCTRA.

Provides real-time notification data backed by the existing
public.security_activity table (extended with a read_at column via
migration 011).  All endpoints are strictly user-scoped.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.auth import CurrentUser
from app.services.notifications import (
    get_unread_notification_count,
    get_user_notifications,
    mark_notifications_read,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationListResponse(BaseModel):
    """Response containing notification items and unread count."""

    items: list[dict[str, Any]]
    unread_count: int
    total: int


class MarkReadResponse(BaseModel):
    """Response for mark-all-read action."""

    marked_read: int
    message: str = "All notifications marked as read."


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get notification / activity feed for current user",
    description=(
        "Returns the authenticated user's recent activity (document events + "
        "account/security events) sorted by newest first, along with the count "
        "of unread notifications.  User A will never receive User B's events."
    ),
    responses={
        200: {"description": "Notification list retrieved."},
        401: {"description": "Unauthenticated or invalid bearer token."},
    },
)
async def get_notifications(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> NotificationListResponse:
    """Return notification items and unread count for the authenticated user."""
    items = await get_user_notifications(
        user_id=current_user.user_id,
        settings=settings,
        limit=50,
    )
    unread_count = await get_unread_notification_count(
        user_id=current_user.user_id,
        settings=settings,
    )
    return NotificationListResponse(
        items=items,
        unread_count=unread_count,
        total=len(items),
    )


@router.post(
    "/mark-read",
    response_model=MarkReadResponse,
    summary="Mark all notifications as read",
    description=(
        "Sets read_at = now() for every unread notification belonging to the "
        "authenticated user.  No other user's notifications are affected."
    ),
    responses={
        200: {"description": "Notifications marked as read."},
        401: {"description": "Unauthenticated or invalid bearer token."},
    },
)
async def mark_all_read(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> MarkReadResponse:
    """Mark all current user's unread notifications as read."""
    count = await mark_notifications_read(
        user_id=current_user.user_id,
        settings=settings,
    )
    return MarkReadResponse(marked_read=count)
