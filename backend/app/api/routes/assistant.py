"""AI Assistant chat endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse
from app.schemas.auth import CurrentUser
from app.services.assistant import run_assistant_chat

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post(
    "/chat",
    response_model=AssistantChatResponse,
    summary="Send a message to the STRUCTRA AI assistant",
    description=(
        "Sends a natural-language message to the STRUCTRA AI assistant. "
        "The assistant answers using data exclusively from the authenticated user's "
        "persisted Document Library — it never fabricates values. "
        "Conversation history is managed client-side and passed in each request."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
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
    history = [{"role": t.role, "content": t.content} for t in request.history]
    return await run_assistant_chat(
        user_id=str(current_user.user_id),
        message=request.message,
        conversation_history=history,
        settings=settings,
    )
