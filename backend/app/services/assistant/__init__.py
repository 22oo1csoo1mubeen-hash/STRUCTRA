"""AI Assistant package — session-based RAG, deterministic queries, and LLM orchestration."""

from app.services.assistant.context import AssistantContextBuilder
from app.services.assistant.intent import AssistantIntent, AssistantIntentEngine, ParsedQueryIntent
from app.services.assistant.provider import AssistantChatProvider
from app.services.assistant.retrieval import AssistantRetrievalService
from app.services.assistant.service import run_assistant_chat
from app.services.assistant.session import AssistantSession, AssistantSessionManager, default_session_manager

__all__ = [
    "AssistantContextBuilder",
    "AssistantIntent",
    "AssistantIntentEngine",
    "ParsedQueryIntent",
    "AssistantChatProvider",
    "AssistantRetrievalService",
    "run_assistant_chat",
    "AssistantSession",
    "AssistantSessionManager",
    "default_session_manager",
]
