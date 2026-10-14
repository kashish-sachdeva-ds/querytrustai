# QueryTrust AI — Build Status

**Last updated:** 2026-10-14  
**Current milestone:** 3 — Natural-Language Preview and SQL Safety (Completed)  
**Overall status:** 🟢 Milestone 3 Completed & Verified

---

## Environment Status

| Tool / Service | Version | Status |
|---|---|---|
| Python | 3.13.9 (Anaconda) | ✅ Operational |
| Node.js | 24.14.1 | ✅ Operational |
| npm | 11.11.0 | ✅ Operational |
| PostgreSQL (local) | Port 5432 | ✅ Operational (`querytrust` db active) |
| Roles | `app_user` (CRUD), `analytics_reader` (SELECT-only) | ✅ Configured and security verified |
| Frontend Dev Server | Vite 6.4.4 | ✅ Running on `http://127.0.0.1:5173` |
| Backend Dev Server | FastAPI / Uvicorn | ✅ Running on `http://127.0.0.1:8000` (`--reload`) |
| Docker | 29.7.2 | ⚠️ Installed; daemon deferred to Milestone 7 |

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

## Next Milestone

- **Milestone 4 — Governed Execution, Query Results & Conversation History:**
  - Owner-authorized execute-by-preview-ID endpoint (`POST /api/v1/analytics/execute`).
  - Read-only transaction execution via `analytics_reader` role.
  - Query result truncation, row counting, and execution duration tracking.
  - Interactive table rendering and chart recommendations (bar/pie/line based on result shape).
  - Persisted user feedback (`is_helpful` flag and explanation) via `POST /api/v1/analytics/feedback`.
  - User query history metadata view (`GET /api/v1/analytics/history`).
