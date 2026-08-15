"""Tests for Milestone 6.1: Supabase Storage + Database Foundation."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.config import Settings
from app.services.document_metadata import CreatedDocumentMetadata, update_document_status
from app.services.storage import build_document_storage_path


def test_document_metadata_schema_contains_ownership_and_storage_fields() -> None:
    """Document schema includes id, user_id, filename, storage_path, content_type, size, status, created_at, content_hash, and processed_at."""
    doc_id = uuid4()
    user_id = uuid4()
    now = datetime.now(timezone.utc)

    metadata = CreatedDocumentMetadata(
        id=doc_id,
        user_id=user_id,
        filename="invoice.pdf",
        storage_path=f"{user_id}/{doc_id}/original.pdf",
        content_type="application/pdf",
        size=1024,
        status="pending",
        created_at=now,
        content_hash="a" * 64,
        processed_at=now,
    )

    assert metadata.id == doc_id
    assert metadata.user_id == user_id
    assert metadata.filename == "invoice.pdf"
    assert metadata.storage_path == f"{user_id}/{doc_id}/original.pdf"
    assert metadata.content_type == "application/pdf"
    assert metadata.size == 1024
    assert metadata.status == "pending"
    assert metadata.created_at == now
    assert metadata.content_hash == "a" * 64
    assert metadata.processed_at == now


def test_storage_path_user_and_document_scoped() -> None:
    """Storage paths follow documents/{user_id}/{document_id}/original.{ext} structure."""
    user_id = "user-abc-123"
    doc_id = "doc-789-xyz"
    filename = "receipt.png"

    path = build_document_storage_path(user_id=user_id, filename=filename, document_id=doc_id)

    assert path == f"{user_id}/{doc_id}/original.png"
    assert path.startswith(f"{user_id}/")
    assert f"/{doc_id}/" in path
    assert path.endswith("/original.png")


def test_storage_path_prevents_cross_user_mixing() -> None:
    """Distinct users uploading identical filenames get isolated paths under their own user_id."""
    user1_path = build_document_storage_path("user-1", "doc.pdf", document_id="doc-100")
    user2_path = build_document_storage_path("user-2", "doc.pdf", document_id="doc-100")

    assert user1_path != user2_path
    assert user1_path.startswith("user-1/")
    assert user2_path.startswith("user-2/")


def test_private_bucket_default_setting() -> None:
    """Settings specify 'documents' as default storage bucket name."""
    settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY="test_pub_key",
        SUPABASE_SECRET_KEY="test_secret_key",
    )
    assert settings.supabase_storage_bucket == "documents"


@pytest.mark.anyio
async def test_update_document_status_sets_processed_at_on_completion(monkeypatch) -> None:
    """Transitioning status to 'completed' automatically populates processed_at timestamp."""
    doc_id = uuid4()
    user_id = "user-123"
    settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY="test_pub_key",
        SUPABASE_SECRET_KEY="test_secret_key",
    )

    recorded_payloads: list[dict] = []

    class MockResponse:
        is_success = True
        def json(self):
            return [{"id": str(doc_id)}]

    class MockAsyncClient:
        def __init__(self, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def patch(self, url, headers=None, params=None, json=None):
            recorded_payloads.append(json)
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", MockAsyncClient)

    await update_document_status(
        document_id=doc_id,
        user_id=user_id,
        document_status="completed",
        settings=settings,
    )

    assert len(recorded_payloads) == 1
    assert recorded_payloads[0]["status"] == "completed"
    assert "processed_at" in recorded_payloads[0]

