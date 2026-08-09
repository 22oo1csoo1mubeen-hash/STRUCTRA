"""Document extraction processing-status lifecycle tests."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata
from app.services.gemini import GeminiServiceUnavailableError

TEST_USER_ID = "00000000-0000-0000-0000-000000000041"


def _record(*, document_status: str = "pending") -> CreatedDocumentMetadata:
    return CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(TEST_USER_ID),
        filename="receipt.pdf",
        storage_path=f"{TEST_USER_ID}/{uuid4()}.pdf",
        content_type="application/pdf",
        size=7,
        status=document_status,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


@pytest.fixture
def authenticated_client() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=TEST_USER_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _track_status_updates(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    updates: list[str] = []

    async def update_status(**kwargs: object) -> None:
        updates.append(str(kwargs["document_status"]))

    monkeypatch.setattr(document_routes, "update_document_status", update_status)
    return updates


def _prepare_owned_extraction(
    monkeypatch: pytest.MonkeyPatch, record: CreatedDocumentMetadata
) -> None:
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=b"pdf"))


def test_successful_extraction_transitions_from_processing_to_completed(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    record = _record()
    _prepare_owned_extraction(monkeypatch, record)
    updates = _track_status_updates(monkeypatch)
    monkeypatch.setattr(
        document_routes,
        "extract_receipt_invoice_document",
        lambda *args, **kwargs: {"vendor_company": "STRUCTRA Store", "line_items": []},
    )

    response = authenticated_client.post(f"/documents/{record.id}/extract")

    assert response.status_code == 200
    assert response.json()["extraction"]["vendor_company"] == "STRUCTRA Store"
    assert updates == ["processing", "completed"]


@pytest.mark.parametrize("failure", ["gemini", "storage", "validation"])
def test_processing_failures_transition_to_failed(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch, failure: str
) -> None:
    record = _record()
    _prepare_owned_extraction(monkeypatch, record)
    updates = _track_status_updates(monkeypatch)
    if failure == "gemini":
        monkeypatch.setattr(
            document_routes,
            "extract_receipt_invoice_document",
            lambda *args, **kwargs: (_ for _ in ()).throw(GeminiServiceUnavailableError("SDK detail")),
        )
    elif failure == "storage":
        monkeypatch.setattr(
            document_routes,
            "download_document_from_storage",
            AsyncMock(
                side_effect=HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Document storage is unavailable.",
                )
            ),
        )
    else:
        monkeypatch.setattr(
            document_routes,
            "extract_receipt_invoice_document",
            lambda *args, **kwargs: {"total": "not a number"},
        )

    response = authenticated_client.post(f"/documents/{record.id}/extract")

    assert response.status_code == 503
    assert updates == ["processing", "failed"]


def test_processing_status_failure_stops_extraction_safely(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    record = _record()
    metadata = AsyncMock(return_value=record)
    download = AsyncMock(return_value=b"pdf")
    monkeypatch.setattr(document_routes, "get_document_metadata", metadata)
    monkeypatch.setattr(document_routes, "download_document_from_storage", download)
    monkeypatch.setattr(
        document_routes,
        "update_document_status",
        AsyncMock(
            side_effect=HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to update document status.",
            )
        ),
    )

    response = authenticated_client.post(f"/documents/{record.id}/extract")

    assert response.status_code == 503
    assert response.json()["detail"] == "Document extraction is unavailable."
    download.assert_not_awaited()


def test_foreign_document_cannot_change_processing_status(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    update_status = AsyncMock()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))
    monkeypatch.setattr(document_routes, "update_document_status", update_status)

    response = authenticated_client.post(f"/documents/{uuid4()}/extract")

    assert response.status_code == 404
    update_status.assert_not_awaited()


@pytest.mark.parametrize("document_status", ["processing", "completed", "failed"])
def test_document_retrieval_returns_current_processing_status(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch, document_status: str
) -> None:
    record = _record(document_status=document_status)
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))

    response = authenticated_client.get(f"/documents/{record.id}")

    assert response.status_code == 200
    assert response.json()["status"] == document_status
