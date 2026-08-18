import asyncio
import time
from pathlib import Path
from google import genai
from google.genai import types
from app.core.config import get_settings
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.ai.providers.gemini import _clean_schema_for_gemini
from app.services.prompts import build_multimodal_receipt_extraction_prompt

FIXTURES_DIR = Path(__file__).parent / "tests" / "fixtures" / "receipts"
RECEIPT_FILE = FIXTURES_DIR / "Receipt.png"

settings = get_settings()
api_key = settings.gemini_api_key.get_secret_value()
client = genai.Client(api_key=api_key)

image_bytes = RECEIPT_FILE.read_bytes()
image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/png")
prompt_text = build_multimodal_receipt_extraction_prompt()
clean_schema = _clean_schema_for_gemini(ReceiptInvoiceExtraction.model_json_schema())

async def run_test():
    print("\n--- Test 1: Native Async client.aio with thinking_budget=0 ---", flush=True)
    config_no_think = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=clean_schema,
        temperature=0.1,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )
    
    for i in range(1, 6):
        t0 = time.perf_counter()
        try:
            resp = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=[image_part, prompt_text],
                config=config_no_think,
            )
            t1 = time.perf_counter()
            print(f"Async No-Think Doc {i}: {(t1-t0):.2f}s | chars: {len(resp.text)} | usage: {resp.usage_metadata}", flush=True)
        except Exception as e:
            t1 = time.perf_counter()
            print(f"Async No-Think Doc {i} FAILED after {(t1-t0):.2f}s: {type(e).__name__}: {e}", flush=True)

    print("\n--- Test 2: Native Async client.aio with default thinking (budget=None) ---", flush=True)
    config_default = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=clean_schema,
        temperature=0.1,
    )
    
    for i in range(1, 6):
        t0 = time.perf_counter()
        try:
            resp = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=[image_part, prompt_text],
                config=config_default,
            )
            t1 = time.perf_counter()
            print(f"Async Default Doc {i}: {(t1-t0):.2f}s | chars: {len(resp.text)} | usage: {resp.usage_metadata}", flush=True)
        except Exception as e:
            t1 = time.perf_counter()
            print(f"Async Default Doc {i} FAILED after {(t1-t0):.2f}s: {type(e).__name__}: {e}", flush=True)

if __name__ == "__main__":
    asyncio.run(run_test())
