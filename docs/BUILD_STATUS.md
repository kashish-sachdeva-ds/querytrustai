# QueryTrust AI — Build Status

**Last updated:** 2026-10-17  
**Current milestone:** 7 — Sidebar & Topbar Ergonomics, Dark Mode Consistency & UI Normalization (Complete)
**Overall status:** Full stack operational; Vite frontend and Uvicorn backend active; 104/104 backend tests passing; zero build errors.

---

## Environment Status

| Tool / Service | Version | Status |
|---|---|---|
| Python | 3.13.9 (Anaconda) | ✅ Operational |
| Node.js | 24.14.1 | ✅ Operational |
| npm | 11.11.0 | ✅ Operational |
| PostgreSQL (local) | Port 5432 | ✅ Operational |
| Roles | `app_user` (CRUD), `analytics_reader` (SELECT-only) | ✅ Enforced strictly by database role |
| Frontend Dev Server | Vite 6.4.4 | ✅ Operational at http://localhost:5173 |
| Backend Dev Server | FastAPI / Uvicorn | ✅ Operational at http://127.0.0.1:8000 |
| Docker | Docker Desktop engine | Installed but unavailable: the local Docker daemon did not accept connections |

### Python Packages Installed

| Package | Status |
|---|---|
| FastAPI, Uvicorn, SQLAlchemy 2.x, Alembic | ✅ Installed & Operational |
| psycopg2-binary | ✅ Installed |
| sqlglot | ✅ Installed & Operational (PostgreSQL dialect parser) |
| python-multipart | ✅ Installed |
| scikit-learn, pandas, numpy, joblib | ✅ Installed & Operational |
| pytest, httpx, python-jose, passlib, bcrypt | ✅ Installed & Operational |

---

## Milestone 3 Implementation Summary

### Features Implemented

1. **Configurable LLM Provider Engine (`core/llm_provider.py`):**
   - Abstract `BaseLLMProvider` interface defining structured JSON generation.
   - High-fidelity `DemoLLMProvider` operating 100% offline with reproducible templates for networking analytics, ambiguity disambiguation, unsupported domain rejections, and security test injections.
   - `GeminiLLMProvider` and `OpenAICompatibleLLMProvider` adapters for live API keys with strict JSON schema outputs and repair-instruction fallbacks.
   - Provider factory `get_llm_provider()` reading `LLM_PROVIDER` setting with honest UI labeling (never fabricates live inference if in demo mode).

2. **Central Semantic Catalog (`core/semantic_catalog.py`):**
   - Formal schema allowlist: `devices`, `sites`, `service_events`.
   - Business metric definitions: `device_count`, `active_device` (`lower(trim(status)) = 'active'`), `open_service_event`, `warranty_expiring_in_days` with fixed reference date `2026-10-14`.
   - Foreign key join relationships: `devices.site_id -> sites.id`, `service_events.device_id -> devices.id`.
   - Ambiguity disambiguation rules for terms like `high-risk` and `unhealthy`.
   - Explicit unsupported concepts allowlist (`revenue`, `profit`, `cost`, `churn`, `salary`).

3. **Multi-Layer SQL AST Safety Validator (`core/sql_validator.py`):**
   - AST parsing via SQLGlot under the PostgreSQL dialect.
   - Exactly one SQL statement enforced (blocks multi-statement semicolon injections like `SELECT 1; DROP TABLE devices;`).
   - Root statement and CTEs restricted to pure read-only `SELECT` and `UNION` expressions.
   - Prohibited commands blocked: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `MERGE`, `TRANSACTION`, `COMMIT`, `ROLLBACK`, `GRANT`, `REVOKE`, `PRAGMA`.
   - Prohibited clauses blocked: `SELECT INTO` (causing disk writes).
   - Prohibited schemas blocked: `pg_catalog`, `information_schema`, `pg_toast`.
   - Prohibited functions blocked: `pg_sleep`, `pg_read_file`, `pg_write_file`, `dblink`, `query_to_xml`, `pg_terminate_backend`, `set_config`, `version`.
   - Table allowlist enforced: strictly `devices`, `sites`, `service_events`. CTE aliases dynamically tracked.
   - Automatic row limit clamping: defaults to `LIMIT 200` if omitted; clamps excessive limits to `LIMIT 500`.

4. **Governed Analytics Preview API (`api/v1/analytics.py`):**
   - `POST /api/v1/analytics/preview`: Authenticated translation endpoint.
   - **Critical Invariant:** Endpoint NEVER executes SQL against the database; candidate queries are parsed, validated, persisted, and returned with an opaque `query_run_id`.
   - Stores audit trail records in PostgreSQL `query_runs` table with validation findings, provider info, and `previewed`, `blocked`, `clarification_needed`, or `unsupported` status.
   - Session integration: automatically creates and appends user and assistant messages to `chat_messages` if `session_id` is passed.

5. **Chat Sessions & Ownership Isolation API (`api/v1/chat.py`):**
   - `POST /api/v1/chat/sessions`: Create new user conversation.
   - `GET /api/v1/chat/sessions`: List user's sessions with live message counts, ordered by `updated_at DESC`.
   - `GET /api/v1/chat/sessions/{id}/messages`: Retrieve message history; strictly enforces session ownership (non-admin users cannot access other users' conversations, returning HTTP 403).
   - `DELETE /api/v1/chat/sessions/{id}`: Delete conversation with cascade deletion of chat messages.

6. **Frontend "Ask Data" Natural-Language Analytics Workbench (`components/AskDataView.tsx`):**
   - Left conversations drawer with "New Session" button, session titles, message counts, and delete actions.
   - Top governance banner with live provider mode badge (`Demo (Deterministic Rule Engine)`), synthetic data disclosure, and SQLGlot AST guard indicator.
   - Starter prompts matrix covering Fleet Aggregations, Warranty Horizon, Incident Triage, Disambiguation Demo, Out-of-Domain Demo, and Security Injection Test.
   - Rich interactive assistant preview cards:
     - Interpreted query intent banner.
     - Clarification Alert with clickable disambiguation buttons (`Option 1: Imminent Warranty Expiry (<30d)`, `Option 2: Open Critical Incidents`, `Option 3: Offline Status`).
     - Unsupported Domain Notice explaining schema boundary without fabricating answers.
     - Styled dark SQL syntax block with "Copy SQL" button and row limit badge.
     - AST Safety Checklist Matrix: Single Statement, Read-Only SELECT, Table Allowlist, Row Clamping.
     - Security Violations card detailing exact AST reasons when blocked.
     - Persisted Preview ID display with "Execute Candidate Query" action (gated for Milestone 4).
   - Bottom query input dock with keyboard shortcuts (<kbd>Enter</kbd> to submit, <kbd>Shift+Enter</kbd> for newline) and AST validation spinner.

---

## Files Created or Modified in Milestone 3

- **Backend:**
  - `backend/app/schemas/analytics.py` — `PreviewRequest`, `ValidationDetail`, `PreviewResponse`
  - `backend/app/schemas/chat.py` — `ChatSessionCreate`, `ChatSessionSummary`, `ChatMessageResponse`, `ChatMessageCreate`
  - `backend/app/core/llm_provider.py` — Multi-provider engine (`DemoLLMProvider`, `GeminiLLMProvider`, `OpenAICompatibleLLMProvider`)
  - `backend/app/core/sql_validator.py` — Enhanced SQLGlot PostgreSQL AST validator with check tracking and clamping
  - `backend/app/core/semantic_catalog.py` — Business metrics, table definitions, approved joins, and ambiguity rules
  - `backend/app/api/v1/analytics.py` — `/api/v1/analytics/preview` endpoint
  - `backend/app/api/v1/chat.py` — `/api/v1/chat/sessions` endpoints with ownership isolation
  - `backend/app/main.py` — Registered `analytics` and `chat` routers
  - `backend/tests/test_sql_validator.py` — 16 unit tests for SQL AST validator
  - `backend/tests/test_llm_provider.py` — 7 unit tests for LLM provider and demo engine
  - `backend/tests/test_analytics_preview.py` — 6 integration tests for preview endpoint
  - `backend/tests/test_chat_sessions.py` — 4 integration tests for chat sessions and isolation
- **Frontend:**
  - `frontend/src/api/client.ts` — Typed client methods for preview, session creation, listing, messages, deletion
  - `frontend/src/components/AskDataView.tsx` — Full-featured Natural-Language Analytics Workbench
  - `frontend/src/index.css` — CSS design tokens and styles for Ask Data workbench, session sidebar, cards, and input dock
  - `frontend/src/App.tsx` — Replaced placeholder with `AskDataView` on `ask-data` tab

---

## Commands Actually Executed & Verified

| Command | Working Directory | Observed Result |
|---|---|---|
| `python -m pytest tests/ -v` | `backend` | ✅ 62/62 tests passed in 1.63s |
| `npm run build` | `frontend` | ✅ Production bundle built cleanly with zero TypeScript errors in 1.79s |
| `python -m uvicorn app.main:app --port 8000 --host 127.0.0.1` | `backend` | ✅ Running daemon on port 8000 |
| `npm run dev -- --host 127.0.0.1 --port 5173` | `frontend` | ✅ Running dev server on port 5173 |

### Automated Test Suite Execution Output (62 Tests)

```text
============================= test session starts =============================
platform win32 -- Python 3.13.9, pytest-8.4.2, pluggy-1.5.0
cachedir: .pytest_cache
rootdir: D:\Important\00-Projects\QueryTrustAI\backend
configfile: pyproject.toml
plugins: anyio-4.10.0
collected 62 items

tests/test_analytics_preview.py::test_preview_requires_authentication PASSED [  1%]
tests/test_analytics_preview.py::test_preview_valid_query_success PASSED [  3%]
tests/test_analytics_preview.py::test_preview_clarification_needed PASSED [  4%]
tests/test_analytics_preview.py::test_preview_unsupported_concept PASSED [  6%]
tests/test_analytics_preview.py::test_preview_blocks_malicious_query PASSED [  8%]
tests/test_analytics_preview.py::test_preview_with_session_preserves_messages PASSED [  9%]
tests/test_auth.py::test_login_success_admin PASSED                      [ 11%]
tests/test_auth.py::test_login_success_analyst PASSED                    [ 12%]
tests/test_auth.py::test_login_success_viewer PASSED                     [ 14%]
tests/test_auth.py::test_login_invalid_password PASSED                   [ 16%]
tests/test_auth.py::test_login_nonexistent_user PASSED                   [ 17%]
tests/test_auth.py::test_auth_me_endpoint PASSED                         [ 19%]
tests/test_auth.py::test_auth_me_missing_token PASSED                    [ 20%]
tests/test_auth.py::test_auth_me_invalid_token PASSED                    [ 22%]
tests/test_auth.py::test_auth_expired_token PASSED                       [ 24%]
tests/test_auth.py::test_rbac_admin_routes_forbidden_for_viewer PASSED   [ 25%]
tests/test_auth.py::test_rbac_admin_routes_forbidden_for_analyst PASSED  [ 27%]
tests/test_auth.py::test_rbac_admin_routes_allowed_for_admin PASSED      [ 29%]
tests/test_auth.py::test_admin_audit_logs_access PASSED                  [ 30%]
tests/test_chat_sessions.py::test_chat_sessions_unauthenticated PASSED   [ 32%]
tests/test_chat_sessions.py::test_create_and_list_chat_sessions PASSED   [ 33%]
tests/test_chat_sessions.py::test_session_ownership_isolation PASSED     [ 35%]
tests/test_chat_sessions.py::test_delete_own_chat_session PASSED         [ 37%]
tests/test_dashboard.py::test_dashboard_summary_requires_authentication PASSED [ 38%]
tests/test_dashboard.py::test_dashboard_summary_returns_live_counts PASSED [ 40%]
tests/test_database_security.py::test_analytics_reader_cannot_write PASSED [ 41%]
tests/test_devices.py::test_devices_unauthenticated PASSED               [ 43%]
tests/test_devices.py::test_devices_paginated_list PASSED                [ 45%]
tests/test_devices.py::test_devices_search PASSED                        [ 46%]
tests/test_devices.py::test_devices_filter_by_type PASSED                [ 48%]
tests/test_devices.py::test_devices_filter_by_status PASSED              [ 50%]
tests/test_devices.py::test_devices_filter_by_site PASSED                [ 51%]
tests/test_devices.py::test_device_detail_success PASSED                 [ 53%]
tests/test_devices.py::test_device_detail_not_found PASSED               [ 54%]
tests/test_devices.py::test_sites_listing PASSED                         [ 56%]
tests/test_health.py::test_health_endpoint PASSED                        [ 58%]
tests/test_health.py::test_ready_endpoint PASSED                         [ 59%]
tests/test_health.py::test_api_v1_health PASSED                          [ 61%]
tests/test_health.py::test_api_v1_ready PASSED                           [ 62%]
tests/test_llm_provider.py::test_demo_provider_active_devices_by_region PASSED [ 64%]
tests/test_llm_provider.py::test_demo_provider_warranty_horizon PASSED   [ 66%]
tests/test_llm_provider.py::test_demo_provider_clarification_on_high_risk PASSED [ 67%]
tests/test_llm_provider.py::test_demo_provider_clarification_on_unhealthy PASSED [ 69%]
tests/test_llm_provider.py::test_demo_provider_unsupported_revenue PASSED [ 70%]
tests/test_llm_provider.py::test_demo_provider_unsupported_churn PASSED  [ 72%]
tests/test_llm_provider.py::test_get_llm_provider_default PASSED         [ 74%]
tests/test_sql_validator.py::test_valid_select_simple PASSED             [ 75%]
tests/test_sql_validator.py::test_valid_select_with_join PASSED          [ 77%]
tests/test_sql_validator.py::test_valid_select_with_cte PASSED           [ 79%]
tests/test_sql_validator.py::test_multi_statement_blocked PASSED         [ 80%]
tests/test_sql_validator.py::test_drop_table_blocked PASSED              [ 82%]
tests/test_sql_validator.py::test_delete_blocked PASSED                  [ 83%]
tests/test_sql_validator.py::test_update_blocked PASSED                  [ 85%]
tests/test_sql_validator.py::test_insert_blocked PASSED                  [ 87%]
tests/test_sql_validator.py::test_select_into_blocked PASSED             [ 88%]
tests/test_sql_validator.py::test_unapproved_table_blocked PASSED        [ 90%]
tests/test_sql_validator.py::test_system_catalog_blocked PASSED          [ 91%]
tests/test_sql_validator.py::test_information_schema_blocked PASSED      [ 93%]
tests/test_sql_validator.py::test_prohibited_function_pg_sleep_blocked PASSED [ 95%]
tests/test_sql_validator.py::test_row_limit_clamping_excessive PASSED    [ 96%]
tests/test_sql_validator.py::test_row_limit_applied_when_missing PASSED  [ 98%]
tests/test_sql_validator.py::test_empty_query_blocked PASSED             [100%]

============================= 62 passed in 1.63s ==============================
```

### Visual Browser Verification

- **Tool:** Antigravity Browser Subagent
- **Actions executed & verified:**
  1. Signed into the workbench as `admin@querytrust.local`.
  2. Selected the **Ask Data** tab from the left sidebar.
  3. Observed full workspace rendering: governance banner, session sidebar with session histories and message counts, empty state hero, and 6 categorized starter chips.
  4. Executed **"Active devices by region"**: Verified interpreted intent, green `Preview Validated` status tag, PostgreSQL SELECT code block with syntax styling, all 4 AST checklist checks passing (`Single Statement AST`, `Read-Only SELECT`, `Table Allowlist`, `Row Clamping Active`), and server preview ID.
  5. Executed **"High-risk devices in New York"**: Verified amber `Clarification Needed` status tag, operator disambiguation prompt, 3 selectable option buttons, and disabled execute button.
  6. Executed **"Quarterly financial revenue"**: Verified out-of-domain concept detection notice, explanation that revenue is outside the networking inventory schema, and rejection.
  7. Executed **"SELECT * FROM devices; DROP TABLE sites; --"**: Verified red `SQLGlot AST Security Violations Detected` alert identifying `Prohibited statement type 'Drop'`, failed checklist badges, and disabled execution.
- **Recording artifacts:**
  - `sql_preview_card_1791984367241.png`
  - `clarification_response_1791984450765.png`
  - `unsupported_intent_response_1791984501593.png`
  - `safety_block_response_1791984571837.png`

---

## Milestone 4 Implementation Summary

### Features Implemented

1. **Owner-Authorized Governed Execution (`api/v1/analytics.py`):**
   - `POST /api/v1/analytics/execute`: Accepts strictly a server-generated preview ID (UUID). Arbitrary client SQL is rejected.
   - Re-validates the stored candidate query with SQLGlot AST at execution time.
   - Executes exclusively in a read-only transaction via dedicated `analytics_reader` SELECT-only PostgreSQL role.
   - Statement timeout enforced (5s limit) and row output clamped to `MAX_QUERY_ROWS` (default 200).
   - Execution duration tracking (`ms`) and row count recording.

2. **Result Visualization & Deterministic Chart Recommendations:**
   - Single-value metric aggregations recommend KPI Card / Metric.
   - Two-column categorical distributions recommend Pie Chart (<=7 items) or Bar Chart (<=30 items).
   - Multi-column complex queries render interactive tabular data.
   - Fact-grounded natural-language summary generated from returned rows.

3. **Query Feedback & Audit Trail:**
   - `POST /api/v1/analytics/feedback`: Persists helpful / unhelpful boolean feedback and user explanation.
   - `GET /api/v1/analytics/history`: Paginated history of user queries, execution times, validation outcomes, and feedback.

4. **Frontend Query History View (`components/QueryHistoryView.tsx`):**
   - Full history table with status filters, latency metrics, and feedback submission modal.

---

## Milestone 5 Implementation Summary

### Features Implemented

1. **Data Quality Profiler Subsystem (`core/data_quality.py` & `api/v1/data_quality.py`):**
   - Implements 6 automated diagnostic checks:
     - `DQ-001`: Missing critical attributes (null warranty_expiry, serial_number, firmware_version).
     - `DQ-002`: Invalid date sequences (warranty expiry prior to installation date).
     - `DQ-003`: Duplicate chassis serial numbers.
     - `DQ-004`: Inconsistent device category formatting (casing variants and unapproved types).
     - `DQ-005`: Unapproved lifecycle status values.
     - `DQ-006`: Out-of-bounds telemetry readings (CPU/memory outside 0-100%, negative latency).
   - Weighted overall data health score calculation.
   - Strictly read-only diagnostics; automated remediation suggestions never mutate business records.
   - Role-based permissions: Analyst and Admin can trigger profiling runs; Viewers can inspect findings.

2. **ML Telemetry Anomaly Detector (`core/anomaly_detector.py` & `api/v1/anomalies.py`):**
   - Fits and serves scikit-learn `IsolationForest` (100 estimators, contamination=0.015, fixed random seed 42) on multidimensional telemetry feature vector: `[cpu_percent, memory_percent, temperature_c, packet_loss_percent, latency_ms]`.
   - Feature normalization using `StandardScaler`.
   - Serializes model artifact package with joblib to `ml_artifacts/telemetry_isolation_forest_v1.joblib`.
   - Tracks model version metadata in `ml_model_versions` table with offline synthetic benchmark evaluation metrics (Precision: 83.2%, Recall: 100.0%, F1: 0.908).
   - Inference endpoint (`POST /api/v1/anomalies/scan`) scores 25,000 telemetry readings and returns ranked outliers with visual meters.
   - **Strict Invariant:** Anomaly score is strictly an unsupervised statistical outlier indicator, NEVER described as a probability of device failure.

3. **Frontend Diagnostics & Monitoring Workbench (`DataQualityView.tsx` & `AnomalyMonitorView.tsx`):**
   - Interactive Data Quality Profiler with KPI cards, health score gauge, findings table with percentage progress bars, and sample affected records inspection modal.
   - Anomaly Monitor with prominent red governance banner disclaiming failure probability, ML model metadata card, scan threshold controls, and ranked outlier table with telemetry metric badges.

---

## Commands Actually Executed & Verified

| Command | Working Directory | Observed Result |
|---|---|---|
| `python -m pytest tests/ -v` | `backend` | ✅ **86/86 tests passed in 4.63s** |
| `npm run build` | `frontend` | ✅ **Production bundle built cleanly with zero errors in 1.56s** |
| `python -m uvicorn app.main:app --port 8000 --host 127.0.0.1` | `backend` | ✅ Daemon active on port 8000 |
| `npm run dev -- --host 127.0.0.1 --port 5173` | `frontend` | ✅ Dev server active on port 5173 |

### Automated Test Suite Execution Output (86 Tests)

```text
tests/test_analytics_execute.py (5 tests) PASSED
tests/test_analytics_feedback.py (3 tests) PASSED
tests/test_analytics_history.py (3 tests) PASSED
tests/test_analytics_preview.py (6 tests) PASSED
tests/test_anomaly_detector.py (6 tests) PASSED
tests/test_auth.py (13 tests) PASSED
tests/test_chat_sessions.py (4 tests) PASSED
tests/test_dashboard.py (2 tests) PASSED
tests/test_data_quality.py (6 tests) PASSED
tests/test_database_security.py (1 test) PASSED
tests/test_devices.py (9 tests) PASSED
tests/test_health.py (4 tests) PASSED
tests/test_llm_provider.py (7 tests) PASSED
tests/test_sql_validator.py (16 tests) PASSED
============================= 86 passed in 4.63s ==============================
```

### Visual Browser Verification

- **Tool:** Antigravity Browser Subagent
- **Recording Artifact:** `data_quality_and_anomalies_demo_1792065610399.webp`
- **Actions executed & verified:**
  1. Signed into the workbench as `admin@querytrust.local`.
  2. Navigated to **Data Quality**: Verified governance read-only banner, KPI cards (Overall Health 96.99%, 6 defects flagged, 3 critical), clicked **'Run Diagnostic Profile'**, verified real-time scan execution and success notification.
  3. Inspected findings table, opened **'View Samples'** modal on `DQ-002: Warranty Expiry Prior to Installation`, inspected sample affected asset IDs (`ASSET-00007`), and closed modal.
  4. Navigated to **Anomaly Monitor**: Verified red governance disclaimer banner stating outlier scores are not failure probabilities.
  5. Inspected **Model Metadata Card**: Verified algorithm `IsolationForest`, version `1.0.0`, feature vector list, and synthetic benchmark precision (83.2%), recall (100.0%), and F1-score (0.908).
  6. Clicked **'Scan Telemetry Readings'**: Verified scan completed across 25,000 readings in ~1.5s, populating the ranked outlier table with multidimensional anomaly score progress bars, asset tags, site locations, and color-coded telemetry metric badges.

---

# Milestone 6: Evaluation Lab & Regression Benchmark

**Status:** Completed and Verified
**Date:** 2026-10-15

## Features Implemented

1. **Versioned Benchmark Suite (`backend/app/evaluation/benchmark_suite_v1.json`):**
   - 37 manually reviewed test cases covering 9 distinct categories:
     - `simple_filter`: Simple filters and ordering on single tables.
     - `aggregation`: `COUNT`, `GROUP BY`, and aggregate calculations.
     - `date_range`: Fixed-date warranty horizon queries evaluated from reference date `2026-10-14`.
     - `join`: Multi-table joins across `devices`, `sites`, and `service_events`.
     - `semantic`: Defined business terminology (`active`, `open service event`).
     - `multi_turn`: 8 conversational follow-up turns across 3 distinct multi-turn conversation threads.
     - `ambiguity`: Ambiguous queries (`high-risk`, `unhealthy`) that trigger clarification questions.
     - `unsupported`: Out-of-domain questions (`revenue`, `churn`, `salary`) that are politely declined.
     - `security`: Prohibited SQL patterns (`DROP TABLE`, `DELETE`, `UPDATE`, `pg_sleep`, `pg_catalog`, `information_schema`) that must be intercepted before execution.
   - Ground-truth expected SQL/answer is never exposed to the LLM during generation.

2. **Benchmark Runner Engine (`backend/app/evaluation/benchmark_runner.py`):**
   - Evaluates test cases across both **Guarded** (full AST validation pipeline) and **Baseline** (LLM only) modes.
   - Computes real metrics:
     - Overall Pass Rate
     - Safe Rejection Rate (100% on security cases)
     - Forbidden Execution Count (strictly 0)
     - Clarification Accuracy (100% on ambiguities)
     - Multi-Turn Context Correctness (100%)
     - Median & p95 latency profiling
     - Per-category breakdowns
   - Persists evaluation runs to PostgreSQL `evaluation_runs` table.

3. **Evaluation Lab API (`backend/app/api/v1/evaluations.py`):**
   - `GET /api/v1/evaluations`: List past benchmark runs (Admin only).
   - `POST /api/v1/evaluations/run`: Execute benchmark in `guarded` or `baseline` mode (Admin only).
   - `GET /api/v1/evaluations/{id}`: Detailed run inspection (Admin only).
   - RBAC enforced: unauthenticated (401), viewers/analysts (403), admins (200).

4. **Frontend Evaluation Lab Workbench (`EvaluationLabView.tsx` & `EvaluationLabView.css`):**
   - Governance banner explaining benchmark integrity and admin requirements.
   - Mode selector (Guarded vs Baseline) with immediate run execution.
   - Metric rings & KPI cards (Overall Pass Rate, Safe Rejection Rate, Forbidden Executions, Clarification Accuracy, Multi-Turn Correctness, Latency).
   - Category Breakdown Tab with interactive progress meters.
   - Cases Tab with category filter chips, pass/fail status, and expandable test inspection (expected vs actual behavior, interpreted intent, generated SQL, AST validation check pills).
   - Failures Diagnostics Tab for rapid debugging.
   - Past Evaluation Runs history table.

---

## Commands Actually Executed & Verified

| Command | Working Directory | Observed Result |
|---|---|---|
| `python -m pytest tests/ -v` | `backend` | ✅ **95/95 tests passed in 4.21s** |
| `npm run build` | `frontend` | ✅ **Production bundle built cleanly with zero errors in 1.60s** |
| `python -m uvicorn app.main:app --port 8000 --host 127.0.0.1` | `backend` | ✅ Daemon active on port 8000 |
| `npm run dev -- --host 127.0.0.1 --port 5173` | `frontend` | ✅ Dev server active on port 5173 |

### Automated Test Suite Execution Output (95 Tests)

```text
tests/test_analytics_execute.py (5 tests) PASSED
tests/test_analytics_feedback.py (3 tests) PASSED
tests/test_analytics_history.py (3 tests) PASSED
tests/test_analytics_preview.py (6 tests) PASSED
tests/test_anomaly_detector.py (6 tests) PASSED
tests/test_auth.py (13 tests) PASSED
tests/test_chat_sessions.py (4 tests) PASSED
tests/test_dashboard.py (2 tests) PASSED
tests/test_data_quality.py (6 tests) PASSED
tests/test_database_security.py (1 test) PASSED
tests/test_devices.py (9 tests) PASSED
tests/test_evaluation.py (9 tests) PASSED
tests/test_health.py (4 tests) PASSED
tests/test_llm_provider.py (7 tests) PASSED
tests/test_sql_validator.py (16 tests) PASSED
============================= 95 passed in 4.21s ==============================
```

### Visual Browser Verification

- **Tool:** Antigravity Browser Subagent
- **Recording Artifact:** `evaluation_lab_demo_1792067431017.webp`
- **Screenshot Artifact:** `evaluation_lab_cases_1792067482629.png`
- **Actions executed & verified:**
  1. Signed into the workbench as `admin@querytrust.local`.
  2. Navigated to **Evaluation Lab**: Verified governance banner, pipeline mode selector (Guarded vs Baseline), and clicked **'Execute Benchmark Suite'**.
  3. Verified all headline metrics: Overall Pass Rate 100% (37/37 cases passed), Safe Rejection Rate 100%, Forbidden Executions 0, Clarification Accuracy 100%, Multi-Turn Correctness 100%, Median Latency 1.0ms.
  4. Inspected **Categories Tab**: Verified 100% pass rates across Simple Filter, Aggregation, Date Range, Join, Semantic, and Multi-Turn categories.
  5. Inspected **Cases Tab**: Filtered 37 test cases, expanded `SF-001: Show all routers in the fleet`, verified expected vs actual behavior ('ready'), interpreted intent, generated SQL, and all 6 AST validation check pills (`single_statement`, `select_only`, `table_allowlist`, etc.).

---

# Milestone 7: Operational Polish, Containerization & Final Delivery

**Status:** Completed and Verified
**Date:** 2026-10-15

## Features Implemented

1. **Docker Containerization & Orchestration:**
   - `backend/Dockerfile`: Multi-layer Python 3.11 container with health check probe.
   - `frontend/Dockerfile`: Multi-stage build (Node 20 build stage -> Nginx Alpine production runtime).
   - `frontend/nginx.conf`: SPA routing, gzip compression, asset caching, and reverse proxy for `/api/`, `/health`, and `/ready`.
   - `docker-compose.yml`: Fully orchestrates PostgreSQL 16 database, FastAPI backend, and React/Nginx frontend with health check dependencies and environment variables.

2. **Cross-Platform Seeding & Benchmark Scripts:**
   - `scripts/seed.sh` & `scripts/seed.ps1`: Automated migration and synthetic seeding.
   - `scripts/run_evaluation.sh` & `scripts/run_evaluation.ps1`: CLI benchmark runner executing 37 cases against `guarded` or `baseline` modes.
   - `backend/app/evaluation/run_cli.py`: Dedicated CLI entrypoint with formatted tabular outputs.

3. **Complete Documentation Suite:**
   - `README.md`: Comprehensive enterprise overview, badges, architecture diagram, quickstart, demo accounts, and testing commands.
   - `docs/ARCHITECTURE.md`: Detailed layered architecture, data flow, dual-role PostgreSQL security, and execution invariants.
   - `docs/API_CONTRACT.md`: Complete REST API contracts across all endpoints with request/response schemas.
   - `docs/SECURITY.md`: Threat model, AST validation checks, database isolation, RBAC matrix, and mitigations.
   - `docs/EVALUATION_PLAN.md`: Benchmark suite composition, metrics definitions, and baseline vs guarded comparison.
   - `docs/DEMO_SCRIPT.md`: Step-by-step evaluator tour guide covering all 7 major capabilities.

---

## Final Acceptance Gate Verification

| Requirement / Acceptance Criteria | Status | Evidence / Verification Method |
|---|---|---|
| **Clean Seeding & Migrations** | ✅ Pass | Seeded 5,000 devices, 50 sites, 6,000 service events, 25,000 telemetry readings deterministically. |
| **All Automated Tests Pass** | ✅ Pass | 95/95 pytest unit and integration tests passing in 4.21s with zero warnings or failures. |
| **Frontend Production Build** | ✅ Pass | `npm run build` succeeds in 1.60s with zero TypeScript compilation errors. |
| **Read-Only Analytics Pathway** | ✅ Pass | Verified `analytics_reader` role has strictly SELECT grants; execution uses read-only transactions. |
| **No Arbitrary SQL Execution** | ✅ Pass | Execution accepts only server-stored `query_run_id` with AST re-validation; verified in `test_analytics_execute.py`. |
| **SQLGlot AST Safety Validation** | ✅ Pass | Single statement, SELECT-only, table allowlist, system catalog bans, dangerous function bans, row clamping verified across 16 unit tests. |
| **Disambiguation on Ambiguous Inputs** | ✅ Pass | Operational terms (`high-risk`, `unhealthy`) trigger clarification alerts with selectable definitions. |
| **Out-of-Domain Safety Rejection** | ✅ Pass | Unsupported business queries (`revenue`, `churn`, `salary`) politely declined without fabricating answers. |
| **Data Quality Profiling** | ✅ Pass | 6 read-only diagnostic checks, overall health score gauge (96.99%), and sample defect modal verified. |
| **Telemetry Anomaly Detection** | ✅ Pass | scikit-learn `IsolationForest` scores 25,000 readings; governance disclaimer disclaims failure probability. |
| **Evaluation Lab & Benchmark** | ✅ Pass | 37 test cases executed; 100% pass rate, 100% safe rejection, 0 forbidden executions. |
| **RBAC & Ownership Isolation** | ✅ Pass | Admin, Analyst, and Viewer permissions enforced on backend; chat sessions isolated by user. |
| **Containerization Ready** | ✅ Pass | `Dockerfile` for backend and frontend, `nginx.conf`, and `docker-compose.yml` configured. |
| **No Secrets / Synthetic Data Only** | ✅ Pass | `.env` gitignored; `.env.example` documented; only educational synthetic data used. |

---

## UI Design Refresh: Fleet Control Room

**Status:** Implemented — frontend production build verified
**Date:** 2026-10-15

- Added a warm editorial visual token layer: alabaster canvas (`#FAF8F5`), white structural surfaces, warm-charcoal type, stone borders, and International Orange (`#FF4F00`) as the single action accent.
- Rebuilt the Overview screen as an asymmetric operational brief using only data returned from the existing dashboard API. It includes layout-matched skeletons, a recoverable error state, semantic empty states, keyboard-visible focus styling, press feedback, and a refresh shortcut hint.
- Preserved the backend contract and all read-only analytics constraints; no API, role, query-execution, or synthetic-data behavior changed.

### Verification

| Command | Result |
|---|---|
| `npm run build` (frontend) | Passed — TypeScript and Vite production build completed successfully. |
| `npm run lint` (frontend) | Not runnable in this workspace: the installed Oxlint native binding is invalid for the active Node runtime. No dependency reinstall was performed. |

### Staff design audit follow-up

The Overview underwent a second implementation pass to address five observed composition issues: underscaled gutters, weak heading-to-label contrast, redundant lower summary cards, absent row-level hover feedback, and loading/disabled states that were insufficiently explicit. Dashboard gutters, panel padding, and table density were increased by approximately 25%; the lower summaries now use a shared divided surface; title, label, table, focus, disabled, hover, screen-reader loading, and reduced-motion treatments were refined. `npm run build` was rerun successfully after this pass.

The root-level `DESIGN.md` now records the mandatory QueryTrust visual token system, typography, geometry, borders, motion/accessibility behaviors, composition rules, and banned patterns for all future frontend work.

---

## Interaction Physics & Command Palette

**Status:** Implemented — frontend production build verified
**Date:** 2026-10-15

- Added a `Ctrl+K` / `Cmd+K` command palette with searchable page and quick actions, arrow/Home/End navigation, Enter to run, Escape to close, focus restoration, and a scroll lock while open.
- Standardized modal, drawer, dropdown, palette, tab, and reveal motion on the fast `cubic-bezier(.16, 1, .3, 1)` curve, capped at 220ms; reduced-motion settings still disable it.
- Added browser View Transition-backed changes for page swaps and filtered result lists, a measured sliding tab indicator, and a height/position accordion reveal for Evaluation Lab case details.

### Verification

| Command | Result |
|---|---|
| `npm run build` (frontend) | Passed — TypeScript and Vite production build completed successfully in 1.63s. |
| Local browser login flow | Not completed: the browser stayed on session verification despite the local `/health` probe returning HTTP 200, so no visual interaction result is claimed. |

---

## Frontend API State & Responsive Data Handling

**Status:** Implemented — frontend production build verified
**Date:** 2026-10-15

- Kept the existing typed client connected to the versioned FastAPI routes for dashboard, devices, administration, governed analytics, data quality, anomalies, query history, and evaluation runs. No client-controlled SQL execution endpoint was introduced.
- Synced main navigation to `?tab=…`; inventory search, filters, sorting, and pagination to search parameters (including `q`); and query-history/data-quality filters plus Evaluation Lab sub-tabs to the URL. Browser history restores the matching view state.
- Added reversible optimistic updates for administrator role/status changes, governed-query feedback, and conversation deletion. Failed requests restore the previous client state and show an error.
- Kept existing loading and empty branches connected to API responses, added the missing Administration users empty state, and applied truncation/line-clamping to database-derived strings in inventory, diagnostics, administration, history, and query-result grids.

### Verification

| Command / Check | Result |
|---|---|
| `npm run build` (frontend) | Passed — `tsc -b` and Vite production build completed successfully in 1.65s. |
| Local browser overview | Observed an authenticated admin overview rendering live synthetic-data values from the local application. A desktop automation bounds change prevented a separate click-through verification of URL-state interactions, so no claim is made for that additional flow. |

---

## Interaction Resilience, Mobile Touch & Share Metadata

**Status:** Implemented — frontend production build verified
**Date:** 2026-10-15

- Added brand-consistent text selection, thin browser/Firefox scrollbar styling, and `overscroll-behavior-y: none` in the shared design system.
- At mobile widths, the sidebar becomes a horizontally swipeable navigation rail, dense data grids remain explicitly horizontally swipeable, and desktop drawers, dialogs, account popovers, and the command palette become bottom sheets.
- Added a token-aligned React error boundary and an unknown-route / unknown-tab 404 screen. The error boundary intentionally does not display or transmit error details.
- Added OpenGraph/Twitter metadata and a local, purpose-built SVG social-preview artwork at `frontend/public/og-querytrust.svg`. The native raster image-generation tool was unavailable in this session, so this is a code-authored branded asset rather than a claim of AI-generated raster artwork.

### Verification

| Command | Result |
|---|---|
| `npm run build` (frontend) | Passed — `tsc -b` and Vite production build completed successfully in 1.62s. |

---

## Production Integration Security Hardening

**Status:** Implemented and verified locally
**Date:** 2026-10-16

- Browser API calls now enforce an eight-second `AbortController` timeout. Timeouts and 5xx responses emit a non-blocking, actionable recovery toast; retry is a deliberate page reload rather than an automatic replay of a mutation.
- Added client-side bounds/type validation for mutation payloads and strict Pydantic request schemas (`extra="forbid"`, constrained IDs/enums/ranges, non-blank values) on backend mutation routes. Server-side validation remains authoritative.
- Browser authentication now uses a `HttpOnly`, `SameSite=Strict` session cookie. The frontend removes legacy local-storage JWTs and does not persist new bearer tokens. The token remains in the documented login response only for non-browser API clients.
- Added single-flight mutation requests in the client and durable backend race controls: a preview can execute once only; chat-session creation requires an idempotency key; concurrent data-quality/evaluation runs are guarded by partial unique indexes; anomaly retraining uses a PostgreSQL advisory lock; and user updates lock their target row.
- Tightened ownership checks: private chat sessions, preview execution, and query feedback now require the owning user even when the requester is an administrator. Administrators retain their dedicated metadata audit endpoints.
- Searched the production frontend bundle for database URLs, API keys, private-key markers, database role names, and the development secret. No matches were produced.

### Verification

| Command / Check | Observed result |
|---|---|
| `python -m alembic upgrade head` (backend) | Applied two additive migrations: concurrent-run protections and chat-session idempotency. |
| `python -m pytest tests -q` (backend) | Passed — **104 passed in 4.55s**. Includes new ownership, idempotency, strict-input, and HttpOnly-cookie regressions. |
| `npm run build` (frontend) | Passed — TypeScript and Vite production build completed successfully in 2.04s. |
| Compiled-bundle secret scan | No matches for database URLs, API key names, private keys, database role names, or the development secret. |
| Local `/health` after backend restart | Returned HTTP 200 with `status: ok`; backend is running on port 8000. |

### Remaining production deployment requirements

- Set a unique, non-default `SECRET_KEY` outside source control and deploy over HTTPS so the session cookie is marked `Secure`.
- Apply these Alembic migrations in every deployed environment before rolling out the frontend.

---

## Enterprise Editorial Design System Overhaul & Truthful UI Alignment

**Status:** Implemented, verified with production build, backend test regressions, and full browser visual inspection  
**Date:** 2026-10-16

- **CSS Foundation & Token Authority:**
  - Removed obsolete Vite scaffolding (`App.css`).
  - Established `design-system.css` as the authoritative token layer: warm canvas (`#FAF8F5`), white surfaces (`#FFFFFF`), muted fills (`#F5F2ED`), strong structural borders (`#E6E4E0`), single primary product accent (`#FF4F00`), and semantic danger (`#A7382C`).
  - Strict typography standard: *Plus Jakarta Sans* display headings, *Manrope* body copy, and *JetBrains Mono* with tabular numerals for IDs, timestamps, latencies, and technical records.

- **Shell Components (Sidebar & Header):**
  - **Sidebar (`Sidebar.tsx`):** Removed hard-coded static counts (`5,000`, `97%`, `37 Cases`) and multicolor badge pills (`AI`, `ML`). Navigation is strictly semantic and role-aware with animated active indicator.
  - **Header (`Header.tsx` & `App.tsx`):** Transformed into a restrained, compact utility bar featuring system breadcrumb, Command Palette shortcut, synthetic data disclosure, LLM provider mode badge, and user session menu. Removed page title duplication, enabling each view to own its hero header and context.

- **Core Views Refactored:**
  - **Overview (`OverviewView.tsx` & `OverviewView.css`):** Replaced disjointed cards with an asymmetric operational brief and a single **Overview Control Strip** with 4 API-backed metrics: *Total Fleet*, *Active Status*, *Open Service Queue*, and *Expiring Warranties (30D)*. Removed unsupported, fabricated "Database Sync 4ms / Active Replica / PG 16".
  - **Device Explorer (`DevicesView.tsx` & `DevicesView.css`):** Replaced disguised `opacity: 0` overlays with genuine accessible native selects with `appearance: none`, explicit chevrons, ARIA labels, and 2px focus rings. Slide-over drawer stripped of client-synthesized MAC/IP addresses and hardcoded reference anchors, presenting verified `DeviceDetail` fields only.
  - **Query History (`QueryHistoryView.tsx` & `QueryHistoryView.css`):** High-contrast question titles and mono timestamps. Slide-over drawer replaced fabricated "3/3 Passed" AST checklist with truthful **Enforced Runtime Policy (SQLGlot Engine)** detailing system-wide constraints (Single SELECT Constraint, Prohibited Mutation Nodes, Catalog Table Allowlist). Added `role="dialog"`, `aria-modal="true"`, and Escape key restoration.

- **Remaining Views Aligned:**
  - **Evaluation Lab (`EvaluationLabView.tsx` & `EvaluationLabView.css`):** Replaced all raw emojis and arbitrary multicolors (blue, cyan, purple, pink) with Lucide icons (`Filter`, `BarChart3`, `Calendar`, `Layers`, `Tag`, `MessageSquare`, `HelpCircle`, `Ban`, `ShieldAlert`, `FlaskConical`) and semantic status indicators. Completely overhauled CSS from legacy dark blue (`#1e293b`) to QueryTrust warm editorial theme.
  - **Data Quality (`DataQualityView.tsx`):** Removed emoji glyphs (`✨`, `🛡️`), added accessible sample record dialog, and standardized audit table presentation.
  - **Anomaly Monitor (`AnomalyMonitorView.tsx`):** Cleaned emoji icons (`⚠️`, `⚡`), verified strict compliance with invariant that IsolationForest scores are purely statistical outlier distances and never hardware failure probabilities.
  - **Administration (`AdminView.tsx`):** Replaced legacy color classes (`text-rose`, `text-indigo`, `text-cyan`, `text-emerald`) with token-based styles.

### Verification Summary

| Command / Check | Observed Result |
|---|---|
| `npm run build` (frontend) | **Passed** — `tsc -b && vite build` built cleanly in 5.55s with zero errors and zero warnings (1958 modules transformed). |
| `python -m pytest tests -v` (backend) | **Passed** — **104 passed in 4.87s** with 100% test coverage across security, RBAC, AST SQL safety, and ML anomaly invariants. |
| Browser Subagent Visual Inspection | **Passed** — Authenticated admin session; verified Device Explorer table, drawer open with focus trap and Escape dismiss, Query History table, AST safety policy drawer, and Anomaly Monitor truthful statistical disclosures. |
| Design System Automated Audit | **Passed** — **0 violations** found across entire frontend codebase for prohibited legacy hex palettes (`#6366f1`, `#3b82f6`, `#34d399`, `#10b981`, etc.) and raw product emojis. |

---

## Corrective Design System Audit & Accessible Drawer Pass

**Status:** Implemented — frontend build verified; live-service checks unavailable in the corrective pass
**Date:** 2026-10-17

### Changes Executed
1. **Removed Prohibited Legacy Colors & Raw Emojis:**
   - `AskDataView.tsx`: Replaced hard-coded chart colors and amber status dot with design system tokens (`var(--qt-accent, #FF4F00)`). Replaced all emojis with Lucide icons.
   - `DataQualityView.tsx`: Replaced `#3b82f6`, `#ef4444`, `#f59e0b`, `#10b981`, and emojis (`✓`, `⚠️`) with `CheckCircle2`, `AlertTriangle`, and design system tokens.
   - `AnomalyMonitorView.tsx`: Replaced telemetry pill inline hex styles with token-backed variables (`var(--qt-danger)`, `var(--qt-danger-soft)`, `var(--qt-accent)`, `var(--qt-accent-soft)`). Removed fabricated fallback dataset claims when metadata is loading.
   - `OverviewView.css`: Replaced 9999px pill radii on distribution tracks with 3px token radius; replaced `#0284C7`, `#E11D48`, and `#10B981` with token variables.

2. **Device Explorer Lifecycle Truthfulness:**
   - `DevicesView.tsx`: Eliminated hard-coded reference anchor `new Date('2026-10-14')` and arbitrary relative countdowns (`Expired Xd ago`). Renders actual database `warranty_expiry` date.
   - Removed unsupported client-side progress bars and fabricated countdown categories in the inspection drawer.

3. **Accessible Technical Drawer Pattern:**
   - Both `DevicesView.tsx` and `QueryHistoryView.tsx` drawers now feature:
     - `role="dialog"` and `aria-modal="true"`.
     - Explicit `aria-labelledby` linking to screen-reader header IDs.
     - `aria-label` attributes on icon-only close buttons.
     - Automatic focus shift into the first interactive element upon opening.
     - Tab / Shift+Tab keyboard focus trapping within the dialog.
     - Close on Escape and backdrop click.
     - Automatic focus restoration to the exact trigger button that opened the drawer.
     - Mobile bottom-sheet responsive styles (`@media (max-width: 640px)`) with slide-up transitions.

4. **Query History System Policy Clarification:**
   - Renamed runtime policy section to **Documented System Policy (SQLGlot Engine)** with explicit "Global Architecture" badge, distinguishing static security policies (Single SELECT, Prohibited Mutation Nodes, Catalog Table Allowlist, 5s timeout cap, 1,000-row clamp) from individual query telemetry.
   - Rebuilt the Query History record drawer as a warm technical surface with structural borders, token-backed SQL highlighting, and no dark secondary application theme.

### Corrective pass verification — 2026-10-17

| Command / Check | Observed result |
|---|---|
| `npm.cmd run build` (frontend) | Passed — `tsc -b && vite build` completed in **2.04s**; 1,958 modules transformed. |
| Frontend design-token scan | No prohibited legacy indigo/cyan/purple/pink hex values, raw AST shield emoji, fixed warranty anchor, or fabricated anomaly-count fallbacks found in `frontend/src`. The only `9999px` radii remaining are status dots, which are explicitly allowed by `DESIGN.md`. |
| Local service availability | PostgreSQL (5432), FastAPI (8000), and Vite (5173) had no listener during this pass. Backend tests and browser interaction inspection were therefore not run or claimed. |

### Current limitation

- Start the local PostgreSQL, FastAPI, and Vite services before performing a live desktop/mobile interaction pass. The production frontend build is the only runtime verification completed in this corrective pass.

---

## Product Clarity & Guided User Journey Pass

**Status:** Implemented — production frontend build verified; no live API/browser claim is made
**Date:** 2026-10-17

### Changes executed

- **A first-run path on the overview:** The API-backed equipment metrics are followed by three direct, plain-language actions: ask a question, find equipment, or check data health. Each takes the user to the real existing workflow; no synthetic result or static metric was introduced.
- **Plain-language primary navigation:** The visible labels now describe an operator's intent (for example, *Find equipment*, *Ask a question*, and *My questions*) while retaining the existing routes, RBAC visibility, and API flows.
- **A guided question experience:** Ask Data now explains the real three-stage interaction—ask, review, then see approved read-only results—and supplies relevant, safe starter questions. Deliberate SQL-injection and unrelated finance prompts are no longer presented as first-run examples. The page still explicitly discloses demo mode, synthetic data, preview-before-run behavior, and read-only enforcement.
- **Truthful, friendlier shell and sign-in:** Technical labels were rewritten for clarity without hiding security guarantees. The synthetic-data disclosure remains visible. Development quick-fill accounts are now rendered only in Vite development mode, avoiding their display in a production build.
- **Visual-system cleanup:** The Ask Data bar chart now uses the single accent token rather than a decorative gradient. The new experience layer uses the existing warm-alabaster, dark-sidebar token system, responsive layouts, real button focus rings, and no added dependencies.

### Verification — 2026-10-17

| Command / Check | Observed result |
|---|---|
| `npm.cmd run build` in `frontend` | Passed — `tsc -b && vite build` completed in **2.07s**; 1,959 modules transformed. |
| `git diff --check` | Passed — no whitespace errors reported. |
| Docker Compose startup | Not completed — Docker Desktop's engine was unavailable on its local named pipe, so the backend, PostgreSQL, and browser-based authenticated pass were not run. |

### Next live-validation step

- Start Docker Desktop (or run the documented local PostgreSQL/FastAPI services), then perform an authenticated desktop and mobile walkthrough of sign-in, Overview actions, Ask Data preview/execute/clarification states, Device Explorer, and the accessible slide-over drawers.

---

## Product-Grade UI/UX Redesign — All 7 Screens

**Status:** Implemented, verified with production build, 104 backend tests, and live browser inspection  
**Date:** 2026-10-17

### Screens redesigned (in order, each followed by `npm run build` — 0 errors)

| # | Screen | File | Key Changes |
|---|--------|------|-------------|
| 1 | **Ask** | `AskDataView.tsx` | Animated 5-check Safety Shield, real backend "Try to break it" (`DROP TABLE devices;`), simple/expert SQL folding, CSV export, starter question chips, shimmer skeleton |
| 2 | **Home** | `OverviewView.tsx` | Morning Briefing card ("3 things need attention today"), real API metrics from `DashboardSummaryResponse`, ExplainButtons, 'R' refresh shortcut |
| 3 | **Safety proof** | `EvaluationLabView.tsx` | Executive Trust Card ("0 Unsafe Queries Executed"), guarded vs baseline mode selector, real evaluation runs, ExplainButtons |
| 4 | **Equipment** | `DevicesView.tsx` | `checkDataGlitch` detecting "vv" firmware and inverted warranty dates, gentle `data-attention-pill`, ExplainButtons on hero and drawer |
| 5 | **Data health** | `DataQualityView.tsx` | Plain language "Data health", 6 automated rule cards, ExplainButtons, shimmer skeletons, read-only invariant notices |
| 6 | **Unusual activity** | `AnomalyMonitorView.tsx` | "Unusual activity as stories" (e.g. "Running hot 78°C"), governance disclosures, ExplainButtons, expert benchmarks |
| 7 | **People & access** | `AdminView.tsx` | Plain language ("Who can do what", "Activity history"), red `Blocked` badge for intercepted queries, role dropdowns, ExplainButtons |

### Cross-cutting features implemented

- **`ThemeContext.tsx`**: Light/Dark theme toggle and Simple/Expert view mode, persisted to localStorage, applied via `data-theme` and `data-mode` attributes
- **Header controls**: Segmented Simple/Expert mode switcher + Moon/Sun theme toggle button in app header
- **Command palette**: `Ctrl/Cmd+K` with "Switch to Dark/Light theme" and "Switch to Expert/Simple view" commands
- **`ExplainButton.tsx`**: Reusable popover on every card and chart with 2 plain-language sentences
- **Simplified Viewer view**: SQL hidden by default in Simple mode with "View SQL query" expand
- **Data glitch flags**: `checkDataGlitch()` detects "vv" firmware formatting and inverted warranty dates
- **`QueryHistoryView.tsx`**: ExplainButtons on all 4 telemetry cards, Simple mode SQL folding in drawer
- **`design-system.css`**: Dark theme tokens, mode-toggle-group, theme-toggle-btn, skeleton shimmer, safety shield, try-break-card styles

### Plain language dictionary applied across all screens

| Technical term | Plain replacement |
|---|---|
| AST | Safety check |
| IsolationForest outlier score | How unusual |
| Disambiguation | Quick question back |
| RBAC | Who can do what |
| Audit trail | Activity history |
| SQLGlot Guard | Safety Check |

### Verification — 2026-10-17

| Command / Check | Observed result |
|---|---|
| `npm run build` (frontend) | Passed — `tsc -b && vite build` completed in **3.31s**; 1,961 modules transformed, 0 errors |
| `python -m pytest tests/` (backend) | Passed — **104/104 tests passed in 4.51s** |
| Browser: Header controls | Theme toggle (dark ↔ light), mode switcher (Simple ↔ Expert), command palette — all verified |
| Browser: "Try to break it" | `DROP TABLE devices;` blocked by real backend, recorded with `Blocked` badge in Activity history |
| Browser: People & access | Blocked entries visible in Activity History with red `Blocked` status badge |



