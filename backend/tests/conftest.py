"""Pytest configuration and global fixtures for STRUCTRA backend test suite."""

import pytest
from app.services.extraction_cache import default_extraction_cache, default_coalescer


@pytest.fixture(autouse=True)
def _clear_extraction_cache_and_coalescer():
    """Clear memory cache and coalescing locks before and after each test for test isolation."""
    default_extraction_cache.clear_memory_cache()
    default_coalescer.clear_locks()
    yield
    default_extraction_cache.clear_memory_cache()
    default_coalescer.clear_locks()
