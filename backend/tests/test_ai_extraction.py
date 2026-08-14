"""Milestone 3 unit and integration tests for Multimodal Gemini Vision, Groq GPT-OSS-120B Fallback Provider, and Fallback Manager."""

import asyncio
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.config import Settings, get_settings
from app.schemas.documents import ReceiptInvoiceExtraction, TaxComponent, ReceiptInvoiceLineItem
from app.services.ai import (
    AIExtractionManager,
    AIExtractionProvider,
    GeminiExtractionProvider,
    GroqExtractionProvider,
    default_ai_manager,
    AIExtractionError,
    AIConfigurationError,
    AIAuthenticationError,
    AIProviderUnavailableError,
    AIUnexpectedResponseError,
    AIExtractionValidationError,
)
from app.services.ocr import OCRService, OCRResult

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "receipts"
RETAIL_RECEIPT_PATH = FIXTURES_DIR / "retail_tax_invoice.png"


def _sample_extraction() -> ReceiptInvoiceExtraction:
    return ReceiptInvoiceExtraction(
        vendor_company="SUPERMART RETAIL PRIVATE LIMITED",
        address="123 MG Road, Bengaluru",
        date="14/08/2026",
        invoice_number="INV-2026-08912",
        subtotal=1525.0,
        discount=76.25,
        taxable_amount=1448.75,
        tax=260.78,
        tax_components=[
            TaxComponent(name="CGST", rate=9.0, amount=130.39),
            TaxComponent(name="SGST", rate=9.0, amount=130.39),
        ],
        total=1709.53,
        line_items=[
            ReceiptInvoiceLineItem(description="Basmati Rice 5kg", quantity=1.0, unit_price=650.0, line_total=650.0),
        ],
    )


def test_ai_extraction_provider_abstraction():
    """Verify provider abstraction interface, fallback manager registration, and default singleton."""
    manager = AIExtractionManager()
    assert len(manager.providers) == 2
    assert manager.providers[0].provider_name == "Gemini"
    assert manager.providers[0].model_name == "gemini-3.1-flash-lite"
    assert manager.providers[1].provider_name == "Groq"
    assert manager.providers[1].model_name == "openai/gpt-oss-120b"
    assert default_ai_manager is not None


def test_provider_model_configs():
    """Verify provider model configuration reading."""
    settings = get_settings()
    gemini_p = GeminiExtractionProvider(settings=settings)
    assert gemini_p.model_name == "gemini-3.1-flash-lite"

    groq_p = GroqExtractionProvider(settings=settings)
    assert groq_p.model_name == "openai/gpt-oss-120b"


@pytest.mark.anyio
async def test_gemini_multimodal_vision_bytes_extraction():
    """Verify Gemini provider parses raw document bytes via Multimodal Vision into ReceiptInvoiceExtraction."""
    provider = GeminiExtractionProvider()
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = """{
        "vendor_company": "SUPERMART RETAIL PRIVATE LIMITED",
        "total": 1709.53,
        "line_items": [{"description": "Basmati Rice 5kg", "quantity": 1, "unit_price": 650.0, "line_total": 650.0}]
    }"""
    mock_client.models.generate_content.return_value = mock_response

    sample_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    result = await provider.extract_document_bytes(sample_bytes, "image/png", client=mock_client)

    assert isinstance(result, ReceiptInvoiceExtraction)
    assert result.vendor_company == "SUPERMART RETAIL PRIVATE LIMITED"
    assert result.total == 1709.53


@pytest.mark.anyio
async def test_groq_provider_mocked_extraction():
    """Verify Groq provider parses chat completion JSON response correctly."""
    ocr = OCRService()
    ocr_res = ocr.extract_text_from_file(RETAIL_RECEIPT_PATH)

    provider = GroqExtractionProvider()
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = """{
        "vendor_company": "SUPERMART RETAIL PRIVATE LIMITED",
        "total": 1709.53,
        "line_items": [{"description": "Basmati Rice 5kg", "quantity": 1, "unit_price": 650.0, "line_total": 650.0}]
    }"""
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_response

    result = await provider.extract_document(ocr_res, client=mock_client)

    assert isinstance(result, ReceiptInvoiceExtraction)
    assert result.vendor_company == "SUPERMART RETAIL PRIVATE LIMITED"
    assert result.total == 1709.53


@pytest.mark.anyio
async def test_fallback_manager_gemini_multimodal_success_does_not_call_groq():
    """Gemini Vision Multimodal succeeds -> Groq is NOT called, OCR is not awaited."""
    gemini_p = GeminiExtractionProvider()
    groq_p = GroqExtractionProvider()

    gemini_p.extract_document_bytes = AsyncMock(return_value=_sample_extraction())
    groq_p.extract_document = AsyncMock(return_value=_sample_extraction())

    manager = AIExtractionManager(providers=[gemini_p, groq_p])
    sample_bytes = RETAIL_RECEIPT_PATH.read_bytes()

    # Create dummy OCR task that should NOT be awaited if Gemini succeeds
    async def dummy_ocr():
        await asyncio.sleep(5)
        return OCRResult(full_text="receipt text", lines=[])
        
    ocr_task = asyncio.create_task(dummy_ocr())

    result = await manager.extract_document(sample_bytes, content_type="image/png", ocr_task=ocr_task)

    assert result.vendor_company == "SUPERMART RETAIL PRIVATE LIMITED"
    gemini_p.extract_document_bytes.assert_awaited_once()
    groq_p.extract_document.assert_not_awaited()

    # Cancel dummy task
    ocr_task.cancel()


@pytest.mark.anyio
async def test_fallback_manager_gemini_429_falls_back_to_groq_using_ocr_task():
    """Gemini 429 rate limit failure -> AIExtractionManager awaits pre-started OCR task and calls Groq."""
    gemini_p = GeminiExtractionProvider()
    groq_p = GroqExtractionProvider()

    gemini_p.extract_document_bytes = AsyncMock(side_effect=AIProviderUnavailableError("Gemini 429 Rate Limit Exceeded"))
    groq_p.extract_document = AsyncMock(return_value=_sample_extraction())

    manager = AIExtractionManager(providers=[gemini_p, groq_p])
    sample_bytes = RETAIL_RECEIPT_PATH.read_bytes()
    expected_ocr = OCRResult(full_text="receipt text", lines=[])

    async def quick_ocr():
        return expected_ocr
        
    ocr_task = asyncio.create_task(quick_ocr())

    result = await manager.extract_document(sample_bytes, content_type="image/png", ocr_task=ocr_task)

    assert result.vendor_company == "SUPERMART RETAIL PRIVATE LIMITED"
    gemini_p.extract_document_bytes.assert_awaited_once()
    groq_p.extract_document.assert_awaited_once_with(expected_ocr)


@pytest.mark.anyio
async def test_fallback_manager_non_recoverable_auth_error_no_fallback():
    """Non-recoverable auth/config error fails immediately without calling Groq."""
    gemini_p = GeminiExtractionProvider()
    groq_p = GroqExtractionProvider()

    gemini_p.extract_document_bytes = AsyncMock(side_effect=AIAuthenticationError("Invalid API Key"))
    groq_p.extract_document = AsyncMock(return_value=_sample_extraction())

    manager = AIExtractionManager(providers=[gemini_p, groq_p])
    sample_bytes = RETAIL_RECEIPT_PATH.read_bytes()

    with pytest.raises(AIAuthenticationError):
        await manager.extract_document(sample_bytes)

    gemini_p.extract_document_bytes.assert_awaited_once()
    groq_p.extract_document.assert_not_awaited()


@pytest.mark.anyio
async def test_fallback_manager_both_providers_fail():
    """Both Gemini and Groq fail -> raises AIProviderUnavailableError."""
    gemini_p = GeminiExtractionProvider()
    groq_p = GroqExtractionProvider()

    gemini_p.extract_document_bytes = AsyncMock(side_effect=AIProviderUnavailableError("Gemini 503"))
    groq_p.extract_document = AsyncMock(side_effect=AIProviderUnavailableError("Groq 503"))

    manager = AIExtractionManager(providers=[gemini_p, groq_p])
    sample_bytes = RETAIL_RECEIPT_PATH.read_bytes()

    with pytest.raises(AIProviderUnavailableError):
        await manager.extract_document(sample_bytes)

    gemini_p.extract_document_bytes.assert_awaited_once()
    groq_p.extract_document.assert_awaited_once()


@pytest.mark.anyio
async def test_groq_schema_validation_error():
    """Groq response violates schema -> AIExtractionValidationError."""
    groq_p = GroqExtractionProvider()
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = """{
        "vendor_company": 12345,
        "total": 100.0
    }"""
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_response

    ocr_res = OCRResult(full_text="receipt text", lines=[])

    with pytest.raises(AIExtractionValidationError):
        await groq_p.extract_document(ocr_res, client=mock_client)


def test_provider_ordering():
    """Manager orders Gemini Multimodal first, Groq second."""
    manager = AIExtractionManager()
    assert len(manager.providers) == 2
    assert manager.providers[0].provider_name == "Gemini"
    assert manager.providers[1].provider_name == "Groq"


@pytest.mark.anyio
async def test_live_groq_integration():
    """Optional live provider integration test for Groq if API key is present."""
    settings = get_settings()
    if not settings.groq_api_key or not settings.groq_api_key.get_secret_value().strip():
        pytest.skip("GROQ_API_KEY is not configured for live integration test.")

    ocr = OCRService()
    ocr_result = ocr.extract_text_from_file(RETAIL_RECEIPT_PATH)

    provider = GroqExtractionProvider(settings=settings)
    assert provider.model_name == "openai/gpt-oss-120b"

    try:
        extraction = await provider.extract_document(ocr_result)
    except AIProviderUnavailableError:
        pytest.skip("Groq live service is currently unreachable/rate limited.")

    assert isinstance(extraction, ReceiptInvoiceExtraction)
    assert extraction.vendor_company is not None
    assert extraction.total is not None
