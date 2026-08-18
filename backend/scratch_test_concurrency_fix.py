import asyncio
import time
from pathlib import Path
from uuid import uuid4
from google import genai
from google.genai import types

from app.core.config import get_settings
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.ai.providers.gemini import _clean_schema_for_gemini, GeminiExtractionProvider
from app.services.ai.manager import AIExtractionManager
from app.services.ocr.service import default_ocr_service
from app.services.extraction_cache import default_extraction_cache, default_coalescer
from app.services.storage import upload_document_to_storage, download_document_from_storage, build_document_storage_path
from app.services.duplicate_detection import hash_document_content
from app.services.quality import evaluate_extraction_quality

FIXTURES_DIR = Path(__file__).parent / "tests" / "fixtures" / "receipts"
RECEIPT_FILES = [
    FIXTURES_DIR / "Receipt.png",
    FIXTURES_DIR / "interstate_invoice.png",
    FIXTURES_DIR / "restaurant_bill.jpg",
    FIXTURES_DIR / "retail_tax_invoice.png",
]

async def run_pipeline_test():
    settings = get_settings()
    print("Testing 10 consecutive uploads through full pipeline without eager OCR starvation...\n", flush=True)
    
    timings = []
    
    for i in range(1, 11):
        t_start = time.perf_counter()
        base_file = RECEIPT_FILES[(i - 1) % len(RECEIPT_FILES)]
        raw_data = base_file.read_bytes()
        unique_bytes = raw_data + f"\n<!-- salt_{i}_{uuid4().hex} -->".encode("utf-8")
        filename = f"consec_doc_{i}_{base_file.name}"
        
        user_id = "00000000-0000-0000-0000-000000000088"
        doc_id = uuid4()
        storage_path = build_document_storage_path(user_id, filename, doc_id)
        content_type = "image/png" if filename.endswith(".png") else "image/jpeg"
        
        # 1. Storage Upload
        t0 = time.perf_counter()
        await upload_document_to_storage(storage_path, unique_bytes, content_type, settings)
        t_upload = (time.perf_counter() - t0) * 1000
        
        # 2. Storage Download
        t0 = time.perf_counter()
        content = await download_document_from_storage(storage_path, settings)
        t_download = (time.perf_counter() - t0) * 1000
        
        # 3. Hash
        t0 = time.perf_counter()
        c_hash = hash_document_content(content)
        t_hash = (time.perf_counter() - t0) * 1000
        
        # 4. Cache check
        t0 = time.perf_counter()
        cached = await default_extraction_cache.get(c_hash, settings=settings)
        t_cache = (time.perf_counter() - t0) * 1000
        
        # 5. Extraction (LAZY OCR: only if primary vision fails)
        t0 = time.perf_counter()
        validated_extraction = await default_ai_manager.extract_document(
            content,
            content_type=content_type,
            ocr_task=None, # Lazy OCR on demand
        )
        t_ai = (time.perf_counter() - t0) * 1000
        
        # 6. Quality
        t0 = time.perf_counter()
        quality_res = evaluate_extraction_quality(
            validated_extraction,
            ocr_result=None,
            provider_info=default_ai_manager.last_used_provider_info,
        )
        t_qual = (time.perf_counter() - t0) * 1000
        
        # 7. Cache set
        t0 = time.perf_counter()
        await default_extraction_cache.set(c_hash, validated_extraction, settings=settings)
        t_cset = (time.perf_counter() - t0) * 1000
        
        t_total = (time.perf_counter() - t_start)
        timings.append((i, t_upload, t_download, t_ai, t_total))
        print(f"Doc {i:2d} | Upload: {t_upload:6.1f}ms | Download: {t_download:6.1f}ms | AI: {t_ai:6.1f}ms | TOTAL: {t_total:.2f}s | Vendor: {validated_extraction.vendor_company}", flush=True)

    print("\n=======================================================", flush=True)
    print("CONSECUTIVE 10-DOCUMENT BENCHMARK SUMMARY", flush=True)
    print("=======================================================", flush=True)
    for idx, up, down, ai, tot in timings:
        print(f"Document {idx:2d} → {tot:.2f}s (AI: {ai/1000:.2f}s, Storage: {(up+down)/1000:.2f}s)", flush=True)

if __name__ == "__main__":
    asyncio.run(run_pipeline_test())
