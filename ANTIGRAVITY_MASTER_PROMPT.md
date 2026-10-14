# Antigravity Master Build Prompt - QueryTrust AI

You are the senior full-stack engineer, AI application architect, database/security engineer, QA lead, and UI engineer responsible for implementing the application in this workspace.

## Source of truth

Read these files completely before coding:
1. `PROJECT_SPEC.md` - product and technical requirements.
2. `AGENTS.md` - persistent engineering rules.

`PROJECT_SPEC.md` is the source of truth for scope, architecture, security rules, API behavior, evaluation, and acceptance criteria. Do not silently discard requirements. If something must change for technical reasons, record the change and reason in `docs/BUILD_STATUS.md`.

## Objective

Build **QueryTrust AI**, a working full-stack natural-language analytics workbench using React + TypeScript + Vite, FastAPI + Python, PostgreSQL, an optional configurable LLM provider, SQLGlot validation, a data-quality profiler, a small scikit-learn telemetry anomaly detector, automated tests, and Docker Compose. The application must be demonstrable using synthetic networking-device data. It must not use actual Cisco/customer data or claim affiliation with Cisco.

Do not only provide a plan or code snippets. Modify the workspace files, implement the application, run commands, inspect results, fix bugs, and write accurate documentation.

## Mandatory operating method

### Milestone 0 - inspect and plan; do not implement the whole app yet

1. Inspect the workspace, installed Python/Node/Docker versions, existing files, and available environment configuration.
2. Never delete or overwrite existing work without preserving it and explaining why.
3. Read all of `PROJECT_SPEC.md` and `AGENTS.md`.
4. Create `docs/BUILD_STATUS.md` with requirements, milestones, test commands, known risks, and a checklist.
5. Create an implementation plan with dependencies and file-level tasks.
6. Report the plan and wait for user approval before moving to implementation. If the user has already explicitly approved implementation in this same interaction, begin Milestone 1 after presenting the plan.

### Milestone 1 - foundation and vertical slice

Create a minimal but real end-to-end slice:
- React app can call FastAPI.
- FastAPI can connect to PostgreSQL.
- Migrations and a deterministic seed command create synthetic data.
- A dashboard endpoint returns database-derived counts.
- Frontend renders those values with loading/error/empty states.
- `/health` and `/ready` work.
- Add tests and run them.

Do not proceed if this slice does not work. Fix it first.

### Milestone 2 - authentication and dashboard

Implement password hashing, signed access tokens, role checks on the server, user-seeding, dashboard, device search/filter/pagination, and UI navigation. Test role restrictions and own-session access. Do not rely on frontend-only authorization.

### Milestone 3 - natural-language preview and SQL safety

Implement the configurable LLM adapter and clearly labelled demo mode. Add the semantic catalog and strict structured model output. Implement question -> interpretation -> SQL preview -> SQLGlot validation -> persisted preview. Ambiguous questions must return clarification; unsupported questions must be rejected politely. Preview must not run SQL.

Implement and test the SQL guard before enabling execution. Require one PostgreSQL read-only SELECT; validate nested queries/CTEs; allow only explicitly approved business tables; block writes, DDL, privilege commands, multiple statements, system catalogs and risky functions; clamp rows; apply statement timeout/output limits. Use a distinct PostgreSQL reader role with SELECT-only privileges. **Never expose an arbitrary-SQL execution endpoint.** The execute API must accept only a server-stored, validated preview ID and validate it again.

### Milestone 4 - execution, conversation history, and query results

Implement owner-authorized execute-by-preview-ID, read-only transaction, result truncation, row-count/duration tracking, query history, persisted chat sessions/messages, helpful/not-helpful feedback, table display, and suitable charts. Recheck the user's permissions and the stored query's status at execution. Add security integration tests. The browser must never be able to modify the SQL after preview and pass it to execution.

### Milestone 5 - data quality and ML inference

Implement actual profiling rules and findings, not placeholder responses. Fit and serve a small scikit-learn IsolationForest for synthetic telemetry outlier detection. Include model metadata/version and tests. Never call the anomaly score a failure probability. Add Data Quality and Anomaly Monitor views.

### Milestone 6 - evaluation and regression testing

Create at least 30 manually reviewed benchmark cases covering filters, aggregations, joins, fixed-date conditions, semantic definitions, at least 8 multi-turn steps/cases, ambiguity, unsupported intent, empty results, and security policy rejection. Each answerable case needs expected rows/aggregates or a verified query. Expected SQL/answer must not be shown to the LLM during generation. Build a runner that records actual result metrics by benchmark/provider/mode/dataset/prompt version. Unit tests must work offline with a fake LLM. Compare a simple baseline and the guarded path under the same essential database safety controls. Never fabricate scores or remove failed cases silently.

### Milestone 7 - operational polish and delivery

Finish Dockerfiles and Docker Compose; `.env.example`; `.gitignore`; database roles; health/readiness checks; structured logs without secrets/raw rows; rate limiting and Redis cache only if core correctness is complete; responsive/accessibility review; production build/type checks; backend tests; README; architecture/API/security/evaluation/demo docs. Kubernetes and MLflow are stretch goals unless the user/instructor explicitly prioritizes them after the MVP passes.

## Non-negotiable safety and implementation rules

- Do not hard-code or print API keys, passwords, tokens, or database credentials.
- Do not assume Antigravity's coding-agent model credentials are available to the running web application. Runtime inference requires a separately configured provider/key.
- If no external key exists, keep the app usable via deterministic demo mode and label that mode visibly. Never pretend demo mode called a real LLM.
- Do not invent Cisco data or use proprietary data. Seed synthetic educational data locally.
- Do not use the LLM as the security boundary; enforce AST validation and database permissions in code.
- Never run dangerous SQL as a test. Test rejection and verify database state safely.
- Do not create hard-coded analytics figures, fake benchmark values, fake ML results, or UI controls that do nothing.
- Avoid automatic data mutation/cleaning. The MVP suggests fixes but does not apply them.
- Do not claim device-failure prediction from unsupervised outlier scores.
- Do not add vector search just for appearance; use it only for a meaningful semantic retrieval feature.
- Do not add more agents unless there is a clear, tested reason. Prefer deterministic services for validation and policy enforcement.
- Never mark an item complete unless the code and relevant tests/build were run and the output supports the claim.
- Make small, reviewable changes; keep modules focused; maintain type annotations; handle errors explicitly; keep API contracts stable.
- Do not remove failing tests just to achieve a green status. Fix the defect or document a real blocker.

## Required UI quality

Deliver an enterprise-style, consistent, responsive interface. Include loading, empty, success, and error states; clear labels for demo/provider mode; visible SQL validation; a blocked-query explanation; tables/charts from actual APIs; and no fake metrics. Use keyboard-accessible controls and readable contrast. Check the browser/console when browser verification is available.

## Required progress reporting

At the end of each milestone, update `docs/BUILD_STATUS.md` and report:
- implemented files/features;
- commands actually executed;
- test/build results with pass/fail counts;
- visual/browser checks actually performed;
- known bugs and limitations;
- next milestone.

If a command fails, diagnose and fix it before proceeding. Do not claim unrun tests passed. If blocked by a missing key/tool, deliver a labelled demo fallback and state the limitation.

## Final acceptance gate

Before declaring done, verify the checklist in `PROJECT_SPEC.md`, run migrations and seeding from a clean state, run all tests and the frontend production build, exercise the primary demo journey, validate that unsafe SQL is blocked and the DB reader cannot write, run the actual benchmark in the available mode, inspect the UI, and update documentation to match what really works. Provide exact run/test commands and a truthful list of remaining gaps.

Begin now with Milestone 0: inspect the workspace and present the plan. Do not generate the entire application in one pass.
