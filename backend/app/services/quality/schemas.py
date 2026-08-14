"""Pydantic schemas for STRUCTRA Extraction Quality, Confidence & Review Signals."""

from typing import Literal
from pydantic import BaseModel, Field


class QualitySignal(BaseModel):
    """Structured quality signal describing an extraction observation."""

    code: str
    severity: Literal["positive", "warning", "critical"]
    message: str


class FieldConfidenceDetail(BaseModel):
    """Field-level confidence breakdown and supporting signals."""

    confidence: float = Field(ge=0.0, le=1.0)
    confidence_level: Literal["HIGH", "MEDIUM", "LOW"]
    signals: list[QualitySignal] = Field(default_factory=list)


class ProviderInfo(BaseModel):
    """Metadata identifying the AI provider and model that generated the extraction."""

    provider: str
    model: str


class ExtractionQualityResult(BaseModel):
    """Comprehensive, deterministic quality & review evaluation result for an extraction."""

    overall_confidence: float = Field(ge=0.0, le=1.0)
    confidence_level: Literal["HIGH", "MEDIUM", "LOW"]
    needs_review: bool
    signals: list[QualitySignal] = Field(default_factory=list)
    field_confidence: dict[str, FieldConfidenceDetail] = Field(default_factory=dict)
    provider_info: ProviderInfo | None = None
