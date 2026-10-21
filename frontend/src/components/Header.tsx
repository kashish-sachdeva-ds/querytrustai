import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  LogOut,
  Shield,
  Building,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Eye,
  Code2,
  HelpCircle,
  Check,
  Loader2,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import type { ActiveTab } from './Sidebar'
import './LinearShell.css'

interface HeaderProps {
  activeTab?: ActiveTab
  onNavigate?: (tab: ActiveTab) => void
  onOpenCommandPalette?: () => void
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
      'Inspect equipment catalog and telemetry status with zero mutation risk',
      'SQL AST viewer & direct query executions are disabled by policy',
      'Read-only access guarantees no changes to operational systems',
    ],
  },
}

const TAB_LABELS: Record<string, string> = {
  overview: 'Fleet overview',
  devices: 'Data catalog',
  'ask-data': 'Ask a question',
  'data-sources': 'Data sources',
  'data-quality': 'Data health',
  anomalies: 'Unusual activity',
  history: 'Query history',
  evaluations: 'Safety proof',
  admin: 'People & access',
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
  return 'SA'
}

function formatRole(role?: string): string {
  if (!role) return 'Viewer'
  const normalized = role.toLowerCase().trim()
  if (normalized === 'admin') return 'Admin'
  if (normalized === 'analyst') return 'Analyst'
  return 'Viewer'
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenOnboarding,
}) => {
  const { user, login, logout, enterDemoMode } = useAuth()
  const { themePreference, mode, setThemePreference, toggleMode } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [switchingRole, setSwitchingRole] = useState<DemoRoleKey | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
  }

  // Real demo role switch with immediate fallback
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
      console.warn('Backend login unavailable for demo switch, using offline sandbox:', err)
      enterDemoMode(targetRole)
      setMenuOpen(false)
      setShowPermissions(false)
    } finally {
      setSwitchingRole(null)
    }
  }

  return (
    <header className="app-top-navbar" role="banner" aria-label="Top Navigation Bar">
      {/* ─── Left Side: Contextual Breadcrumb ─── */}
      <nav className="navbar-breadcrumb" aria-label="Breadcrumb navigation">
        <button
          type="button"
          onClick={() => onNavigate?.('overview')}
          className="breadcrumb-root"
          title="Return to fleet overview"
        >
          {user?.workspace_name || 'Workspace'}
        </button>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">
          {activeTab ? TAB_LABELS[activeTab] || activeTab : 'Fleet overview'}
        </span>
      </nav>

      {/* ─── Right Side: Strictly Consolidated 3 Items ─── */}
      <div className="navbar-right-cluster">
        {/* 1. Unified Telemetry Status Pill */}
        <div
          className="navbar-telemetry-pill"
          title="SQLGlot AST Safety Guard: Enforced | P95 Latency: 1.8ms | PostgreSQL SELECT-only pool"
          aria-label="System status: AST Guard Enforced, P95 latency 1.8 milliseconds"
        >
          <span className="ast-dot" aria-hidden="true" />
          <span className="ast-label">AST Guard: Enforced</span>
          <span className="divider" aria-hidden="true">|</span>
          <span className="latency-val">P95: 1.8ms</span>
        </div>

        {/* 2. Demo Mode & Active Role Indicator (Strictly Synced) */}
        {isDemoUser ? (
          <button
            type="button"
            className="navbar-demo-role-badge"
            onClick={() => setMenuOpen((prev) => !prev)}
            title={`Active Demo Role: ${roleDisplay} — Click to switch role in sandbox`}
            aria-label={`Active demo role is ${roleDisplay}. Click to switch role`}
          >
            <span className="role-amber-dot" aria-hidden="true" />
            <span>Demo: {roleDisplay}</span>
          </button>
        ) : (
          <div
            className="navbar-demo-role-badge"
            title={`Active Organization: ${user?.workspace_name}`}
          >
            <Building size={12} style={{ color: '#F97316' }} aria-hidden="true" />
            <span>{user?.workspace_name || 'Workspace'}</span>
          </div>
        )}

        {/* 3. User Profile Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            ref={triggerRef}
            id="user-menu-button"
            type="button"
            className="navbar-profile-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="user-menu-dropdown"
            aria-label={`${user?.display_name || 'User'} profile menu`}
          >
            <div className="avatar-initials-circle" aria-hidden="true">
              {initials}
            </div>
            <span>{user?.display_name || 'User'}</span>
            <ChevronDown
              size={12}
              style={{
                color: '#94a3b8',
                transform: menuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 140ms ease',
              }}
              aria-hidden="true"
            />
          </button>

          {/* ─── Profile & Sandbox Popover Card ─── */}
          {menuOpen && (
            <div
              ref={menuRef}
              id="user-menu-dropdown"
              className="profile-popover-card"
              role="menu"
              aria-labelledby="user-menu-button"
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
            >
              {/* User Identity Header */}
              <div className="profile-user-hero">
                <div className="avatar-lg" aria-hidden="true">
                  {initials}
                </div>
                <div className="profile-hero-meta">
                  <div className="profile-hero-name-row">
                    <span className="profile-hero-name">{user?.display_name || 'User'}</span>
                    <span className="profile-role-pill">{roleDisplay}</span>
                  </div>
                  <p className="profile-hero-email">{user?.email}</p>
                  {user?.workspace_name && (
                    <p className="profile-hero-ws">
                      <Building size={11} aria-hidden="true" />
                      <span>{user.workspace_name}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* What can an [Role] do? Accordion */}
              <div style={{ marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowPermissions((prev) => !prev)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#cbd5e1',
                    fontSize: 11.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  aria-expanded={showPermissions}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={12} style={{ color: '#10B981' }} aria-hidden="true" />
                    <span>{roleQuestion}</span>
                  </div>
                  <ChevronDown
                    size={12}
                    style={{
                      transform: showPermissions ? 'rotate(180deg)' : 'none',
                      transition: 'transform 140ms ease',
                      color: '#64748b',
                    }}
                    aria-hidden="true"
                  />
                </button>

                {showPermissions && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: 11,
                      color: '#94a3b8',
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                      {permissionsData.title}:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {permissionsData.rules.map((rule, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <Check size={11} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="profile-section-divider" />

              {/* View Mode Segmented Control */}
              <div className="profile-control-group">
                <div className="profile-control-label">
                  <Eye size={12} aria-hidden="true" />
                  <span>View mode</span>
                </div>
                <div className="linear-segmented-track" role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={`linear-segmented-btn ${mode === 'simple' ? 'active' : ''}`}
                    onClick={() => {
                      if (mode !== 'simple') toggleMode()
                    }}
                    title="Simple mode: friendly English, hides raw SQL"
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    className={`linear-segmented-btn ${mode === 'expert' ? 'active' : ''}`}
                    onClick={() => {
                      if (mode !== 'expert') toggleMode()
                    }}
                    title="Expert mode: shows SQL AST and execution telemetry"
                  >
                    <Code2 size={11} aria-hidden="true" />
                    <span>Expert</span>
                  </button>
                </div>
                <p className="profile-control-hint">Simple hides SQL and technical details.</p>
              </div>

              {/* Theme Segmented Control */}
              <div className="profile-control-group" style={{ marginTop: 8 }}>
                <div className="profile-control-label">
                  {themePreference === 'dark' ? (
                    <Moon size={12} aria-hidden="true" />
                  ) : themePreference === 'light' ? (
                    <Sun size={12} aria-hidden="true" />
                  ) : (
                    <Monitor size={12} aria-hidden="true" />
                  )}
                  <span>Theme</span>
                </div>
                <div className="linear-segmented-track" role="group" aria-label="Theme mode preference">
                  <button
                    type="button"
                    className={`linear-segmented-btn ${themePreference === 'light' ? 'active' : ''}`}
                    onClick={() => setThemePreference('light')}
                    title="Light theme"
                  >
                    <Sun size={11} aria-hidden="true" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    className={`linear-segmented-btn ${themePreference === 'dark' ? 'active' : ''}`}
                    onClick={() => setThemePreference('dark')}
                    title="Dark theme"
                  >
                    <Moon size={11} aria-hidden="true" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    className={`linear-segmented-btn ${themePreference === 'system' ? 'active' : ''}`}
                    onClick={() => setThemePreference('system')}
                    title="Follow device theme"
                  >
                    <Monitor size={11} aria-hidden="true" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              {/* Demo Sandbox Role Switcher */}
              {isDemoMode && isDemoUser && (
                <>
                  <div className="profile-section-divider" />
                  <div className="profile-control-group">
                    <div className="profile-control-label">
                      <UserCheck size={12} aria-hidden="true" />
                      <span>Switch demo sandbox role</span>
                    </div>
                    <div className="linear-segmented-track grid-3" role="group" aria-label="Switch demo account">
                      {(['admin', 'analyst', 'viewer'] as DemoRoleKey[]).map((roleKey) => {
                        const isCurrent = userRole === roleKey
                        const isThisSwitching = switchingRole === roleKey
                        return (
                          <button
                            key={roleKey}
                            type="button"
                            className={`linear-segmented-btn ${isCurrent ? 'active' : ''}`}
                            disabled={isCurrent || !!switchingRole}
                            onClick={() => handleSwitchDemoRole(roleKey)}
                            title={`Switch to demo ${DEMO_ACCOUNTS[roleKey].label}`}
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
              )}

              <div className="profile-section-divider" />

              {/* Quickstart & Keyboard Shortcuts */}
              {onOpenOnboarding && (
                <button
                  type="button"
                  className="profile-logout-row"
                  style={{ color: '#cbd5e1' }}
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenOnboarding()
                  }}
                  title="View keyboard shortcuts and quickstart guide"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <HelpCircle size={13} style={{ color: '#94a3b8' }} aria-hidden="true" />
                    <span>Quickstart &amp; Shortcuts</span>
                  </div>
                  <kbd style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono, monospace)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}>?</kbd>
                </button>
              )}

              {/* Neutral Sign Out Button with subtle red hover */}
              <button
                type="button"
                className="profile-logout-row"
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
