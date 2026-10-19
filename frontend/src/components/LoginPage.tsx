import React, { useState, useId } from 'react'
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  ShieldAlert,
  Database,
  X,
  Building,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { QueryTrustLogo } from './QueryTrustLogo'
import { GlobalErrorBanner } from './GlobalErrorBanner'
import type { ErrorBannerType } from './GlobalErrorBanner'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { submitAccessRequest } from '../api/client'
import {
  sanitizeInput,
  validateEmail,
  calculatePasswordStrength,
  validateLoginForm,
} from '../lib/authValidation'
import type {
  LoginFormValues,
  ValidationErrors,
} from '../lib/authValidation'
import './LoginPage.css'

interface LoginPageProps {
  onBackToLanding?: () => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToLanding }) => {
  const { login } = useAuth()
  const isDemoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE !== 'false'

  // Unique IDs for accessibility
  const emailInputId = useId()
  const passwordInputId = useId()
  const emailErrorId = useId()
  const passwordErrorId = useId()

  // Form State
  const [formValues, setFormValues] = useState<LoginFormValues>({
    email: '',
    password: '',
    rememberMe: false,
  })

  // UI Interactive States
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Validation States
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})
  const [errors, setErrors] = useState<ValidationErrors>({})

  // Global Error Banner State
  const [globalError, setGlobalError] = useState<{
    type: ErrorBannerType
    message?: string
  } | null>(null)

  // Request Access Modal State
  const [showRequestAccess, setShowRequestAccess] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requestSubmitted, setRequestSubmitted] = useState(false)
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null)
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    company: '',
    roleRequested: 'Analyst',
    justification: '',
  })

  // Dynamic Password Strength
  const passwordStrength = calculatePasswordStrength(formValues.password)

  // Real-time Field Handlers
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    setFormValues((prev) => ({ ...prev, email: rawVal }))
    if (touched.email) {
      const err = validateEmail(rawVal)
      setErrors((prev) => ({ ...prev, email: err || undefined }))
    }
    if (globalError) setGlobalError(null)
  }

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }))
    const err = validateEmail(formValues.email)
    setErrors((prev) => ({ ...prev, email: err || undefined }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    setFormValues((prev) => ({ ...prev, password: rawVal }))
    if (touched.password) {
      setErrors((prev) => ({
        ...prev,
        password: !rawVal ? 'Password is required.' : rawVal.length < 6 ? 'Password must be at least 6 characters.' : undefined,
      }))
    }
    if (globalError) setGlobalError(null)
  }

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }))
    const rawVal = formValues.password
    setErrors((prev) => ({
      ...prev,
      password: !rawVal ? 'Password is required.' : rawVal.length < 6 ? 'Password must be at least 6 characters.' : undefined,
    }))
  }

  // Primary Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const sanitizedEmail = sanitizeInput(formValues.email)
    const sanitizedPassword = formValues.password

    // Full form validation
    const formErrors = validateLoginForm({
      email: sanitizedEmail,
      password: sanitizedPassword,
      rememberMe: false,
    })

    if (Object.keys(formErrors).length > 0) {
      setTouched({ email: true, password: true })
      setErrors(formErrors)
      setGlobalError({
        type: 'invalid_credentials',
        message: 'Please resolve form validation issues before submitting.',
      })
      return
    }

    setLoading(true)
    setGlobalError(null)

    try {
      await login(sanitizedEmail, sanitizedPassword)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message.toLowerCase() : ''
      if (errorMsg.includes('locked') || errorMsg.includes('too many')) {
        setGlobalError({ type: 'account_locked' })
      } else {
        setGlobalError({
          type: 'invalid_credentials',
          message: err instanceof Error ? err.message : 'Invalid work credentials. Please check your email and password.',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // 1-Click Demo Login
  const loginAsDemo = async (demoEmail: string, demoPass: string) => {
    setFormValues((prev) => ({ ...prev, email: demoEmail, password: demoPass }))
    setLoading(true)
    setGlobalError(null)
    setErrors({})

    try {
      await login(demoEmail, demoPass)
    } catch (err: unknown) {
      setGlobalError({
        type: 'invalid_credentials',
        message: err instanceof Error ? err.message : 'Demo sign-in failed. Please retry.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Request Access handler
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequestLoading(true)
    setRequestError(null)
    try {
      const res = await submitAccessRequest({
        full_name: requestForm.name,
        email: requestForm.email,
        company: requestForm.company,
        role_requested: requestForm.roleRequested.toLowerCase() as 'analyst' | 'viewer',
        use_case: requestForm.justification,
      })
      setSubmittedRequestId(res.id)
      setRequestSubmitted(true)
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to submit access request. Please verify inputs.')
    } finally {
      setRequestLoading(false)
    }
  }

  const isSubmitDisabled = loading || !formValues.email.trim() || !formValues.password

  return (
    <div className="login-split-page" data-testid="login-page">
      {/* ─── Left Brand Panel ─── */}
      <aside className="login-brand-panel" aria-label="Brand Overview and Safety Guarantees">
        <div className="login-brand-content">
          <div className="login-brand-header">
            <QueryTrustLogo size={42} />
            <div>
              <div className="login-brand-title">QueryTrust AI</div>
              <span className="login-brand-subtitle">Equipment intelligence</span>
            </div>
          </div>

          <h2 className="login-brand-tagline">
            Ask your equipment anything, in plain English.{' '}
            <span className="accent-gradient-text">The AI can't change your data.</span>
          </h2>

          {/* Decorative Animated Safety Shield Demo */}
          <div className="login-shield-visual" aria-hidden="true">
            <div className="shield-graphic-wrap">
              <div className="shield-ring shield-ring-3" />
              <div className="shield-ring shield-ring-2" />
              <div className="shield-ring shield-ring-1" />
              <div className="shield-center-core">
                <ShieldCheck size={28} className="shield-core-icon" />
              </div>
            </div>
            <div className="shield-legend">
              <span className="shield-pulse-dot" />
              <span>6 automated safety checks active</span>
            </div>
          </div>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldCheck size={18} />
              </div>
              <div className="login-feature-text">
                <h4>6 safety checks on every question</h4>
                <p>Each question is checked before it touches your data.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Database size={18} />
              </div>
              <div className="login-feature-text">
                <h4>Read-only by design</h4>
                <p>The database login can only read. It cannot change or delete anything.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldAlert size={18} />
              </div>
              <div className="login-feature-text">
                <h4>Only your equipment data</h4>
                <p>Questions stay inside the equipment tables, so answers can't wander off-topic.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Honest Notice */}
        <div className="login-synthetic-notice">
          <p className="login-synthetic-text">
            Demo workspace: 5,000 made-up devices, 50 sites, 25,000 readings. No real company data.
          </p>
        </div>
      </aside>

      {/* ─── Right Form Panel ─── */}
      <main className="login-form-panel" id="main-content">
        <div className="login-form-container">
          {onBackToLanding && (
            <button
              type="button"
              className="btn-back-overview"
              onClick={onBackToLanding}
              aria-label="Return to product overview landing page"
            >
              <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
              <span>Back to product overview</span>
            </button>
          )}

          <header className="login-card-header">
            <h2>Sign in to workspace</h2>
            <p>Sign in with your work email to access safe network analytics.</p>
          </header>

          {/* Global Error Banner */}
          {globalError && (
            <div style={{ marginBottom: '1.25rem' }}>
              <GlobalErrorBanner
                type={globalError.type}
                message={globalError.message}
                onDismiss={() => setGlobalError(null)}
                onRetry={() => { void handleSubmit({ preventDefault: () => {} } as React.FormEvent) }}
              />
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Email Field */}
            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label htmlFor={emailInputId} className="form-label">
                Work email
              </label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" aria-hidden="true" />
                <input
                  id={emailInputId}
                  type="email"
                  value={formValues.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="name@querytrust.local"
                  className="form-input"
                  autoComplete="username"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? emailErrorId : undefined}
                  required
                />
              </div>
              {errors.email && (
                <div id={emailErrorId} className="inline-field-error" role="alert">
                  <span className="error-bullet" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
              <div className="form-label-row">
                <label htmlFor={passwordInputId} className="form-label">
                  Password
                </label>
              </div>

              <div className="input-with-icon">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id={passwordInputId}
                  type={showPassword ? 'text' : 'password'}
                  value={formValues.password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Password"
                  className="form-input"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? passwordErrorId : undefined}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password characters' : 'Show password characters'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {errors.password && (
                <div id={passwordErrorId} className="inline-field-error" role="alert">
                  <span className="error-bullet" />
                  <span>{errors.password}</span>
                </div>
              )}

              {/* Dynamic Password Strength Meter */}
              <PasswordStrengthMeter
                strength={passwordStrength}
                passwordLength={formValues.password.length}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="login-submit-btn"
              id="login-submit-button"
            >
              {loading ? (
                <>
                  <span className="loading-spinner-inline" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Request Access Row */}
          <div className="login-request-access-row">
            Need an account?{' '}
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

          {/* ─── 1-Click Fast Demo Credentials ─── */}
          {isDemoMode && (
            <section className="demo-credentials-section" aria-label="1-Click Evaluation Roles">
              <div className="demo-credentials-header">
                <KeyRound size={14} className="text-accent" />
                <span>1-Click Instant Evaluation Roles</span>
              </div>
              <div className="demo-chips-grid">
                {/* 1. Analyst first */}
                <button
                  type="button"
                  className="demo-chip chip-analyst"
                  disabled={loading}
                  onClick={() => loginAsDemo('analyst@querytrust.local', 'AnalystPass123!')}
                  title="Sign in as Analyst"
                  aria-label="Instant login as Analyst"
                >
                  <div className="demo-chip-action-row">
                    <span className="role-tag role-analyst">Analyst</span>
                    <span className="demo-chip-btn-label">Try as Analyst &rarr;</span>
                  </div>
                  <span className="demo-chip-email">analyst@querytrust.local</span>
                  <span className="demo-chip-desc">Natural-language equipment questions, health checks, & telemetry anomalies</span>
                </button>

                {/* 2. Viewer second */}
                <button
                  type="button"
                  className="demo-chip chip-viewer"
                  disabled={loading}
                  onClick={() => loginAsDemo('viewer@querytrust.local', 'ViewerPass123!')}
                  title="Sign in as Viewer"
                  aria-label="Instant login as Viewer"
                >
                  <div className="demo-chip-action-row">
                    <span className="role-tag role-viewer">Viewer</span>
                    <span className="demo-chip-btn-label">Try as Viewer &rarr;</span>
                  </div>
                  <span className="demo-chip-email">viewer@querytrust.local</span>
                  <span className="demo-chip-desc">Read-only: equipment, data health and unusual activity.</span>
                </button>

                {/* 3. Admin third */}
                <button
                  type="button"
                  className="demo-chip chip-admin"
                  disabled={loading}
                  onClick={() => loginAsDemo('admin@querytrust.local', 'AdminPass123!')}
                  title="Sign in as Admin"
                  aria-label="Instant login as Admin"
                >
                  <div className="demo-chip-action-row">
                    <span className="role-tag role-admin">Admin</span>
                    <span className="demo-chip-btn-label">Try as Admin &rarr;</span>
                  </div>
                  <span className="demo-chip-email">admin@querytrust.local</span>
                  <span className="demo-chip-desc">Full governance, security audit logs, safety rules, & user management</span>
                </button>
              </div>
            </section>
          )}

          {/* Footer Security Note */}
          <footer className="login-footer">
            <ShieldCheck size={14} className="text-secondary" />
            <span>Read-only access &bull; 6 safety checks &bull; No changes to your data</span>
          </footer>
        </div>
      </main>

      {/* ─── Request Access Modal (Database Stored) ─── */}
      {showRequestAccess && (
        <div className="login-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
          <div className="login-modal-card">
            <div className="request-preview-banner" role="status">
              Submitted requests are stored in the database for administrator review.
            </div>

            <div className="login-modal-header">
              <div className="modal-title-wrap">
                <Building size={20} className="text-accent" />
                <h3 id="request-modal-title">Request access</h3>
              </div>
              <button
                type="button"
                className="login-modal-close"
                onClick={() => setShowRequestAccess(false)}
                aria-label="Close request access modal"
              >
                <X size={18} />
              </button>
            </div>

            {requestSubmitted ? (
              <div className="login-modal-success">
                <CheckCircle2 size={36} className="text-emerald" />
                <h4>Access Request Submitted</h4>
                <p>
                  Your access request has been recorded in the database. Workspace administrators can now review and approve your account from the administration portal.
                </p>
                <div className="preview-role-summary" style={{ textAlign: 'left', margin: '0.85rem 0', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 6, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>Requested role: <strong>{requestForm.roleRequested}</strong></div>
                  <div>Requester: <strong>{requestForm.name} ({requestForm.company})</strong></div>
                  <div>Work email: <strong>{requestForm.email}</strong></div>
                  {submittedRequestId && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--qt-muted)' }}>Request ID: {submittedRequestId}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="login-submit-btn"
                  onClick={() => {
                    setShowRequestAccess(false)
                    setRequestSubmitted(false)
                    setRequestForm({ name: '', email: '', company: '', roleRequested: 'Analyst', justification: '' })
                  }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="modal-form">
                {requestError && (
                  <div role="alert" style={{ marginBottom: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, color: '#f87171', fontSize: '0.78rem' }}>
                    {requestError}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="req-name" className="form-label">
                    Full name <span className="req-star" aria-hidden="true">*</span>
                  </label>
                  <div className="input-with-icon">
                    <UserIcon size={16} className="input-icon" />
                    <input
                      id="req-name"
                      type="text"
                      value={requestForm.name}
                      onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="req-email" className="form-label">
                    Work email <span className="req-star" aria-hidden="true">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon" />
                    <input
                      id="req-email"
                      type="email"
                      value={requestForm.email}
                      onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                      placeholder="jane.doe@enterprise.com"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="req-company" className="form-label">
                    Organization / Company <span className="req-star" aria-hidden="true">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Building size={16} className="input-icon" />
                    <input
                      id="req-company"
                      type="text"
                      value={requestForm.company}
                      onChange={(e) => setRequestForm({ ...requestForm, company: e.target.value })}
                      placeholder="Acme Telecom Networks"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="req-role" className="form-label">
                    Requested role <span className="req-star" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="req-role"
                    value={requestForm.roleRequested}
                    onChange={(e) => setRequestForm({ ...requestForm, roleRequested: e.target.value })}
                    className="form-input"
                  >
                    <option value="Viewer">Viewer (Read-only dashboards)</option>
                    <option value="Analyst">Analyst (Plain English queries)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="req-justification" className="form-label">
                    Business justification <span className="req-star" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="req-justification"
                    rows={2}
                    value={requestForm.justification}
                    onChange={(e) => setRequestForm({ ...requestForm, justification: e.target.value })}
                    placeholder="Briefly state your equipment monitoring workflow."
                    className="form-input"
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowRequestAccess(false)}
                    disabled={requestLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="login-submit-btn" disabled={requestLoading}>
                    {requestLoading ? 'Submitting to database…' : 'Submit Access Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
