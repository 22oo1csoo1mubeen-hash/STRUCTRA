import asyncio
import time
import io
from PIL import Image, ImageDraw
import sys

from app.core.config import get_settings
from app.services.gemini import extract_receipt_invoice_document

def generate_test_image(size, text):
    img = Image.new('RGB', size, color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((10,10), text, fill=(0,0,0))
    for i in range(20):
        d.text((10, 50 + i * 20), f"Item {i}    $10.00", fill=(0,0,0))
    d.text((10, 500), "Subtotal: $200.00", fill=(0,0,0))
    d.text((10, 520), "Tax (CGST 5%): $10.00", fill=(0,0,0))
    d.text((10, 540), "Total: $210.00", fill=(0,0,0))
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG', quality=95)
    return img_byte_arr.getvalue()

async def main():
    settings = get_settings()
    
    print("Generating images...")
    img_small = generate_test_image((800, 600), "Vendor: TEST SMALL RECEIPT")
    img_large = generate_test_image((4000, 3000), "Vendor: TEST LARGE RECEIPT")
    
    print(f"Small image size: {len(img_small)} bytes")
    print(f"Large image size: {len(img_large)} bytes")
    
    for name, img_bytes in [("Small Receipt", img_small), ("Large Receipt", img_large)]:
        print(f"\n--- Testing {name} ---")
        t0 = time.perf_counter()
        try:
            res = await extract_receipt_invoice_document(
                settings=settings,
                document_content=img_bytes,
                mime_type="image/jpeg"
            )
            t1 = time.perf_counter()
            print(f"SUCCESS in {t1 - t0:.4f}s")
            print(f"Total: {res.get('total')}")
        except Exception as e:
            t1 = time.perf_counter()
            print(f"FAILED in {t1 - t0:.4f}s")
            print(e)

if __name__ == "__main__":
    asyncio.run(main())
