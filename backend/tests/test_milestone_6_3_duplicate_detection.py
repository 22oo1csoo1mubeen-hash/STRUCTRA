"""Milestone 6.3: Duplicate Detection + Persistent Document Reuse Integration Tests."""

from datetime import UTC, datetime
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.document_metadata import CreatedDocumentMetadata
from app.services.quality.schemas import ExtractionQualityResult, ProviderInfo

USER_A_ID = "00000000-0000-0000-0000-00000000000a"
USER_B_ID = "00000000-0000-0000-0000-00000000000b"


def _make_existing_doc(
    user_id_str: str,
    content_hash: str,
    *,
    filename: str = "receipt.pdf",
    status: str = "completed",
) -> CreatedDocumentMetadata:
    doc_id = uuid4()
    return CreatedDocumentMetadata(
        id=doc_id,
        user_id=UUID(user_id_str),
        filename=filename,
        storage_path=f"{user_id_str}/{doc_id}/original.pdf",
        content_type="application/pdf",
        size=1024,
        status=status,
        created_at=datetime(2026, 2, 10, 12, 0, 0, tzinfo=UTC),
        processed_at=datetime(2026, 2, 10, 12, 0, 5, tzinfo=UTC),
        content_hash=content_hash,
        extraction_result={"vendor_company": "Existing Vendor", "total": 150.0},
        quality_result={
            "overall_confidence": 0.95,
            "confidence_level": "HIGH",
            "needs_review": False,
            "signals": [],
            "field_confidence": {},
        },
    )


@pytest.fixture
def client_user_a() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        document_max_upload_size_bytes=10 * 1024 * 1024
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def client_user_b() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        document_max_upload_size_bytes=10 * 1024 * 1024
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_B_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_duplicate_upload_same_user_same_bytes_returns_duplicate_response(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Requirement 1 & 12: Uploading duplicate content for same user returns is_duplicate=true and existing_document_id."""
    pdf_content = b"%PDF-1.4 sample duplicate pdf bytes"
    expected_hash = document_routes.hash_document_content(pdf_content)
    existing_doc = _make_existing_doc(USER_A_ID, expected_hash, filename="original.pdf")

    find_mock = AsyncMock(return_value=[existing_doc])
    store_mock = AsyncMock()
    db_create_mock = AsyncMock()

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", find_mock)
    monkeypatch.setattr(document_routes, "upload_document_to_storage", store_mock)
    monkeypatch.setattr(document_routes, "create_document_metadata", db_create_mock)

    response = client_user_a.post(
        "/documents/upload",
        files={"file": ("new_name.pdf", BytesIO(pdf_content), "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_duplicate"] is True
    assert data["existing_document_id"] == str(existing_doc.id)
    assert data["document_id"] == str(existing_doc.id)
    assert data["message"] == "This document already exists in your Document Library."

    # Verify no new storage object or DB row created
    store_mock.assert_not_awaited()
    db_create_mock.assert_not_awaited()


def test_duplicate_upload_same_user_different_filename_detected(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Requirement 2: Same bytes with different filename triggers duplicate detection."""
    pdf_content = b"%PDF-1.4 identical content different name"
    expected_hash = document_routes.hash_document_content(pdf_content)
    existing_doc = _make_existing_doc(USER_A_ID, expected_hash, filename="first_name.pdf")

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", AsyncMock(return_value=[existing_doc]))
    store_mock = AsyncMock()
    monkeypatch.setattr(document_routes, "upload_document_to_storage", store_mock)

    response = client_user_a.post(
        "/documents/upload",
        files={"file": ("completely_different_filename.pdf", BytesIO(pdf_content), "application/pdf")},
    )

    assert response.status_code == 200
    assert response.json()["is_duplicate"] is True
    assert response.json()["existing_document_id"] == str(existing_doc.id)
    store_mock.assert_not_awaited()


def test_same_filename_different_bytes_not_duplicate(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Requirement 3: Same filename with different byte content is NOT a duplicate."""
    pdf_content = b"%PDF-1.4 new different content bytes"

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", AsyncMock(return_value=[]))
    monkeypatch.setattr(document_routes, "upload_document_to_storage", AsyncMock(return_value="path/to/storage.pdf"))

    response = client_user_a.post(
        "/documents/upload",
        files={"file": ("receipt.pdf", BytesIO(pdf_content), "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_duplicate"] is False
    assert data["existing_document_id"] is None
    assert data["document_id"]


def test_cross_user_same_bytes_not_duplicate(
    client_user_b: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Requirement 4 & 13: User B uploading identical bytes as User A is NOT a duplicate of User A's document."""
    pdf_content = b"%PDF-1.4 shared byte content"
    expected_hash = document_routes.hash_document_content(pdf_content)

    # Scoped to User B returns [] because User B owns no rows yet
    async def mock_find(user_id: str, content_hash: str, settings=None):
        if user_id == USER_B_ID:
            return []
        return [_make_existing_doc(USER_A_ID, content_hash)]

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", mock_find)
    monkeypatch.setattr(document_routes, "upload_document_to_storage", AsyncMock(return_value="user_b/doc/storage.pdf"))

    response = client_user_b.post(
        "/documents/upload",
        files={"file": ("user_b_receipt.pdf", BytesIO(pdf_content), "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_duplicate"] is False
    assert data["existing_document_id"] is None
    assert data["document_id"]


def test_duplicate_upload_bypasses_ai_and_ocr(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Requirements 7, 8, 9: Duplicate detection prevents AI and OCR execution."""
    pdf_content = b"%PDF-1.4 duplicate bypass check"
    expected_hash = document_routes.hash_document_content(pdf_content)
    existing_doc = _make_existing_doc(USER_A_ID, expected_hash)

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", AsyncMock(return_value=[existing_doc]))

    ai_extract_mock = AsyncMock()
    ocr_mock = MagicMock()
    monkeypatch.setattr(document_routes.default_ai_manager, "extract_document", ai_extract_mock)
    monkeypatch.setattr(document_routes.default_ocr_service, "extract_text_from_bytes", ocr_mock)

    response = client_user_a.post(
        "/documents/upload",
        files={"file": ("receipt.pdf", BytesIO(pdf_content), "application/pdf")},
    )

    assert response.status_code == 200
    assert response.json()["is_duplicate"] is True
    ai_extract_mock.assert_not_awaited()
    ocr_mock.assert_not_called()


def test_concurrency_race_condition_protection(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Requirement 15: DB unique constraint conflict during concurrent save recovers and returns existing doc."""
    pdf_content = b"%PDF-1.4 race condition test"
    expected_hash = document_routes.hash_document_content(pdf_content)
    existing_doc = _make_existing_doc(USER_A_ID, expected_hash)

    # 1. Pre-check returns empty list on upload
    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", AsyncMock(side_effect=[[], [existing_doc]]))
    monkeypatch.setattr(document_routes, "upload_document_to_storage", AsyncMock(return_value="temp/storage/path.pdf"))
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=pdf_content))
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))
    monkeypatch.setattr(document_routes, "create_signed_storage_url", AsyncMock(return_value="https://signed.url"))

    # DB insert on save fails due to PostgreSQL unique index constraint, then recovers existing doc
    monkeypatch.setattr(
        document_routes,
        "create_document_metadata",
        AsyncMock(side_effect=HTTPException(status_code=503, detail="Unique constraint conflict")),
    )

    up_res = client_user_a.post(
        "/documents/upload",
        files={"file": ("concurrent.pdf", BytesIO(pdf_content), "application/pdf")},
    )
    assert up_res.status_code == 200
    doc_id = up_res.json()["document_id"]

    save_res = client_user_a.post(f"/documents/{doc_id}/save")
    assert save_res.status_code == 200
    data = save_res.json()
    assert data["document"]["document_id"] == str(existing_doc.id)


def test_force_duplicate_parameter_bypasses_fast_path(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User passing force_duplicate=true bypasses duplicate fast-path and creates a new document."""
    pdf_content = b"%PDF-1.4 sample duplicate pdf bytes"
    expected_hash = document_routes.hash_document_content(pdf_content)
    existing_doc = _make_existing_doc(USER_A_ID, expected_hash, filename="original.pdf")
    new_doc = _make_existing_doc(USER_A_ID, "new_doc_hash", filename="original.pdf")

    find_mock = AsyncMock(return_value=[existing_doc])
    store_mock = AsyncMock(return_value=new_doc.storage_path)

    monkeypatch.setattr(document_routes, "find_document_metadata_by_content_hash", find_mock)
    monkeypatch.setattr(document_routes, "upload_document_to_storage", store_mock)

    response = client_user_a.post(
        "/documents/upload?force_duplicate=true",
        files={"file": ("original.pdf", BytesIO(pdf_content), "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_duplicate"] is False
    assert data["existing_document_id"] is None
    assert data["document_id"]

    # Verify storage upload WAS called
    store_mock.assert_awaited_once()

