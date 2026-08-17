"""Dashboard, Analytics, and Quality & Review Intelligence API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.schemas.auth import CurrentUser
from app.schemas.dashboard import (
    DashboardQualityResponse,
    DashboardResponse,
    ItemAnalyticsResponse,
    PurchaseHighlightsResponse,
    RecentDocumentsResponse,
    ReviewQueueResponse,
    SpendingAnalyticsResponse,
    SpendingPeriod,
    VendorAnalyticsResponse,
)
from app.services.dashboard import (
    get_user_dashboard_data,
    get_user_highlights,
    get_user_item_analytics,
    get_user_quality_summary,
    get_user_recent_documents,
    get_user_review_queue,
    get_user_spending_analytics,
    get_user_vendor_analytics,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "",
    response_model=DashboardResponse,
    summary="Get user dashboard summary metrics, highlights, and quality intelligence",
    description=(
        "Returns aggregated lifetime document summary, top vendors, line item highlights, "
        "and confidence distribution exclusively derived from the authenticated user's "
        "persisted Document Library."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        503: {"description": "Database or metadata service is unavailable."},
    },
)
async def get_dashboard(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DashboardResponse:
    """Retrieve aggregated dashboard metrics scoped strictly to current authenticated user."""
    return await get_user_dashboard_data(
        user_id=current_user.user_id,
        settings=settings,
    )


@router.get(
    "/spending",
    response_model=SpendingAnalyticsResponse,
    summary="Get spending-over-time time series analytics",
    description=(
        "Returns chronologically sorted spending intervals aggregated by day, week, month, or year "
        "derived exclusively from the authenticated user's persisted documents."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        503: {"description": "Database or metadata service is unavailable."},
    },
)
async def get_spending_analytics(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    period: Annotated[SpendingPeriod, Query(description="Aggregation period: day, week, month, or year.")] = "month",
) -> SpendingAnalyticsResponse:
    """Retrieve spending-over-time series scoped strictly to current authenticated user."""
    return await get_user_spending_analytics(
        user_id=current_user.user_id,
        period=period,
        settings=settings,
    )


@router.get(
    "/vendors",
    response_model=VendorAnalyticsResponse,
    summary="Get spending-by-vendor analytics",
    description=(
        "Returns ranked vendors with total spending, document counts, and percentage of overall spend "
        "derived exclusively from the authenticated user's persisted documents."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        503: {"description": "Database or metadata service is unavailable."},
    },
)
async def get_vendor_analytics(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of vendors to return.")] = 10,
) -> VendorAnalyticsResponse:
    """Retrieve ranked vendor spending breakdown scoped strictly to current authenticated user."""
    return await get_user_vendor_analytics(
        user_id=current_user.user_id,
        limit=limit,
        settings=settings,
    )


@router.get(
    "/items",
    response_model=ItemAnalyticsResponse,
    summary="Get most purchased items analytics",
    description=(
        "Returns ranked purchased line items with total quantities, document counts, and item spending "
        "derived exclusively from the authenticated user's persisted documents."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        503: {"description": "Database or metadata service is unavailable."},
    },
)
async def get_item_analytics(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of items to return.")] = 10,
) -> ItemAnalyticsResponse:
    """Retrieve ranked purchased line items breakdown scoped strictly to current authenticated user."""
    return await get_user_item_analytics(
        user_id=current_user.user_id,
        limit=limit,
        settings=settings,
    )


@router.get(
    "/highlights",
    response_model=PurchaseHighlightsResponse,
    summary="Get purchase highlights",
    description=(
        "Returns the user's most expensive individual line item and most expensive receipt "
        "derived exclusively from the authenticated user's persisted documents."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        503: {"description": "Database or metadata service is unavailable."},
    },
)
async def get_highlights(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> PurchaseHighlightsResponse:
    """Retrieve purchase highlights scoped strictly to current authenticated user."""
    return await get_user_highlights(
        user_id=current_user.user_id,
        settings=settings,
    )


@router.get(
    "/quality",
    response_model=DashboardQualityResponse,
    summary="Get library quality summary and confidence distribution",
    description=(
        "Returns aggregated library confidence levels, review counts, average score, and distribution "
        "derived exclusively from the authenticated user's persisted documents."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        503: {"description": "Database or metadata service is unavailable."},
    },
)
async def get_quality(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DashboardQualityResponse:
    """Retrieve library quality intelligence scoped strictly to current authenticated user."""
    return await get_user_quality_summary(
        user_id=current_user.user_id,
        settings=settings,
    )


@router.get(
    "/review-queue",
    response_model=ReviewQueueResponse,
    summary="Get review queue for documents requiring attention",
    description=(
        "Returns ranked list of documents with LOW confidence or needs_review=true "
        "derived exclusively from the authenticated user's persisted documents."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        503: {"description": "Database or metadata service is unavailable."},
    },
)
async def get_review_queue(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of review items to return.")] = 10,
) -> ReviewQueueResponse:
    """Retrieve review queue scoped strictly to current authenticated user."""
    return await get_user_review_queue(
        user_id=current_user.user_id,
        limit=limit,
        settings=settings,
    )


@router.get(
    "/recent-documents",
    response_model=RecentDocumentsResponse,
    summary="Get recently saved documents",
    description=(
        "Returns the most recently saved library documents sorted newest first "
        "derived exclusively from the authenticated user's persisted documents."
    ),
    responses={
        401: {"description": "Missing, malformed, expired, or invalid bearer token."},
        503: {"description": "Database or metadata service is unavailable."},
    },
)
async def get_recent_documents(
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of recent documents to return.")] = 10,
) -> RecentDocumentsResponse:
    """Retrieve recent documents scoped strictly to current authenticated user."""
    return await get_user_recent_documents(
        user_id=current_user.user_id,
        limit=limit,
        settings=settings,
    )
