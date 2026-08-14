"""Gemini AI Extraction Provider implementing AIExtractionProvider using gemini-3.1-flash-lite Multimodal Vision."""

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
from app.services.prompts import (
    build_multimodal_receipt_extraction_prompt,
    build_ocr_receipt_extraction_prompt,
)

_CACHED_GENAI_CLIENTS: dict[str, Any] = {}


def _get_genai_client(api_key: str) -> Any:
    """Return process-level cached google.genai Client instance for the given API key."""
    if api_key not in _CACHED_GENAI_CLIENTS:
        try:
            from google import genai

            _CACHED_GENAI_CLIENTS[api_key] = genai.Client(api_key=api_key)
        except Exception as err:
            raise AIProviderUnavailableError(
                f"Failed to initialize Gemini GenAI client: {err}"
            ) from err
    return _CACHED_GENAI_CLIENTS[api_key]


def _clean_schema_for_gemini(d: Any) -> Any:
    """Strip OpenAPI attributes unsupported by Gemini OpenAPI JSON schema validator."""
    if isinstance(d, dict):
        return {k: _clean_schema_for_gemini(v) for k, v in d.items() if k not in ("additionalProperties", "title")}
    elif isinstance(d, list):
        return [_clean_schema_for_gemini(x) for x in d]
    return d


class GeminiExtractionProvider(AIExtractionProvider):
    """Gemini AI extraction provider encapsulating Google GenAI SDK calls."""

    def __init__(
        self,
        settings: Settings | None = None,
        model_name: str | None = None,
    ) -> None:
        """Initialize GeminiExtractionProvider.

        Args:
            settings: Optional Settings instance. Defaults to get_settings().
            model_name: Optional explicit model override. Defaults to settings.gemini_model.
        """
        self._settings = settings or get_settings()
        self._model_name = model_name or self._settings.gemini_model

    @property
    def provider_name(self) -> str:
        """Return provider name."""
        return "Gemini"

    @property
    def model_name(self) -> str:
        """Return active Gemini model identifier."""
        return self._model_name

    async def extract_document_bytes(
        self,
        document_bytes: bytes,
        content_type: str = "image/png",
        *,
        client: Any | None = None,
    ) -> ReceiptInvoiceExtraction:
        """Extract ReceiptInvoiceExtraction directly from document image bytes via Gemini Vision."""
        if self._settings.gemini_api_key is None:
            raise AIConfigurationError("Gemini API key is not configured.")

        api_key = self._settings.gemini_api_key.get_secret_value().strip()
        if not api_key:
            raise AIConfigurationError("Gemini API key is not configured.")

        if not document_bytes:
            raise AIUnexpectedResponseError("Document content bytes are empty.")

        t_prep0 = time.perf_counter()

        try:
            from google.genai import types

            if client is None:
                client = _get_genai_client(api_key)

            clean_schema = _clean_schema_for_gemini(ReceiptInvoiceExtraction.model_json_schema())
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=clean_schema,
                temperature=0.1,
            )
            image_part = types.Part.from_bytes(data=document_bytes, mime_type=content_type)
        except Exception as err:
            raise AIProviderUnavailableError(
                f"Failed to initialize Gemini GenAI client/parts: {err}"
            ) from err

        prompt_text = build_multimodal_receipt_extraction_prompt()
        t_prep1 = time.perf_counter()
        prep_ms = (t_prep1 - t_prep0) * 1000.0

        max_retries = 3
        base_delay = 1.0
        start_time = time.perf_counter()
        retries_count = 0

        for attempt in range(1, max_retries + 1):
            try:
                t_api0 = time.perf_counter()
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=self._model_name,
                    contents=[image_part, prompt_text],
                    config=config,
                )
                t_api1 = time.perf_counter()
                api_ms = (t_api1 - t_api0) * 1000.0

                t_parse0 = time.perf_counter()
                response_text = getattr(response, "text", None)
                if not isinstance(response_text, str) or not response_text.strip():
                    raise AIUnexpectedResponseError("Gemini Vision returned an empty response.")

                # Strip possible markdown code block wrappers
                clean_text = response_text.strip()
                clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.IGNORECASE)
                clean_text = re.sub(r"\s*```$", "", clean_text)

                try:
                    raw_json = json.loads(clean_text)
                except json.JSONDecodeError as err:
                    raise AIUnexpectedResponseError(
                        f"Gemini returned invalid JSON: {err}"
                    ) from err

                if not isinstance(raw_json, dict):
                    raise AIUnexpectedResponseError("Gemini returned non-dictionary JSON response.")

                try:
                    extraction = ReceiptInvoiceExtraction.model_validate(raw_json)
                except ValidationError as err:
                    print(f"[STRUCTRA ERROR] Pydantic Schema Validation Error: {err}")
                    raise AIExtractionValidationError(
                        "Gemini extraction failed schema validation."
                    ) from err

                t_parse1 = time.perf_counter()
                parse_ms = (t_parse1 - t_parse0) * 1000.0
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0

                print(
                    f"[STRUCTRA AI STAGE METRICS] Primary: {self.provider_name} | "
                    f"Model: {self.model_name} | DocBytes: {len(document_bytes)} | "
                    f"Prep: {prep_ms:.1f}ms | API: {api_ms:.1f}ms | Parse: {parse_ms:.1f}ms | "
                    f"Retries: {retries_count} | TotalAI: {elapsed_ms:.1f}ms"
                )
                return extraction

            except (AIConfigurationError, AIAuthenticationError, AIExtractionValidationError):
                raise
            except Exception as err:
                is_transient = False
                error_category = "Unknown"

                if isinstance(err, AIUnexpectedResponseError):
                    is_transient = True
                    error_category = "UnexpectedResponse"
                elif getattr(err, "code", None) in {401, 403}:
                    raise AIAuthenticationError("Gemini authentication failed.") from err
                elif getattr(err, "code", None) in {429, 500, 502, 503, 504}:
                    is_transient = True
                    error_category = f"APIError_{getattr(err, 'code')}"
                else:
                    err_str = str(err)
                    if "429" in err_str or "503" in err_str or "timeout" in err_str.lower():
                        is_transient = True
                        error_category = "TransientNetworkError"

                if is_transient and attempt < max_retries:
                    retries_count += 1
                    delay = base_delay * (2 ** (attempt - 1))
                    print(
                        f"[STRUCTRA AI] Gemini extraction retry {attempt}/{max_retries} "
                        f"({error_category}) in {delay}s..."
                    )
                    await asyncio.sleep(delay)
                    continue

                print(f"[STRUCTRA AI] Gemini extraction failed on attempt {attempt}: {err}")
                if isinstance(err, (AIUnexpectedResponseError, AIAuthenticationError, AIConfigurationError, AIExtractionValidationError, AIProviderUnavailableError)):
                    raise err
                raise AIProviderUnavailableError("Gemini AI extraction service is unavailable.") from err

        raise AIProviderUnavailableError("Gemini AI extraction service is unavailable.")

    async def extract_document(
        self,
        ocr_result: OCRResult,
        *,
        client: Any | None = None,
    ) -> ReceiptInvoiceExtraction:
        """Extract ReceiptInvoiceExtraction from OCRResult via Gemini API (OCR Text fallback path)."""
        if self._settings.gemini_api_key is None:
            raise AIConfigurationError("Gemini API key is not configured.")

        api_key = self._settings.gemini_api_key.get_secret_value().strip()
        if not api_key:
            raise AIConfigurationError("Gemini API key is not configured.")

        if not ocr_result or not ocr_result.full_text.strip():
            raise AIUnexpectedResponseError("OCR result contains no readable text content.")

        t_prep0 = time.perf_counter()

        try:
            from google.genai import types

            if client is None:
                client = _get_genai_client(api_key)

            clean_schema = _clean_schema_for_gemini(ReceiptInvoiceExtraction.model_json_schema())
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=clean_schema,
                temperature=0.1,
            )
        except Exception as err:
            raise AIProviderUnavailableError(
                f"Failed to initialize Gemini GenAI client: {err}"
            ) from err

        prompt_text = build_ocr_receipt_extraction_prompt(ocr_result.full_text)
        t_prep1 = time.perf_counter()
        prep_ms = (t_prep1 - t_prep0) * 1000.0

        max_retries = 3
        base_delay = 1.0
        start_time = time.perf_counter()
        retries_count = 0

        for attempt in range(1, max_retries + 1):
            try:
                t_api0 = time.perf_counter()
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=self._model_name,
                    contents=[prompt_text],
                    config=config,
                )
                t_api1 = time.perf_counter()
                api_ms = (t_api1 - t_api0) * 1000.0

                t_parse0 = time.perf_counter()
                response_text = getattr(response, "text", None)
                if not isinstance(response_text, str) or not response_text.strip():
                    raise AIUnexpectedResponseError("Gemini returned an empty response.")

                clean_text = response_text.strip()
                clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.IGNORECASE)
                clean_text = re.sub(r"\s*```$", "", clean_text)

                try:
                    raw_json = json.loads(clean_text)
                except json.JSONDecodeError as err:
                    raise AIUnexpectedResponseError(
                        f"Gemini returned invalid JSON: {err}"
                    ) from err

                if not isinstance(raw_json, dict):
                    raise AIUnexpectedResponseError("Gemini returned non-dictionary JSON response.")

                try:
                    extraction = ReceiptInvoiceExtraction.model_validate(raw_json)
                except ValidationError as err:
                    print(f"[STRUCTRA ERROR] Pydantic Schema Validation Error: {err}")
                    raise AIExtractionValidationError(
                        "Gemini extraction failed schema validation."
                    ) from err

                t_parse1 = time.perf_counter()
                parse_ms = (t_parse1 - t_parse0) * 1000.0
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0

                print(
                    f"[STRUCTRA AI STAGE METRICS] Provider: {self.provider_name} | "
                    f"Model: {self.model_name} | PromptLen: {len(prompt_text)} chars | "
                    f"Prep: {prep_ms:.1f}ms | API: {api_ms:.1f}ms | Parse: {parse_ms:.1f}ms | "
                    f"Retries: {retries_count} | TotalAI: {elapsed_ms:.1f}ms"
                )
                return extraction

            except (AIConfigurationError, AIAuthenticationError, AIExtractionValidationError):
                raise
            except Exception as err:
                is_transient = False
                error_category = "Unknown"

                if isinstance(err, AIUnexpectedResponseError):
                    is_transient = True
                    error_category = "UnexpectedResponse"
                elif getattr(err, "code", None) in {401, 403}:
                    raise AIAuthenticationError("Gemini authentication failed.") from err
                elif getattr(err, "code", None) in {429, 500, 502, 503, 504}:
                    is_transient = True
                    error_category = f"APIError_{getattr(err, 'code')}"
                else:
                    err_str = str(err)
                    if "429" in err_str or "503" in err_str or "timeout" in err_str.lower():
                        is_transient = True
                        error_category = "TransientNetworkError"

                if is_transient and attempt < max_retries:
                    retries_count += 1
                    delay = base_delay * (2 ** (attempt - 1))
                    print(
                        f"[STRUCTRA AI] Gemini extraction retry {attempt}/{max_retries} "
                        f"({error_category}) in {delay}s..."
                    )
                    await asyncio.sleep(delay)
                    continue

                print(f"[STRUCTRA AI] Gemini extraction failed on attempt {attempt}: {err}")
                if isinstance(err, (AIUnexpectedResponseError, AIAuthenticationError, AIConfigurationError, AIExtractionValidationError, AIProviderUnavailableError)):
                    raise err
                raise AIProviderUnavailableError("Gemini AI extraction service is unavailable.") from err

        raise AIProviderUnavailableError("Gemini AI extraction service is unavailable.")
