"""Pydantic schemas and models for local OCR result structures."""

from typing import List
from pydantic import BaseModel, Field, computed_field


class BoundingBox(BaseModel):
    """Four-point polygon representation of an OCR text bounding box.

    Points are specified as [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    representing the box corners (top-left, top-right, bottom-right, bottom-left).
    """

    points: List[List[float]] = Field(
        ...,
        description="List of 4 [x, y] coordinate pairs defining the polygon bounding box.",
        min_length=4,
        max_length=4,
    )

    @computed_field
    @property
    def min_x(self) -> float:
        """Minimum X coordinate (leftmost point)."""
        return min(p[0] for p in self.points)

    @computed_field
    @property
    def min_y(self) -> float:
        """Minimum Y coordinate (topmost point)."""
        return min(p[1] for p in self.points)

    @computed_field
    @property
    def max_x(self) -> float:
        """Maximum X coordinate (rightmost point)."""
        return max(p[0] for p in self.points)

    @computed_field
    @property
    def max_y(self) -> float:
        """Maximum Y coordinate (bottommost point)."""
        return max(p[1] for p in self.points)

    @computed_field
    @property
    def width(self) -> float:
        """Bounding box width."""
        return max(0.0, self.max_x - self.min_x)

    @computed_field
    @property
    def height(self) -> float:
        """Bounding box height."""
        return max(0.0, self.max_y - self.min_y)


class OCRLine(BaseModel):
    """Single recognized text line with confidence and bounding box."""

    text: str = Field(..., description="Recognized text string for this line.")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="OCR recognition confidence score between 0.0 and 1.0."
    )
    bounding_box: BoundingBox = Field(
        ..., description="Polygon bounding box coordinates for this text line."
    )


class OCRResult(BaseModel):
    """Complete structured output of a local OCR operation."""

    full_text: str = Field(
        ..., description="Concatenated text of all lines preserving reading order."
    )
    lines: List[OCRLine] = Field(
        default_factory=list, description="Ordered list of recognized text lines."
    )
    processing_time_ms: float = Field(
        0.0, description="Processing duration in milliseconds."
    )

    @computed_field
    @property
    def line_count(self) -> int:
        """Total number of recognized text lines."""
        return len(self.lines)
