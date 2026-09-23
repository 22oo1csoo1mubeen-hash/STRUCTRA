"""FastAPI router endpoints for Machine Learning Expense Categorization."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.ml_service import (
    MLCategorizationResponse,
    MLModelInfoResponse,
    ml_service,
)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


class CategorizeRequest(BaseModel):
    """Request payload for ML document text categorization."""

    vendor_name: str = Field(..., description="Vendor name or merchant text.")
    items_text: str | None = Field(default="", description="Optional line item text or description.")


@router.post("/categorize", response_model=MLCategorizationResponse)
async def categorize_expense(payload: CategorizeRequest) -> MLCategorizationResponse:
    """Classify vendor and item text into an expense category using trained ML model."""
    return ml_service.predict(payload.vendor_name, payload.items_text or "")


@router.get("/info", response_model=MLModelInfoResponse)
async def get_ml_info() -> MLModelInfoResponse:
    """Return model status, training statistics, and category taxonomy."""
    return ml_service.get_info()
