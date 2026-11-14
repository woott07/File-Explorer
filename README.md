# DocuScan — Tabular Document Scanner & Data Inspector

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A production-ready web application for uploading, scanning, filtering, and inspecting complex tabular documents (Excel `.xlsx`/`.xls`, CSV, TSV, and JSON). Features automated schema profiling, instant global search with cell highlighting, a dedicated value locator, an interactive slide-over row inspector drawer, and filtered data exports.

---

## 🌟 Key Features

- **Document Ingestion & Multi-Sheet Support**:
  - Drag-and-drop or file upload for Excel (`.xlsx`, `.xls`), CSV, TSV, and JSON files up to 100MB (configurable).
  - Automatic multi-sheet detection with tabbed sheet switching.
- **Automated Health Scanning & Profiling**:
  - Live summary metrics: total records, columns, memory usage, duplicate rows, missing cell counts & percentages.
  - Column schema analytics: inferred data types (`numeric`, `category`, `text`, `datetime`), null rates, min/max/mean/median stats, and frequency distribution bars.
- **Targeted Search & Query Suite**:
  - **Global Real-Time Search**: Substring search across all columns with active cell highlighting.
  - **"Look for Specific Value" Locator**: Instantly find raw values in any specific column or across all columns with exact or partial matching.
  - **Column-Specific Filters**: Multi-operator filtering (`contains`, `exact`, `starts_with`, `ends_with`, `>`, `<`, `>=`, `<=`, `is_null`, `not_null`).
  - Active filter chips bar with individual tag dismiss or one-click bulk clearing.
- **Interactive Data Grid & Row Inspector**:
  - Sticky headers and sticky row index column (`#`) for navigating wide datasets.
  - Click-to-sort on every column header (ascending / descending).
  - Column visibility menu (show/hide columns).
  - Status badges for common categories (`Paid`, `Unpaid`, `Active`, etc.).
  - **Slide-Over Row Inspector Drawer**: Click any record to inspect all fields in an organized card layout with one-click clipboard copying and previous/next row navigation.
- **Data Export**:
  - Export filtered subsets directly to **CSV**, **Excel (.xlsx)**, or **JSON**.

---

## 🚀 Quick Start & Local Backend Setup

### 1. Prerequisites
- Python 3.10+ installed
- Git

### 2. Clone Repository
```bash
git clone https://github.com/your-username/docuscan.git
cd docuscan
```

### 3. Create & Activate Virtual Environment
```bash
# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables (Optional)
```bash
cp .env.example .env
```
Default configuration parameters:
- `HOST`: Server host (default: `127.0.0.1` locally, `0.0.0.0` in Docker)
- `PORT`: Server port (default: `8000`)
- `MAX_FILE_SIZE_MB`: Maximum file upload size in MB (default: `100`)
- `CORS_ORIGINS`: Allowed origins (default: `*`)

### 6. Start the Server
```bash
./run.sh
```
Or run directly with Uvicorn:
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser at **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.

---

## 🐳 Docker Deployment

Run the complete application in a production-ready isolated container:

### Using Docker Compose
```bash
docker compose up -d --build
```

### Using Plain Docker
```bash
# Build image
docker build -t docuscan:latest .

# Run container
docker run -d -p 8000:8000 --name docuscan-app docuscan:latest
```

---

## 📂 Repository Structure

```
.
├── backend/
│   ├── __init__.py
│   ├── main.py            # FastAPI REST endpoints & static file mount
│   ├── parser.py          # Document parsing, multi-sheet, schema profiling
│   └── query_engine.py    # Vectorized search, column filters, value locator, export
├── static/
│   ├── index.html         # Responsive Swiss Modern UI layout
│   ├── app.js             # Reactive controller (state, debounced search, drawer)
│   └── style.css          # Sticky table styles, search highlights, animations
├── .env.example           # Example environment variables
├── .gitignore             # Comprehensive Git ignore rules
├── Dockerfile             # Multi-stage production Dockerfile
├── docker-compose.yml     # Docker compose orchestration
├── requirements.txt       # Pinned production Python dependencies
├── run.sh                 # Executable startup script
└── README.md              # Project documentation
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check probe (returns service status) |
| `POST` | `/api/upload` | Upload & scan document (`multipart/form-data`) |
| `POST` | `/api/reset` | Clear active document session from memory |
| `GET` | `/api/profile` | Get document schema, column metrics & overview |
| `POST` | `/api/switch-sheet` | Switch active sheet in multi-sheet Excel files |
| `POST` | `/api/query` | Search, filter, sort, and paginate through records |
| `POST` | `/api/find-value` | Locate specific raw values in columns or across doc |
| `GET` | `/api/row/{index}` | Fetch full key-value dictionary for a single row |
| `POST` | `/api/export` | Download filtered dataset as CSV, Excel, or JSON |

---

## 📄 License
MIT License. Free for personal and commercial use.
