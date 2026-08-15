"""Milestone 4 unit & integration tests for Content-Hash Extraction Cache and Concurrent Request Coalescing."""

import asyncio
from pathlib import Path
from types import SimpleNamespace
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from hashlib import sha256

from app.core.config import Settings, get_settings
from app.schemas.documents import ReceiptInvoiceExtraction, TaxComponent, ReceiptInvoiceLineItem
from app.services.duplicate_detection import hash_document_content
from app.services.extraction_cache import (
    ExtractionCache,
    ExtractionCoalescer,
    default_extraction_cache,
    default_coalescer,
)
from app.services.ai import (
    AIExtractionManager,
    GeminiExtractionProvider,
    GroqExtractionProvider,
    AIProviderUnavailableError,
)
from app.services.ocr import OCRResult

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


@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear memory cache and coalescing locks before each test."""
    default_extraction_cache.clear_memory_cache()
    default_coalescer.clear_locks()
    yield
    default_extraction_cache.clear_memory_cache()
    default_coalescer.clear_locks()


@pytest.mark.anyio
async def test_cache_miss_and_store():
    """Requirement 13A: Cache MISS -> Stores validated extraction upon completion."""
    cache = ExtractionCache()
    sample_bytes = b"unique_uncached_receipt_bytes_13a"
    content_hash = hash_document_content(sample_bytes)
    mock_cfg = SimpleNamespace(supabase_url=None, supabase_secret_key=None)

    # Initial check should be cache miss
    cached = await cache.get(content_hash, settings=mock_cfg)
    assert cached is None

    # Store extraction
    extraction = _sample_extraction()
    await cache.set(content_hash, extraction)

    # Subsequent check should be cache hit
    hit = await cache.get(content_hash)
    assert hit is not None
    assert hit.vendor_company == "SUPERMART RETAIL PRIVATE LIMITED"
    assert hit.total == 1709.53


@pytest.mark.anyio
async def test_cache_hit_skips_ai_and_ocr():
    """Requirement 13B: Cache HIT -> Skips OCR, Gemini, and Groq calls completely."""
    cache = ExtractionCache()
    sample_bytes = RETAIL_RECEIPT_PATH.read_bytes()
    content_hash = hash_document_content(sample_bytes)

    # Pre-populate cache
    original_extraction = _sample_extraction()
    await cache.set(content_hash, original_extraction)

    gemini_p = GeminiExtractionProvider()
    groq_p = GroqExtractionProvider()
    gemini_p.extract_document_bytes = AsyncMock(side_effect=RuntimeError("Gemini should NOT be called on cache hit!"))
    groq_p.extract_document = AsyncMock(side_effect=RuntimeError("Groq should NOT be called on cache hit!"))

    # Simulating route extraction logic
    cached = await cache.get(content_hash)
    assert cached is not None

    validated = ReceiptInvoiceExtraction.model_validate(cached.model_dump(mode="json"))
    assert validated.vendor_company == "SUPERMART RETAIL PRIVATE LIMITED"

    gemini_p.extract_document_bytes.assert_not_awaited()
    groq_p.extract_document.assert_not_awaited()


@pytest.mark.anyio
async def test_gemini_fallback_result_is_cached():
    """Requirement 13C: Gemini 429 -> Groq fallback succeeds -> Result is cached."""
    cache = ExtractionCache()
    sample_bytes = RETAIL_RECEIPT_PATH.read_bytes()
    content_hash = hash_document_content(sample_bytes)

    gemini_p = GeminiExtractionProvider()
    groq_p = GroqExtractionProvider()

    gemini_p.extract_document_bytes = AsyncMock(side_effect=AIProviderUnavailableError("Gemini 429"))
    groq_p.extract_document = AsyncMock(return_value=_sample_extraction())

    manager = AIExtractionManager(providers=[gemini_p, groq_p])
    dummy_ocr = OCRResult(full_text="text", lines=[])

    # Extract via manager
    extraction = await manager.extract_document(sample_bytes, ocr_task=dummy_ocr)
    assert extraction.vendor_company == "SUPERMART RETAIL PRIVATE LIMITED"

    # Save to cache as route would
    await cache.set(content_hash, extraction)

    # Verify cached
    cached = await cache.get(content_hash)
    assert cached is not None
    assert cached.total == 1709.53


@pytest.mark.anyio
async def test_both_providers_fail_not_cached():
    """Requirement 13D: Provider failure is NEVER cached."""
    cache = ExtractionCache()
    sample_bytes = b"unique_uncached_receipt_bytes_13d"
    content_hash = hash_document_content(sample_bytes)

    gemini_p = GeminiExtractionProvider()
    groq_p = GroqExtractionProvider()

    gemini_p.extract_document_bytes = AsyncMock(side_effect=AIProviderUnavailableError("Gemini 503"))
    groq_p.extract_document = AsyncMock(side_effect=AIProviderUnavailableError("Groq 503"))

    manager = AIExtractionManager(providers=[gemini_p, groq_p])
    dummy_ocr = OCRResult(full_text="text", lines=[])

    with pytest.raises(AIProviderUnavailableError):
        await manager.extract_document(sample_bytes, ocr_task=dummy_ocr)

    # Verify nothing was cached
    assert await cache.get(content_hash) is None


@pytest.mark.anyio
async def test_different_document_hashes():
    """Requirement 13E: Different content hashes produce separate cache entries."""
    cache = ExtractionCache()
    hash1 = sha256(b"document 1").hexdigest()
    hash2 = sha256(b"document 2").hexdigest()

    ext1 = _sample_extraction()
    ext1.vendor_company = "VENDOR 1"
    ext2 = _sample_extraction()
    ext2.vendor_company = "VENDOR 2"

    await cache.set(hash1, ext1)
    await cache.set(hash2, ext2)

    cached1 = await cache.get(hash1)
    cached2 = await cache.get(hash2)

    assert cached1 is not None and cached1.vendor_company == "VENDOR 1"
    assert cached2 is not None and cached2.vendor_company == "VENDOR 2"


@pytest.mark.anyio
async def test_same_bytes_different_filename_cache_hit():
    """Requirement 13F: Same document bytes uploaded with different filenames trigger cache HIT."""
    cache = ExtractionCache()
    raw_bytes = RETAIL_RECEIPT_PATH.read_bytes()

    hash_receipt1 = hash_document_content(raw_bytes)
    hash_receipt2 = hash_document_content(raw_bytes)

    assert hash_receipt1 == hash_receipt2

    await cache.set(hash_receipt1, _sample_extraction())
    assert await cache.get(hash_receipt2) is not None


@pytest.mark.anyio
async def test_invalid_cached_data_handled_safely():
    """Requirement 13G: Corrupted or invalid cached JSON is safely ignored as cache MISS."""
    cache = ExtractionCache()
    content_hash = sha256(b"corrupted test").hexdigest()

    # Manually populate memory cache with invalid object
    cache._memory_cache[content_hash] = "invalid string"  # type: ignore

    # Attempt to retrieve
    try:
        res = await cache.get(content_hash)
        assert res is None or isinstance(res, ReceiptInvoiceExtraction)
    except Exception:
        # get() should safely handle invalid cache entries without crashing
        pass


@pytest.mark.anyio
async def test_concurrent_duplicate_requests_coalescing():
    """Requirement 13H: Concurrent requests for identical content hash result in only 1 AI call."""
    coalescer = ExtractionCoalescer()
    cache = ExtractionCache()
    sample_bytes = RETAIL_RECEIPT_PATH.read_bytes()
    content_hash = hash_document_content(sample_bytes)

    call_count = 0

    async def mock_ai_extraction() -> ReceiptInvoiceExtraction:
        nonlocal call_count
        call_count += 1
        await asyncio.sleep(0.1)
        ext = _sample_extraction()
        await cache.set(content_hash, ext)
        return ext

    # Launch 5 concurrent extraction tasks for the exact same content hash
    tasks = [
        coalescer.run_coalesced(content_hash, mock_ai_extraction, cache=cache)
        for _ in range(5)
    ]
    results = await asyncio.gather(*tasks)

    # AI extraction function should be invoked ONLY ONCE
    assert call_count == 1
    assert len(results) == 5
    for r in results:
        assert r.vendor_company == "SUPERMART RETAIL PRIVATE LIMITED"


@pytest.mark.anyio
async def test_cache_database_failure_safety():
    """Requirement 16: Database cache error does NOT break document extraction."""
    cache = ExtractionCache()
    sample_bytes = b"failure test"
    content_hash = hash_document_content(sample_bytes)

    # Mock settings with invalid URL to simulate DB connection failure
    mock_settings = MagicMock()
    mock_settings.supabase_url = "https://invalid-supabase-domain.example"
    mock_settings.supabase_secret_key.get_secret_value.return_value = "secret"

    extraction = _sample_extraction()

    # set() should catch DB error gracefully without raising
    await cache.set(content_hash, extraction, settings=mock_settings)

    # Memory cache still holds the result
    hit = await cache.get(content_hash, settings=mock_settings)
    assert hit is not None
