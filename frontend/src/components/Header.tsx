import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  LogOut,
  Shield,
  ChevronDown,
  Sun,
  Moon,
  Check,
  Loader2,
  Menu,
  Search,
  Sparkles,
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
  admin: { email: 'admin@querytrust.local', pass: 'AdminPass123!', label: 'Admin', desc: 'Full SQL, AST lab, users & benchmarks' },
  analyst: { email: 'analyst@querytrust.local', pass: 'AnalystPass123!', label: 'Analyst', desc: 'NL-to-SQL workbench & read-only execution' },
  viewer: { email: 'viewer@querytrust.local', pass: 'ViewerPass123!', label: 'Viewer', desc: 'Answers & charts only (Raw SQL hidden)' },
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

const TAB_CATEGORIES: Record<string, string> = {
  overview: 'Workspace',
  devices: 'Workspace',
  'ask-data': 'Workspace',
  'data-quality': 'Data Health',
  anomalies: 'Data Health',
  evaluations: 'Governance',
  'data-sources': 'Governance',
  admin: 'Governance',
  history: 'Audit',
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

const popoverVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.12 },
  },
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenCommandPalette,
  onOpenOnboarding,
}) => {
  const { user, logout, enterDemoMode } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [switchingRole, setSwitchingRole] = useState<string | null>(null)
  const [roiModalOpen, setRoiModalOpen] = useState(false)

  const roleTriggerRef = useRef<HTMLButtonElement>(null)
  const roleMenuRef = useRef<HTMLDivElement>(null)
  const profileTriggerRef = useRef<HTMLButtonElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const userRole = (user?.role || 'admin').toLowerCase()
  const roleDisplay = userRole === 'admin' ? 'Admin' : userRole === 'analyst' ? 'Analyst' : 'Viewer'
  const initials = getInitials(user?.display_name, user?.email)

  const permissionsData = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.admin

  // Handle outside click & global escape for profile & role menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        roleMenuRef.current &&
        !roleMenuRef.current.contains(target) &&
        roleTriggerRef.current &&
        !roleTriggerRef.current.contains(target)
      ) {
        setRoleSwitcherOpen(false)
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target) &&
        profileTriggerRef.current &&
        !profileTriggerRef.current.contains(target)
      ) {
        setProfileOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRoleSwitcherOpen(false)
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSwitchDemoRole = async (targetRole: DemoRoleKey) => {
    try {
      setSwitchingRole(targetRole)
      enterDemoMode(targetRole)
      setRoleSwitcherOpen(false)
    } finally {
      setSwitchingRole(null)
    }
  }

  return (
    <>
      <header
        className="app-top-navbar relative h-12 min-h-[48px] max-h-[48px] border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 backdrop-blur-md px-3.5 sm:px-4 flex items-center justify-between gap-3 z-30 flex-shrink-0 transition-colors"
        role="banner"
        aria-label="Top Navigation Bar"
        style={{
          boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--color-accent-contrast) 6%, transparent)',
        }}
      >
        {/* Subtle top radial accent sheen */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{
            background:
              'radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--color-accent) 9%, transparent), transparent 72%)',
          }}
        />

        {/* ─── Left Side: Mobile Menu + Architectural Breadcrumbs ─── */}
        <div className="relative z-10 flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('querytrust:toggle-mobile-sidebar'))}
            className="flex md:hidden w-8 h-8 rounded-[9px] items-center justify-center bg-[var(--color-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer flex-shrink-0"
            aria-label="Open navigation menu"
            title="Navigation menu"
          >
            <Menu size={15} />
          </button>
          <nav
            className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0"
            aria-label="Breadcrumb navigation"
          >
            <button
              type="button"
              onClick={() => onNavigate?.('overview')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)] transition-colors cursor-pointer flex-shrink-0"
              title="Back to Fleet Overview"
            >
              <span>{activeTab ? TAB_CATEGORIES[activeTab] || 'Workspace' : 'Workspace'}</span>
            </button>
            <span className="hidden sm:inline text-[var(--color-text-muted)] font-normal select-none">/</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-raised)]/80 border border-[var(--color-border-subtle)] font-semibold text-xs text-[var(--color-text-primary)] tracking-tight truncate">
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] flex-shrink-0"
              />
              <span className="truncate">{activeTab ? TAB_LABELS[activeTab] || activeTab : 'Fleet Overview'}</span>
            </span>
          </nav>
        </div>

        {/* ─── Center: ⌘K Command Palette Trigger (Desktop) ─── */}
        <div className="relative z-10 hidden md:flex items-center justify-center flex-1 max-w-[330px] mx-2 min-w-0">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="group flex items-center justify-between w-full h-8 px-3 rounded-[9px] bg-[var(--color-raised)]/85 border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-border)] hover:bg-[var(--color-raised)] text-xs text-[var(--color-text-secondary)] transition-all cursor-pointer min-w-0"
            style={{
              boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--color-text-primary) 4%, transparent)',
            }}
            title="Press ⌘K or Ctrl+K to open global command palette"
          >
            <span className="flex items-center gap-2 min-w-0 truncate">
              <Search size={13} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-link)] transition-colors flex-shrink-0" />
              <span className="text-[11.5px] truncate whitespace-nowrap text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                Search tables, queries, or commands…
              </span>
            </span>
            <kbd
              className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-[5px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0 ml-2"
              style={{
                boxShadow: '0 1px 0 var(--color-border-subtle)',
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ─── Right Side: Precision Toolbar Controls ─── */}
        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Quick search icon trigger for compact viewports */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex md:hidden w-8 h-8 rounded-[9px] items-center justify-center bg-[var(--color-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all cursor-pointer"
            title="Open search (⌘K)"
            aria-label="Open search command palette"
          >
            <Search size={13} />
          </button>

          {/* Security Integrity Telemetry Chip */}
          <button
            type="button"
            onClick={() => setRoiModalOpen(true)}
            className="hidden lg:inline-flex items-center gap-2 h-8 px-2.5 rounded-[9px] text-[11px] font-mono transition-all cursor-pointer hover:brightness-105"
            style={{
              backgroundColor: 'var(--color-status-success-bg)',
              color: 'var(--color-status-success-text)',
              border: '1px solid color-mix(in srgb, var(--color-status-success-dot) 24%, transparent)',
            }}
            title="Kernel Status: 6/6 AST Gates Enforced · Dedicated SELECT-Only Replica · Click for details"
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-status-success-dot)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-status-success-dot)]" />
            </span>
            <span className="font-semibold tracking-tight">Read-Only</span>
            <span className="opacity-45">·</span>
            <span className="opacity-90">1.4 ms P95</span>
          </button>

          <span
            aria-hidden="true"
            className="hidden lg:block h-4 w-px bg-[var(--color-border-subtle)] mx-0.5 flex-shrink-0"
          />

          {/* Instant 1-Click Role Switcher Dropdown */}
          <div className="relative">
            <button
              ref={roleTriggerRef}
              type="button"
              onClick={() => setRoleSwitcherOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[9px] text-xs font-medium transition-all cursor-pointer bg-[var(--color-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
              style={{
                boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--color-accent-contrast) 6%, transparent)',
              }}
              title="Click to switch evaluation persona (Admin, Analyst, Viewer)"
              aria-label={`Current role: ${roleDisplay}. Click to switch role`}
              aria-expanded={roleSwitcherOpen}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  userRole === 'admin'
                    ? 'bg-[var(--color-accent)]'
                    : userRole === 'analyst'
                    ? 'bg-[var(--color-status-success-dot)]'
                    : 'bg-[var(--color-text-muted)]'
                }`}
              />
              <span>{roleDisplay}</span>
              {switchingRole ? (
                <Loader2 size={11} className="animate-spin text-[var(--color-accent-link)]" />
              ) : (
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-150 text-[var(--color-text-muted)] ${roleSwitcherOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Role Switcher Menu */}
            <AnimatePresence>
              {roleSwitcherOpen && (
                <motion.div
                  ref={roleMenuRef}
                  variants={popoverVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-[calc(100%+8px)] right-0 w-72 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-2 text-[var(--color-text-primary)] shadow-xl z-[100] flex flex-col gap-1"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-1.5 mb-1">
                    Switch Evaluator Persona
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
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer w-full ${
                          isActive
                            ? 'bg-[var(--color-accent-subtle)] border border-[var(--color-accent-border)]'
                            : 'hover:bg-[var(--color-raised)] border border-transparent'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            rKey === 'admin'
                              ? 'bg-[var(--color-accent)]'
                              : rKey === 'analyst'
                              ? 'bg-[var(--color-text-secondary)]'
                              : 'bg-[var(--color-text-muted)]'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                              {target.label}
                            </span>
                            {isActive && <Check size={12} className="text-[var(--color-accent-link)]" />}
                          </div>
                          <div className="text-[11px] text-[var(--color-text-secondary)] leading-tight mt-0.5 truncate">
                            {target.desc}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
            aria-label="Toggle visual theme"
          >
            {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
          </button>

          {/* User Profile Menu Trigger */}
          <div className="relative">
            <button
              ref={profileTriggerRef}
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-1.5 h-8 pl-1 pr-2 rounded-[9px] bg-[var(--color-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer"
              aria-label="User account menu"
              aria-expanded={profileOpen}
            >
              <div
                className="w-5.5 h-5.5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-mono text-[9.5px] font-semibold flex items-center justify-center"
                style={{
                  boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-accent-contrast) 18%, transparent)',
                }}
              >
                {initials}
              </div>
              <ChevronDown
                size={10}
                className={`text-[var(--color-text-muted)] transition-transform duration-150 ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Profile Popover Card */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  ref={profileMenuRef}
                  variants={popoverVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-[calc(100%+8px)] right-0 w-80 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-[var(--color-text-primary)] shadow-xl z-[100] flex flex-col gap-3"
                >
                  {/* Executive Identity Header */}
                  <div className="flex items-center gap-3 pb-1">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-mono text-sm font-semibold flex items-center justify-center flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                          {user?.display_name || 'System Administrator'}
                        </span>
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent-link)] border border-[var(--color-accent-border)]">
                          {roleDisplay.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[var(--color-text-secondary)] truncate mt-0.5">
                        {user?.email || 'admin@querytrust.local'}
                      </span>
                    </div>
                  </div>

                  {/* Zero-Trust Telemetry Credentials & Environment Strip */}
                  <div className="rounded-lg bg-[var(--color-raised)] border border-[var(--color-border-subtle)] p-3 flex flex-col gap-2 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">Environment</span>
                      <span className="font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-success-dot)]" />
                        Default Workspace
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">Database Role</span>
                      <span className="text-[var(--color-status-success-text)] font-medium">qt_ai_readonly</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">AST Safety Proof</span>
                      <span className="text-[var(--color-accent-link)] font-medium">6/6 Gates Active</span>
                    </div>
                  </div>

                  <div className="border-t border-[var(--color-border-subtle)]" />

                  {/* Keyboard Shortcuts Quick Reference */}
                  <div className="space-y-1 px-0.5">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-2 mb-1">
                      Quick Shortcuts
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          onOpenCommandPalette?.()
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)] transition-colors cursor-pointer text-left"
                      >
                        <span className="font-medium">Command Palette</span>
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] flex-shrink-0">⌘K</kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          window.dispatchEvent(new CustomEvent('querytrust:toggle-sidebar'))
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)] transition-colors cursor-pointer text-left"
                      >
                        <span className="font-medium">Toggle Sidebar</span>
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] flex-shrink-0">⌘B</kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          onNavigate?.('ask-data')
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('querytrust:new-session'))
                          }, 50)
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)] transition-colors cursor-pointer text-left"
                      >
                        <span className="font-medium">New Governed Query</span>
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] flex-shrink-0">⌘N</kbd>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[var(--color-border-subtle)]" />

                  {/* Role Capabilities Accordion */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPermissions((prev) => !prev)}
                      className="group flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-raised)] border border-[var(--color-border-subtle)] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shield size={13} className="text-[var(--color-status-success-dot)]" />
                        <span className="text-xs font-medium">What can an {roleDisplay} do?</span>
                      </div>
                      <ChevronDown
                        size={12}
                        className={`text-[var(--color-text-muted)] transition-transform duration-150 ${showPermissions ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showPermissions && (
                      <div className="mt-2 p-2.5 rounded-lg bg-[var(--color-raised)] border border-[var(--color-border-subtle)] text-xs leading-relaxed text-[var(--color-text-secondary)] space-y-1.5 font-sans">
                        <div className="font-medium text-[var(--color-text-primary)] text-[11.5px]">
                          {permissionsData.title}
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11px]">
                          {permissionsData.rules.slice(0, 4).map((rule, idx) => (
                            <li key={idx} className="truncate">{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--color-border-subtle)]" />

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between pt-0.5">
                    {onOpenOnboarding && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          onOpenOnboarding()
                        }}
                        className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles size={12} className="text-[var(--color-accent-link)]" />
                        <span>Welcome Tour</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setProfileOpen(false)
                        await logout()
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-status-error-text)] hover:bg-[var(--color-status-error-bg)] transition-colors cursor-pointer ml-auto"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
