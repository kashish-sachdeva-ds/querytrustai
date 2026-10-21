import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  LogOut,
  Shield,
  Database,
  ChevronDown,
  Search,
  Sun,
  Moon,
  Monitor,
  Eye,
  Code2,
  Sparkles,
  Check,
  Loader2,
  UserCheck,
  Building,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { MetricsRibbon } from './MetricsRibbon'

interface HeaderProps {
  onOpenCommandPalette: () => void
  onOpenOnboarding?: () => void
}

const DEMO_ACCOUNTS = {
  admin: { email: 'admin@querytrust.local', pass: 'AdminPass123!', label: 'Admin' },
  analyst: { email: 'analyst@querytrust.local', pass: 'AnalystPass123!', label: 'Analyst' },
  viewer: { email: 'viewer@querytrust.local', pass: 'ViewerPass123!', label: 'Viewer' },
} as const

type DemoRoleKey = keyof typeof DEMO_ACCOUNTS

const ROLE_PERMISSIONS: Record<string, { title: string; rules: string[] }> = {
  admin: {
    title: 'Admin permissions (enforced by server API)',
    rules: [
      'Full role governance & user access management (GET/PUT /auth/users)',
      'Natural-language query generation, SQL AST preview & execution',
      'Trigger live Data health diagnostic runs and view anomaly telemetry',
      'Inspect safety benchmark regression proofs across all users',
      'Enforced read-only at database layer (SELECT-only connection pool)',
    ],
  },
  analyst: {
    title: 'Analyst permissions (enforced by server API)',
    rules: [
      'Natural-language query generation, SQL AST preview & execution',
      'Trigger live Data health diagnostic runs and explore anomalies',
      'View personal query audit history and submit feedback ratings',
      'Cannot modify users, manage roles, or access administrative endpoints',
      'Enforced read-only at database layer (SELECT-only connection pool)',
    ],
  },
  viewer: {
    title: 'Business User / Viewer permissions (enforced by server API)',
    rules: [
      'Ask governed natural-language questions in read-only isolation',
      'Read-only access to data catalog, schema explorer, and executive overview',
      'Inspect personal query history and interactive charts/tables',
      'Cannot modify users, manage roles, or run diagnostic scans',
      'Enforced read-only at database layer (SELECT-only connection pool)',
    ],
  },
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email && email.trim()) {
    const local = email.split('@')[0]
    return local.slice(0, 2).toUpperCase()
  }
  return 'QT'
}

function formatRole(role?: string): string {
  if (!role) return 'Viewer'
  const normalized = role.toLowerCase().trim()
  if (normalized === 'admin') return 'Admin'
  if (normalized === 'analyst') return 'Analyst'
  return 'Viewer'
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette, onOpenOnboarding }) => {
  const { user, login, logout } = useAuth()
  const { themePreference, mode, setThemePreference, toggleMode } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [switchingRole, setSwitchingRole] = useState<DemoRoleKey | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const commandShortcut = navigator.userAgent.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl K'

  const isDemoMode =
    import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.DEV ||
    import.meta.env.VITE_DEMO_MODE !== 'false'

  const isDemoUser = Boolean(user?.email?.endsWith('@querytrust.local'))

  const userRole = (user?.role || 'viewer').toLowerCase()
  const initials = getInitials(user?.display_name, user?.email)
  const roleDisplay = formatRole(user?.role)
  const roleQuestion =
    roleDisplay === 'Admin'
      ? 'What can an Admin do?'
      : roleDisplay === 'Analyst'
      ? 'What can an Analyst do?'
      : 'What can a Viewer do?'

  const permissionsData = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.viewer

  // Helper to query all focusable elements inside the dropdown
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!menuRef.current) return []
    return Array.from(
      menuRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    )
  }, [])

  // Close menu and return focus to trigger button
  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setShowPermissions(false)
    triggerRef.current?.focus()
  }, [])

  // Handle outside click & global escape
  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false)
        setShowPermissions(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen, closeMenu])

  // Focus trap & arrow key navigation inside open menu
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const focusable = getFocusableElements()
    if (!focusable.length) return

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (currentIndex <= 0) {
          e.preventDefault()
          focusable[focusable.length - 1].focus()
        }
      } else {
        if (currentIndex === -1 || currentIndex >= focusable.length - 1) {
          e.preventDefault()
          focusable[0].focus()
        }
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % focusable.length
      focusable[nextIndex].focus()
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex =
        currentIndex === -1 ? focusable.length - 1 : (currentIndex - 1 + focusable.length) % focusable.length
      focusable[prevIndex].focus()
      return
    }

    if (e.key === 'Home') {
      e.preventDefault()
      focusable[0].focus()
      return
    }

    if (e.key === 'End') {
      e.preventDefault()
      focusable[focusable.length - 1].focus()
      return
    }
  }

  // Focus first item when menu opens
  useEffect(() => {
    if (menuOpen) {
      requestAnimationFrame(() => {
        const focusable = getFocusableElements()
        if (focusable.length > 0) {
          focusable[0].focus()
        }
      })
    }
  }, [menuOpen, getFocusableElements])

  // Real demo role switch (Rule 8: true sign-out + real POST /auth/login)
  const handleSwitchDemoRole = async (targetRole: DemoRoleKey) => {
    if (userRole === targetRole || switchingRole) return
    setSwitchingRole(targetRole)
    try {
      await logout()
      const target = DEMO_ACCOUNTS[targetRole]
      await login(target.email, target.pass)
      setMenuOpen(false)
      setShowPermissions(false)
    } catch (err) {
      console.error('Failed to switch demo account:', err)
    } finally {
      setSwitchingRole(null)
    }
  }

  return (
    <header className="app-header">
      {/* Left: Ctrl+K search trigger */}
      <div className="header-left">
        <button
          type="button"
          className="command-trigger"
          onClick={onOpenCommandPalette}
          title={`Quick actions & search (${commandShortcut})`}
        >
          <Search size={14} aria-hidden="true" />
          <span>Search &amp; actions</span>
          <kbd aria-hidden="true">{commandShortcut}</kbd>
        </button>
      </div>

      {/* Center: Global Telemetry & Context Ribbon */}
      <div className="header-center" style={{ display: 'flex', alignItems: 'center' }}>
        <MetricsRibbon />
      </div>

      {/* Right: Demo data pill + Single Guide Button + User Menu */}
      <div className="header-right">
        {/* Workspace or Demo Indicator */}
        {isDemoUser ? (
          <div
            className="topbar-demo-pill"
            title="Synthetic educational data — no customer records or real network credentials"
          >
            <Database size={12} className="topbar-demo-icon" aria-hidden="true" />
            <span>Demo data</span>
          </div>
        ) : (
          <div
            className="topbar-workspace-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 20,
              background: 'rgba(255, 90, 20, 0.08)',
              border: '1px solid rgba(255, 90, 20, 0.25)',
              color: 'var(--qt-accent, #ff5a14)',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
            title={`Active Workspace: ${user?.workspace_name}`}
          >
            <Building size={12} aria-hidden="true" />
            <span>{user?.workspace_name}</span>
          </div>
        )}

        {/* Rule 4: ONE tour entry point in top bar ("Guide") */}
        {onOpenOnboarding && (
          <button
            type="button"
            className="btn btn-secondary btn-xs topbar-guide-btn"
            onClick={onOpenOnboarding}
            title="Product guide, role tour, and database preview"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            aria-label="Guide - product tour and help"
          >
            <Sparkles size={12} style={{ color: 'var(--qt-accent)' }} aria-hidden="true" />
            <span>Guide</span>
          </button>
        )}

        {/* User Profile Menu */}
        <div className="user-profile-container">
          <button
            ref={triggerRef}
            id="user-menu-button"
            type="button"
            className="user-profile-button"
            onClick={() => setMenuOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault()
                setMenuOpen(true)
              }
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="user-menu-dropdown"
            aria-label={`${user?.display_name || 'User'} profile menu`}
          >
            {/* Rule 1: Colored circle with initials (no blank square) */}
            <div
              className={`user-avatar-circle avatar-role-${userRole}`}
              aria-hidden="true"
              title={user?.display_name || 'User'}
            >
              {initials}
            </div>

            {/* Rule 2: Show user name and workspace */}
            <div className="user-info-text">
              <span className="user-name">{user?.display_name || 'User'}</span>
              {user?.workspace_name && (
                <span className="user-workspace-badge" style={{ fontSize: '0.6875rem', color: 'var(--qt-muted)', display: 'block', lineHeight: 1.2 }}>
                  {user.workspace_name}
                </span>
              )}
            </div>

            <ChevronDown
              size={13}
              className={`topbar-chevron ${menuOpen ? 'topbar-chevron--open' : ''}`}
              aria-hidden="true"
            />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              id="user-menu-dropdown"
              className="user-dropdown-menu"
              role="menu"
              aria-labelledby="user-menu-button"
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
            >
              {/* Header: Avatar, Name, Sentence-case Role Pill, Email in normal font */}
              <div className="dropdown-user-header">
                <div className="dropdown-user-header-left">
                  <div
                    className={`user-avatar-circle user-avatar-circle--lg avatar-role-${userRole}`}
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div className="dropdown-user-header-info">
                    <div className="dropdown-user-name-row">
                      <span className="dropdown-name">{user?.display_name || 'User'}</span>
                      {/* Rule 2: Single sentence-case role pill */}
                      <span className={`role-pill role-pill--${userRole}`}>{roleDisplay}</span>
                    </div>
                    {/* Rule 2: Normal font for email */}
                    <p className="dropdown-email">{user?.email}</p>
                    {user?.workspace_name && (
                      <p className="dropdown-workspace" style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--qt-primary)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        <Building size={12} />
                        <span>{user.workspace_name}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rule 3: Replace static server line with dynamic "What can a [Role] do?" */}
              <div className="dropdown-role-explainer-section">
                <button
                  type="button"
                  className="dropdown-role-explainer-trigger"
                  onClick={() => setShowPermissions((prev) => !prev)}
                  aria-expanded={showPermissions}
                  title={`Inspect API rules & capabilities for ${roleDisplay}`}
                >
                  <Shield size={13} className="explainer-shield-icon" aria-hidden="true" />
                  <span className="explainer-trigger-text">{roleQuestion}</span>
                  <ChevronDown
                    size={12}
                    className={`explainer-chevron ${showPermissions ? 'explainer-chevron--open' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {showPermissions && (
                  <div
                    className="dropdown-permissions-panel"
                    role="region"
                    aria-label={`${roleDisplay} permissions summary`}
                  >
                    <div className="dropdown-permissions-title">{permissionsData.title}:</div>
                    <ul className="dropdown-permissions-list">
                      {permissionsData.rules.map((rule, idx) => (
                        <li key={idx} className="dropdown-permission-item">
                          <Check size={11} className="perm-check-icon" aria-hidden="true" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="dropdown-divider" />

              {/* View Mode switcher with Rule 5 hint */}
              <div className="dropdown-menu-section">
                <div className="dropdown-menu-row">
                  <div className="dropdown-menu-row-label">
                    <Eye size={13} aria-hidden="true" />
                    <span>View mode</span>
                  </div>
                  <div className="menu-segmented-toggle" role="group" aria-label="View mode">
                    <button
                      type="button"
                      className={`menu-toggle-btn ${mode === 'simple' ? 'active' : ''}`}
                      onClick={() => {
                        if (mode !== 'simple') toggleMode()
                      }}
                      title="Simple mode: friendly English, hides raw SQL"
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      className={`menu-toggle-btn ${mode === 'expert' ? 'active' : ''}`}
                      onClick={() => {
                        if (mode !== 'expert') toggleMode()
                      }}
                      title="Expert mode: shows SQL AST and execution telemetry"
                    >
                      <Code2 size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} aria-hidden="true" />
                      Expert
                    </button>
                  </div>
                </div>
                {/* Rule 5: One-line hint under View mode */}
                <p className="menu-mode-hint">Simple hides SQL and technical details.</p>
              </div>

              {/* Rule 6: Theme with Light / Dark / System */}
              <div className="dropdown-menu-section" style={{ marginTop: '0.65rem' }}>
                <div className="dropdown-menu-row">
                  <div className="dropdown-menu-row-label">
                    {themePreference === 'dark' ? (
                      <Moon size={13} aria-hidden="true" />
                    ) : themePreference === 'light' ? (
                      <Sun size={13} aria-hidden="true" />
                    ) : (
                      <Monitor size={13} aria-hidden="true" />
                    )}
                    <span>Theme</span>
                  </div>
                  <div className="menu-segmented-toggle" role="group" aria-label="Theme mode preference">
                    <button
                      type="button"
                      className={`menu-toggle-btn ${themePreference === 'light' ? 'active' : ''}`}
                      onClick={() => setThemePreference('light')}
                      title="Light theme"
                    >
                      <Sun size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} aria-hidden="true" />
                      Light
                    </button>
                    <button
                      type="button"
                      className={`menu-toggle-btn ${themePreference === 'dark' ? 'active' : ''}`}
                      onClick={() => setThemePreference('dark')}
                      title="Dark theme"
                    >
                      <Moon size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} aria-hidden="true" />
                      Dark
                    </button>
                    <button
                      type="button"
                      className={`menu-toggle-btn ${themePreference === 'system' ? 'active' : ''}`}
                      onClick={() => setThemePreference('system')}
                      title="Follow system / device theme preference"
                    >
                      <Monitor size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} aria-hidden="true" />
                      System
                    </button>
                  </div>
                </div>
              </div>

              {/* Switch Demo Role (only for demo sandbox accounts) or Enterprise Governance Card */}
              {isDemoMode && isDemoUser ? (
                <>
                  <div className="dropdown-divider" />
                  <div className="dropdown-menu-section">
                    <div className="dropdown-section-title">
                      <UserCheck size={12} className="text-secondary" aria-hidden="true" />
                      <span>Switch demo sandbox role</span>
                    </div>
                    <div className="demo-role-switcher" role="group" aria-label="Switch demo account">
                      {(['admin', 'analyst', 'viewer'] as DemoRoleKey[]).map((roleKey) => {
                        const isCurrent = userRole === roleKey
                        const isThisSwitching = switchingRole === roleKey
                        return (
                          <button
                            key={roleKey}
                            type="button"
                            className={`demo-role-btn ${isCurrent ? 'demo-role-btn--active' : ''}`}
                            disabled={isCurrent || !!switchingRole}
                            onClick={() => handleSwitchDemoRole(roleKey)}
                            title={`Switch to demo ${DEMO_ACCOUNTS[roleKey].label} account (${DEMO_ACCOUNTS[roleKey].email})`}
                          >
                            {isThisSwitching ? (
                              <Loader2 size={11} className="spin-icon" aria-hidden="true" />
                            ) : (
                              DEMO_ACCOUNTS[roleKey].label
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="dropdown-divider" />
                  <div className="dropdown-enterprise-governance">
                    <div className="enterprise-governance-header">
                      <Building size={13} className="enterprise-governance-icon" aria-hidden="true" />
                      <span className="enterprise-governance-title">Enterprise Organization Member</span>
                    </div>
                    <div className="enterprise-governance-body">
                      <p className="enterprise-governance-note">
                        Role privileges ({roleDisplay}) are cryptographically governed by{' '}
                        <strong className="enterprise-governance-ws">
                          {user?.workspace_name || 'Organization'}
                        </strong>{' '}
                        policies.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="dropdown-divider" />

              {/* Rule 7: Neutral Sign out button with red tint only on hover/focus */}
              <button
                type="button"
                className="dropdown-logout-btn"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                title="Sign out of QueryTrust AI"
              >
                <LogOut size={13} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
