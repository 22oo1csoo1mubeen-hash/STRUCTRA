import asyncio
from uuid import UUID
from fastapi import UploadFile
from app.api.routes.documents import upload_document, extract_document, validate_document
from app.schemas.auth import CurrentUser
from app.core.config import get_settings
import time

async def test():
    settings = get_settings()
    current_user = CurrentUser(user_id="9f58b452-933a-4a31-9f93-c3b07b5547bc")
    
    with open("test_receipt.jpg", "wb") as f:
        f.write(b"dummy image data" * 1024)
        
    t_start = time.perf_counter()
    print("Starting pipeline...")
    with open("test_receipt.jpg", "rb") as f:
        file = UploadFile(filename="test_receipt.jpg", file=f, size=16384, headers={"content-type": "image/jpeg"})
        try:
            # Upload
            upload_res = await upload_document(file=file, settings=settings, current_user=current_user)
            doc_id = upload_res.document_id
            
            # Extract
            extract_res = await extract_document(document_id=doc_id, settings=settings, current_user=current_user)
            
            # Validate
            validate_res = await validate_document(document_id=doc_id, extraction=extract_res.extraction, settings=settings, current_user=current_user)
            
            t_end = time.perf_counter()
            print(f"Total Pipeline: {(t_end - t_start)*1000:.1f} ms")
        except Exception as e:
            print("Pipeline failed!", type(e), e)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
