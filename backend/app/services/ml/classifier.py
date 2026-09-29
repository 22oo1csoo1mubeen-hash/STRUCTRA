"""STRUCTRA Production ML Classifier Service.

Provides runtime inference for uploaded documents, extracting expense categories
and confidence scores using the locally trained ML champion model.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib

# Paths
_SERVICE_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _SERVICE_DIR.parents[2]
_MODEL_PATH = _BACKEND_DIR / "ml" / "models" / "expense_classifier.joblib"

_CACHED_PIPELINE: Any = None
_CACHED_MTIME: float = 0.0


def get_ml_classifier_pipeline(force_reload: bool = False):
    """Retrieve or lazy-load the serialized ML champion pipeline with auto-reload on file change."""
    global _CACHED_PIPELINE, _CACHED_MTIME
    if not _MODEL_PATH.exists():
        return None

    try:
        current_mtime = _MODEL_PATH.stat().st_mtime
        if force_reload or _CACHED_PIPELINE is None or current_mtime > _CACHED_MTIME:
            _CACHED_PIPELINE = joblib.load(_MODEL_PATH)
            _CACHED_MTIME = current_mtime
    except Exception as err:
        print(f"[STRUCTRA ML WARN] Failed to load ML model from {_MODEL_PATH}: {err}")
        return None

    return _CACHED_PIPELINE


def classify_document_expense(
    vendor_name: Optional[str] = None,
    line_items: Optional[List[Any]] = None,
    total_amount: Optional[float] = None,
    raw_text: Optional[str] = None,
    filename: Optional[str] = None,
) -> Dict[str, Any]:
    """Predict accounting expense category from document extraction fields."""
    pipeline = get_ml_classifier_pipeline()

    # Build contextual text from extracted fields
    parts = []
    if vendor_name:
        parts.append(f"VENDOR: {vendor_name}")

    if line_items:
        item_descs = []
        for it in line_items:
            if isinstance(it, dict):
                desc = it.get("description") or it.get("item")
                if desc:
                    item_descs.append(str(desc))
            elif hasattr(it, "description") and getattr(it, "description"):
                item_descs.append(str(getattr(it, "description")))
        if item_descs:
            parts.append("ITEMS: " + " ; ".join(item_descs))

    if total_amount is not None:
        parts.append(f"TOTAL: ${total_amount:.2f}")

    if filename and not vendor_name and not line_items:
        parts.append(f"FILE: {filename}")

    if raw_text and not parts:
        parts.append(raw_text[:300])

    combined_text = " | ".join(parts).strip()
    if not combined_text:
        return {
            "ml_category": "General Expense",
            "ml_confidence": 0.0,
            "ml_model_active": pipeline is not None,
        }

    if pipeline is None:
        return {
            "ml_category": "Unclassified",
            "ml_confidence": 0.0,
            "ml_model_active": False,
        }

    try:
        raw_pred = pipeline.predict([combined_text])[0]
        prediction = str(raw_pred)
        confidence = 1.0
        if hasattr(pipeline, "predict_proba"):
            probs = pipeline.predict_proba([combined_text])[0]
            confidence = round(float(max(probs)), 4)

        # Domain Guard: Ensure obvious dining/food items are never misclassified under non-food categories
        lower_comb = combined_text.lower()
        supermarket_indicators = [
            "supermart", "supermarts", "supermarket", "hypermarket", "mart", "dmart",
            "d-mart", "d mart", "avenue supermarts", "grocery", "groceries", "kirana",
            "provisions", "walmart", "costco", "target", "reliance smart", "reliance fresh",
            "big bazaar", "more retail", "spencers", "blinkit", "zepto", "instamart", "bigbasket"
        ]
        if any(sm in lower_comb for sm in supermarket_indicators):
            if prediction in ("Meals & Dining", "Healthcare & Medical", "Office Supplies & Hardware"):
                prediction = "Retail & Groceries"
                confidence = max(confidence, 0.95)

        food_indicators = [
            "sweet", "sweets", "mithai", "dhaba", "restaurant", "bhojanalaya",
            "cafe", "bistro", "bakery", "kitchen", "eatery", "dining", "barbeque",
            "dal makhani", "roti", "naan", "paneer", "biryani", "thali", "dosa",
            "samosa", "chole", "bhature", "curry", "pizza", "burger", "sandwich",
            "coffee", "tea", "chai", "lassi", "om sweets"
        ]
        if any(ind in lower_comb for ind in food_indicators) and not any(sm in lower_comb for sm in supermarket_indicators):
            if prediction in ("Healthcare & Medical", "Technology & Cloud Services", "Utilities & Telecom"):
                prediction = "Meals & Dining"
                confidence = max(confidence, 0.95)

        return {
            "ml_category": prediction,
            "ml_confidence": confidence,
            "ml_model_active": True,
            "feature_text": combined_text,
        }
    except Exception as err:
        print(f"[STRUCTRA ML ERROR] Prediction error: {err}")
        return {
            "ml_category": "General Expense",
            "ml_confidence": 0.0,
            "ml_model_active": False,
            "error": str(err),
        }

