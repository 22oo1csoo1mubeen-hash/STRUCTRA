"""Builds and compiles the master 10,000+ row dataset for STRUCTRA ML.

Merges external financial transaction data with domain-specific receipt OCR data.
Performs data sanitation, deduplication, class balancing, and outputs summary statistics.
"""

import csv
from pathlib import Path
import random
from typing import List, Dict
from collections import Counter

# Import generator functions
from fetch_external_data import generate_external_transactions
from generate_receipt_corpus import generate_receipt_records

DATA_DIR = Path(__file__).resolve().parent
OUTPUT_CSV = DATA_DIR / "receipt_expenses_10k.csv"


def build_unified_dataset(samples_per_stream_per_cat: int = 750) -> Path:
    """Combine external and receipt data streams into a master 10k+ dataset.

    750 external + 750 receipt per category = 1,500 samples * 7 categories = 10,500 total rows.
    """
    print(f"[*] Generating external financial transactions ({samples_per_stream_per_cat} per class)...")
    external_records = generate_external_transactions(samples_per_category=samples_per_stream_per_cat)
    print(f"    -> Generated {len(external_records)} external records.")

    print(f"[*] Generating domain receipt OCR corpus ({samples_per_stream_per_cat} per class)...")
    receipt_records = generate_receipt_records(samples_per_category=samples_per_stream_per_cat)
    print(f"    -> Generated {len(receipt_records)} receipt OCR records.")

    # Combine
    combined: List[Dict[str, str]] = external_records + receipt_records
    random.seed(999)
    random.shuffle(combined)

    # Basic cleaning
    cleaned: List[Dict[str, str]] = []
    seen_texts = set()
    for row in combined:
        txt = row["text"].strip()
        if not txt or txt in seen_texts:
            continue
        seen_texts.add(txt)
        cleaned.append(row)

    total_count = len(cleaned)
    print(f"[*] Successfully unified and deduplicated {total_count} records.")

    # Print class distribution
    class_counts = Counter(r["category"] for r in cleaned)
    print("\n--- DATASET CLASS DISTRIBUTION ---")
    for cat, count in sorted(class_counts.items()):
        pct = (count / total_count) * 100
        print(f"  • {cat:<32} : {count:>5} samples ({pct:.1f}%)")
    print(f"  TOTAL SAMPLES: {total_count}")
    print("----------------------------------\n")

    # Save to CSV
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "vendor_name", "amount", "category", "source"])
        writer.writeheader()
        writer.writerows(cleaned)

    print(f"[SUCCESS] Master 10k+ dataset created at: {OUTPUT_CSV}")
    return OUTPUT_CSV


if __name__ == "__main__":
    build_unified_dataset()
