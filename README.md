# STRUCTRA — Autonomous AI Document Intelligence & Financial Analytics Platform

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
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
   - Pairs local on-device **RapidOCR** (ONNX-accelerated PaddleOCR) with **Google Gemini 3.1 Flash-Lite** multimodal vision, automatically falling back to **Groq** (`openai/gpt-oss-120b`).
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
   - One-click branded Microsoft Excel (`.xlsx`) generation directly from stored metadata.
   - Google OAuth / Email sign-in, avatar management, active session monitoring, and cascade account deletion.

---

## 🏛️ Financial Taxonomy & Machine Learning Categories

STRUCTRA automatically classifies documents and transaction items into 7 corporate accounting categories:

| Category | Accent Color | Primary Domain & Merchant Examples |
|---|---|---|
| **Meals & Dining** | `#f97316` | Restaurants, cafes, team lunches, delivery (Starbucks, Chipotle, DoorDash) |
| **Travel & Logistics** | `#3b82f6` | Airlines, rideshare, fuel, hotels, tolls (Uber, Lyft, Delta, Shell, Marriott) |
| **Technology & Cloud Services** | `#8b5cf6` | Cloud compute, APIs, SaaS (AWS, Google Cloud, Azure, GitHub, OpenAI) |
| **Office Supplies & Hardware** | `#eab308` | Stationery, toner, desk furniture, peripherals (Staples, Office Depot, Best Buy) |
| **Utilities & Telecom** | `#06b6d4` | Electricity, gas, water, mobile, fiber (AT&T, Verizon, Comcast, PG&E) |
| **Healthcare & Medical** | `#ec4899` | Pharmacy, diagnostic labs, urgent care (CVS, Walgreens, Quest Diagnostics) |
| **Retail & Groceries** | `#10b981` | Supermarkets, wholesale clubs, pantry goods (Walmart, Costco, Whole Foods) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.12** (64-bit)
- **Node.js 20+** and **npm 10+**
- A Supabase project (URL, publishable key, secret key)
- Google Gemini API key (or Groq API key)

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd C:\STRUCTRA\backend

# Create virtual environment and activate
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install package and dependencies
pip install -e ".[dev]"

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Run automated test suite (672 tests)
pytest

# Start the API server
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation: `http://127.0.0.1:8000/docs`

### 2. Machine Learning Workflow Commands

```powershell
# Inside backend virtual environment:
cd C:\STRUCTRA\backend
.\.venv\Scripts\Activate.ps1

# Build & compile 10,477-sample unified dataset
python ml/data/build_10k_dataset.py

# Benchmark 4 candidate models with 5-fold CV & serialize champion model
python ml/train.py

# Run independent evaluation report, confusion matrix & keyword diagnostic
python ml/evaluate.py

# Test real-time live CLI inference
python ml/predict.py --text "Starbucks Coffee Grande Latte $5.45"
```

### 3. Frontend Setup

```powershell
# Open a new terminal and navigate to frontend
cd C:\STRUCTRA\frontend

# Install dependencies
npm install

# Start local development server
npm run dev
```
Web application: `http://localhost:5173`

---

## 📁 Repository Structure

```
STRUCTRA/
├── backend/                        # FastAPI microservice & ML pipeline
│   ├── app/                        # Application factory, routes, schemas & services
│   │   ├── api/routes/             # REST endpoints (documents, ml, assistant, etc.)
│   │   └── services/               # OCR, AI, Decimal math, ML classifier, storage
│   ├── ml/                         # Machine Learning engine
│   │   ├── data/                   # 10,477-sample dataset generators & CSV
│   │   ├── models/                 # Serialized champion pipeline (1.43 MB) & metadata
│   │   ├── train.py                # 5-fold CV benchmark and model trainer
│   │   ├── evaluate.py             # Held-out evaluation & confusion matrix
│   │   └── predict.py              # CLI inference console
│   ├── tests/                      # 672 automated backend tests
│   └── README.md                   # Backend documentation
├── frontend/                       # React 19 / Vite SPA
│   ├── src/
│   │   ├── api/                    # REST clients (documents.js, ml.js, etc.)
│   │   ├── components/             # Upload, Library, Categories, Dashboard, Profile
│   │   │   └── app/categories/     # CategoriesPage.jsx with live prediction tester
│   │   └── context/                # Auth, DocumentLibrary, Upload contexts
│   └── package.json
├── docs/                           # Comprehensive documentation & research material
│   ├── README.md                   # Master System Specification (40 Sections, 70KB+)
│   ├── design.md                   # Design tokens, color palette, glassmorphism rules
│   └── motion.md                   # Framer Motion curves and interaction timings
├── Receipts/                       # Qualitative real-world receipt validation samples
└── README.md                       # This repository root document
```

---

## 📖 In-Depth Documentation & Research References

For exhaustive technical specifications, benchmark audits, and academic publication material:
- **[Comprehensive Master System Specification](file:///c:/STRUCTRA/docs/README.md):** 40 numbered sections covering complete end-to-end architectures, mathematical proofs, security audits, dataset analysis, and academic research paper material.
- **[Backend Architecture & Guide](file:///c:/STRUCTRA/backend/README.md):** Detailed guide to backend services, ML scripts, environment setup, and API catalog.
- **[Design Specification](file:///c:/STRUCTRA/docs/design.md):** Visual hierarchy, typography, and glassmorphic UI design tokens.
- **[Motion Specification](file:///c:/STRUCTRA/docs/motion.md):** Framer Motion curves and interactive micro-animations.

---

## 📄 License & Attribution

Copyright © 2026 STRUCTRA Platform. All rights reserved.
