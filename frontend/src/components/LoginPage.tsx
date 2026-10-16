import React, { useState } from 'react'
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const showLocalDemoAccounts = import.meta.env.DEV

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.')
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
          : 'Authentication failed. Please verify credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setErrorMessage(null)
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-logo-glow">
            <div className="brand-logo" style={{ width: 44, height: 44, fontSize: '1.25rem' }}>
              QT
            </div>
          </div>
          <h1 className="login-title">QueryTrust AI</h1>
          <p className="login-subtitle">
            A clearer way to understand your equipment data
          </p>
        </div>

        {/* Security / Mode Banner */}
        <div className="login-synthetic-banner">
          <div className="synthetic-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="badge-dot"></span>
            SYNTHETIC PRACTICE ENVIRONMENT
          </div>
          <p className="banner-note">
            This local workspace uses educational synthetic records. It does not contain customer or production device data.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-error-alert" role="alert">
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
                placeholder="Enter password"
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
              <span className="loading-spinner-inline" />
            ) : (
              <>
                <span>Sign in to your workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Section */}
        {showLocalDemoAccounts && <div className="demo-credentials-section">
          <div className="demo-credentials-header">
            <KeyRound size={14} style={{ color: 'var(--qt-accent)' }} />
            <span>Local development sign-in</span>
          </div>
          <div className="demo-chips-grid">
            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemoAccount('admin@querytrust.local', 'AdminPass123!')}
            >
              <div className="demo-chip-title">
                <span className="role-tag role-admin">Admin</span>
                <span className="demo-chip-email">admin@querytrust.local</span>
              </div>
              <span className="demo-chip-desc">Access to governance, evaluations, and people settings</span>
            </button>

            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemoAccount('analyst@querytrust.local', 'AnalystPass123!')}
            >
              <div className="demo-chip-title">
                <span className="role-tag role-analyst">Analyst</span>
                <span className="demo-chip-email">analyst@querytrust.local</span>
              </div>
              <span className="demo-chip-desc">Ask questions, review data health, and inspect unusual activity</span>
            </button>

            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemoAccount('viewer@querytrust.local', 'ViewerPass123!')}
            >
              <div className="demo-chip-title">
                <span className="role-tag role-viewer">Viewer</span>
                <span className="demo-chip-email">viewer@querytrust.local</span>
              </div>
              <span className="demo-chip-desc">View equipment, ask questions, and see your own history</span>
            </button>
          </div>
        </div>}

        {/* Footer */}
        <div className="login-footer">
          <Shield size={14} className="text-secondary" />
          <span>Read-only analytics with server-side safety checks</span>
        </div>
      </div>
    </div>
  )
}
