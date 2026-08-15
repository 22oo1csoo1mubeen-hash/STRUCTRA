import asyncio
import httpx
from app.core.config import get_settings
from app.services.document_metadata import _extract_settings

async def inspect():
    settings = get_settings()
    url, key = _extract_settings(settings)
    headers = {'apikey': key, 'Authorization': f'Bearer {key}'}
    async with httpx.AsyncClient() as client:
        r = await client.get(f'{url}/rest/v1/documents?select=*', headers=headers)
        print('Status:', r.status_code)
        docs = r.json()
        print('Total records in public.documents:', len(docs))
        users = {}
        for d in docs:
            uid = d.get('user_id')
            users.setdefault(uid, []).append(d)
            print(f"ID: {d.get('id')} | User: {uid} | Status: {d.get('status')} | Hash: {d.get('content_hash')} | File: {d.get('filename')} | Created: {d.get('created_at')} | Storage: {d.get('storage_path')}")
        
        print("\n--- Summary by User ---")
        for u, udocs in users.items():
            print(f"User {u}: {len(udocs)} total ({sum(1 for x in udocs if x.get('status') == 'completed')} completed, {sum(1 for x in udocs if x.get('status') != 'completed')} other, {sum(1 for x in udocs if x.get('content_hash') is not None)} with hash)")

if __name__ == "__main__":
    asyncio.run(inspect())
