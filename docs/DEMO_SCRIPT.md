# QueryTrust AI — Step-by-Step Demo Script & Evaluator Guide

This document provides a guided walkthrough for evaluating and demonstrating the QueryTrust AI natural-language analytics workbench.

---

## 1. Setup & Starting the Application

### Option A: Local Development
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1

# Terminal 2: Frontend
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
Access the application at: `http://localhost:5173`

### Option B: Docker Compose
```bash
docker-compose up --build
```
Access the application at: `http://localhost:5173` (or `http://localhost:80`)

---

## 2. Seed Accounts & Credentials

| Role | Email | Password | Allowed Capabilities |
|---|---|---|---|
| **Admin** | `admin@querytrust.local` | `AdminPass123!` | Full access, user management, audit logs, evaluation runner |
| **Analyst** | `analyst@querytrust.local` | `AnalystPass123!` | Ask Data workbench, query execution, data quality profiling |
| **Viewer** | `viewer@querytrust.local` | `ViewerPass123!` | Read-only dashboards and device explorer |

---

## 3. Demo Tour: 7 Key Capabilities

### Step 1: Authentication & Overview Dashboard
1. Log in with `analyst@querytrust.local` / `AnalystPass123!`.
2. Notice the top header displaying the active role (`Analyst`) and user identifier.
3. Observe the **Fleet Operations Overview**:
   - Fleet KPIs: 5,000 devices, 3,468 active, 246 expiring warranties (30d), 1,440 open incidents.
   - Real-time distributions across Device Status, Hardware Type, and Incident Severity.

### Step 2: Device Inventory Explorer
1. Click **Devices** in the sidebar.
2. Search for `Router` or `New York`.
3. Filter by Status (`Active`) or Device Type (`Switch`).
4. Click on any device row to open the **Device Details Modal**:
   - Inspect hardware specifications, vendor, firmware version, and installation timestamp.
   - View recent service event incidents linked to the physical asset.

### Step 3: Natural Language Querying (Ask Data)
1. Click **Ask Data** in the sidebar.
2. Note the governance banner: Provider mode `Demo (Deterministic Rule Engine)` and synthetic data disclosure.
3. Click starter prompt: **"How many active devices are in each region?"**
4. Observe the response card:
   - **Interpreted intent:** "Count active networking devices grouped by geographical region."
   - **Generated SQL block:** Formatted syntax highlighting with auto-injected `LIMIT 200`.
   - **AST Safety Checklist:** Verified checks for `single_statement`, `select_only`, `table_allowlist`, etc.
   - **Assumptions & business terms:** Semantic mappings applied.
5. Click **Execute Candidate Query**:
   - Observe live query execution via `analytics_reader` in 2-4ms.
   - Results rendered in a bar chart visualization and data table.
   - Rate the query as helpful (thumbs-up) with feedback.

### Step 4: Disambiguation & Clarification
1. Click starter prompt: **"Disambiguation Demo"** (or type `Show all high-risk devices in New York`).
2. Observe that the model **does not guess or generate arbitrary SQL**.
3. It displays an amber **Clarification Alert**:
   - *"How would you like to define 'high-risk devices'? Choose an operational definition:"*
   - Three clickable buttons:
     - `Option 1: Imminent Warranty Expiry (<30d)`
     - `Option 2: Open Critical Incidents`
     - `Option 3: Offline Status`
4. Click any option to disambiguate and generate the corresponding governed query preview.

### Step 5: SQL Injection Interception
1. Click starter prompt: **"Security Injection Test"** (or type `SELECT * FROM devices; DROP TABLE sites; --`).
2. Observe that execution is **strictly blocked**:
   - AST safety card highlights violations in red: `Prohibited statement type: Drop`.
   - The "Execute" button is disabled.
   - Audit trail records the blocked security attempt.

### Step 6: Data Quality Profiler & Telemetry Anomaly Monitor
1. Navigate to **Data Quality**:
   - Inspect overall health score (96.99%) and 6 diagnostic findings (`DQ-001` through `DQ-006`).
   - Click **Run Diagnostic Profile** to trigger a real-time integrity scan.
   - Click **View Samples** on any finding to inspect affected asset tags.
2. Navigate to **Anomaly Monitor**:
   - Read the prominent red governance disclaimer: *Anomaly scores are statistical outlier indicators, never failure probabilities.*
   - Inspect the scikit-learn `IsolationForest` model metadata card.
   - Click **Scan Telemetry Readings** to score 25,000 readings and view ranked outliers.

### Step 7: Evaluation Lab (Admin Only)
1. Log out and log in as `admin@querytrust.local` / `AdminPass123!`.
2. Click **Evaluation Lab** in the sidebar.
3. Select **Guarded** pipeline mode and click **Execute Benchmark Suite**.
4. Observe all 37 test cases execute in ~1-2 seconds:
   - Overall Pass Rate: 100%
   - Safe Rejection Rate: 100%
   - Forbidden Executions: 0
   - Multi-Turn Correctness: 100%
   - Median Latency: <1.5 ms
5. Switch to **Cases Tab**, filter by category, and expand `SF-001` to view generated SQL and AST validation pills.
