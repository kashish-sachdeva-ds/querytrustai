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
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { QueryTrustLogo } from './QueryTrustLogo'
import { GlobalErrorBanner } from './GlobalErrorBanner'
import type { ErrorBannerType } from './GlobalErrorBanner'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
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
  const rememberMeId = useId()
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

  // Modals
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false)

  const [showRequestAccess, setShowRequestAccess] = useState(false)
  const [requestSubmitted, setRequestSubmitted] = useState(false)
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
      rememberMe: formValues.rememberMe,
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
      } else if (errorMsg.includes('server') || errorMsg.includes('500') || errorMsg.includes('503')) {
        setGlobalError({ type: 'server_error' })
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('failed to fetch')) {
        setGlobalError({ type: 'network_offline' })
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

  // Forgot Password handler
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(forgotPasswordEmail)) {
      setForgotPasswordSubmitted(true)
    }
  }

  // Request Access handler
  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRequestSubmitted(true)
  }

  const isSubmitDisabled = loading || !formValues.email.trim() || !formValues.password

  return (
    <div className="login-split-page" data-testid="login-page">
      {/* ─── Left Brand Panel ─── */}
      <aside className="login-brand-panel" aria-label="Brand Overview and Security Commitments">
        <div className="login-brand-content">
          <div className="login-brand-header">
            <QueryTrustLogo size={42} />
            <div>
              <div className="login-brand-title">QueryTrust AI</div>
              <span className="login-brand-subtitle">Enterprise Equipment Governance</span>
            </div>
          </div>

          <h2 className="login-brand-tagline">
            Ask your equipment anything, in plain English.{' '}
            <span className="accent-gradient-text">The AI can never break your data.</span>
          </h2>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldCheck size={18} />
              </div>
              <div className="login-feature-text">
                <h4>6 Automated AST Safety Checks</h4>
                <p>Every natural-language question is parsed via SQLGlot AST before touching database infrastructure.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Database size={18} />
              </div>
              <div className="login-feature-text">
                <h4>Dedicated SELECT-Only DB Role</h4>
                <p>Executed strictly through PostgreSQL analytics_reader. Mutations and drops are physically impossible.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldAlert size={18} />
              </div>
              <div className="login-feature-text">
                <h4>Schema-Bounded Semantics</h4>
                <p>Translates verified table inventory and telemetry without hallucinations or speculative SQL.</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Trust & Education Badge */}
        <div className="login-synthetic-notice">
          <div className="synthetic-notice-badge">
            <span className="live-status-dot" aria-hidden="true" />
            <span>SOC2 / ISO-27001 Ready Governance</span>
          </div>
          <p>
            <strong>Synthetic Educational Environment:</strong> This system operates on 5,000 synthetic devices, 50 sites, and 25,000 telemetry readings. No connection to real customer or vendor infrastructure.
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
            <div className="login-header-badge">
              <Sparkles size={13} className="text-accent" />
              <span>Authorized Enterprise Access</span>
            </div>
            <h2>Sign in to workspace</h2>
            <p>Enter your enterprise credentials to access safe network analytics.</p>
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
                Work Email or Username
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
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => {
                    setShowForgotPassword(true)
                    setForgotPasswordSubmitted(false)
                    setForgotPasswordEmail(formValues.email)
                  }}
                  tabIndex={0}
                >
                  Forgot password?
                </button>
              </div>

              <div className="input-with-icon">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id={passwordInputId}
                  type={showPassword ? 'text' : 'password'}
                  value={formValues.password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Enter your security password"
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

            {/* Remember Me Checkbox */}
            <div className="remember-me-row">
              <label htmlFor={rememberMeId} className="checkbox-custom-label">
                <input
                  id={rememberMeId}
                  type="checkbox"
                  checked={formValues.rememberMe}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                  className="checkbox-input"
                />
                <span className="checkbox-box" aria-hidden="true" />
                <span className="checkbox-text">Remember this workstation for 30 days</span>
              </label>
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
                  <span>Authenticating secure session…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Sign Up / Request Access Row */}
          <div className="login-request-access-row">
            Don't have an enterprise account?{' '}
            <button
              type="button"
              className="login-request-access-btn"
              onClick={() => {
                setShowRequestAccess(true)
                setRequestSubmitted(false)
              }}
            >
              Sign up / Request Access
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
                <button
                  type="button"
                  className="demo-chip chip-analyst"
                  disabled={loading}
                  onClick={() => loginAsDemo('analyst@querytrust.local', 'AnalystPass123!')}
                  title="Sign in as Analyst: Natural language queries & telemetry"
                  aria-label="Instant login as Analyst"
                >
                  <div className="demo-chip-title">
                    <span className="role-tag role-analyst">Analyst</span>
                    <span className="demo-chip-email">analyst@querytrust.local</span>
                  </div>
                  <span className="demo-chip-desc">Natural language SQL queries, health profiler, & ML anomalies</span>
                </button>

                <button
                  type="button"
                  className="demo-chip chip-admin"
                  disabled={loading}
                  onClick={() => loginAsDemo('admin@querytrust.local', 'AdminPass123!')}
                  title="Sign in as Admin: Full governance, audit logs & users"
                  aria-label="Instant login as Admin"
                >
                  <div className="demo-chip-title">
                    <span className="role-tag role-admin">Admin</span>
                    <span className="demo-chip-email">admin@querytrust.local</span>
                  </div>
                  <span className="demo-chip-desc">Full governance, security audit logs, AST policy, & user management</span>
                </button>

                <button
                  type="button"
                  className="demo-chip chip-viewer"
                  disabled={loading}
                  onClick={() => loginAsDemo('viewer@querytrust.local', 'ViewerPass123!')}
                  title="Sign in as Viewer: Read-only monitoring & catalog"
                  aria-label="Instant login as Viewer"
                >
                  <div className="demo-chip-title">
                    <span className="role-tag role-viewer">Viewer</span>
                    <span className="demo-chip-email">viewer@querytrust.local</span>
                  </div>
                  <span className="demo-chip-desc">Read-only equipment catalog, saved questions, & metric cards</span>
                </button>
              </div>
            </section>
          )}

          {/* Footer Security Note */}
          <footer className="login-footer">
            <ShieldCheck size={14} className="text-secondary" />
            <span>SELECT-Only Database Role &bull; SQLGlot AST Enforced &bull; Zero Mutations</span>
          </footer>
        </div>
      </main>

      {/* ─── Forgot Password Modal ─── */}
      {showForgotPassword && (
        <div className="login-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="forgot-modal-title">
          <div className="login-modal-card">
            <div className="login-modal-header">
              <div className="modal-title-wrap">
                <HelpCircle size={20} className="text-accent" />
                <h3 id="forgot-modal-title">Reset Your Password</h3>
              </div>
              <button
                type="button"
                className="login-modal-close"
                onClick={() => setShowForgotPassword(false)}
                aria-label="Close password reset modal"
              >
                <X size={18} />
              </button>
            </div>

            {forgotPasswordSubmitted ? (
              <div className="login-modal-success">
                <CheckCircle2 size={36} className="text-emerald" />
                <h4>Reset Link Dispatched</h4>
                <p>
                  If an enterprise directory account exists for <strong>{forgotPasswordEmail}</strong>, password reset instructions have been dispatched.
                </p>
                <button
                  type="button"
                  className="login-submit-btn"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="modal-form">
                <p className="modal-intro">
                  Enter your registered work email. We'll send a time-bounded cryptographic token to reset your password.
                </p>
                <div className="form-group">
                  <label htmlFor="forgot-email" className="form-label">
                    Work Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="name@querytrust.local"
                    className="form-input"
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="login-submit-btn">
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── Request Access / Sign Up Modal ─── */}
      {showRequestAccess && (
        <div className="login-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
          <div className="login-modal-card">
            <div className="login-modal-header">
              <div className="modal-title-wrap">
                <Building size={20} className="text-accent" />
                <h3 id="request-modal-title">Request Enterprise Access</h3>
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
                  Thank you, <strong>{requestForm.name}</strong>. Your provisioning request for{' '}
                  <strong>{requestForm.roleRequested}</strong> role has been queued for security review.
                </p>
                <button
                  type="button"
                  className="login-submit-btn"
                  onClick={() => setShowRequestAccess(false)}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="modal-form">
                <div className="form-group">
                  <label htmlFor="req-name" className="form-label">
                    Full Name
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
                    Work Email
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
                    Organization / Company
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
                    Requested Access Role
                  </label>
                  <select
                    id="req-role"
                    value={requestForm.roleRequested}
                    onChange={(e) => setRequestForm({ ...requestForm, roleRequested: e.target.value })}
                    className="form-input"
                  >
                    <option value="Analyst">Analyst (Natural Language Queries & Telemetry)</option>
                    <option value="Admin">Administrator (Audit Logs, Governance, & Policies)</option>
                    <option value="Viewer">Viewer (Read-Only Dashboards & Catalog)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="req-justification" className="form-label">
                    Business Justification
                  </label>
                  <textarea
                    id="req-justification"
                    rows={2}
                    value={requestForm.justification}
                    onChange={(e) => setRequestForm({ ...requestForm, justification: e.target.value })}
                    placeholder="Briefly state your equipment monitoring workflow or telemetry audit use case."
                    className="form-input"
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowRequestAccess(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="login-submit-btn">
                    Submit Access Request
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
