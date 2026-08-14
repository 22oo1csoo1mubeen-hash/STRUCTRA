"""AI Extraction Provider Manager orchestrating primary Multimodal Vision and fallback OCR extraction providers."""

import asyncio
from typing import Any, List, Optional
from pydantic import BaseModel

from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.ai.provider import AIExtractionProvider
from app.services.ai.providers.gemini import GeminiExtractionProvider
from app.services.ai.providers.groq import GroqExtractionProvider
from app.services.ai.schemas import (
    AIAuthenticationError,
    AIConfigurationError,
    AIExtractionValidationError,
    AIProviderUnavailableError,
    AIUnexpectedResponseError,
)
from app.services.ocr.schemas import OCRResult
from app.services.ocr.service import default_ocr_service
from app.services.quality.schemas import ProviderInfo


class ExtractionExecutionResult(BaseModel):
    """Encapsulates extracted structured model alongside exact AI provider execution metadata."""

    extraction: ReceiptInvoiceExtraction
    provider_info: ProviderInfo


class AIExtractionManager:
    """Manager orchestrating Gemini Multimodal Vision Primary and Groq OCR Fallback providers."""

    def __init__(
        self,
        providers: List[AIExtractionProvider] | None = None,
        provider: AIExtractionProvider | None = None,
    ) -> None:
        """Initialize AIExtractionManager.

        Args:
            providers: Optional explicit list of ordered providers. Defaults to [Gemini, Groq].
            provider: Optional single provider override for backward compatibility.
        """
        if providers is not None:
            self._providers = providers
        elif provider is not None:
            self._providers = [provider]
        else:
            self._providers = [
                GeminiExtractionProvider(),
                GroqExtractionProvider(),
            ]
        self.last_used_provider_info: ProviderInfo | None = None

    @property
    def providers(self) -> List[AIExtractionProvider]:
        """Return list of configured providers in fallback order."""
        return self._providers

    @property
    def active_provider(self) -> AIExtractionProvider:
        """Return the current primary provider instance."""
        return self._providers[0]

    def set_provider(self, provider: AIExtractionProvider) -> None:
        """Set or update the single primary extraction provider."""
        self._providers = [provider]

    def set_providers(self, providers: List[AIExtractionProvider]) -> None:
        """Set or update the list of ordered extraction providers."""
        if not providers:
            raise ValueError("Providers list cannot be empty.")
        self._providers = providers

    async def extract_document(
        self,
        document_bytes: bytes | OCRResult,
        content_type: str = "image/png",
        *,
        ocr_task: asyncio.Task | OCRResult | None = None,
        client: Any | None = None,
    ) -> ReceiptInvoiceExtraction:
        """Execute document extraction using Gemini Vision primary with automatic Groq OCR fallback.

        Tracks exact provider_info used in self.last_used_provider_info.
        """
        if isinstance(document_bytes, OCRResult):
            for idx, provider in enumerate(self._providers):
                try:
                    current_client = client if idx == 0 else None
                    extraction = await provider.extract_document(document_bytes, client=current_client)
                    self.last_used_provider_info = ProviderInfo(
                        provider=provider.provider_name, model=provider.model_name
                    )
                    return extraction
                except (AIConfigurationError, AIAuthenticationError, AIExtractionValidationError) as err:
                    raise err
                except (AIProviderUnavailableError, AIUnexpectedResponseError):
                    continue
            raise AIProviderUnavailableError("All AI extraction providers unavailable.")

        primary_provider = self._providers[0]
        fallback_provider = self._providers[1] if len(self._providers) > 1 else None

        # 1. Attempt Primary Gemini Multimodal Vision Extraction
        try:
            print(f"[STRUCTRA AI] Primary: {primary_provider.provider_name} | Model: {primary_provider.model_name}")
            extraction = await primary_provider.extract_document_bytes(
                document_bytes, content_type, client=client
            )
            self.last_used_provider_info = ProviderInfo(
                provider=primary_provider.provider_name, model=primary_provider.model_name
            )
            return extraction
        except (AIConfigurationError, AIAuthenticationError, AIExtractionValidationError) as err:
            print(
                f"[STRUCTRA AI] Primary provider {primary_provider.provider_name} failed with non-recoverable error ({type(err).__name__}): {err}"
            )
            raise err
        except (AIProviderUnavailableError, AIUnexpectedResponseError, NotImplementedError) as gemini_err:
            if fallback_provider is None:
                raise gemini_err

            print(
                f"[STRUCTRA AI] {primary_provider.provider_name} unavailable | "
                f"Reason: {gemini_err} | Falling back to {fallback_provider.provider_name}"
            )

        # 2. Resolve OCRResult for Fallback Provider (Groq)
        ocr_result: OCRResult
        if isinstance(ocr_task, OCRResult):
            ocr_result = ocr_task
        elif isinstance(ocr_task, asyncio.Task):
            print("[STRUCTRA AI] Awaiting pre-started Local OCR task for fallback...")
            ocr_result = await ocr_task
        else:
            print("[STRUCTRA AI] Executing Local OCR for fallback...")
            ocr_result = await default_ocr_service.extract_text_from_bytes_async(document_bytes)

        # 3. Execute Fallback Provider (Groq)
        try:
            print(f"[STRUCTRA AI] Provider: {fallback_provider.provider_name} | Model: {fallback_provider.model_name}")
            extraction = await fallback_provider.extract_document(ocr_result)
            self.last_used_provider_info = ProviderInfo(
                provider=fallback_provider.provider_name, model=fallback_provider.model_name
            )
            return extraction
        except Exception as groq_err:
            print(f"[STRUCTRA AI] Fallback provider {fallback_provider.provider_name} failed: {groq_err}")
            if isinstance(groq_err, (AIUnexpectedResponseError, AIAuthenticationError, AIConfigurationError, AIExtractionValidationError, AIProviderUnavailableError)):
                raise groq_err
            raise AIProviderUnavailableError("All AI extraction providers unavailable.") from groq_err

    async def extract_document_with_metadata(
        self,
        document_bytes: bytes | OCRResult,
        content_type: str = "image/png",
        *,
        ocr_task: asyncio.Task | OCRResult | None = None,
        client: Any | None = None,
    ) -> ExtractionExecutionResult:
        """Execute document extraction returning ReceiptInvoiceExtraction and exact ProviderInfo."""
        extraction = await self.extract_document(
            document_bytes, content_type=content_type, ocr_task=ocr_task, client=client
        )
        p_info = self.last_used_provider_info or ProviderInfo(
            provider=self.active_provider.provider_name,
            model=self.active_provider.model_name,
        )
        return ExtractionExecutionResult(extraction=extraction, provider_info=p_info)

    async def extract_document_from_ocr(
        self,
        ocr_result: OCRResult,
        *,
        client: Any | None = None,
    ) -> ReceiptInvoiceExtraction:
        """Execute text-only extraction from OCRResult across configured providers."""
        last_error: Exception | None = None

        for idx, provider in enumerate(self._providers):
            try:
                current_client = client if idx == 0 else None
                res = await provider.extract_document(ocr_result, client=current_client)
                self.last_used_provider_info = ProviderInfo(
                    provider=provider.provider_name, model=provider.model_name
                )
                return res
            except (AIConfigurationError, AIAuthenticationError, AIExtractionValidationError) as err:
                raise err
            except (AIProviderUnavailableError, AIUnexpectedResponseError) as err:
                last_error = err

        if isinstance(last_error, (AIProviderUnavailableError, AIUnexpectedResponseError)):
            raise last_error
        raise AIProviderUnavailableError("All AI extraction providers unavailable.")


# Global default manager singleton configuring Gemini Vision (Primary) and Groq (Fallback)
default_ai_manager = AIExtractionManager()
