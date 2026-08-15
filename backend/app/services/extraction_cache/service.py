"""Extraction cache service for caching structured document extractions by SHA-256 content hash."""

import time
from typing import Any
import httpx
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.schemas.documents import ReceiptInvoiceExtraction


class ExtractionCache:
    """Service providing dual-tier process memory and Supabase PostgreSQL persistence for ReceiptInvoiceExtraction."""

    def __init__(self) -> None:
        self._memory_cache: dict[str, ReceiptInvoiceExtraction] = {}

    def clear_memory_cache(self) -> None:
        """Clear process-level memory cache (useful for testing)."""
        self._memory_cache.clear()

    async def get(
        self, content_hash: str, settings: Settings | None = None
    ) -> ReceiptInvoiceExtraction | None:
        """Retrieve cached ReceiptInvoiceExtraction by content hash if present and valid.

        Checks process-level memory cache first, then Supabase PostgreSQL extraction_cache table.
        """
        if not content_hash or not isinstance(content_hash, str):
            return None

        short_hash = content_hash[:8]
        t0 = time.perf_counter()

        # 1. Memory cache check (< 1ms)
        if content_hash in self._memory_cache:
            t1 = time.perf_counter()
            elapsed_ms = (t1 - t0) * 1000.0
            print(f"[STRUCTRA CACHE] HIT | Hash: {short_hash}")
            print(f"[STRUCTRA PERF] Extraction cache lookup: {elapsed_ms:.2f} ms")
            return self._memory_cache[content_hash]

        # 2. Supabase PostgreSQL cache check
        cfg = settings or get_settings()
        supabase_url = getattr(cfg, "supabase_url", None)
        secret_key_attr = getattr(cfg, "supabase_secret_key", None)
        if not supabase_url or not secret_key_attr:
            return None

        secret_key = (
            secret_key_attr.get_secret_value()
            if hasattr(secret_key_attr, "get_secret_value")
            else str(secret_key_attr)
        )
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
        }
        url = f"{str(supabase_url).rstrip('/')}/rest/v1/extraction_cache"
        params = {
            "select": "content_hash,extraction_result",
            "content_hash": f"eq.{content_hash}",
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, headers=headers, params=params)
                if resp.is_success:
                    records = resp.json()
                    if isinstance(records, list) and len(records) > 0:
                        raw_data = records[0].get("extraction_result")
                        if isinstance(raw_data, dict):
                            try:
                                validated = ReceiptInvoiceExtraction.model_validate(raw_data)
                                self._memory_cache[content_hash] = validated
                                t1 = time.perf_counter()
                                elapsed_ms = (t1 - t0) * 1000.0
                                print(f"[STRUCTRA CACHE] HIT | Hash: {short_hash}")
                                print(f"[STRUCTRA PERF] Extraction cache lookup: {elapsed_ms:.2f} ms")
                                return validated
                            except ValidationError as val_err:
                                print(
                                    f"[STRUCTRA CACHE WARNING] Corrupted/invalid cached JSON for hash {short_hash}: {val_err}"
                                )
        except Exception as db_err:
            print(f"[STRUCTRA CACHE WARNING] Database cache read failed for hash {short_hash}: {db_err}")

        return None

    async def set(
        self,
        content_hash: str,
        extraction: ReceiptInvoiceExtraction,
        settings: Settings | None = None,
    ) -> None:
        """Store validated ReceiptInvoiceExtraction in memory and Supabase PostgreSQL table."""
        if not content_hash or not isinstance(content_hash, str) or not isinstance(extraction, ReceiptInvoiceExtraction):
            return

        short_hash = content_hash[:8]

        # Re-validate with Pydantic before caching
        try:
            validated = ReceiptInvoiceExtraction.model_validate(extraction.model_dump(mode="json"))
        except ValidationError as val_err:
            print(f"[STRUCTRA CACHE WARNING] Cannot store invalid extraction for hash {short_hash}: {val_err}")
            return

        # Save to process-level memory cache
        self._memory_cache[content_hash] = validated
        print(f"[STRUCTRA CACHE] STORE | Hash: {short_hash}")

        # Asynchronously store to Supabase PostgreSQL table
        cfg = settings or get_settings()
        supabase_url = getattr(cfg, "supabase_url", None)
        secret_key_attr = getattr(cfg, "supabase_secret_key", None)
        if not supabase_url or not secret_key_attr:
            return

        secret_key = (
            secret_key_attr.get_secret_value()
            if hasattr(secret_key_attr, "get_secret_value")
            else str(secret_key_attr)
        )
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        }
        url = f"{str(supabase_url).rstrip('/')}/rest/v1/extraction_cache"
        payload = {
            "content_hash": content_hash,
            "extraction_result": validated.model_dump(mode="json"),
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if not resp.is_success:
                    print(
                        f"[STRUCTRA CACHE WARNING] Database store returned status {resp.status_code} for hash {short_hash}: {resp.text}"
                    )
        except Exception as db_err:
            # Catch database write failure gracefully (Requirement 16: Failure Safety)
            print(f"[STRUCTRA CACHE WARNING] Database cache write failed for hash {short_hash}: {db_err}")

    async def exists(
        self, content_hash: str, settings: Settings | None = None
    ) -> bool:
        """Return True if a valid cached extraction exists for content_hash."""
        result = await self.get(content_hash, settings=settings)
        return result is not None


# Global extraction cache singleton
default_extraction_cache = ExtractionCache()
