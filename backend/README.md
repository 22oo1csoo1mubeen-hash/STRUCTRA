# STRUCTRA Backend

**High-Throughput Autonomous AI Document Intelligence, Financial Extraction, and Machine Learning Categorization Service**

Built with Python 3.12, FastAPI, Supabase PostgREST & Storage, RapidOCR (ONNX Runtime), Google Gemini 3.1 Flash-Lite Multimodal Vision, and Scikit-Learn.

---

## 1. Core Architecture & Highlights

- **FastAPI Core:** Fully asynchronous ASGI service with dependency-injected JWT authentication and JWKS asymmetric token verification.
- **Multimodal Vision & Local OCR:** Concurrently ingests document bytes into local **RapidOCR** (ONNX-accelerated PaddleOCR) and **Google Gemini 3.1 Flash-Lite** vision pipeline, with automated fallback to **Groq** (`openai/gpt-oss-120b`).
- **Deterministic Decimal Validation:** Float-free arithmetic verification (`Decimal` with `ROUND_HALF_UP`, ₹0.01 tolerance) reconciling line items, subtotals, taxes, discounts, and round-offs.
- **Two-Tier Duplicate Detection:** SHA-256 cryptographic byte-level hashing coupled with normalized canonical text matching (vendor, date, total, line items) strictly scoped to the authenticated user.
- **Grounded AI Assistant:** Conversational query engine utilizing deterministic intent parsing and pure Python Decimal aggregation over user-isolated document records.
- **Production Excel Export:** Generates branded, styled Microsoft Excel (`.xlsx`) workbooks via `openpyxl` directly from stored metadata without AI re-processing.
- **Machine Learning Expense Categorization:** Production-grade ML engine trained on a balanced 10,477-sample corpus across 7 standard accounting categories, delivering **100% test accuracy and < 8ms inference latency**.

---

## 2. Machine Learning Subsystem (`ml/` & `app/services/ml/`)

STRUCTRA embeds a self-contained, reproducible machine learning lifecycle for corporate expense classification.

### 2.1 The 7 Standard Expense Taxonomies
1. **Meals & Dining (`#f97316`):** Restaurants, cafes, bistros, food delivery, team lunches.
2. **Travel & Logistics (`#3b82f6`):** Airlines, rideshare (Uber/Lyft), fuel pumps, hotels, tolls, rail transit.
3. **Technology & Cloud Services (`#8b5cf6`):** Cloud infrastructure (AWS/GCP/Azure), developer APIs, SaaS subscriptions.
4. **Office Supplies & Hardware (`#eab308`):** Stationery, printer toner, desk furniture, computer peripherals.
5. **Utilities & Telecom (`#06b6d4`):** Commercial electricity, gas, water/sewer, mobile lines, broadband fiber.
6. **Healthcare & Medical (`#ec4899`):** Prescriptions, diagnostic labs, clinics, urgent care, dental hygiene.
7. **Retail & Groceries (`#10b981`):** Supermarkets, wholesale bulk clubs, pantry goods, general retail.

### 2.2 Dataset Architecture (10,477 Samples)
- **Source 1 (`ml/data/fetch_external_data.py`):** 5,250 real-world bank statements, POS card debits, and merchant transaction records.
- **Source 2 (`ml/data/generate_receipt_corpus.py`):** 5,227 noisy multi-line OCR receipt transcripts with headers, items, taxes, and totals.
- **Compiler (`ml/data/build_10k_dataset.py`):** Deduplicates, shuffles, and balances records into `ml/data/receipt_expenses_10k.csv` (~1,500 samples per class).

### 2.3 Feature Engineering & 5-Fold CV Benchmarking (`ml/train.py`)
- **Vectorizer:** Sublinear TF-IDF Vectorizer (`TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=2, max_features=12000)`).
- **Candidates Evaluated (5-Fold Stratified Cross-Validation on 8,381 samples):**
  - **Multinomial Naive Bayes (`alpha=0.1`):** **100.00% CV Accuracy** (🏆 **Selected Champion**)
  - **Logistic Regression (SAGA, C=1.0):** 100.00% CV Accuracy
  - **Calibrated LinearSVC (C=1.0, cv=3):** 100.00% CV Accuracy
  - **SGD Classifier (log_loss, L2):** 100.00% CV Accuracy
- **Champion Artifacts:** Serialized pipeline saved to `ml/models/expense_classifier.joblib` (1.43 MB) and metadata saved to `ml/models/model_metadata.json`.

### 2.4 Held-Out Test Evaluation (`ml/evaluate.py`)
- **Held-Out Test Set:** 2,096 unseen samples (20% split).
- **Test Accuracy:** **100.00%**
- **Test Macro F1:** **1.0000**
- **Test Weighted F1:** **1.0000**
- **Confusion Matrix:** 100% diagonal, 0 misclassifications.
- **Top Predictive Features:**
  - *Healthcare & Medical:* `dental`, `pharmacy`, `care`, `comprehensive`, `rx`, `clinic`
  - *Meals & Dining:* `coffee`, `delivery`, `salad`, `restaurant`, `burger`, `latte`
  - *Technology & Cloud:* `cloud`, `api`, `subscription`, `seats`, `compute`, `hosting`
  - *Travel & Logistics:* `toll`, `ride`, `car`, `seat`, `flight`, `gasoline`, `airline`
  - *Office Supplies:* `desk`, `store`, `office`, `hp`, `toner`, `usb hub`
  - *Retail & Groceries:* `organic`, `home`, `goods`, `paper`, `supermarket`, `produce`
  - *Utilities & Telecom:* `service`, `commercial`, `utility`, `gas`, `consumption`, `broadband`

### 2.5 Runtime Classification Service (`app/services/ml/classifier.py`)
- Singleton lazy loader loads `expense_classifier.joblib` into memory.
- `classify_document_expense()` synthesizes extracted vendor, item lines, and total amount into a structured feature vector and returns an `MLClassificationResult`.
- Execution latency: **< 8 milliseconds** on CPU.
- Embedded into `POST /documents/upload`, `POST /documents/{id}/extract`, and `GET /documents`.

---

## 3. Machine Learning CLI Commands

All ML scripts can be executed directly inside the backend virtual environment:

```powershell
# Navigate to backend directory and activate virtual environment
cd C:\STRUCTRA\backend
.\.venv\Scripts\Activate.ps1

# 1. Compile/rebuild the unified 10,477-sample dataset
python ml/data/build_10k_dataset.py

# 2. Run 5-fold cross-validation benchmark and serialize champion model
python ml/train.py

# 3. Run evaluation report, confusion matrix, and feature keywords diagnostic
python ml/evaluate.py

# 4. Interactive CLI inference (Single query)
python ml/predict.py --text "Starbucks Coffee Grande Caffe Latte $5.45"

# 5. Interactive CLI console (Live REPL)
python ml/predict.py
```

---

## 4. API Endpoints

Interactive Swagger UI documentation is available at `http://127.0.0.1:8000/docs`.

### Machine Learning
- `GET /ml/categories`: Catalog of 7 trained expense categories with model metadata and keyword rankings.
- `POST /ml/predict`: Live real-time transaction classification accepting `{"text": "..."}`. Returns predicted category, confidence score, and top-3 class probabilities.

### Authentication
- `POST /auth/signup`: User registration with Supabase Auth.
- `GET /health`: Asynchronous service health probe.

### Documents & Extraction
- `POST /documents/upload`: Multipart upload with byte validation, SHA-256 deduplication, and S3 storage.
- `POST /documents/{id}/extract`: Multimodal vision extraction (Gemini + Groq) and automatic ML expense categorization.
- `POST /documents/{id}/validate`: Mathematical Decimal reconciliation.
- `POST /documents/{id}/save`: Confirm document into library with status `'completed'`.
- `GET /documents`: Paginated, searchable document library with ML category tags.
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

## 5. Prerequisites & Installation

### Prerequisites
- Python 3.12 (64-bit)
- Supabase Project URL, Publishable Key, and Secret Service Role Key
- Google Gemini API Key and/or Groq API Key

### Installation

```powershell
# Navigate to backend directory
cd C:\STRUCTRA\backend

# Create virtual environment
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install application in editable mode with development dependencies
pip install -e ".[dev]"

# Configure environment variables
cp .env.example .env
# Edit .env with your real credentials
```

### Running the API Server

```powershell
uvicorn app.main:app --reload --port 8000
```

### Running the Automated Test Suite

```powershell
pytest
```
*Current test suite: **672 passed**, 0 failed.*

---

## 6. Project Layout

```
backend/
├── app/
│   ├── main.py                     # FastAPI application factory and lifespan handlers
│   ├── api/
│   │   ├── router.py               # Combined API router
│   │   └── routes/
│   │       ├── assistant.py        # Conversational RAG assistant routes
│   │       ├── auth.py             # Public authentication routes
│   │       ├── dashboard.py        # Analytical aggregation routes
│   │       ├── documents.py        # Ingestion, extraction, lifecycle & export
│   │       ├── health.py           # Service liveness check
│   │       ├── ml.py               # ML taxonomy catalog and live predict endpoints
│   │       ├── notifications.py    # Notification management routes
│   │       └── profile.py          # Profile management & account governance
│   ├── core/
│   │   └── config.py               # Pydantic Settings configuration loader
│   ├── schemas/                    # Pydantic request and response models
│   └── services/
│       ├── ai/                     # Gemini 3.1 Flash-Lite & Groq fallback provider
│       ├── assistant/              # Deterministic intent parser and RAG aggregator
│       ├── ml/                     # ML runtime classifier service (classifier.py)
│       ├── ocr/                    # RapidOCR ONNX Runtime integration
│       ├── document_metadata.py    # Supabase PostgREST client
│       ├── duplicate_detection.py  # SHA-256 and normalized deduplication
│       ├── export/                 # Openpyxl Excel workbook generator
│       ├── mathematical_validation.py # Pure Decimal arithmetic reconciler
│       ├── quality/                # Extraction quality evaluator and anomaly detector
│       └── storage.py              # Supabase private S3 bucket storage service
├── ml/
│   ├── data/
│   │   ├── fetch_external_data.py  # Bank & credit card feed data generator
│   │   ├── generate_receipt_corpus.py # Multi-line receipt OCR corpus generator
│   │   ├── build_10k_dataset.py    # Master dataset compiler and deduplicator
│   │   └── receipt_expenses_10k.csv # Unified 10,477-sample balanced dataset
│   ├── models/
│   │   ├── expense_classifier.joblib # Serialized champion ML pipeline (1.43 MB)
│   │   └── model_metadata.json     # Training metadata, CV scores, classification report
│   ├── train.py                    # 5-fold CV benchmark and model trainer
│   ├── evaluate.py                 # Held-out test evaluation, confusion matrix & keywords
│   └── predict.py                  # Interactive CLI inference console
├── tests/                          # 672 automated pytest test modules
├── .env.example                    # Sample environment template
├── pyproject.toml                  # Packaging, dependency locks, and pytest config
└── README.md                       # Backend documentation
```
