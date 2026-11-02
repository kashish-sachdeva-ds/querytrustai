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
        className="app-top-navbar h-12 min-h-[48px] max-h-[48px] border-b border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-[#0B0C0E] px-3.5 flex items-center justify-between gap-3 z-30 flex-shrink-0 transition-colors"
        role="banner"
        aria-label="Top Navigation Bar"
      >
        {/* ─── Left Side: Architectural Breadcrumbs ─── */}
        <div className="flex items-center gap-2 min-w-0">
          <nav
            className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0"
            aria-label="Breadcrumb navigation"
          >
            <button
              type="button"
              onClick={() => onNavigate?.('overview')}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              title="QueryTrust AI"
            >
              <span>QueryTrust</span>
            </button>
            <span className="text-zinc-400 dark:text-zinc-600 font-normal select-none">/</span>
            <span className="font-semibold text-xs text-zinc-950 dark:text-white tracking-tight truncate">
              {activeTab ? TAB_LABELS[activeTab] || activeTab : 'Fleet Overview'}
            </span>
          </nav>
        </div>

        {/* ─── Center: ⌘K Command Palette Trigger (Desktop) ─── */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-[280px] mx-2 min-w-0">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="group flex items-center justify-between w-full h-7.5 px-3 rounded-lg bg-zinc-100/80 hover:bg-zinc-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 border border-zinc-200/80 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/[0.16] text-xs text-zinc-500 transition-all cursor-pointer shadow-2xs min-w-0"
            title="Press ⌘K or Ctrl+K to open global command palette"
          >
            <span className="flex items-center gap-2 min-w-0 truncate">
              <Search size={13} className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors flex-shrink-0" />
              <span className="text-[11px] truncate whitespace-nowrap text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">
                Search or ask query...
              </span>
            </span>
            <kbd className="font-mono text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors flex-shrink-0 ml-1.5">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ─── Right Side: Precision Toolbar Controls ─── */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Quick search icon trigger for compact viewports */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex md:hidden w-7.5 h-7.5 rounded-lg items-center justify-center bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.08] text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Open search (⌘K)"
            aria-label="Open search command palette"
          >
            <Search size={13} />
          </button>

          {/* Security Integrity Telemetry Chip */}
          <button
            type="button"
            onClick={() => setRoiModalOpen(true)}
            className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/60 dark:hover:bg-white/[0.08] border border-zinc-200/80 dark:border-white/[0.08] text-[11px] font-mono text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
            title="Kernel Status: 6/6 AST Gates Enforced • Dedicated SELECT-Only Replica • Click for Metrics"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Read-Only</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">1.4ms</span>
          </button>

          {/* Instant 1-Click Role Switcher Dropdown */}
          <div className="relative">
            <button
              ref={roleTriggerRef}
              type="button"
              onClick={() => setRoleSwitcherOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/60 dark:hover:bg-white/[0.08] border border-zinc-200/80 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white shadow-2xs"
              title="Click to switch evaluation persona (Admin, Analyst, Viewer)"
              aria-label={`Current role: ${roleDisplay}. Click to switch role`}
              aria-expanded={roleSwitcherOpen}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${userRole === 'admin' ? 'bg-purple-500' : userRole === 'analyst' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
              <span>{roleDisplay}</span>
              {switchingRole ? (
                <Loader2 size={11} className="animate-spin text-sky-500" />
              ) : (
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-150 text-zinc-400 ${roleSwitcherOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Role Switcher Menu (Solid 100% Opaque Surface) */}
            <AnimatePresence>
              {roleSwitcherOpen && (
                <motion.div
                  ref={roleMenuRef}
                  variants={popoverVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-[calc(100%+8px)] right-0 w-68 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] p-2.5 text-zinc-900 dark:text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.7)] z-[100] flex flex-col gap-1"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5 mb-1">
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
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer w-full ${
                          isActive
                            ? 'bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            rKey === 'admin'
                              ? 'bg-purple-500'
                              : rKey === 'analyst'
                              ? 'bg-sky-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-950 dark:text-white">
                              {target.label}
                            </span>
                            {isActive && <Check size={12} className="text-sky-500 dark:text-sky-400" />}
                          </div>
                          <div className="text-[11px] text-zinc-500 leading-tight mt-0.5 truncate">
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/60 dark:hover:bg-white/[0.08] border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer shadow-2xs"
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
              className="flex items-center gap-1.5 h-8 pl-1 pr-2 rounded-lg bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/60 dark:hover:bg-white/[0.08] border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer shadow-2xs"
              aria-label="User account menu"
              aria-expanded={profileOpen}
            >
              <div className="w-5.5 h-5.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-mono text-[9.5px] font-bold flex items-center justify-center shadow-xs">
                {initials}
              </div>
              <ChevronDown
                size={10}
                className={`text-zinc-400 transition-transform duration-150 ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Profile Popover Card (Solid 100% Opaque Luxury Surface) */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  ref={profileMenuRef}
                  variants={popoverVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-[calc(100%+8px)] right-0 w-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121216] p-4 text-zinc-900 dark:text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.7)] z-[100] flex flex-col gap-3"
                >
                  {/* Executive Identity Header */}
                  <div className="flex items-center gap-3 pb-1">
                    <div className="w-11 h-11 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-mono text-sm font-bold flex items-center justify-center border border-zinc-200 dark:border-zinc-700 flex-shrink-0 shadow-xs">
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                          {user?.display_name || 'System Administrator'}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          {roleDisplay.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {user?.email || 'admin@querytrust.local'}
                      </span>
                    </div>
                  </div>

                  {/* Zero-Trust Telemetry Credentials & Environment Strip */}
                  <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/[0.08] p-3 flex flex-col gap-2 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Environment</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Default Workspace
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Database Role</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">qt_ai_readonly</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">AST Safety Proof</span>
                      <span className="text-sky-600 dark:text-sky-400 font-semibold">6/6 Gates Active</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Keyboard Shortcuts Quick Reference */}
                  <div className="space-y-1 px-0.5">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 mb-1">
                      Quick Shortcuts
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          onOpenCommandPalette?.()
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left"
                      >
                        <span className="font-medium">Command Palette</span>
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 flex-shrink-0">⌘K</kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          window.dispatchEvent(new CustomEvent('querytrust:toggle-sidebar'))
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left"
                      >
                        <span className="font-medium">Toggle Sidebar</span>
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 flex-shrink-0">⌘B</kbd>
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
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left"
                      >
                        <span className="font-medium">New Governed Query</span>
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 flex-shrink-0">⌘N</kbd>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Role Capabilities Accordion */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPermissions((prev) => !prev)}
                      className="group flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shield size={13} className="text-emerald-500" />
                        <span className="text-xs font-semibold">What can an {roleDisplay} do?</span>
                      </div>
                      <ChevronDown
                        size={12}
                        className={`text-zinc-400 transition-transform duration-150 ${showPermissions ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showPermissions && (
                      <div className="mt-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 space-y-1.5 font-sans">
                        <div className="font-semibold text-zinc-900 dark:text-white text-[11.5px]">
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

                  <div className="border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between pt-0.5">
                    {onOpenOnboarding && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          onOpenOnboarding()
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles size={12} className="text-sky-500" />
                        <span>Welcome Tour</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setProfileOpen(false)
                        await logout()
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer ml-auto"
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
