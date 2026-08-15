"""Supabase Storage path tests."""

from app.services.storage import build_document_storage_path


def test_storage_path_is_unique_and_user_scoped() -> None:
    """Storage paths are unique and are rooted at the authenticated user ID."""
    first_path = build_document_storage_path("user-123", "receipt.pdf")
    second_path = build_document_storage_path("user-123", "receipt.pdf")

    assert first_path != second_path
    assert first_path.startswith("user-123/")
    assert second_path.startswith("user-123/")
    assert first_path.endswith(".pdf")


def test_storage_path_preserves_the_validated_image_extension() -> None:
    """The generated object key retains the original document extension."""
    assert build_document_storage_path("user-123", "receipt.jpeg").endswith(".jpeg")
    assert build_document_storage_path("user-123", "receipt.png").endswith(".png")


def test_storage_path_follows_milestone_6_1_structure() -> None:
    """Storage paths follow user_id/document_id/original.extension pattern."""
    path = build_document_storage_path("user-123", "invoice.png", document_id="doc-456")
    assert path == "user-123/doc-456/original.png"

