# QueryTrust AI — API Contract Specification

Base URL: `/api/v1`  
Protocol: HTTPS / JSON  
Authentication: Bearer Token (`Authorization: Bearer <jwt>`)

---

## 1. Authentication & System Health

### `GET /health` (Root probe)
- **Auth:** None
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "development",
  "llm_provider": "demo",
  "database": "connected"
}
```

### `POST /api/v1/auth/login`
- **Auth:** None
- **Request Body:**
```json
{
  "email": "analyst@querytrust.local",
  "password": "AnalystPass123!"
}
```
- **Response `200 OK`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "bearer",
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "email": "analyst@querytrust.local",
    "display_name": "Operations Analyst",
    "role": "analyst",
    "is_active": true
  }
}
```

### `GET /api/v1/auth/me`
- **Auth:** Any authenticated user
- **Response `200 OK`:** Returns current user profile, active role, environment, and provider mode.

---

## 2. Dashboard & Inventory Explorer

### `GET /api/v1/dashboard/summary`
- **Auth:** Any authenticated user
- **Response `200 OK`:** Fleet-wide aggregate metrics (total devices, active count, 30-day warranty horizon, open incidents, distribution by status/type/severity).

### `GET /api/v1/devices`
- **Auth:** Any authenticated user
- **Query Parameters:** `page` (int), `page_size` (int, max 100), `search` (str), `device_type` (str), `status` (str), `site_id` (int), `sort_by` (str), `sort_dir` ('asc'|'desc')
- **Response `200 OK`:**
```json
{
  "items": [
    {
      "id": 1,
      "asset_tag": "ASSET-00001",
      "device_type": "Router",
      "vendor": "NetCore",
      "model": "EdgeRouter-9000",
      "firmware_version": "v12.4.1",
      "site_id": 12,
      "site_name": "New York Facility A",
      "region": "East",
      "status": "Active",
      "installed_at": "2023-01-15T08:00:00Z",
      "warranty_expiry": "2027-01-15T00:00:00Z",
      "serial_number": "SN-NC-00001"
    }
  ],
  "total": 5000,
  "page": 1,
  "page_size": 25,
  "total_pages": 200
}
```

### `GET /api/v1/devices/{id}`
- **Auth:** Any authenticated user
- **Response `200 OK`:** Full device record including up to 10 recent service incidents.

---

## 3. Natural-Language Analytics Workbench

### `POST /api/v1/analytics/preview`
- **Auth:** `analyst` or `admin`
- **Request Body:**
```json
{
  "question": "Show all active routers in the East region with expiring warranty.",
  "session_id": "optional-uuid"
}
```
- **Response `200 OK`:**
```json
{
  "query_run_id": "9f32b13c-4ec8-498b-b152-32b005e810a9",
  "status": "previewed",
  "intent_status": "ready",
  "interpreted_question": "Query devices with filters: Region filtered to 'East', Device type filtered to 'Router'",
  "clarification_question": null,
  "sql_preview": "SELECT devices.id, devices.asset_tag, ... FROM devices ... LIMIT 200;",
  "validation": {
    "passed": true,
    "checks": ["single_statement", "select_only", "table_allowlist", "schema_allowlist", "function_allowlist", "row_limit"],
    "violations": [],
    "warnings": [],
    "tables_referenced": ["devices", "sites"]
  },
  "assumptions": ["Region filtered to 'East'", "Device type filtered to 'Router'"],
  "business_terms_used": ["device_count", "region"],
  "can_execute": true,
  "provider": "demo",
  "model": "deterministic-rule-v1",
  "is_demo_mode": true,
  "created_at": "2026-10-15T18:00:00Z"
}
```

### `POST /api/v1/analytics/execute`
- **Auth:** `analyst` or `admin` (must own the preview or be admin)
- **Request Body:**
```json
{
  "query_run_id": "9f32b13c-4ec8-498b-b152-32b005e810a9"
}
```
- **Response `200 OK`:**
```json
{
  "query_run_id": "9f32b13c-4ec8-498b-b152-32b005e810a9",
  "status": "executed",
  "row_count": 42,
  "columns": ["id", "asset_tag", "device_type", "model", "status", "site_name", "region"],
  "rows": [...],
  "truncated": false,
  "execution_duration_ms": 3.42,
  "executed_at": "2026-10-15T18:00:02Z",
  "chart_recommendation": {
    "chart_type": "table",
    "x_axis": null,
    "y_axis": null,
    "title": "Query Results"
  },
  "result_summary": "42 rows returned in 3.42ms (chart: table)"
}
```

### `POST /api/v1/analytics/feedback`
- **Auth:** `analyst` or `admin`
- **Request Body:**
```json
{
  "query_run_id": "9f32b13c-4ec8-498b-b152-32b005e810a9",
  "is_helpful": true,
  "explanation": "Exact query needed for quarterly audit"
}
```

### `GET /api/v1/analytics/history`
- **Auth:** Any authenticated user (filtered to own runs unless admin)
- **Query Parameters:** `page`, `page_size`, `status`

---

## 4. Chat Sessions

- `POST /api/v1/chat/sessions`: Create new session (`{"title": "Fleet Audit"}`).
- `GET /api/v1/chat/sessions`: List user sessions with message counts.
- `GET /api/v1/chat/sessions/{id}/messages`: Get conversation history.
- `DELETE /api/v1/chat/sessions/{id}`: Delete conversation with cascade.

---

## 5. Data Quality Profiler

- `GET /api/v1/data-quality/summary`: Latest profiling run overview and health score.
- `POST /api/v1/data-quality/run`: Execute diagnostic scan (Analyst/Admin).
- `GET /api/v1/data-quality/findings`: Paginated findings with severity filter (`critical`, `high`, `medium`, `low`).

---

## 6. Telemetry Anomaly Detection

- `GET /api/v1/anomalies/summary`: Model metadata, algorithm, features, and benchmark metrics.
- `POST /api/v1/anomalies/scan`: Score telemetry readings and return ranked outliers (`{"limit": 50, "threshold": 0.65}`).
- `POST /api/v1/anomalies/train`: Retrain model on synthetic feature vector (Admin only).

---

## 7. Evaluation Lab

- `GET /api/v1/evaluations`: List past benchmark runs (Admin only).
- `POST /api/v1/evaluations/run`: Execute 37-case benchmark suite (`{"mode": "guarded" | "baseline"}`) (Admin only).
- `GET /api/v1/evaluations/{id}`: Inspect run metrics and failure diagnostics (Admin only).

---

## 8. System Administration

- `GET /api/v1/admin/users`: List users (Admin only).
- `PATCH /api/v1/admin/users/{id}`: Update user role or active status (Admin only).
- `GET /api/v1/admin/audit-logs`: Query execution audit trail (Admin only).
