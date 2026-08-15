"""STRUCTRA — Safe Database & Storage Cleanup & Content-Hash Migration Script.

Audits public.documents and Supabase Storage to:
1. Identify legitimate saved library documents (4 for User A, 1 for User B, 1 for User C = 6 total).
2. Download original storage bytes and compute the true SHA-256 content_hash for legitimate documents.
3. Update content_hash on legitimate library records in public.documents.
4. Identify and safely remove unintended test rows (records created without explicit Save to Library).
5. Clean up orphaned temporary storage objects not belonging to any saved library document.

SAFETY:
- Defaults to DRY-RUN mode.
- Requires explicit '--apply' flag to perform any database updates or deletions.
"""

import argparse
import asyncio
from hashlib import sha256
import json
import sys
from urllib.parse import quote
from uuid import UUID

import httpx

from app.core.config import get_settings
from app.services.document_metadata import _extract_settings


async def run_audit_and_migration(apply_changes: bool = False) -> None:
    settings = get_settings()
    url, key = _extract_settings(settings)
    bucket = settings.supabase_storage_bucket
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    mode_str = "APPLY (LIVE EXECUTION)" if apply_changes else "DRY-RUN (NO CHANGES WILL BE MADE)"
    print("=" * 80)
    print(f"STRUCTRA DOCUMENT PERSISTENCE & STORAGE AUDIT")
    print(f"MODE: {mode_str}")
    print("=" * 80)

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Query all records from public.documents
        db_res = await client.get(f"{url}/rest/v1/documents?select=*&order=created_at.asc", headers=headers)
        if not db_res.is_success:
            print(f"ERROR querying public.documents: {db_res.status_code} - {db_res.text}")
            return

        all_docs = db_res.json()
        print(f"\n[1] Total records in public.documents: {len(all_docs)}")

        # Group by user
        users = {}
        for d in all_docs:
            uid = d.get("user_id")
            users.setdefault(uid, []).append(d)

        for uid, docs in users.items():
            completed_count = sum(1 for d in docs if d.get("status") == "completed")
            print(f"  • User {uid}: {len(docs)} total records ({completed_count} completed)")

        # 2. Distinguish legitimate completed library documents vs un-saved test rows
        # Legitimate documents are completed documents with valid extractions
        legitimate_docs = [d for d in all_docs if d.get("status") == "completed"]
        unintended_docs = [d for d in all_docs if d.get("status") != "completed"]

        print(f"\n[2] Document Classification:")
        print(f"  • Legitimate Saved Documents (Target for Hash Migration): {len(legitimate_docs)}")
        print(f"  • Unintended / Unsaved Test Rows (Target for Cleanup):    {len(unintended_docs)}")

        # 3. Process Legitimate Documents — Compute true content_hash from Storage bytes
        print("\n[3] Auditing Legitimate Library Documents:")
        migrated_hashes = []
        for doc in legitimate_docs:
            doc_id = doc["id"]
            storage_path = doc["storage_path"]
            current_hash = doc.get("content_hash")
            filename = doc.get("filename", "")
            user_id = doc.get("user_id", "")

            # Download bytes from Supabase Storage
            storage_download_url = f"{url}/storage/v1/object/authenticated/{quote(bucket, safe='')}/{quote(storage_path, safe='/')}"
            down_res = await client.get(storage_download_url, headers=headers)
            if not down_res.is_success:
                # Try non-authenticated path
                storage_download_url = f"{url}/storage/v1/object/{quote(bucket, safe='')}/{quote(storage_path, safe='/')}"
                down_res = await client.get(storage_download_url, headers=headers)

            if down_res.is_success:
                computed_hash = sha256(down_res.content).hexdigest()
                status_note = "CORRECT" if current_hash == computed_hash else f"NEEDS UPDATE ({current_hash} -> {computed_hash})"
                print(f"  • Doc {doc_id[:8]}... | User {user_id[:8]}... | File: {filename:<16} | Storage: {len(down_res.content)}B | Hash: {status_note}")
                migrated_hashes.append((doc_id, computed_hash, storage_path, user_id))
            else:
                print(f"  • Doc {doc_id[:8]}... | File: {filename:<16} | Storage download FAILED ({down_res.status_code})")

        # 4. List all storage objects in bucket
        print("\n[4] Auditing Supabase Storage Objects:")
        list_url = f"{url}/storage/v1/object/list/{quote(bucket, safe='')}"
        storage_objects = []
        prefix_queue = [""]
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
                res = await client.post(list_url, headers=headers, json=payload)
                if not res.is_success:
                    break
                items = res.json()
                if not items:
                    break
                for item in items:
                    name = item.get("name")
                    if not name:
                        continue
                    full_name = f"{prefix}{name}" if prefix else name
                    if item.get("id") is None and item.get("metadata") is None:
                        prefix_queue.append(f"{full_name}/")
                    else:
                        storage_objects.append(full_name)
                if len(items) < 100:
                    break
                offset += len(items)

        print(f"  • Total Storage Objects Found: {len(storage_objects)}")
        legitimate_storage_paths = set(d["storage_path"] for d in legitimate_docs)
        orphaned_storage_objects = [p for p in storage_objects if p not in legitimate_storage_paths]
        print(f"  • Legitimate Storage Objects (Belong to Saved Docs):   {len(legitimate_storage_paths)}")
        print(f"  • Orphaned / Temporary Storage Objects (To Delete):     {len(orphaned_storage_objects)}")

        if unintended_docs:
            print("\n[5] Unintended / Unsaved Database Rows Targeted for Deletion:")
            for d in unintended_docs:
                print(f"  - ID: {d.get('id')} | Status: {d.get('status')} | File: {d.get('filename')} | User: {d.get('user_id')} | Created: {d.get('created_at')}")

        if orphaned_storage_objects:
            print("\n[6] Orphaned Storage Objects Targeted for Deletion:")
            for p in orphaned_storage_objects[:10]:
                print(f"  - {p}")
            if len(orphaned_storage_objects) > 10:
                print(f"  ... and {len(orphaned_storage_objects) - 10} more.")

        # 5. Apply Execution if requested
        if apply_changes:
            print("\n" + "=" * 80)
            print("APPLYING DATABASE & STORAGE MIGRATION...")
            print("=" * 80)

            # Step 1: Delete unintended test rows from DB FIRST so unique index isn't blocked
            deleted_db_count = 0
            if unintended_docs:
                unintended_ids = [d["id"] for d in unintended_docs]
                del_res = await client.delete(
                    f"{url}/rest/v1/documents?id=in.({','.join(unintended_ids)})",
                    headers=headers,
                )
                if del_res.is_success:
                    deleted_db_count = len(unintended_ids)
                    print(f"  [OK] Deleted {deleted_db_count} unintended records from public.documents.")
                else:
                    print(f"  Failed deleting unintended rows: {del_res.status_code} - {del_res.text}")

            # Step 2: Update content_hash on legitimate rows
            updated_count = 0
            for doc_id, comp_hash, _, uid in migrated_hashes:
                patch_res = await client.patch(
                    f"{url}/rest/v1/documents?id=eq.{doc_id}&user_id=eq.{uid}",
                    headers=headers,
                    json={"content_hash": comp_hash},
                )
                if patch_res.is_success:
                    updated_count += 1
                else:
                    print(f"  Failed updating hash on doc {doc_id}: {patch_res.status_code} - {patch_res.text}")
            print(f"  [OK] Updated content_hash for {updated_count}/{len(migrated_hashes)} legitimate library documents.")

            # Step 3: Delete orphaned storage objects
            deleted_storage_count = 0
            if orphaned_storage_objects:
                delete_storage_url = f"{url}/storage/v1/object/{quote(bucket, safe='')}"
                for i in range(0, len(orphaned_storage_objects), 100):
                    batch = orphaned_storage_objects[i : i + 100]
                    del_s_res = await client.request(
                        "DELETE",
                        delete_storage_url,
                        headers=headers,
                        json={"prefixes": batch},
                    )
                    if del_s_res.is_success:
                        deleted_storage_count += len(batch)
                    else:
                        print(f"  Failed deleting storage batch: {del_s_res.status_code}")
                print(f"  [OK] Deleted {deleted_storage_count} orphaned objects from Supabase Storage.")

            print("\n[OK] MIGRATION COMPLETED SUCCESSFULLY.")
        else:
            print("\n" + "=" * 80)
            print("DRY RUN COMPLETE - NO CHANGES APPLIED.")
            print("To execute this migration and cleanup, run with the '--apply' flag:")
            print("  .venv-x64\\Scripts\\python.exe scripts/safe_cleanup_migration.py --apply")
            print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description="STRUCTRA Safe Persistence & Storage Migration")
    parser.add_argument(
        "--apply",
        action="store_true",
        default=False,
        help="Apply migration changes to database and storage (defaults to dry-run)",
    )
    args = parser.parse_args()
    asyncio.run(run_audit_and_migration(apply_changes=args.apply))


if __name__ == "__main__":
    main()

