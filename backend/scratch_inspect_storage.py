import asyncio
import httpx
from app.core.config import get_settings
from app.services.document_metadata import _extract_settings

async def inspect_storage():
    settings = get_settings()
    url, key = _extract_settings(settings)
    bucket = getattr(settings, "supabase_storage_bucket", "documents")
    headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    
    async with httpx.AsyncClient() as client:
        # List objects in root or user folders
        r = await client.post(
            f"{url}/storage/v1/object/list/{bucket}",
            headers=headers,
            json={"prefix": "", "limit": 100}
        )
        print("Storage list status:", r.status_code)
        if r.status_code == 200:
            objects = r.json()
            print(f"Top-level entries in bucket '{bucket}':", len(objects))
            for item in objects:
                print("Item:", item.get("name"))
                # list subfolder
                r_sub = await client.post(
                    f"{url}/storage/v1/object/list/{bucket}",
                    headers=headers,
                    json={"prefix": item.get("name"), "limit": 100}
                )
                if r_sub.status_code == 200:
                    sub_items = r_sub.json()
                    print(f"  Sub-items in {item.get('name')}: {len(sub_items)}")
                    for s in sub_items:
                        print(f"    - {s.get('name')}")
                        r_sub2 = await client.post(
                            f"{url}/storage/v1/object/list/{bucket}",
                            headers=headers,
                            json={"prefix": f"{item.get('name')}/{s.get('name')}", "limit": 100}
                        )
                        if r_sub2.status_code == 200:
                            for s2 in r_sub2.json():
                                print(f"      * {s2.get('name')}")

if __name__ == "__main__":
    asyncio.run(inspect_storage())
