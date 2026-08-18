import asyncio
import time
import httpx
from app.core.config import get_settings

settings = get_settings()
api_key = settings.gemini_api_key.get_secret_value()

models_to_test = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-3.1-flash-lite",
]

async def test_rest():
    for model in models_to_test:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": "Reply with OK"}]}]
        }
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                t1 = time.perf_counter()
                print(f"Model {model}: HTTP {resp.status_code} in {(t1-t0)*1000:.1f}ms: {resp.text[:120]}", flush=True)
        except Exception as e:
            t1 = time.perf_counter()
            print(f"Model {model}: FAILED in {(t1-t0)*1000:.1f}ms: {type(e).__name__}: {e}", flush=True)

if __name__ == "__main__":
    asyncio.run(test_rest())
