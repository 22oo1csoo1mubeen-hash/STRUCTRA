"""AI Document Extraction Service Package."""

from app.services.ai.manager import AIExtractionManager, default_ai_manager
from app.services.ai.provider import AIExtractionProvider
from app.services.ai.providers.gemini import GeminiExtractionProvider
from app.services.ai.providers.groq import GroqExtractionProvider
from app.services.ai.schemas import (
    AIAuthenticationError,
    AIConfigurationError,
    AIExtractionError,
    AIExtractionValidationError,
    AIProviderUnavailableError,
    AIUnexpectedResponseError,
)

__all__ = [
    "AIExtractionManager",
    "default_ai_manager",
    "AIExtractionProvider",
    "GeminiExtractionProvider",
    "GroqExtractionProvider",
    "AIExtractionError",
    "AIConfigurationError",
    "AIAuthenticationError",
    "AIProviderUnavailableError",
    "AIUnexpectedResponseError",
    "AIExtractionValidationError",
]
