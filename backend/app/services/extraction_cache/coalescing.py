"""In-process request coalescer preventing concurrent duplicate extraction calls for identical content hashes."""

import asyncio
from typing import Any, Awaitable, Callable

from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.extraction_cache.service import ExtractionCache, default_extraction_cache


class ExtractionCoalescer:
    """In-process request coalescing manager using asyncio Events keyed by document content_hash."""

    def __init__(self) -> None:
        self._locks: dict[str, asyncio.Event] = {}

    def clear_locks(self) -> None:
        """Clear all in-flight locks (useful for testing)."""
        self._locks.clear()

    async def run_coalesced(
        self,
        content_hash: str,
        extraction_coro_fn: Callable[[], Awaitable[ReceiptInvoiceExtraction]],
        cache: ExtractionCache | None = None,
    ) -> ReceiptInvoiceExtraction:
        """Execute extraction function coalescing concurrent duplicate requests for identical content_hash.

        If a request for the same content_hash is currently executing:
        - Log COALESCE
        - Wait for in-flight execution to complete
        - Return the resulting cached extraction
        """
        short_hash = content_hash[:8] if content_hash else "unknown"
        target_cache = cache or default_extraction_cache

        # Check if an extraction is already in progress for this content_hash
        if content_hash in self._locks:
            print(f"[STRUCTRA CACHE] COALESCE | Waiting for in-flight extraction for hash: {short_hash}")
            await self._locks[content_hash].wait()
            # After waiting, check target cache
            cached = await target_cache.get(content_hash)
            if cached is not None:
                return cached

        # Register in-flight extraction lock
        event = asyncio.Event()
        self._locks[content_hash] = event

        try:
            extraction = await extraction_coro_fn()
            return extraction
        finally:
            # Signal all waiting concurrent requests that extraction is done
            event.set()
            self._locks.pop(content_hash, None)


# Global default coalescer singleton
default_coalescer = ExtractionCoalescer()
