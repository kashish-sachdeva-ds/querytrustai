# QueryTrust AI - Persistent Engineering Rules

## Sources of truth
- Read `PROJECT_SPEC.md` before implementing or changing architecture.
- Follow `ANTIGRAVITY_MASTER_PROMPT.md` milestone gates.
- Keep `docs/BUILD_STATUS.md` truthful and current.

## Core invariants
- The natural-language analytics path is read-only for every user role.
- Use a dedicated database reader with SELECT-only privileges for query execution.
- Do not expose arbitrary SQL execution; execute only a server-stored, validated preview ID.
- Parse SQL using SQLGlot in PostgreSQL dialect; require a single SELECT-only statement and restrict tables/functions; clamp rows and enforce time/output limits.
- Revalidate on execution. LLM instructions are not a security boundary.
- The browser is untrusted: enforce authentication, ownership, and role checks on the backend.
- No real Cisco/customer data, branding, or claims of affiliation. Use synthetic educational data only.
- Do not perform autonomous data cleanup or mutate business tables from a natural-language query.
- Never describe an IsolationForest score as a probability of device failure.
- Never fabricate app results, ML outputs, test passes, model quality, or benchmark metrics.

## Runtime configuration and privacy
- Never hard-code secrets or commit `.env`.
- Keep `.env.example` current and use environment variables for credentials.
- Do not assume Antigravity's coding-agent credentials are available to the running app.
- If no external LLM key is configured, use a visibly labelled demo mode; do not claim a live inference call occurred.
- Never log API keys, passwords, tokens, connection strings, or raw result datasets.

## Engineering quality
- Keep frontend, routes, schemas, domain services, providers, data access, and tests separated.
- Use typed request/response models, migrations, bounded pagination, error handling, and stable API contracts.
- Implement tests for safety and authorization before considering features complete.
- Do not delete or weaken tests to get a green build; fix the cause or document the blocker.
- Run tests/builds in the actual workspace and report only observed outputs.
- Use small milestones. Do not scaffold and stop. Update the build status at each milestone.
- UI must include loading, empty, success and error states and be keyboard/responsive accessible.
- Do not add dependencies, agent frameworks, vector stores, or services without a clear need.

## Completion discipline
A feature is done only when implemented, relevant tests pass, UI is inspected when feasible, docs are updated, and limitations are reported. Never state that an unrun test or deployment is successful.
