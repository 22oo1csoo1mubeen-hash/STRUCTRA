"""Abstract base class interface for AI document extraction providers."""

from abc import ABC, abstractmethod
from typing import Any

from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.ocr.schemas import OCRResult


class AIExtractionProvider(ABC):
    """Abstract interface defining document extraction capability for AI providers.

    Specific AI providers (Gemini, Groq, etc.) implement this interface,
    accepting original document bytes (multimodal vision) or local OCRResult (text/layout).
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the unique provider name (e.g. 'Gemini', 'Groq')."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the active model identifier used by this provider."""

    async def extract_document_bytes(
        self,
        document_bytes: bytes,
        content_type: str = "image/png",
        *,
        client: Any | None = None,
    ) -> ReceiptInvoiceExtraction:
        """Extract structured receipt/invoice data directly from original document bytes (Multimodal Vision).

        Default fallback raises NotImplementedError if provider is text-only.
        """
        raise NotImplementedError(f"{self.provider_name} does not support raw document bytes extraction.")

    @abstractmethod
    async def extract_document(
        self,
        ocr_result: OCRResult,
        *,
        client: Any | None = None,
    ) -> ReceiptInvoiceExtraction:
        """Extract structured receipt/invoice data from local OCR result.

        Args:
            ocr_result: Structured result from local OCR engine.
            client: Optional pre-configured provider client instance.

        Returns:
            Validated ReceiptInvoiceExtraction model.
        """
