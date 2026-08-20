"""AI Assistant session and chat endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantSessionCreateResponse,
    AssistantSessionResetResponse,
)
from app.schemas.auth import CurrentUser
from app.services.assistant import default_session_manager, run_assistant_chat

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post(
    "/session",
    response_model=AssistantSessionCreateResponse,
    status_code=status.HTTP_200_OK,
    summary="Create an ephemeral assistant session",
    description="Creates a new ephemeral assistant session token scoped to the authenticated user.",
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
    },
)
async def create_session(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> AssistantSessionCreateResponse:
    """Create a new ephemeral assistant session."""
    session = await default_session_manager.create_session(user_id=str(current_user.user_id))
    return AssistantSessionCreateResponse(
        session_id=session.session_id,
        created_at=session.created_at,
        expires_at=session.expires_at,
    )


@router.post(
    "/chat",
    response_model=AssistantChatResponse,
    summary="Send a message to the STRUCTRA AI assistant",
    description=(
        "Sends a natural-language message to the STRUCTRA AI assistant. "
        "The assistant retrieves facts exclusively from the authenticated user's "
        "persisted Document Library with deterministic calculations. "
        "Conversation history is managed during the active browser session."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        404: {"description": "Assistant session not found or expired."},
        422: {"description": "Message is empty or exceeds the 2000-character limit."},
        503: {"description": "AI provider is unavailable or not configured."},
    },
)
async def chat(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    request: AssistantChatRequest,
) -> AssistantChatResponse:
    """Process one assistant turn scoped to the current authenticated user."""
    user_id_str = str(current_user.user_id)

    # Validate session ownership if a session_id was explicitly provided
    if request.session_id is not None:
        session = await default_session_manager.get_session(
            request.session_id,
            user_id=user_id_str,
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant session not found or expired.",
            )

    history = [{"role": t.role, "content": t.content} for t in request.history]
    return await run_assistant_chat(
        user_id=user_id_str,
        message=request.message,
        conversation_history=history,
        session_id=request.session_id,
        settings=settings,
    )


@router.post(
    "/session/{session_id}/reset",
    response_model=AssistantSessionResetResponse,
    summary="Reset an ephemeral assistant session",
    description="Clears the ephemeral conversation history for the specified active session.",
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        404: {"description": "Assistant session not found or expired."},
    },
)
async def reset_session(
    session_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> AssistantSessionResetResponse:
    """Clear conversation history for an active ephemeral session."""
    user_id_str = str(current_user.user_id)
    success = await default_session_manager.reset_session(session_id=session_id, user_id=user_id_str)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assistant session not found or expired.",
        )
    return AssistantSessionResetResponse(
        session_id=session_id,
        status="reset",
        message="Session conversation cleared.",
    )
