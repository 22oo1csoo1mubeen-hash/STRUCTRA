"""Document upload API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.auth import CurrentUser
from app.schemas.documents import DocumentUploadResponse
from app.services.documents import validate_document_upload

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Receive and validate a document upload",
    description=(
        "Receives one `multipart/form-data` document and validates its type and "
        "size. Accepted types: PDF, JPG/JPEG, and PNG. The maximum size is "
        "configured with `DOCUMENT_MAX_UPLOAD_SIZE_BYTES` (10 MiB by default). "
        "A valid Supabase bearer token is required. This endpoint does not store "
        "or process the document."
    ),
    responses={
        400: {"description": "Missing, malformed, or empty file."},
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        413: {"description": "File exceeds the configured size limit."},
        415: {"description": "File type is not PDF, JPG/JPEG, or PNG."},
        422: {"description": "Malformed multipart/form-data request."},
        503: {"description": "Supabase Auth is unavailable."},
    },
)
async def upload_document(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    file: Annotated[UploadFile | None, File(description="PDF, JPG/JPEG, or PNG file")] = None,
) -> DocumentUploadResponse:
    """Verify the user and validate a document without persisting it."""
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A document file is required.",
        )

    size = await validate_document_upload(file, settings)
    return DocumentUploadResponse(
        filename=file.filename,
        content_type=file.content_type,
        size=size,
    )
