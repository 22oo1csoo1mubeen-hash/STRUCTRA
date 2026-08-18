import asyncio
import json
import time
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from PIL import Image
from uuid import uuid4
from starlette.datastructures import UploadFile

from app.core.config import get_settings
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.duplicate_detection import hash_document_content
from app.services.storage import upload_document_to_storage, download_document_from_storage, build_document_storage_path
from app.services.extraction_cache import default_extraction_cache
from app.services.ai.providers.gemini import GeminiExtractionProvider, _clean_schema_for_gemini
from app.services.ai.providers.groq import GroqExtractionProvider
from app.services.ai.manager import AIExtractionManager
from app.services.ocr.service import default_ocr_service
from app.services.mathematical_validation import validate_extraction_totals
from app.services.quality import evaluate_extraction_quality

RECEIPTS_DIR = Path(r"c:\STRUCTRA\Receipts")

def get_image_info(path: Path):
    data = path.read_bytes()
    size = len(data)
    h = sha256(data).hexdigest()
    try:
        with Image.open(BytesIO(data)) as img:
            dims = f"{img.width}x{img.height}"
            img_format = img.format
    except Exception as e:
        dims = "unknown"
        img_format = "unknown"
    ext = path.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        mime = "image/jpeg"
    elif ext == ".png":
        mime = "image/png"
    elif ext == ".pdf":
        mime = "application/pdf"
    else:
        mime = f"image/{ext.lstrip('.')}"
    return {
        "filename": path.name,
        "size": size,
        "dims": dims,
        "format": img_format,
        "mime": mime,
        "hash": h,
        "bytes": data,
    }

async def benchmark_receipt(info: dict, settings):
    filename = info["filename"]
    data = info["bytes"]
    mime = info["mime"]
    
    print(f"\n{'='*70}", flush=True)
    print(f"[*] FORENSIC TEST: {filename} | {info['size']/1024:.1f} KB | {info['dims']} | {mime}", flush=True)
    print(f"    SHA-256: {info['hash'][:16]}...", flush=True)
    print(f"{'='*70}", flush=True)
    
    report = {
        "filename": filename,
        "size_kb": round(info["size"]/1024, 1),
        "dims": info["dims"],
        "mime": mime,
        "hash": info["hash"][:12],
    }
    
    user_id = "00000000-0000-0000-0000-000000000099"
    doc_id = uuid4()
    storage_path = build_document_storage_path(user_id, filename, doc_id)
    
    # 1. Upload to storage
    t0 = time.perf_counter()
    upload_file = UploadFile(
        filename=filename,
        file=BytesIO(data),
        headers={"content-type": mime}
    )
    await upload_document_to_storage(upload_file, user_id, settings, document_id=doc_id)
    t_upload = (time.perf_counter() - t0) * 1000
    report["upload_ms"] = round(t_upload, 1)
    
    # 2. Storage download
    t0 = time.perf_counter()
    content = await download_document_from_storage(storage_path, settings)
    t_download = (time.perf_counter() - t0) * 1000
    report["download_ms"] = round(t_download, 1)
    
    # 3. Content hash
    t0 = time.perf_counter()
    c_hash = hash_document_content(content)
    t_hash = (time.perf_counter() - t0) * 1000
    report["hash_ms"] = round(t_hash, 2)
    
    # Clear memory cache for this hash to force fresh live extraction
    if c_hash in default_extraction_cache._memory_cache:
        del default_extraction_cache._memory_cache[c_hash]
        
    # 4. Measure GEMINI PRIMARY directly with timing and exception tracing
    gemini_provider = GeminiExtractionProvider(settings=settings)
    gemini_success = False
    gemini_err_info = None
    gemini_time = 0.0
    
    t_gem0 = time.perf_counter()
    try:
        print(f"  [>] Invoking Gemini Vision with model: {settings.gemini_model}...", flush=True)
        gemini_result = await gemini_provider.extract_document_bytes(content, content_type=mime)
        gemini_time = (time.perf_counter() - t_gem0) * 1000
        gemini_success = True
        print(f"  [+] Gemini SUCCESS in {gemini_time:.1f}ms | Vendor: {gemini_result.vendor_company} | Total: {gemini_result.total}", flush=True)
    except Exception as e:
        gemini_time = (time.perf_counter() - t_gem0) * 1000
        gemini_err_info = f"{type(e).__name__}: {str(e)[:150]}"
        print(f"  [!] Gemini FAILED in {gemini_time:.1f}ms: {gemini_err_info}", flush=True)
        gemini_result = None
        
    report["gemini_ms"] = round(gemini_time, 1)
    report["gemini_success"] = gemini_success
    report["gemini_err"] = gemini_err_info or "None"

    # 5. Measure RAPIDOCR directly
    t_ocr0 = time.perf_counter()
    try:
        print(f"  [>] Invoking RapidOCR...", flush=True)
        ocr_result = await default_ocr_service.extract_text_from_bytes_async(content, filename=filename)
        ocr_time = (time.perf_counter() - t_ocr0) * 1000
        ocr_success = True
        print(f"  [+] RapidOCR SUCCESS in {ocr_time:.1f}ms | Lines: {len(ocr_result.lines)} | Chars: {len(ocr_result.full_text)}", flush=True)
    except Exception as e:
        ocr_time = (time.perf_counter() - t_ocr0) * 1000
        ocr_success = False
        ocr_result = None
        print(f"  [!] RapidOCR FAILED in {ocr_time:.1f}ms: {e}", flush=True)
        
    report["ocr_ms"] = round(ocr_time, 1)
    report["ocr_lines"] = len(ocr_result.lines) if ocr_result else 0
    report["ocr_chars"] = len(ocr_result.full_text) if ocr_result else 0

    # 6. Measure GROQ FALLBACK directly (if OCR succeeded)
    groq_provider = GroqExtractionProvider(settings=settings)
    groq_success = False
    groq_err_info = None
    groq_time = 0.0
    groq_result = None
    
    if ocr_result and ocr_result.full_text.strip():
        t_groq0 = time.perf_counter()
        try:
            print(f"  [>] Invoking Groq fallback with model: {settings.groq_model}...", flush=True)
            groq_result = await groq_provider.extract_document(ocr_result)
            groq_time = (time.perf_counter() - t_groq0) * 1000
            groq_success = True
            print(f"  [+] Groq SUCCESS in {groq_time:.1f}ms | Vendor: {groq_result.vendor_company} | Total: {groq_result.total}", flush=True)
        except Exception as e:
            groq_time = (time.perf_counter() - t_groq0) * 1000
            groq_err_info = f"{type(e).__name__}: {str(e)[:150]}"
            print(f"  [!] Groq FAILED in {groq_time:.1f}ms: {groq_err_info}", flush=True)
    else:
        groq_err_info = "Skipped (no OCR text)"
        
    report["groq_ms"] = round(groq_time, 1)
    report["groq_success"] = groq_success
    report["groq_err"] = groq_err_info or "None"

    # Effective chosen result
    final_result = gemini_result or groq_result
    chosen_path = "Gemini" if gemini_success else ("Groq/OCR" if groq_success else "FAILED")
    report["chosen_path"] = chosen_path
    
    if final_result:
        # 7. Math & Quality Validation
        t_val0 = time.perf_counter()
        math_res = validate_extraction_totals(final_result)
        qual_res = evaluate_extraction_quality(final_result, ocr_result=ocr_result, provider_info=None)
        val_time = (time.perf_counter() - t_val0) * 1000
        report["validation_ms"] = round(val_time, 2)
        
        # 8. Cache store
        t_c0 = time.perf_counter()
        await default_extraction_cache.set(c_hash, final_result, settings=settings)
        c_time = (time.perf_counter() - t_c0) * 1000
        report["cache_store_ms"] = round(c_time, 1)
    else:
        report["validation_ms"] = 0
        report["cache_store_ms"] = 0

    total_pipeline_time = report["upload_ms"] + report["download_ms"] + (report["gemini_ms"] if gemini_success else (report["gemini_ms"] + report["ocr_ms"] + report["groq_ms"])) + report["validation_ms"]
    report["total_pipeline_sec"] = round(total_pipeline_time / 1000.0, 2)
    
    return report

async def main():
    settings = get_settings()
    files = sorted(list(RECEIPTS_DIR.glob("*.*")))
    print(f"Discovered {len(files)} files in {RECEIPTS_DIR}:\n", flush=True)
    
    file_infos = []
    for f in files:
        if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".pdf"):
            info = get_image_info(f)
            file_infos.append(info)
            print(f" - {info['filename']:20s} | {info['size']/1024:6.1f} KB | {info['dims']:12s} | {info['mime']}", flush=True)
            
    reports = []
    for info in file_infos:
        try:
            r = await benchmark_receipt(info, settings)
            reports.append(r)
        except Exception as e:
            print(f"[FATAL] Benchmark failed for {info['filename']}: {e}", flush=True)

    print("\n\n" + "="*110, flush=True)
    print("FORENSIC BENCHMARK RESULTS TABLE (ALL RECEIPTS)", flush=True)
    print("="*110, flush=True)
    headers = ["Filename", "Size", "Dims", "Gemini(s)", "Gemini Status", "OCR(s)", "Groq(s)", "Path", "Total(s)"]
    print(f"{headers[0]:<22} | {headers[1]:<8} | {headers[2]:<10} | {headers[3]:<9} | {headers[4]:<14} | {headers[5]:<7} | {headers[6]:<7} | {headers[7]:<10} | {headers[8]:<8}", flush=True)
    print("-" * 110, flush=True)
    
    for r in reports:
        gem_s = f"{r['gemini_ms']/1000:.2f}s"
        ocr_s = f"{r['ocr_ms']/1000:.2f}s" if r['ocr_ms'] > 0 else "—"
        groq_s = f"{r['groq_ms']/1000:.2f}s" if r['groq_ms'] > 0 else "—"
        gem_status = "SUCCESS" if r["gemini_success"] else "FAIL/RETRY"
        print(f"{r['filename']:<22} | {r['size_kb']:<5.1f} KB | {r['dims']:<10} | {gem_s:<9} | {gem_status:<14} | {ocr_s:<7} | {groq_s:<7} | {r['chosen_path']:<10} | {r['total_pipeline_sec']:<6.2f}s", flush=True)
        if not r["gemini_success"]:
            print(f"   --> Gemini Error: {r['gemini_err']}", flush=True)
    print("="*110, flush=True)

if __name__ == "__main__":
    asyncio.run(main())
