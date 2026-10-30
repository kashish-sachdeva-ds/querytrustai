import React, { useState, useRef, useEffect } from 'react'
import {
  LogOut,
  Shield,
  ChevronDown,
  Sun,
  Moon,
  Check,
  Loader2,
  Search,
  Building2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import type { ActiveTab } from './Sidebar'
import { RoiBenchmarkModal } from './RoiBenchmarkModal'
import './LinearShell.css'

interface HeaderProps {
  activeTab?: ActiveTab
  onNavigate?: (tab: ActiveTab) => void
  onOpenCommandPalette?: () => void
  onOpenOnboarding?: () => void
}

const DEMO_ACCOUNTS = {
  admin: { email: 'admin@querytrust.local', pass: 'AdminPass123!', label: 'Admin', badgeClass: 'role-admin' },
  analyst: { email: 'analyst@querytrust.local', pass: 'AnalystPass123!', label: 'Analyst', badgeClass: 'role-analyst' },
  viewer: { email: 'viewer@querytrust.local', pass: 'ViewerPass123!', label: 'Viewer', badgeClass: 'role-viewer' },
} as const

type DemoRoleKey = keyof typeof DEMO_ACCOUNTS

const ROLE_PERMISSIONS: Record<string, { title: string; rules: string[] }> = {
  admin: {
    title: 'System Admin Capabilities (Full Governance & DDL Prohibited)',
    rules: [
      'Full natural-language query generation & SQLGlot AST inspection',
      'Raw SQL Editor visibility & parameter explain execution',
      'Data sources configuration & PostgreSQL role privilege verification',
      'Automated safety regression benchmark suite execution (37/37 cases)',
      'People & RBAC user access control management',
      'Enforced strictly read-only at database kernel level (0 WRITE perms)',
    ],
  },
  analyst: {
    title: 'Lead Data Analyst Capabilities (NL-to-SQL & Schema Verification)',
    rules: [
      'Natural-language query generation with 6-layer AST validation',
      'SQL preview and schema context introspection',
      'Execute read-only queries with bounded row limits (LIMIT <= 500)',
      'Trigger Data health diagnostic scans & anomaly threshold adjustments',
      'Query audit history review & CSV/JSON data export',
      'Enforced strictly read-only at database kernel level (0 WRITE perms)',
    ],
  },
  viewer: {
    title: 'Operations Viewer Capabilities (Governed Answers & Charts Only)',
    rules: [
      'Natural-language query asking with full zero-trust guardrails',
      'Direct plain-English answers, summary KPIs, and visual charts',
      'Raw SQL and AST compiler internals masked for streamlined review',
      'Equipment inventory exploration with zero data mutation risk',
      'Enforced strictly read-only at database kernel level (0 WRITE perms)',
    ],
  },
}

const TAB_LABELS: Record<string, string> = {
  overview: 'Fleet Overview',
  devices: 'Data Catalog',
  'ask-data': 'Query Studio',
  'data-sources': 'Sources & Kernel',
  'data-quality': 'Data Health',
  anomalies: 'Anomalies',
  history: 'Audit History',
  evaluations: 'AST Safety Proof',
  admin: 'People & Access',
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
  onOpenCommandPalette,
  onOpenOnboarding,
}) => {
  const { user, login, logout, enterDemoMode } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [profileOpen, setProfileOpen] = useState(false)
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false)
  const [roiModalOpen, setRoiModalOpen] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [switchingRole, setSwitchingRole] = useState<DemoRoleKey | null>(null)

  const profileTriggerRef = useRef<HTMLButtonElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const roleTriggerRef = useRef<HTMLButtonElement>(null)
  const roleMenuRef = useRef<HTMLDivElement>(null)

  const userRole = (user?.role || 'viewer').toLowerCase()
  const initials = getInitials(user?.display_name, user?.email)
  const roleDisplay = formatRole(user?.role)
  const permissionsData = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.viewer

  // Handle outside click & global escape for profile & role menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target) &&
        profileTriggerRef.current &&
        !profileTriggerRef.current.contains(target)
      ) {
        setProfileOpen(false)
        setShowPermissions(false)
      }
      if (
        roleMenuRef.current &&
        !roleMenuRef.current.contains(target) &&
        roleTriggerRef.current &&
        !roleTriggerRef.current.contains(target)
      ) {
        setRoleSwitcherOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setRoleSwitcherOpen(false)
        setRoiModalOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Fast demo role switch with zero-wait fallback
  const handleSwitchDemoRole = async (targetRole: DemoRoleKey) => {
    if (userRole === targetRole || switchingRole) return
    setSwitchingRole(targetRole)
    try {
      await logout()
      const target = DEMO_ACCOUNTS[targetRole]
      await login(target.email, target.pass)
      setRoleSwitcherOpen(false)
      setProfileOpen(false)
    } catch (err) {
      console.warn('Backend login unavailable for demo switch, using offline sandbox:', err)
      enterDemoMode(targetRole)
      setRoleSwitcherOpen(false)
      setProfileOpen(false)
    } finally {
      setSwitchingRole(null)
    }
  }

  return (
    <>
      <header
        className="app-top-navbar"
        role="banner"
        aria-label="Top Navigation Bar"
        style={{
          height: '52px',
          minHeight: '52px',
          maxHeight: '52px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card)',
          padding: '0 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          zIndex: 30,
        }}
      >
        {/* ─── Left Side: Workspace Breadcrumb ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontFamily: 'var(--font-sans)',
            }}
            aria-label="Breadcrumb navigation"
          >
            <span style={{ fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              QueryTrust
            </span>
            <span style={{ color: 'var(--text-subtle)' }}>/</span>
            <button
              type="button"
              onClick={() => onNavigate?.('overview')}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 120ms ease',
              }}
              title="Workspace scope: Click to return to fleet overview"
            >
              <Building2 size={11} style={{ color: 'var(--text-subtle)' }} />
              <span>{user?.workspace_name || 'Workspace'}</span>
            </button>
            <span style={{ color: 'var(--text-subtle)' }}>/</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '12px' }}>
              {activeTab ? TAB_LABELS[activeTab] || activeTab : 'Fleet Overview'}
            </span>
          </nav>
        </div>

        {/* ─── Center: ⌘K Global Command Palette Trigger ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: '340px', margin: '0 auto' }}>
          <button
            type="button"
            onClick={onOpenCommandPalette}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: '32px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0 10px',
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            title="Press ⌘K or Ctrl+K to open global command palette"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={12} style={{ color: 'var(--text-subtle)' }} />
              <span>Ask data or search actions...</span>
            </span>
            <kbd
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-subtle)',
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ─── Right Side: Single Status Pill + Controls ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Single Consolidated Status Pill */}
          <button
            type="button"
            onClick={() => setRoiModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '4px 10px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            title="Kernel Status: 6/6 AST Gates Enforced • Dedicated SELECT-Only Replica • Click for Metrics"
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--gov-safe-dot)',
                boxShadow: '0 0 0 2px var(--gov-safe-bg)',
              }}
            />
            <span style={{ fontWeight: 600 }}>Kernel Read-Only</span>
            <span style={{ color: 'var(--text-subtle)' }}>&bull;</span>
            <span style={{ color: 'var(--text-muted)' }}>1.4ms</span>
          </button>

          {/* Instant 1-Click Role Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              ref={roleTriggerRef}
              type="button"
              onClick={() => setRoleSwitcherOpen((prev) => !prev)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor:
                  userRole === 'admin'
                    ? 'var(--role-admin-bg)'
                    : userRole === 'analyst'
                    ? 'var(--role-analyst-bg)'
                    : 'var(--role-viewer-bg)',
                color:
                  userRole === 'admin'
                    ? 'var(--role-admin-text)'
                    : userRole === 'analyst'
                    ? 'var(--role-analyst-text)'
                    : 'var(--role-viewer-text)',
                border: `1px solid ${
                  userRole === 'admin'
                    ? 'var(--role-admin-border)'
                    : userRole === 'analyst'
                    ? 'var(--role-analyst-border)'
                    : 'var(--role-viewer-border)'
                }`,
                borderRadius: '6px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              title="Click to instantaneously switch evaluation persona (Admin, Analyst, Viewer)"
              aria-label={`Current role: ${roleDisplay}. Click to switch role`}
              aria-expanded={roleSwitcherOpen}
            >
              <span>Demo: {roleDisplay.toUpperCase()}</span>
              {switchingRole ? (
                <Loader2 size={11} className="spin-icon" />
              ) : (
                <ChevronDown
                  size={11}
                  style={{
                    transform: roleSwitcherOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 120ms ease',
                  }}
                />
              )}
            </button>

            {/* Role Switcher Menu */}
            {roleSwitcherOpen && (
              <div
                ref={roleMenuRef}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  width: '260px',
                  backgroundColor: 'var(--bg-surface-1)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.2)',
                  padding: '6px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    padding: '4px 8px 6px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--ink-muted)',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: '4px',
                  }}
                >
                  Switch Evaluator Role (1-Click)
                </div>

                {(Object.keys(DEMO_ACCOUNTS) as DemoRoleKey[]).map((rKey) => {
                  const target = DEMO_ACCOUNTS[rKey]
                  const isActive = userRole === rKey
                  return (
                    <button
                      key={rKey}
                      type="button"
                      onClick={() => handleSwitchDemoRole(rKey)}
                      disabled={switchingRole !== null}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isActive ? 'var(--bg-surface-3)' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'background-color 100ms ease',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          marginTop: '5px',
                          backgroundColor:
                            rKey === 'admin'
                              ? '#9333ea'
                              : rKey === 'analyst'
                              ? '#2563eb'
                              : '#0d9488',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)' }}>
                            {target.label}
                          </span>
                          {isActive && <Check size={12} style={{ color: 'var(--accent-primary)' }} />}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>
                          {rKey === 'admin'
                            ? 'Full SQL, AST lab, users & benchmarks'
                            : rKey === 'analyst'
                            ? 'NL-to-SQL workbench & read-only execution'
                            : 'Answers & charts only (Raw SQL hidden)'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Theme Toggle (Light / Dark Mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 120ms ease',
            }}
            title={`Switch to ${theme === 'light' ? 'Obsidian Carbon Dark' : 'Warm Stone Light'} theme`}
            aria-label="Toggle visual theme"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* User Profile Avatar / Menu Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              ref={profileTriggerRef}
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
                color: 'var(--ink-primary)',
              }}
              aria-label="User account menu"
              aria-expanded={profileOpen}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--accent-primary-subtle)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  border: '1px solid var(--accent-primary-border)',
                }}
              >
                {initials}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                {user?.display_name || 'User'}
              </span>
              <ChevronDown
                size={11}
                style={{
                  color: 'var(--ink-muted)',
                  transform: profileOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 120ms ease',
                }}
              />
            </button>

            {/* Profile Popover Card */}
            {profileOpen && (
              <div
                ref={profileMenuRef}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  width: '300px',
                  backgroundColor: 'var(--bg-surface-1)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  boxShadow: '0 16px 36px -6px rgba(0, 0, 0, 0.25)',
                  padding: '12px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* User Identity Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-primary-subtle)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: '1px solid var(--accent-primary-border)',
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                        {user?.display_name || 'User'}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-surface-2)',
                          color: 'var(--accent-primary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {roleDisplay}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.email}
                    </div>
                  </div>
                </div>

                {/* Role Permissions Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPermissions((prev) => !prev)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--ink-secondary)',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={12} style={{ color: 'var(--gov-safe-dot)' }} />
                      <span>What can a {roleDisplay} do?</span>
                    </div>
                    <ChevronDown
                      size={12}
                      style={{
                        transform: showPermissions ? 'rotate(180deg)' : 'none',
                        transition: 'transform 120ms ease',
                      }}
                    />
                  </button>

                  {showPermissions && (
                    <div
                      style={{
                        marginTop: '6px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface-3)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        lineHeight: 1.5,
                        color: 'var(--ink-secondary)',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                        {permissionsData.title}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '14px' }}>
                        {permissionsData.rules.map((rule, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {onOpenOnboarding && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        onOpenOnboarding()
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--ink-muted)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Welcome Tour
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false)
                      await logout()
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--gov-block-text)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    <LogOut size={12} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ROI & Benchmark Telemetry Modal */}
      <RoiBenchmarkModal
        isOpen={roiModalOpen}
        onClose={() => setRoiModalOpen(false)}
        onNavigateToProof={() => {
          onNavigate?.('evaluations')
        }}
      />
    </>
  )
}
