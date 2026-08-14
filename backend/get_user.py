import asyncio
import httpx
from app.core.config import get_settings

async def main():
    settings = get_settings()
    secret_key = settings.supabase_secret_key.get_secret_value()
    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/documents?select=user_id&limit=1"
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        print("Valid user:", res.json())

if __name__ == "__main__":
    asyncio.run(main())
