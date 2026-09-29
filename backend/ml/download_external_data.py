"""External public dataset ingestion helper.

Provides programmatic mechanisms and guidance to ingest open-source benchmarks
such as Kaggle Financial Datasets, SROIE, and HuggingFace Receipt Corpora.
"""

import argparse
import json
from pathlib import Path
import sys
import urllib.request

DATA_DIR = Path(__file__).resolve().parent / "data"

PUBLIC_BENCHMARKS = [
    {
        "name": "Kaggle Personal & Business Expense Transactions",
        "description": "Tabular and textual expense categorization dataset with merchant names, categories, and amounts.",
        "url": "https://www.kaggle.com/datasets/science/financial-transactions-categorization",
        "format": "CSV (Transaction Description, Amount, Category)"
    },
    {
        "name": "SROIE (Scanned Receipts OCR and Information Extraction)",
        "description": "ICDAR 2019 benchmark of 1,000 real scanned receipts with vendor, date, address, and total annotations.",
        "url": "https://github.com/zzzDavid/ICDAR-2019-SROIE",
        "format": "Images + TXT/JSON annotations"
    },
    {
        "name": "CORD (Consolidated Receipt Dataset for Post-OCR Parsing)",
        "description": "Official benchmark dataset from NAVER CLOVA containing Indonesian and English receipts for information extraction.",
        "url": "https://github.com/clovaai/cord",
        "format": "JSON line tokens and bounding boxes"
    }
]


def list_benchmarks():
    """Print available external benchmarks."""
    print("=" * 70)
    print("STRUCTRA ML: EXTERNAL PUBLIC BENCHMARK REFERENCE")
    print("=" * 70)
    for b in PUBLIC_BENCHMARKS:
        print(f"\n[BENCHMARK] {b['name']}")
        print(f"  Description : {b['description']}")
        print(f"  URL         : {b['url']}")
        print(f"  Data Format : {b['format']}")
    print("\n" + "=" * 70)
    print("To integrate a downloaded Kaggle/CORD CSV file into STRUCTRA 10k dataset:")
    print("  Place the CSV in ml/data/ and run: python ml/data/build_10k_dataset.py")
    print("=" * 70)


if __name__ == "__main__":
    list_benchmarks()
