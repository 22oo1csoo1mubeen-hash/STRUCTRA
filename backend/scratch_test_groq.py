import asyncio
import time
from pathlib import Path
from app.core.config import get_settings
from app.services.ocr.service import default_ocr_service
from app.services.ai.providers.groq import GroqExtractionProvider

FIXTURES_DIR = Path(__file__).parent / "tests" / "fixtures" / "receipts"
RECEIPT_FILE = FIXTURES_DIR / "Receipt.png"

async def test_groq_fallback():
    settings = get_settings()
    groq_provider = GroqExtractionProvider(settings=settings)
    image_bytes = RECEIPT_FILE.read_bytes()
    
    print("\n--- Testing Groq Fallback with RapidOCR ---", flush=True)
    t0 = time.perf_counter()
    ocr_result = await default_ocr_service.extract_text_from_bytes_async(image_bytes)
    t_ocr = time.perf_counter() - t0
    print(f"OCR completed in {t_ocr*1000:.1f}ms", flush=True)
    
    t0 = time.perf_counter()
    ext = await groq_provider.extract_document(ocr_result)
    t_groq = time.perf_counter() - t0
    print(f"Groq extraction completed in {t_groq*1000:.1f}ms | Vendor: {ext.vendor_company}, Total: {ext.total}", flush=True)

if __name__ == "__main__":
    asyncio.run(test_groq_fallback())
