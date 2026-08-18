import asyncio
import time
import base64
import json
import httpx
from pathlib import Path
from app.core.config import get_settings
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.ai.providers.gemini import _clean_schema_for_gemini
from app.services.prompts import build_multimodal_receipt_extraction_prompt

FIXTURES_DIR = Path(__file__).parent / "tests" / "fixtures" / "receipts"
RECEIPT_FILE = FIXTURES_DIR / "Receipt.png"

settings = get_settings()
api_key = settings.gemini_api_key.get_secret_value()

image_bytes = RECEIPT_FILE.read_bytes()
b64_image = base64.b64encode(image_bytes).decode("utf-8")
prompt_text = build_multimodal_receipt_extraction_prompt()
clean_schema = _clean_schema_for_gemini(ReceiptInvoiceExtraction.model_json_schema())

async def test_rest_image(model_name: str):
    print(f"\n=======================================================", flush=True)
    print(f"Testing REST Image Extraction: {model_name}", flush=True)
    print(f"=======================================================", flush=True)
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"inlineData": {"mimeType": "image/png", "data": b64_image}},
                    {"text": prompt_text}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": clean_schema,
            "temperature": 0.1
        }
    }
    
    for i in range(1, 8):
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=payload)
                t1 = time.perf_counter()
                elapsed = t1 - t0
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    usage = data.get("usageMetadata", {})
                    first_text = candidates[0]["content"]["parts"][0].get("text", "") if candidates else ""
                    print(f"Doc {i}: HTTP 200 in {elapsed:.2f}s | Chars: {len(first_text)} | Usage: {usage}", flush=True)
                else:
                    print(f"Doc {i}: HTTP {resp.status_code} in {elapsed:.2f}s | {resp.text[:200]}", flush=True)
        except Exception as e:
            t1 = time.perf_counter()
            print(f"Doc {i}: FAILED after {(t1-t0):.2f}s: {type(e).__name__}: {e}", flush=True)

if __name__ == "__main__":
    asyncio.run(test_rest_image("gemini-2.5-flash"))
