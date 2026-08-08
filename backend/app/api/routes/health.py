"""Health-check endpoint."""

from typing import Literal

from fastapi import APIRouter
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
