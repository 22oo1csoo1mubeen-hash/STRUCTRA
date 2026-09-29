"""Interactive CLI and Live Inference Script for STRUCTRA ML Expense Classifier.

Usage:
  # Single query:
  python ml/predict.py --text "Starbucks Coffee Grande Latte $5.45"

  # Interactive mode:
  python ml/predict.py
"""

import argparse
from pathlib import Path
import sys
from typing import Dict, Any

import joblib

ML_DIR = Path(__file__).resolve().parent
MODEL_FILE = ML_DIR / "models" / "expense_classifier.joblib"


def load_classifier():
    """Load serialized champion pipeline."""
    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            f"Trained model not found at '{MODEL_FILE}'. Please run 'python ml/train.py' first."
        )
    return joblib.load(MODEL_FILE)


def predict_category(text: str, pipeline=None) -> Dict[str, Any]:
    """Predict category and confidence score for an input text string."""
    if pipeline is None:
        pipeline = load_classifier()

    clean_text = text.strip()
    if not clean_text:
        return {"category": "Unclassified", "confidence": 0.0, "probabilities": {}}

    prediction = pipeline.predict([clean_text])[0]

    # Calculate confidence probabilities if model supports predict_proba
    conf_score = 1.0
    prob_dict = {}
    if hasattr(pipeline, "predict_proba"):
        probs = pipeline.predict_proba([clean_text])[0]
        classes = pipeline.classes_
        for cls_name, prob in zip(classes, probs):
            prob_dict[cls_name] = round(float(prob), 4)
        conf_score = round(float(max(probs)), 4)

    return {
        "text": clean_text,
        "predicted_category": prediction,
        "confidence": conf_score,
        "confidence_percent": f"{conf_score * 100:.1f}%",
        "top_probabilities": sorted(
            prob_dict.items(), key=lambda x: x[1], reverse=True
        )[:3],
    }


def main():
    parser = argparse.ArgumentParser(
        description="STRUCTRA Trained ML Expense Categorizer Inference"
    )
    parser.add_argument(
        "--text",
        type=str,
        default=None,
        help="Input transaction description, vendor, or OCR line items.",
    )
    args = parser.parse_args()

    pipeline = load_classifier()

    if args.text:
        res = predict_category(args.text, pipeline)
        print("\n" + "=" * 65)
        print("STRUCTRA ML PREDICTION RESULT")
        print("=" * 65)
        print(f"  Input Text         : {res['text']}")
        print(f"  Predicted Category : \033[92m{res['predicted_category']}\033[0m")
        print(f"  Model Confidence   : {res['confidence_percent']}")
        print("  Top Probabilities  :")
        for cat, prob in res["top_probabilities"]:
            print(f"    - {cat:<28}: {prob * 100:>5.1f}%")
        print("=" * 65 + "\n")
    else:
        print("\n" + "=" * 65)
        print("STRUCTRA ML LIVE INTERACTIVE INFERENCE CONSOLE")
        print("Type any receipt, vendor, or invoice line (or 'exit' to quit):")
        print("=" * 65)
        while True:
            try:
                user_input = input("\n[Enter Receipt Text] > ").strip()
                if not user_input or user_input.lower() in ["exit", "quit", "q"]:
                    print("Exiting STRUCTRA ML Console. Goodbye!")
                    break
                res = predict_category(user_input, pipeline)
                print(f"  → Predicted Category : {res['predicted_category']}")
                print(f"  → Confidence         : {res['confidence_percent']}")
            except (KeyboardInterrupt, EOFError):
                break


if __name__ == "__main__":
    main()
