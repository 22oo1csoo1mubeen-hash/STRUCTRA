import asyncio
import time
from pathlib import Path
from app.core.config import get_settings

FIXTURES_DIR = Path(__file__).parent / "tests" / "fixtures" / "receipts"
RECEIPT_FILE = FIXTURES_DIR / "Receipt.png"

async def test_ocr():
    print("\n--- Testing RapidOCR singleton ---", flush=True)
    from app.services.ocr.service import default_ocr_service
    image_bytes = RECEIPT_FILE.read_bytes()
    for i in range(1, 4):
        t0 = time.perf_counter()
        res = await default_ocr_service.extract_text_from_bytes_async(image_bytes)
        t1 = time.perf_counter()
        print(f"RapidOCR run {i}: {(t1-t0)*1000:.1f}ms, lines: {len(res.lines)}, full_text len: {len(res.full_text)}", flush=True)

async def test_gemini():
    print("\n--- Testing Gemini Vision Provider ---", flush=True)
    from app.services.ai.providers.gemini import GeminiExtractionProvider
    settings = get_settings()
    provider = GeminiExtractionProvider(settings=settings)
    image_bytes = RECEIPT_FILE.read_bytes()
    for i in range(1, 8):
        t0 = time.perf_counter()
        try:
            res = await provider.extract_document_bytes(image_bytes, "image/png")
            t1 = time.perf_counter()
            print(f"Gemini Doc {i}: {(t1-t0)*1000:.1f}ms | Vendor: {res.vendor_company}, Total: {res.total}", flush=True)
        except Exception as e:
            t1 = time.perf_counter()
            print(f"Gemini Doc {i} FAILED after {(t1-t0)*1000:.1f}ms: {type(e).__name__}: {e}", flush=True)

async def main():
    await test_ocr()
    await test_gemini()

if __name__ == "__main__":
    asyncio.run(main())
