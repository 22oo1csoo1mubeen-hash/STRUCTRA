"""Health-check endpoint."""

from typing import Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Response returned when the application is available."""

    status: Literal["healthy"]
    service: Literal["Structra Backend"]


@router.get("/health", response_model=HealthResponse, summary="Check service health")
async def health_check() -> HealthResponse:
    """Return the service availability status."""
    return HealthResponse(status="healthy", service="Structra Backend")


@router.head("/health", include_in_schema=False)
async def health_check_head() -> Response:
    """Support HEAD probes used by free uptime monitors."""
    return Response(status_code=200)
