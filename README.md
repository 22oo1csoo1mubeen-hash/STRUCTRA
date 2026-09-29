# STRUCTRA — Autonomous AI Document Intelligence & Financial Analytics Platform

[![Python 3.12](https://img.shields.io/badge/Python-3.12_(64--bit)-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.1+-646CFF.svg)](https://vitejs.dev)
[![Machine Learning](https://img.shields.io/badge/ML-scikit--learn-F7931E.svg)](https://scikit-learn.org)
[![Tests Passing](https://img.shields.io/badge/Backend%20Tests-672%20Passed-brightgreen.svg)]()

> **STRUCTRA** is an enterprise-grade, privacy-first Document Intelligence Platform combining high-throughput local OCR, multimodal Large Language Model (LLM) vision pipelines, float-free Decimal mathematical reconciliation, deterministic conversational RAG, and an autonomous **Machine Learning Expense Categorization Engine**.

---

## 🌟 Key Platform Features

1. **Multimodal Information Extraction:**
   - Ingests heterogeneous receipts and invoices (PDF, PNG, JPG, JPEG up to 10 MB).
   - Concurrently pairs local on-device **RapidOCR** (ONNX-accelerated PaddleOCR) with **Google Gemini 3.1 Flash-Lite** multimodal vision, automatically falling back to **Groq** (`openai/gpt-oss-120b`).
2. **Deterministic Mathematical Reconciliation:**
   - Float-free arithmetic verification using Python `Decimal` (`ROUND_HALF_UP`, tolerance ₹0.01).
   - Cross-reconciles line item sums, subtotals, tax adjustments, discounts, and round-offs.
3. **Machine Learning Expense Categorization & Taxonomy:**
   - In-memory champion pipeline trained on a balanced **10,477-sample financial corpus** across 7 standard accounting categories.
   - Sublinear TF-IDF (1–2 n-grams) + Multinomial Naive Bayes delivering **100.0% test accuracy and < 8ms inference latency**.
   - Automatic classification badge displayed on extracted documents and dedicated Categories workspace.
4. **Two-Tiered Duplicate Detection:**
   - Cryptographic SHA-256 byte hashing for exact duplicates coupled with normalized field matching (vendor, date, total, line items) strictly scoped to each user.
5. **Grounded AI Assistant (Deterministic RAG):**
   - Natural-language questioning over user expense history ("How much did I spend at Starbucks last month?").
   - Intent parsing and structured Python Decimal calculation—zero numerical hallucinations.
6. **Enterprise Export & Account Governance:**
   - One-click branded Microsoft Excel (`.xlsx`) generation directly from stored metadata without AI re-processing.
   - Google OAuth / Email sign-in, avatar management, active session monitoring, and cascade account deletion.

---

## 🏛️ Financial Taxonomy & Machine Learning Categories

STRUCTRA automatically classifies documents and transaction items into 7 corporate accounting categories:

| Category | Accent Color | Primary Domain & Merchant Examples |
|---|---|---|
| **Meals & Dining** | `#f97316` | Restaurants, cafes, team lunches, delivery (Starbucks, Chipotle, Domino's, Haldiram's) |
| **Travel & Logistics** | `#3b82f6` | Airlines, rideshare, fuel, hotels, tolls (Uber, Lyft, Delta, Shell, Marriott) |
| **Technology & Cloud Services** | `#8b5cf6` | Cloud compute, APIs, SaaS (AWS, Google Cloud, Azure, GitHub, OpenAI) |
| **Office Supplies & Hardware** | `#eab308` | Stationery, toner, desk furniture, peripherals (Staples, Office Depot, Best Buy) |
| **Utilities & Telecom** | `#06b6d4` | Electricity, gas, water, mobile, fiber (AT&T, Verizon, Comcast, PG&E) |
| **Healthcare & Medical** | `#ec4899` | Pharmacy, diagnostic labs, urgent care, dental (CVS, Walgreens, Quest Diagnostics) |
| **Retail & Groceries** | `#10b981` | Supermarkets, wholesale clubs, pantry goods (Walmart, Costco, DMart, Whole Foods) |

---

## 🧠 Machine Learning Lifecycle

STRUCTRA embeds a self-contained, reproducible machine learning lifecycle for corporate expense classification:

### Dataset Architecture (10,477 Samples)
- **Bank & Card Feeds (`backend/ml/data/fetch_external_data.py`):** 5,250 real-world bank statements, POS card debits, and merchant transaction records.
- **Noisy OCR Receipts (`backend/ml/data/generate_receipt_corpus.py`):** 5,227 noisy multi-line OCR receipt transcripts with headers, items, taxes, and totals.
- **Master Dataset Compiler (`backend/ml/data/build_10k_dataset.py`):** Deduplicates, shuffles, and balances records into `backend/ml/data/receipt_expenses_10k.csv` (~1,500 samples per class).

### Feature Engineering & 5-Fold Cross-Validation (`backend/ml/train.py`)
- **Vectorizer:** Sublinear TF-IDF Vectorizer (`ngram_range=(1, 2)`, `sublinear_tf=True`, `min_df=2`, `max_features=12000`).
- **Benchmark Candidates:**
  - **Multinomial Naive Bayes (`alpha=0.1`):** **100.00% CV Accuracy** (🏆 Champion Pipeline)
  - **Logistic Regression (SAGA, C=1.0):** 100.00% CV Accuracy
  - **Calibrated LinearSVC (C=1.0, cv=3):** 100.00% CV Accuracy
  - **SGD Classifier (log_loss, L2):** 100.00% CV Accuracy
- **Champion Artifacts:** Serialized pipeline saved to `backend/ml/models/expense_classifier.joblib` and metadata saved to `backend/ml/models/model_metadata.json`.

### Held-Out Test Evaluation (`backend/ml/evaluate.py`)
- **Held-Out Test Set:** 2,096 unseen samples (20% split).
- **Test Accuracy:** **100.00%** | **Macro F1:** **1.0000** | **Weighted F1:** **1.0000**
- **Inference Speed:** **< 8 milliseconds** per transaction on standard CPU.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.12 (64-bit)**
- **Node.js 20+** and **npm 10+**
- A Supabase project (URL, publishable key, secret key)
- Google Gemini API key (or Groq API key)

---

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd C:\STRUCTRA\backend

# Activate 64-bit virtual environment
.\.venv-x64\Scripts\Activate.ps1

# (Optional: If setting up from scratch)
# py -3.12 -m venv .venv-x64
# .\.venv-x64\Scripts\Activate.ps1
# pip install -e ".[dev]"

# Configure environment variables
# Ensure .env is populated with SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, etc.

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

- **API Base:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Health Probe:** `http://127.0.0.1:8000/health`

---

### 2. Machine Learning CLI Commands

```powershell
# Inside backend with virtual environment activated:
cd C:\STRUCTRA\backend
.\.venv-x64\Scripts\Activate.ps1

# 1. Compile 10,477-sample unified dataset
python ml/data/build_10k_dataset.py

# 2. Run 5-fold CV benchmark & serialize champion model
python ml/train.py

# 3. Generate held-out evaluation report & confusion matrix
python ml/evaluate.py

# 4. Run instant CLI classification inference
python ml/predict.py --text "Starbucks Coffee Grande Latte $5.45"

# 5. Interactive live REPL console
python ml/predict.py
```

---

### 3. Frontend Setup

```powershell
# Open a new terminal and navigate to frontend
cd C:\STRUCTRA\frontend

# Install dependencies (if needed)
npm install

# Start local Vite development server
npm run dev
```

- **Web Application:** `http://localhost:5173`

---

## 📡 API Endpoints Reference

Interactive documentation is available at `http://127.0.0.1:8000/docs`.

### Machine Learning
- `GET /ml/categories`: Catalog of 7 trained expense categories with model metadata, samples, and top keywords.
- `POST /ml/predict`: Live real-time transaction classification accepting `{"text": "..."}`. Returns predicted category, confidence score, and top-3 class probabilities.

### Authentication & Health
- `POST /auth/signup`: User registration with Supabase Auth.
- `GET /health`: Asynchronous service health probe (`{"status": "healthy"}`).

### Documents & Extraction
- `POST /documents/upload`: Multipart upload with byte validation, SHA-256 deduplication, and S3 storage.
- `POST /documents/{id}/extract`: Multimodal vision extraction (Gemini + Groq) and automatic ML expense categorization.
- `POST /documents/{id}/validate`: Mathematical Decimal reconciliation.
- `POST /documents/{id}/save`: Confirm document into library with status `'completed'`.
- `GET /documents`: Paginated, searchable document library with ML category badges.
- `GET /documents/{id}`: Single document details with validation and ML metadata.
- `PUT /documents/{id}`: Update line items or extraction fields.
- `DELETE /documents/{id}`: Cascade deletion of file and metadata.
- `GET /documents/{id}/download`: Download original file.
- `GET /documents/{id}/preview`: Generate short-lived signed viewing URL.
- `GET /documents/{id}/export`: Export branded Microsoft Excel (`.xlsx`) workbook.

### Dashboard & Analytics
- `GET /dashboard`: Summary metrics and financial totals.
- `GET /dashboard/spending`: Spending time-series series (`day`, `week`, `month`, `year`).
- `GET /dashboard/vendors`: Ranked vendor distribution.
- `GET /dashboard/items`: Frequent line items.
- `GET /dashboard/quality`: Extraction confidence tier distributions.
- `GET /dashboard/review-queue`: Documents requiring human review.

### AI Assistant (Deterministic RAG)
- `POST /assistant/session`: Initialize ephemeral conversation session.
- `POST /assistant/chat`: Grounded question answering over user expenses.
- `POST /assistant/session/{id}/reset`: Clear conversation memory.

### Profile & Security Governance
- `GET /profile`: User overview and storage metrics.
- `PATCH /profile`: Update personal information.
- `POST /profile/picture`: Upload custom avatar.
- `DELETE /profile/picture`: Reset avatar to initial.
- `GET /profile/security`: Sign-in provider detection and active session.
- `GET /profile/security/activity`: Chronological security audit trail.
- `DELETE /profile/account`: Permanent account and data deletion (`{"confirmation": "DELETE"}`).

---

## 📁 Repository Structure

```
STRUCTRA/
├── backend/                        # FastAPI microservice & ML pipeline
│   ├── app/                        # Application factory, routes, schemas & services
│   │   ├── api/routes/             # REST endpoints (documents, ml, assistant, etc.)
│   │   ├── core/config.py          # Pydantic Settings configuration loader
│   │   ├── schemas/                # Pydantic request/response contracts
│   │   └── services/               # OCR, AI, Decimal math, ML classifier, storage
│   ├── migrations/                 # PostgreSQL & Supabase SQL migrations
│   ├── ml/                         # Machine Learning engine
│   │   ├── data/                   # 10,477-sample dataset generators & CSV
│   │   ├── models/                 # Serialized champion pipeline & metadata
│   │   ├── train.py                # 5-fold CV benchmark and model trainer
│   │   ├── evaluate.py             # Held-out evaluation & confusion matrix
│   │   └── predict.py              # CLI inference console
│   ├── tests/                      # 672 automated backend tests
│   ├── .env.example                # Sample environment template
│   └── pyproject.toml              # Packaging and dependency configuration
├── frontend/                       # React 19 / Vite SPA
│   ├── public/                     # Static assets (logo.png)
│   ├── src/
│   │   ├── api/                    # REST clients (documents.js, ml.js, etc.)
│   │   ├── assets/                 # Brand assets and backgrounds
│   │   ├── components/             # Upload, Library, Categories, Dashboard, Profile
│   │   │   └── app/categories/     # CategoriesPage.jsx with live prediction tester
│   │   ├── context/                # Auth, DocumentLibrary, Upload contexts
│   │   ├── hooks/                  # Custom React hooks (useAuth, useRecentDocuments)
│   │   └── lib/                    # Supabase client singleton
│   ├── index.html                  # HTML entry point with Michroma/Inter fonts
│   ├── package.json                # Frontend dependencies and scripts
│   └── vite.config.js              # Vite bundler configuration
├── docs/                           # Comprehensive documentation & research material
│   ├── README.md                   # Master System Specification (40 Sections, 70KB+)
│   ├── design.md                   # Design tokens, color palette, glassmorphism rules
│   └── motion.md                   # Framer Motion curves and interaction timings
├── Receipts/                       # Qualitative real-world receipt validation samples
├── .gitignore                      # Authoritative repository-wide git ignore rules
└── README.md                       # Master repository documentation (this file)
```

---

## 📖 Extended Documentation & Research References

For exhaustive technical specifications, benchmark audits, and academic publication material:
- **[Comprehensive Master System Specification](file:///c:/STRUCTRA/docs/README.md):** 40 numbered sections covering complete end-to-end architectures, mathematical proofs, security audits, dataset analysis, and academic research paper material.
- **[Design Specification](file:///c:/STRUCTRA/docs/design.md):** Visual hierarchy, typography, and glassmorphic UI design tokens.
- **[Motion Specification](file:///c:/STRUCTRA/docs/motion.md):** Framer Motion curves and interactive micro-animations.

---

## 📄 License & Attribution

Copyright © 2026 STRUCTRA Platform. All rights reserved.
