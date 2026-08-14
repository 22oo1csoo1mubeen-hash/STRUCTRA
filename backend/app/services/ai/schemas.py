"""Provider-agnostic exception classes and data structures for AI extraction."""

class AIExtractionError(Exception):
    """Base exception for all AI extraction provider errors."""


class AIConfigurationError(AIExtractionError):
    """Raised when an AI provider is unconfigured (e.g. missing API key)."""


class AIAuthenticationError(AIExtractionError):
    """Raised when AI provider authentication fails (e.g. invalid API key)."""


class AIProviderUnavailableError(AIExtractionError):
    """Raised when an AI provider cannot be reached or returns service unavailable errors."""


class AIUnexpectedResponseError(AIExtractionError):
    """Raised when an AI provider returns empty, invalid, or unparseable JSON."""


class AIExtractionValidationError(AIExtractionError):
    """Raised when raw AI provider output does not satisfy STRUCTRA's extraction schema."""
