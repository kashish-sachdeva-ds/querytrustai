import React, { useState, useId, useEffect } from 'react'
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
  Users,
  Clock,
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
  const { login, register, joinWorkspace, enterDemoMode } = useAuth()
  const isDemoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE !== 'false'

  // Auth Mode: 'signin' | 'register' | 'join' (default to 'join' if invite parameter present)
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'join'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('join') || params.get('workspace')) {
        return 'join'
      }
    }
    return 'signin'
  })

  // Unique IDs for accessibility
  const emailInputId = useId()
  const passwordInputId = useId()
  const emailErrorId = useId()
  const passwordErrorId = useId()

  // Sign In Form State
  const [formValues, setFormValues] = useState<LoginFormValues>({
    email: '',
    password: '',
    rememberMe: false,
  })

  // Register Form State (Create Company Workspace)
  const [registerValues, setRegisterValues] = useState({
    fullName: '',
    workspaceName: '',
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'analyst' | 'viewer',
  })
  const [registerErrors, setRegisterErrors] = useState<{
    fullName?: string
    workspaceName?: string
    email?: string
    password?: string
  }>({})
  const [registerLoading, setRegisterLoading] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)

  // Join Workspace Form State (Join Existing Team Workspace)
  const [joinValues, setJoinValues] = useState(() => {
    let ws = ''
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      ws = params.get('join') || params.get('workspace') || ''
    }
    return {
      workspaceName: ws,
      fullName: '',
      email: '',
      password: '',
      role: 'analyst' as 'analyst' | 'viewer',
    }
  })
  const [joinErrors, setJoinErrors] = useState<{
    workspaceName?: string
    fullName?: string
    email?: string
    password?: string
  }>({})
  const [joinLoading, setJoinLoading] = useState(false)
  const [showJoinPassword, setShowJoinPassword] = useState(false)

  // UI Interactive States
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Validation States
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})
  const [errors, setErrors] = useState<ValidationErrors>({})

  // Global Error Banner State
  const [globalError, setGlobalError] = useState<{
    type: ErrorBannerType
    title?: string
    message?: string
    actionLabel?: string
    onAction?: () => void
  } | null>(null)

  // Status Notice State (e.g. Access Request Pending)
  const [statusNotice, setStatusNotice] = useState<{
    title: string
    message: string
    email?: string
  } | null>(null)


  // Dynamic Password Strength (for Registration & Password Creation)
  const registerPasswordStrength = calculatePasswordStrength(registerValues.password)
  const joinPasswordStrength = calculatePasswordStrength(joinValues.password)

  // Auto-detect invite link with ?join=WorkspaceName
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const joinParam = params.get('join') || params.get('workspace')
      if (joinParam) {
        setJoinValues((prev) => ({ ...prev, workspaceName: decodeURIComponent(joinParam) }))
        setAuthMode('join')
      }
    }
  }, [])

  // Real-time Field Handlers
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    setFormValues((prev) => ({ ...prev, email: rawVal }))
    if (touched.email) {
      const err = validateEmail(rawVal)
      setErrors((prev) => ({ ...prev, email: err || undefined }))
    }
    if (globalError) setGlobalError(null)
    if (statusNotice && statusNotice.email && statusNotice.email !== rawVal.toLowerCase().trim()) {
      setStatusNotice(null)
    }
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
        type: 'custom',
        title: 'Incomplete Credentials',
        message: 'Please resolve the highlighted validation errors before signing in.',
      })
      return
    }

    setLoading(true)
    setGlobalError(null)

    try {
      await login(sanitizedEmail, sanitizedPassword)
    } catch (err: unknown) {
      const rawErrorMsg = err instanceof Error ? err.message : ''
      const lower = rawErrorMsg.toLowerCase()
      if (lower.includes('pending administrator review') || lower.includes('pending')) {
        setGlobalError(null)
        setStatusNotice({
          title: 'Status: Access Request Pending Review',
          message: rawErrorMsg || `An access request for ${sanitizedEmail} is currently pending review by workspace administrators in People & access.`,
          email: sanitizedEmail,
        })
      } else if (lower.includes('failed to fetch') || lower.includes('network')) {
        setStatusNotice(null)
        setGlobalError({
          type: 'server_error',
          title: 'Authentication Service Unavailable',
          message: 'Backend API service is currently unavailable. Please verify the backend server is running on port 8000.',
        })
      } else if (lower.includes('declined') || lower.includes('rejected')) {
        setStatusNotice(null)
        setGlobalError({
          type: 'custom',
          title: 'Access Request Declined',
          message: rawErrorMsg || 'Your access request was declined by workspace administrators.',
        })
      } else if (lower.includes('welcomepass') || lower.includes('temporary password')) {
        setStatusNotice(null)
        setGlobalError({
          type: 'custom',
          title: 'Initial Password Required',
          message: rawErrorMsg,
          actionLabel: 'Use "WelcomePass123!" & Sign In →',
          onAction: () => {
            setFormValues((prev) => ({ ...prev, password: 'WelcomePass123!' }))
            setGlobalError(null)
          },
        })
      } else {
        setStatusNotice(null)
        setGlobalError({
          type: 'invalid_credentials',
          title: 'Invalid Credentials',
          message: rawErrorMsg || 'Invalid email or password. Please verify your credentials and try again.',
          actionLabel: 'Joining a team? Join workspace →',
          onAction: () => {
            setAuthMode('join')
            setJoinValues((prev) => ({ ...prev, email: sanitizedEmail }))
            setGlobalError(null)
          },
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Register Form Submission (Create Workspace)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!registerValues.workspaceName.trim()) {
      newErrors.workspaceName = 'Company or workspace name is required.'
    }
    if (!registerValues.fullName.trim()) {
      newErrors.fullName = 'Full name is required.'
    }
    const emailErr = validateEmail(registerValues.email)
    if (emailErr) {
      newErrors.email = emailErr
    }
    if (!registerValues.password || registerValues.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }

    if (Object.keys(newErrors).length > 0) {
      setRegisterErrors(newErrors)
      setGlobalError({
        type: 'custom',
        title: 'Missing Required Fields',
        message: 'Please complete all required fields to register your workspace.',
      })
      return
    }

    setRegisterLoading(true)
    setGlobalError(null)
    setRegisterErrors({})

    try {
      await register({
        full_name: registerValues.fullName.trim(),
        workspace_name: registerValues.workspaceName.trim(),
        email: registerValues.email.trim(),
        password: registerValues.password,
        role: registerValues.role,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.'
      const isNetwork = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')
      const isDuplicate = msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('already taken')

      setGlobalError({
        type: isNetwork ? 'server_error' : 'custom',
        title: isNetwork
          ? 'Authentication Service Unavailable'
          : isDuplicate
          ? 'Account Already Exists'
          : 'Registration Notice',
        message: isNetwork
          ? 'Backend API service is currently unavailable. Please ensure the backend server is running on port 8000.'
          : isDuplicate
          ? `${msg} Please sign in using the Sign In tab.`
          : msg,
        actionLabel: isDuplicate ? 'Sign in with this email →' : undefined,
        onAction: isDuplicate
          ? () => {
              setAuthMode('signin')
              setFormValues((prev) => ({
                ...prev,
                email: registerValues.email,
                password: registerValues.password,
              }))
              setGlobalError(null)
            }
          : undefined,
      })
    } finally {
      setRegisterLoading(false)
    }
  }

  // Join Workspace Submission
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!joinValues.workspaceName.trim()) {
      newErrors.workspaceName = 'Company or workspace name is required.'
    }
    if (!joinValues.fullName.trim()) {
      newErrors.fullName = 'Full name is required.'
    }
    const emailErr = validateEmail(joinValues.email)
    if (emailErr) {
      newErrors.email = emailErr
    }
    if (!joinValues.password || joinValues.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }

    if (Object.keys(newErrors).length > 0) {
      setJoinErrors(newErrors)
      setGlobalError({
        type: 'custom',
        title: 'Missing Required Fields',
        message: 'Please complete all required fields to join your company workspace.',
      })
      return
    }

    setJoinLoading(true)
    setGlobalError(null)
    setJoinErrors({})

    try {
      await joinWorkspace({
        workspace_name: joinValues.workspaceName.trim(),
        full_name: joinValues.fullName.trim(),
        email: joinValues.email.trim(),
        password: joinValues.password,
        role: joinValues.role,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join workspace.'
      const isNetwork = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')
      const isDuplicate = msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('already taken')
      const isNotFound = msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('not found')

      setGlobalError({
        type: isNetwork ? 'server_error' : 'custom',
        title: isNetwork
          ? 'Authentication Service Unavailable'
          : isNotFound
          ? 'Workspace Not Found'
          : isDuplicate
          ? 'Account Already Exists'
          : 'Join Workspace Notice',
        message: isNetwork
          ? 'Backend API service is currently unavailable. Please ensure the backend server is running on port 8000.'
          : msg,
        actionLabel: isDuplicate
          ? 'Sign in with this email →'
          : isNotFound
          ? 'Create this workspace →'
          : undefined,
        onAction: isDuplicate
          ? () => {
              setAuthMode('signin')
              setFormValues((prev) => ({
                ...prev,
                email: joinValues.email,
                password: joinValues.password,
              }))
              setGlobalError(null)
            }
          : isNotFound
          ? () => {
              setAuthMode('register')
              setRegisterValues((prev) => ({
                ...prev,
                workspaceName: joinValues.workspaceName,
                fullName: joinValues.fullName,
                email: joinValues.email,
              }))
              setGlobalError(null)
            }
          : undefined,
      })
    } finally {
      setJoinLoading(false)
    }
  }

  // 1-Click Demo Login with zero-wait offline demo fallback
  const loginAsDemo = async (demoEmail: string, demoPass: string) => {
    setFormValues((prev) => ({ ...prev, email: demoEmail, password: demoPass }))
    setLoading(true)
    setGlobalError(null)
    setErrors({})

    const role = demoEmail.includes('admin')
      ? 'admin'
      : demoEmail.includes('viewer')
      ? 'viewer'
      : 'analyst'

    try {
      await login(demoEmail, demoPass)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign-in failed.'
      console.warn('Live backend unavailable for demo account, instantly entering offline sandbox:', msg)
      enterDemoMode(role)
    } finally {
      setLoading(false)
    }
  }



  const isSubmitDisabled = loading || !formValues.email.trim() || !formValues.password

  return (
    <div className="login-split-page" data-testid="login-page">
      {/* ─── Left Brand Panel ─── */}
      <aside className="login-brand-panel" aria-label="Brand Overview and Safety Guarantees">
        <div className="login-brand-content">
          <div className="login-brand-header">
            <QueryTrustLogo size={48} />
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

          {/* Top Auth Mode Tabs: Sign In vs Join Workspace vs Create Workspace */}
          <div className="auth-mode-tabs" role="tablist" aria-label="Authentication Options">
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'signin'}
              className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('signin')
                setGlobalError(null)
              }}
            >
              <KeyRound size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'join'}
              className={`auth-tab-btn ${authMode === 'join' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('join')
                setGlobalError(null)
                setStatusNotice(null)
              }}
            >
              <Users size={14} />
              <span>Join Workspace</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register')
                setGlobalError(null)
                setStatusNotice(null)
              }}
            >
              <Building size={14} />
              <span>Create Workspace</span>
            </button>
          </div>

          <header className="login-card-header">
            <h2>
              {authMode === 'signin'
                ? 'Sign in to workspace'
                : authMode === 'join'
                ? 'Join company workspace'
                : 'Create company workspace'}
            </h2>
            <p>
              {authMode === 'signin'
                ? 'Sign in with your work email to access safe read-only analytics.'
                : authMode === 'join'
                ? 'Join your team’s existing organization as an analyst or viewer.'
                : 'Register your organization. Accounts and salted bcrypt password hashes are stored in PostgreSQL.'}
            </p>
          </header>

          {/* Status Notice (e.g. Access Request Pending) */}
          {statusNotice && (
            <div
              className="login-status-card"
              role="status"
              style={{
                marginBottom: '1.25rem',
                padding: '0.9rem 1rem',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: 'var(--qt-ink, #ffffff)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <Clock size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>
                    {statusNotice.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setStatusNotice(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--qt-muted)', cursor: 'pointer', padding: 0 }}
                    aria-label="Dismiss status notification"
                  >
                    <X size={15} />
                  </button>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--qt-ink-muted, #d1d5db)', lineHeight: 1.45 }}>
                  {statusNotice.message}
                </p>
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {globalError && (
            <div style={{ marginBottom: '1.25rem' }}>
              <GlobalErrorBanner
                title={globalError.title}
                type={globalError.type}
                message={globalError.message}
                actionLabel={globalError.actionLabel}
                onAction={globalError.onAction}
                onDismiss={() => setGlobalError(null)}
                onRetry={() => { void handleSubmit({ preventDefault: () => {} } as React.FormEvent) }}
              />
            </div>
          )}

          {/* Create Workspace / Registration Form */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="login-form" noValidate>
              {/* Workspace / Company Name */}
              <div className={`form-group ${registerErrors.workspaceName ? 'has-error' : ''}`}>
                <label className="form-label">Company or workspace name</label>
                <div className="input-with-icon">
                  <Building size={16} className="input-icon" aria-hidden="true" />
                  <input
                    type="text"
                    value={registerValues.workspaceName}
                    onChange={(e) => {
                      setRegisterValues((prev) => ({ ...prev, workspaceName: e.target.value }))
                      if (registerErrors.workspaceName) setRegisterErrors((p) => ({ ...p, workspaceName: undefined }))
                    }}
                    placeholder="e.g., Acme Networks, Cisco Labs, Tech Corp"
                    className="form-input"
                    required
                  />
                </div>
                {registerErrors.workspaceName && (
                  <div className="inline-field-error" role="alert">
                    <span className="error-bullet" />
                    <span>{registerErrors.workspaceName}</span>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div className={`form-group ${registerErrors.fullName ? 'has-error' : ''}`}>
                <label className="form-label">Full name</label>
                <div className="input-with-icon">
                  <UserIcon size={16} className="input-icon" aria-hidden="true" />
                  <input
                    type="text"
                    value={registerValues.fullName}
                    onChange={(e) => {
                      setRegisterValues((prev) => ({ ...prev, fullName: e.target.value }))
                      if (registerErrors.fullName) setRegisterErrors((p) => ({ ...p, fullName: undefined }))
                    }}
                    placeholder="e.g., Alex Carter"
                    className="form-input"
                    required
                  />
                </div>
                {registerErrors.fullName && (
                  <div className="inline-field-error" role="alert">
                    <span className="error-bullet" />
                    <span>{registerErrors.fullName}</span>
                  </div>
                )}
              </div>

              {/* Work Email */}
              <div className={`form-group ${registerErrors.email ? 'has-error' : ''}`}>
                <label className="form-label">Work email</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" aria-hidden="true" />
                  <input
                    type="email"
                    value={registerValues.email}
                    onChange={(e) => {
                      setRegisterValues((prev) => ({ ...prev, email: e.target.value }))
                      if (registerErrors.email) setRegisterErrors((p) => ({ ...p, email: undefined }))
                    }}
                    placeholder="name@company.com"
                    className="form-input"
                    required
                  />
                </div>
                {registerErrors.email && (
                  <div className="inline-field-error" role="alert">
                    <span className="error-bullet" />
                    <span>{registerErrors.email}</span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className={`form-group ${registerErrors.password ? 'has-error' : ''}`}>
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" aria-hidden="true" />
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerValues.password}
                    onChange={(e) => {
                      setRegisterValues((prev) => ({ ...prev, password: e.target.value }))
                      if (registerErrors.password) setRegisterErrors((p) => ({ ...p, password: undefined }))
                    }}
                    placeholder="Create a strong password (min 6 chars)"
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    title={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {registerErrors.password && (
                  <div className="inline-field-error" role="alert">
                    <span className="error-bullet" />
                    <span>{registerErrors.password}</span>
                  </div>
                )}
                <PasswordStrengthMeter
                  strength={registerPasswordStrength}
                  passwordLength={registerValues.password.length}
                />
              </div>

              {/* Workspace Administrator Privileges Callout */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(255, 90, 20, 0.08)',
                  border: '1px solid rgba(255, 90, 20, 0.22)',
                  alignItems: 'flex-start',
                  margin: '4px 0 10px',
                }}
              >
                <ShieldCheck size={18} style={{ color: 'var(--qt-accent, #ff5a14)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--qt-ink-muted, #d1d5db)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--qt-ink, #ffffff)', display: 'block', marginBottom: 2 }}>
                    Workspace Administrator &amp; Owner
                  </strong>
                  As the workspace creator, you will have Administrator privileges to manage fleet data, invite team members, and review access requests.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={registerLoading}
                className="login-submit-btn"
              >
                {registerLoading ? (
                  <>
                    <span className="loading-spinner-inline" aria-hidden="true" />
                    <span>Creating workspace…</span>
                  </>
                ) : (
                  <>
                    <span>Create workspace & Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="login-request-access-row" style={{ marginTop: '0.75rem' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  className="login-request-access-btn"
                  onClick={() => {
                    setAuthMode('signin')
                    setGlobalError(null)
                  }}
                >
                  Sign in instead
                </button>
              </div>
            </form>
          )}

          {/* Join Existing Workspace Form */}
          {authMode === 'join' && (
            <form onSubmit={handleJoinSubmit} className="login-form" noValidate>
              {joinValues.workspaceName && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'rgba(255, 90, 20, 0.08)',
                  border: '1px solid rgba(255, 90, 20, 0.25)',
                  borderRadius: 8,
                  marginBottom: '14px',
                  fontSize: '0.8rem',
                  color: 'var(--qt-ink, #ffffff)',
                }}>
                  <Building size={15} style={{ color: 'var(--qt-accent, #ff5a14)', flexShrink: 0 }} />
                  <span>
                    You are onboarding into: <strong>{joinValues.workspaceName}</strong>
                  </span>
                </div>
              )}

              {/* Workspace / Company Name */}
              <div className={`form-group ${joinErrors.workspaceName ? 'has-error' : ''}`}>
                <label className="form-label">Company workspace name to join</label>
                <div className="input-with-icon">
                  <Building size={16} className="input-icon" aria-hidden="true" />
                  <input
                    type="text"
                    value={joinValues.workspaceName}
                    onChange={(e) => {
                      setJoinValues((prev) => ({ ...prev, workspaceName: e.target.value }))
                      if (joinErrors.workspaceName) setJoinErrors((p) => ({ ...p, workspaceName: undefined }))
                    }}
                    placeholder="e.g., Kashish private limited"
                    className="form-input"
                    required
                  />
                </div>
                {joinErrors.workspaceName && (
                  <div className="inline-field-error" role="alert">
                    <span className="error-bullet" />
                    <span>{joinErrors.workspaceName}</span>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div className={`form-group ${joinErrors.fullName ? 'has-error' : ''}`}>
                <label className="form-label">Full name</label>
                <div className="input-with-icon">
                  <UserIcon size={16} className="input-icon" aria-hidden="true" />
                  <input
                    type="text"
                    value={joinValues.fullName}
                    onChange={(e) => {
                      setJoinValues((prev) => ({ ...prev, fullName: e.target.value }))
                      if (joinErrors.fullName) setJoinErrors((p) => ({ ...p, fullName: undefined }))
                    }}
                    placeholder="e.g., Alex Carter"
                    className="form-input"
                    required
                  />
                </div>
                {joinErrors.fullName && (
                  <div className="inline-field-error" role="alert">
                    <span className="error-bullet" />
                    <span>{joinErrors.fullName}</span>
                  </div>
                )}
              </div>

              {/* Work Email */}
              <div className={`form-group ${joinErrors.email ? 'has-error' : ''}`}>
                <label className="form-label">Work email</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" aria-hidden="true" />
                  <input
                    type="email"
                    value={joinValues.email}
                    onChange={(e) => {
                      setJoinValues((prev) => ({ ...prev, email: e.target.value }))
                      if (joinErrors.email) setJoinErrors((p) => ({ ...p, email: undefined }))
                    }}
                    placeholder="name@company.com"
                    className="form-input"
                    required
                  />
                </div>
                {joinErrors.email && (
                  <div className="inline-field-error" role="alert">
                    <span className="error-bullet" />
                    <span>{joinErrors.email}</span>
                  </div>
                )}
              </div>

              {/* Team Role Choice */}
              <div className="form-group">
                <label className="form-label">Team role in workspace</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${joinValues.role === 'analyst' ? 'var(--qt-accent)' : 'var(--qt-border)'}`,
                      background: joinValues.role === 'analyst' ? 'rgba(255, 92, 0, 0.08)' : 'var(--qt-canvas)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="join-role"
                      checked={joinValues.role === 'analyst'}
                      onChange={() => setJoinValues((p) => ({ ...p, role: 'analyst' }))}
                    />
                    <span><strong>Analyst</strong> (Query & explore)</span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${joinValues.role === 'viewer' ? 'var(--qt-accent)' : 'var(--qt-border)'}`,
                      background: joinValues.role === 'viewer' ? 'rgba(255, 92, 0, 0.08)' : 'var(--qt-canvas)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="join-role"
                      checked={joinValues.role === 'viewer'}
                      onChange={() => setJoinValues((p) => ({ ...p, role: 'viewer' }))}
                    />
                    <span><strong>Viewer</strong> (Read-only)</span>
                  </label>
                </div>
              </div>

              {/* Password Field */}
              <div className={`form-group ${joinErrors.password ? 'has-error' : ''}`}>
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" aria-hidden="true" />
                  <input
                    type={showJoinPassword ? 'text' : 'password'}
                    value={joinValues.password}
                    onChange={(e) => {
                      setJoinValues((prev) => ({ ...prev, password: e.target.value }))
                      if (joinErrors.password) setJoinErrors((p) => ({ ...p, password: undefined }))
                    }}
                    placeholder="Create your team password (min 6 chars)"
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowJoinPassword(!showJoinPassword)}
                    title={showJoinPassword ? 'Hide password' : 'Show password'}
                  >
                    {showJoinPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {joinErrors.password && (
                  <div className="inline-field-error" role="alert">
                    <span className="error-bullet" />
                    <span>{joinErrors.password}</span>
                  </div>
                )}
                <PasswordStrengthMeter
                  strength={joinPasswordStrength}
                  passwordLength={joinValues.password.length}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={joinLoading}
                className="login-submit-btn"
                style={{ marginTop: '0.5rem' }}
              >
                {joinLoading ? (
                  <>
                    <span className="loading-spinner-inline" aria-hidden="true" />
                    <span>Joining workspace…</span>
                  </>
                ) : (
                  <>
                    <span>Join company workspace</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="login-request-access-row">
                <span>Need a brand new organization? </span>
                <button
                  type="button"
                  className="login-request-access-btn"
                  onClick={() => {
                    setAuthMode('register')
                    setGlobalError(null)
                  }}
                >
                  Create workspace
                </button>
              </div>
            </form>
          )}

          {/* Sign In Form */}
          {authMode === 'signin' && (
            <>
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

              {/* Action Links */}
              <div className="login-quick-links-row">
                <button
                  type="button"
                  className="login-text-link"
                  onClick={() => {
                    setAuthMode('register')
                    setGlobalError(null)
                  }}
                >
                  Create workspace
                </button>
                <span className="login-link-separator">•</span>
                <button
                  type="button"
                  className="login-text-link"
                  onClick={() => {
                    setAuthMode('join')
                    setGlobalError(null)
                  }}
                >
                  Join workspace
                </button>
              </div>

              {/* ─── Fast Demo Sandbox Personas ─── */}
              {isDemoMode && (
                <section className="demo-credentials-section" aria-label="Demo Sandbox Quick Access">
                  <div className="demo-section-divider">
                    <span>
                      <Sparkles size={11} style={{ marginRight: 6, verticalAlign: -1, color: 'var(--qt-accent, #ff5a14)' }} />
                      Explore Demo Sandbox
                    </span>
                  </div>
                  <p className="demo-disclosure-hint">
                    Instant 1-click evaluation with synthetic equipment data:
                  </p>
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
                      <span className="demo-chip-desc">Natural-language questions, health checks, & telemetry anomalies</span>
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
                      <span className="demo-chip-desc">Read-only: equipment catalog, data health and telemetry alerts</span>
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
                      <span className="demo-chip-desc">Full governance, security audit logs, BYOD sources, & team invites</span>
                    </button>
                  </div>
                </section>
              )}
            </>
          )}

          {/* Footer Security Note */}
          <footer className="login-footer">
            <ShieldCheck size={14} className="text-secondary" />
            <span>Read-only access &bull; 6 safety checks &bull; No changes to your data</span>
          </footer>
        </div>
      </main>

    </div>
  )
}
