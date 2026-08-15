"""Document upload validation services."""

from typing import Final

from fastapi import HTTPException, UploadFile, status

from app.core.config import Settings

ALLOWED_DOCUMENT_TYPES: Final[dict[str, frozenset[str]]] = {
    "application/pdf": frozenset({".pdf"}),
    "image/jpeg": frozenset({".jpg", ".jpeg"}),
    "image/png": frozenset({".png"}),
}
_READ_CHUNK_SIZE: Final[int] = 1024 * 1024


async def validate_document_upload(file: UploadFile, settings: Settings) -> int:
    """Validate a document upload and return its size in bytes.

    The body is read in bounded chunks so uploads exceeding the configured
    maximum are rejected without loading the entire document into memory.
    """
    filename = file.filename
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A file with a filename is required.",
        )

    content_type = file.content_type
    extension = _file_extension(filename)
    if (
        content_type not in ALLOWED_DOCUMENT_TYPES
        or extension not in ALLOWED_DOCUMENT_TYPES[content_type]
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Allowed types are PDF, JPG, JPEG, and PNG.",
        )

    max_size = getattr(settings, "document_max_upload_size_bytes", 10 * 1024 * 1024)
    size = 0
    while chunk := await file.read(_READ_CHUNK_SIZE):
        size += len(chunk)
        if size > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=(
                    "File exceeds the maximum allowed size of "
                    f"{max_size} bytes."
                ),
            )

    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    return size


def _file_extension(filename: str) -> str:
    """Return the lower-cased file extension, including the leading period."""
    return f".{filename.rsplit('.', maxsplit=1)[-1].lower()}" if "." in filename else ""
