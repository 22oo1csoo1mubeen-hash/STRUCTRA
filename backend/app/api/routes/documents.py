"""Document upload API endpoints."""

from typing import Annotated
import asyncio
import time
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.auth import CurrentUser
from app.schemas.documents import (
    DocumentDeleteResponse,
    DocumentExtractionResponse,
    DocumentMetadataResponse,
    DocumentUploadResponse,
    DocumentValidationResult,
    ReceiptInvoiceExtraction,
    DuplicateDocumentCandidate,
)
from app.services.document_metadata import (
    create_document_metadata,
    delete_document_metadata,
    get_document_metadata,
    list_document_metadata,
    update_document_status,
)
from app.services.documents import validate_document_upload
from app.services.extraction_validation import (
    GeminiExtractionValidationError,
    validate_receipt_invoice_extraction,
)
from app.services.gemini import (
    GeminiAuthenticationError,
    GeminiConfigurationError,
    GeminiServiceUnavailableError,
    GeminiUnexpectedResponseError,
    extract_receipt_invoice_document,
)
from app.services.duplicate_detection import hash_document_content, detect_duplicate
from app.services.quality_signals import derive_extraction_quality_signals
from app.services.ocr import default_ocr_service, OCRError
from app.services.ai import default_ai_manager, AIExtractionError
from app.services.extraction_cache import default_extraction_cache, default_coalescer
from app.services.quality import evaluate_extraction_quality, ProviderInfo
from app.services.validation_aggregation import aggregate_validation_results
from app.services.storage import (
    delete_document_from_storage,
    download_document_from_storage,
    upload_document_to_storage,
)

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
    "/{document_id}/extract",
    response_model=DocumentExtractionResponse,
    summary="Extract structured receipt or invoice data from one owned document",
    responses={
        404: {"description": "Document not found."},
        503: {"description": "Document storage or extraction service is unavailable."},
    },
)
async def extract_document(
    document_id: UUID,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DocumentExtractionResponse:
    """Extract JSON from an owned document and persist its processing status."""
    metadata = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    if metadata is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    try:
        await update_document_status(
            document_id=metadata.id,
            user_id=current_user.user_id,
            document_status="processing",
            settings=settings,
        )
    except HTTPException as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document extraction is unavailable.",
        ) from error

    try:
        t_storage0 = time.perf_counter()
        content = await download_document_from_storage(metadata.storage_path, settings)
        t_storage1 = time.perf_counter()
        print(f"[STRUCTRA PERF] Download Document from Storage: {(t_storage1 - t_storage0)*1000:.1f} ms")

        t_hash0 = time.perf_counter()
        content_hash = hash_document_content(content)
        t_hash1 = time.perf_counter()
        print(f"[STRUCTRA PERF] Content hash: {(t_hash1 - t_hash0)*1000:.2f} ms")

        cached_extraction = await default_extraction_cache.get(content_hash, settings=settings)
        is_cache_miss = False
        active_provider_info = None

        if cached_extraction is not None:
            # CACHE HIT PATH: Re-validate cached extraction with Pydantic
            validated_extraction = ReceiptInvoiceExtraction.model_validate(
                cached_extraction.model_dump(mode="json")
            )
        else:
            # CACHE MISS PATH: Execute coalesced AI extraction
            print(f"[STRUCTRA CACHE] MISS | Hash: {content_hash[:8]}")
            is_cache_miss = True

            async def _perform_ai_extraction() -> ReceiptInvoiceExtraction:
                ocr_task = asyncio.create_task(
                    default_ocr_service.extract_text_from_bytes_async(
                        content, filename=metadata.filename
                    )
                )
                return await default_ai_manager.extract_document(
                    content,
                    content_type=metadata.content_type,
                    ocr_task=ocr_task,
                )

            t_extract0 = time.perf_counter()
            validated_extraction = await default_coalescer.run_coalesced(
                content_hash, _perform_ai_extraction
            )
            t_extract1 = time.perf_counter()
            active_provider_info = getattr(default_ai_manager, "last_used_provider_info", None) or ProviderInfo(
                provider=default_ai_manager.active_provider.provider_name,
                model=default_ai_manager.active_provider.model_name,
            )
            print(f"[STRUCTRA PERF] AI Extraction ({active_provider_info.provider}): {(t_extract1 - t_extract0)*1000:.1f} ms")

        quality_res = evaluate_extraction_quality(
            validated_extraction,
            ocr_result=None,
            provider_info=active_provider_info,
        )

        # Cache STORE: Only store in cache after full downstream extraction/validation succeeds
        if is_cache_miss:
            await default_extraction_cache.set(content_hash, validated_extraction, settings=settings)
    except HTTPException:
        await _mark_extraction_failed(metadata.id, current_user.user_id, settings)
        raise
    except (
        OCRError,
        AIExtractionError,
        GeminiAuthenticationError,
        GeminiConfigurationError,
        GeminiServiceUnavailableError,
        GeminiUnexpectedResponseError,
        GeminiExtractionValidationError,
    ) as error:
        await _mark_extraction_failed(metadata.id, current_user.user_id, settings)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document extraction is unavailable.",
        ) from error

    try:
        await update_document_status(
            document_id=metadata.id,
            user_id=current_user.user_id,
            document_status="completed",
            settings=settings,
        )
    except HTTPException as error:
        await _mark_extraction_failed(metadata.id, current_user.user_id, settings)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document extraction is unavailable.",
        ) from error

    return DocumentExtractionResponse(
        document_id=metadata.id,
        extraction=validated_extraction,
        quality=quality_res,
    )


async def _mark_extraction_failed(document_id: UUID, user_id: str, settings: Settings) -> None:
    """Attempt a failure transition without replacing the original safe error."""
    try:
        await update_document_status(
            document_id=document_id,
            user_id=user_id,
            document_status="failed",
            settings=settings,
        )
    except Exception:
        pass


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete one owned document",
    responses={
        404: {"description": "Document not found."},
        503: {"description": "Storage or metadata service is unavailable."},
    },
)
async def delete_document(
    document_id: UUID,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DocumentDeleteResponse:
    """Delete a document from Storage and PostgreSQL only when owned by the caller."""
    metadata = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    if metadata is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    await delete_document_from_storage(metadata.storage_path, settings)
    await delete_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    return DocumentDeleteResponse()


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

    t_upload0 = time.perf_counter()
    size = await validate_document_upload(file, settings)
    await file.seek(0)
    
    t_hash0 = time.perf_counter()
    content_hash = hash_document_content(await file.read())
    t_hash1 = time.perf_counter()
    print(f"[STRUCTRA PERF] Content Hash: {(t_hash1 - t_hash0)*1000:.1f} ms")
    
    await file.seek(0) # reset before upload to storage

    t_store0 = time.perf_counter()
    storage_path = await upload_document_to_storage(file, current_user.user_id, settings)
    t_store1 = time.perf_counter()
    print(f"[STRUCTRA PERF] Storage Upload: {(t_store1 - t_store0)*1000:.1f} ms")

    t_db0 = time.perf_counter()
    metadata = await create_document_metadata(
        user_id=current_user.user_id,
        filename=file.filename or "",
        storage_path=storage_path,
        content_type=file.content_type or "",
        size=size,
        content_hash=content_hash,
        settings=settings,
    )
    t_db1 = time.perf_counter()
    print(f"[STRUCTRA PERF] DB metadata: {(t_db1 - t_db0)*1000:.1f} ms")
    print(f"[STRUCTRA PERF] Upload Total: {(time.perf_counter() - t_upload0)*1000:.1f} ms")
    return DocumentUploadResponse(
        filename=file.filename,
        content_type=file.content_type,
        size=size,
        storage_path=storage_path,
        document_id=metadata.id,
        status=metadata.status,
        created_at=metadata.created_at,
    )


@router.post(
    "/{document_id}/validate",
    response_model=DocumentValidationResult,
    summary="Validate an extracted document",
    responses={
        404: {"description": "Document not found."},
    },
)
async def validate_document(
    document_id: UUID,
    extraction: ReceiptInvoiceExtraction,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DocumentValidationResult:
    """Validate extraction using M5.1 to M5.4 rules."""
    metadata = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    if metadata is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    t_val_total0 = time.perf_counter()
    # M5.1 and M5.2
    t_math0 = time.perf_counter()
    quality_signals = derive_extraction_quality_signals(extraction)
    t_math1 = time.perf_counter()
    print(f"[STRUCTRA PERF] Math validation: {(t_math1 - t_math0)*1000:.1f} ms")

    # M5.3 Duplicate Detection
    t_dup0 = time.perf_counter()
    user_docs = await list_document_metadata(user_id=current_user.user_id, settings=settings)
    existing_documents = [
        DuplicateDocumentCandidate(
            document_id=doc.id,
            user_id=doc.user_id,
            content_hash=doc.content_hash,
            extraction=None  # Extractions are not persisted in DB yet
        )
        for doc in user_docs if doc.id != document_id
    ]

    duplicate_result = detect_duplicate(
        user_id=current_user.user_id,
        content_hash=metadata.content_hash or "",
        extraction=extraction,
        existing_documents=existing_documents,
    )
    t_dup1 = time.perf_counter()
    print(f"[STRUCTRA PERF] Duplicate detection (incl DB lookup): {(t_dup1 - t_dup0)*1000:.1f} ms")

    # M5.4 Aggregation
    result = aggregate_validation_results(
        quality_signals=quality_signals,
        duplicate_detection=duplicate_result,
    )
    print(f"[STRUCTRA PERF] Validation Total: {(time.perf_counter() - t_val_total0)*1000:.1f} ms")
    return result


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
