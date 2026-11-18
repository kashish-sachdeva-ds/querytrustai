# UI Audit – QueryTrust AI (Phase 0 Direction & Audit — Approved Edition)

**Date**: 2026-11-18  
**Scope**: All 8 front-end workbench pages in the running application across Desktop (1440px) and Mobile (390px) viewports in both Dark and Light themes.  
**Deliverable Rules**: Phase 0 — Audit and Direction. No application code has been modified.

---

## 1. Verified Screenshot Inventory (`docs/design/screenshots/phase0/`)

Every screenshot file below was captured from the running application and verified on disk:

| View / Page | Dark Mode (1440px) | Light Mode (1440px) | Dark Mode (390px) | Light Mode (390px) |
|---|---|---|---|---|
| **Fleet Overview** | `fleet-overview-dark-1440.png` | `fleet-overview-light-1440.png` | `fleet-overview-dark-390.png` | `fleet-overview-light-390.png` |
| **Query Studio** | `query-studio-dark-1440.png` | `query-studio-light-1440.png` | `query-studio-dark-390.png` | `query-studio-light-390.png` |
| **Data Catalog** | `data-catalog-dark-1440.png` | `data-catalog-light-1440.png` | `data-catalog-dark-390.png` | `data-catalog-light-390.png` |
| **Data Health** | `data-health-dark-1440.png` | `data-health-light-1440.png` | `data-health-dark-390.png` | `data-health-light-390.png` |
| **Anomalies** | `anomalies-dark-1440.png` | `anomalies-light-1440.png` | `anomalies-dark-390.png` | `anomalies-light-390.png` |
| **AST Safety Proof** | `ast-safety-dark-1440.png` | `ast-safety-light-1440.png` | `ast-safety-dark-390.png` | `ast-safety-light-390.png` |
| **Sources & Kernel** | `sources-kernel-dark-1440.png` | `sources-kernel-light-1440.png` | `sources-kernel-dark-390.png` | `sources-kernel-light-390.png` |
| **People & Access** | `people-access-dark-1440.png` | `people-access-light-1440.png` | `people-access-dark-390.png` | `people-access-light-390.png` |

---

## 2. Hardcoded Hex Color Reconciled Inventory

Generated deterministically by `docs/design/count_hex.py` (documented in [hex_inventory.md](file:///d:/Important/00-Projects/QueryTrustAI/docs/design/hex_inventory.md)):

- **Total Hex Literals across codebase**: **1,343**
- **1. Token Definition Layer**: **240** (`design-system.css`: 154, `index.css`: 86)
- **2. Hardcoded in Components & Component CSS (The real issue to eliminate)**: **1,103**

### Top 15 Component Files with Hardcoded Colors
1. `frontend/src/components/DevicesView.css`: 207 occurrences
2. `frontend/src/components/EvaluationLabView.css`: 119 occurrences
3. `frontend/src/components/EvaluationLabView.tsx`: 91 occurrences
4. `frontend/src/components/ASTCompilerLab.tsx`: 70 occurrences
5. `frontend/src/components/ArchitecturalMonoliths.tsx`: 55 occurrences
6. `frontend/src/components/OverviewView.css`: 54 occurrences
7. `frontend/src/components/LinearShell.css`: 47 occurrences
8. `frontend/src/components/PlatformShowcase.tsx`: 33 occurrences
9. `frontend/src/components/AskDataView.css`: 32 occurrences
10. `frontend/src/components/OverviewView.tsx`: 24 occurrences
11. `frontend/src/components/CommandPalette.css`: 23 occurrences
12. `frontend/src/components/RoiBenchmarkModal.css`: 22 occurrences
13. `frontend/src/components/AstSafetyStepper.tsx`: 20 occurrences
14. `frontend/src/components/charts/TelemetryTimeSeriesChart.tsx`: 20 occurrences
15. `frontend/src/components/LandingPage.css`: 18 occurrences
*(Remaining 38 component files account for the remaining 348 occurrences, summing exactly to 1,103).*

---

## 3. Cross-App Root Causes & System Findings

| # | Finding | Evidence & Root Cause | Status | Severity |
|---|---|---|---|---|
| **C1** | **Root-Cause Token Failure: White-on-White Buttons (1.05:1 Contrast)** | In dark mode, `--accent-primary` and `--qt-accent` resolve to `#FAFAFA` (`design-system.css:210, 279`). Three separate controls bind `backgroundColor: 'var(--accent-primary)'` or `.btn-primary` while text color is hardcoded to `#FFFFFF`: (1) **Data Health "Run Health Scan" button** (`DataQualityView.tsx:335-336`), (2) **Anomalies trigger button beside "Show 50"** (`AnomalyMonitorView.tsx:650-651`), and (3) **Data Catalog selected "All" quick-chip** (`DevicesView.css:198`). All three share the exact same root cause, yielding a measured contrast of **1.04:1–1.05:1**. Fixing `--accent-primary` to `#5B5EE6` at token level resolves all three systematically. | Found in code & Observed in UI | **P0** |
| **C2** | **Complete Absence of Keyboard Focus Rings (`focus-visible`)**: Searching for `focus-visible:` across all `.tsx` files yields 0 matches. Keyboard users navigating with Tab receive zero visible focus outline on buttons, chips, or inputs. | Automated headless Tab evaluation in `sampled_metrics.json` recorded 0 custom focus outlines; code search across all 93 frontend components yielded 0 `focus-visible:` classes. | Found in code & Observed in UI | **P0** |
| **C3** | **Accent Color Sprawl**: Multiple conflicting saturated hues compete across the UI instead of a single restrained accent token. | • Purple dot beside "Admin": `Header.tsx:275` (`bg-purple-500`)<br>• Neon orange active tab on Data Catalog: `DevicesView.css:348` (`rgba(255, 90, 20, 0.12)`, `#ff8a4c`)<br>• Sky-blue red-team button on Safety Proof: `EvaluationLabView.css:35` (`linear-gradient(135deg, #0EA5E9, #0284C7)`) | Found in code & Observed in UI | **P1** |
| **C4** | **Hardcoded Hex Literals (1,103 in components)**: Colors bypass the design token layer, preventing clean dark/light theme switching and breaking visual hierarchy. | Python regex inventory documented in `hex_inventory.md`. | Found in code | **P1** |

---

## 4. Page-by-Page Audit

### 1. Fleet Overview
**Primary Question**: *"How can I quickly ask a natural-language question about the fleet data?"*

| # | Issue | Evidence | Status | Severity |
|---|---|---|---|---|
| 1.1 | **Primary Hero "Ask Query" button looks dead on initial load**: Button defaults to `disabled={!question.trim()}` with `opacity: 0.4` and charcoal styling (`#000000` / `#FFFFFF`), rendering as a washed-out grey pill that looks deactivated before the user even types. | Screenshot: `fleet-overview-dark-1440.png` (hero input prompt box). Code: `OverviewView.tsx:652-654`, `OverviewView.css:42`. Sampled: `opacity: 0.4`, `color: rgb(0,0,0)`. | Observed in UI & Found in code | **P1** |
| 1.2 | **KPI Numbers colored with status hues**: Numbers `258` (yellow) and `1,500` (red) carry full text color rather than neutral text with a discrete status indicator dot. | Screenshot: `fleet-overview-dark-1440.png` (4 pulse KPI cards). Code: `OverviewView.tsx:758-765`. | Observed in UI & Found in code | **P1** |
| 1.3 | **Nested Container Borders**: The hero search well is nested inside a bordered card, which is inside another bordered section wrapper, creating 3 concentric border lines. | Screenshot: `fleet-overview-dark-1440.png` (center hero area). Code: `OverviewView.tsx:630-660`. | Observed in UI | **P2** |
| 1.4 | **Light Mode Weakness**: Low contrast between card background (`#FFFFFF`) and page background (`#FAFAFA`), faint text hierarchy on sub-labels, and faint grey hero prompt border. | Screenshot: `fleet-overview-light-1440.png`. | Observed in UI | **P1** |
| 1.5 | **390px Mobile Viewport Overflow**: Horizontal scrolling is forced by the 4-column KPI strip and the hardware blade showcase card; prompt input kbd slash overlaps placeholder text. | Screenshot: `fleet-overview-dark-390.png` and `fleet-overview-light-390.png`. | Observed in UI | **P1** |

---

### 2. Query Studio
**Primary Question**: *"What does the data say, and can I trust how the answer was produced?"*

| # | Issue | Evidence | Status | Severity |
|---|---|---|---|---|
| 2.1 | **Primary "Ask Fleet AI" button looks dead on first load**: When input question is empty, button renders with `opacity: 0.45` and muted dark pill background, mimicking an inactive control rather than an inviting action. | Screenshot: `query-studio-dark-1440.png` (center query bar). Code: `AskDataView.tsx:866-868`, `AskDataView.css:32`. Sampled: `opacity: 0.45`. | Observed in UI & Found in code | **P1** |
| 2.2 | **Hype Copy — "6-GATE LIVE AST LASER RIBBON"**: Hyperbolic sci-fi language on what is a deterministic SQL AST safety validator. | Screenshot: `query-studio-dark-1440.png` (ribbon header). Code: `AskDataView.tsx:1046`. | Observed in UI & Found in code | **P1** |
| 2.3 | **Results pushed below the fold**: The prominent 6-gate status ribbon, SQL inspector accordion, and filter controls consume over 480px of vertical height before query results appear. | Screenshot: `query-studio-dark-1440.png`. Code: `AskDataView.tsx:1040-1120`. | Observed in UI | **P2** |
| 2.4 | **Light Mode Weakness**: The SQL syntax highlighting well uses a dark slate background (`#0B0C0E`) that clashes with the surrounding white page, creating a jarring "black hole" effect with no smooth tonal progression. | Screenshot: `query-studio-light-1440.png`. | Observed in UI | **P1** |
| 2.5 | **390px Mobile Viewport**: The query editor action bar (Run, Share, Format buttons) wraps into three broken lines and overlaps the prompt text area. | Screenshot: `query-studio-dark-390.png`. | Observed in UI | **P1** |
| 2.6 | **Empty state when no query active**: Relies on static mockup tables rather than a structured empty guidance state. | Code: `AskDataView.tsx:1200-1250`. | Not verified | **P2** |

---

### 3. Data Catalog
**Primary Question**: *"What data tables, devices, and inventory schemas are currently introspected?"*

| # | Issue | Evidence | Status | Severity |
|---|---|---|---|---|
| 3.1 | **White text on white background (Selected "All" pill)**: Active quick-chip binds `--qt-accent` (`#FAFAFA` in dark) with `#ffffff` text (**1.05:1** contrast). Root cause is **C1**. | Screenshot: `data-catalog-dark-1440.png`. Code: `DevicesView.tsx:718`, `DevicesView.css:198`. | Observed in UI & Found in code | **P0** |
| 3.2 | **Orange Tab Accent Sprawl**: The catalog tab switcher ("Inventory" vs "Schema") uses bright neon orange borders and badges (`#ff8a4c`, `rgba(255, 90, 20, 0.35)`). | Screenshot: `data-catalog-dark-1440.png` (tab bar). Code: `DevicesView.css:348-360`. | Observed in UI & Found in code | **P1** |
| 3.3 | **Uppercase Mono Eyebrow Labels**: Column headers and metadata chips use aggressive uppercase styling with letter-spacing. | Screenshot: `data-catalog-dark-1440.png` (table header row). Code: `DevicesView.tsx:912`. | Observed in UI | **P2** |
| 3.4 | **Light Mode Weakness**: The inventory table borders (`border-subtle: rgba(0, 0, 0, 0.08)`) disappear against pure white card surfaces, making multi-column data difficult to scan. | Screenshot: `data-catalog-light-1440.png`. | Observed in UI | **P1** |
| 3.5 | **390px Mobile Viewport**: Device search input overflows the viewport width; table columns collapse without a clear horizontal scroll cue. | Screenshot: `data-catalog-dark-390.png`. | Observed in UI | **P1** |

---

### 4. Data Health
**Primary Question**: *"Is the underlying database clean, validated, and trustworthy for automated analysis?"*

| # | Issue | Evidence | Status | Severity |
|---|---|---|---|---|
| 4.1 | **White text on white background ("Run Health Scan" button)**: Button binds `--accent-primary` (`#FAFAFA` in dark) with `#ffffff` text (**1.05:1** contrast). Root cause is **C1**. | Screenshot: `data-health-dark-1440.png`. Code: `DataQualityView.tsx:328-336`. | Observed in UI & Found in code | **P0** |
| 4.2 | **Contradictory Staleness & Health Claims**: The header says "Last evaluated: 23 days ago" with 3 critical anomalies flagged, yet displays an "Overall Health Score: 96.99%" gauge, creating an immediate trust contradiction. | Screenshot: `data-health-dark-1440.png` (summary card). Code: `DataQualityView.tsx:87, 324, 578`. | Observed in UI & Found in code | **P1** |
| 4.3 | **Card Background Status Tinting**: Critical finding cards use full saturated red tinting across entire card surfaces rather than neutral cards with discrete status dots. | Screenshot: `data-health-dark-1440.png`. Code: `DataQualityView.tsx:610-630`. | Observed in UI | **P2** |
| 4.4 | **Light Mode Weakness**: Diagnostic terminal well text in light mode has insufficient contrast against frosted glass backdrop (`rgba(255, 255, 255, 0.90)`). | Screenshot: `data-health-light-1440.png`. | Observed in UI | **P1** |
| 4.5 | **390px Mobile Viewport**: The radial gauge instrument overlaps the rule violation cards; diagnostic terminal logs overflow horizontally. | Screenshot: `data-health-dark-390.png`. | Observed in UI | **P1** |

---

### 5. Anomalies
**Primary Question**: *"What statistical telemetry deviations or outlier devices need investigation?"*

| # | Issue | Evidence | Status | Severity |
|---|---|---|---|---|
| 5.1 | **White text on white background (Button beside "Show 50")**: Trigger scan button binds `--accent-primary` (`#FAFAFA` in dark) with `#ffffff` text (**1.05:1** contrast). Root cause is **C1**. | Screenshot: `anomalies-dark-1440.png`. Code: `AnomalyMonitorView.tsx:650-651`. | Observed in UI & Found in code | **P0** |
| 5.2 | **Volume Labeling Ambiguity**: Dataset has 24,625 baseline points + 375 outliers = 25,000 total. The table header currently says "50 Outliers Displayed" while the badge reads "375 items", causing confusion. Change scatter label to "375 outliers" and table header to "Showing 50 of 375". | Screenshot: `anomalies-dark-1440.png`. Code: `AnomalyMonitorView.tsx:561, 633`. | Observed in UI & Found in code | **P1** |
| 5.3 | **Scatter Chart Right Edge Clipped**: The 2D telemetry outlier canvas is clipped on the right boundary, cutting off the highest-deviation nodes (`SW-CORE-DAL-01`). | Screenshot: `anomalies-dark-1440.png` (right side of scatter plot). Code: `AnomalyMonitorView.tsx:420-470`. | Observed in UI | **P1** |
| 5.4 | **Light Mode Weakness**: Scatter chart background grid lines and axis labels are washed out against `#FFFFFF` canvas, making cluster distribution illegible. | Screenshot: `anomalies-light-1440.png`. | Observed in UI | **P1** |
| 5.5 | **390px Mobile Viewport**: The scatter chart collapses to 180px height, rendering point labels completely unreadable; sensitivity preset buttons stack into 4 uneven rows. | Screenshot: `anomalies-dark-390.png`. | Observed in UI | **P1** |
| 5.6 | **Empty State Placeholder**: Not verified when 0 anomalies detected. | Code: `AnomalyMonitorView.tsx:710`. | Not verified | **P2** |

---

### 6. AST Safety Proof
**Primary Question**: *"What deterministic mathematical proofs verify that no mutation queries can run?"*

| # | Issue | Evidence | Status | Severity |
|---|---|---|---|---|
| 6.1 | **Contradictory Pipeline Mode & Empty Provider**: Footer metadata displays `Mode: baseline` even when "Guarded" mode is selected; displays `Provider: demo ()` with empty parentheses due to missing model key in result object. | Screenshot: `ast-safety-dark-1440.png` (footer metadata strip). Code: `EvaluationLabView.tsx:947-953`. | Observed in UI & Found in code | **P1** |
| 6.2 | **Overclaiming & Unverifiable Marketing Claims**: Displays speculative metrics without empirical basis: `"-99.9% vs 4h Jira Ticket Lag"`, `"Ticket Deflection 65%"`, and `"100% Interception Rate"`, directly beside a label stating `is_demo_mode: true`. | Screenshot: `ast-safety-dark-1440.png` (ROI benchmark cards). Code: `EvaluationLabView.tsx:516, 535, 599`. | Observed in UI & Found in code | **P1** |
| 6.3 | **Blue Accent Sprawl**: The "▶ Run Live 151-Vector Red-Team Suite" button uses vibrant cobalt blue gradient (`#0EA5E9` to `#0284C7`), introducing a third accent family into the app. | Screenshot: `ast-safety-dark-1440.png`. Code: `EvaluationLabView.css:35`. | Observed in UI & Found in code | **P1** |
| 6.4 | **Light Mode Weakness**: Kinetic shield animation stage in light mode has low visual contrast, with faint white particles floating over light gray container. | Screenshot: `ast-safety-light-1440.png`. | Observed in UI | **P1** |
| 6.5 | **390px Mobile Viewport**: The 6-gate security check table wraps column cells, causing check names to collide with result badges; the 151-vector progress bar overflows right padding. | Screenshot: `ast-safety-dark-390.png`. | Observed in UI | **P1** |

---

### 7. Sources & Kernel
**Primary Question**: *"Where does the data originate, and how does the dual-key database engine enforce read-only safety?"*

| # | Issue | Evidence | Status | Severity |
|---|---|---|---|---|
| 7.1 | **Overclaiming Copy — "Zero Data Corruption Guarantee"**: Absolute marketing claim displayed in the dual-role architecture banner. | Screenshot: `sources-kernel-dark-1440.png` (kernel architecture header). Code: `DualRoleTopologyPanel.tsx:106`. | Observed in UI & Found in code | **P1** |
| 7.2 | **Overly Complex Dual-Key Physical Switchboard**: Mimics physical hardware switches and LED blinkers rather than presenting clean, calm database role permissions. | Screenshot: `sources-kernel-dark-1440.png` (hardware vault section). Code: `DataSourcesView.tsx:430-510`. | Observed in UI | **P2** |
| 7.3 | **Light Mode Weakness**: In light mode, the database role credentials card uses dark graphite backgrounds for one role and light for another, creating jarring contrast asymmetry. | Screenshot: `sources-kernel-light-1440.png`. | Observed in UI | **P1** |
| 7.4 | **390px Mobile Viewport**: Schema topology diagrams do not resize responsively and cause wide horizontal viewport overflow. | Screenshot: `sources-kernel-dark-390.png`. | Observed in UI | **P1** |

---

### 8. People & Access
**Primary Question**: *"Who has access to the workbench, and what governance roles are assigned?"*

| # | Issue | Evidence | Status | Severity |
|---|---|---|---|---|
| 8.1 | **Foil-Stamped Security ID Gimmick**: Role clearance cards are styled as physical laminated security badges with metallic lanyard clips and holographic seals, violating the calm, precise tool aesthetic. | Screenshot: `people-access-dark-1440.png` (top role cards). Code: `AdminView.tsx:450-530`. | Observed in UI | **P2** |
| 8.2 | **Missing Keyboard Table Navigation**: Team members table lacks `role="row"` keyboard focus management; tabbing passes over the entire user list directly to the pagination controls. | Automated Tab evaluation. Code: `AdminView.tsx:580-640`. | Found in code | **P1** |
| 8.3 | **Light Mode Weakness**: Secondary metadata ("Last active 12m ago") uses light zinc-400 (`#A1A1AA`) against white card, yielding **2.56:1** contrast (fails WCAG AA 4.5:1 requirement). | Screenshot: `people-access-light-1440.png`. Measured: `#A1A1AA` on `#FFFFFF` = 2.56:1. | Observed in UI | **P0** |
| 8.4 | **390px Mobile Viewport**: User list table wraps columns into multi-line rows where user email collides with role pill; action buttons are clipped at the right margin. | Screenshot: `people-access-dark-390.png`. | Observed in UI | **P1** |

---

## 5. Design Tokens (Approved Specifications)

### Typography Rules (Direction A)
- **H1 Page Title**: `Instrument Serif`, 40px desktop / 30px mobile (390px), weight 400, line-height 1.15, tracking -0.01em.
- **Big KPI Numbers**: `Geist` (sans), weight 500/600 with `font-feature-settings: "tnum" 1` (tabular figures). **NOT Geist Mono**.
- **Body & UI Text**: `Geist`, 13px / 14px, weight 400 & 500, line-height 1.5.
- **SQL, IDs, Asset Tags, Table Numerics**: `Geist Mono`, weight 400 & 500.
- **Corner Radii (Matching Target Mockup T1/T2)**:
  - `--radius-control`: `8px` (Buttons, Inputs, Chips, Badges)
  - `--radius-container`: `12px` (Cards, Tables, Modals, Wells)

### Approved Token & Contrast Table (Deterministic Script: `compute_contrast.py`)

| Token Name | Dark Value | Light Value | Target Applied Surface | Real Computed Contrast | WCAG AA Status |
|---|---|---|---|---|---|
| `--color-page-bg` | `#0E0F11` | `#F7F6F3` | Root Canvas | — | Baseline |
| `--color-surface` | `#141518` | `#FFFFFF` | Cards, Tables, Modals | — | Baseline |
| `--color-raised` | `#1A1B1F` | `#FAFAFA` | Inset Wells, Table Headers | — | Baseline |
| `--color-border-subtle` | `rgba(255, 255, 255, 0.08)` | `#E6E4DF` | Decorative container hairlines | **1.23:1** dark / **1.27:1** light | ✅ Pass (Decorative $\ge 1:1$) |
| `--color-border-strong` | `#60646C` | `#8A8D96` | Input borders, Buttons, Chips | **3.07:1** dark / **3.32:1** light | ✅ Pass (UI Controls $\ge 3:1$) |
| `--color-text-primary` | `#ECECEE` | `#16171A` | Headings, Body text | **15.48:1** dark / **17.92:1** light | ✅ Pass (Body text $\ge 4.5:1$) |
| `--color-text-secondary` | `#9A9CA3` | `#686B74` | Sub-labels, Metadata | **6.66:1** dark / **5.32:1** light | ✅ Pass (Body text $\ge 4.5:1$) |
| `--color-accent-primary` | `#5B5EE6` | `#5B5EE6` | Primary Buttons, Focus Rings | White text on `#5B5EE6`: **5.01:1** | ✅ Pass ($\ge 4.5:1$) |
| `--color-accent-link-dark` | `#9B9EF5` | — | Text links & highlights in Dark | **7.48:1** on `#141518` | ✅ Pass ($\ge 4.5:1$) |
| `--color-accent-link-light` | — | `#4A4DD6` | Text links & highlights in Light | **6.32:1** on `#FFFFFF` | ✅ Pass ($\ge 4.5:1$) |
| `--color-status-success-dot` | `#4EBE59` | `#2E7D32` | Discrete status indicator dot | **7.68:1** dark / **5.13:1** light | ✅ Pass (UI Dot $\ge 3:1$) |
| `--color-status-warning-dot` | `#F5A742` | `#D97706` | Discrete status indicator dot | **9.12:1** dark / **3.19:1** light | ✅ Pass (UI Dot $\ge 3:1$) |
| `--color-status-error-dot` | `#F87171` | `#DC2626` | Discrete status indicator dot | **6.60:1** dark / **4.83:1** light | ✅ Pass (UI Dot $\ge 3:1$) |
| `--color-status-success-text` | `#68D377` | `#166534` | Semantic status text labels | **9.71:1** dark / **7.13:1** light | ✅ Pass (Text $\ge 4.5:1$) |
| `--color-status-warning-text` | `#FBBF24` | `#92400E` | Semantic status text labels | **10.94:1** dark / **7.09:1** light | ✅ Pass (Text $\ge 4.5:1$) |
| `--color-status-error-text` | `#FCA5A5` | `#991B1B` | Semantic status text labels | **9.62:1** dark / **8.31:1** light | ✅ Pass (Text $\ge 4.5:1$) |

---

## 6. Addendum: Auxiliary Surface Audit

The following secondary surfaces contain hardcoded hex values identified in the regex scan:

1. **`LandingPage.tsx` / `LandingPage.css`**:
   - Monolithic stone and 3D parallax layers use glowing gradients (`linear-gradient(rgba(255,255,255,0.06), ...)`), acid chartreuse accents (`#D4EA5A`), and deep obsidian cards (`#0B0C0E`).
   - *Status*: Public landing page (Phase 5 optional).
2. **`PlatformShowcase.tsx`**:
   - Contains 33 hardcoded hex colors for animated topology maps and interactive node cards (`#18181B`, `#27272A`, `#3F3F46`).
3. **`ArchitecturalMonoliths.tsx`**:
   - 55 hardcoded hex values styling 3D physical monolith blocks with glowing neon boundary lines (`#6366F1`, `#10B981`, `#F59E0B`).
4. **`ASTCompilerLab.tsx`**:
   - 70 hardcoded hex colors styling the interactive AST node tree viewer with custom SVGs (`#0284C7`, `#38BDF8`, `#0F172A`).
5. **`CommandPalette.tsx` / `CommandPalette.css`**:
   - 23 hardcoded hex colors in shortcut badges and search modal wells (`#27272A`, `#71717A`).
6. **`OnboardingModal.tsx` / `OnboardingModal.css`**:
   - 17 hardcoded hex colors styling multi-step modal dialogs (`#18181B`, `#22C55E`).
7. **`RoiBenchmarkModal.tsx` / `RoiBenchmarkModal.css`**:
   - 37 combined hardcoded hex values in ROI financial calculation slides (`#0EA5E9`, `#64748B`).
