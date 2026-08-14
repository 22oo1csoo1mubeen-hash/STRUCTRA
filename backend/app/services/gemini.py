"""Gemini client operations for backend-only AI services."""

from dataclasses import dataclass
import json
import asyncio
import time
from typing import Any

from app.core.config import Settings
from app.services.prompts import build_receipt_invoice_extraction_prompt

GEMINI_FLASH_MODEL = "gemini-3.1-flash-lite"
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


async def extract_receipt_invoice_document(
    settings: Settings,
    *,
    document_content: bytes,
    mime_type: str,
    client: Any | None = None,
) -> dict[str, object]:
    """Extract JSON from one private receipt or invoice document.

    The caller is responsible for retrieving an ownership-checked document from
    Storage. This service never receives a Storage path or client-provided path.
    """
    if settings.gemini_api_key is None:
        raise GeminiConfigurationError("Gemini API key is not configured.")

    api_key = settings.gemini_api_key.get_secret_value().strip()
    if not api_key:
        raise GeminiConfigurationError("Gemini API key is not configured.")

    try:
        from google import genai
        from google.genai import types

        if client is None:
            client = genai.Client(api_key=api_key)
        document_part = types.Part.from_bytes(data=document_content, mime_type=mime_type)
        config = types.GenerateContentConfig(response_mime_type="application/json")
    except Exception as error:
        raise GeminiServiceUnavailableError("Gemini service is unavailable.") from error

    max_retries = 3
    base_delay = 1.0
    
    for attempt in range(1, max_retries + 1):
        try:
            # Run the synchronous API call in a thread pool to avoid blocking the event loop
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=GEMINI_FLASH_MODEL,
                contents=[build_receipt_invoice_extraction_prompt(), document_part],
                config=config,
            )
            
            response_text = getattr(response, "text", None)
            if not isinstance(response_text, str) or not response_text.strip():
                raise GeminiUnexpectedResponseError("Gemini returned an invalid response.")

            try:
                extraction = json.loads(response_text)
            except json.JSONDecodeError as error:
                raise GeminiUnexpectedResponseError("Gemini returned an invalid response.") from error
                
            if not isinstance(extraction, dict):
                raise GeminiUnexpectedResponseError("Gemini returned an invalid response.")

            if attempt > 1:
                print(f"[STRUCTRA PERF] Gemini extraction succeeded on attempt {attempt}")
            return extraction
            
        except Exception as error:
            is_transient = False
            error_category = "Unknown"
            
            if isinstance(error, GeminiUnexpectedResponseError):
                is_transient = True
                error_category = "UnexpectedResponse"
            elif getattr(error, "code", None) in {401, 403}:
                raise GeminiAuthenticationError("Gemini authentication failed.") from error
            elif getattr(error, "code", None) in {429, 500, 502, 503, 504}:
                is_transient = True
                error_category = f"APIError_{getattr(error, 'code')}"
            else:
                # E.g. 400 INVALID_ARGUMENT is deterministic and shouldn't be retried
                error_str = str(error)
                if "429" in error_str or "503" in error_str or "timeout" in error_str.lower():
                    is_transient = True
                    error_category = "TransientNetworkError"
            
            if is_transient and attempt < max_retries:
                delay = base_delay * (2 ** (attempt - 1))
                print(f"[STRUCTRA PERF] Gemini extraction failed (attempt {attempt}, category {error_category}). Retrying in {delay}s...")
                await asyncio.sleep(delay)
                continue
                
            print(f"[STRUCTRA PERF] Gemini extraction persistently failed (attempt {attempt}, category {error_category}).")
            if isinstance(error, (GeminiUnexpectedResponseError, GeminiAuthenticationError, GeminiConfigurationError, GeminiServiceUnavailableError)):
                raise error
            raise GeminiServiceUnavailableError("Gemini service is unavailable.") from error

    raise GeminiServiceUnavailableError("Gemini service is unavailable.")



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
