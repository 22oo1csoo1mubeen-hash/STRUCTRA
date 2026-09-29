"""Training and Model Benchmarking Pipeline for STRUCTRA Document & Expense Categorizer.

Benchmarks 4 candidate Machine Learning algorithms using 5-Fold Stratified Cross-Validation:
  1. Multinomial Naive Bayes (MultinomialNB)
  2. Logistic Regression (L2, SAGA solver)
  3. Calibrated Linear Support Vector Classifier (LinearSVC + CalibratedClassifierCV)
  4. Stochastic Gradient Descent Classifier (SGDClassifier log_loss)

Selects the champion model, evaluates on a held-out test split, and serializes the pipeline.
"""

import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from typing import Dict, List, Tuple

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

ML_DIR = Path(__file__).resolve().parent
DATA_FILE = ML_DIR / "data" / "receipt_expenses_10k.csv"
MODELS_DIR = ML_DIR / "models"
CHAMPION_MODEL_FILE = MODELS_DIR / "expense_classifier.joblib"
METADATA_FILE = MODELS_DIR / "model_metadata.json"


def load_dataset(csv_path: Path) -> Tuple[List[str], List[str]]:
    """Load text features and ground-truth category labels from CSV."""
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {csv_path}. Please run 'python ml/data/build_10k_dataset.py' first."
        )

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

    print(f"[DATA] Successfully loaded {len(texts)} samples from {csv_path.name}")
    return texts, labels


def benchmark_models(
    X_train: List[str], y_train: List[str]
) -> Dict[str, Tuple[Pipeline, float, float]]:
    """Perform 5-Fold Stratified Cross-Validation across candidate classifiers."""
    print("\n" + "=" * 70)
    print("STEP 1: 5-FOLD STRATIFIED CROSS-VALIDATION BENCHMARK (TRAIN SPLIT)")
    print("=" * 70)

    # Base feature extractor: Sublinear TF-IDF with unigrams and bigrams
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2,
        max_features=12000,
        stop_words="english",
    )

    candidates = {
        "Multinomial Naive Bayes": MultinomialNB(alpha=0.1),
        "Logistic Regression (SAGA)": LogisticRegression(
            C=1.0, max_iter=1000, solver="saga", random_state=42
        ),
        "Calibrated LinearSVC": CalibratedClassifierCV(
            LinearSVC(C=1.0, random_state=42), cv=3
        ),
        "SGD Classifier (Log Loss)": SGDClassifier(
            loss="log_loss", penalty="l2", alpha=1e-4, max_iter=1000, random_state=42
        ),
    }

    results: Dict[str, Tuple[Pipeline, float, float]] = {}
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print(f"{'Model Architecture':<32} | {'Mean CV Acc':<12} | {'Std Dev':<10} | {'Status'}")
    print("-" * 70)

    for name, clf in candidates.items():
        pipeline = Pipeline([
            ("tfidf", vectorizer),
            ("clf", clf),
        ])
        t0 = time.perf_counter()
        scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="accuracy", n_jobs=-1)
        elapsed = time.perf_counter() - t0
        mean_acc = float(np.mean(scores))
        std_acc = float(np.std(scores))
        results[name] = (pipeline, mean_acc, std_acc)
        print(f"{name:<32} | {mean_acc * 100:>10.2f}% | {std_acc * 100:>8.2f}% | Trained ({elapsed:.1f}s)")

    print("-" * 70)
    return results


def train_and_select_champion(
    csv_path: Path = DATA_FILE,
) -> Tuple[Pipeline, Dict]:
    """Execute complete end-to-end ML lifecycle: Load, Split, Benchmark, Fit, Evaluate, Save."""
    t_start = time.perf_counter()
    print("=" * 70)
    print("STRUCTRA INTELLIGENT EXPENSE CLASSIFICATION TRAINING")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    # 1. Load Data
    X, y = load_dataset(csv_path)
    categories = sorted(list(set(y)))
    print(f"[DATA] Unique Target Classes ({len(categories)}): {', '.join(categories)}")

    # 2. Stratified Train-Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"[SPLIT] Training Set: {len(X_train)} samples | Test Set: {len(X_test)} samples")

    # 3. Cross-Validation Benchmarking
    benchmark_results = benchmark_models(X_train, y_train)

    # 4. Select Champion Model
    champion_name = max(benchmark_results, key=lambda k: benchmark_results[k][1])
    champion_pipeline, best_cv_acc, best_cv_std = benchmark_results[champion_name]
    print(f"\n[CHAMPION] Selected: '{champion_name}' (CV Accuracy: {best_cv_acc * 100:.2f}%)")

    # 5. Fit Champion on Full Training Set
    print("\n" + "=" * 70)
    print(f"STEP 2: FITTING CHAMPION MODEL ON FULL 80% TRAINING SET ({len(X_train)} rows)...")
    print("=" * 70)
    t_fit = time.perf_counter()
    champion_pipeline.fit(X_train, y_train)
    fit_duration = time.perf_counter() - t_fit
    print(f"[*] Training finished in {fit_duration:.2f} seconds.")

    # 6. Evaluate on Held-out 20% Test Set
    print("\n" + "=" * 70)
    print(f"STEP 3: EVALUATION ON HELD-OUT TEST SET ({len(X_test)} rows)")
    print("=" * 70)
    y_pred = champion_pipeline.predict(X_test)
    test_acc = float(accuracy_score(y_test, y_pred))
    test_macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    test_weighted_f1 = float(f1_score(y_test, y_pred, average="weighted"))

    print(f"  • Test Accuracy   : {test_acc * 100:.2f}%")
    print(f"  • Test Macro F1   : {test_macro_f1 * 100:.2f}%")
    print(f"  • Test Weighted F1: {test_weighted_f1 * 100:.2f}%")

    print("\n--- DETAILED CLASSIFICATION REPORT ---")
    report_dict = classification_report(y_test, y_pred, output_dict=True)
    report_str = classification_report(y_test, y_pred, digits=4)
    print(report_str)

    # 7. Serialize Champion Model Pipeline & Metadata
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(champion_pipeline, CHAMPION_MODEL_FILE)
    print(f"[SAVE] Serialized model pipeline saved to: {CHAMPION_MODEL_FILE}")

    metadata = {
        "model_architecture": champion_name,
        "training_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "total_samples": len(X),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "cv_folds": 5,
        "best_cv_accuracy": round(best_cv_acc, 4),
        "best_cv_std": round(best_cv_std, 4),
        "test_accuracy": round(test_acc, 4),
        "test_macro_f1": round(test_macro_f1, 4),
        "test_weighted_f1": round(test_weighted_f1, 4),
        "classes": categories,
        "total_duration_sec": round(time.perf_counter() - t_start, 2),
        "detailed_metrics": report_dict,
    }

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"[SAVE] Experiment metadata saved to: {METADATA_FILE}")

    print("\n" + "=" * 70)
    print(f"[COMPLETED] Total ML Pipeline Execution Time: {time.perf_counter() - t_start:.2f} seconds")
    print("=" * 70)

    return champion_pipeline, metadata


if __name__ == "__main__":
    train_and_select_champion()
