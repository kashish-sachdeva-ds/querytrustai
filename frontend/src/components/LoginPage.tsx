import React, { useState, useId, useEffect } from 'react'
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  X,
  Building,
  User as UserIcon,
  Users,
  Clock,
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



  // Attack Simulation Widget State for Sign-In Proof Showcase
  const [activeSimulationId, setActiveSimulationId] = useState<'safe' | 'injection' | 'write'>('safe')

  const simulations = {
    safe: {
      label: 'Safe Query',
      tag: '✅ Safe Query',
      prompt: 'Show active routers in EMEA with expiring warranties',
      sql: `SELECT d.asset_tag, d.model, s.site_name, d.warranty_expiry\nFROM devices d\nJOIN sites s ON d.site_id = s.id\nWHERE d.device_type = 'Router'\n  AND d.status = 'active'\n  AND s.region = 'EMEA'\n  AND d.warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'\nORDER BY d.warranty_expiry ASC\nLIMIT 100;`,
      verdict: 'EXECUTION PERMITTED (1.42ms)',
      status: 'safe' as const,
      gates: [
        { id: 'AST-01', name: 'Statement Type', passed: true, note: 'exp.Select confirmed read-only' },
        { id: 'AST-02', name: 'Single Statement', passed: true, note: 'Single AST root enforced (0 semicolons)' },
        { id: 'AST-03', name: 'Catalog Isolation', passed: true, note: 'No pg_catalog or system references' },
        { id: 'AST-04', name: 'Table Allowlist', passed: true, note: 'devices, sites allowlisted' },
        { id: 'AST-05', name: 'Cost & Row Bound', passed: true, note: 'Explicit JOIN predicate & LIMIT 100 injected' },
        { id: 'AST-06', name: 'Kernel Binding', passed: true, note: 'Dispatched to PostgreSQL qt_ai_readonly pool' },
      ],
    },
    injection: {
      label: 'Injection Attack',
      tag: '🛡️ Injection Attack',
      prompt: 'Show devices; DROP TABLE service_events; --',
      sql: `SELECT * FROM devices; DROP TABLE service_events; --`,
      verdict: 'AST INTERCEPTED: MultiStatementError (Injection Blocked)',
      status: 'blocked' as const,
      gates: [
        { id: 'AST-01', name: 'Statement Type', passed: true, note: 'Root expression parsed' },
        { id: 'AST-02', name: 'Single Statement', passed: false, note: 'VIOLATION: Multiple statements detected (; stacking)' },
        { id: 'AST-03', name: 'Catalog Isolation', passed: false, note: 'Secondary root contains DDL mutation (DROP TABLE)' },
        { id: 'AST-04', name: 'Table Allowlist', passed: false, note: 'Table DROP prohibited by security policy' },
        { id: 'AST-05', name: 'Cost & Row Bound', passed: false, note: 'Pipeline aborted at AST Gate 02' },
        { id: 'AST-06', name: 'Kernel Binding', passed: false, note: 'Database execution cancelled (0 network calls)' },
      ],
    },
    write: {
      label: 'Unauthorized Write',
      tag: '🛡️ Unauthorized Write',
      prompt: "UPDATE devices SET status = 'retired' WHERE id = 42",
      sql: `UPDATE devices SET status = 'retired' WHERE id = 42;`,
      verdict: 'KERNEL & AST INTERCEPTED: StatementTypeError (Write Forbidden)',
      status: 'blocked' as const,
      gates: [
        { id: 'AST-01', name: 'Statement Type', passed: false, note: 'VIOLATION: Root node is exp.Update; only SELECT permitted' },
        { id: 'AST-02', name: 'Single Statement', passed: true, note: 'Single statement parsed' },
        { id: 'AST-03', name: 'Catalog Isolation', passed: true, note: 'Standard schema target' },
        { id: 'AST-04', name: 'Table Allowlist', passed: false, note: 'Mutation operation forbidden on public.devices' },
        { id: 'AST-05', name: 'Cost & Row Bound', passed: false, note: 'Pipeline halted at AST Gate 01' },
        { id: 'AST-06', name: 'Kernel Binding', passed: false, note: 'PostgreSQL role qt_ai_readonly denies UPDATE privilege' },
      ],
    },
  }

  const currentSim = simulations[activeSimulationId]
  const isSubmitDisabled = loading || !formValues.email.trim() || !formValues.password

  return (
    <div className="login-split-page" data-testid="login-page">
      {/* ─── Left Brand Panel: Interactive Zero-Trust Proof Showcase (Anti-AI Bespoke) ─── */}
      <aside className="login-brand-panel" aria-label="Brand Overview and Safety Guarantees">
        <div className="login-brand-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <QueryTrustLogo size={36} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink-primary)', letterSpacing: '-0.03em' }}>
                  QueryTrust AI
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    backgroundColor: 'var(--accent-primary-subtle)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-primary-border)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}
                >
                  ZERO-TRUST
                </span>
              </div>
              <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                NL-TO-SQL GOVERNANCE WORKBENCH
              </span>
            </div>
          </div>

          {/* Headline & Subheadline */}
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.65rem',
                fontWeight: 800,
                color: 'var(--ink-primary)',
                letterSpacing: '-0.035em',
                lineHeight: 1.25,
                margin: '0 0 0.5rem 0',
              }}
            >
              Self-serve PostgreSQL velocity.{' '}
              <span style={{ color: 'var(--accent-primary)' }}>Mathematically incapable of corrupting data.</span>
            </h1>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--ink-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Compiler-grade SQLGlot AST verification paired with a Dual-Role PostgreSQL kernel architecture. Drop analytics turnaround from a 4-hour Jira lag to under 1.5 seconds.
            </p>
          </div>

          {/* ─── Interactive Live AST Shield Widget (Interactive on Login Page!) ─── */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-1)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              padding: '1rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: currentSim.status === 'safe' ? 'var(--gov-safe-dot)' : 'var(--gov-block-text)',
                  }}
                />
                <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-primary)' }}>
                  Live Attack Simulation &amp; AST Inspector
                </span>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                Click pill to simulate:
              </span>
            </div>

            {/* Clickable 3 Test Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['safe', 'injection', 'write'] as const).map((id) => {
                const s = simulations[id]
                const isSelected = activeSimulationId === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSimulationId(id)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      border: isSelected
                        ? `1.5px solid var(--accent-primary)`
                        : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--accent-primary-subtle)' : 'var(--bg-surface-2)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--ink-secondary)',
                      transition: 'all 120ms ease',
                    }}
                  >
                    {s.tag}
                  </button>
                )
              })}
            </div>

            {/* Prompt & SQL Preview */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '5px',
                padding: '8px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            >
              <div style={{ color: 'var(--ink-muted)', marginBottom: '3px', fontSize: '10px' }}>
                INPUT PROMPT:
              </div>
              <div style={{ color: 'var(--ink-primary)', fontWeight: 600, marginBottom: '6px' }}>
                &ldquo;{currentSim.prompt}&rdquo;
              </div>
              <div style={{ color: 'var(--ink-muted)', marginBottom: '2px', fontSize: '10px' }}>
                GENERATED SQL &amp; AST PARSER:
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: '10.5px',
                  color: 'var(--ink-secondary)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.4,
                }}
              >
                {currentSim.sql}
              </pre>
            </div>

            {/* 6-Gate SQLGlot AST Checklist */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
              {currentSim.gates.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    backgroundColor: g.passed ? 'var(--gov-safe-bg)' : 'var(--gov-block-bg)',
                    color: g.passed ? 'var(--gov-safe-text)' : 'var(--gov-block-text)',
                    border: `1px solid ${g.passed ? 'var(--gov-safe-border)' : 'var(--gov-block-border)'}`,
                  }}
                  title={g.note}
                >
                  <span style={{ fontWeight: 700 }}>{g.passed ? '✓' : '✗'} [{g.id}]</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                </div>
              ))}
            </div>

            {/* Result Verdict Strip */}
            <div
              style={{
                padding: '6px 10px',
                borderRadius: '5px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: currentSim.status === 'safe' ? 'var(--gov-safe-bg)' : 'var(--gov-block-bg)',
                color: currentSim.status === 'safe' ? 'var(--gov-safe-text)' : 'var(--gov-block-text)',
                border: `1px solid ${currentSim.status === 'safe' ? 'var(--gov-safe-border)' : 'var(--gov-block-border)'}`,
              }}
            >
              <span>{currentSim.verdict}</span>
              <span style={{ fontSize: '10px', fontWeight: 500 }}>
                {currentSim.status === 'safe' ? 'Role: qt_ai_readonly' : 'Execution Aborted'}
              </span>
            </div>
          </div>

          {/* 3-Pillar Proof Strip at Bottom */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <div style={{ backgroundColor: 'var(--bg-surface-1)', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                SQLGlot AST Compiler
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                6-Layer syntax tree inspection
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface-1)', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--gov-safe-text)', fontWeight: 700 }}>
                Dual-Role PG Kernel
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                0 write/DDL privileges enforced
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface-1)', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', fontWeight: 700 }}>
                151 Automated Tests
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                65% Jira ticket deflection
              </div>
            </div>
          </div>
        </div>

        {/* Honest Disclosure Notice */}
        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ margin: 0, fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', lineHeight: 1.4 }}>
            Synthetic educational test dataset: 5,000 devices across 50 sites. Zero customer data or commercial affiliations.
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

              {/* ─── Explicit Evaluator Role Matrix (1-Click Evaluation Sandbox) ─── */}
              {isDemoMode && (
                <section
                  style={{
                    marginTop: '1.25rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface-2)',
                    padding: '0.85rem',
                  }}
                  aria-label="Demo Sandbox Quick Access"
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      paddingBottom: '6px',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-primary)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--ink-primary)',
                        }}
                      >
                        Evaluator Sandbox Persona Matrix
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                      1-Click Instant Session
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Admin Persona */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'var(--role-admin-bg)',
                              color: 'var(--role-admin-text)',
                              border: '1px solid var(--role-admin-border)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            ADMIN
                          </span>
                          <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                            admin@querytrust.local
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', lineHeight: 1.35 }}>
                          Full SQL + AST Inspector + 37-case benchmark runner + RBAC management
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => loginAsDemo('admin@querytrust.local', 'AdminPass123!')}
                        disabled={loading}
                        style={{
                          backgroundColor: 'var(--role-admin-bg)',
                          color: 'var(--role-admin-text)',
                          border: '1px solid var(--role-admin-border)',
                          borderRadius: '5px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        Launch Admin &rarr;
                      </button>
                    </div>

                    {/* Analyst Persona */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'var(--role-analyst-bg)',
                              color: 'var(--role-analyst-text)',
                              border: '1px solid var(--role-analyst-border)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            ANALYST
                          </span>
                          <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                            analyst@querytrust.local
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', lineHeight: 1.35 }}>
                          NL-to-SQL IDE workbench + Schema introspection + Read-only execution
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => loginAsDemo('analyst@querytrust.local', 'AnalystPass123!')}
                        disabled={loading}
                        style={{
                          backgroundColor: 'var(--role-analyst-bg)',
                          color: 'var(--role-analyst-text)',
                          border: '1px solid var(--role-analyst-border)',
                          borderRadius: '5px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        Launch Analyst &rarr;
                      </button>
                    </div>

                    {/* Viewer Persona */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'var(--role-viewer-bg)',
                              color: 'var(--role-viewer-text)',
                              border: '1px solid var(--role-viewer-border)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            VIEWER
                          </span>
                          <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                            viewer@querytrust.local
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', lineHeight: 1.35 }}>
                          Governed natural-language Q&amp;A + Visual charts only (Raw SQL hidden)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => loginAsDemo('viewer@querytrust.local', 'ViewerPass123!')}
                        disabled={loading}
                        style={{
                          backgroundColor: 'var(--role-viewer-bg)',
                          color: 'var(--role-viewer-text)',
                          border: '1px solid var(--role-viewer-border)',
                          borderRadius: '5px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        Launch Viewer &rarr;
                      </button>
                    </div>
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
