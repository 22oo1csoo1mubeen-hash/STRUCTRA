"""Local OCR service abstraction using local RapidOCR (PaddleOCR ONNX runtime)."""

import asyncio
from io import BytesIO
import os
from pathlib import Path
import time
from typing import Any, List, Union, Optional
from PIL import Image, UnidentifiedImageError

from app.services.ocr.schemas import BoundingBox, OCRLine, OCRResult

_GLOBAL_RAPID_OCR_ENGINE: Any = None


class OCRError(Exception):
    """Base exception for all local OCR service errors."""


class OCRImageInvalidError(OCRError):
    """Raised when an input image is corrupted, empty, or unsupported."""


class OCREngineError(OCRError):
    """Raised when the underlying local OCR engine fails during processing."""


def _get_shared_ocr_engine() -> Any:
    """Return process-level singleton RapidOCR engine instance."""
    global _GLOBAL_RAPID_OCR_ENGINE
    if _GLOBAL_RAPID_OCR_ENGINE is None:
        try:
            from rapidocr_onnxruntime import RapidOCR

            _GLOBAL_RAPID_OCR_ENGINE = RapidOCR()
        except Exception as err:
            raise OCREngineError(f"Failed to initialize local RapidOCR engine: {err}") from err
    return _GLOBAL_RAPID_OCR_ENGINE


class OCRService:
    """Reusable local OCR service isolating RapidOCR engine execution."""

    def __init__(self, *, engine: Any | None = None) -> None:
        """Initialize OCRService."""
        self._custom_engine = engine

    def _get_engine(self) -> Any:
        """Get active RapidOCR engine instance (custom or process singleton)."""
        if self._custom_engine is not None:
            return self._custom_engine
        return _get_shared_ocr_engine()

    def extract_text_from_bytes(
        self, image_bytes: bytes, filename: str | None = None
    ) -> OCRResult:
        """Execute local OCR synchronously on raw image bytes."""
        if not image_bytes:
            raise OCRImageInvalidError("Received empty image byte content.")

        # Quick validation of image bytes
        try:
            with Image.open(BytesIO(image_bytes)) as img:
                img.verify()
        except (UnidentifiedImageError, OSError, SyntaxError) as err:
            target = f" '{filename}'" if filename else ""
            raise OCRImageInvalidError(f"Invalid or corrupted image format{target}: {err}") from err

        start_time = time.perf_counter()
        try:
            engine = self._get_engine()
            ocr_out, _ = engine(image_bytes)
        except OCRImageInvalidError:
            raise
        except Exception as err:
            raise OCREngineError(f"Local OCR processing error: {err}") from err

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return self._parse_engine_output(ocr_out, elapsed_ms, filename=filename)

    async def extract_text_from_bytes_async(
        self, image_bytes: bytes, filename: str | None = None
    ) -> OCRResult:
        """Execute local OCR asynchronously without blocking the event loop."""
        return await asyncio.to_thread(self.extract_text_from_bytes, image_bytes, filename)

    def extract_text_from_file(self, file_path: Union[str, Path]) -> OCRResult:
        """Execute local OCR on an image file path."""
        path = Path(file_path)
        if not path.is_file():
            raise OCRImageInvalidError(f"Image file does not exist: {file_path}")

        try:
            image_bytes = path.read_bytes()
        except Exception as err:
            raise OCRImageInvalidError(f"Failed to read image file '{file_path}': {err}") from err

        return self.extract_text_from_bytes(image_bytes, filename=path.name)

    def _parse_engine_output(
        self, ocr_out: Any, elapsed_ms: float, filename: str | None = None
    ) -> OCRResult:
        """Parse raw RapidOCR engine return value into structured OCRResult with horizontal line clustering."""
        lines: List[OCRLine] = []

        if ocr_out:
            for item in ocr_out:
                if not isinstance(item, (list, tuple)) or len(item) < 3:
                    continue

                raw_pts, text_str, raw_conf = item[0], item[1], item[2]

                if not text_str or not isinstance(text_str, str):
                    continue

                try:
                    conf = max(0.0, min(1.0, float(raw_conf)))
                except (ValueError, TypeError):
                    conf = 0.0

                pts_list: List[List[float]] = []
                if isinstance(raw_pts, (list, tuple)):
                    for pt in raw_pts:
                        if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                            pts_list.append([float(pt[0]), float(pt[1])])

                if len(pts_list) != 4:
                    continue

                bbox = BoundingBox(points=pts_list)
                lines.append(
                    OCRLine(
                        text=text_str.strip(),
                        confidence=round(conf, 4),
                        bounding_box=bbox,
                    )
                )

        # Cluster recognized text lines into physical horizontal rows using Y-center alignment
        if lines:
            line_clusters: List[List[OCRLine]] = []
            for line in sorted(lines, key=lambda l: (l.bounding_box.min_y + l.bounding_box.max_y) / 2.0):
                cy = (line.bounding_box.min_y + line.bounding_box.max_y) / 2.0
                h = line.bounding_box.height
                matched_cluster = None
                for cluster in line_clusters:
                    cluster_cy = sum((l.bounding_box.min_y + l.bounding_box.max_y) / 2.0 for l in cluster) / len(cluster)
                    cluster_h = sum(l.bounding_box.height for l in cluster) / len(cluster)
                    if abs(cy - cluster_cy) < max(cluster_h, h) * 0.45:
                        matched_cluster = cluster
                        break
                if matched_cluster is not None:
                    matched_cluster.append(line)
                else:
                    line_clusters.append([line])

            # Sort items left-to-right within each horizontal row
            row_texts: List[str] = []
            for cluster in line_clusters:
                cluster.sort(key=lambda l: l.bounding_box.min_x)
                row_texts.append("  ".join(l.text for l in cluster if l.text))

            full_text = "\n".join(t for t in row_texts if t)
        else:
            full_text = ""

        # Debug logging for development inspection
        if os.getenv("STRUCTRA_DEBUG_OCR", "").lower() in ("true", "1", "yes"):
            print("=" * 80)
            print(f"[STRUCTRA OCR DEBUG] File: {filename or 'bytes'} | Latency: {elapsed_ms:.1f} ms | Lines: {len(lines)}")
            print("-" * 80)
            print(full_text)
            print("=" * 80)

        return OCRResult(
            full_text=full_text,
            lines=lines,
            processing_time_ms=round(elapsed_ms, 2),
        )


# Global default service singleton for easy reuse across modules
default_ocr_service = OCRService()
