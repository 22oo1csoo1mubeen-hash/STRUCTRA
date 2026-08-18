import asyncio
import time
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from starlette.datastructures import UploadFile
from google import genai
from google.genai import types

from app.core.config import get_settings
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.ai.providers.gemini import _clean_schema_for_gemini
from app.services.ai.manager import AIExtractionManager
from app.services.ai.provider import AIExtractionProvider
from app.services.ocr.schemas import OCRResult
from app.services.ocr.service import default_ocr_service
from app.services.extraction_cache import default_extraction_cache
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

class FixedGeminiProvider(AIExtractionProvider):
    def __init__(self, settings=None):
        self._settings = settings or get_settings()
        self._model_name = self._settings.gemini_model
        api_key = self._settings.gemini_api_key.get_secret_value()
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=30.0)
        )

    @property
    def provider_name(self) -> str:
        return "Gemini"

    @property
    def model_name(self) -> str:
        return self._model_name

    async def extract_document_bytes(self, document_bytes: bytes, content_type: str = "image/png", *, client=None) -> ReceiptInvoiceExtraction:
        clean_schema = _clean_schema_for_gemini(ReceiptInvoiceExtraction.model_json_schema())
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=clean_schema,
            temperature=0.1,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )
        mime_type = "image/jpeg" if content_type in ("image/jpg", "image/jpeg") else content_type
        image_part = types.Part.from_bytes(data=document_bytes, mime_type=mime_type)
        from app.services.prompts import build_multimodal_receipt_extraction_prompt
        prompt_text = build_multimodal_receipt_extraction_prompt()

        active_client = client or self._client
        # Native async call without thread-pool starvation
        response = await active_client.aio.models.generate_content(
            model=self._model_name,
            contents=[image_part, prompt_text],
            config=config,
        )
        import json, re
        clean_text = response.text.strip()
        clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r"\s*```$", "", clean_text)
        raw_json = json.loads(clean_text)
        return ReceiptInvoiceExtraction.model_validate(raw_json)

    async def extract_document(self, ocr_result: OCRResult, *, client=None) -> ReceiptInvoiceExtraction:
        clean_schema = _clean_schema_for_gemini(ReceiptInvoiceExtraction.model_json_schema())
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=clean_schema,
            temperature=0.1,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )
        from app.services.prompts import build_ocr_receipt_extraction_prompt
        prompt_text = build_ocr_receipt_extraction_prompt(ocr_result.full_text)
        active_client = client or self._client
        response = await active_client.aio.models.generate_content(
            model=self._model_name,
            contents=[prompt_text],
            config=config,
        )
        import json, re
        clean_text = response.text.strip()
        clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r"\s*```$", "", clean_text)
        raw_json = json.loads(clean_text)
        return ReceiptInvoiceExtraction.model_validate(raw_json)

async def test_10_documents():
    settings = get_settings()
    manager = AIExtractionManager(providers=[FixedGeminiProvider(settings)])
    
    print("\n=======================================================", flush=True)
    print("RUNNING 10 CONSECUTIVE DOCUMENTS WITH FIXES", flush=True)
    print("=======================================================\n", flush=True)
    
    timings = []
    
    for i in range(1, 11):
        t_start = time.perf_counter()
        base_file = RECEIPT_FILES[(i - 1) % len(RECEIPT_FILES)]
        raw_data = base_file.read_bytes()
        unique_bytes = raw_data + f"\n<!-- unique_{i}_{uuid4().hex} -->".encode("utf-8")
        filename = f"bench_doc_{i}_{base_file.name}"
        user_id = "00000000-0000-0000-0000-000000000077"
        doc_id = uuid4()
        
        # Upload to Storage
        t0 = time.perf_counter()
        upload_file = UploadFile(
            filename=filename,
            file=BytesIO(unique_bytes),
            headers={"content-type": "image/png" if filename.endswith(".png") else "image/jpeg"}
        )
        storage_path = await upload_document_to_storage(upload_file, user_id, settings, document_id=doc_id)
        t_upload = (time.perf_counter() - t0) * 1000
        
        # Download from Storage
        t0 = time.perf_counter()
        content = await download_document_from_storage(storage_path, settings)
        t_download = (time.perf_counter() - t0) * 1000
        
        # Hash & Cache Check
        t0 = time.perf_counter()
        c_hash = hash_document_content(content)
        cached = await default_extraction_cache.get(c_hash, settings=settings)
        t_cache = (time.perf_counter() - t0) * 1000
        
        # Extract (Native async + 0 thinking budget + Lazy OCR)
        t0 = time.perf_counter()
        validated_extraction = await manager.extract_document(
            content,
            content_type=upload_file.content_type,
            ocr_task=None, # Lazy OCR
        )
        t_ai = (time.perf_counter() - t0) * 1000
        
        # Quality
        t0 = time.perf_counter()
        quality_res = evaluate_extraction_quality(
            validated_extraction,
            ocr_result=None,
            provider_info=manager.last_used_provider_info,
        )
        t_qual = (time.perf_counter() - t0) * 1000
        
        # Cache Store
        t0 = time.perf_counter()
        await default_extraction_cache.set(c_hash, validated_extraction, settings=settings)
        t_cset = (time.perf_counter() - t0) * 1000
        
        t_total = time.perf_counter() - t_start
        timings.append((i, t_upload, t_download, t_ai, t_total))
        print(f"Document {i:2d} | Upload: {t_upload:5.1f}ms | Download: {t_download:5.1f}ms | AI: {t_ai:5.1f}ms | TOTAL: {t_total:.2f}s | Vendor: {validated_extraction.vendor_company}", flush=True)

    print("\n=======================================================", flush=True)
    print("FINAL 10-DOCUMENT SUMMARY", flush=True)
    print("=======================================================", flush=True)
    for idx, up, down, ai, tot in timings:
        print(f"Document {idx:2d} → {tot:.2f}s (AI: {ai/1000:.2f}s, Storage: {(up+down)/1000:.2f}s)", flush=True)

if __name__ == "__main__":
    asyncio.run(test_10_documents())
