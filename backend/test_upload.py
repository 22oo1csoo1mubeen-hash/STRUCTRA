import asyncio
from uuid import UUID
from fastapi import UploadFile
from unittest.mock import Mock
from app.api.routes.documents import upload_document
from app.schemas.auth import CurrentUser
from app.core.config import get_settings

async def test():
    settings = get_settings()
    current_user = CurrentUser(user_id="9f58b452-933a-4a31-9f93-c3b07b5547bc")
    
    with open("test_receipt.jpg", "wb") as f:
        f.write(b"dummy" * 1024)
        
    with open("test_receipt.jpg", "rb") as f:
        file = UploadFile(filename="test_receipt.jpg", file=f, size=5120, headers={"content-type": "image/jpeg"})
        try:
            res = await upload_document(file=file, settings=settings, current_user=current_user)
            print("Upload success!", res)
        except Exception as e:
            print("Upload failed!", type(e), e)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
