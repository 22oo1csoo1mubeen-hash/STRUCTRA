"""ML Training Script for STRUCTRA Expense Classifier using standard csv module."""

import csv
from pathlib import Path
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "expenses_dataset.csv"
MODEL_DIR = BASE_DIR / "app" / "ml_models"
MODEL_PATH = MODEL_DIR / "expense_classifier.joblib"


def train_and_save_model() -> None:
    """Train Naive Bayes model on 1000 row expense dataset and save joblib file."""
    print(f"1. Loading dataset from: {DATA_PATH}")
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset file not found at {DATA_PATH}")

    texts = []
    categories = []

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("text") and row.get("category"):
                texts.append(row["text"])
                categories.append(row["category"])

    unique_categories = set(categories)
    print(f"   Loaded {len(texts)} training rows across {len(unique_categories)} categories.")

    print("2. Fitting TF-IDF Vectorizer & Multinomial Naive Bayes Model...")
    model_pipeline = make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), lowercase=True),
        MultinomialNB(alpha=0.1),
    )

    model_pipeline.fit(texts, categories)

    print("3. Evaluating training predictions...")
    predictions = model_pipeline.predict(texts)
    print("\n--- Classification Report ---")
    print(classification_report(categories, predictions))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model_pipeline, MODEL_PATH)
    print(f"ML Model successfully saved to: {MODEL_PATH}")


if __name__ == "__main__":
    train_and_save_model()
