"""Document upload API endpoints."""

from typing import Annotated, Any
import asyncio
from datetime import datetime, timezone
from pathlib import PurePath
import time
from urllib.parse import quote
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.auth import CurrentUser
from app.schemas.documents import (
    DocumentDeleteResponse,
    DocumentDetailResponse,
    DocumentExtractionResponse,
    DocumentLibraryStats,
    DocumentListItem,
    DocumentListResponse,
    DocumentMetadataResponse,
    DocumentPreviewResponse,
    DocumentUploadResponse,
    DocumentValidationResult,
    DuplicateDocumentCandidate,
    MathematicalValidationResult,
    OriginalDocumentInfo,
    ReceiptInvoiceExtraction,
)
from app.services.document_metadata import (
    CreatedDocumentMetadata,
    create_document_metadata,
    delete_document_metadata,
    find_document_metadata_by_content_hash,
    get_document_metadata,
    get_user_document_library_stats,
    list_document_metadata,
    update_document_extraction_and_quality,
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
from app.services.mathematical_validation import validate_extraction_totals
from app.services.duplicate_detection import hash_document_content, detect_duplicate
from app.services.quality_signals import derive_extraction_quality_signals
from app.services.ocr import default_ocr_service, OCRError
from app.services.ai import default_ai_manager, AIExtractionError
from app.services.extraction_cache import default_extraction_cache, default_coalescer
from app.services.quality import evaluate_extraction_quality, ProviderInfo
from app.services.quality.schemas import ExtractionQualityResult
from app.services.validation_aggregation import aggregate_validation_results
from app.services.storage import (
    create_signed_storage_url,
    delete_document_from_storage,
    download_document_from_storage,
    find_document_storage_path,
    upload_document_to_storage,
)


class TempUploadSession(BaseModel):
    document_id: UUID
    user_id: str
    filename: str
    storage_path: str
    content_type: str
    size: int
    content_hash: str
    created_at: datetime


_TEMP_UPLOAD_SESSIONS: dict[UUID, TempUploadSession] = {}


def _register_temp_upload_session(
    document_id: UUID,
    user_id: str,
    filename: str,
    storage_path: str,
    content_type: str,
    size: int,
    content_hash: str,
    created_at: datetime,
) -> None:
    _TEMP_UPLOAD_SESSIONS[document_id] = TempUploadSession(
        document_id=document_id,
        user_id=user_id,
        filename=filename,
        storage_path=storage_path,
        content_type=content_type,
        size=size,
        content_hash=content_hash,
        created_at=created_at,
    )


def _get_temp_upload_session(document_id: UUID, user_id: str) -> TempUploadSession | None:
    session = _TEMP_UPLOAD_SESSIONS.get(document_id)
    if session and session.user_id == user_id:
        return session
    return None


def _remove_temp_upload_session(document_id: UUID) -> None:
    _TEMP_UPLOAD_SESSIONS.pop(document_id, None)


router = APIRouter(prefix="/documents", tags=["documents"])


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List current user's documents for the Document Library",
)
async def list_documents(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    page: Annotated[int, Query(ge=1, description="1-indexed page number.")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Page size limit.")] = 20,
    q: Annotated[str | None, Query(description="Search term for filename or vendor.")] = None,
    status_filter: Annotated[str | None, Query(description="Status filter: processed, review, all.")] = None,
    doc_type: Annotated[str | None, Query(description="Doc type filter: RECEIPT, INVOICE, all.")] = None,
    sort_by: Annotated[str | None, Query(description="Sort order: newest, oldest, amount_desc, amount_asc.")] = "newest",
) -> DocumentListResponse:
    """Return paginated metadata and extraction summaries owned by the authenticated user."""
    db_status = None
    db_needs_review: bool | None = None
    if status_filter == "processed":
        db_needs_review = False
    elif status_filter == "review":
        db_needs_review = True

    kwargs: dict[str, Any] = {
        "user_id": current_user.user_id,
        "page": page,
        "page_size": page_size,
        "settings": settings,
    }
    if db_status:
        kwargs["status_filter"] = db_status
    if db_needs_review is not None:
        kwargs["needs_review"] = db_needs_review
    if doc_type and doc_type != "all":
        kwargs["doc_type"] = doc_type
    if q:
        kwargs["search"] = q
    if sort_by and sort_by != "newest":
        kwargs["sort_by"] = sort_by

    records, total = await list_document_metadata(**kwargs)
    global_total, stats_processed, stats_needs_review = await get_user_document_library_stats(
        user_id=current_user.user_id, settings=settings
    )

    if global_total == 0 and records:
        global_total = total
        for doc in records:
            if doc.status == "completed":
                if (doc.quality_result or {}).get("needs_review") is True:
                    stats_needs_review += 1
                else:
                    stats_processed += 1

    items: list[DocumentListItem] = []

    for doc in records:
        ext_data = doc.extraction_result or {}
        qual_data = doc.quality_result or {}
        has_ext = doc.extraction_result is not None or doc.status == "completed"

        items.append(
            DocumentListItem(
                document_id=doc.id,
                filename=doc.filename,
                storage_path=doc.storage_path,
                content_type=doc.content_type,
                size=doc.size,
                status=doc.status,
                created_at=doc.created_at,
                processed_at=doc.processed_at,
                content_hash=doc.content_hash,
                has_extraction=has_ext,
                vendor_name=ext_data.get("vendor_company"),
                total_amount=ext_data.get("total"),
                document_date=ext_data.get("date"),
                confidence_level=qual_data.get("confidence_level"),
                confidence_score=qual_data.get("overall_confidence"),
                needs_review=qual_data.get("needs_review"),
            )
        )

    stats = DocumentLibraryStats(
        total=global_total,
        processed=stats_processed,
        needs_review=stats_needs_review,
    )

    has_next = (page * page_size) < total
    return DocumentListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        has_next=has_next,
        stats=stats,
    )


async def _build_detail_response(
    record: CreatedDocumentMetadata, settings: Settings
) -> DocumentDetailResponse:
    """Construct DocumentDetailResponse from metadata record and storage url."""
    extraction_model = None
    validation_model = None
    if record.extraction_result:
        try:
            extraction_model = ReceiptInvoiceExtraction.model_validate(record.extraction_result)
            validation_model = validate_extraction_totals(extraction_model)
        except Exception:
            pass

    quality_model = None
    if record.quality_result:
        try:
            quality_model = ExtractionQualityResult.model_validate(record.quality_result)
        except Exception:
            pass

    download_url = await create_signed_storage_url(record.storage_path, settings)

    return DocumentDetailResponse(
        document=_metadata_response(record),
        extraction=extraction_model,
        quality=quality_model,
        validation=validation_model,
        original=OriginalDocumentInfo(
            download_url=download_url,
            content_type=record.content_type,
            filename=record.filename,
        ),
    )


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get detailed metadata, saved extraction, and quality signals for one document",
    responses={404: {"description": "Document not found."}},
)
async def get_document(
    document_id: UUID,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DocumentDetailResponse:
    """Return detailed metadata and saved extraction only if owned by current user."""
    record = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    return await _build_detail_response(record, settings)


@router.get(
    "/{document_id}/preview",
    response_model=DocumentPreviewResponse,
    summary="Get a short-lived signed preview URL for one owned document",
    responses={
        404: {"description": "Document not found."},
        503: {"description": "Document storage is unavailable."},
    },
)
async def preview_document(
    document_id: UUID,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    expires_in: Annotated[int, Query(ge=60, le=86400, description="Expiration in seconds.")] = 3600,
) -> DocumentPreviewResponse:
    """Return a short-lived signed URL for previewing the private original document."""
    metadata = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    if metadata is not None:
        storage_path = metadata.storage_path
        content_type = metadata.content_type
        filename = metadata.filename
    else:
        session = _get_temp_upload_session(document_id, current_user.user_id)
        if session is not None:
            storage_path = session.storage_path
            content_type = session.content_type
            filename = session.filename
        else:
            found_path = await find_document_storage_path(
                user_id=current_user.user_id, document_id=document_id, settings=settings
            )
            if not found_path:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
            storage_path = found_path
            filename = PurePath(found_path).name
            ext = PurePath(found_path).suffix.lower()
            content_type = "application/pdf" if ext == ".pdf" else f"image/{ext.lstrip('.')}"

    preview_url = await create_signed_storage_url(
        storage_path, settings, expires_in=expires_in
    )

    return DocumentPreviewResponse(
        preview_url=preview_url,
        expires_in=expires_in,
        content_type=content_type,
        filename=filename,
    )


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
    if metadata is not None:
        storage_path = metadata.storage_path
        content_type = metadata.content_type
        filename = metadata.filename
    else:
        session = _get_temp_upload_session(document_id, current_user.user_id)
        if session is not None:
            storage_path = session.storage_path
            content_type = session.content_type
            filename = session.filename
        else:
            found_path = await find_document_storage_path(
                user_id=current_user.user_id, document_id=document_id, settings=settings
            )
            if not found_path:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
            storage_path = found_path
            filename = PurePath(found_path).name
            ext = PurePath(found_path).suffix.lower()
            content_type = "application/pdf" if ext == ".pdf" else f"image/{ext.lstrip('.')}"

    content = await download_document_from_storage(storage_path, settings)
    download_name = quote(filename, safe="")
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{download_name}"},
    )


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete one owned document (storage + metadata)",
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
    """Delete an owned document from Supabase Storage and the metadata table."""
    metadata = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )
    if metadata is not None:
        storage_path = metadata.storage_path
    else:
        session = _get_temp_upload_session(document_id, current_user.user_id)
        if session is not None:
            storage_path = session.storage_path
        else:
            found_path = await find_document_storage_path(
                user_id=current_user.user_id, document_id=document_id, settings=settings
            )
            if not found_path:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
            storage_path = found_path

    # Remove the stored file first (ignore if already missing)
    try:
        await delete_document_from_storage(storage_path, settings)
    except HTTPException:
        # Storage deletion failure (e.g. 503 network error) is fatal -> preserves DB row
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to delete document from storage.",
        )

    if metadata is not None:
        await delete_document_metadata(
            document_id=document_id, user_id=current_user.user_id, settings=settings
        )

    _remove_temp_upload_session(document_id)
    return DocumentDeleteResponse()


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
    """Extract JSON from an owned document (persists status only if already saved in library)."""
    metadata = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )

    if metadata is not None:
        storage_path = metadata.storage_path
        filename = metadata.filename
        content_type = metadata.content_type
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
    else:
        session = _get_temp_upload_session(document_id, current_user.user_id)
        if session is not None:
            storage_path = session.storage_path
            filename = session.filename
            content_type = session.content_type
        else:
            found_path = await find_document_storage_path(
                user_id=current_user.user_id, document_id=document_id, settings=settings
            )
            if not found_path:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
            storage_path = found_path
            filename = PurePath(found_path).name
            ext = PurePath(found_path).suffix.lower()
            content_type = "application/pdf" if ext == ".pdf" else f"image/{ext.lstrip('.')}"

    try:
        t_storage0 = time.perf_counter()
        content = await download_document_from_storage(storage_path, settings)
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
                        content, filename=filename
                    )
                )
                return await default_ai_manager.extract_document(
                    content,
                    content_type=content_type,
                    ocr_task=ocr_task,
                )

            t_extract0 = time.perf_counter()
            validated_extraction = await default_coalescer.run_coalesced(
                content_hash, _perform_ai_extraction
            )
            t_extract1 = time.perf_counter()
            active_provider_info = getattr(default_ai_manager, "last_used_provider_info", None)
            if active_provider_info is None:
                try:
                    active_provider_info = ProviderInfo(
                        provider=default_ai_manager.active_provider.provider_name,
                        model=default_ai_manager.active_provider.model_name,
                    )
                except Exception:
                    active_provider_info = ProviderInfo(provider="gemini", model="gemini-3.1-flash-lite")
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
        if metadata is not None:
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
        if metadata is not None:
            await _mark_extraction_failed(metadata.id, current_user.user_id, settings)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document extraction is unavailable.",
        ) from error

    if metadata is not None:
        try:
            await update_document_extraction_and_quality(
                document_id=metadata.id,
                user_id=current_user.user_id,
                extraction=validated_extraction.model_dump(mode="json"),
                quality=quality_res.model_dump(mode="json"),
                settings=settings,
            )
        except HTTPException as error:
            print("[DEBUG EXTRACT EXC]:", repr(error))
            await _mark_extraction_failed(metadata.id, current_user.user_id, settings)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Document extraction is unavailable.",
            ) from error

    return DocumentExtractionResponse(
        document_id=document_id,
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


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Receive and validate a document upload",
    description=(
        "Receives one `multipart/form-data` document, calculates its SHA-256 hash, "
        "and checks for duplicates in the authenticated user's library. Valid documents "
        "are stored in private storage for processing without prematurely creating a database record."
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
    force_duplicate: Annotated[bool, Query(description="If true, bypass duplicate fast-path and allow processing.")] = False,
) -> DocumentUploadResponse:
    """Verify, validate, calculate SHA-256, check duplicates, and store for processing."""
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A document file is required.",
        )

    t_upload0 = time.perf_counter()
    size = await validate_document_upload(file, settings)
    await file.seek(0)
    file_bytes = await file.read()

    t_hash0 = time.perf_counter()
    content_hash = hash_document_content(file_bytes)
    t_hash1 = time.perf_counter()
    print(f"[STRUCTRA PERF] Content Hash: {(t_hash1 - t_hash0)*1000:.1f} ms")

    # Fast-Path Duplicate Pre-Check: Check if authenticated user already owns a saved document with matching content_hash
    if not force_duplicate:
        existing_duplicates = await find_document_metadata_by_content_hash(
            content_hash=content_hash,
            user_id=current_user.user_id,
            settings=settings,
        )
        if existing_duplicates:
            existing_doc = existing_duplicates[0]
            print(f"[STRUCTRA DUPLICATE] Fast-path hit for user {current_user.user_id} | Existing Doc: {existing_doc.id}")
            return DocumentUploadResponse(
                filename=file.filename or existing_doc.filename,
                content_type=file.content_type or existing_doc.content_type,
                size=size,
                storage_path=existing_doc.storage_path,
                document_id=existing_doc.id,
                status=existing_doc.status,
                created_at=existing_doc.created_at,
                message="This document already exists in your Document Library.",
                is_duplicate=True,
                existing_document_id=existing_doc.id,
            )

    await file.seek(0)  # reset before upload to storage

    t_store0 = time.perf_counter()
    document_id = uuid4()
    storage_path = await upload_document_to_storage(
        file, current_user.user_id, settings, document_id=document_id
    )
    t_store1 = time.perf_counter()
    print(f"[STRUCTRA PERF] Storage Upload: {(t_store1 - t_store0)*1000:.1f} ms")

    now_utc = datetime.now(timezone.utc)
    _register_temp_upload_session(
        document_id=document_id,
        user_id=current_user.user_id,
        filename=file.filename or "",
        storage_path=storage_path,
        content_type=file.content_type or "application/octet-stream",
        size=size,
        content_hash=content_hash,
        created_at=now_utc,
    )

    # STRICT PERSISTENCE BOUNDARY: DO NOT INSERT INTO public.documents ON UPLOAD
    print(f"[STRUCTRA PERF] Upload Total: {(time.perf_counter() - t_upload0)*1000:.1f} ms")
    return DocumentUploadResponse(
        filename=file.filename or "",
        content_type=file.content_type or "application/octet-stream",
        size=size,
        storage_path=storage_path,
        document_id=document_id,
        status="pending",
        created_at=now_utc,
        is_duplicate=False,
        existing_document_id=None,
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
    if metadata is not None:
        content_hash = metadata.content_hash or ""
    else:
        session = _get_temp_upload_session(document_id, current_user.user_id)
        content_hash = session.content_hash if session else ""

    t_val_total0 = time.perf_counter()
    # M5.1 and M5.2
    t_math0 = time.perf_counter()
    quality_signals = derive_extraction_quality_signals(extraction)
    t_math1 = time.perf_counter()
    print(f"[STRUCTRA PERF] Math validation: {(t_math1 - t_math0)*1000:.1f} ms")

    # M5.3 Duplicate Detection
    t_dup0 = time.perf_counter()
    user_docs, _ = await list_document_metadata(user_id=current_user.user_id, settings=settings)
    existing_documents = []
    for doc in user_docs:
        if doc.id != document_id:
            candidate_ext = None
            if doc.extraction_result:
                try:
                    candidate_ext = ReceiptInvoiceExtraction.model_validate(doc.extraction_result)
                except Exception:
                    pass
            existing_documents.append(
                DuplicateDocumentCandidate(
                    document_id=doc.id,
                    user_id=doc.user_id,
                    content_hash=doc.content_hash,
                    extraction=candidate_ext,
                )
            )

    duplicate_result = detect_duplicate(
        user_id=current_user.user_id,
        content_hash=content_hash,
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


@router.post(
    "/{document_id}/save",
    response_model=DocumentDetailResponse,
    summary="Save a processed document to the user's Document Library",
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        404: {"description": "Document not found."},
        503: {"description": "Metadata service is unavailable."},
    },
)
async def save_document(
    document_id: UUID,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    force_save_duplicate: Annotated[bool, Query(description="If true, allow saving a duplicate copy to library.")] = False,
) -> DocumentDetailResponse:
    """Explicitly save a processed document to the authenticated user's persistent Document Library."""
    # 1. Check if document already exists in DB
    doc = await get_document_metadata(
        document_id=document_id, user_id=current_user.user_id, settings=settings
    )

    if doc is not None:
        if doc.status == "completed":
            # Idempotent response for already-completed document
            return await _build_detail_response(doc, settings)

        # If document exists in DB but is not completed, commit it to completed
        storage_path = doc.storage_path
        filename = doc.filename
        content_type = doc.content_type
        size = doc.size
        content_hash_to_commit = doc.content_hash
        if not force_save_duplicate and not content_hash_to_commit:
            try:
                file_bytes = await download_document_from_storage(storage_path, settings)
                content_hash_to_commit = hash_document_content(file_bytes)
            except Exception:
                pass

        await update_document_status(
            document_id=document_id,
            user_id=current_user.user_id,
            document_status="completed",
            settings=settings,
        )
        doc.status = "completed"
        doc.processed_at = datetime.now(timezone.utc)
        if not force_save_duplicate and content_hash_to_commit:
            doc.content_hash = content_hash_to_commit

        return await _build_detail_response(doc, settings)

    # 2. Unsaved document: Locate storage path from session or Supabase Storage
    session = _get_temp_upload_session(document_id, current_user.user_id)
    if session is not None:
        storage_path = session.storage_path
        filename = session.filename
        content_type = session.content_type
        size = session.size
        content_hash = session.content_hash
        file_bytes = None
    else:
        found_path = await find_document_storage_path(
            user_id=current_user.user_id, document_id=document_id, settings=settings
        )
        if not found_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        storage_path = found_path
        filename = PurePath(found_path).name
        ext = PurePath(found_path).suffix.lower()
        content_type = "application/pdf" if ext == ".pdf" else f"image/{ext.lstrip('.')}"
        file_bytes = await download_document_from_storage(storage_path, settings)
        size = len(file_bytes)
        content_hash = hash_document_content(file_bytes)

    # Check duplicate constraint against existing library rows (unless force_save_duplicate)
    if not force_save_duplicate:
        existing_duplicates = await find_document_metadata_by_content_hash(
            content_hash=content_hash,
            user_id=current_user.user_id,
            settings=settings,
        )
        if existing_duplicates:
            # Concurrency / Idempotency protection: return existing saved document
            return await _build_detail_response(existing_duplicates[0], settings)

    # Retrieve cached extraction & quality results
    cached_extraction = await default_extraction_cache.get(content_hash, settings=settings)
    if cached_extraction is not None:
        extraction_model = ReceiptInvoiceExtraction.model_validate(
            cached_extraction.model_dump(mode="json")
        )
    else:
        if file_bytes is None:
            file_bytes = await download_document_from_storage(storage_path, settings)
        ocr_task = asyncio.create_task(
            default_ocr_service.extract_text_from_bytes_async(file_bytes, filename=filename)
        )
        extraction_model = await default_ai_manager.extract_document(
            file_bytes, content_type=content_type, ocr_task=ocr_task
        )
        await default_extraction_cache.set(content_hash, extraction_model, settings=settings)

    active_provider_info = getattr(default_ai_manager, "last_used_provider_info", None)
    quality_model = evaluate_extraction_quality(
        extraction_model, ocr_result=None, provider_info=active_provider_info
    )

    # SINGLE PERSISTENCE BOUNDARY: Create the persistent record in public.documents
    try:
        created_record = await create_document_metadata(
            document_id=document_id,
            user_id=current_user.user_id,
            filename=filename,
            storage_path=storage_path,
            content_type=content_type,
            size=size,
            content_hash=content_hash if not force_save_duplicate else None,
            status="completed",
            processed_at=datetime.now(timezone.utc),
            extraction_result=extraction_model.model_dump(mode="json"),
            quality_result=quality_model.model_dump(mode="json"),
            settings=settings,
        )
    except HTTPException:
        # Atomic Concurrency Safety: Check if concurrent request created document
        existing_duplicates = await find_document_metadata_by_content_hash(
            content_hash=content_hash,
            user_id=current_user.user_id,
            settings=settings,
        )
        if existing_duplicates:
            return await _build_detail_response(existing_duplicates[0], settings)
        raise

    _remove_temp_upload_session(document_id)
    return await _build_detail_response(created_record, settings)


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

