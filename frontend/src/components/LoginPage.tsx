import React, { useState, useId, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { QueryTrustLogo } from './QueryTrustLogo'
import { GlobalErrorBanner } from './GlobalErrorBanner'
import type { ErrorBannerType } from './GlobalErrorBanner'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { HeroSpotlightBackground } from './HeroSpotlightBackground'
import {
  sanitizeInput,
  validateEmail,
  calculatePasswordStrength,
  validateLoginForm,
} from '../lib/authValidation'
import type { LoginFormValues, ValidationErrors } from '../lib/authValidation'
import './LoginPage.css'

interface LoginPageProps {
  onBackToLanding?: () => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToLanding }) => {
  const { login, register, joinWorkspace, enterDemoMode } = useAuth()

  // Auth Mode: 'signin' | 'register' | 'join'
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

  // Join Workspace Form State
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

  const registerPasswordStrength = calculatePasswordStrength(registerValues.password)

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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    setFormValues((prev) => ({ ...prev, email: rawVal }))
    if (touched.email) {
      const err = validateEmail(rawVal)
      setErrors((prev) => ({ ...prev, email: err }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    setFormValues((prev) => ({ ...prev, password: rawVal }))
    if (touched.password) {
      const err = rawVal.length < 6 ? 'Password must be at least 6 characters' : undefined
      setErrors((prev) => ({ ...prev, password: err }))
    }
  }

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    const validationErrors = validateLoginForm(formValues)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setGlobalError({
        type: 'custom',
        title: 'Validation Notice',
        message: 'Please resolve the highlighted input fields before continuing.',
      })
      return
    }

    setLoading(true)
    setGlobalError(null)

    const sanitizedEmail = sanitizeInput(formValues.email).toLowerCase()

    try {
      await login(sanitizedEmail, formValues.password)
    } catch (err: unknown) {
      const rawErrorMsg = err instanceof Error ? err.message : 'Authentication failed.'
      setGlobalError({
        type: 'invalid_credentials',
        title: 'Invalid Credentials',
        message: rawErrorMsg || 'Invalid email or password. Please verify credentials.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!registerValues.workspaceName.trim()) newErrors.workspaceName = 'Workspace name is required.'
    if (!registerValues.fullName.trim()) newErrors.fullName = 'Full name is required.'
    const emailErr = validateEmail(registerValues.email)
    if (emailErr) newErrors.email = emailErr
    if (!registerValues.password || registerValues.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }

    if (Object.keys(newErrors).length > 0) {
      setRegisterErrors(newErrors)
      return
    }

    setRegisterLoading(true)
    setGlobalError(null)
    try {
      await register({
        full_name: registerValues.fullName.trim(),
        workspace_name: registerValues.workspaceName.trim(),
        email: registerValues.email.trim(),
        password: registerValues.password,
        role: registerValues.role,
      })
    } catch (err: any) {
      setGlobalError({
        type: 'custom',
        title: 'Registration Notice',
        message: err.message || 'Registration failed.',
      })
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!joinValues.workspaceName.trim()) newErrors.workspaceName = 'Workspace name is required.'
    if (!joinValues.fullName.trim()) newErrors.fullName = 'Full name is required.'
    const emailErr = validateEmail(joinValues.email)
    if (emailErr) newErrors.email = emailErr
    if (!joinValues.password || joinValues.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }

    if (Object.keys(newErrors).length > 0) {
      setJoinErrors(newErrors)
      return
    }

    setJoinLoading(true)
    setGlobalError(null)
    try {
      await joinWorkspace({
        workspace_name: joinValues.workspaceName.trim(),
        full_name: joinValues.fullName.trim(),
        email: joinValues.email.trim(),
        password: joinValues.password,
        role: joinValues.role,
      })
    } catch (err: any) {
      setGlobalError({
        type: 'custom',
        title: 'Join Notice',
        message: err.message || 'Failed to join workspace.',
      })
    } finally {
      setJoinLoading(false)
    }
  }

  const loginAsDemo = async (demoEmail: string, demoPass: string) => {
    setFormValues({ email: demoEmail, password: demoPass, rememberMe: false })
    setLoading(true)
    setGlobalError(null)
    setErrors({})

    const role = demoEmail.includes('admin') ? 'admin' : demoEmail.includes('viewer') ? 'viewer' : 'analyst'
    try {
      await login(demoEmail, demoPass)
    } catch {
      enterDemoMode(role as 'admin' | 'analyst' | 'viewer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-root min-h-screen bg-[var(--color-page-bg)] text-[var(--color-text-primary)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <HeroSpotlightBackground />

      {/* Floating Back Link */}
      {onBackToLanding && (
        <button
          type="button"
          onClick={onBackToLanding}
          className="absolute top-6 left-6 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 z-20 cursor-pointer"
        >
          <span>&larr; Back to overview</span>
        </button>
      )}

      {/* Centered Auth Card */}
      <div className="w-full max-w-[420px] rounded-[var(--radius-container)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-8 shadow-xl relative z-10 transition-all">
        {/* Emblem & Title */}
        <div className="flex flex-col items-center text-center">
          <QueryTrustLogo size={36} />
          <h1 className="font-display text-[32px] font-normal leading-tight tracking-tight text-[var(--color-text-primary)] mt-3.5">
            {authMode === 'signin'
              ? 'Sign in to QueryTrust'
              : authMode === 'join'
              ? 'Join team workspace'
              : 'Create workspace'}
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Read-only natural-language PostgreSQL analytics
          </p>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="mt-4">
            <GlobalErrorBanner
              type={globalError.type}
              title={globalError.title}
              message={globalError.message}
              actionLabel={globalError.actionLabel}
              onAction={globalError.onAction}
              onDismiss={() => setGlobalError(null)}
            />
          </div>
        )}

        {/* Segmented Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--color-raised)] border border-[var(--color-border-subtle)] mt-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin')
              setGlobalError(null)
            }}
            className={`py-1.5 rounded-[6px] transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('join')
              setGlobalError(null)
            }}
            className={`py-1.5 rounded-[6px] transition-all cursor-pointer ${
              authMode === 'join'
                ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Join Team
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register')
              setGlobalError(null)
            }}
            className={`py-1.5 rounded-[6px] transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Create
          </button>
        </div>

        {/* Form Body */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor={emailInputId} className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Work Email
              </label>
              <div className="relative flex items-center">
                <Mail size={14} className="absolute left-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                <input
                  id={emailInputId}
                  type="email"
                  value={formValues.email}
                  onChange={handleEmailChange}
                  placeholder="analyst@company.com"
                  autoComplete="email"
                  className="login-input-with-icon w-full h-10 pr-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
                />
              </div>
              {errors.email && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor={passwordInputId} className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={14} className="absolute left-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                <input
                  id={passwordInputId}
                  type={showPassword ? 'text' : 'password'}
                  value={formValues.password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="login-input-with-icon login-input-with-trailing w-full h-10 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-[var(--radius-control)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-contrast)] font-medium text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight size={13} />
            </button>
          </form>
        )}

        {authMode === 'join' && (
          <form onSubmit={handleJoinSubmit} className="mt-6 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Workspace Name</label>
              <input
                type="text"
                value={joinValues.workspaceName}
                onChange={(e) => setJoinValues((prev) => ({ ...prev, workspaceName: e.target.value }))}
                placeholder="Acme Corp"
                className="w-full h-9 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {joinErrors.workspaceName && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{joinErrors.workspaceName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Full Name</label>
              <input
                type="text"
                value={joinValues.fullName}
                onChange={(e) => setJoinValues((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full h-9 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {joinErrors.fullName && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{joinErrors.fullName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Work Email</label>
              <input
                type="email"
                value={joinValues.email}
                onChange={(e) => setJoinValues((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="jane@acme.com"
                className="w-full h-9 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {joinErrors.email && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{joinErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Password</label>
              <input
                type="password"
                value={joinValues.password}
                onChange={(e) => setJoinValues((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••••••"
                className="w-full h-9 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {joinErrors.password && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{joinErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={joinLoading}
              className="w-full h-10 rounded-[var(--radius-control)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-contrast)] font-medium text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{joinLoading ? 'Joining...' : 'Join Team Workspace'}</span>
              <ArrowRight size={13} />
            </button>
          </form>
        )}

        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Company / Workspace Name</label>
              <input
                type="text"
                value={registerValues.workspaceName}
                onChange={(e) => setRegisterValues((prev) => ({ ...prev, workspaceName: e.target.value }))}
                placeholder="Enterprise Tech"
                className="w-full h-9 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {registerErrors.workspaceName && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{registerErrors.workspaceName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Your Full Name</label>
              <input
                type="text"
                value={registerValues.fullName}
                onChange={(e) => setRegisterValues((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Alex Morgan"
                className="w-full h-9 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {registerErrors.fullName && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{registerErrors.fullName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Work Email</label>
              <input
                type="email"
                value={registerValues.email}
                onChange={(e) => setRegisterValues((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="alex@enterprisetech.com"
                className="w-full h-9 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {registerErrors.email && <p className="text-[11px] text-[var(--color-status-error-text)] mt-1">{registerErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Create Password</label>
              <input
                type="password"
                value={registerValues.password}
                onChange={(e) => setRegisterValues((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••••••"
                className="w-full h-9 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-raised)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <PasswordStrengthMeter strength={registerPasswordStrength} passwordLength={registerValues.password.length} />
            </div>

            <button
              type="submit"
              disabled={registerLoading}
              className="w-full h-10 rounded-[var(--radius-control)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-contrast)] font-medium text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{registerLoading ? 'Creating...' : 'Create Workspace'}</span>
              <ArrowRight size={13} />
            </button>
          </form>
        )}

        {/* ─── Instant 1-Click Evaluator Demo Access ─── */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border-subtle)]" />
          </div>
          <span className="relative bg-[var(--color-surface)] px-3 text-[10.5px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
            or evaluate as
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => loginAsDemo('admin@querytrust.local', 'AdminPass123!')}
            className="p-3 rounded-[var(--radius-control)] bg-[var(--color-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-left transition-all cursor-pointer group flex flex-col justify-between"
            title="Evaluate full admin governance & AST configuration"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] flex-shrink-0" />
              <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">Admin</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">Full AST &amp; RBAC</span>
          </button>
          <button
            type="button"
            onClick={() => loginAsDemo('analyst@querytrust.local', 'AnalystPass123!')}
            className="p-3 rounded-[var(--radius-control)] bg-[var(--color-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-left transition-all cursor-pointer group flex flex-col justify-between"
            title="Evaluate analyst NL-to-SQL & diagnostics"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)] flex-shrink-0" />
              <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">Analyst</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">Studio &amp; SQL</span>
          </button>
          <button
            type="button"
            onClick={() => loginAsDemo('viewer@querytrust.local', 'ViewerPass123!')}
            className="p-3 rounded-[var(--radius-control)] bg-[var(--color-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-left transition-all cursor-pointer group flex flex-col justify-between"
            title="Evaluate read-only consumer charts & answers"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] flex-shrink-0" />
              <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">Viewer</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">Plain English</span>
          </button>
        </div>
      </div>
    </div>
  )
}
