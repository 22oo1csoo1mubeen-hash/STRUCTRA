"""Local OCR service package for STRUCTRA backend."""

from app.services.ocr.schemas import BoundingBox, OCRLine, OCRResult
from app.services.ocr.service import (
    OCRError,
    OCREngineError,
    OCRImageInvalidError,
    OCRService,
    default_ocr_service,
)

__all__ = [
    "BoundingBox",
    "OCRLine",
    "OCRResult",
    "OCRError",
    "OCREngineError",
    "OCRImageInvalidError",
    "OCRService",
    "default_ocr_service",
]
