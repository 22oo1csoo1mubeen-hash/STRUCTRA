"""Document extraction endpoint and Gemini service tests."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api import dependencies
from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import Settings, get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata
from app.services.gemini import (
    GEMINI_FLASH_MODEL,
    GeminiServiceUnavailableError,
    GeminiUnexpectedResponseError,
    extract_receipt_invoice_document,
)

TEST_USER_ID = "00000000-0000-0000-0000-000000000031"


def _record(content_type: str = "application/pdf") -> CreatedDocumentMetadata:
    extension = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}[content_type]
    return CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(TEST_USER_ID),
        filename=f"receipt.{extension}",
        storage_path=f"{TEST_USER_ID}/{uuid4()}.{extension}",
        content_type=content_type,
        size=7,
        status="uploaded",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


@pytest.fixture
def authenticated_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=TEST_USER_ID)
    monkeypatch.setattr(document_routes, "update_document_status", AsyncMock())
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_authenticated_owner_receives_structured_extraction(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    record = _record()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=b"pdf"))
    extracted = {
        "vendor_company": "STRUCTRA Store",
        "address": None,
        "date": None,
        "invoice_number": None,
        "subtotal": None,
        "discount": None,
        "taxable_amount": None,
        "tax": None,
        "tax_components": [],
        "total": None,
        "line_items": [],
    }
    monkeypatch.setattr(document_routes, "extract_receipt_invoice_document", lambda *args, **kwargs: extracted)

    response = authenticated_client.post(f"/documents/{record.id}/extract")

    assert response.status_code == 200
    assert response.json() == {"document_id": str(record.id), "extraction": extracted}


def test_extraction_hides_missing_or_foreign_document(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    document_id = uuid4()
    storage_download = AsyncMock()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=None))
    monkeypatch.setattr(document_routes, "download_document_from_storage", storage_download)

    response = authenticated_client.post(f"/documents/{document_id}/extract")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."
    storage_download.assert_not_awaited()


def test_extraction_returns_storage_failure_safely(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    record = _record()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(
        document_routes,
        "download_document_from_storage",
        AsyncMock(side_effect=HTTPException(status_code=503, detail="Document storage is unavailable.")),
    )

    response = authenticated_client.post(f"/documents/{record.id}/extract")

    assert response.status_code == 503
    assert response.json()["detail"] == "Document storage is unavailable."


def test_extraction_returns_gemini_failure_safely(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    record = _record()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=b"pdf"))
    monkeypatch.setattr(
        document_routes,
        "extract_receipt_invoice_document",
        lambda *args, **kwargs: (_ for _ in ()).throw(GeminiServiceUnavailableError("SDK detail")),
    )

    response = authenticated_client.post(f"/documents/{record.id}/extract")

    assert response.status_code == 503
    assert response.json()["detail"] == "Document extraction is unavailable."


def test_extraction_returns_validation_failure_safely(
    authenticated_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    record = _record()
    monkeypatch.setattr(document_routes, "get_document_metadata", AsyncMock(return_value=record))
    monkeypatch.setattr(document_routes, "download_document_from_storage", AsyncMock(return_value=b"pdf"))
    monkeypatch.setattr(
        document_routes,
        "extract_receipt_invoice_document",
        lambda *args, **kwargs: {"total": "not a number"},
    )

    response = authenticated_client.post(f"/documents/{record.id}/extract")

    assert response.status_code == 503
    assert response.json()["detail"] == "Document extraction is unavailable."


def test_extraction_rejects_missing_authentication() -> None:
    response = TestClient(app).post(f"/documents/{uuid4()}/extract")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_extraction_rejects_invalid_authentication(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        dependencies,
        "get_authenticated_user",
        AsyncMock(
            side_effect=HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        ),
    )

    response = TestClient(app).post(
        f"/documents/{uuid4()}/extract", headers={"Authorization": "Bearer invalid-token"}
    )

    assert response.status_code == 401


@pytest.mark.parametrize("mime_type", ["application/pdf", "image/jpeg", "image/png"])
def test_gemini_extraction_uses_prompt_and_document_mime_type(
    monkeypatch: pytest.MonkeyPatch, mime_type: str
) -> None:
    class FakeClient:
        def __init__(self) -> None:
            self.models = self
            self.call: dict[str, object] | None = None

        def generate_content(self, **kwargs: object) -> object:
            self.call = kwargs
            return SimpleNamespace(text='{"vendor_company": "Store", "line_items": []}')

    fake_client = FakeClient()
    monkeypatch.setattr("app.services.gemini.build_receipt_invoice_extraction_prompt", lambda: "PROMPT")
    settings = Settings.model_construct(gemini_api_key=SecretStr("test-key"))

    result = extract_receipt_invoice_document(
        settings, document_content=b"document", mime_type=mime_type, client=fake_client
    )

    assert result == {"vendor_company": "Store", "line_items": []}
    assert fake_client.call is not None
    assert fake_client.call["model"] == GEMINI_FLASH_MODEL
    contents = fake_client.call["contents"]
    assert contents[0] == "PROMPT"
    assert contents[1].inline_data.mime_type == mime_type


def test_gemini_extraction_rejects_malformed_json() -> None:
    class FakeClient:
        def __init__(self) -> None:
            self.models = self

        def generate_content(self, **kwargs: object) -> object:
            return SimpleNamespace(text="not json")

    settings = Settings.model_construct(gemini_api_key=SecretStr("test-key"))
    with pytest.raises(GeminiUnexpectedResponseError, match="Gemini returned an invalid response"):
        extract_receipt_invoice_document(
            settings,
            document_content=b"document",
            mime_type="application/pdf",
            client=FakeClient(),
        )
