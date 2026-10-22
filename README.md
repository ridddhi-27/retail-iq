# RetailIQ: AI-Powered Retail Demand Forecasting & Inventory Intelligence

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-ExtraTrees-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Tests](https://img.shields.io/badge/Tests-7%20Passed-brightgreen.svg)]()

> **Data Integrity Disclosure**: All demo datasets and pre-calculated baseline figures featured in this application are derived from a synthetic retail dataset generated specifically for testing and demonstration of the demand forecasting pipeline. They do **NOT** represent actual DB Mart store performance, proprietary commercial figures, or live corporate stock levels. When you upload your business records, forecasts and inventory recommendations are generated dynamically using your own unique sales trends.

---

## 1. Project Overview

**RetailIQ** is an end-to-end AI-powered demand forecasting and inventory decision-support platform designed for retail businesses. It bridges machine learning predictions with practical replenishment workflows, helping merchants:
- Understand historical sales velocity and revenue trends.
- Ingest and validate daily retail transaction logs across CSV and multi-sheet Excel formats (`.csv`, `.xlsx`, `.xls`).
- Forecast multi-day customer demand using an ensemble Extra Trees Regressor.
- Detect imminent stockouts and calculate transparent suggested reorder quantities.
- Operate entirely in private, anonymous multi-tenant workspaces with zero login required.

---

## 2. Key Features

- **Zero-Login Multi-User Workspaces**:
  - Every visitor automatically receives an isolated workspace secured by a cryptographically random session token via `retailiq_session` cookie and `X-Workspace-Token` header.
  - Automatic 7-day rolling expiration.
  - Multi-user isolation verified: tenant datasets, forecasts, alerts, and settings never mix or leak.
  - Isolated "Sample Store Demo" clone allows immediate testing without touching empty user workspaces.
- **Modern Light Pastel SaaS Interface**:
  - Professional design tokens (`#F7F8FC` canvas, `#FFFFFF` cards, `#8B8FE8` primary, `#DDD6FA` lavender, `#B9E8D0` mint, `#B8C7F5` powder blue, `#252B42` dark navy text, `#E4E8F1` borders).
  - Built-in theme switcher (Light Pastel default / Dark Theme).
  - Configurable regional currency formatting (INR `₹` default, USD `$`, EUR `€`, GBP `£`, etc.).
- **Executive Overview Dashboard**: High-level KPIs (Units Sold, Gross Revenue, Product Count, Reorder Alerts), monthly volume and revenue trends, category breakdown, and top-performing products.
- **Deep-Dive Sales Analytics**: Daily sales velocity, day-of-week seasonality, markdown/promotion performance impact, date/category filters, preset shortcuts (Last 7d, 30d, All Time), and CSV export.
- **Demand Forecasting Engine**: Interactive multi-product forecast generator with custom horizon selection (1 to 30 days), interactive multi-series projections, and itemized prediction ledger.
- **Inventory Intelligence & Decision Support**: Automated stock monitoring using the baseline replenishment formula:
  $$\text{Recommended Order Qty} = \max(0, \text{Lead Demand} + \text{Safety Stock} - \text{Current Stock})$$
  - Real-time stock status badges: Healthy, Low Stock, Reorder Required, Out of Stock.
  - Interactive parameter update modal to adjust stock on hand, supplier lead times, and safety buffers on any SKU.
- **Data Management & Ingestion Pipeline**:
  - Drag-and-drop file uploader supporting `.csv`, `.xlsx`, and `.xls`.
  - Multi-sheet Excel inspector with interactive worksheet selector.
  - Automatic column synonym recognition (`date`/`transaction_date`, `product_id`/`sku`, `units_sold`/`quantity`, etc.).
  - Downloadable sample templates in both CSV and Excel (.xlsx) formats.
- **Settings & Workspace Control**: Session lifetime tracking, data clearing action, fresh workspace generation, and system telemetry monitoring.
- **About & Methodology**: Explains the forecasting pipeline, inventory replenishment math, and privacy disclosures.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide React, Axios, React Router v7 |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Uvicorn, Pandas, NumPy, openpyxl, xlrd |
| **Machine Learning** | Scikit-Learn (ExtraTreesRegressor Pipeline), Joblib |
| **Database** | PostgreSQL (Production / Neon), SQLite (Automatic Local Fallback) |
| **Testing** | Pytest, FastAPI TestClient, Vitest/Vite Build Checks |
| **Deployment Targets**| Frontend: Vercel \| Backend: Render \| DB: Neon PostgreSQL |

---

## 4. Local Execution Guide (VS Code)

### Prerequisites
- Python 3.10+ (Python 3.11/3.14 tested)
- Node.js 18+ (Node.js LTS v24 installed)
- Git

### Running Through VS Code:

#### 1. Open Workspace
Open the root directory `retail-iq` in VS Code (`File > Open Folder...`).

#### 2. Start Backend Server
Open a terminal in VS Code (`Ctrl + ~` or `Terminal > New Terminal`):
```powershell
# Navigate to backend
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt

# Run backend test suite (all 7 tests should pass)
$env:PYTHONPATH="."
python -m pytest tests/test_backend.py -v

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at `http://localhost:8000`. Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

#### 3. Start Frontend Dev Server
Open a second terminal in VS Code:
```powershell
# Navigate to frontend
cd frontend

# Install npm packages
npm install

# Test production build
npm run build

# Start development server
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 5. Deployment Instructions

### 1. Database Setup (Neon PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech) and create a new project.
2. Under **Dashboard > Connection Details**, copy the PostgreSQL connection string.
3. RetailIQ automatically executes database migrations upon startup for both SQLite and PostgreSQL.

### 2. Backend Deployment (Render)
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New > Web Service**.
3. Select your repository.
4. Fill in the deployment settings:
   - **Name**: `retailiq-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (e.g. `postgresql://user:pass@ep-xyz.neon.tech/retailiq?sslmode=require`)
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g. `https://retailiq.vercel.app,http://localhost:5173`)
   - `ENVIRONMENT`: `production`
6. Click **Deploy Web Service**.

### 3. Frontend Deployment (Vercel)
1. Sign in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Select your repository.
3. Configure settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: Your Render backend URL + `/api` (e.g. `https://retailiq-backend.onrender.com/api`)
5. Click **Deploy**.
6. The `frontend/vercel.json` rewrite file ensures client-side routes (`/app`, `/app/analytics`, `/app/forecasting`, etc.) load correctly.

---

## 6. API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/workspaces/init` | Get active workspace or initialize fresh anonymous tenant |
| `POST` | `/api/workspaces/sample` | Initialize isolated sample store demo workspace |
| `GET` | `/api/workspaces/current` | Telemetry & record counts for active workspace |
| `POST` | `/api/workspaces/clear` | Clear data in current workspace without touching others |
| `GET` | `/api/health` | Service health, database connectivity, and ML pipeline status |
| `GET` | `/api/dashboard/summary` | Executive summary KPIs, revenue trends, and reorder alerts |
| `GET` | `/api/analytics/sales` | Filtered sales aggregates (start/end date, category, SKU) |
| `GET` | `/api/analytics/categories` | Category-level breakdown |
| `GET` | `/api/products` | Master product catalog in active workspace |
| `PUT` | `/api/inventory/products/{product_id}` | Update product stock, supplier lead time, and safety stock |
| `POST` | `/api/forecast` | Run recursive demand forecast for specified products & horizon |
| `GET` | `/api/forecast/products` | Available products for forecasting in workspace |
| `GET` | `/api/inventory/recommendations` | Replenishment recommendations and priority ranking |
| `POST` | `/api/data/sheets` | Inspect worksheet names in uploaded Excel file |
| `POST` | `/api/data/preview` | Inspect schema, row count, nulls, and sample rows |
| `POST` | `/api/data/import` | Ingest validated sales records into active workspace |
| `GET` | `/api/data/template/{format}` | Download CSV or Excel sample ingestion template |
| `GET` | `/api/export/sales` | Stream filtered historical sales as downloadable CSV |

---

## 7. Verification & Automated Test Results

All 7 integration tests pass with 100% success rate:
```text
backend/tests/test_backend.py::test_health_endpoint PASSED               [ 14%]
backend/tests/test_backend.py::test_workspace_initialization_and_cookie PASSED [ 28%]
backend/tests/test_backend.py::test_multi_user_workspace_isolation PASSED [ 42%]
backend/tests/test_backend.py::test_sample_workspace_creation PASSED     [ 57%]
backend/tests/test_backend.py::test_sales_analytics_date_filtering PASSED [ 71%]
backend/tests/test_backend.py::test_excel_sheets_inspection_and_upload PASSED [ 85%]
backend/tests/test_backend.py::test_inventory_recommendation_and_product_update PASSED [100%]
====================== 7 passed in 7.88s =======================
```

Frontend production build check:
```text
vite v8.3.5 building client environment for production...
✓ 2586 modules transformed.
dist/index.html                   0.96 kB │ gzip:   0.55 kB
dist/assets/index-f_wUe0Co.css   41.48 kB │ gzip:   8.16 kB
dist/assets/index-B7TSe6mH.js   837.78 kB │ gzip: 241.14 kB
✓ built in 1.28s
```
