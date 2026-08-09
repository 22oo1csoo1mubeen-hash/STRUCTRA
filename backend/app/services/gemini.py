"""Gemini client operations for backend-only AI services."""

from dataclasses import dataclass
from typing import Any

from app.core.config import Settings

GEMINI_FLASH_MODEL = "gemini-2.5-flash"
_CONNECTIVITY_PROMPT = "Reply with exactly: STRUCTRA Gemini connectivity confirmed."


class GeminiConfigurationError(RuntimeError):
    """Raised when Gemini has not been configured for the backend."""


class GeminiAuthenticationError(RuntimeError):
    """Raised when Gemini rejects the configured API key."""


class GeminiServiceUnavailableError(RuntimeError):
    """Raised when Gemini cannot be reached safely."""


class GeminiUnexpectedResponseError(RuntimeError):
    """Raised when Gemini returns no usable text response."""


@dataclass(frozen=True)
class GeminiConnectivityResult:
    """The minimal successful result of a Gemini connectivity verification."""

    model: str
    response_text: str


def verify_gemini_connectivity(
    settings: Settings, *, client: Any | None = None
) -> GeminiConnectivityResult:
    """Verify one backend-to-Gemini request without exposing SDK details.

    This internal function deliberately has no API route. It is intended for
    controlled deployment verification and automated tests using a mock client.
    """
    if settings.gemini_api_key is None:
        raise GeminiConfigurationError("Gemini API key is not configured.")

    api_key = settings.gemini_api_key.get_secret_value().strip()
    if not api_key:
        raise GeminiConfigurationError("Gemini API key is not configured.")

    if client is None:
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
        except Exception as error:
            raise GeminiServiceUnavailableError(
                "Gemini service is unavailable."
            ) from error

    try:
        response = client.models.generate_content(
            model=GEMINI_FLASH_MODEL,
            contents=_CONNECTIVITY_PROMPT,
        )
    except Exception as error:
        if getattr(error, "code", None) in {401, 403}:
            raise GeminiAuthenticationError("Gemini authentication failed.") from error
        raise GeminiServiceUnavailableError("Gemini service is unavailable.") from error

    response_text = getattr(response, "text", None)
    if not isinstance(response_text, str) or not response_text.strip():
        raise GeminiUnexpectedResponseError("Gemini returned an invalid response.")

    return GeminiConnectivityResult(
        model=GEMINI_FLASH_MODEL,
        response_text=response_text.strip(),
    )
