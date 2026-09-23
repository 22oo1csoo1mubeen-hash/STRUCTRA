"""Machine Learning Inference Service for STRUCTRA ML Categorizer."""

from pathlib import Path
from typing import Any, List
import joblib
from pydantic import BaseModel

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml_models" / "expense_classifier.joblib"


class ProbabilityScore(BaseModel):
    """Category name alongside its probability score."""
    category: str
    probability: float


class MLCategorizationResponse(BaseModel):
    """ML Categorization prediction response."""
    predicted_category: str
    confidence_score: float
    top_probabilities: List[ProbabilityScore]
    all_categories_count: int


class MLModelInfoResponse(BaseModel):
    """Metadata describing the active ML model."""
    status: str
    model_type: str
    feature_extractor: str
    total_training_samples: int
    categories_count: int
    categories: List[str]


class ExpenseMLClassifierService:
    """Service encapsulating ML model loading, predictions, and metadata."""

    def __init__(self) -> None:
        self._model: Any = None
        self.load_model()

    def load_model(self) -> None:
        """Load trained joblib ML model from disk."""
        if MODEL_PATH.exists():
            try:
                self._model = joblib.load(MODEL_PATH)
                print(f"[STRUCTRA ML] Successfully loaded model from {MODEL_PATH}")
            except Exception as err:
                print(f"[STRUCTRA ERROR] Failed to load ML model: {err}")
                self._model = None
        else:
            print(f"[STRUCTRA ML WARNING] Model file not found at {MODEL_PATH}")

    @property
    def is_ready(self) -> bool:
        """Return True if model is loaded and ready for inference."""
        return self._model is not None

    def get_info(self) -> MLModelInfoResponse:
        """Return metadata for the ML model."""
        if not self.is_ready:
            return MLModelInfoResponse(
                status="not_loaded",
                model_type="Multinomial Naive Bayes",
                feature_extractor="TF-IDF (Unigrams + Bigrams)",
                total_training_samples=10000,
                categories_count=0,
                categories=[],
            )

        classes = list(getattr(self._model, "classes_", []))
        return MLModelInfoResponse(
            status="ready",
            model_type="Multinomial Naive Bayes",
            feature_extractor="TF-IDF Vectorizer (ngram_range 1-2)",
            total_training_samples=10000,
            categories_count=len(classes),
            categories=sorted(classes),
        )

    def predict(self, vendor_name: str, items_text: str = "") -> MLCategorizationResponse:
        """Classify input vendor and item text into expense category with probability distribution."""
        if not self.is_ready:
            return MLCategorizationResponse(
                predicted_category="Uncategorized",
                confidence_score=0.0,
                top_probabilities=[],
                all_categories_count=0,
            )

        combined_text = f"{vendor_name or ''} {items_text or ''}".strip()
        if not combined_text:
            return MLCategorizationResponse(
                predicted_category="Uncategorized",
                confidence_score=0.0,
                top_probabilities=[],
                all_categories_count=len(self._model.classes_),
            )

        classes = self._model.classes_
        probabilities = self._model.predict_proba([combined_text])[0]

        # Sort probability scores descending
        paired = sorted(
            zip(classes, probabilities),
            key=lambda x: float(x[1]),
            reverse=True,
        )

        best_category, best_score = paired[0]
        top_scores = [
            ProbabilityScore(category=str(cat), probability=round(float(prob), 4))
            for cat, prob in paired[:5]
        ]

        return MLCategorizationResponse(
            predicted_category=str(best_category),
            confidence_score=round(float(best_score), 4),
            top_probabilities=top_scores,
            all_categories_count=len(classes),
        )


# Process-level singleton instance
ml_service = ExpenseMLClassifierService()
