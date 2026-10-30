import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  LogOut,
  Shield,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Check,
  Loader2,
  Search,
  Building2,
  LayoutDashboard,
  Terminal,
  FlaskConical,
  Database,
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
    transition: { duration: 0.1 },
  },
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
        className="app-top-navbar h-[52px] min-h-[52px] max-h-[52px] border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 flex items-center justify-between gap-4 z-30 flex-shrink-0"
        role="banner"
        aria-label="Top Navigation Bar"
      >
        {/* ─── Left Side: Clean Workspace Breadcrumbs ─── */}
        <div className="flex items-center gap-2 min-w-0">
          <nav
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium"
            aria-label="Breadcrumb navigation"
          >
            <span className="font-semibold text-[var(--text-main)] tracking-tight">
              Query<span className="text-[#F97316]">Trust</span>
            </span>
            <span className="text-[var(--text-subtle)]">/</span>
            <button
              type="button"
              onClick={() => onNavigate?.('overview')}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)] text-[11.5px] font-medium transition-colors cursor-pointer"
              title="Workspace scope: Click to return to fleet overview"
            >
              <Building2 size={11} className="text-[var(--text-subtle)]" />
              <span className="max-w-[130px] truncate">{user?.workspace_name || 'Workspace'}</span>
            </button>
            <span className="text-[var(--text-subtle)]">/</span>
            <span className="font-semibold text-[var(--text-main)] text-xs">
              {activeTab ? TAB_LABELS[activeTab] || activeTab : 'Fleet Overview'}
            </span>
          </nav>
        </div>

        {/* ─── Center: ⌘K Global Command Palette Trigger ─── */}
        <div className="flex items-center justify-center flex-1 max-w-[320px] mx-2 min-w-0">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="group flex items-center justify-between w-full h-8 px-3 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs text-[var(--text-muted)] transition-all cursor-pointer shadow-2xs min-w-0"
            title="Press ⌘K or Ctrl+K to open global command palette"
          >
            <span className="flex items-center gap-2 min-w-0 truncate">
              <Search size={13} className="text-[var(--text-subtle)] group-hover:text-[#F97316] transition-colors flex-shrink-0" />
              <span className="text-[11.5px] truncate whitespace-nowrap">Ask data or search actions...</span>
            </span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-subtle)] group-hover:text-[var(--text-muted)] transition-colors flex-shrink-0 ml-1.5">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ─── Right Side: Security Pill, Role Switcher & Profile ─── */}
        <div className="flex items-center gap-2">
          {/* Security Integrity Status Pill */}
          <button
            type="button"
            onClick={() => setRoiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-main)] transition-all cursor-pointer"
            title="Kernel Status: 6/6 AST Gates Enforced • Dedicated SELECT-Only Replica • Click for Metrics"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Kernel Read-Only</span>
            <span className="text-[var(--text-subtle)]">&bull;</span>
            <span className="text-[var(--text-muted)]">1.4ms</span>
          </button>

          {/* Instant 1-Click Role Switcher Dropdown */}
          <div className="relative">
            <button
              ref={roleTriggerRef}
              type="button"
              onClick={() => setRoleSwitcherOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                userRole === 'admin'
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/15'
                  : userRole === 'analyst'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20 hover:bg-sky-500/15'
                  : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/20 hover:bg-zinc-500/15'
              }`}
              title="Click to switch evaluation persona (Admin, Analyst, Viewer)"
              aria-label={`Current role: ${roleDisplay}. Click to switch role`}
              aria-expanded={roleSwitcherOpen}
            >
              <span>Demo: {roleDisplay.toUpperCase()}</span>
              {switchingRole ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-150 ${roleSwitcherOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Role Switcher Menu (framer-motion) */}
            <AnimatePresence>
              {roleSwitcherOpen && (
                <motion.div
                  ref={roleMenuRef}
                  variants={popoverVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-[calc(100%+6px)] right-0 w-64 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-2 text-[var(--text-main)] shadow-xl z-50 flex flex-col gap-1"
                >
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-subtle)] border-b border-[var(--border-subtle)] pb-1.5 mb-1">
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
                        className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer w-full ${
                          isActive
                            ? 'bg-[var(--bg-subtle)] border border-[var(--border-subtle)]'
                            : 'hover:bg-[var(--bg-subtle)] border border-transparent'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            rKey === 'admin'
                              ? 'bg-purple-500'
                              : rKey === 'analyst'
                              ? 'bg-sky-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--text-main)]">
                              {target.label}
                            </span>
                            {isActive && <Check size={12} className="text-[#F97316]" />}
                          </div>
                          <div className="text-[10.5px] text-[var(--text-muted)] leading-tight mt-0.5 truncate">
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
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
            aria-label="Toggle visual theme"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* User Profile Menu Trigger */}
          <div className="relative">
            <button
              ref={profileTriggerRef}
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
              aria-label="User account menu"
              aria-expanded={profileOpen}
            >
              <div className="w-6 h-6 rounded-md bg-orange-500/15 text-[#F97316] font-mono text-[11px] font-bold flex items-center justify-center border border-orange-500/25">
                {initials}
              </div>
              <span className="text-xs font-medium text-[var(--text-main)] max-w-[120px] truncate">
                {user?.display_name || 'User'}
              </span>
              <ChevronDown
                size={11}
                className={`text-[var(--text-subtle)] transition-transform duration-150 ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Profile Popover Card (framer-motion, based on UserProfileSidebar) */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  ref={profileMenuRef}
                  variants={popoverVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-[calc(100%+6px)] right-0 w-72 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-3 text-[var(--text-main)] shadow-xl z-50 flex flex-col gap-2.5"
                >
                  {/* User Identity Header */}
                  <div className="flex items-center gap-3 p-1">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/15 text-[#F97316] font-mono text-xs font-bold flex items-center justify-center border border-orange-500/25 flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-[var(--text-main)] truncate">
                          {user?.display_name || 'System Administrator'}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-orange-500/10 text-[#F97316] border border-orange-500/20">
                          {roleDisplay}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] truncate">
                        {user?.email || 'admin@querytrust.local'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* Navigation Links with Hover Chevron */}
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        onNavigate?.('overview')
                      }}
                      className="group flex items-center justify-between w-full h-8 px-2.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <LayoutDashboard size={13} className="text-[var(--text-subtle)] group-hover:text-[#F97316] transition-colors" />
                        <span>Fleet Overview</span>
                      </div>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] transition-opacity" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        onNavigate?.('ask-data')
                      }}
                      className="group flex items-center justify-between w-full h-8 px-2.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Terminal size={13} className="text-[var(--text-subtle)] group-hover:text-[#F97316] transition-colors" />
                        <span>Query Studio</span>
                      </div>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] transition-opacity" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        onNavigate?.('evaluations')
                      }}
                      className="group flex items-center justify-between w-full h-8 px-2.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <FlaskConical size={13} className="text-[var(--text-subtle)] group-hover:text-[#F97316] transition-colors" />
                        <span>AST Safety Proof</span>
                      </div>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] transition-opacity" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        onNavigate?.('devices')
                      }}
                      className="group flex items-center justify-between w-full h-8 px-2.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Database size={13} className="text-[var(--text-subtle)] group-hover:text-[#F97316] transition-colors" />
                        <span>Data Catalog</span>
                      </div>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] transition-opacity" />
                    </button>
                  </div>

                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* Role Permissions Accordion */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPermissions((prev) => !prev)}
                      className="group flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shield size={12} className="text-emerald-500" />
                        <span className="text-[11.5px] font-medium">What can a {roleDisplay} do?</span>
                      </div>
                      <ChevronDown
                        size={11}
                        className={`text-[var(--text-subtle)] transition-transform duration-150 ${showPermissions ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showPermissions && (
                      <div className="mt-1.5 p-2 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] leading-relaxed text-[var(--text-muted)] space-y-1">
                        <div className="font-semibold text-[var(--text-main)] text-[11px]">
                          {permissionsData.title}
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                          {permissionsData.rules.slice(0, 4).map((rule, idx) => (
                            <li key={idx} className="truncate">{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between pt-0.5">
                    {onOpenOnboarding && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          onOpenOnboarding()
                        }}
                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ml-auto"
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
