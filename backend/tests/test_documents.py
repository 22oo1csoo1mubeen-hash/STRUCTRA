"""Document upload endpoint tests."""

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser


@pytest.fixture
def authenticated_client() -> TestClient:
    """Provide an authenticated client with an isolated upload size limit."""
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        document_max_upload_size_bytes=10
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id="test-user-id"
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
    authenticated_client: TestClient, filename: str, content_type: str
) -> None:
    """Allowed document types return the validation confirmation."""
    response = authenticated_client.post(
        "/documents/upload",
        files={"file": (filename, b"valid", content_type)},
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "filename": filename,
        "content_type": content_type,
        "size": 5,
        "message": "Document received successfully.",
    }


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
