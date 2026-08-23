"""User Profile and account metadata API endpoints."""

from typing import Annotated, Any
from fastapi import APIRouter, Depends, File, Request, Response, UploadFile, status

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.auth import CurrentUser
from app.schemas.profile import (
    AccountDeleteRequest,
    AvatarUploadResponse,
    ProfileResponse,
    ProfileUpdateRequest,
    RecordActivityRequest,
    SecurityActivityItem,
    SecurityOverviewData,
)
from app.services.profile import (
    delete_user_account,
    delete_user_avatar,
    get_security_overview,
    get_user_avatar_content,
    get_user_profile_data,
    get_user_security_activity,
    record_security_activity,
    update_user_profile,
    upload_user_avatar,
)

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get(
    "",
    response_model=ProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user profile summary",
    description=(
        "Returns identity, personal details, account plan, member since date, last login, "
        "document count, and storage metrics scoped strictly to the authenticated user."
    ),
    responses={
        200: {"description": "User profile successfully retrieved."},
        401: {"description": "Unauthenticated or invalid bearer token."},
        503: {"description": "Supabase Auth or document metadata service is unavailable."},
    },
)
async def get_profile(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProfileResponse:
    """Return dynamic profile details for the authenticated session."""
    return await get_user_profile_data(
        user_id=current_user.user_id,
        current_user=current_user,
        settings=settings,
    )


@router.patch(
    "",
    response_model=ProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update authenticated user personal information",
    description="Validates and persists updated personal information for the authenticated user.",
    responses={
        200: {"description": "Profile successfully updated."},
        401: {"description": "Unauthenticated or invalid bearer token."},
        422: {"description": "Validation error on provided profile fields."},
        503: {"description": "Profile persistence service is unavailable."},
    },
)
async def update_profile(
    update_req: ProfileUpdateRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProfileResponse:
    """Update personal profile fields for the authenticated user."""
    return await update_user_profile(
        user_id=current_user.user_id,
        update_req=update_req,
        current_user=current_user,
        settings=settings,
    )


@router.post(
    "/picture",
    response_model=AvatarUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload custom profile avatar",
    description="Uploads a new profile picture (JPG, PNG, WEBP <= 2 MB) and binds it to the authenticated user.",
    responses={
        200: {"description": "Profile picture successfully uploaded and persisted."},
        400: {"description": "Invalid file format or empty file."},
        401: {"description": "Unauthenticated or invalid bearer token."},
        413: {"description": "File exceeds 2 MB limit."},
        503: {"description": "Avatar storage is unavailable."},
    },
)
async def upload_profile_picture(
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AvatarUploadResponse:
    """Upload and set custom profile picture for the current user."""
    return await upload_user_avatar(
        user_id=current_user.user_id,
        file=file,
        settings=settings,
        current_user=current_user,
    )


@router.delete(
    "/picture",
    status_code=status.HTTP_200_OK,
    summary="Remove custom profile picture",
    description="Deletes the custom profile picture and restores the account-specific default letter avatar.",
    responses={
        200: {"description": "Profile picture removed successfully."},
        401: {"description": "Unauthenticated or invalid bearer token."},
        503: {"description": "Avatar storage is unavailable."},
    },
)
async def delete_profile_picture(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    """Delete custom avatar and restore default letter avatar."""
    return await delete_user_avatar(
        user_id=current_user.user_id,
        settings=settings,
    )


@router.get(
    "/avatar/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Stream avatar image for a user",
    description="Returns the custom profile picture binary content for the given user ID.",
    responses={
        200: {"description": "Avatar image streamed."},
        404: {"description": "Avatar not found."},
        503: {"description": "Avatar storage is unavailable."},
    },
)
async def get_avatar_image(
    user_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    """Stream user avatar image with public caching header."""
    content, content_type = await get_user_avatar_content(user_id, settings)
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
        },
    )


# ─── Account & Security Routes ────────────────────────────────

@router.get(
    "/security",
    response_model=SecurityOverviewData,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user account & security overview",
    description=(
        "Returns active authentication providers (Google vs Email/Password), password status, "
        "current session device info, and recent security events for the current user."
    ),
    responses={
        200: {"description": "Security overview retrieved successfully."},
        401: {"description": "Unauthenticated or invalid bearer token."},
    },
)
async def get_security(
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SecurityOverviewData:
    """Retrieve security overview for the authenticated session."""
    user_agent = request.headers.get("user-agent")
    client_ip = request.client.host if request.client else None

    return await get_security_overview(
        user_id=current_user.user_id,
        current_user=current_user,
        user_agent=user_agent,
        client_ip=client_ip,
        settings=settings,
    )


@router.get(
    "/security/activity",
    response_model=list[SecurityActivityItem],
    status_code=status.HTTP_200_OK,
    summary="Get user security activity log",
    description="Retrieves chronological security activity records for the authenticated user.",
    responses={
        200: {"description": "Security activity list retrieved."},
        401: {"description": "Unauthenticated or invalid bearer token."},
    },
)
async def get_security_activity_log(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[SecurityActivityItem]:
    """Retrieve all logged security events for the authenticated user."""
    return await get_user_security_activity(
        user_id=current_user.user_id,
        settings=settings,
        limit=50,
    )


@router.post(
    "/security/activity",
    response_model=SecurityActivityItem,
    status_code=status.HTTP_200_OK,
    summary="Record a security activity event",
    description="Logs an authenticated security action (e.g. password_changed, google_linked) into the audit log.",
    responses={
        200: {"description": "Security event recorded."},
        401: {"description": "Unauthenticated or invalid bearer token."},
    },
)
async def log_security_activity(
    req: RecordActivityRequest,
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SecurityActivityItem:
    """Record an audit event for the authenticated user."""
    client_ip = request.client.host if request.client else None
    return await record_security_activity(
        user_id=current_user.user_id,
        event_type=req.event_type,
        description=req.description,
        device_info=req.device_info,
        ip_address=client_ip,
        settings=settings,
    )


# ─── Danger Zone: Account Deletion ────────────────────────────

@router.delete(
    "/account",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete authenticated user account and all data",
    description=(
        "Permanently and irreversibly deletes the authenticated user, all document metadata, "
        "extraction caches, security activity logs, user storage files, and Supabase Auth credentials."
    ),
    responses={
        200: {"description": "Account and all data permanently deleted."},
        400: {"description": "Confirmation text was invalid (must be 'DELETE')."},
        401: {"description": "Unauthenticated or invalid bearer token."},
        503: {"description": "Authentication or storage service failure."},
    },
)
async def delete_account(
    req: AccountDeleteRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    """Delete authenticated user account permanently."""
    return await delete_user_account(
        user_id=current_user.user_id,
        confirmation=req.confirmation,
        settings=settings,
    )

