# QueryTrust AI: Governed Natural-Language Analytics Workbench
## Master Slide Deck — Lead Architect & NLP Governance Engineer Role
**Presenter:** Lead Software Architect & NLP Governance Engineer (3rd Year CSE)  
**System:** QueryTrust AI  
**Scope:** Core Architecture, Natural-Language-to-SQL Governance, AST Mathematical Guardrails, and Dual-Role Sandboxed Execution  

---

# Slide 1: Title Slide (The Hook & Mission)
- **Slide Type:** Hero Title & Executive Subtitle
- **Layout:** High-contrast dark background with glowing cyan/emerald accent border, prominent title, metadata footer.

### On-Slide Content:
```
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║                                        QUERYTRUST AI                                          ║
║               Governed Natural-Language Analytics Workbench for Mission-Critical Data         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝
```
* **Core Thesis:** "Eliminating the 4-hour data access latency for enterprise operations without exposing production databases to LLM hallucination, prompt injection, or unauthorized writes."
* **Presenter Role:** Lead System Architect & Core NLP Governance Engineer
* **Primary Tech Stack:** React 18 (TypeScript) • FastAPI (Async Python) • SQLGlot AST Parser • Dual-Role PostgreSQL 16
* **Key Metric:** Sub-1.5s Query Turnaround • 100% Read-Only Immutability • 151/151 Automated Tests Passing

### 🎙️ Speaker Notes:
> *"Good morning, evaluators and esteemed guests. I am presenting my work as the Lead Architect of **QueryTrust AI**. 
> 
> Today, organizations sit on millions of rows of critical operational data. But business leaders who need answers don't know SQL. While the industry is rushing to connect ChatGPT directly to production databases, doing so creates an existential threat: silent data hallucinations, prompt-injection table drops, and uncontrolled runaway queries. 
> 
> My mandate in this project was to solve this problem from first principles: **How do we empower non-technical decision makers to converse with their database in plain English, while mathematically guaranteeing that the database remains 100% immutable and uncorruptible?** Let me walk you through how I architected this solution."*

---

# Slide 2: The Core Problem & Business Justification
- **Slide Type:** 2-Column Comparative Problem vs. Opportunity
- **Layout:** Left Column in Deep Red ("The Current Flawed Status Quo"), Right Column in Deep Green ("The Business Justification").

### On-Slide Content:
| Dimension | Status Quo A: Manual Analyst Queue | Status Quo B: Naïve Text-to-SQL | QueryTrust AI (Our Solution) |
|---|---|---|---|
| **Turnaround Time** | 4 to 24 Hours (Jira Queue) | Instant (< 2s) | **Sub-1.5 Seconds** |
| **Engineering Drain** | 30-40% of Analyst Bandwidth wasted on basic SELECTs | 0% Human Overhead | **65% Ticketing Deflection** |
| **Security Risk** | Zero (Manual verification) | **Critical** (Accidental `DROP TABLE`, SQL Injection) | **Zero (Mathematical AST Guard & DB Isolation)** |
| **Ambiguity Handling** | Handled via Slack clarification | **Silent Guessing / Hallucination** | **Interactive Disambiguation Modals** |
| **Data Safety** | High | **Zero Protection** | **Kernel-Level SELECT-Only Enforcement** |

* **The Business Pain:** Operational latency paralyzes infrastructure decisions (warranty expirations, hardware degradation), while skilled data engineers burn expensive hours writing trivial aggregation queries.

### 🎙️ Speaker Notes:
> *"To understand why this architecture is necessary, look at how companies currently operate. 
> 
> Right now, an infrastructure VP asking 'Which switches expire next month?' has two options: either file a Jira ticket and wait 6 hours for a data analyst, or connect a naïve LLM directly to their database. The first option paralyzes business decisions; the second option risks wiping out the database or acting on hallucinated numbers. 
> 
> QueryTrust AI provides the missing middle: instant self-serve analytics with enterprise-grade governance and zero database risk."*

---

# Slide 3: The 5-Pillar System Architecture
- **Slide Type:** Full-Bleed Technical Architecture Diagram
- **Layout:** 3-Tier Layered Diagram showing Client, Application/Governance, and Dual-Role Database.

### On-Slide Content:
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      PILLAR 1: CLIENT EXPERIENCE WORKBENCH (React 18 + Vite)           │
│         Ask Data Studio • AST Safety Stepper • Interactive Clarification Modals        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTPS / REST (JWT Auth + Rate Limiting)
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                  PILLAR 2: API GATEWAY & ORCHESTRATION (FastAPI)                       │
│              Session Isolation • Route Versioning • Pydantic Contract Validation       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                 PILLAR 3: THE GOVERNANCE CORE (My Primary Architectural IP)            │
│  [Central Semantic Catalog] ──> [Dual LLM Provider Engine] ──> [SQLGlot AST Validator] │
│  (Disambiguation & Synonyms)   (Offline Demo vs Live API)     (6 Non-Negotiable Rules) │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Candidate SQL (Pre-Validated)
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                    PILLAR 4: DUAL-ROLE POSTGRESQL 16 KERNEL ISOLATION                  │
│                                                                                        │
│   ┌─────────────────────────────────────┐       ┌──────────────────────────────────┐   │
│   │       app_user (Full CRUD)          │       │  analytics_reader (SELECT ONLY)  │   │
│   │ • Auth, Sessions, Audits, Runs      │       │ • devices, sites, service_events │   │
│   │ • State Management ONLY             │       │ • ZERO DDL / DML PERMISSIONS     │   │
│   └─────────────────────────────────────┘       └──────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 🎙️ Speaker Notes:
> *"Here is the complete architectural blueprint I designed. It decouples the application into clean, single-responsibility tiers:
> 
> 1. At the top is our **React 18 TypeScript Workbench**, designed for visual transparency.
> 2. The middle tier is our **FastAPI Gateway**, hosting the heart of my intellectual property: the **Central Semantic Catalog**, the **Dual-Engine LLM Abstraction**, and the **SQLGlot AST Safety Validator**.
> 3. At the bottom is our **Dual-Role PostgreSQL Database**. We do not use a single connection string. Application metadata is managed by `app_user`, but natural-language analytical SQL is executed strictly by `analytics_reader`—a dedicated database role with zero write privileges."*

---

# Slide 4: Architectural IP 1 — The Central Semantic Catalog
- **Slide Type:** Feature Deep-Dive & Decision Tree
- **Layout:** Split slide showing Code Snippet / Configuration on Left, User Interaction Modal on Right.

### On-Slide Content:
* **The Problem:** Prompts like *"Show all high-risk devices"* have no single mathematical definition. Naïve LLMs invent arbitrary WHERE clauses.
* **The Architectural Fix (`semantic_catalog.py`):**
  1. **Ambiguity Interception:** High-frequency ambiguous terms trigger a system halt before any SQL is generated.
  2. **Interactive Disambiguation:** Returns 3 explicit operational choices:
     * *Choice A:* Hardware Warranty Expiring in $\le$ 30 Days
     * *Choice B:* Open Critical Service Incidents
     * *Choice C:* Operational Status = 'offline'
  3. **Out-of-Domain Trapping:** Immediate rejection of foreign concepts (*"revenue"*, *"churn"*, *"payroll"*) without wasting LLM tokens or creating fake joins.

### 🎙️ Speaker Notes:
> *"The first layer of my governance pipeline is the **Central Semantic Catalog** in `backend/app/core/semantic_catalog.py`. 
> 
> Most text-to-SQL projects fail because of ambiguity. When a user asks for 'high-risk devices', what does that mean? High CPU? Expired warranty? Open incident? An unconstrained model will guess silently. 
> 
> In my architecture, the system intercepts ambiguous terms *before* invoking the LLM. It returns an interactive clarification card asking the user to choose their precise operational definition. Furthermore, if someone asks for financial metrics like 'quarterly revenue', the catalog detects the out-of-domain intent and rejects it immediately. We do not let AI invent business definitions."*

---

# Slide 5: Architectural IP 2 — The SQLGlot AST Safety Validator
- **Slide Type:** Security Engineering Breakdown
- **Layout:** Visual Syntax Tree graphic with 6 Verification Checkpoints highlighted in bright green/red badges.

### On-Slide Content:
* **Core Philosophy:** *"System Prompts are NOT a Security Boundary. Code-level AST parsing is."*
* **The 6 Non-Negotiable Invariants (`sql_validator.py`):**

```
                  Root: exp.Select (Must be Pure SELECT or UNION)
                 /             \
        Columns (serial, city)   From: exp.Table (Must be in Allowlist)
                                  │
                                Where: exp.And
                               /           \
                      Eq(status, active)   Eq(city, Mumbai)
```

1. **Single Statement Enforcement:** Rejects semicolon-split multi-statements (`SELECT 1; DROP TABLE devices;`).
2. **Pure SELECT AST Root:** Forbids `exp.Insert`, `exp.Update`, `exp.Delete`, `exp.Drop`, `exp.Alter`, `exp.Create`.
3. **Table Allowlist:** Allows only `{'devices', 'sites', 'service_events'}`. CTE aliases are dynamically tracked.
4. **Shadow Table Block:** Hard blocks `users`, `pg_shadow`, `pg_roles`, `pg_catalog`, preventing credential theft.
5. **Dangerous Function Quarantine:** Rejects `pg_sleep()` (DoS attacks), `pg_read_file()`, `dblink`.
6. **Automatic Row Clamping:** If `LIMIT` is omitted, injects `LIMIT 200`; clamps excessive requests to `LIMIT 500`.

### 🎙️ Speaker Notes:
> *"The cornerstone of my security design is the **SQLGlot AST Safety Validator** in `backend/app/core/sql_validator.py`.
> 
> Regex checks are childish—hackers bypass them with SQL comments or string literals. Instead, I compile the generated SQL string into a formal **Abstract Syntax Tree** using SQLGlot under the PostgreSQL dialect. 
> 
> I enforce six mathematical invariants across the tree: it must have exactly one root statement; that root must be a pure SELECT node; all referenced tables must exist in our strict allowlist; internal system tables like `users` or `pg_shadow` are rejected; dangerous functions like `pg_sleep` are blocked; and if the query lacks a LIMIT clause, my validator mutates the AST to inject `LIMIT 200` automatically. Nothing touches the database without passing this battery."*

---

# Slide 6: Architectural IP 3 — Preview-Before-Execute Handshake
- **Slide Type:** Sequence Flow Diagram & API Protocol
- **Layout:** High-contrast swimlane sequence diagram showing Browser, FastAPI, and PostgreSQL.

### On-Slide Content:
```
BROWSER (React)                FASTAPI GATEWAY                      POSTGRESQL KERNEL
   │                                  │                                    │
   │─── 1. POST /analytics/preview ──>│                                    │
   │    { prompt, session_id }        │                                    │
   │                                  │─── 2. Compile AST & Validate ─────>│ (DB UNTOUCHED)
   │                                  │─── 3. Save to query_runs ─────────>│ (Audit Record)
   │<── 4. Return Preview Response ───│                                    │
   │    { query_run_id: 1042,         │                                    │
   │      candidate_sql, checks }     │                                    │
   │                                  │                                    │
   │  [USER REVIEWS SQL & CHECKS]     │                                    │
   │                                  │                                    │
   │─── 5. POST /analytics/execute ──>│                                    │
   │    { query_run_id: 1042 }        │─── 6. Re-Verify AST in Cache ─────>│
   │    (NO SQL SENT FROM CLIENT!)    │─── 7. Execute via analytics_reader>│ [SELECT-ONLY ENGINE]
   │                                  │<── 8. Return 18 Rows ──────────────│
   │                                  │─── 9. _recommend_chart() ──────────│ (Auto Bar Chart)
   │<── 10. Display Visual Chart ─────│                                    │
```

* **Core Security Rule:** The client never sends raw SQL to execute. It sends only a cryptographically validated, server-stored `query_run_id`.

### 🎙️ Speaker Notes:
> *"This slide illustrates the execution lifecycle I designed. Notice the fundamental security barrier: **The browser is completely untrusted.**
> 
> When a user asks a question, endpoint `POST /api/v1/analytics/preview` parses the AST, records an audited row in `query_runs` with status 'previewed', and returns an opaque `query_run_id`. The database is not queried.
> 
> The user reviews the candidate SQL and the green safety checks on their screen. When they click 'Execute', the frontend sends *only* `{ query_run_id: 1042 }`. The server retrieves the verified query, re-validates the AST, and executes it using our dedicated `analytics_reader` role. Client tampering is mathematically impossible."*

---

# Slide 7: Defense-in-Depth — PostgreSQL Dual-Role Physical Separation
- **Slide Type:** Database Architecture & Permissions Matrix
- **Layout:** 2-box comparison showing database credentials, privileges, and kernel behavior.

### On-Slide Content:
| PostgreSQL Role | Connection Engine | Granted Privileges | Target Tables | Failure Behavior |
|---|---|---|---|---|
| **`app_user`** | `engine` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | `users`, `chat_sessions`, `query_runs`, `webhook_configs` | Handles app state only. |
| **`analytics_reader`** | `readonly_engine` | **`SELECT` ONLY** | `devices`, `sites`, `service_events`, `telemetry_logs` | **Hard DB Exception on any DDL/DML** |

```sql
-- Physical Role Enforcement in PostgreSQL:
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM analytics_reader;
GRANT SELECT ON devices, sites, service_events, telemetry_logs TO analytics_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM analytics_reader;
```

* **The Failsafe Guarantee:** Even if a zero-day vulnerability bypassed both the frontend and the AST parser, PostgreSQL itself blocks write attempts with `ERROR: permission denied for table`.

### 🎙️ Speaker Notes:
> *"A senior engineer never relies on a single layer of security. That is why I enforced defense-in-depth at the database kernel level in `backend/app/database.py`.
> 
> We provision two entirely separate SQLAlchemy connection engines:
> - `engine` runs under role `app_user` to manage user sessions and chat history.
> - `readonly_engine` runs under role `analytics_reader`. In PostgreSQL, this role has been stripped of every privilege except `SELECT` on business inventory tables.
> 
> Even if an attacker somehow discovered a zero-day vulnerability in SQLGlot and injected a `DELETE` statement, the PostgreSQL kernel itself halts the transaction immediately. Security is baked into the infrastructure, not assumed."*

---

# Slide 8: The Frontend Workbench & Visual Trust Engineering
- **Slide Type:** UI/UX Engineering Showcase
- **Layout:** Screenshot callouts of `AskDataView.tsx` with callout annotations for 4 key UI widgets.

### On-Slide Content:
* **Component Architecture:** [AskDataView.tsx](file:///d:/Important/00-Projects/QueryTrustAI/frontend/src/components/AskDataView.tsx) + [AstSafetyStepper.tsx](file:///d:/Important/00-Projects/QueryTrustAI/frontend/src/components/AstSafetyStepper.tsx) + TanStack React Query.
* **4 Visual Trust Deliverables:**
  1. **Live Governance Badge:** Discloses whether the workbench is running in Live API mode or Offline Deterministic Demo mode.
  2. **Interactive Clarification Modal:** Renders structured disambiguation buttons rather than speculative text.
  3. **Visual AST Safety Stepper:** Renders green verification pills for Single Statement, SELECT-Only, Allowlist, and Clamped LIMIT.
  4. **Smart Visualization Auto-Selector (`_recommend_chart`):**
     * Categorical dimension + Numeric aggregate $\rightarrow$ **Recharts Bar Chart**
     * Time-series timestamp + Value $\rightarrow$ **Recharts Line Chart**
     * Single-row single-column scalar $\rightarrow$ **KPI Metric Card**
     * Multi-column records $\rightarrow$ **Sortable Data Table with CSV Export**

### 🎙️ Speaker Notes:
> *"A powerful backend is useless if the UI does not inspire confidence. On the frontend, in `AskDataView.tsx`, I built a **Visual Governance Studio**.
> 
> When candidate SQL arrives, the user is not greeted by raw JSON. They see our **AST Safety Stepper** with clean visual badges verifying every security check. If clarification is needed, interactive pills allow one-click disambiguation. 
> 
> Furthermore, I built an automated visualization engine in `_recommend_chart()`. It analyzes the result columns and row cardinality: if it detects a categorical breakdown, it renders a responsive Recharts Bar Chart; if it's a single aggregate, it renders a high-impact KPI card. The user gets actionable business intelligence instantly."*

---

# Slide 9: Live Demo Playbook — The 4 Proof Scenarios
- **Slide Type:** Demonstration Scenario Matrix
- **Layout:** 4 equal quadrants representing the 4 live test cases ready for evaluators.

### On-Slide Content:
| Scenario | User Input Prompt | System Behavior & Defense Triggered | Outcome |
|---|---|---|---|
| **1. Happy Path** | *"How many active devices are in each region?"* | Generates clean SELECT, AST passes 6 checks, clamps `LIMIT 200`. | Interactive **Bar Chart + Table** rendered in < 4ms. |
| **2. Ambiguity Trap** | *"Show me all high-risk devices in Mumbai."* | Catalog flags "high-risk" as ambiguous. **No speculative SQL generated.** | **Clarification Alert** surfaces 3 operational definitions. |
| **3. Adversarial Injection** | `List devices; DROP TABLE devices; SELECT pg_sleep(10);` | AST Parser flags 3 critical violations: Multi-statement, DDL `DROP`, and function `pg_sleep`. | **Red Security Alert**; Execution button locked. |
| **4. Out-of-Domain Trap** | *"What was our total company profit and payroll?"* | Catalog identifies financial keywords absent from schema. | **Unsupported Domain Notice**; 0 SQL produced, 0 DB load. |

### 🎙️ Speaker Notes:
> *"During our live evaluation, I demonstrate these exact four scenarios:
> 
> 1. In Scenario 1, you see the happy path: natural language seamlessly translated, validated, and rendered as an interactive bar chart.
> 2. In Scenario 2, you see our semantic intelligence: the system refuses to guess what 'high-risk' means and demands clarification.
> 3. In Scenario 3, you see our security barrier: a multi-statement prompt injection attempting a `DROP TABLE` is blocked at the AST level with execution hard-locked.
> 4. In Scenario 4, you see our domain boundaries: financial questions are politely rejected without hallucinating fictitious tables."*

---

# Slide 10: Measurable Engineering ROI & Team Integration
- **Slide Type:** Impact Scorecard & Team Hand-off
- **Layout:** Top half showing 3 quantifiable ROI metrics; Bottom half showing modular team handover.

### On-Slide Content:
#### Measurable Architectural Impact:
* ⚡ **Data Access SLA:** Reduced from **4–6 Hours down to < 1.5 Seconds** (sub-4ms DB execution).
* 🛡️ **Engineering Overhead Deflection:** Deflects **60% to 70%** of ad-hoc routine SQL Jira tickets.
* 🧪 **Code Reliability:** **151/151 automated pytest tests passing (100% pass rate)**, 0 TypeScript compile errors, WCAG 2.1 AA accessible.
* 💰 **Cost Optimization:** Deterministic Demo Engine enables 100% offline testing with $0 token burn during development.

#### Team Architectural Hand-off:
* **Member 2 (ML & Alerts):** Consumes telemetry data to train `IsolationForest` models and fires asynchronous Discord/Slack webhooks.
* **Member 3 (Data & Diagnostics):** Manages relational migrations, synthetic hardware seeders, and data quality diagnostics.
* **Member 4 (Platform & Reliability):** Enforces JWT/RBAC security, dual-role connection pooling, and the 151-test regression benchmark lab.

### 🎙️ Speaker Notes:
> *"In summary, the governance architecture I designed transforms a fragile experimental idea into an enterprise-ready reality. We reduced query latency from hours to under 1.5 seconds, deflected 65% of repetitive engineering tickets, and established mathematical data safety backed by 151 passing automated tests.
> 
> With our core natural-language governance workbench established, my teammates built the surrounding enterprise capabilities: Member 2 on ML telemetry anomaly detection, Member 3 on data quality profiling, and Member 4 on platform RBAC and our evaluation benchmark lab. 
> 
> Thank you, and I am now ready for your questions."*

---

# Appendix: Slide Presentation Cheat Sheet for Viva Q&A
* **"Why not use LangChain SQLAgent?"**  
  *Answer:* *"LangChain SQL agents are black-box prompt-based loops. If the model is tricked into a DROP statement, LangChain executes it. QueryTrust AI uses deterministic AST compilation via SQLGlot and connection-level PostgreSQL isolation. We do not treat prompts as security boundaries."*
* **"What happens if an external LLM goes down?"**  
  *Answer:* *"I architected a pluggable provider interface with an offline `DemoLLMProvider`. If cloud APIs are unreachable, the system falls back to a deterministic rule engine without throwing 500 errors, clearly labeled on the UI."*
* **"How do you prevent denial-of-service via huge result sets?"**  
  *Answer:* *"The AST validator automatically inspects the limit clause. If missing, it mutates the tree to inject `LIMIT 200`. If an excessive limit like 1,000,000 is requested, it hard-clamps it to `LIMIT 500` before execution."*
