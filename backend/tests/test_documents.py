"""Document upload endpoint tests."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import ANY
from uuid import uuid4

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api.routes import documents as document_routes
from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def stored_paths(monkeypatch) -> list[str]:
    """Replace Supabase Storage with a deterministic in-memory test boundary."""
    paths: list[str] = []

    async def store_document(file, user_id: str, settings) -> str:
        path = f"{user_id}/{uuid4()}{file.filename[file.filename.rfind('.'):]}"
        paths.append(path)
        return path

    monkeypatch.setattr(document_routes, "upload_document_to_storage", store_document)
    return paths


@pytest.fixture
def metadata_records(monkeypatch) -> list[dict[str, object]]:
    """Replace Supabase PostgreSQL with an in-memory metadata boundary."""
    records: list[dict[str, object]] = []

    async def store_metadata(**kwargs) -> CreatedDocumentMetadata:
        records.append(kwargs)
        return CreatedDocumentMetadata(
            id=uuid4(),
            user_id=kwargs["user_id"],
            filename=kwargs["filename"],
            storage_path=kwargs["storage_path"],
            content_type=kwargs["content_type"],
            size=kwargs["size"],
            status="pending",
            created_at=datetime(2026, 1, 1, tzinfo=UTC),
        )

    monkeypatch.setattr(document_routes, "create_document_metadata", store_metadata)
    return records


@pytest.fixture
def authenticated_client(
    stored_paths: list[str], metadata_records: list[dict[str, object]]
) -> TestClient:
    """Provide an authenticated client with an isolated upload size limit."""
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        document_max_upload_size_bytes=10
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=TEST_USER_ID
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("filename", "content_type"),
    [
        ("receipt.pdf", "application/pdf"),
        ("receipt.jpg", "image/jpeg"),
        ("receipt.jpeg", "image/jpeg"),
        ("receipt.png", "image/png"),
    ],
)
def test_upload_accepts_allowed_document_types(
    authenticated_client: TestClient,
    stored_paths: list[str],
    metadata_records: list[dict[str, object]],
    filename: str,
    content_type: str,
) -> None:
    """Allowed document types return the validation confirmation."""
    response = authenticated_client.post(
        "/documents/upload",
        files={"file": (filename, b"valid", content_type)},
    )

    assert response.status_code == 200
    response_body = response.json()
    assert response_body["success"] is True
    assert response_body["filename"] == filename
    assert response_body["content_type"] == content_type
    assert response_body["size"] == 5
    assert response_body["storage_path"] == stored_paths[0]
    assert response_body["status"] == "pending"
    assert response_body["message"] == "Document uploaded successfully."
    assert response_body["document_id"]
    assert response_body["created_at"] == "2026-01-01T00:00:00Z"
    assert response_body["storage_path"].startswith(f"{TEST_USER_ID}/")
    assert metadata_records == [
        {
            "user_id": TEST_USER_ID,
            "filename": filename,
            "storage_path": stored_paths[0],
            "content_type": content_type,
            "size": 5,
            "settings": ANY,
        }
    ]


def test_upload_rejects_missing_file(authenticated_client: TestClient) -> None:
    """A multipart request without a file is invalid."""
    response = authenticated_client.post("/documents/upload", files={})

    assert response.status_code == 400
    assert response.json()["detail"] == "A document file is required."


def test_upload_rejects_unsupported_file_type(authenticated_client: TestClient) -> None:
    """A non-document MIME type is rejected."""
    response = authenticated_client.post(
        "/documents/upload",
        files={"file": ("notes.txt", b"valid", "text/plain")},
    )

    assert response.status_code == 415


def test_upload_rejects_empty_file(authenticated_client: TestClient) -> None:
    """An empty allowed document is rejected."""
    response = authenticated_client.post(
        "/documents/upload",
        files={"file": ("receipt.pdf", b"", "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Uploaded file is empty."


def test_upload_rejects_oversized_file(authenticated_client: TestClient) -> None:
    """A file above the configured maximum is rejected."""
    response = authenticated_client.post(
        "/documents/upload",
        files={"file": ("receipt.pdf", b"01234567890", "application/pdf")},
    )

    assert response.status_code == 413


def test_upload_rejects_malformed_request(authenticated_client: TestClient) -> None:
    """A non-multipart request is rejected as an invalid request."""
    response = authenticated_client.post("/documents/upload", content=b"not multipart")

    assert response.status_code == 400


def test_upload_uses_unique_paths_for_duplicate_filenames(
    authenticated_client: TestClient, stored_paths: list[str]
) -> None:
    """Repeated source filenames use distinct paths under the same user."""
    files = {"file": ("receipt.pdf", b"valid", "application/pdf")}

    first_response = authenticated_client.post("/documents/upload", files=files)
    second_response = authenticated_client.post("/documents/upload", files=files)

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert len(stored_paths) == 2
    assert stored_paths[0] != stored_paths[1]
    assert all(path.startswith(f"{TEST_USER_ID}/") for path in stored_paths)


def test_storage_failure_does_not_create_metadata_record(
    authenticated_client: TestClient, metadata_records: list[dict[str, object]], monkeypatch
) -> None:
    """Metadata insertion is never attempted when Storage rejects an upload."""

    async def storage_failure(*args, **kwargs):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document storage is unavailable.",
        )

    monkeypatch.setattr(document_routes, "upload_document_to_storage", storage_failure)

    response = authenticated_client.post(
        "/documents/upload",
        files={"file": ("receipt.pdf", b"valid", "application/pdf")},
    )

    assert response.status_code == 503
    assert metadata_records == []


def test_metadata_failure_after_storage_returns_safe_503(
    authenticated_client: TestClient, stored_paths: list[str], monkeypatch
) -> None:
    """A failed metadata insert never produces a successful upload response."""

    async def metadata_failure(**kwargs):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save document metadata.",
        )

    monkeypatch.setattr(document_routes, "create_document_metadata", metadata_failure)

    response = authenticated_client.post(
        "/documents/upload",
        files={"file": ("receipt.pdf", b"valid", "application/pdf")},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to save document metadata."
    assert len(stored_paths) == 1


@pytest.mark.parametrize(
    "authorization",
    [None, "abc", "Basic credentials", "Bearer"],
)
def test_upload_rejects_missing_or_malformed_authorization(
    authorization: str | None,
) -> None:
    """Missing and malformed authorization headers are rejected."""
    client = TestClient(app)
    headers = {"Authorization": authorization} if authorization else {}

    response = client.post(
        "/documents/upload",
        files={"file": ("receipt.pdf", b"valid", "application/pdf")},
        headers=headers,
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
