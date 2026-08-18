import asyncio
import time
from pathlib import Path
from io import BytesIO
from uuid import uuid4

from app.core.config import get_settings
from app.services.storage import upload_document_to_storage, download_document_from_storage, build_document_storage_path
from app.services.duplicate_detection import hash_document_content
from app.services.extraction_cache import default_extraction_cache, default_coalescer
from app.services.ocr.service import default_ocr_service
from app.services.ai import default_ai_manager
from app.services.quality import evaluate_extraction_quality
from app.services.mathematical_validation import validate_extraction_totals

FIXTURES_DIR = Path(__file__).parent / "tests" / "fixtures" / "receipts"
RECEIPT_FILES = [
    FIXTURES_DIR / "Receipt.png",
    FIXTURES_DIR / "interstate_invoice.png",
    FIXTURES_DIR / "restaurant_bill.jpg",
    FIXTURES_DIR / "retail_tax_invoice.png",
]

async def trace_single_document(doc_index: int, image_bytes: bytes, filename: str, settings):
    print(f"\n==================================================")
    print(f"[*] DOCUMENT {doc_index}: {filename} ({len(image_bytes)} bytes)")
    print(f"==================================================")
    
    t_start = time.perf_counter()
    timings = {}
    
    # 1. Upload to Storage
    t0 = time.perf_counter()
    user_id = "00000000-0000-0000-0000-000000000099"
    doc_id = uuid4()
    storage_path = build_document_storage_path(user_id, filename, doc_id)
    content_type = "image/png" if filename.endswith(".png") else "image/jpeg"
    
    try:
        await upload_document_to_storage(
            storage_path=storage_path,
            content=image_bytes,
            content_type=content_type,
            settings=settings,
        )
        timings["storage_upload"] = (time.perf_counter() - t0) * 1000
    except Exception as e:
        print(f"[!] Storage upload failed: {e}")
        timings["storage_upload"] = -1

    # 2. Storage File Retrieval
    t0 = time.perf_counter()
    try:
        downloaded_bytes = await download_document_from_storage(storage_path, settings)
        timings["storage_download"] = (time.perf_counter() - t0) * 1000
    except Exception as e:
        print(f"[!] Storage download failed: {e}")
        downloaded_bytes = image_bytes
        timings["storage_download"] = -1

    # 3. Content Hash
    t0 = time.perf_counter()
    content_hash = hash_document_content(downloaded_bytes)
    timings["content_hash"] = (time.perf_counter() - t0) * 1000

    # 4. Cache lookup
    t0 = time.perf_counter()
    cached = await default_extraction_cache.get(content_hash, settings=settings)
    timings["cache_lookup"] = (time.perf_counter() - t0) * 1000

    if cached:
        print(f"[+] Cache HIT for Doc {doc_index}")
        validated_extraction = cached
    else:
        print(f"[-] Cache MISS for Doc {doc_index}. Running AI + OCR...")
        
        # 5. AI extraction
        t0 = time.perf_counter()
        ocr_task = asyncio.create_task(
            default_ocr_service.extract_text_from_bytes_async(
                downloaded_bytes, filename=filename
            )
        )
        
        try:
            validated_extraction = await default_ai_manager.extract_document(
                downloaded_bytes,
                content_type=content_type,
                ocr_task=ocr_task,
            )
            timings["ai_extraction"] = (time.perf_counter() - t0) * 1000
            print(f"[+] AI extraction succeeded in {timings['ai_extraction']:.1f}ms")
        except Exception as e:
            timings["ai_extraction"] = (time.perf_counter() - t0) * 1000
            print(f"[!] AI extraction FAILED after {timings['ai_extraction']:.1f}ms: {type(e).__name__}: {e}")
            raise

        # 6. Quality & Math validation
        t0 = time.perf_counter()
        quality_res = evaluate_extraction_quality(
            validated_extraction,
            ocr_result=None,
            provider_info=default_ai_manager.last_used_provider_info,
        )
        math_res = validate_extraction_totals(validated_extraction)
        timings["validation"] = (time.perf_counter() - t0) * 1000

        # 7. Cache write
        t0 = time.perf_counter()
        await default_extraction_cache.set(content_hash, validated_extraction, settings=settings)
        timings["cache_set"] = (time.perf_counter() - t0) * 1000

    t_total = (time.perf_counter() - t_start) * 1000
    timings["total"] = t_total
    
    print("\n--- Timings breakdown (ms) ---")
    for k, v in timings.items():
        print(f"  {k:20s}: {v:.2f} ms")
    print(f"--- TOTAL TIME: {t_total:.2f} ms ({t_total/1000:.2f}s) ---")
    return timings

async def run_diagnostic():
    settings = get_settings()
    print(f"Loaded settings. Gemini Model: {settings.gemini_model}, Groq Model: {settings.groq_model}")
    
    # We will simulate 7 unique documents by adding unique salt bytes to test images so each is a cache miss
    summary = []
    
    for i in range(1, 8):
        base_file = RECEIPT_FILES[(i - 1) % len(RECEIPT_FILES)]
        raw_data = base_file.read_bytes()
        # Make content unique so cache is missed every time (simulating unique consecutive uploads)
        unique_bytes = raw_data + f"\n<!-- unique_salt_{i}_{uuid4().hex} -->".encode("utf-8")
        
        try:
            t = await trace_single_document(i, unique_bytes, f"doc_{i}_{base_file.name}", settings)
            summary.append((i, t.get("total", 0), "SUCCESS"))
        except Exception as e:
            summary.append((i, 0, f"FAILED: {e}"))
            
    print("\n\n==================================================")
    print("CONSECUTIVE UPLOAD TIMING SUMMARY")
    print("==================================================")
    for doc_idx, total_ms, status in summary:
        print(f"Document {doc_idx}: {total_ms/1000:.2f}s | {status}")

if __name__ == "__main__":
    asyncio.run(run_diagnostic())
