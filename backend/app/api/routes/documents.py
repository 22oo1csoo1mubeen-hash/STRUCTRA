"""Document upload API endpoints."""

from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.auth import CurrentUser
from app.schemas.documents import DocumentMetadataResponse, DocumentUploadResponse
from app.services.document_metadata import (
    create_document_metadata,
    get_document_metadata,
    list_document_metadata,
)
from app.services.documents import validate_document_upload
from app.services.storage import download_document_from_storage, upload_document_to_storage

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get(
    "",
    response_model=list[DocumentMetadataResponse],
    summary="List the current user's document metadata",
)
async def list_documents(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> list[DocumentMetadataResponse]:
    """Return only metadata records belonging to the authenticated user."""
    records = await list_document_metadata(user_id=current_user.user_id, settings=settings)
    return [_metadata_response(record) for record in records]


@router.get(
    "/{document_id}",
    response_model=DocumentMetadataResponse,
    summary="Get one document's metadata",
    responses={404: {"description": "Document not found."}},
)
async def get_document(
    document_id: UUID,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DocumentMetadataResponse:
    """Return a document only if it belongs to the authenticated user."""
    record = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return _metadata_response(record)


@router.get(
    "/{document_id}/download",
    summary="Download one owned document",
    responses={
        404: {"description": "Document or storage object not found."},
        503: {"description": "Document storage is unavailable."},
    },
)
async def download_document(
    document_id: UUID,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> Response:
    """Return the original private Storage object only to its authenticated owner."""
    metadata = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    if metadata is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    content = await download_document_from_storage(metadata.storage_path, settings)
    download_name = quote(metadata.filename, safe="")
    return Response(
        content=content,
        media_type=metadata.content_type,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{download_name}"},
    )


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Receive and validate a document upload",
    description=(
        "Receives one `multipart/form-data` document and validates its type and "
        "size. Accepted types: PDF, JPG/JPEG, and PNG. The maximum size is "
        "configured with `DOCUMENT_MAX_UPLOAD_SIZE_BYTES` (10 MiB by default). "
        "A valid Supabase bearer token is required. Valid documents are stored "
        "in the configured private Supabase Storage bucket and recorded as metadata."
    ),
    responses={
        400: {"description": "Missing, malformed, or empty file."},
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        413: {"description": "File exceeds the configured size limit."},
        415: {"description": "File type is not PDF, JPG/JPEG, or PNG."},
        422: {"description": "Malformed multipart/form-data request."},
        503: {"description": "Supabase Auth, Storage, or metadata service is unavailable."},
    },
)
async def upload_document(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    file: Annotated[UploadFile | None, File(description="PDF, JPG/JPEG, or PNG file")] = None,
) -> DocumentUploadResponse:
    """Verify, validate, store, then persist metadata for an uploaded document."""
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A document file is required.",
        )

    size = await validate_document_upload(file, settings)
    storage_path = await upload_document_to_storage(file, current_user.user_id, settings)
    metadata = await create_document_metadata(
        user_id=current_user.user_id,
        filename=file.filename or "",
        storage_path=storage_path,
        content_type=file.content_type or "",
        size=size,
        settings=settings,
    )
    return DocumentUploadResponse(
        filename=file.filename,
        content_type=file.content_type,
        size=size,
        storage_path=storage_path,
        document_id=metadata.id,
        status=metadata.status,
        created_at=metadata.created_at,
    )


def _metadata_response(metadata) -> DocumentMetadataResponse:
    """Map internal database metadata to the public API contract."""
    return DocumentMetadataResponse(
        document_id=metadata.id,
        filename=metadata.filename,
        storage_path=metadata.storage_path,
        content_type=metadata.content_type,
        size=metadata.size,
        status=metadata.status,
        created_at=metadata.created_at,
    )
