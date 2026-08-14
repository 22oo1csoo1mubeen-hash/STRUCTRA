import asyncio
import time
import uuid
import httpx
from httpx import ASGITransport
import io

from app.main import app
from app.api.dependencies import get_current_user
from app.schemas.auth import CurrentUser

MOCK_USER_ID = str(uuid.uuid4())
def override_get_current_user():
    return CurrentUser(user_id=MOCK_USER_ID, email="benchmark@example.com")

app.dependency_overrides[get_current_user] = override_get_current_user

def create_dummy_image(size_bytes):
    # Create a dummy image by just repeating some valid PDF or JPG header + padding
    # Wait, the validation requires valid PDF, JPG, PNG.
    # It's easier to create a tiny valid PDF and pad it.
    header = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    padding = b"0" * (size_bytes - len(header))
    return header + padding

async def run_benchmark():
    print("Starting Benchmark...")
    
    # 100KB, 5MB
    small_file = create_dummy_image(100 * 1024)
    large_file = create_dummy_image(5 * 1024 * 1024)
    
    # Wait, the Gemini API needs a real image to do extraction, otherwise it might fail or return junk.
    # I can just run it with a dummy and see how it performs, but it might fail schema validation.
    
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        print("\n--- Testing Small File ---")
        files = {"file": ("small.pdf", small_file, "application/pdf")}
        t0 = time.perf_counter()
        upload_res = await client.post("/documents/upload", files=files)
        t1 = time.perf_counter()
        print(f"Upload API took: {t1 - t0:.4f}s")
        if upload_res.status_code != 200:
            print("Upload failed:", upload_res.text)
            return
            
        doc_id = upload_res.json()["document_id"]
        
        t0 = time.perf_counter()
        extract_res = await client.post(f"/documents/{doc_id}/extract")
        t1 = time.perf_counter()
        print(f"Extract API took: {t1 - t0:.4f}s")
        if extract_res.status_code != 200:
            print("Extract failed:", extract_res.text)
            
        else:
            extraction = extract_res.json()["extraction"]
            t0 = time.perf_counter()
            validate_res = await client.post(f"/documents/{doc_id}/validate", json=extraction)
            t1 = time.perf_counter()
            print(f"Validate API took: {t1 - t0:.4f}s")
            if validate_res.status_code != 200:
                print("Validate failed:", validate_res.text)

if __name__ == "__main__":
    asyncio.run(run_benchmark())
