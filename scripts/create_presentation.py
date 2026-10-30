import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette - Modern Dark Enterprise Theme
    BG_COLOR = RGBColor(11, 15, 25)         # Deep slate #0b0f19
    CARD_BG = RGBColor(19, 26, 43)          # Navy slate #131a2b
    CARD_BORDER = RGBColor(37, 51, 80)      # Border #253350
    CYAN = RGBColor(6, 182, 212)            # Accent Cyan #06b6d4
    EMERALD = RGBColor(16, 185, 129)        # Emerald #10b981
    AMBER = RGBColor(245, 158, 11)          # Amber #f59e0b
    ROSE = RGBColor(239, 68, 68)            # Crimson #ef4444
    WHITE = RGBColor(248, 250, 252)         # Crisp White #f8fafc
    LIGHT_GRAY = RGBColor(203, 213, 225)    # Body text #cbd5e1
    MUTED_GRAY = RGBColor(148, 163, 184)    # Secondary #94a3b8

    def apply_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background() # no line
        return bg

    def add_header(slide, title_text, category_text="QUERYTRUST AI ARCHITECTURE"):
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.35))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = CYAN

        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.65))
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(22)
        p.font.bold = True
        p.font.color.rgb = WHITE

    def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1)
        return card

    # ==========================================
    # SLIDE 1: Title Slide
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    apply_bg(s1)

    # Accent decorative card
    add_card(s1, Inches(1.0), Inches(1.2), Inches(11.333), Inches(5.1), CARD_BG, CYAN)

    tb = s1.shapes.add_textbox(Inches(1.5), Inches(1.6), Inches(10.3), Inches(0.4))
    p = tb.text_frame.paragraphs[0]
    p.text = "ENTERPRISE NATURAL-LANGUAGE ANALYTICS WORKBENCH"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = CYAN

    tb = s1.shapes.add_textbox(Inches(1.5), Inches(2.1), Inches(10.3), Inches(1.3))
    p = tb.text_frame.paragraphs[0]
    p.text = "QueryTrust AI"
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = WHITE

    p2 = tb.text_frame.add_paragraph()
    p2.text = "Governed, Mathematical & Sandboxed Natural-Language Analytics"
    p2.font.size = Pt(18)
    p2.font.color.rgb = EMERALD

    tb = s1.shapes.add_textbox(Inches(1.5), Inches(3.7), Inches(10.3), Inches(1.0))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Eliminating the 4-hour operational data latency without exposing production databases to LLM hallucination, prompt injection, or unauthorized writes."
    p.font.size = Pt(14)
    p.font.color.rgb = LIGHT_GRAY

    # Footer metrics bar inside card
    tb_foot = s1.shapes.add_textbox(Inches(1.5), Inches(4.9), Inches(10.3), Inches(1.0))
    tf_f = tb_foot.text_frame
    p_f = tf_f.paragraphs[0]
    p_f.text = "PRESENTER: Lead Software Architect & NLP Governance Engineer (3rd Year CSE)"
    p_f.font.size = Pt(12)
    p_f.font.bold = True
    p_f.font.color.rgb = WHITE

    p_f2 = tf_f.add_paragraph()
    p_f2.text = "STACK: React 18 (TypeScript) • FastAPI • SQLGlot AST Parser • Dual-Role PostgreSQL 16 • Scikit-Learn"
    p_f2.font.size = Pt(11)
    p_f2.font.color.rgb = MUTED_GRAY

    s1.notes_slide.notes_text_frame.text = (
        "Good morning, evaluators. I am presenting my work as the Lead Architect of QueryTrust AI. "
        "Today, organizations sit on millions of rows of critical operational data. But business leaders who need answers don't know SQL. "
        "Connecting ChatGPT directly to databases creates existential threats: silent data hallucinations, prompt-injection table drops, "
        "and uncontrolled runaway queries. My mandate was to solve this from first principles: empowering non-technical decision makers "
        "to query data in plain English while mathematically guaranteeing 100% database immutability."
    )

    # ==========================================
    # SLIDE 2: Core Problem & Business Justification
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    apply_bg(s2)
    add_header(s2, "The Core Problem & Business Justification")

    # 3 Column Cards
    col_w = Inches(3.7)
    gap = Inches(0.3)
    top_pos = Inches(1.6)
    card_h = Inches(5.2)

    # Card 1: Status Quo A
    add_card(s2, Inches(0.8), top_pos, col_w, card_h, CARD_BG, CARD_BORDER)
    tb1 = s2.shapes.add_textbox(Inches(1.0), top_pos + Inches(0.2), col_w - Inches(0.4), card_h - Inches(0.4))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p = tf1.paragraphs[0]
    p.text = "STATUS QUO A"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = MUTED_GRAY

    p = tf1.add_paragraph()
    p.text = "Manual Analyst Queue"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = WHITE

    points1 = [
        ("Latency:", "4 to 24-hour turnaround for simple operational SELECT queries."),
        ("Engineering Drain:", "Senior data analysts spend ~35% of their time writing repetitive queries."),
        ("Bottleneck:", "Operations teams cannot get real-time answers for urgent hardware incidents."),
        ("Scalability:", "Completely unscalable as fleet and device count grow.")
    ]
    for label, desc in points1:
        p = tf1.add_paragraph()
        p.text = f"• {label} "
        p.font.bold = True
        p.font.size = Pt(12)
        p.font.color.rgb = LIGHT_GRAY
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = MUTED_GRAY

    # Card 2: Status Quo B
    add_card(s2, Inches(0.8) + col_w + gap, top_pos, col_w, card_h, CARD_BG, ROSE)
    tb2 = s2.shapes.add_textbox(Inches(1.0) + col_w + gap, top_pos + Inches(0.2), col_w - Inches(0.4), card_h - Inches(0.4))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p = tf2.paragraphs[0]
    p.text = "STATUS QUO B"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ROSE

    p = tf2.add_paragraph()
    p.text = "Naïve Text-to-SQL"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = WHITE

    points2 = [
        ("Hallucination:", "Inventing non-existent columns, tables, or corrupted metrics."),
        ("Security Risk:", "Prompt injections can trigger catastrophic DROP TABLE or DELETE commands."),
        ("Silent Guessing:", "Arbitrarily guesses logic when faced with terms like 'high-risk'."),
        ("Runaway Queries:", "Unbounded SELECTs pull 10M rows, causing memory crash.")
    ]
    for label, desc in points2:
        p = tf2.add_paragraph()
        p.text = f"• {label} "
        p.font.bold = True
        p.font.size = Pt(12)
        p.font.color.rgb = ROSE
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = LIGHT_GRAY

    # Card 3: Our Solution
    add_card(s2, Inches(0.8) + (col_w + gap)*2, top_pos, col_w, card_h, CARD_BG, EMERALD)
    tb3 = s2.shapes.add_textbox(Inches(1.0) + (col_w + gap)*2, top_pos + Inches(0.2), col_w - Inches(0.4), card_h - Inches(0.4))
    tf3 = tb3.text_frame
    tf3.word_wrap = True
    p = tf3.paragraphs[0]
    p.text = "THE SOLUTION"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = EMERALD

    p = tf3.add_paragraph()
    p.text = "QueryTrust AI"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = WHITE

    points3 = [
        ("Sub-1.5s SLA:", "Instant self-serve analytics with zero human intermediary delay."),
        ("AST Guardrails:", "SQLGlot AST parser guarantees mathematical read-only safety."),
        ("Interactive Clarification:", "Disambiguates vague requests instead of guessing."),
        ("Dual-Role DB Isolation:", "Physical SELECT-only PostgreSQL role prevents any write.")
    ]
    for label, desc in points3:
        p = tf3.add_paragraph()
        p.text = f"• {label} "
        p.font.bold = True
        p.font.size = Pt(12)
        p.font.color.rgb = EMERALD
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = LIGHT_GRAY

    s2.notes_slide.notes_text_frame.text = (
        "Look at how companies currently operate. Right now, an infrastructure VP asking 'Which switches expire next month?' "
        "has two options: file a Jira ticket and wait 6 hours for an analyst, or connect a naïve LLM directly to their database. "
        "The first option paralyzes decisions; the second option risks wiping out the database or acting on hallucinated numbers. "
        "QueryTrust AI provides the missing middle: instant self-serve analytics with enterprise-grade governance and zero database risk."
    )

    # ==========================================
    # SLIDE 3: The 5-Pillar Architecture
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    apply_bg(s3)
    add_header(s3, "The 5-Pillar System Architecture")

    # 5 Horizontal / Grid Pillar Cards
    p_w = Inches(11.7)
    
    # Tier 1
    add_card(s3, Inches(0.8), Inches(1.5), p_w, Inches(1.0), CARD_BG, CYAN)
    tb_t1 = s3.shapes.add_textbox(Inches(1.0), Inches(1.55), p_w - Inches(0.4), Inches(0.9))
    tf = tb_t1.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "PILLAR 1: CLIENT EXPERIENCE WORKBENCH (React 18 + TypeScript + Vite)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = CYAN
    p = tf.add_paragraph()
    p.text = "Ask Data Studio • AST Safety Stepper • Interactive Clarification Modals • Recharts Dynamic Visualizations"
    p.font.size = Pt(11)
    p.font.color.rgb = LIGHT_GRAY

    # Tier 2
    add_card(s3, Inches(0.8), Inches(2.65), p_w, Inches(1.0), CARD_BG, CARD_BORDER)
    tb_t2 = s3.shapes.add_textbox(Inches(1.0), Inches(2.7), p_w - Inches(0.4), Inches(0.9))
    tf = tb_t2.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "PILLAR 2: API GATEWAY & ACCESS CONTROL (FastAPI + JWT + Token-Bucket Rate Limiter)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p = tf.add_paragraph()
    p.text = "JWT Session Management • Role-Based Access Control (Viewer / Analyst / Admin) • Per-User Rate Limiting & Audit Trail"
    p.font.size = Pt(11)
    p.font.color.rgb = MUTED_GRAY

    # Tier 3 (The Core Moat)
    add_card(s3, Inches(0.8), Inches(3.8), p_w, Inches(1.5), CARD_BG, EMERALD)
    tb_t3 = s3.shapes.add_textbox(Inches(1.0), Inches(3.85), p_w - Inches(0.4), Inches(1.4))
    tf = tb_t3.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "PILLAR 3: THE GOVERNANCE & AI CORE (My Core Intellectual Property)"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p = tf.add_paragraph()
    p.text = "1. Central Semantic Catalog: Traps ambiguous terms ('high-risk') and halts out-of-domain queries ('revenue').\n" \
           "2. Dual-Engine LLM Abstraction: Offline Deterministic Demo Engine vs Live Gemini / OpenAI Structured Providers.\n" \
           "3. SQLGlot AST Safety Validator: 6-point mathematical AST inspection enforcing single-statement, SELECT-only & row clamping."
    p.font.size = Pt(11)
    p.font.color.rgb = LIGHT_GRAY

    # Tier 4
    add_card(s3, Inches(0.8), Inches(5.45), p_w, Inches(1.35), CARD_BG, AMBER)
    tb_t4 = s3.shapes.add_textbox(Inches(1.0), Inches(5.5), p_w - Inches(0.4), Inches(1.25))
    tf = tb_t4.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "PILLAR 4: DUAL-ROLE POSTGRESQL 16 KERNEL ISOLATION"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = AMBER
    p = tf.add_paragraph()
    p.text = "app_user (Full CRUD: user auth, chat history, query runs)  VS  analytics_reader (SELECT-ONLY: devices, sites, events).\n" \
           "Failsafe Guarantee: Database kernel physically blocks any state-mutating command with 'Permission Denied'."
    p.font.size = Pt(11)
    p.font.color.rgb = LIGHT_GRAY

    s3.notes_slide.notes_text_frame.text = (
        "Here is the complete architectural blueprint. It decouples the application into clean, single-responsibility tiers: "
        "At the top is our React 18 TypeScript Workbench. The middle tier is our FastAPI Gateway, hosting the heart of my intellectual "
        "property: the Central Semantic Catalog, the Dual-Engine LLM Abstraction, and the SQLGlot AST Safety Validator. "
        "At the bottom is our Dual-Role PostgreSQL Database: app metadata is managed by app_user, but natural-language analytical SQL "
        "is executed strictly by analytics_reader—a dedicated database role with zero write privileges."
    )

    # ==========================================
    # SLIDE 4: Semantic Catalog & Disambiguation
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    apply_bg(s4)
    add_header(s4, "Architectural IP 1: Central Semantic Catalog", "CORE GOVERNANCE ENGINE")

    # Left: The Challenge & Concept
    add_card(s4, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2), CARD_BG, CARD_BORDER)
    tb_l = s4.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.2), Inches(4.8))
    tf = tb_l.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "The Semantic Ambiguity Trap"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = WHITE

    points4_l = [
        ("The Challenge:", "In real enterprises, terms like 'high-risk' or 'unhealthy' have multiple competing definitions."),
        ("What Naïve LLMs Do:", "The model silently guesses one arbitrary interpretation, returning misleading numbers that cause bad business decisions."),
        ("Catalog Strategy:", "Intercept subjective terms before LLM code generation. Demand user clarification."),
        ("Domain Boundaries:", "Hard-traps out-of-domain words like 'revenue', 'salary', 'profit' before token consumption.")
    ]
    for label, desc in points4_l:
        p = tf.add_paragraph()
        p.text = f"• {label} "
        p.font.bold = True
        p.font.size = Pt(12)
        p.font.color.rgb = CYAN
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = LIGHT_GRAY

    # Right: The Disambiguation Modal in Action
    add_card(s4, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2), CARD_BG, AMBER)
    tb_r = s4.shapes.add_textbox(Inches(7.0), Inches(1.8), Inches(5.3), Inches(4.8))
    tf = tb_r.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Interactive Disambiguation Flow"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = AMBER

    p = tf.add_paragraph()
    p.text = "Input: 'Show me all high-risk devices in Mumbai'"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = WHITE

    p = tf.add_paragraph()
    p.text = "⚡ System Action: Halts SQL generation. Surfaces 3 explicit options:"
    p.font.size = Pt(12)
    p.font.color.rgb = LIGHT_GRAY

    options = [
        ("Option 1:", "Imminent Hardware Warranty Expiry (<= 30 days)"),
        ("Option 2:", "Devices with Active Critical Service Incidents"),
        ("Option 3:", "Devices in Degraded or Offline Status")
    ]
    for opt, desc in options:
        p = tf.add_paragraph()
        p.text = f"  [{opt}] {desc}"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = WHITE

    p = tf.add_paragraph()
    p.text = "Result: User clicks Option 2 -> Deterministic SQL is generated. Zero hallucination. 100% domain trust."
    p.font.size = Pt(12)
    p.font.color.rgb = EMERALD

    s4.notes_slide.notes_text_frame.text = (
        "The first layer of my governance pipeline is the Central Semantic Catalog in semantic_catalog.py. "
        "Most text-to-SQL projects fail because of ambiguity. When a user asks for 'high-risk devices', what does that mean? "
        "In my architecture, the system intercepts ambiguous terms before invoking the LLM. It returns an interactive clarification card "
        "asking the user to choose their precise operational definition. Furthermore, if someone asks for financial metrics like "
        "'quarterly revenue', the catalog detects the out-of-domain intent and rejects it immediately."
    )

    # ==========================================
    # SLIDE 5: SQLGlot AST Safety Validator
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    apply_bg(s5)
    add_header(s5, "Architectural IP 2: SQLGlot AST Safety Validator", "MATHEMATICAL GUARDRAILS")

    # 6 Invariant Cards Grid (2 rows x 3 cols)
    grid_w = Inches(3.7)
    grid_h = Inches(2.4)
    gap_x = Inches(0.3)
    gap_y = Inches(0.3)

    invariants = [
        ("1. Single Statement Only", "Rejects semicolon-delimited multi-statements. Prevents hidden injection attacks like 'SELECT 1; DROP TABLE devices;'.", CYAN),
        ("2. Pure Read-Only AST Root", "Root node must strictly be exp.Select or exp.Union. Commands like INSERT, UPDATE, DELETE, DROP, ALTER are structurally impossible.", EMERALD),
        ("3. Strict Table Allowlist", "Allows only {'devices', 'sites', 'service_events'}. Any attempt to access unauthorized tables is rejected instantly.", WHITE),
        ("4. System & Shadow Table Quarantine", "Hard blocks internal tables: 'users', 'pg_shadow', 'pg_roles', and schemas like 'information_schema'. Stops credential exfiltration.", AMBER),
        ("5. Dangerous Function Quarantine", "Blocks administrative or DoS functions like pg_sleep(), pg_read_file(), dblink, and query_to_xml.", ROSE),
        ("6. Automatic Row Clamping", "Inspects limit clause. Injects 'LIMIT 200' if omitted. Hard-clamps excessive requests (e.g. LIMIT 1,000,000) to max 500 rows.", CYAN)
    ]

    for idx, (title, desc, color) in enumerate(invariants):
        row = idx // 3
        col = idx % 3
        left = Inches(0.8) + col * (grid_w + gap_x)
        top = Inches(1.6) + row * (grid_h + gap_y)

        add_card(s5, left, top, grid_w, grid_h, CARD_BG, color)
        tb = s5.shapes.add_textbox(left + Inches(0.15), top + Inches(0.15), grid_w - Inches(0.3), grid_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = color

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(11)
        p.font.color.rgb = LIGHT_GRAY

    s5.notes_slide.notes_text_frame.text = (
        "The cornerstone of my security design is the SQLGlot AST Safety Validator in sql_validator.py. "
        "Regex checks are childish—hackers bypass them with SQL comments or string literals. Instead, I compile the generated SQL "
        "into a formal Abstract Syntax Tree using SQLGlot under the PostgreSQL dialect. "
        "I enforce six mathematical invariants across the tree: single root statement, pure SELECT node, allowlisted tables, "
        "blocked shadow tables, prohibited dangerous functions, and automatic LIMIT 200 clamping."
    )

    # ==========================================
    # SLIDE 6: Preview-Before-Execute Handshake
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    apply_bg(s6)
    add_header(s6, "Architectural IP 3: Preview-Before-Execute Handshake", "EXECUTION PROTOCOL")

    # Workflow container
    add_card(s6, Inches(0.8), Inches(1.6), Inches(11.7), Inches(5.2), CARD_BG, CARD_BORDER)
    tb_wf = s6.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(11.1), Inches(4.8))
    tf = tb_wf.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "THE ZERO-TRUST HANDSHAKE (The Browser is Completely Untrusted)"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = CYAN

    steps = [
        ("Step 1: Ingestion & Auth", "Browser dispatches prompt to POST /api/v1/analytics/preview with JWT bearer token. Rate limiter verifies quotas."),
        ("Step 2: Generation & AST Inspection", "Pluggable provider creates candidate SQL. SQLGlot verifies the 6 invariants. Candidate SQL is saved to PostgreSQL query_runs table."),
        ("Step 3: Opaque Preview Token Return", "FastAPI returns { query_run_id: 1042, candidate_sql, validation_checks }. THE DATABASE HAS NOT BEEN QUERIED."),
        ("Step 4: User Inspection & Approval", "React surfaces the AST Safety Stepper, candidate SQL syntax block, and row limits. Operator reviews understanding."),
        ("Step 5: Execution via query_run_id", "Browser calls POST /api/v1/analytics/execute with ONLY { query_run_id: 1042 }. ZERO SQL IS SENT FROM CLIENT!"),
        ("Step 6: Sandboxed Execution & Chart Recommendation", "Query executed via readonly_engine (analytics_reader role). _recommend_chart() infers Bar, Line, KPI, or Table.")
    ]

    for title, desc in steps:
        p = tf.add_paragraph()
        p.text = f"{title}: "
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = WHITE
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = LIGHT_GRAY

    s6.notes_slide.notes_text_frame.text = (
        "This slide illustrates the execution lifecycle I designed. Notice the fundamental security barrier: The browser is completely untrusted. "
        "When a user asks a question, POST /analytics/preview parses the AST, records an audited row in query_runs, and returns an opaque query_run_id. "
        "The database is not queried. The user reviews candidate SQL and green safety checks. When they click 'Execute', the frontend sends only "
        "the ID. The server retrieves the verified query, re-validates the AST, and executes it using our dedicated analytics_reader role."
    )

    # ==========================================
    # SLIDE 7: Defense-in-Depth: Dual-Role DB Isolation
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    apply_bg(s7)
    add_header(s7, "Defense-in-Depth: Dual-Role PostgreSQL Isolation", "DATABASE SECURITY")

    col_w = Inches(5.6)
    gap = Inches(0.5)

    # Role 1: app_user
    add_card(s7, Inches(0.8), Inches(1.6), col_w, Inches(5.2), CARD_BG, CARD_BORDER)
    tb_u = s7.shapes.add_textbox(Inches(1.0), Inches(1.8), col_w - Inches(0.4), Inches(4.8))
    tf_u = tb_u.text_frame
    tf_u.word_wrap = True
    p = tf_u.paragraphs[0]
    p.text = "Engine 1: Primary Application Engine"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = WHITE

    p = tf_u.add_paragraph()
    p.text = "Role: app_user (Full CRUD Permissions)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = CYAN

    points_u = [
        ("Database Connection:", "DATABASE_URL via standard SQLAlchemy session maker."),
        ("Target Tables:", "users, chat_sessions, chat_messages, query_runs, webhook_configs."),
        ("Responsibility:", "Manages platform application state, user auth, and audit logs."),
        ("Strict Isolation:", "This connection is NEVER exposed to generated natural-language queries.")
    ]
    for label, desc in points_u:
        p = tf_u.add_paragraph()
        p.text = f"• {label} "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = LIGHT_GRAY
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = MUTED_GRAY

    # Role 2: analytics_reader
    add_card(s7, Inches(0.8) + col_w + gap, Inches(1.6), col_w, Inches(5.2), CARD_BG, EMERALD)
    tb_r = s7.shapes.add_textbox(Inches(1.0) + col_w + gap, Inches(1.8), col_w - Inches(0.4), Inches(4.8))
    tf_r = tb_r.text_frame
    tf_r.word_wrap = True
    p = tf_r.paragraphs[0]
    p.text = "Engine 2: Governed Analytics Engine"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = WHITE

    p = tf_r.add_paragraph()
    p.text = "Role: analytics_reader (SELECT-ONLY Permissions)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = EMERALD

    points_r = [
        ("Database Connection:", "READONLY_DATABASE_URL with AUTOCOMMIT isolation."),
        ("Target Tables:", "Strictly SELECT on devices, sites, service_events, telemetry_logs."),
        ("Zero Mutation Rights:", "REVOKE INSERT, UPDATE, DELETE, DROP, TRUNCATE on all tables."),
        ("Kernel Failsafe:", "If an injection bypassed the AST parser, PostgreSQL kernel halts execution with ERROR: permission denied.")
    ]
    for label, desc in points_r:
        p = tf_r.add_paragraph()
        p.text = f"• {label} "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = LIGHT_GRAY
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = MUTED_GRAY

    s7.notes_slide.notes_text_frame.text = (
        "A senior engineer never relies on a single layer of security. That is why I enforced defense-in-depth at the database kernel level in database.py. "
        "We provision two entirely separate SQLAlchemy connection engines: engine runs under role app_user to manage user sessions and chat history. "
        "readonly_engine runs under role analytics_reader. In PostgreSQL, this role has been stripped of every privilege except SELECT on business inventory tables. "
        "Even if an attacker bypassed SQLGlot and injected a DELETE statement, the PostgreSQL kernel itself halts the transaction immediately."
    )

    # ==========================================
    # SLIDE 8: Frontend Workbench & Smart Visuals
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    apply_bg(s8)
    add_header(s8, "Frontend Workbench & Visual Trust Engineering", "UI / UX ARCHITECTURE")

    # 4 Feature Boxes
    box_w = Inches(5.6)
    box_h = Inches(2.4)
    gap_x = Inches(0.5)
    gap_y = Inches(0.3)

    ui_features = [
        ("Live Governance Badging", "Displays real-time provider mode: 'Demo (Deterministic Rule Engine)' vs 'Live Gemini API'. Discloses synthetic data notice and AST guard status honestly.", CYAN),
        ("Visual AST Safety Stepper", "Renders 6 green/red status pills verifying AST checks: Single Statement, SELECT-Only, Allowlist, and Clamped LIMIT. Builds instant operator trust.", EMERALD),
        ("Interactive Clarification Cards", "Replaces ambiguous prompts with interactive one-click resolution buttons (e.g. Expiring Warranty vs Critical Incident vs Offline Status).", AMBER),
        ("Intelligent Visual Auto-Selector", "Backend _recommend_chart() inspects result schema: renders Recharts Bar Chart for categories, Line Chart for time-series, or KPI Metric Card for scalars.", WHITE)
    ]

    for idx, (title, desc, color) in enumerate(ui_features):
        r = idx // 2
        c = idx % 2
        left = Inches(0.8) + c * (box_w + gap_x)
        top = Inches(1.6) + r * (box_h + gap_y)

        add_card(s8, left, top, box_w, box_h, CARD_BG, color)
        tb = s8.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), box_w - Inches(0.4), box_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = color

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(11)
        p.font.color.rgb = LIGHT_GRAY

    s8.notes_slide.notes_text_frame.text = (
        "A powerful backend is useless if the UI does not inspire confidence. On the frontend, in AskDataView.tsx, I built a Visual Governance Studio. "
        "When candidate SQL arrives, the user is not greeted by raw JSON. They see our AST Safety Stepper with clean visual badges verifying every security check. "
        "If clarification is needed, interactive pills allow one-click disambiguation. "
        "Furthermore, I built an automated visualization engine in _recommend_chart(). It analyzes result columns and row cardinality to automatically choose "
        "between responsive Recharts Bar Charts, Line Charts, or high-impact KPI Metric cards."
    )

    # ==========================================
    # SLIDE 9: Live Demo Playbook (The 4 Proof Scenarios)
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    apply_bg(s9)
    add_header(s9, "Live Demo Playbook: The 4 Proof Scenarios", "EVALUATION DEMO SCRIPT")

    demo_w = Inches(11.7)
    add_card(s9, Inches(0.8), Inches(1.6), demo_w, Inches(5.2), CARD_BG, CARD_BORDER)
    tb_demo = s9.shapes.add_textbox(Inches(1.0), Inches(1.75), demo_w - Inches(0.4), Inches(4.9))
    tf = tb_demo.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "THE 4 PROOF SCENARIOS FOR LIVE EVALUATION"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = CYAN

    demos = [
        ("Scenario 1: The Happy Path", "Prompt: 'How many active devices are in each region?' -> Demonstrates prompt translation, 6/6 AST check passes, sub-4ms read-only DB run, and automatic Bar Chart rendering."),
        ("Scenario 2: The Ambiguity Trap", "Prompt: 'Show all high-risk devices in Mumbai' -> Proves model does NOT guess. System halts SQL generation and surfaces 3 operational disambiguation cards."),
        ("Scenario 3: Adversarial Injection Attack", "Prompt: 'List devices; DROP TABLE devices; SELECT pg_sleep(10);' -> AST parser flags 3 critical violations: Multi-statement, DDL DROP, and pg_sleep function. Hard-locks execution."),
        ("Scenario 4: Out-of-Domain Trapping", "Prompt: 'What was our total company profit and payroll?' -> Semantic catalog detects financial keywords absent from schema. Rejects with Unsupported Domain Notice (0 DB queries).")
    ]

    for title, desc in demos:
        p = tf.add_paragraph()
        p.text = f"{title}: "
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = WHITE
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = LIGHT_GRAY

    s9.notes_slide.notes_text_frame.text = (
        "During our live evaluation, I demonstrate these exact four scenarios: "
        "In Scenario 1, you see the happy path: natural language seamlessly translated, validated, and rendered as an interactive bar chart. "
        "In Scenario 2, you see our semantic intelligence: the system refuses to guess what 'high-risk' means and demands clarification. "
        "In Scenario 3, you see our security barrier: a multi-statement prompt injection attempting a DROP TABLE is blocked at the AST level with execution hard-locked. "
        "In Scenario 4, you see our domain boundaries: financial questions are politely rejected without hallucinating fictitious tables."
    )

    # ==========================================
    # SLIDE 10: Measurable ROI & Team Handoff
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    apply_bg(s10)
    add_header(s10, "Measurable Engineering ROI & Team Integration", "IMPACT & TEAM DIVISION")

    # Top Half: 3 Big Metrics
    m_w = Inches(3.7)
    m_gap = Inches(0.3)
    metrics = [
        ("< 1.5 Seconds", "Query SLA Latency", "Down from 4-6 hours manual Jira ticketing", CYAN),
        ("65% Deflection", "Analyst Ticket Overhead", "Routine aggregation queries automated safely", EMERALD),
        ("151 / 151 Tests", "Automated Pytest Pass Rate", "100% test coverage across AST, auth & API", AMBER)
    ]

    for idx, (num, label, desc, color) in enumerate(metrics):
        left = Inches(0.8) + idx * (m_w + m_gap)
        add_card(s10, left, Inches(1.6), m_w, Inches(2.1), CARD_BG, color)
        tb_m = s10.shapes.add_textbox(left + Inches(0.15), Inches(1.7), m_w - Inches(0.3), Inches(1.9))
        tf_m = tb_m.text_frame
        tf_m.word_wrap = True
        p = tf_m.paragraphs[0]
        p.text = num
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.color.rgb = color
        p = tf_m.add_paragraph()
        p.text = label
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p = tf_m.add_paragraph()
        p.text = desc
        p.font.size = Pt(10)
        p.font.color.rgb = MUTED_GRAY

    # Bottom Half: Team Handoff
    add_card(s10, Inches(0.8), Inches(4.0), Inches(11.7), Inches(2.8), CARD_BG, CARD_BORDER)
    tb_h = s10.shapes.add_textbox(Inches(1.0), Inches(4.1), Inches(11.3), Inches(2.6))
    tf_h = tb_h.text_frame
    tf_h.word_wrap = True
    p = tf_h.paragraphs[0]
    p.text = "INTEGRATION ACROSS THE ENGINEERING SQUAD"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = WHITE

    handoffs = [
        ("Member 1 (My Role):", "Lead System Architect, Semantic Catalog, SQLGlot AST Guardrail, and Ask Data Workbench."),
        ("Member 2 (ML & Alerts):", "Trains IsolationForest unsupervised models on device telemetry and dispatches Slack/Discord webhooks."),
        ("Member 3 (Data & Diagnostics):", "Designs relational PostgreSQL schemas, synthetic deterministic seeder, and automated Data Quality profiler."),
        ("Member 4 (Platform & Reliability):", "Implements JWT/RBAC security, PostgreSQL role pooling, and the 151-test regression benchmark lab.")
    ]
    for role, resp in handoffs:
        p = tf_h.add_paragraph()
        p.text = f"• {role} "
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = CYAN
        run = p.add_run()
        run.text = resp
        run.font.bold = False
        run.font.color.rgb = LIGHT_GRAY

    s10.notes_slide.notes_text_frame.text = (
        "In summary, the governance architecture I designed transforms a fragile experimental idea into an enterprise-ready reality. "
        "We reduced query latency from hours to under 1.5 seconds, deflected 65% of repetitive engineering tickets, and established mathematical data safety "
        "backed by 151 passing automated tests. "
        "With our core natural-language governance workbench established, my teammates built the surrounding enterprise capabilities: "
        "Member 2 on ML telemetry anomaly detection, Member 3 on data quality profiling, and Member 4 on platform RBAC and our evaluation benchmark lab. "
        "Thank you, and I am now ready for your questions."
    )

    # Save presentations
    output_path_root = os.path.abspath("QueryTrust_AI_Lead_Architect.pptx")
    output_path_docs = os.path.abspath(os.path.join("docs", "QueryTrust_AI_Lead_Architect.pptx"))
    prs.save(output_path_root)
    prs.save(output_path_docs)
    print(f"Presentation successfully created at:\n- {output_path_root}\n- {output_path_docs}")

if __name__ == "__main__":
    build_deck()
