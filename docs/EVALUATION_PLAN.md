# QueryTrust AI — Evaluation Plan & Regression Benchmark

## 1. Purpose & Guiding Principles

The Evaluation Lab establishes a reproducible, deterministic benchmark for evaluating the accuracy, safety, and latency of QueryTrust AI's natural language analytics pipeline.

### Core Invariants:
1. **No Fabricated Benchmarks:** All reported metrics come directly from executed code.
2. **Ground-Truth Insulation:** The expected SQL or answer is NEVER passed as context to the LLM during generation.
3. **Execution Correctness Over String Match:** Queries are evaluated based on their semantic and structural behavior rather than verbatim SQL text match.
4. **Offline Reproducibility:** The benchmark runs in CI and local development without internet connectivity or paid LLM API keys via the deterministic `DemoLLMProvider`.

---

## 2. Benchmark Suite Composition (`benchmark_suite_v1.json`)

The test suite contains **37 manually reviewed cases** distributed across 9 functional categories:

| Category | Cases | Description & Expected Behavior |
|---|---|---|
| `simple_filter` | 4 | Single-table filters and sort queries (`Router`, `Switch`, `East` region). Expected: `ready` with valid SQL. |
| `aggregation` | 4 | Aggregate calculations with `COUNT`, `GROUP BY`, and status distributions. Expected: `ready` with valid SQL. |
| `date_range` | 3 | Warranty horizon queries evaluated from fixed reference date `2026-10-14` (30, 60, 90-day windows). Expected: `ready` with valid SQL. |
| `join` | 3 | Multi-table joins across `devices`, `sites`, and `service_events`. Expected: `ready` with valid SQL. |
| `semantic` | 3 | Queries using defined business terms (`active`, `open service event`). Expected: `ready` with valid SQL. |
| `multi_turn` | 8 | Conversational follow-ups preserving prior context across 3 distinct multi-turn threads. Expected: `ready` with valid SQL. |
| `ambiguity` | 3 | Questions containing ambiguous operational terms (`high-risk`, `unhealthy`). Expected: `clarification_needed`. |
| `unsupported` | 3 | Out-of-domain business concepts (`revenue`, `churn`, `salary`). Expected: `unsupported`. |
| `security` | 6 | Injection attempts (`DROP TABLE`, `DELETE`, `UPDATE`, `pg_sleep`, `pg_catalog`, `information_schema`). Expected: `blocked`. |

---

## 3. Metrics & Definitions

1. **Overall Pass Rate:** Percentage of test cases where actual pipeline behavior matches the expected behavior.
   $$\text{Pass Rate} = \frac{\text{Passed Cases}}{\text{Total Cases}} \times 100$$
2. **Safe Rejection Rate:** Percentage of policy-violating and injection cases successfully intercepted before execution.
   $$\text{Safe Rejection Rate} = \frac{\text{Blocked Security Cases}}{\text{Total Security Cases}} \times 100$$
3. **Forbidden Execution Count:** Number of prohibited operations that successfully execute against the database. **Target: 0.**
4. **Clarification Accuracy:** Fraction of ambiguous queries that successfully trigger disambiguation questions rather than speculative SQL.
5. **Multi-Turn Context Correctness:** Fraction of conversation steps that correctly integrate context from prior conversational turns.
6. **Latency Profiling:** Median and 95th-percentile (p95) execution duration in milliseconds across pipeline stages.

---

## 4. Guarded vs. Baseline Pipeline Comparison

The benchmark runner supports two execution modes against the same dataset and database:

| Pipeline Dimension | Guarded Mode | Baseline Mode |
|---|---|---|
| **LLM Generation** | Active | Active |
| **SQLGlot AST Parsing** | Active | Active (diagnostic only) |
| **AST Policy Enforcement** | Blocks unsafe queries (`blocked`) | Logs would-be violations but reports raw generation |
| **Table Allowlist** | Strictly enforced | Not enforced at AST level |
| **Row Clamping** | Injected automatically | Not injected |
| **Database Permissions** | `analytics_reader` (SELECT only) | `analytics_reader` (SELECT only) |

---

## 5. Execution Instructions

### Running via Web UI:
1. Log in as an administrator (`admin@querytrust.local` / `AdminPass123!`).
2. Navigate to **Evaluation Lab** in the sidebar.
3. Select pipeline mode (**Guarded** or **Baseline**).
4. Click **Execute Benchmark Suite**.
5. Inspect the generated KPI cards, Category Breakdown, Case Inspection, and Failure Diagnostics.

### Running via CLI:
```bash
# Linux / macOS
./scripts/run_evaluation.sh guarded

# Windows PowerShell
.\scripts\run_evaluation.ps1 -Mode guarded
```
