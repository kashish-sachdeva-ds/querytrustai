import React, { useState } from 'react'
import {
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  ShieldAlert,
  Database,
  X,
  Building,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { QueryTrustLogo } from './QueryTrustLogo'
import './LoginPage.css'

interface LoginPageProps {
  onBackToLanding?: () => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToLanding }) => {
  const { login } = useAuth()
  const isDemoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE !== 'false'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Request Access preview modal state
  const [showRequestAccess, setShowRequestAccess] = useState(false)
  const [requestSubmitted, setRequestSubmitted] = useState(false)
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    company: '',
    roleRequested: 'Analyst',
    justification: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email and password.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      await login(email.trim(), password)
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify credentials or check server connection.'
      )
    } finally {
      setLoading(false)
    }
  }

  const loginAsDemo = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setLoading(true)
    setErrorMessage(null)
    try {
      await login(demoEmail, demoPass)
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify server is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRequestSubmitted(true)
  }

  return (
    <div className="login-split-page">
      {/* Left Brand Panel */}
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-brand-header">
            <QueryTrustLogo size={42} />
            <div>
              <div className="login-brand-title">QueryTrust AI</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--qt-accent)', fontWeight: 600 }}>
                Enterprise Equipment Governance
              </span>
            </div>
          </div>

          <h2 className="login-brand-tagline">
            Ask your equipment anything, in plain English.{' '}
            <span style={{ color: 'var(--qt-accent)' }}>The AI can never break your data.</span>
          </h2>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldCheck size={16} />
              </div>
              <div className="login-feature-text">
                <h4>6 Safety Checks</h4>
                <p>Every natural-language question is validated across 6 safety checks before touching the database.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Database size={16} />
              </div>
              <div className="login-feature-text">
                <h4>Dedicated SELECT-Only DB Role</h4>
                <p>Executed strictly through PostgreSQL analytics_reader. Mutations and drops are physically impossible.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldAlert size={16} />
              </div>
              <div className="login-feature-text">
                <h4>Schema-Bounded Semantics</h4>
                <p>Translates verified table inventory and service telemetry without hallucinations or speculative SQL.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Synthetic Education Disclaimer */}
        <div className="login-synthetic-notice">
          <strong>Synthetic Educational Environment:</strong> This system operates on 5,000 synthetic devices, 50 sites, and 25,000 telemetry readings. No connection to real customer or vendor infrastructure.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="login-form-panel">
        <div className="login-form-container">
          {onBackToLanding && (
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={onBackToLanding}
              style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              ← Back to product overview
            </button>
          )}

          <div className="login-card-header">
            <h2>Sign in to workspace</h2>
            <p>Enter your authorized credentials to access safe network analytics.</p>
          </div>

          {/* Friendly Error Alert */}
          {errorMessage && (
            <div className="login-error-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} className="text-rose" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Work Email
              </label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@querytrust.local"
                  className="form-input"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
              </div>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
              id="login-submit-button"
            >
              {loading ? (
                <>
                  <span className="loading-spinner-inline" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in to your workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Request Access Link */}
          <div className="login-request-access-row">
            Don't have credentials yet?{' '}
            <button
              type="button"
              className="login-request-access-btn"
              onClick={() => {
                setShowRequestAccess(true)
                setRequestSubmitted(false)
              }}
            >
              Request access
            </button>
          </div>

          {/* Demo Credentials Section: Strictly Hidden unless VITE_DEMO_MODE=true */}
          {isDemoMode && (
            <div className="demo-credentials-section" style={{ marginTop: '1.75rem' }}>
              <div className="demo-credentials-header">
                <KeyRound size={14} style={{ color: 'var(--qt-accent)' }} />
                <span>Instant Demo Sign-in (Demo Mode)</span>
              </div>
              <div className="demo-chips-grid">
                <button
                  type="button"
                  className="demo-chip"
                  disabled={loading}
                  onClick={() => loginAsDemo('admin@querytrust.local', 'AdminPass123!')}
                  title="Sign in as Admin"
                >
                  <div className="demo-chip-title">
                    <span className="role-tag role-admin">Try as Admin</span>
                    <span className="demo-chip-email">admin@querytrust.local</span>
                  </div>
                  <span className="demo-chip-desc">Full governance, security benchmarks, & user access</span>
                </button>

                <button
                  type="button"
                  className="demo-chip"
                  disabled={loading}
                  onClick={() => loginAsDemo('analyst@querytrust.local', 'AnalystPass123!')}
                  title="Sign in as Analyst"
                >
                  <div className="demo-chip-title">
                    <span className="role-tag role-analyst">Try as Analyst</span>
                    <span className="demo-chip-email">analyst@querytrust.local</span>
                  </div>
                  <span className="demo-chip-desc">Ask data, data health profiler, & unusual activity</span>
                </button>

                <button
                  type="button"
                  className="demo-chip"
                  disabled={loading}
                  onClick={() => loginAsDemo('viewer@querytrust.local', 'ViewerPass123!')}
                  title="Sign in as Viewer"
                >
                  <div className="demo-chip-title">
                    <span className="role-tag role-viewer">Try as Viewer</span>
                    <span className="demo-chip-email">viewer@querytrust.local</span>
                  </div>
                  <span className="demo-chip-desc">Read-only monitoring, sample questions, & history</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="login-footer" style={{ marginTop: '2rem' }}>
            <Shield size={14} className="text-secondary" />
            <span>Read-only analytics &bull; Validated server execution</span>
          </div>
        </div>
      </div>

      {/* Request Access Preview Modal */}
      {showRequestAccess && (
        <div className="modal-backdrop" onClick={() => setShowRequestAccess(false)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-access-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} style={{ color: 'var(--qt-accent)' }} />
                <h3 id="request-access-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  Request Workspace Access
                </h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowRequestAccess(false)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {requestSubmitted ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: 'var(--qt-success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem auto',
                    }}
                  >
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Access Request Submitted!
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: 'var(--qt-muted)', lineHeight: 1.5, margin: '0 auto 1.25rem auto' }}>
                    Thank you, {requestForm.name || 'there'}. Your request for <strong>{requestForm.roleRequested}</strong> access has been logged for administrator review.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowRequestAccess(false)}
                  >
                    Return to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--qt-muted)', margin: '0 0 0.25rem 0' }}>
                    Submit your details to request an invitation to the QueryTrust analytics environment.
                  </p>
                  <p style={{ fontSize: '0.76rem', color: 'var(--qt-accent)', margin: 0, fontWeight: 500 }}>
                    Preview only. Nothing is saved or sent.
                  </p>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div className="input-with-icon">
                      <UserIcon size={14} className="input-icon" />
                      <input
                        type="text"
                        required
                        placeholder="Alex Morgan"
                        className="form-input"
                        value={requestForm.name}
                        onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Work Email</label>
                    <div className="input-with-icon">
                      <Mail size={14} className="input-icon" />
                      <input
                        type="email"
                        required
                        placeholder="alex@company.com"
                        className="form-input"
                        value={requestForm.email}
                        onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Organization / Team</label>
                    <div className="input-with-icon">
                      <Building size={14} className="input-icon" />
                      <input
                        type="text"
                        required
                        placeholder="Network Operations"
                        className="form-input"
                        value={requestForm.company}
                        onChange={(e) => setRequestForm({ ...requestForm, company: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role Requested</label>
                    <select
                      className="form-input"
                      value={requestForm.roleRequested}
                      onChange={(e) => setRequestForm({ ...requestForm, roleRequested: e.target.value })}
                    >
                      <option value="Viewer">Viewer (Read-only equipment & incident monitoring)</option>
                      <option value="Analyst">Analyst (Natural language queries & anomaly detection)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                    Submit Access Request
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
