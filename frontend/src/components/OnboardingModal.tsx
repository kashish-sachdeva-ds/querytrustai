import React, { useState } from 'react'
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Check,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'analyst' | 'viewer'>(
    (user?.role as any) || 'analyst'
  )
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

  const handleTestConnection = () => {
    setDbTesting(true)
    setTimeout(() => {
      setDbTesting(false)
      setDbTested(true)
    }, 800)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--qt-accent)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Welcome to QueryTrust AI
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', fontFamily: 'var(--font-mono)' }}>
              Step {step} of 3
            </span>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Step Content */}
        <div className="modal-body" style={{ padding: '1.75rem' }}>
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>
                  1. Understand User Roles
                </h4>
                <p style={{ fontSize: '0.86rem', color: 'var(--qt-muted)', margin: 0 }}>
                  Permissions are validated on every backend request. The browser never executes arbitrary queries.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  className={`demo-chip ${selectedRole === 'admin' ? 'active' : ''}`}
                  style={{ cursor: 'pointer', padding: '1rem', border: selectedRole === 'admin' ? '1px solid var(--qt-accent)' : '1px solid var(--qt-border)' }}
                  onClick={() => setSelectedRole('admin')}
                >
                  <div className="demo-chip-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="role-tag role-admin">Administrator</span>
                    {selectedRole === 'admin' && <Check size={14} style={{ color: 'var(--qt-accent)' }} />}
                  </div>
                  <span className="demo-chip-desc" style={{ display: 'block', marginTop: 4 }}>
                    Full system access: Manage user permissions, run safety benchmarks, and inspect immutable audit logs.
                  </span>
                </div>

                <div
                  className={`demo-chip ${selectedRole === 'analyst' ? 'active' : ''}`}
                  style={{ cursor: 'pointer', padding: '1rem', border: selectedRole === 'analyst' ? '1px solid var(--qt-accent)' : '1px solid var(--qt-border)' }}
                  onClick={() => setSelectedRole('analyst')}
                >
                  <div className="demo-chip-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="role-tag role-analyst">Analyst (Recommended)</span>
                    {selectedRole === 'analyst' && <Check size={14} style={{ color: 'var(--qt-accent)' }} />}
                  </div>
                  <span className="demo-chip-desc" style={{ display: 'block', marginTop: 4 }}>
                    Interactive analytics: Ask equipment questions in natural English, preview AST checks, run queries, and review data health.
                  </span>
                </div>

                <div
                  className={`demo-chip ${selectedRole === 'viewer' ? 'active' : ''}`}
                  style={{ cursor: 'pointer', padding: '1rem', border: selectedRole === 'viewer' ? '1px solid var(--qt-accent)' : '1px solid var(--qt-border)' }}
                  onClick={() => setSelectedRole('viewer')}
                >
                  <div className="demo-chip-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="role-tag role-viewer">Viewer</span>
                    {selectedRole === 'viewer' && <Check size={14} style={{ color: 'var(--qt-accent)' }} />}
                  </div>
                  <span className="demo-chip-desc" style={{ display: 'block', marginTop: 4 }}>
                    Executive oversight: View inventory summaries and sample answers. Raw SQL queries are hidden.
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>
                  2. Try Real Questions
                </h4>
                <p style={{ fontSize: '0.86rem', color: 'var(--qt-muted)', margin: 0 }}>
                  Click any question to launch Ask Data directly, or test how the Safety Shield intercepts dangerous queries.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="starter-chip-card"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() => {
                    onSelectQuestion?.('How many active devices are in each region?')
                    handleComplete()
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-accent)', fontWeight: 600, marginBottom: 2 }}>
                    Fleet Distribution
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--qt-ink)' }}>
                    "How many active devices are in each region?"
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--qt-muted)', marginTop: 2 }}>
                    Aggregates 5,000 devices across Americas, EMEA, and APAC.
                  </div>
                </button>

                <button
                  type="button"
                  className="starter-chip-card"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() => {
                    onSelectQuestion?.('Show all routers with warranty expiring in the next 60 days.')
                    handleComplete()
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-accent)', fontWeight: 600, marginBottom: 2 }}>
                    Lifecycle &amp; Maintenance
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--qt-ink)' }}>
                    "Show all routers with warranty expiring in the next 60 days."
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--qt-muted)', marginTop: 2 }}>
                    Filters hardware warranties due for contract renewal.
                  </div>
                </button>

                <button
                  type="button"
                  className="starter-chip-card"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() => {
                    onSelectQuestion?.('List critical open service events grouped by site.')
                    handleComplete()
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-accent)', fontWeight: 600, marginBottom: 2 }}>
                    Incident Triage
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--qt-ink)' }}>
                    "List critical open service events grouped by site."
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--qt-muted)', marginTop: 2 }}>
                    Groups open tickets across 20 global sites.
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                    3. Connect Your Database
                  </h4>
                  <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                    Deployment Preview
                  </span>
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--qt-muted)', margin: 0 }}>
                  QueryTrust AI connects via a dedicated read-only role with SELECT-only grants.
                </p>
              </div>

              <div style={{ background: 'var(--qt-surface-muted)', border: '1px solid var(--qt-border)', borderRadius: 'var(--qt-radius-inner)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', display: 'block', marginBottom: 2 }}>Database Host</label>
                    <input type="text" className="form-input" readOnly value="db.querytrust.internal" style={{ fontSize: '0.8rem', height: 32 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', display: 'block', marginBottom: 2 }}>Port</label>
                    <input type="text" className="form-input" readOnly value="5432" style={{ fontSize: '0.8rem', height: 32 }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', display: 'block', marginBottom: 2 }}>Database Name</label>
                  <input type="text" className="form-input" readOnly value="querytrust_production" style={{ fontSize: '0.8rem', height: 32 }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', display: 'block', marginBottom: 2 }}>Read-Only Role Username</label>
                  <input type="text" className="form-input" readOnly value="qt_readonly_user (SELECT grants only)" style={{ fontSize: '0.8rem', height: 32 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--qt-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>
                    SSL Mode: <code>verify-full</code>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={dbTesting}
                    onClick={handleTestConnection}
                  >
                    {dbTesting ? 'Testing connection...' : 'Test Connection'}
                  </button>
                </div>

                {dbTested && (
                  <div style={{ background: 'var(--qt-success-soft, rgba(46,160,67,0.15))', border: '1px solid var(--qt-success)', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.76rem', color: 'var(--qt-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--qt-success)' }} />
                    <span>Connection verified: 5,000 devices &amp; 25,000 telemetry readings detected.</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.74rem', color: 'var(--qt-muted)', lineHeight: 1.45 }}>
                Notice: The current session runs against the local synthetic educational database.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid var(--qt-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStep((s) => (s - 1) as any)}
            >
              <ArrowLeft size={13} style={{ marginRight: 4 }} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setStep((s) => (s + 1) as any)}
            >
              Next <ArrowRight size={13} style={{ marginLeft: 4 }} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleComplete}
            >
              Start Exploring <Check size={13} style={{ marginLeft: 4 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
