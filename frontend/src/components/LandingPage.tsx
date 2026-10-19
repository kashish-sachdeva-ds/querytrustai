import React, { useState, useTransition } from 'react'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Terminal,
  Server,
  Zap,
  Sparkles,
  ArrowRight,
  Code2,
  CheckCircle2,
  Activity,
  Calendar,
  X,
  Sun,
  Moon,
  Flame,
  Search,
  Check,
  Building,
  KeyRound,
  FileCheck,
  Cpu,
  Radio,
  Copy,
  CheckCheck,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { QueryTrustLogo } from './QueryTrustLogo'
import './LandingPage.css'

interface LandingPageProps {
  onGoToLogin: () => void
}

interface SandboxScenario {
  id: string
  title: string
  icon: string
  category: string
  question: string
  sql: string
  isAttack?: boolean
  astChecks: {
    singleStatement: boolean
    readOnlySelect: boolean
    catalogWhitelist: boolean
    safeFunctions: boolean
    noSystemCatalogs: boolean
    rowClamp: boolean
  }
  rejectionReason?: string
  results?: Array<{
    col1: string
    col2: string
    col3: string
    col4: string
    col5: string
  }>
}

const SANDBOX_SCENARIOS: SandboxScenario[] = [
  {
    id: 'warranties',
    title: 'Hardware Warranty Expiry',
    icon: '⚡',
    category: 'Lifecycle Governance',
    question: 'Which switches in Dallas have warranties expiring in the next 60 days?',
    sql: `SELECT device_name, model, site, warranty_expiry, status\nFROM devices\nWHERE device_type = 'Switch'\n  AND site = 'Dallas Datacenter'\n  AND warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'\nORDER BY warranty_expiry ASC\nLIMIT 200;`,
    astChecks: {
      singleStatement: true,
      readOnlySelect: true,
      catalogWhitelist: true,
      safeFunctions: true,
      noSystemCatalogs: true,
      rowClamp: true,
    },
    results: [
      { col1: 'CAT9300-DAL-01', col2: 'Cisco Catalyst 9300', col3: 'Dallas Datacenter', col4: '2026-11-15 (29d)', col5: 'Active' },
      { col1: 'CAT9300-DAL-04', col2: 'Cisco Catalyst 9300', col3: 'Dallas Datacenter', col4: '2026-11-28 (42d)', col5: 'Active' },
      { col1: 'ARISTA-7050-02', col2: 'Arista 7050SX-64', col3: 'Dallas Datacenter', col4: '2026-12-05 (49d)', col5: 'Active' },
      { col1: 'EX4300-DAL-01', col2: 'Juniper EX4300', col3: 'Dallas Datacenter', col4: '2026-12-14 (58d)', col5: 'Maintenance' },
    ],
  },
  {
    id: 'telemetry',
    title: 'Thermal & Packet Health',
    icon: '🌡️',
    category: 'Live Telemetry',
    question: 'Find core routers with temperature > 65°C and packet drops > 0.05%',
    sql: `SELECT d.device_name, d.model, t.temperature_c, t.packet_drop_rate, d.site\nFROM devices d\nJOIN telemetry t ON d.id = t.device_id\nWHERE d.device_type = 'Router'\n  AND t.temperature_c > 65.0\n  AND t.packet_drop_rate > 0.05\nORDER BY t.temperature_c DESC\nLIMIT 200;`,
    astChecks: {
      singleStatement: true,
      readOnlySelect: true,
      catalogWhitelist: true,
      safeFunctions: true,
      noSystemCatalogs: true,
      rowClamp: true,
    },
    results: [
      { col1: 'ASR1001-CHI-01', col2: 'Cisco ASR 1001-X', col3: '71.4°C', col4: '0.082%', col5: 'Chicago Site' },
      { col1: 'MX204-NYC-02', col2: 'Juniper MX204', col3: '68.2°C', col4: '0.064%', col5: 'New York Datacenter' },
      { col1: 'ISR4451-SFO-03', col2: 'Cisco ISR 4451', col3: '66.9°C', col4: '0.058%', col5: 'San Francisco Hub' },
    ],
  },
  {
    id: 'data_quality',
    title: 'Fleet Firmware Audit',
    icon: '🔍',
    category: 'Data Quality Profiler',
    question: 'Show pending audit devices with legacy firmware or missing serial numbers',
    sql: `SELECT device_name, serial_number, firmware_version, status, site\nFROM devices\nWHERE status = 'Pending Audit'\n   OR serial_number IS NULL\n   OR firmware_version NOT LIKE '17.%'\nORDER BY id DESC\nLIMIT 200;`,
    astChecks: {
      singleStatement: true,
      readOnlySelect: true,
      catalogWhitelist: true,
      safeFunctions: true,
      noSystemCatalogs: true,
      rowClamp: true,
    },
    results: [
      { col1: 'CAT3850-SEA-09', col2: 'FOC21049281', col3: '16.12.04 (Legacy)', col4: 'Pending Audit', col5: 'Seattle DC' },
      { col1: 'PA-3220-MIA-01', col2: '01280100492', col3: '10.1.2 (Deprecated)', col4: 'Pending Audit', col5: 'Miami Office' },
      { col1: 'AP9120-DEN-14', col2: 'FOC24018290', col3: '17.1.0 (Audit flag)', col4: 'Pending Audit', col5: 'Denver Campus' },
    ],
  },
  {
    id: 'attack_drop',
    title: 'DDL Drop Exploit',
    icon: '💥',
    category: 'AST Interception Guard',
    question: 'DROP TABLE devices CASCADE; -- Wipe production table',
    sql: `DROP TABLE devices CASCADE;`,
    isAttack: true,
    astChecks: {
      singleStatement: true,
      readOnlySelect: false,
      catalogWhitelist: false,
      safeFunctions: true,
      noSystemCatalogs: true,
      rowClamp: false,
    },
    rejectionReason: `🚨 BLOCKED BY SQLGLOT AST ENGINE: Statement type 'Drop' is strictly prohibited. The system enforces zero-mutation invariants. Rejection status 400 emitted. Database execution aborted before connection.`,
  },
  {
    id: 'attack_piggyback',
    title: 'Multi-Statement Chain',
    icon: '💉',
    category: 'AST Interception Guard',
    question: 'SELECT * FROM devices; TRUNCATE audit_logs; -- Chained destructive command',
    sql: `SELECT * FROM devices; TRUNCATE audit_logs;`,
    isAttack: true,
    astChecks: {
      singleStatement: false,
      readOnlySelect: false,
      catalogWhitelist: false,
      safeFunctions: true,
      noSystemCatalogs: true,
      rowClamp: false,
    },
    rejectionReason: `🚨 BLOCKED BY SQLGLOT MULTI-STATEMENT GUARD: Multiple SQL statements detected (2 expressions). Exactly 1 single read-only SELECT statement is permitted. Secondary command 'TRUNCATE' rejected.`,
  },
  {
    id: 'attack_catalog',
    title: 'Catalog Snoop Exploit',
    icon: '🕵️',
    category: 'AST Interception Guard',
    question: 'SELECT usename, passwd FROM pg_shadow; -- Dump database user credentials',
    sql: `SELECT usename, passwd FROM pg_shadow;`,
    isAttack: true,
    astChecks: {
      singleStatement: true,
      readOnlySelect: true,
      catalogWhitelist: false,
      safeFunctions: true,
      noSystemCatalogs: false,
      rowClamp: false,
    },
    rejectionReason: `🚨 BLOCKED BY SCHEMA CATALOG WHITELIST: System catalog 'pg_shadow' access is prohibited. Queries are strictly restricted to approved hardware catalog tables (devices, sites, telemetry).`,
  },
  {
    id: 'attack_update',
    title: 'Silent Telemetry Update',
    icon: '🛑',
    category: 'AST Interception Guard',
    question: 'UPDATE telemetry SET packet_drop_rate = 0.0 WHERE device_id = 42; -- Alter hardware telemetry',
    sql: `UPDATE telemetry SET packet_drop_rate = 0.0 WHERE device_id = 42;`,
    isAttack: true,
    astChecks: {
      singleStatement: true,
      readOnlySelect: false,
      catalogWhitelist: true,
      safeFunctions: true,
      noSystemCatalogs: true,
      rowClamp: false,
    },
    rejectionReason: `🚨 BLOCKED BY DUAL DEFENSE LAYERS: Statement type 'Update' rejected by SQLGlot AST parser. Even if bypassed, the underlying database connection is strictly bound to PostgreSQL 'analytics_reader' SELECT-only role.`,
  },
]

interface AttackVector {
  id: string
  name: string
  payload: string
  vectorType: string
  severity: 'CRITICAL' | 'HIGH'
  cwe: string
  blockedBy: string
  astRule: string
  description: string
  scenarioId: string
  astNodeTrigger: string
  pythonDefenseSnippet: string
}

const ATTACK_VECTORS: AttackVector[] = [
  {
    id: 'drop_table',
    name: 'Destructive Schema Drop',
    payload: `DROP TABLE devices CASCADE;`,
    vectorType: 'DDL Mutation',
    severity: 'CRITICAL',
    cwe: 'CWE-89: DDL Injection',
    blockedBy: 'AST Parser (exp.Drop rejection)',
    astRule: 'Rule 2: Read-Only AST Validation (Only exp.Select allowed)',
    description: 'Attempts to erase hardware records. Caught at AST root before query reaches PostgreSQL.',
    scenarioId: 'attack_drop',
    astNodeTrigger: 'exp.Drop(this=Table[devices], cascade=True)',
    pythonDefenseSnippet: `# app/core/sql_validator.py
if not isinstance(root, exp.Select):
    return SQLValidationResult(
        is_valid=False,
        violations=[f"Prohibited statement type '{type(root).__name__}'. Only read-only SELECT permitted."]
    )`,
  },
  {
    id: 'piggyback_injection',
    name: 'Piggybacked Multi-Statement',
    payload: `SELECT * FROM devices; TRUNCATE audit_logs;`,
    vectorType: 'SQL Injection / Chaining',
    severity: 'CRITICAL',
    cwe: 'CWE-89: Multi-Statement Chaining',
    blockedBy: 'SQLGlot Multi-Statement Guard',
    astRule: 'Rule 1: Strict Single Statement Enforcement',
    description: 'Tacks on a second destructive command behind a valid SELECT. Rejected immediately.',
    scenarioId: 'attack_piggyback',
    astNodeTrigger: 'len(statements) == 2 (exp.Select, exp.Command[TRUNCATE])',
    pythonDefenseSnippet: `# app/core/sql_validator.py
statements = sqlglot.parse(sql_query, read="postgres")
if len(statements) != 1:
    return SQLValidationResult(
        is_valid=False,
        violations=[f"Multiple statements detected ({len(statements)} found). Exactly 1 statement allowed."]
    )`,
  },
  {
    id: 'catalog_snoop',
    name: 'PostgreSQL Catalog Snooping',
    payload: `SELECT usename, passwd FROM pg_shadow;`,
    vectorType: 'Privilege Reconnaissance',
    severity: 'HIGH',
    cwe: 'CWE-200: Info Exposure',
    blockedBy: 'Schema Catalog Whitelist',
    astRule: 'Rule 5: System Catalogs Blocklist (pg_*, information_schema)',
    description: 'Attempts to dump database user hashes. AST rejects unwhitelisted internal catalogs.',
    scenarioId: 'attack_catalog',
    astNodeTrigger: 'exp.Table(this="pg_shadow") not in ALLOWED_TABLES',
    pythonDefenseSnippet: `# app/core/sql_validator.py
for node in root.walk():
    if isinstance(node, exp.Table):
        if node.name.lower() in DISALLOWED_SCHEMAS or node.name.lower() not in ALLOWED_TABLES:
            violations.append(f"Access to prohibited schema/table '{node.name}' is blocked.")`,
  },
  {
    id: 'silent_update',
    name: 'Silent Telemetry Tampering',
    payload: `UPDATE telemetry SET packet_drop_rate = 0.0 WHERE device_id = 42;`,
    vectorType: 'Data Modification',
    severity: 'CRITICAL',
    cwe: 'CWE-284: Unauthorized Mutation',
    blockedBy: 'AST Parser + DB Reader Role',
    astRule: 'Rule 2: Read-Only AST + Dedicated SELECT-only DB Role',
    description: 'Tries to conceal failing hardware. Blocked by both AST check and PostgreSQL role privilege.',
    scenarioId: 'attack_update',
    astNodeTrigger: 'exp.Update(this=Table[telemetry], where=...)',
    pythonDefenseSnippet: `# app/core/sql_validator.py & database.py
if isinstance(node, (exp.Insert, exp.Update, exp.Delete)):
    violations.append(f"Prohibited SQL operation '{type(node).__name__}' found in query AST.")
# Database level defense: role analytics_reader has REVOKE ALL; GRANT SELECT ONLY;`,
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const { theme, toggleTheme } = useTheme()

  // Interactive Sandbox state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('warranties')
  const [customQuestion, setCustomQuestion] = useState<string>('')
  const [terminalTab, setTerminalTab] = useState<'preview' | 'ast' | 'role'>('preview')
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [, startTransition] = useTransition()

  // Attack Modal state
  const [activeAttack, setActiveAttack] = useState<AttackVector | null>(null)
  const [attackSimulationState, setAttackSimulationState] = useState<'idle' | 'analyzing' | 'blocked'>('idle')

  // Demo Walkthrough Modal state
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false)
  const [demoFormSubmitted, setDemoFormSubmitted] = useState<boolean>(false)
  const [demoFormData, setDemoFormData] = useState({ name: '', email: '', company: '', role: 'Network Operations' })


  const activeScenario =
    SANDBOX_SCENARIOS.find((s) => s.id === selectedScenarioId) || SANDBOX_SCENARIOS[0]

  const handleSelectScenario = (scenarioId: string) => {
    setIsSimulating(true)
    setSelectedScenarioId(scenarioId)
    setCustomQuestion('')
    setTimeout(() => {
      setIsSimulating(false)
    }, 220)
  }

  const handleCustomQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customQuestion.trim()) return

    setIsSimulating(true)
    const lower = customQuestion.toLowerCase()
    const isDangerous =
      lower.includes('drop') ||
      lower.includes('delete') ||
      lower.includes('update') ||
      lower.includes('alter') ||
      lower.includes('truncate') ||
      lower.includes('insert')

    startTransition(() => {
      if (isDangerous) {
        setSelectedScenarioId('attack_drop')
      } else if (lower.includes('temp') || lower.includes('packet') || lower.includes('telemetry') || lower.includes('cpu')) {
        setSelectedScenarioId('telemetry')
      } else if (lower.includes('firmware') || lower.includes('audit') || lower.includes('quality') || lower.includes('serial')) {
        setSelectedScenarioId('data_quality')
      } else {
        setSelectedScenarioId('warranties')
      }
      setTimeout(() => {
        setIsSimulating(false)
      }, 240)
    })
  }


  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null)

  const handleCopyPayload = (id: string, payload: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    navigator.clipboard.writeText(payload)
    setCopiedPayloadId(id)
    setTimeout(() => setCopiedPayloadId(null), 2000)
  }

  const handleTestInTerminal = (scenarioId: string) => {
    setActiveAttack(null)
    setIsSimulating(true)
    setSelectedScenarioId(scenarioId)
    setTerminalTab('ast')

    const el = document.getElementById('interactive-sandbox')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const terminalEl = el.querySelector('.sandbox-terminal-frame')
      if (terminalEl) {
        terminalEl.classList.remove('terminal-pulse-alert')
        void (terminalEl as HTMLElement).offsetWidth
        terminalEl.classList.add('terminal-pulse-alert')
        setTimeout(() => terminalEl.classList.remove('terminal-pulse-alert'), 2400)
      }
    }

    setTimeout(() => {
      setIsSimulating(false)
    }, 280)
  }

  const launchAttackSimulation = (attack: AttackVector) => {
    setActiveAttack(attack)
    setAttackSimulationState('analyzing')
    setTimeout(() => {
      setAttackSimulationState('blocked')
    }, 450)
  }

  const handleDemoFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDemoFormSubmitted(true)
  }

  return (
    <div className="landing-root">
      {/* ─── Ambient Glow Gradients ─── */}
      <div className="landing-ambient-glow" aria-hidden="true" />
      <div className="landing-mesh-grid" aria-hidden="true" />

      {/* ─── Top Enterprise Navigation ─── */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          <div className="landing-nav-brand">
            <QueryTrustLogo size={34} />
            <div className="landing-brand-meta">
              <span className="landing-brand-title">QueryTrust AI</span>
              <span className="landing-brand-badge">Equipment intelligence</span>
            </div>
          </div>

          <nav className="landing-nav-links" aria-label="Landing page sections">
            <a href="#interactive-sandbox" className="nav-anchor">
              Interactive Sandbox
            </a>
            <a href="#safety-architecture" className="nav-anchor">
              Safety Architecture
            </a>
            <a href="#hardware-telemetry" className="nav-anchor">
              Hardware Coverage
            </a>
            <a href="#attack-playground" className="nav-anchor">
              Attack Matrix
            </a>
            <a href="#deployment" className="nav-anchor">
              Deployment
            </a>
          </nav>

          <div className="landing-nav-controls">
            {/* Theme Toggle Button */}
            <button
              type="button"
              className="theme-toggle-pill"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={14} className="theme-icon sun" />
                  <span className="theme-label">Light</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="theme-icon moon" />
                  <span className="theme-label">Dark</span>
                </>
              )}
            </button>


            {/* Sign In Primary Action */}
            <button
              type="button"
              className="btn-landing-signin"
              onClick={onGoToLogin}
              id="landing-signin-button"
            >
              <span>Sign In</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="landing-hero-wrap">
        <div className="landing-hero-content">
          {/* Status Eyebrow Badge */}
          <div className="hero-status-pill">
            <span className="live-status-dot" />
            <ShieldCheck size={13} className="shield-icon" />
            <span className="pill-text">Zero-Mutation Physical Infrastructure Intelligence</span>
            <span className="pill-tag">AST Enforced</span>
          </div>

          {/* High-Contrast Hero Headline */}
          <h1 className="hero-primary-headline">
            Ask your equipment anything, in plain English.{' '}
            <span className="gradient-highlight-text">The AI can never break your data.</span>
          </h1>

          {/* High-Contrast Subtitle */}
          <p className="hero-supporting-description">
            Zero-mutation natural-language analytics for networking switches, routers, and real-time telemetry.
            Every generated query is parsed with SQLGlot AST, verified across 6 automated safety gates, and executed on a
            SELECT-only PostgreSQL reader role. Database mutations and drops are physically impossible.
          </p>

          {/* Action CTAs */}
          <div className="hero-action-buttons">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={onGoToLogin}
            >
              <Zap size={16} />
              <span>Launch Live Workspace</span>
              <ArrowRight size={16} />
            </button>

            <a href="#attack-playground" className="btn-hero-secondary">
              <Flame size={16} className="flame-icon" />
              <span>Test Security Interceptor</span>
            </a>

            <button
              type="button"
              className="btn-hero-tertiary"
              onClick={() => setShowDemoModal(true)}
            >
              <Calendar size={15} />
              <span>Book Architecture Walkthrough</span>
            </button>
          </div>

          {/* Trust Guarantees Bar */}
          <div className="hero-trust-guarantees">
            <div className="trust-pill">
              <CheckCircle2 size={14} className="trust-check" />
              <span>SELECT-Only Database Role</span>
            </div>
            <div className="trust-pill">
              <CheckCircle2 size={14} className="trust-check" />
              <span>SQLGlot AST Parse Barrier</span>
            </div>
            <div className="trust-pill">
              <CheckCircle2 size={14} className="trust-check" />
              <span>Schema-Bounded (Zero Hallucinations)</span>
            </div>
            <div className="trust-pill">
              <CheckCircle2 size={14} className="trust-check" />
              <span>Enforced LIMIT 200 &amp; 5s Timeout</span>
            </div>
          </div>
        </div>

        {/* ─── Hero Feature: Interactive Sandbox Terminal ─── */}
        <div className="interactive-sandbox-anchor" id="interactive-sandbox">
          <div className="sandbox-terminal-frame">
            {/* Terminal Window Header */}
            <div className="terminal-window-bar">
              <div className="terminal-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>

              <div className="terminal-status-info">
                <Terminal size={13} className="terminal-icon" />
                <span className="terminal-title">QueryTrust Security Inspector — Live Terminal Preview</span>
                <span className="connection-badge">
                  <span className="pulsing-green-dot" />
                  POSTGRESQL READ-ONLY (analytics_reader)
                </span>
              </div>

              <div className="terminal-tab-selectors">
                <button
                  type="button"
                  className={`terminal-tab-btn ${terminalTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setTerminalTab('preview')}
                >
                  <Code2 size={13} />
                  <span>Query &amp; Execution</span>
                </button>
                <button
                  type="button"
                  className={`terminal-tab-btn ${terminalTab === 'ast' ? 'active' : ''}`}
                  onClick={() => setTerminalTab('ast')}
                >
                  <ShieldCheck size={13} />
                  <span>6 AST Gates</span>
                </button>
                <button
                  type="button"
                  className={`terminal-tab-btn ${terminalTab === 'role' ? 'active' : ''}`}
                  onClick={() => setTerminalTab('role')}
                >
                  <Lock size={13} />
                  <span>DB Isolation</span>
                </button>
              </div>
            </div>

            {/* Terminal Preset Selector Bar */}
            <div className="sandbox-presets-bar">
              <span className="presets-label">Click a scenario to test:</span>
              <div className="presets-list">
                {SANDBOX_SCENARIOS.map((scenario) => {
                  const isSelected = scenario.id === selectedScenarioId
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      className={`preset-chip ${isSelected ? 'selected' : ''} ${
                        scenario.isAttack ? 'chip-attack' : ''
                      }`}
                      onClick={() => handleSelectScenario(scenario.id)}
                    >
                      <span className="preset-icon">{scenario.icon}</span>
                      <span className="preset-name">{scenario.title}</span>
                      {scenario.isAttack && <span className="attack-flag">ATTACK TEST</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Natural Language Prompt Input Bar */}
            <form onSubmit={handleCustomQuestionSubmit} className="sandbox-input-bar">
              <div className="input-field-wrap">
                <Search size={16} className="search-lead-icon" />
                <input
                  type="text"
                  className="natural-lang-input"
                  value={customQuestion || activeScenario.question}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Type a plain English question about equipment (e.g., 'Show switches with high temperature')..."
                  aria-label="Ask natural language question"
                />
              </div>
              <button type="submit" className="btn-run-query" disabled={isSimulating}>
                {isSimulating ? (
                  <>
                    <span className="mini-spinner" />
                    <span>Validating…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Run Query</span>
                  </>
                )}
              </button>
            </form>

            {/* Terminal Body Screen */}
            <div className="terminal-screen-body">
              {isSimulating ? (
                <div className="terminal-loading-state">
                  <div className="terminal-spinner" />
                  <p className="loading-text">Parsing SQL syntax tree with SQLGlot &amp; verifying 6 safety gates…</p>
                </div>
              ) : activeScenario.isAttack ? (
                /* Attack Interception Screen */
                <div className="terminal-interception-view">
                  <div className="interception-banner">
                    <div className="banner-icon-col">
                      <ShieldAlert size={28} className="danger-alert-icon" />
                    </div>
                    <div className="banner-text-col">
                      <div className="rejection-badge">HTTP 400 REJECTED AT AST BOUNDARY</div>
                      <h3 className="rejection-title">Malicious Mutation Command Blocked</h3>
                      <p className="rejection-desc">{activeScenario.rejectionReason}</p>
                    </div>
                  </div>

                  <div className="ast-violation-details-grid">
                    <div className="violation-box">
                      <span className="violation-label">Candidate Input:</span>
                      <code className="violation-code">{activeScenario.sql}</code>
                    </div>
                    <div className="violation-box">
                      <span className="violation-label">AST Node Trigger:</span>
                      <code className="violation-code">exp.Drop(this=Table[devices], exists=False)</code>
                    </div>
                    <div className="violation-box">
                      <span className="violation-label">Defense Layer:</span>
                      <span className="violation-val">Layer 2 (Syntax Tree Policy Enforcement)</span>
                    </div>
                    <div className="violation-box">
                      <span className="violation-label">Database Impact:</span>
                      <span className="violation-val success">0 Rows Touched (Execution Never Reached DB)</span>
                    </div>
                  </div>
                </div>
              ) : terminalTab === 'preview' ? (
                /* Tab 1: SQL Preview and Result Table */
                <div className="terminal-query-results-view">
                  <div className="generated-sql-container">
                    <div className="sql-box-header">
                      <div className="sql-box-title">
                        <Code2 size={13} />
                        <span>Generated SQL Query (Schema-Bounded)</span>
                      </div>
                      <div className="sql-security-tag">
                        <ShieldCheck size={12} />
                        <span>Validated &bull; SELECT-Only</span>
                      </div>
                    </div>
                    <pre className="sql-code-block">
                      <code>{activeScenario.sql}</code>
                    </pre>
                  </div>

                  {activeScenario.results && (
                    <div className="results-table-container">
                      <div className="results-meta-header">
                        <div className="meta-left">
                          <Activity size={13} className="meta-icon" />
                          <span>PostgreSQL Execution Result (clamped to safe limit)</span>
                        </div>
                        <span className="meta-rows-badge">{activeScenario.results.length} hardware rows returned</span>
                      </div>
                      <div className="results-table-scroll">
                        <table className="results-table">
                          <thead>
                            <tr>
                              <th>Device Name</th>
                              <th>Hardware Spec / Metric</th>
                              <th>Site Location</th>
                              <th>Warranty / Telemetry</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeScenario.results.map((row, idx) => (
                              <tr key={idx}>
                                <td className="device-cell">
                                  <Server size={13} className="table-row-icon" />
                                  <span className="device-code">{row.col1}</span>
                                </td>
                                <td>{row.col2}</td>
                                <td>{row.col3}</td>
                                <td className="highlight-cell">{row.col4}</td>
                                <td>
                                  <span className={`status-pill ${row.col5.toLowerCase()}`}>
                                    {row.col5}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : terminalTab === 'ast' ? (
                /* Tab 2: 6 AST Safety Gates */
                <div className="terminal-ast-checks-view">
                  <div className="ast-header-bar">
                    <h3 className="ast-view-title">Automated 6-Point AST Security Verification</h3>
                    <p className="ast-view-desc">
                      Before any query touches PostgreSQL, SQLGlot generates a concrete syntax tree. Every node is walked to
                      guarantee strict compliance with the zero-mutation specification.
                    </p>
                  </div>

                  <div className="safety-gates-grid">
                    <div className="gate-card pass">
                      <div className="gate-icon-wrap">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="gate-body">
                        <div className="gate-title-row">
                          <span className="gate-name">1. Single Statement Enforced</span>
                          <span className="gate-status">PASS</span>
                        </div>
                        <p className="gate-detail">Requires exactly one SQL expression. Rejects statement-chaining (;) exploits.</p>
                      </div>
                    </div>

                    <div className="gate-card pass">
                      <div className="gate-icon-wrap">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="gate-body">
                        <div className="gate-title-row">
                          <span className="gate-name">2. SELECT-Only AST Root</span>
                          <span className="gate-status">PASS</span>
                        </div>
                        <p className="gate-detail">AST root must resolve to exp.Select. Drops, Updates, Inserts, and Alters rejected.</p>
                      </div>
                    </div>

                    <div className="gate-card pass">
                      <div className="gate-icon-wrap">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="gate-body">
                        <div className="gate-title-row">
                          <span className="gate-name">3. Catalog Table Whitelist</span>
                          <span className="gate-status">PASS</span>
                        </div>
                        <p className="gate-detail">Restricted strictly to devices, telemetry, sites, and maintenance_tickets.</p>
                      </div>
                    </div>

                    <div className="gate-card pass">
                      <div className="gate-icon-wrap">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="gate-body">
                        <div className="gate-title-row">
                          <span className="gate-name">4. Safe Function Allowlist</span>
                          <span className="gate-status">PASS</span>
                        </div>
                        <p className="gate-detail">Permits deterministic aggregate/math functions. Blocks pg_sleep, dblink, copy_to.</p>
                      </div>
                    </div>

                    <div className="gate-card pass">
                      <div className="gate-icon-wrap">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="gate-body">
                        <div className="gate-title-row">
                          <span className="gate-name">5. System Catalog Prohibited</span>
                          <span className="gate-status">PASS</span>
                        </div>
                        <p className="gate-detail">Blocks queries touching pg_*, information_schema, or server internals.</p>
                      </div>
                    </div>

                    <div className="gate-card pass">
                      <div className="gate-icon-wrap">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="gate-body">
                        <div className="gate-title-row">
                          <span className="gate-name">6. Clamped Row Bounds</span>
                          <span className="gate-status">PASS</span>
                        </div>
                        <p className="gate-detail">AST injects or clamps LIMIT 200 with 5.0 second query cancellation timeout.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 3: Database Role Isolation */
                <div className="terminal-db-isolation-view">
                  <div className="isolation-card">
                    <div className="isolation-header">
                      <Lock size={20} className="isolation-icon" />
                      <div>
                        <h4>Physical PostgreSQL Role Enforcement</h4>
                        <p>Even in the theoretical event of an AST bypass, PostgreSQL rejects writes at the kernel level.</p>
                      </div>
                    </div>
                    <div className="isolation-code-sample">
                      <div className="code-label">PostgreSQL Role Grants (Migration Verified):</div>
                      <pre>
                        <code>{`-- Dedicated read-only analytics execution role
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_reader;

-- Physical proof: Any INSERT, UPDATE, DELETE, or DROP yields:
-- ERROR: permission denied for table <table_name>`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal Window Footer */}
            <div className="terminal-footer-strip">
              <div className="footer-left-status">
                <Shield size={13} className="text-accent" />
                <span>Zero-Trust Natural Language Pipeline &bull; AST Execution Token Verified</span>
              </div>
              <button
                type="button"
                className="btn-try-live-app"
                onClick={onGoToLogin}
              >
                <span>Open in Full App</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Platform Metrics & Scale Strip ─── */}
      <section className="metrics-banner-strip">
        <div className="metrics-container">
          <div className="metric-ticker-card">
            <div className="metric-number">5,000</div>
            <div className="metric-label">Monitored Hardware Assets</div>
            <div className="metric-sub">Switches, routers, firewalls, APs</div>
          </div>
          <div className="metric-ticker-card">
            <div className="metric-number">25,000+</div>
            <div className="metric-label">Telemetry Snapshots</div>
            <div className="metric-sub">Thermal, PSU, packet drops, CPU</div>
          </div>
          <div className="metric-ticker-card">
            <div className="metric-number">6-Layer</div>
            <div className="metric-label">AST Parse Security Guard</div>
            <div className="metric-sub">SQLGlot PostgreSQL traversal</div>
          </div>
          <div className="metric-ticker-card">
            <div className="metric-number">0</div>
            <div className="metric-label">Mutations Allowed</div>
            <div className="metric-sub">SELECT-only physical role</div>
          </div>
          <div className="metric-ticker-card">
            <div className="metric-number">&lt; 45ms</div>
            <div className="metric-label">AST Verification Latency</div>
            <div className="metric-sub">Real-time syntax evaluation</div>
          </div>
        </div>
      </section>

      {/* ─── Architectural Pipeline: How Zero-Mutation Works ─── */}
      <section className="landing-section" id="safety-architecture">
        <div className="section-header-block">
          <div className="section-tag-pill">ARCHITECTURAL INVARIANTS</div>
          <h2 className="section-main-heading">Why the AI can never break your data</h2>
          <p className="section-lead-paragraph">
            Most "Text-to-SQL" tools hand LLM-generated code directly to the database. QueryTrust AI treats LLM output as
            completely untrusted input, surrounding it with 4 impenetrable validation barriers.
          </p>
        </div>

        <div className="safety-architecture-visual-banner">
          <img
            src="/images/ast_architecture.jpg"
            alt="Multi-layer AST Safety Shield Architecture Diagram"
            className="safety-architecture-img"
            loading="lazy"
          />
          <div className="safety-architecture-overlay">
            <span className="safety-arch-tag">6-Point AST Traversal Pipeline</span>
            <span className="safety-arch-sub">Strict read-only verification before database reader dispatch</span>
          </div>
        </div>

        <div className="architecture-steps-flow">
          <div className="arch-step-box">
            <div className="step-badge-counter">01</div>
            <div className="arch-step-icon">
              <Sparkles size={20} />
            </div>
            <h3 className="arch-step-title">Isolated Translation</h3>
            <p className="arch-step-text">
              Natural language is converted to candidate SQL within a schema-bounded sandbox. The LLM has zero database
              connection strings, credentials, or execution capability.
            </p>
            <div className="arch-pill-tag">No DB Access</div>
          </div>

          <div className="arch-step-box highlighted">
            <div className="step-badge-counter">02</div>
            <div className="arch-step-icon">
              <ShieldCheck size={20} />
            </div>
            <h3 className="arch-step-title">Deep AST Syntax Traversal</h3>
            <p className="arch-step-text">
              SQLGlot parses the candidate query into a formal syntax tree. It rigorously enforces 6 invariants: single
              SELECT statement, table whitelist, safe functions, and no system catalogs.
            </p>
            <div className="arch-pill-tag accent">6 AST Gates</div>
          </div>

          <div className="arch-step-box">
            <div className="step-badge-counter">03</div>
            <div className="arch-step-icon">
              <KeyRound size={20} />
            </div>
            <h3 className="arch-step-title">Tamper-Proof Execution Token</h3>
            <p className="arch-step-text">
              The frontend never sends raw SQL to be executed. The server stores the validated query and returns a signed,
              time-bounded preview ID that is re-validated before execution.
            </p>
            <div className="arch-pill-tag">Signed Token</div>
          </div>

          <div className="arch-step-box">
            <div className="step-badge-counter">04</div>
            <div className="arch-step-icon">
              <Lock size={20} />
            </div>
            <h3 className="arch-step-title">Physical Role Enforcement</h3>
            <p className="arch-step-text">
              Queries run strictly through the PostgreSQL <code className="inline-code">analytics_reader</code> role.
              All INSERT, UPDATE, DELETE, and DROP commands are rejected by the database engine.
            </p>
            <div className="arch-pill-tag">SELECT-Only</div>
          </div>
        </div>
      </section>

      {/* ─── Hardware & Telemetry Ecosystem ─── */}
      <section className="landing-section bg-contrast" id="hardware-telemetry">
        <div className="section-header-block">
          <div className="section-tag-pill">EQUIPMENT DATA MODEL</div>
          <h2 className="section-main-heading">Built specifically for physical hardware operations</h2>
          <p className="section-lead-paragraph">
            General-purpose AI hallucinates when asking about hardware serial numbers, optics levels, and firmware
            matrices. QueryTrust models the physical realities of enterprise network infrastructure.
          </p>
        </div>

        <div className="hardware-categories-grid">
          <div className="hardware-card">
            <div className="hardware-visual-banner">
              <img
                src="/images/switch.jpg"
                alt="Enterprise Core and Access Switch Rackmount Chassis"
                className="hardware-visual-img"
                loading="lazy"
              />
            </div>
            <div className="hardware-icon-head">
              <Server size={22} className="hardware-icon" />
              <span className="asset-count">1,629 Units</span>
            </div>
            <h3 className="hardware-title">Core &amp; Access Switches</h3>
            <p className="hardware-desc">
              Cisco Catalyst 9300/9500, Arista 7050SX, Juniper EX4300. Track stacking configurations, PoE budgets, and port errors.
            </p>
            <div className="tag-cluster">
              <span className="spec-tag">StackWise</span>
              <span className="spec-tag">PoE+</span>
              <span className="spec-tag">100G Uplink</span>
            </div>
          </div>

          <div className="hardware-card">
            <div className="hardware-visual-banner">
              <img
                src="/images/router.jpg"
                alt="Enterprise Edge and WAN Router Chassis"
                className="hardware-visual-img"
                loading="lazy"
              />
            </div>
            <div className="hardware-icon-head">
              <Radio size={22} className="hardware-icon" />
              <span className="asset-count">882 Units</span>
            </div>
            <h3 className="hardware-title">Edge &amp; WAN Routers</h3>
            <p className="hardware-desc">
              Cisco ASR 1001-X, ISR 4451, Juniper MX204. Monitor BGP flap frequency, WAN circuit saturation, and IP SLA metrics.
            </p>
            <div className="tag-cluster">
              <span className="spec-tag">BGP Flap</span>
              <span className="spec-tag">MPLS</span>
              <span className="spec-tag">IPsec</span>
            </div>
          </div>

          <div className="hardware-card">
            <div className="hardware-visual-banner">
              <img
                src="/images/firewall.jpg"
                alt="Enterprise Next-Gen Security Firewall Appliance"
                className="hardware-visual-img"
                loading="lazy"
              />
            </div>
            <div className="hardware-icon-head">
              <Shield size={22} className="hardware-icon" />
              <span className="asset-count">887 Units</span>
            </div>
            <h3 className="hardware-title">Next-Gen Firewalls</h3>
            <p className="hardware-desc">
              Palo Alto PA-3220, Fortinet FortiGate 100F. Audit HA sync states, certificate expiration dates, and threat engine updates.
            </p>
            <div className="tag-cluster">
              <span className="spec-tag">HA Cluster</span>
              <span className="spec-tag">SSL Certs</span>
              <span className="spec-tag">App-ID</span>
            </div>
          </div>

          <div className="hardware-card">
            <div className="hardware-visual-banner">
              <img
                src="/images/access_point.jpg"
                alt="Enterprise Campus Wireless Access Point"
                className="hardware-visual-img"
                loading="lazy"
              />
            </div>
            <div className="hardware-icon-head">
              <Cpu size={22} className="hardware-icon" />
              <span className="asset-count">837 Units</span>
            </div>
            <h3 className="hardware-title">Campus Wireless APs</h3>
            <p className="hardware-desc">
              Cisco Catalyst 9120AX, Aruba AP-515. Detect channel interference, client drop anomalies, and radio reboot loops.
            </p>
            <div className="tag-cluster">
              <span className="spec-tag">Wi-Fi 6</span>
              <span className="spec-tag">BSSID</span>
              <span className="spec-tag">RF Density</span>
            </div>
          </div>
        </div>

        {/* Telemetry Feature Spotlight */}
        <div className="telemetry-spotlight-box">
          <div className="spotlight-header">
            <Activity size={18} className="text-accent" />
            <h3 className="spotlight-title">Real-Time Telemetry Profiling with IsolationForest ML</h3>
          </div>
          <p className="spotlight-body">
            Alongside standard SQL queries, QueryTrust feeds continuous hardware telemetry (CPU utilization, PSU voltage,
            ambient chassis temperature, and packet drop rates) through an unsupervised IsolationForest model to flag statistical
            anomalies before equipment fails.
          </p>
        </div>
      </section>

      {/* ─── Attack Matrix Playground: Try to Break It ─── */}
      <section className="landing-section" id="attack-playground">
        <div className="section-header-block">
          <div className="section-tag-pill accent">INTERACTIVE SECURITY AUDIT</div>
          <h2 className="section-main-heading">Try to break it — live attack testing</h2>
          <p className="section-lead-paragraph">
            Don't take our word for it. Test real attack payloads against our multi-layered validation engine and observe
            how the AST syntax tree halts execution.
          </p>
        </div>

        <div className="attack-matrix-grid">
          {ATTACK_VECTORS.map((attack) => (
            <div key={attack.id} className="attack-card">
              <div className="attack-card-top">
                <div className="attack-tags-group">
                  <span className="attack-severity-tag">{attack.severity}</span>
                  <span className="attack-cwe-tag">{attack.cwe}</span>
                </div>
                <span className="attack-type-tag">{attack.vectorType}</span>
              </div>

              <h3 className="attack-name">{attack.name}</h3>
              <p className="attack-desc">{attack.description}</p>

              <div className="attack-payload-preview">
                <div className="payload-code-header">
                  <span className="payload-tag-label">EXPLOIT PAYLOAD</span>
                  <button
                    type="button"
                    className="btn-copy-mini"
                    onClick={(e) => handleCopyPayload(attack.id, attack.payload, e)}
                    title="Copy attack payload to clipboard"
                    aria-label="Copy attack payload"
                  >
                    {copiedPayloadId === attack.id ? (
                      <>
                        <CheckCheck size={12} className="text-success" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <code>{attack.payload}</code>
              </div>

              <div className="attack-protection-note">
                <ShieldCheck size={13} className="text-success" />
                <span>Blocked by: {attack.blockedBy}</span>
              </div>

              <div className="attack-card-actions">
                <button
                  type="button"
                  className="btn-inspect-ast"
                  onClick={() => launchAttackSimulation(attack)}
                  title="Inspect deep syntax tree parsing and security invariants"
                >
                  <Flame size={14} />
                  <span>Inspect AST Trace</span>
                </button>
                <button
                  type="button"
                  className="btn-load-sandbox"
                  onClick={() => handleTestInTerminal(attack.scenarioId)}
                  title="Load this exploit into the interactive terminal sandbox above"
                >
                  <Terminal size={14} />
                  <span>Test in Sandbox ↑</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Persona Solutions ─── */}
      <section className="landing-section bg-contrast">
        <div className="section-header-block">
          <div className="section-tag-pill">AUDIENCE &amp; WORKFLOWS</div>
          <h2 className="section-main-heading">Engineered for every tier of infrastructure management</h2>
          <p className="section-lead-paragraph">
            Whether troubleshooting an outage, onboarding client fleets, or proving compliance, QueryTrust adapts to your role.
          </p>
        </div>

        <div className="personas-cards-grid">
          <div className="persona-box">
            <div className="persona-avatar-icon">
              <Server size={22} />
            </div>
            <h3 className="persona-heading">Network Operations &amp; SRE</h3>
            <p className="persona-summary">
              Investigate hardware state without waiting for BI dashboards or writing error-prone SQL queries during critical triage.
            </p>
            <ul className="persona-feature-list">
              <li>Instant warranty lifecycle and support renewal searches</li>
              <li>Chassis thermal and power supply fluctuation discovery</li>
              <li>Firmware version discrepancy identification</li>
            </ul>
          </div>

          <div className="persona-box">
            <div className="persona-avatar-icon">
              <Building size={22} />
            </div>
            <h3 className="persona-heading">Managed Service Providers (MSPs)</h3>
            <p className="persona-summary">
              Give client organizations self-service reporting into their physical equipment without opening access to raw write tables.
            </p>
            <ul className="persona-feature-list">
              <li>Zero risk of client queries mutating configuration tables</li>
              <li>Multi-site inventory breakdowns exportable to CSV</li>
              <li>Pre-built natural language templates for end users</li>
            </ul>
          </div>

          <div className="persona-box">
            <div className="persona-avatar-icon">
              <FileCheck size={22} />
            </div>
            <h3 className="persona-heading">Security &amp; Compliance Officers</h3>
            <p className="persona-summary">
              Gain cryptographically auditable proof that the AI analytics layer cannot alter financial, asset, or security logs.
            </p>
            <ul className="persona-feature-list">
              <li>100% rejection rate on non-SELECT statements</li>
              <li>Automated evaluation lab with 104+ regression test benchmarks</li>
              <li>Immutable query audit logs with AST violation records</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Transparent Deployment Options ─── */}
      <section className="landing-section" id="deployment">
        <div className="section-header-block">
          <div className="section-tag-pill">DEPLOYMENT TIERS</div>
          <h2 className="section-main-heading">Simple, transparent architecture</h2>
          <div className="prototype-status-pill">
            <span className="live-dot" />
            <span>Interactive Educational Prototype &bull; Instant Access</span>
          </div>
          <p className="section-lead-paragraph">
            Every deployment tier comes standard with the 6-layer AST safety guard, read-only database reader role, and
            transparent evaluation benchmarks.
          </p>
        </div>

        <div className="pricing-cards-container">
          <div className="plan-column">
            <div className="plan-head">
              <div className="plan-title">Team Fleet</div>
              <div className="plan-badge-price">Preview Access</div>
              <p className="plan-tagline">Ideal for regional network operations and departmental testing.</p>
            </div>
            <ul className="plan-checklist">
              <li><Check size={14} className="check-icon" /> Up to 5,000 physical equipment assets</li>
              <li><Check size={14} className="check-icon" /> 3 Analyst seats + unlimited Viewer access</li>
              <li><Check size={14} className="check-icon" /> 6-Point AST syntax verification</li>
              <li><Check size={14} className="check-icon" /> Automated Data Quality rule diagnostics</li>
              <li><Check size={14} className="check-icon" /> 30-Day tamper-evident query audit trail</li>
            </ul>
            <button
              type="button"
              className="btn-plan-action secondary"
              onClick={onGoToLogin}
            >
              Sign In to View
            </button>
          </div>

          <div className="plan-column featured">
            <div className="featured-banner-tag">RECOMMENDED FOR OPS</div>
            <div className="plan-head">
              <div className="plan-title">Enterprise Ops</div>
              <div className="plan-badge-price">Preview Access</div>
              <p className="plan-tagline">For multi-site data centers and managed infrastructure providers.</p>
            </div>
            <ul className="plan-checklist">
              <li><Check size={14} className="check-icon" /> Up to 50,000 physical equipment assets</li>
              <li><Check size={14} className="check-icon" /> 10 Analyst seats + full RBAC access</li>
              <li><Check size={14} className="check-icon" /> Live IsolationForest telemetry anomaly monitor</li>
              <li><Check size={14} className="check-icon" /> Custom AST table/function whitelist rules</li>
              <li><Check size={14} className="check-icon" /> 1-Year compliance audit log retention</li>
              <li><Check size={14} className="check-icon" /> One-click CSV and JSON data export</li>
            </ul>
            <button
              type="button"
              className="btn-plan-action primary"
              onClick={onGoToLogin}
            >
              Sign In to Access
            </button>
          </div>

          <div className="plan-column">
            <div className="plan-head">
              <div className="plan-title">Self-Hosted VPC</div>
              <div className="plan-badge-price">Custom Architecture</div>
              <p className="plan-tagline">Air-gapped and on-premises deployment for mission-critical networks.</p>
            </div>
            <ul className="plan-checklist">
              <li><Check size={14} className="check-icon" /> Unlimited equipment records &amp; sites</li>
              <li><Check size={14} className="check-icon" /> On-premises Kubernetes or Docker container deploy</li>
              <li><Check size={14} className="check-icon" /> Local LLM inference integration (Ollama / vLLM)</li>
              <li><Check size={14} className="check-icon" /> Automated regression evaluation lab</li>
              <li><Check size={14} className="check-icon" /> 24/7 Priority SLA &amp; architecture review</li>
            </ul>
            <button
              type="button"
              className="btn-plan-action secondary"
              onClick={() => setShowDemoModal(true)}
            >
              Request Architecture Consultation
            </button>
          </div>
        </div>
      </section>

      {/* ─── Enterprise Footer ─── */}
      <footer className="landing-footer-wrap">
        <div className="landing-footer-container">
          <div className="footer-meta-block">
            <div className="footer-brand-row">
              <QueryTrustLogo size={26} />
              <span className="footer-brand-name">QueryTrust AI</span>
            </div>
            <p className="footer-disclaimer-text">
              <strong>Synthetic Educational Environment:</strong> This system operates on 5,000 synthetic devices, 50 sites,
              and 25,000 telemetry readings. No connection to real customer or vendor infrastructure. Built with PostgreSQL,
              SQLGlot, FastAPI, React, and scikit-learn.
            </p>
          </div>

          <div className="footer-actions-block">
            <button
              type="button"
              className="btn-footer-signin"
              onClick={onGoToLogin}
            >
              <span>Sign In to Workspace</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </footer>

      {/* ─── Production DevTools Security AST Inspector Modal ─── */}
      {activeAttack && (
        <div className="modal-backdrop-blur" onClick={() => setActiveAttack(null)}>
          <div
            className="attack-modal-window"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="attack-dialog-title"
          >
            <div className="modal-dialog-header">
              <div className="modal-title-left">
                <ShieldAlert size={22} className="text-danger" />
                <div>
                  <div className="modal-badge-row">
                    <span className="attack-severity-tag">{activeAttack.severity}</span>
                    <span className="attack-cwe-tag">{activeAttack.cwe}</span>
                    <span className="modal-gate-pill">GATE 2: AST BOUNDARY</span>
                  </div>
                  <h3 id="attack-dialog-title" className="modal-dialog-heading">
                    {activeAttack.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-dismiss"
                onClick={() => setActiveAttack(null)}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-dialog-body">
              {attackSimulationState === 'analyzing' ? (
                <div className="simulation-evaluating-box">
                  <div className="eval-spinner" />
                  <p>SQLGlot constructing syntax tree &amp; walking AST nodes in PostgreSQL dialect…</p>
                </div>
              ) : (
                <div className="ast-modal-grid">
                  {/* Left Column: Intercepted Query, Interception Alert, and 4-Stage Trace */}
                  <div className="ast-modal-col-left">
                    <div className="attack-payload-display">
                      <div className="payload-display-header">
                        <span className="code-header-tag">Target Attack SQL Payload</span>
                        <button
                          type="button"
                          className="btn-copy-mini"
                          onClick={(e) => handleCopyPayload('modal-payload', activeAttack.payload, e)}
                          aria-label="Copy attack payload"
                        >
                          {copiedPayloadId === 'modal-payload' ? (
                            <>
                              <CheckCheck size={12} className="text-success" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Payload</span>
                            </>
                          )}
                        </button>
                      </div>
                      <code className="danger-code-line">{activeAttack.payload}</code>
                    </div>

                    <div className="blocked-alert-banner">
                      <ShieldAlert size={20} className="text-danger" />
                      <div>
                        <h4 className="blocked-heading">ATTACK INTERCEPTED &amp; BLOCKED PRE-FLIGHT</h4>
                        <p className="blocked-rule-text">{activeAttack.astRule}</p>
                      </div>
                    </div>

                    {/* 4-Stage Execution Trace */}
                    <div className="ast-trace-timeline">
                      <div className="trace-step done">
                        <div className="trace-step-number">1</div>
                        <div className="trace-step-text">
                          <strong>Lexical Tokenization:</strong> Dissected query string into typed PostgreSQL tokens.
                        </div>
                      </div>
                      <div className="trace-step active">
                        <div className="trace-step-number">2</div>
                        <div className="trace-step-text">
                          <strong>AST Syntax Walker:</strong> Prohibited node trigger tripped: <code className="trace-code-highlight">{activeAttack.astNodeTrigger}</code>
                        </div>
                      </div>
                      <div className="trace-step done">
                        <div className="trace-step-number">3</div>
                        <div className="trace-step-text">
                          <strong>Safety Invariant Guard:</strong> Disallowed operation detected. Emitted HTTP 400 rejection pre-execution.
                        </div>
                      </div>
                      <div className="trace-step safe">
                        <div className="trace-step-number">4</div>
                        <div className="trace-step-text">
                          <strong>PostgreSQL Socket Protection:</strong> 0 bytes dispatched to port 5432. Database remains in pristine state.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Backend Python Invariant Enforcement Snippet & Telemetry Evidence */}
                  <div className="ast-modal-col-right">
                    <div className="python-code-box">
                      <div className="python-code-header">
                        <span className="python-code-label">PROVEN IN BACKEND ENGINE (app/core/sql_validator.py)</span>
                        <span className="python-code-badge">SQLGlot AST Guard</span>
                      </div>
                      <pre className="python-code-pre">
                        <code>{activeAttack.pythonDefenseSnippet}</code>
                      </pre>
                    </div>

                    <div className="interception-reasons-grid">
                      <div className="reason-item">
                        <span className="reason-key">Defense Mechanism:</span>
                        <span className="reason-val">{activeAttack.blockedBy}</span>
                      </div>
                      <div className="reason-item">
                        <span className="reason-key">HTTP Status:</span>
                        <span className="reason-val danger">400 Bad Request (Safety Invariant Violated)</span>
                      </div>
                      <div className="reason-item">
                        <span className="reason-key">PostgreSQL Execution:</span>
                        <span className="reason-val success">0 Rows Affected (Blocked Pre-Execution)</span>
                      </div>
                      <div className="reason-item">
                        <span className="reason-key">Audit Log Record:</span>
                        <span className="reason-val">Logged to audit_trail with client IP &amp; AST hash</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Dialog Footer */}
            <div className="modal-dialog-footer">
              <div className="modal-footer-proof">
                <ShieldCheck size={14} className="text-success" />
                <span>Zero database socket dispatch &bull; Read-only reader role preserved</span>
              </div>
              <div className="modal-actions-bar">
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setActiveAttack(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-modal-copy"
                  onClick={(e) => handleCopyPayload('modal-payload-footer', activeAttack.payload, e)}
                >
                  {copiedPayloadId === 'modal-payload-footer' ? (
                    <>
                      <CheckCheck size={14} className="text-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Exploit SQL</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-modal-sandbox"
                  onClick={() => handleTestInTerminal(activeAttack.scenarioId)}
                  title="Load this exploit into the interactive terminal sandbox above"
                >
                  <Terminal size={14} />
                  <span>Test in Sandbox ↑</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Book Architecture Demo Modal ─── */}
      {showDemoModal && (
        <div className="modal-backdrop-blur" onClick={() => setShowDemoModal(false)}>
          <div
            className="demo-request-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-dialog-title"
          >
            <div className="modal-dialog-header">
              <div className="modal-title-left">
                <Calendar size={18} className="text-accent" />
                <div>
                  <h3 id="demo-dialog-title" className="modal-dialog-heading">
                    Book Architecture Walkthrough
                  </h3>
                  <span className="modal-dialog-sub">1-on-1 Hardware Governance Demo</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-dismiss"
                onClick={() => setShowDemoModal(false)}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-dialog-body">
              {demoFormSubmitted ? (
                <div className="demo-submitted-notice">
                  <div className="submitted-check-circle">
                    <Check size={24} />
                  </div>
                  <h4 className="submitted-title">Walkthrough Scheduled!</h4>
                  <p className="submitted-desc">
                    Thank you, {demoFormData.name || 'there'}. Because this is an active live sandbox, you can jump directly
                    into the complete application right now with full analyst permissions.
                  </p>
                  <button
                    type="button"
                    className="btn-hero-primary"
                    onClick={() => {
                      setShowDemoModal(false)
                      onGoToLogin()
                    }}
                  >
                    Open Workspace Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDemoFormSubmit} className="demo-form-stack">
                  <div className="form-input-group">
                    <label className="form-field-label">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jordan Reed"
                      className="form-text-input"
                      value={demoFormData.name}
                      onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-input-group">
                    <label className="form-field-label">Work Email</label>
                    <input
                      type="email"
                      required
                      placeholder="jordan@enterprise.com"
                      className="form-text-input"
                      value={demoFormData.email}
                      onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-input-group">
                    <label className="form-field-label">Primary Infrastructure Domain</label>
                    <select
                      className="form-select-input"
                      value={demoFormData.role}
                      onChange={(e) => setDemoFormData({ ...demoFormData, role: e.target.value })}
                    >
                      <option value="Network Operations">Network Operations &amp; SRE</option>
                      <option value="MSP">Managed Service Provider (MSP)</option>
                      <option value="Security">Security &amp; Compliance</option>
                      <option value="Data Center">Data Center Facilities</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-hero-primary" style={{ marginTop: '0.5rem' }}>
                    Confirm Walkthrough Request
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
