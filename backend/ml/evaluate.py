"""Independent Model Evaluation & Interpretability Diagnostic Script for STRUCTRA ML.

Loads the champion serialized pipeline, runs on the test split, and produces:
  1. Detailed Metrics Table (Precision, Recall, F1, Support)
  2. Formatted Confusion Matrix
  3. Feature Interpretability: Top predictive terms/keywords per category
"""

import csv
import json
from pathlib import Path
import sys
from typing import List, Tuple

import joblib
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

ML_DIR = Path(__file__).resolve().parent
DATA_FILE = ML_DIR / "data" / "receipt_expenses_10k.csv"
MODEL_FILE = ML_DIR / "models" / "expense_classifier.joblib"
METADATA_FILE = ML_DIR / "models" / "model_metadata.json"


def load_test_split(csv_path: Path) -> Tuple[List[str], List[str]]:
    """Reproduce the deterministic 20% test split."""
    texts: List[str] = []
    labels: List[str] = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            txt = row.get("text", "").strip()
            cat = row.get("category", "").strip()
            if txt and cat:
                texts.append(txt)
                labels.append(cat)

    _, X_test, _, y_test = train_test_split(
        texts, labels, test_size=0.20, random_state=42, stratify=labels
    )
    return X_test, y_test


def display_confusion_matrix(y_true: List[str], y_pred: List[str], classes: List[str]):
    """Print an ASCII confusion matrix."""
    cm = confusion_matrix(y_true, y_pred, labels=classes)
    print("\n" + "=" * 80)
    print("CONFUSION MATRIX (Rows: Actual Ground Truth | Cols: Model Prediction)")
    print("=" * 80)

    # Shorten class names for clean matrix header
    short_labels = [c[:10] for c in classes]
    header = f"{'Actual Category':<28} | " + " | ".join(f"{sl:>10}" for sl in short_labels)
    print(header)
    print("-" * len(header))

    for i, actual_class in enumerate(classes):
        row_str = f"{actual_class:<28} | "
        row_vals = " | ".join(f"{cm[i, j]:>10}" for j in range(len(classes)))
        print(row_str + row_vals)

    print("=" * 80 + "\n")


def display_top_features(pipeline, classes: List[str], top_n: int = 8):
    """Extract and display top predictive n-grams per category."""
    print("=" * 80)
    print("MODEL INTERPRETABILITY: TOP PREDICTIVE KEYWORDS PER CATEGORY")
    print("=" * 80)

    try:
        vectorizer = pipeline.named_steps.get("tfidf")
        classifier = pipeline.named_steps.get("clf")

        # Unwrap CalibratedClassifierCV if present
        base_clf = classifier
        if hasattr(classifier, "calibrated_classifiers_") and classifier.calibrated_classifiers_:
            base_clf = classifier.calibrated_classifiers_[0].estimator

        if hasattr(base_clf, "coef_") and vectorizer is not None:
            feature_names = np.array(vectorizer.get_feature_names_out())
            coefs = base_clf.coef_

            for i, cat in enumerate(classes):
                if i < len(coefs):
                    top_indices = np.argsort(coefs[i])[-top_n:][::-1]
                    top_terms = feature_names[top_indices]
                    print(f"  • {cat:<28}: {', '.join(top_terms)}")
        elif hasattr(base_clf, "feature_log_prob_") and vectorizer is not None:
            feature_names = np.array(vectorizer.get_feature_names_out())
            log_probs = base_clf.feature_log_prob_

            for i, cat in enumerate(classes):
                if i < len(log_probs):
                    top_indices = np.argsort(log_probs[i])[-top_n:][::-1]
                    top_terms = feature_names[top_indices]
                    print(f"  • {cat:<28}: {', '.join(top_terms)}")
        else:
            print("  (Feature weights extraction available for linear model architectures)")
    except Exception as err:
        print(f"  Note: Feature interpretability note: {err}")
    print("=" * 80 + "\n")


def run_evaluation():
    """Execute complete evaluation workflow."""
    if not MODEL_FILE.exists():
        print(f"[ERROR] Trained model not found at {MODEL_FILE}. Run 'python ml/train.py' first.")
        sys.exit(1)

    print("=" * 80)
    print("STRUCTRA EXPENSE CLASSIFICATION MODEL EVALUATION")
    print(f"Model File: {MODEL_FILE.name}")
    print("=" * 80)

    # 1. Load pipeline and metadata
    pipeline = joblib.load(MODEL_FILE)
    classes = list(pipeline.classes_)

    # 2. Load held-out test split
    X_test, y_test = load_test_split(DATA_FILE)
    print(f"[DATA] Held-Out Test Set: {len(X_test)} samples across {len(classes)} classes")

    # 3. Model Predictions
    y_pred = pipeline.predict(X_test)

    # 4. Classification Report
    print("\n" + "-" * 80)
    print("CLASSIFICATION REPORT (HELD-OUT TEST SPLIT)")
    print("-" * 80)
    print(classification_report(y_test, y_pred, digits=4))

    # 5. Confusion Matrix
    display_confusion_matrix(y_test, y_pred, classes)

    # 6. Feature Interpretability
    display_top_features(pipeline, classes, top_n=7)


if __name__ == "__main__":
    run_evaluation()
