"""Pydantic schemas for the AI Assistant chat endpoint."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class ConversationTurn(BaseModel):
    """A single conversation turn (user or assistant message)."""

    role: Literal["user", "assistant"] = Field(description="The speaker role.")
    content: str = Field(min_length=1, description="The message content.")


class AssistantChatRequest(BaseModel):
    """Incoming chat request from the user."""

    message: str = Field(
        min_length=1,
        max_length=2000,
        description="The user's natural-language question for the AI assistant.",
    )
    history: list[ConversationTurn] = Field(
        default_factory=list,
        description=(
            "Previous conversation turns (up to last 8 are used). "
            "Pass an empty list for the first message in a session."
        ),
    )


class AssistantChatResponse(BaseModel):
    """Structured reply returned by the AI assistant."""

    reply: str = Field(description="The assistant's plain-text or markdown reply.")
    metadata: dict[str, Any] | None = Field(
        default=None,
        description=(
            "Optional structured data payload the frontend may use to render "
            "a rich result card (e.g. item counts, totals, vendor name)."
        ),
    )
