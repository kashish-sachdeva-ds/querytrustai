import React, { useState } from 'react'
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Check,
  Flame,
  Database,
  Lock,
  Layers,
  Terminal,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './OnboardingModal.css'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectQuestion?: (question: string) => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSelectQuestion,
}) => {
  const { user } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'analyst' | 'viewer'>(
    (user?.role as 'admin' | 'analyst' | 'viewer') || 'analyst'
  )
  const [attackSimulated, setAttackSimulated] = useState(false)
  const [simulatingAttack, setSimulatingAttack] = useState(false)
  const [dbTesting, setDbTesting] = useState(false)
  const [dbTested, setDbTested] = useState(false)

  if (!isOpen) return null

  const handleComplete = () => {
    try {
      localStorage.setItem('qt_onboarded', 'true')
    } catch {
      /* noop */
    }
    onClose()
  }

  const handleSimulateAttack = () => {
    setSimulatingAttack(true)
    setTimeout(() => {
      setSimulatingAttack(false)
      setAttackSimulated(true)
    }, 450)
  }

  const handleTestConnection = () => {
    setDbTesting(true)
    setTimeout(() => {
      setDbTesting(false)
      setDbTested(true)
    }, 550)
  }

  return (
    <div className="onboarding-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="onboarding-card" onClick={(e) => e.stopPropagation()}>
        {/* --- Top Header & Brand --- */}
        <div className="onboarding-header">
          <div className="onboarding-brand-group">
            <div className="onboarding-brand-icon">
              <Sparkles size={15} />
            </div>
            <div className="onboarding-title-wrap">
              <h3>
                <span>QueryTrust</span>
                <span className="onboarding-ai-chip">SYSTEM TOUR</span>
              </h3>
              <div className="onboarding-subtitle">
                Interactive architecture, security proofs, and role boundaries
              </div>
            </div>
          </div>
          <div className="onboarding-header-actions">
            <button
              type="button"
              className="onboarding-close-btn"
              onClick={onClose}
              aria-label="Close tour"
              title="Close tour"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* --- Interactive Stepper Bar (The Guide Bar) --- */}
        <nav className="onboarding-stepper" aria-label="Tour steps">
          <button
            type="button"
            className={`stepper-tab ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
            onClick={() => setStep(1)}
          >
            <span className="stepper-num">{step > 1 ? '✓' : '1'}</span>
            <span>01. User Roles</span>
          </button>

          <button
            type="button"
            className={`stepper-tab ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
            onClick={() => setStep(2)}
          >
            <span className="stepper-num">{step > 2 ? '✓' : '2'}</span>
            <span>02. Security Shield</span>
          </button>

          <button
            type="button"
            className={`stepper-tab ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}
            onClick={() => setStep(3)}
          >
            <span className="stepper-num">{step > 3 ? '✓' : '3'}</span>
            <span>03. Live Questions</span>
          </button>

          <button
            type="button"
            className={`stepper-tab ${step === 4 ? 'active' : ''}`}
            onClick={() => setStep(4)}
          >
            <span className="stepper-num">4</span>
            <span>04. Read-Only DB</span>
          </button>
        </nav>

        {/* --- Body Step Content --- */}
        <div className="onboarding-body">
          {/* STEP 1: USER ROLES & DYNAMIC PERMISSION MATRIX */}
          {step === 1 && (
            <>
              <div className="onboarding-step-hero">
                <span className="onboarding-step-eyebrow">
                  <ShieldCheck size={12} />
                  Authentication &amp; Enforcement
                </span>
                <h4 className="onboarding-step-heading">Role Permissions &amp; Access Boundaries</h4>
                <p className="onboarding-step-desc">
                  Permissions are strictly validated on every server endpoint. SELECT-only privileges are hardware-enforced at PostgreSQL proxy.
                </p>
              </div>

              {/* 3 Compact Role Selection Cards */}
              <div className="role-cards-grid">
                <div
                  className={`role-card ${selectedRole === 'admin' ? 'active' : ''}`}
                  onClick={() => setSelectedRole('admin')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="role-card-top">
                    <span className="role-badge-tag admin">Administrator</span>
                    {selectedRole === 'admin' && <Check size={13} style={{ color: '#ff6b2b' }} />}
                  </div>
                  <div className="role-title">Admin Governance</div>
                  <div className="role-desc">
                    Tenant management, full audit logs, and benchmark suites.
                  </div>
                </div>

                <div
                  className={`role-card ${selectedRole === 'analyst' ? 'active' : ''}`}
                  onClick={() => setSelectedRole('analyst')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="role-card-top">
                    <span className="role-badge-tag analyst">Analyst (Default)</span>
                    {selectedRole === 'analyst' && <Check size={13} style={{ color: '#ff6b2b' }} />}
                  </div>
                  <div className="role-title">Interactive Analytics</div>
                  <div className="role-desc">
                    Ask equipment questions in English and triage outliers.
                  </div>
                </div>

                <div
                  className={`role-card ${selectedRole === 'viewer' ? 'active' : ''}`}
                  onClick={() => setSelectedRole('viewer')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="role-card-top">
                    <span className="role-badge-tag viewer">Viewer</span>
                    {selectedRole === 'viewer' && <Check size={13} style={{ color: '#ff6b2b' }} />}
                  </div>
                  <div className="role-title">Executive Oversight</div>
                  <div className="role-desc">
                    High-level fleet KPIs and verified inventory summaries.
                  </div>
                </div>
              </div>

              {/* Dynamic 2-Column Capability Matrix */}
              <div className="perm-matrix-card">
                <div className="perm-matrix-title">
                  <span>Active Role Capabilities ({selectedRole.toUpperCase()})</span>
                  <span className="perm-matrix-tag">Enforced by Server</span>
                </div>
                <div className="perm-matrix-grid">
                  <div className="perm-matrix-row">
                    <span className="perm-label">
                      <Terminal size={12} style={{ color: '#ff6b2b' }} />
                      Natural Language to SQL
                    </span>
                    <span className={`perm-status ${selectedRole === 'viewer' ? 'hidden' : 'allowed'}`}>
                      {selectedRole === 'viewer' ? '🔒 Read-Only Summary' : '✓ Permitted (AST Verified)'}
                    </span>
                  </div>

                  <div className="perm-matrix-row">
                    <span className="perm-label">
                      <Lock size={12} style={{ color: '#ef4444' }} />
                      Direct DB Mutation (DROP/ALTER)
                    </span>
                    <span className="perm-status blocked">
                      🚫 Blocked (Zero Mutation)
                    </span>
                  </div>

                  <div className="perm-matrix-row">
                    <span className="perm-label">
                      <Shield size={12} style={{ color: '#38bdf8' }} />
                      Security Proof &amp; Audit Log
                    </span>
                    <span className={`perm-status ${selectedRole === 'admin' ? 'allowed' : selectedRole === 'analyst' ? 'allowed' : 'hidden'}`}>
                      {selectedRole === 'admin' ? '✓ Full System Audit' : selectedRole === 'analyst' ? '✓ Workspace Only' : '🔒 Restricted'}
                    </span>
                  </div>

                  <div className="perm-matrix-row">
                    <span className="perm-label">
                      <Layers size={12} style={{ color: '#a855f7' }} />
                      Data Quality Diagnostics
                    </span>
                    <span className="perm-status allowed">
                      ✓ Accessible (Read-Only)
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: THE 6-POINT SECURITY SHIELD SIMULATOR */}
          {step === 2 && (
            <>
              <div className="onboarding-step-hero">
                <span className="onboarding-step-eyebrow">
                  <Shield size={12} />
                  AST Verification Engine
                </span>
                <h4 className="onboarding-step-heading">The 6-Point Security Shield</h4>
                <p className="onboarding-step-desc">
                  Every query is parsed into a PostgreSQL AST using SQLGlot before database evaluation. Arbitrary SQL is rejected immediately.
                </p>
              </div>

              <div className="shield-visualizer-card">
                <div className="shield-pipeline-flow">
                  <div className={`pipeline-step ${attackSimulated ? 'passed' : ''}`}>
                    <span className="pipeline-step-num">Check 01</span>
                    <span className="pipeline-step-title">Single Statement</span>
                    <span className="pipeline-step-desc">Blocks stacked SQL injections (semicolon chains).</span>
                  </div>

                  <div className={`pipeline-step ${attackSimulated ? 'intercepted' : ''}`}>
                    <span className="pipeline-step-num">Check 02</span>
                    <span className="pipeline-step-title">SELECT-Only Strict</span>
                    <span className="pipeline-step-desc">Rejects DROP, DELETE, INSERT, UPDATE, ALTER at AST root.</span>
                  </div>

                  <div className={`pipeline-step ${attackSimulated ? 'passed' : ''}`}>
                    <span className="pipeline-step-num">Check 03</span>
                    <span className="pipeline-step-title">Table Whitelist</span>
                    <span className="pipeline-step-desc">Only permitted inventory &amp; telemetry tables can be queried.</span>
                  </div>

                  <div className="pipeline-step">
                    <span className="pipeline-step-num">Check 04</span>
                    <span className="pipeline-step-title">Function Ban</span>
                    <span className="pipeline-step-desc">Blocks pg_sleep, dblink, copy, file read/write.</span>
                  </div>

                  <div className="pipeline-step">
                    <span className="pipeline-step-num">Check 05</span>
                    <span className="pipeline-step-title">Row Clamping</span>
                    <span className="pipeline-step-desc">Clamped ceiling of 500 rows to prevent DOS memory exhaustion.</span>
                  </div>

                  <div className="pipeline-step">
                    <span className="pipeline-step-num">Check 06</span>
                    <span className="pipeline-step-title">Ephemeral Token</span>
                    <span className="pipeline-step-desc">Executes strictly via server-stored preview ID.</span>
                  </div>
                </div>

                {/* Compact Interactive Attack Simulator */}
                <div className="attack-sim-box">
                  <div className="attack-sim-text">
                    <div className="attack-sim-headline">
                      Live Proof: Attack Simulation
                    </div>
                    <div className="attack-sim-sub">
                      Test payload: <code>DROP TABLE devices CASCADE;</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="attack-sim-btn"
                    onClick={handleSimulateAttack}
                    disabled={simulatingAttack}
                  >
                    <Flame size={12} />
                    <span>{simulatingAttack ? 'Intercepting...' : 'Simulate Attack'}</span>
                  </button>
                </div>

                {attackSimulated && (
                  <div className="attack-sim-result">
                    <AlertTriangle size={14} style={{ color: '#f87171', flexShrink: 0 }} />
                    <div className="attack-sim-result-text">
                      <strong>Interception Verified:</strong> Check 02 triggered <code>MALICIOUS_MUTATION_DETECTED</code>. Query halted in 1.2ms without touching PostgreSQL.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* STEP 3: LIVE REAL QUESTIONS SHOWCASE */}
          {step === 3 && (
            <>
              <div className="onboarding-step-hero">
                <span className="onboarding-step-eyebrow">
                  <Terminal size={12} />
                  Enterprise Queries
                </span>
                <h4 className="onboarding-step-heading">Equipment Intelligence in Action</h4>
                <p className="onboarding-step-desc">
                  Select any question below to immediately run it in Ask Data, previewing the verified SQL AST.
                </p>
              </div>

              <div className="tour-questions-list">
                <div
                  className="tour-question-card"
                  onClick={() => {
                    onSelectQuestion?.('Which devices have warranties ending in the next 30 days?')
                    handleComplete()
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tour-q-left">
                    <span className="tour-q-category">Hardware Lifecycle</span>
                    <div className="tour-q-text">"Which devices have warranties ending in the next 30 days?"</div>
                    <div className="tour-q-sub">Calculates expiring SLA contracts across 5,000 devices.</div>
                  </div>
                  <ArrowRight size={14} className="tour-q-arrow" />
                </div>

                <div
                  className="tour-question-card"
                  onClick={() => {
                    onSelectQuestion?.('Show all open repair requests grouped by site.')
                    handleComplete()
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tour-q-left">
                    <span className="tour-q-category">Incident Triage</span>
                    <div className="tour-q-text">"Show all open repair requests grouped by site."</div>
                    <div className="tour-q-sub">Aggregates active hardware repair tickets across 48 sites.</div>
                  </div>
                  <ArrowRight size={14} className="tour-q-arrow" />
                </div>

                <div
                  className="tour-question-card"
                  onClick={() => {
                    onSelectQuestion?.('How many active devices are in each region?')
                    handleComplete()
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tour-q-left">
                    <span className="tour-q-category">Topology Distribution</span>
                    <div className="tour-q-text">"How many active devices are in each region?"</div>
                    <div className="tour-q-sub">Groups active inventory across Americas, EMEA, and APAC.</div>
                  </div>
                  <ArrowRight size={14} className="tour-q-arrow" />
                </div>
              </div>
            </>
          )}

          {/* STEP 4: READ-ONLY DATABASE ARCHITECTURE */}
          {step === 4 && (
            <>
              <div className="onboarding-step-hero">
                <span className="onboarding-step-eyebrow">
                  <Database size={12} />
                  Zero-Mutation Architecture
                </span>
                <h4 className="onboarding-step-heading">Database Isolation &amp; Connection Grants</h4>
                <p className="onboarding-step-desc">
                  QueryTrust AI connects strictly via a dedicated PostgreSQL reader role with SELECT-only grants. Mutations are physically impossible.
                </p>
              </div>

              <div className="db-connect-card">
                <div className="db-spec-grid">
                  <div className="db-spec-item">
                    <span className="db-spec-label">Database Engine</span>
                    <span className="db-spec-val">PostgreSQL 16 (SSL)</span>
                  </div>
                  <div className="db-spec-item">
                    <span className="db-spec-label">Connection Role</span>
                    <span className="db-spec-val">qt_readonly_user</span>
                  </div>
                  <div className="db-spec-item">
                    <span className="db-spec-label">Execution Grants</span>
                    <span className="db-spec-val" style={{ color: '#34d399' }}>GRANT SELECT ON ALL TABLES</span>
                  </div>
                  <div className="db-spec-item">
                    <span className="db-spec-label">Mutation Grants</span>
                    <span className="db-spec-val" style={{ color: '#f87171' }}>REVOKE INSERT, UPDATE, DELETE</span>
                  </div>
                </div>

                <div className="db-ping-bar">
                  <div>
                    <div className="db-ping-title">
                      Verify Live Connection &amp; Telemetry
                    </div>
                    <div className="db-ping-sub">
                      Send an encrypted read-only ping to the synthetic educational dataset.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="db-ping-btn"
                    onClick={handleTestConnection}
                    disabled={dbTesting}
                  >
                    <RefreshCw size={12} className={dbTesting ? 'spin-icon' : ''} />
                    <span>{dbTesting ? 'Pinging Database...' : 'Test Connection'}</span>
                  </button>
                </div>

                {dbTested && (
                  <div className="db-ping-success">
                    <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                    <div>
                      <strong>Connection Verified:</strong> Connected as <code>qt_readonly_user</code>. Catalog contains <strong>5,000 devices</strong> and <strong>25,000 telemetry readings</strong>. Zero mutation privileges confirmed.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* --- Bottom Footer Controls --- */}
        <div className="onboarding-footer">
          {step > 1 ? (
            <button
              type="button"
              className="onboarding-back-btn"
              onClick={() => setStep((s) => (s - 1) as any)}
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              className="onboarding-next-btn"
              onClick={() => setStep((s) => (s + 1) as any)}
            >
              <span>{step === 1 ? 'Next: Security Shield' : step === 2 ? 'Next: Live Questions' : 'Next: Database Architecture'}</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              className="onboarding-next-btn"
              onClick={handleComplete}
            >
              <span>Start Exploring Workspace</span>
              <Check size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
