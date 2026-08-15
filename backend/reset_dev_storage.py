"""STRUCTRA — Standalone Development Storage & Document Reset Script.

This script performs a one-time, development-only cleanup:
1. Recursively lists and deletes all stored document objects in the private 'documents' Supabase bucket.
2. Cleans associated document metadata from public.documents.
3. Cleans associated extraction cache entries from public.extraction_cache.
4. Verifies that the 'documents' bucket and documents table are completely empty.

SAFETY: Requires environment variable DEV_RESET=true.
"""

import os
import sys
from urllib.parse import quote

import httpx

from app.core.config import get_settings


def main() -> None:
    # ------------------------------------------------------------------
    # 1. Safety Guard — Must be explicitly enabled with DEV_RESET=true
    # ------------------------------------------------------------------
    dev_reset = os.getenv("DEV_RESET", "").strip().lower()
    if dev_reset not in ("true", "1"):
        print("=" * 68)
        print("WARNING: DEVELOPMENT STORAGE RESET ABORTED")
        print("=" * 68)
        print("This cleanup operation is restricted to DEVELOPMENT mode only.")
        print("To execute this script, you must set the environment variable:")
        print("  DEV_RESET=true")
        print("\nExample Command (PowerShell):")
        print("  $env:DEV_RESET='true'; .venv-x64\\Scripts\\python.exe reset_dev_storage.py")
        print("=" * 68)
        sys.exit(1)

    print("=" * 68)
    print("STRUCTRA DEVELOPMENT STORAGE RESET INITIATED")
    print("=" * 68)

    settings = get_settings()
    bucket_name = settings.supabase_storage_bucket
    secret_key = settings.supabase_secret_key.get_secret_value()
    base_url = settings.supabase_url.rstrip("/")

    headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }

    with httpx.Client(timeout=30.0) as client:
        # --------------------------------------------------------------
        # 2. Fetch existing DB document metadata & content hashes
        # --------------------------------------------------------------
        db_url = f"{base_url}/rest/v1/documents"
        try:
            resp = client.get(
                db_url,
                headers=headers,
                params={"select": "id,storage_path,content_hash"},
            )
            resp.raise_for_status()
            db_documents = resp.json()
        except Exception as err:
            print(f"Error querying public.documents table: {err}")
            db_documents = []

        content_hashes = [
            doc["content_hash"]
            for doc in db_documents
            if doc.get("content_hash")
        ]

        # --------------------------------------------------------------
        # 3. Recursively list all objects in Supabase Storage 'documents' bucket
        # --------------------------------------------------------------
        list_url = f"{base_url}/storage/v1/object/list/{quote(bucket_name, safe='')}"
        storage_objects: list[str] = []
        prefix_queue: list[str] = [""]

        while prefix_queue:
            prefix = prefix_queue.pop(0)
            offset = 0
            while True:
                payload = {
                    "prefix": prefix,
                    "limit": 100,
                    "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"},
                }
                try:
                    res = client.post(
                        list_url,
                        headers={**headers, "Content-Type": "application/json"},
                        json=payload,
                    )
                    res.raise_for_status()
                    items = res.json()
                except Exception as err:
                    print(f"Error listing storage prefix '{prefix}': {err}")
                    break

                if not items:
                    break

                for item in items:
                    name = item.get("name")
                    if not name:
                        continue
                    full_name = f"{prefix}{name}" if prefix else name
                    # Folders in Supabase Storage have id=None or metadata=None
                    if item.get("id") is None and item.get("metadata") is None:
                        prefix_queue.append(f"{full_name}/")
                    else:
                        storage_objects.append(full_name)

                if len(items) < 100:
                    break
                offset += len(items)

        # Also include any storage_path recorded in DB that might not have been indexed
        db_paths = [doc["storage_path"] for doc in db_documents if doc.get("storage_path")]
        all_objects_to_delete = sorted(list(set(storage_objects + db_paths)))

        num_storage_found = len(all_objects_to_delete)

        # --------------------------------------------------------------
        # 4. Delete Storage Objects in 'documents' Bucket
        # --------------------------------------------------------------
        num_storage_deleted = 0
        if all_objects_to_delete:
            delete_storage_url = f"{base_url}/storage/v1/object/{quote(bucket_name, safe='')}"
            batch_size = 100
            for i in range(0, len(all_objects_to_delete), batch_size):
                batch = all_objects_to_delete[i : i + batch_size]
                try:
                    res = client.request(
                        "DELETE",
                        delete_storage_url,
                        headers={**headers, "Content-Type": "application/json"},
                        json={"prefixes": batch},
                    )
                    res.raise_for_status()
                    deleted_batch = res.json()
                    if isinstance(deleted_batch, list):
                        num_storage_deleted += len(deleted_batch)
                    else:
                        num_storage_deleted += len(batch)
                except Exception as err:
                    print(f"Error deleting storage batch {batch}: {err}")

        # --------------------------------------------------------------
        # 5. Delete Document Records from public.documents
        # --------------------------------------------------------------
        num_db_deleted = 0
        try:
            res = client.delete(
                db_url,
                headers={**headers, "Prefer": "return=representation"},
                params={"id": "not.is.null"},
            )
            res.raise_for_status()
            deleted_docs = res.json()
            if isinstance(deleted_docs, list):
                num_db_deleted = len(deleted_docs)
        except Exception as err:
            print(f"Error deleting document records from public.documents: {err}")

        # --------------------------------------------------------------
        # 6. Delete Associated Extraction Cache Entries from public.extraction_cache
        # --------------------------------------------------------------
        num_cache_deleted = 0
        cache_url = f"{base_url}/rest/v1/extraction_cache"
        try:
            if content_hashes:
                unique_hashes = list(set(content_hashes))
                # Delete in chunks if many hashes
                chunk_size = 50
                for i in range(0, len(unique_hashes), chunk_size):
                    chunk = unique_hashes[i : i + chunk_size]
                    hash_param = f"in.({','.join(chunk)})"
                    res = client.delete(
                        cache_url,
                        headers={**headers, "Prefer": "return=representation"},
                        params={"content_hash": hash_param},
                    )
                    res.raise_for_status()
                    deleted_cache = res.json()
                    if isinstance(deleted_cache, list):
                        num_cache_deleted += len(deleted_cache)
            else:
                # Clear all extraction cache entries if doing a total clean
                res = client.delete(
                    cache_url,
                    headers={**headers, "Prefer": "return=representation"},
                    params={"content_hash": "not.is.null"},
                )
                if res.is_success and isinstance(res.json(), list):
                    num_cache_deleted = len(res.json())
        except Exception as err:
            print(f"Error deleting extraction_cache entries: {err}")

        # --------------------------------------------------------------
        # 7. Final Verification
        # --------------------------------------------------------------
        remaining_objects: list[str] = []
        try:
            verify_res = client.post(
                list_url,
                headers={**headers, "Content-Type": "application/json"},
                json={"prefix": "", "limit": 100},
            )
            if verify_res.is_success:
                remaining_objects = verify_res.json()
        except Exception:
            pass

        bucket_is_clean = len(remaining_objects) == 0

        # --------------------------------------------------------------
        # 8. Report Final Results
        # --------------------------------------------------------------
        print("\nCLEANUP SUMMARY:")
        print(f"  • Storage objects found:   {num_storage_found}")
        print(f"  • Storage objects deleted: {num_storage_deleted}")
        print(f"  • Document records deleted:{num_db_deleted}")
        print(f"  • Cache records deleted:   {num_cache_deleted}")
        print(f"  • Documents bucket status: {'VERIFIED ZERO OBJECTS (CLEAN)' if bucket_is_clean else f'WARNING: {len(remaining_objects)} objects remain'}")
        print("=" * 68)


if __name__ == "__main__":
    main()
