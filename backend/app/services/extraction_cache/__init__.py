"""Extraction cache package providing content-hash caching and request coalescing."""

from app.services.extraction_cache.service import ExtractionCache, default_extraction_cache
from app.services.extraction_cache.coalescing import ExtractionCoalescer, default_coalescer

__all__ = [
    "ExtractionCache",
    "default_extraction_cache",
    "ExtractionCoalescer",
    "default_coalescer",
]
