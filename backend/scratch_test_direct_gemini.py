import time
from google import genai
from google.genai import types
from app.core.config import get_settings

settings = get_settings()
api_key = settings.gemini_api_key.get_secret_value()

client = genai.Client(api_key=api_key)

print(f"Testing client models with model: {settings.gemini_model}", flush=True)

t0 = time.perf_counter()
try:
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents="Say Hello in 3 words",
    )
    t1 = time.perf_counter()
    print(f"Success in {(t1-t0)*1000:.1f}ms: {response.text}", flush=True)
except Exception as e:
    t1 = time.perf_counter()
    print(f"Error after {(t1-t0)*1000:.1f}ms: {type(e).__name__}: {e}", flush=True)

# List available models
try:
    print("\nListing available models:", flush=True)
    for m in client.models.list():
        if "flash" in m.name.lower() or "gemini" in m.name.lower():
            print(f" - {m.name}", flush=True)
except Exception as e:
    print(f"List models error: {e}", flush=True)
