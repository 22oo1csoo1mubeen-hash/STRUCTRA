"""Groq AI Extraction Provider implementing AIExtractionProvider using Groq Chat Completions API."""

import asyncio
import json
import re
import time
from typing import Any
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.ai.provider import AIExtractionProvider
from app.services.ai.schemas import (
    AIAuthenticationError,
    AIConfigurationError,
    AIExtractionValidationError,
    AIProviderUnavailableError,
    AIUnexpectedResponseError,
)
from app.services.ocr.schemas import OCRResult
from app.services.prompts import build_ocr_receipt_extraction_prompt

_CACHED_GROQ_CLIENTS: dict[str, Any] = {}


def _get_groq_client(api_key: str) -> Any:
    """Return process-level cached groq.Groq Client instance for the given API key."""
    if api_key not in _CACHED_GROQ_CLIENTS:
        try:
            from groq import Groq

            _CACHED_GROQ_CLIENTS[api_key] = Groq(api_key=api_key)
        except Exception as err:
            raise AIProviderUnavailableError(
                f"Failed to initialize Groq client: {err}"
            ) from err
    return _CACHED_GROQ_CLIENTS[api_key]


class GroqExtractionProvider(AIExtractionProvider):
    """Groq AI extraction provider encapsulating Groq SDK chat completion calls."""

    def __init__(
        self,
        settings: Settings | None = None,
        model_name: str | None = None,
    ) -> None:
        """Initialize GroqExtractionProvider.

        Args:
            settings: Optional Settings instance. Defaults to get_settings().
            model_name: Optional explicit model override. Defaults to settings.groq_model.
        """
        self._settings = settings or get_settings()
        self._model_name = model_name or self._settings.groq_model

    @property
    def provider_name(self) -> str:
        """Return provider name."""
        return "Groq"

    @property
    def model_name(self) -> str:
        """Return active Groq model identifier."""
        return self._model_name

    async def extract_document(
        self,
        ocr_result: OCRResult,
        *,
        client: Any | None = None,
    ) -> ReceiptInvoiceExtraction:
        """Extract ReceiptInvoiceExtraction from OCRResult via Groq API."""
        if self._settings.groq_api_key is None:
            raise AIConfigurationError("Groq API key is not configured.")

        api_key = self._settings.groq_api_key.get_secret_value().strip()
        if not api_key:
            raise AIConfigurationError("Groq API key is not configured.")

        if not ocr_result or not ocr_result.full_text.strip():
            raise AIUnexpectedResponseError("OCR result contains no readable text content.")

        try:
            if client is None:
                client = _get_groq_client(api_key)
        except Exception as err:
            raise AIProviderUnavailableError(
                f"Failed to initialize Groq client: {err}"
            ) from err

        prompt_text = build_ocr_receipt_extraction_prompt(ocr_result.full_text)

        max_retries = 3
        base_delay = 1.0
        start_time = time.perf_counter()

        for attempt in range(1, max_retries + 1):
            try:
                response = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=self._model_name,
                    messages=[{"role": "user", "content": prompt_text}],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                )

                choices = getattr(response, "choices", None)
                if not choices or len(choices) == 0:
                    raise AIUnexpectedResponseError("Groq returned an empty response choices list.")

                message = getattr(choices[0], "message", None)
                response_text = getattr(message, "content", None) if message else None

                if not isinstance(response_text, str) or not response_text.strip():
                    raise AIUnexpectedResponseError("Groq returned an empty response text content.")

                # Strip possible markdown code block wrappers
                clean_text = response_text.strip()
                clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.IGNORECASE)
                clean_text = re.sub(r"\s*```$", "", clean_text)

                try:
                    raw_json = json.loads(clean_text)
                except json.JSONDecodeError as err:
                    raise AIUnexpectedResponseError(
                        f"Groq returned invalid JSON: {err}"
                    ) from err

                if not isinstance(raw_json, dict):
                    raise AIUnexpectedResponseError("Groq returned non-dictionary JSON response.")

                try:
                    extraction = ReceiptInvoiceExtraction.model_validate(raw_json)
                except ValidationError as err:
                    print(f"[STRUCTRA ERROR] Groq Pydantic Schema Validation Error: {err}")
                    raise AIExtractionValidationError(
                        "Groq extraction failed schema validation."
                    ) from err

                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                print(
                    f"[STRUCTRA AI] Provider: {self.provider_name} | "
                    f"Model: {self._model_name} | "
                    f"Extraction completed in {elapsed_ms:.1f} ms"
                )
                return extraction

            except (AIConfigurationError, AIAuthenticationError, AIExtractionValidationError):
                raise
            except Exception as err:
                is_transient = False
                error_category = "Unknown"
                err_str = str(err)

                if isinstance(err, AIUnexpectedResponseError):
                    is_transient = True
                    error_category = "UnexpectedResponse"
                elif getattr(err, "status_code", None) in {401, 403} or getattr(err, "code", None) in {401, 403}:
                    raise AIAuthenticationError("Groq authentication failed.") from err
                elif getattr(err, "status_code", None) in {429, 500, 502, 503, 504} or getattr(err, "code", None) in {429, 500, 502, 503, 504}:
                    is_transient = True
                    error_category = f"APIError_{getattr(err, 'status_code', getattr(err, 'code', None))}"
                else:
                    if "429" in err_str or "503" in err_str or "timeout" in err_str.lower() or "rate_limit" in err_str.lower():
                        is_transient = True
                        error_category = "TransientNetworkError"

                if is_transient and attempt < max_retries:
                    delay = base_delay * (2 ** (attempt - 1))
                    print(
                        f"[STRUCTRA AI] Groq extraction retry {attempt}/{max_retries} "
                        f"({error_category}) in {delay}s..."
                    )
                    await asyncio.sleep(delay)
                    continue

                print(f"[STRUCTRA AI] Groq extraction failed on attempt {attempt}: {err}")
                if isinstance(err, (AIUnexpectedResponseError, AIAuthenticationError, AIConfigurationError, AIExtractionValidationError, AIProviderUnavailableError)):
                    raise err
                raise AIProviderUnavailableError("Groq AI extraction service is unavailable.") from err

        raise AIProviderUnavailableError("Groq AI extraction service is unavailable.")
