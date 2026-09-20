# ServiceNow Incident Quality Audit Agent — Setup & Run Guide

Comprehensive instructions to configure, run, test, and deploy the **ServiceNow Incident Quality Audit Agent**.

---

## 📋 Table of Contents
1. [System Prerequisites](#1-system-prerequisites)
2. [Project Architecture Overview](#2-project-architecture-overview)
3. [Environment Configuration (`.env`)](#3-environment-configuration-env)
4. [Option A: Running Full-Stack Node.js Application (Recommended)](#4-option-a-running-full-stack-nodejs-application-recommended)
5. [Option B: Running Python FastAPI & LangGraph Microservice](#5-option-b-running-python-fastapi--langgraph-microservice)
6. [Option C: Running with Docker & Docker Compose](#6-option-c-running-with-docker--docker-compose)
7. [Key Application URLs & Endpoints](#7-key-application-urls--endpoints)
8. [Verification & Operational Testing](#8-verification--operational-testing)
9. [Troubleshooting & FAQ](#9-troubleshooting--faq)

---

## 1. System Prerequisites

Before running the project, ensure you have the following installed:

| Tool | Minimum Version | Recommended Version | Check Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v18.0.0+` | `v20.x` or `v22.x+` | `node -v` |
| **npm** | `v9.0.0+` | `v10.x+` | `npm -v` |
| **Python** | `v3.10+` | `v3.11` to `v3.14` | `python --version` |
| **Git** | Any recent | Latest | `git --version` |
| **Gemini API Key** | — | — | Get from [Google AI Studio](https://aistudio.google.com/app/apikey) |

---

## 2. Project Architecture Overview

```
ticket-audit-agent/
├── server.ts                       # Node.js Express server (dynamic audit engine, SSE, ServiceNow API)
├── src/                            # React 19 + Tailwind CSS Frontend UI
│   ├── components/                 # AuditDetails, MetricCards, ActivityLogAuditDesk, etc.
│   └── App.tsx                     # Main layout & navigation
├── backend/                        # Python FastAPI & LangGraph Microservice
│   ├── app/
│   │   ├── api/                    # FastAPI routes (audit, incidents, rules, user)
│   │   ├── llm/                    # Gemini LLM provider (gemini-3.8-flash)
│   │   ├── orchestration/          # LangGraph pipeline (retrieve, match rules, evaluate)
│   │   ├── memory/                 # FAISS vector store RAG memory
│   │   └── harness/                # eval_harness.py evaluation benchmarks
│   └── requirements.txt            # Python dependencies
├── requirement.txt                 # Root Python requirements (synced)
├── requirements.txt                # Root Python requirements (standard)
├── package.json                    # Node.js scripts & dependencies
├── Dockerfile                      # Multi-stage production container build
├── docker-compose.yml              # Container orchestration
├── STEPS.txt                       # Plaintext setup instructions
└── STEPS.md                        # Markdown setup guide (this document)
```

---

## 3. Environment Configuration (`.env`)

Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
cp .env.example .env
```

### Environment Variables Template

```env
# =================================================================
# Gemini AI Configuration (Required)
# =================================================================
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_MODEL="gemini-3.8-flash"
GEMINI_FALLBACK_MODEL="gemini-2.5-flash"
GEMINI_EMBEDDING_MODEL="gemini-embedding-exp-03-07"

# =================================================================
# Server Configuration
# =================================================================
PORT=3000
NODE_ENV=development
APP_URL="http://localhost:3000"

# =================================================================
# ServiceNow Live Connection (Optional / for Live Sync)
# =================================================================
SERVICENOW_INSTANCE="https://dev423209.service-now.com"
SERVICENOW_USERNAME="admin"
SERVICENOW_PASSWORD="your_servicenow_password"

# =================================================================
# SMTP Email Notifications (Optional)
# =================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=alerts@company.com

# =================================================================
# Microsoft Teams Webhook (Optional)
# =================================================================
TEAMS_WEBHOOK_URL="https://outlook.office.com/webhook/your_webhook_url"
```

---

## 4. Option A: Running Full-Stack Node.js Application (Recommended)

This runs the complete **React 19 Frontend + Express Audit API + Dynamic In-Memory Rescoring Engine**.

### Step 4.1: Install Dependencies
```bash
npm install
```

### Step 4.2: Start in Development Mode
```bash
npm run dev
```
* **URL:** `http://localhost:3000`
* Hot-reloads on file changes using `tsx`.

### Step 4.3: Build for Production
```bash
npm run build
```
* Compiles React frontend with Vite into `dist/`.
* Bundles `server.ts` into `dist/server.cjs` via esbuild.

### Step 4.4: Start Production Server
```bash
npm start
```
* Runs the compiled server via `node dist/server.cjs`.

---

## 5. Option B: Running Python FastAPI & LangGraph Microservice

If you wish to run or develop the Python multi-agent pipeline and RAG vector store:

### Step 5.1: Create a Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 5.2: Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirement.txt
```
*(Or `pip install -r requirements.txt`)*

### Step 5.3: Start FastAPI Server
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 5.4: Test APIs & Documentation
* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Step 5.5: Run Evaluation Harness
```bash
python backend/app/harness/eval_harness.py
```

---

## 6. Option C: Running with Docker & Docker Compose

Deploy the entire stack as an enterprise-grade containerized service:

### Step 6.1: Launch with Docker Compose
```bash
docker-compose up -d --build
```

### Step 6.2: Check Status & Logs
```bash
docker-compose ps
docker-compose logs -f ticket-audit-agent
```

### Step 6.3: Stop the Container
```bash
docker-compose down
```

---

## 7. Key Application URLs & Endpoints

### Web Dashboard
* **Audit Workspace & Metrics Inspector:** `http://localhost:3000`
* **Incident Quality Checklist:** `http://localhost:3000` (Checklist tab)
* **Assignment Group Rules & Policy:** `http://localhost:3000` (Connection Setup tab)
* **Incident Empathy Telemetry:** `http://localhost:3000` (Empathy Dashboard tab)

### REST API Endpoints
* `GET  /api/audit` — Retrieves evaluated ticket audits, scores, and formatted comments.
* `POST /api/servicenow/sync` — Triggers synchronous or async incident pull from ServiceNow.
* `GET  /api/mandatory-metrics` — Fetches current assignment group rule configurations.
* `POST /api/mandatory-metrics` — Updates mandatory/optional metric policies and re-scores tickets in `<1ms`.
* `GET  /api/events` — Server-Sent Events (SSE) live telemetry stream.

---

## 8. Verification & Operational Testing

### 1. Health Verification
```bash
curl -I http://localhost:3000
```
Expected: `HTTP/1.1 200 OK`.

### 2. Live Audit Data Fetch
```bash
curl http://localhost:3000/api/audit
```
Expected: JSON payload containing `reports`, `summary`, and `tickets`.

### 3. Mandatory Metric Synchronization Test
1. In the browser UI, go to **Connection Setup $\rightarrow$ Assignment Group Rules & Mandatory Metrics**.
2. Toggle a metric (e.g. `Technical Description`) to **Optional** for group `Hardware`.
3. Switch to **Workspace Checklist** for a Hardware ticket (e.g. `INC0000008`).
4. Verify:
   - Metric displays an **OPTIONAL (EXEMPT FOR GROUP)** badge.
   - Overall Comments under Category B show the policy scope note and completely exclude the metric from remediation directives.

---

## 9. Troubleshooting & FAQ

#### Q: Port 3000 is already in use (`listen EADDRINUSE: address already in use :::3000`)
**Fix on Windows (PowerShell):**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```
**Fix on Linux/macOS:**
```bash
npx kill-port 3000
```

#### Q: PowerShell script execution disabled (`File cannot be loaded because running scripts is disabled`)
**Fix:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

#### Q: Missing Gemini API Key
**Fix:**
Ensure your `.env` contains:
```env
GEMINI_API_KEY="AIzaSy..."
```
Then restart the server.

---

*Guide maintained for ServiceNow Incident Quality Audit Agent.*
