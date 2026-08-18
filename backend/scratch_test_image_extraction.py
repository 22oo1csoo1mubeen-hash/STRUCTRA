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

def test_model(model_name: str, thinking_budget: int | None = None):
    print(f"\n=======================================================", flush=True)
    print(f"Testing model: {model_name} (thinking_budget: {thinking_budget})", flush=True)
    print(f"=======================================================", flush=True)
    
    thinking_config = None
    if thinking_budget is not None:
        thinking_config = types.ThinkingConfig(thinking_budget=thinking_budget)
        
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=clean_schema,
        temperature=0.1,
        thinking_config=thinking_config,
    )
    
    for i in range(1, 8):
        t0 = time.perf_counter()
        try:
            resp = client.models.generate_content(
                model=model_name,
                contents=[image_part, prompt_text],
                config=config,
            )
            t1 = time.perf_counter()
            text = resp.text
            print(f"Doc {i}: {(t1-t0):.2f}s | Length: {len(text) if text else 0} chars | Usage: {resp.usage_metadata}", flush=True)
        except Exception as e:
            t1 = time.perf_counter()
            print(f"Doc {i}: FAILED after {(t1-t0):.2f}s: {type(e).__name__}: {e}", flush=True)

if __name__ == "__main__":
    test_model("gemini-3.1-flash-lite")
