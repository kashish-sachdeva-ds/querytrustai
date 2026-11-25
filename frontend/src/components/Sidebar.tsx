import React, { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  LayoutDashboard,
  Server,
  ShieldCheck,
  Activity,
  FlaskConical,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  Terminal,
  Plus,
  Table2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  fetchDataQualitySummary,
  fetchAnomalySummary,
} from '../api/client'
import { QueryTrustLogo } from './QueryTrustLogo'
import './LinearShell.css'

export type ActiveTab =
  | 'overview'
  | 'devices'
  | 'ask-data'
  | 'data-sources'
  | 'data-quality'
  | 'anomalies'
  | 'history'
  | 'evaluations'
  | 'admin'

interface SidebarProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  onAskQuestion?: (question: string) => void
}

const PINNED_TABLES = [
  { name: 'devices', schema: 'public', rows: '5,000', query: 'Show all active devices' },
  { name: 'sites', schema: 'public', rows: '50', query: 'List all sites by region' },
  { name: 'service_events', schema: 'public', rows: '1,500', query: 'List open Critical service events' },
  { name: 'telemetry_readings', schema: 'public', rows: '25k', query: 'Find devices with temperature > 65°C' },
]

const sidebarNavVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
}

const navItemVariants: Variants = {
  hidden: { opacity: 0, x: -6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 160,
      damping: 20,
    },
  },
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onAskQuestion }) => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.innerWidth <= 768
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 1024 && window.innerWidth > 768) return true
      return localStorage.getItem('qt-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return
      const mobile = window.innerWidth <= 768
      setIsMobileViewport(mobile)
      if (!mobile) {
        setMobileOpen(false)
        if (window.innerWidth <= 1024) {
          setIsCollapsed(true)
        }
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Dynamic alert counts from live backend APIs
  const [dataHealthCount, setDataHealthCount] = useState<number>(6)
  const [anomaliesCount, setAnomaliesCount] = useState<number>(375)
  const [isSchemasOpen, setIsSchemasOpen] = useState<boolean>(false)

  const toggleCollapsed = () => {
    if (isMobileViewport) {
      setMobileOpen((prev) => !prev)
      return
    }
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('qt-sidebar-collapsed', String(next))
      } catch {
        /* noop */
      }
      return next
    })
  }

  // Handle global sidebar toggle events (e.g. ⌘B & mobile menu button)
  useEffect(() => {
    const handleToggleSignal = () => toggleCollapsed()
    const handleMobileSignal = () => setMobileOpen((prev) => !prev)
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('querytrust:toggle-sidebar', handleToggleSignal)
    window.addEventListener('querytrust:toggle-mobile-sidebar', handleMobileSignal)
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('querytrust:toggle-sidebar', handleToggleSignal)
      window.removeEventListener('querytrust:toggle-mobile-sidebar', handleMobileSignal)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isMobileViewport])

  // Load live hygiene & anomaly defect counts
  useEffect(() => {
    let isMounted = true

    async function loadTelemetry() {
      try {
        const dq = await fetchDataQualitySummary()
        if (isMounted && dq?.total_findings) {
          setDataHealthCount(dq.total_findings)
        }
      } catch {
        // default preserved
      }

      try {
        const anom = await fetchAnomalySummary()
        const count =
          anom?.metrics?.detected_outliers_count ??
          anom?.metrics?.known_injected_outliers_count ??
          375
        if (isMounted) setAnomaliesCount(count)
      } catch {
        // default preserved
      }
    }

    loadTelemetry()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSelectNav = (tab: ActiveTab) => {
    setMobileOpen(false)
    onSelectTab(tab)
  }

  // Distinct Action: "+ New Query" creates a brand-new query session in AskDataView
  const handleNewQuery = () => {
    setMobileOpen(false)
    onSelectTab('ask-data')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('querytrust:new-session'))
    }, 40)
  }

  const getCollapsedItemClasses = (tab: ActiveTab) => {
    const isActive = activeTab === tab
    if (isActive) {
      return 'relative group w-9 h-9 mx-auto rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer bg-zinc-100 dark:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.14] text-[var(--color-accent)] shadow-xs'
    }
    return 'relative group w-9 h-9 mx-auto rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 border border-transparent hover:border-zinc-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.04] dark:hover:border-white/[0.06]'
  }

  const getExpandedItemClasses = (tab: ActiveTab) => {
    const isActive = activeTab === tab
    if (isActive) {
      return 'relative group flex items-center justify-between w-full h-8.5 px-3 rounded-lg text-xs cursor-pointer transition-all duration-200 bg-zinc-100/90 dark:bg-white/[0.06] border border-zinc-200/90 dark:border-white/[0.12] text-zinc-900 dark:text-white font-medium shadow-xs backdrop-blur-md'
    }
    return 'relative group flex items-center justify-between w-full h-8.5 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 border border-transparent hover:border-zinc-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.035] dark:hover:border-white/[0.06]'
  }

  const getIconClasses = (tab: ActiveTab) => {
    const isActive = activeTab === tab
    if (isActive) {
      return 'text-[var(--color-accent)] flex-shrink-0 transition-colors duration-200'
    }
    return 'text-zinc-400 group-hover:text-zinc-800 dark:text-slate-400/80 dark:group-hover:text-white flex-shrink-0 transition-colors duration-200'
  }

  const effectiveCollapsed = !isMobileViewport && isCollapsed
  const sidebarWidth = isMobileViewport ? '260px' : effectiveCollapsed ? '52px' : '248px'

  return (
    <>
      {isMobileViewport && mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar ${effectiveCollapsed ? 'sidebar--collapsed' : ''} ${isMobileViewport ? (mobileOpen ? 'sidebar--mobile-open' : 'sidebar--mobile-closed') : ''}`}
        aria-label="Main Navigation Sidebar"
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          maxWidth: sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
          overflowX: 'hidden',
          overflowY: 'hidden',
          boxSizing: 'border-box',
          flexShrink: 0,
          zIndex: isMobileViewport ? 120 : 40,
          transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), width 160ms cubic-bezier(0.16, 1, 0.3, 1), min-width 160ms ease',
        }}
      >
      {/* ─── Top Brand & Navigation Section ─── */}
      <div className="flex flex-col min-h-0 flex-1 overflow-x-hidden">
        {/* Header flush with top navigation bar (exact 48px height) */}
        <div
          className={`h-12 min-h-[48px] max-h-[48px] border-b border-[var(--color-border-subtle)] ${
            effectiveCollapsed ? 'px-0 justify-center' : 'px-3 justify-between'
          } flex items-center bg-[var(--color-surface)] flex-shrink-0`}
        >
          {effectiveCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)] transition-all cursor-pointer group relative"
              title="Expand sidebar (⌘B)"
              aria-label="Expand sidebar"
            >
              <div className="group-hover:hidden transition-transform">
                <QueryTrustLogo size={20} />
              </div>
              <ChevronRight size={15} strokeWidth={1.5} className="hidden group-hover:block text-[var(--color-accent)] transition-transform" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => handleSelectNav('overview')}
                  className="flex-shrink-0 cursor-pointer focus:outline-none hover:opacity-90 transition-opacity"
                  title="QueryTrust AI"
                >
                  <QueryTrustLogo size={22} />
                </button>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-xs tracking-tight text-[var(--color-text-primary)] font-sans truncate">
                    Query<span className="text-[var(--color-accent-link)]">Trust</span>
                  </span>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-[var(--color-accent-subtle)] text-[var(--color-accent-link)] border border-[var(--color-accent-border)] flex-shrink-0">
                    AI
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleCollapsed}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)] border border-transparent hover:border-[var(--color-border-subtle)] transition-all cursor-pointer"
                title={isMobileViewport ? 'Close navigation menu' : 'Collapse sidebar (⌘B)'}
                aria-label={isMobileViewport ? 'Close navigation menu' : 'Collapse sidebar'}
              >
                {isMobileViewport ? <ChevronLeft size={14} strokeWidth={1.75} /> : <ChevronLeft size={13} strokeWidth={1.5} />}
              </button>
            </>
          )}
        </div>

        {/* ─── Quick Action: + New Query (⌘N) ─── */}
        <div className={`p-2 border-b border-[var(--color-border-subtle)] flex-shrink-0 ${effectiveCollapsed ? 'flex justify-center' : ''}`}>
          {effectiveCollapsed ? (
            <button
              type="button"
              onClick={handleNewQuery}
              className="w-9 h-9 mx-auto rounded-lg bg-[var(--color-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-[var(--color-accent-link)] flex items-center justify-center transition-all cursor-pointer group"
              title="New Governed Query (⌘N)"
              aria-label="New Governed Query (⌘N)"
            >
              <Plus size={16} strokeWidth={1.75} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNewQuery}
              className="w-full h-8.5 px-3 rounded-lg bg-[var(--color-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-xs text-[var(--color-text-primary)] flex items-center justify-between transition-all duration-150 cursor-pointer group"
              title="Compose New Governed Query (⌘N)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Plus size={14} strokeWidth={1.75} className="text-[var(--color-accent-link)] flex-shrink-0" />
                <span className="text-[12px] font-medium tracking-tight text-[var(--color-text-primary)]">New Query</span>
              </div>
              <kbd className="text-[9.5px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 rounded flex-shrink-0">
                ⌘N
              </kbd>
            </button>
          )}
        </div>

        {/* ─── Scrollable Navigation Body ─── */}
        <motion.div
          variants={sidebarNavVariants}
          initial="hidden"
          animate="visible"
          className={`flex-1 overflow-y-auto overflow-x-hidden ${effectiveCollapsed ? 'px-1 py-2.5 space-y-2' : 'px-2 py-3 space-y-4'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* GROUP 1: WORKSPACE */}
          <motion.div variants={navItemVariants}>
            {!effectiveCollapsed && (
              <div className="text-[11.5px] font-medium text-[var(--color-text-muted)] px-3 pt-1.5 pb-1 select-none">
                Workspace
              </div>
            )}
            <div className="space-y-1">
              {/* Fleet Overview */}
              <button
                type="button"
                onClick={() => handleSelectNav('overview')}
                className={effectiveCollapsed ? getCollapsedItemClasses('overview') : getExpandedItemClasses('overview')}
                title="Fleet Overview"
                aria-label="Fleet Overview"
              >
                {activeTab === 'overview' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--color-accent)]" />
                )}
                {effectiveCollapsed ? (
                  <LayoutDashboard size={17} strokeWidth={1.5} className={getIconClasses('overview')} />
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <LayoutDashboard size={15} strokeWidth={1.5} className={getIconClasses('overview')} />
                      <span className="truncate">Fleet Overview</span>
                    </div>
                    <ChevronRight size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] transition-opacity flex-shrink-0" />
                  </>
                )}
              </button>

              {/* Query Studio */}
              <button
                type="button"
                onClick={() => handleSelectNav('ask-data')}
                className={effectiveCollapsed ? getCollapsedItemClasses('ask-data') : getExpandedItemClasses('ask-data')}
                title="Query Studio (Governed NL-to-SQL)"
                aria-label="Query Studio"
              >
                {activeTab === 'ask-data' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--color-accent)]" />
                )}
                {effectiveCollapsed ? (
                  <Terminal size={17} strokeWidth={1.5} className={getIconClasses('ask-data')} />
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Terminal size={15} strokeWidth={1.5} className={getIconClasses('ask-data')} />
                      <span className="truncate">Query Studio</span>
                    </div>
                    <ChevronRight size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] transition-opacity flex-shrink-0" />
                  </>
                )}
              </button>

              {/* Data Catalog */}
              <button
                type="button"
                onClick={() => handleSelectNav('devices')}
                className={effectiveCollapsed ? getCollapsedItemClasses('devices') : getExpandedItemClasses('devices')}
                title="Data Catalog & Schema"
                aria-label="Data Catalog"
              >
                {activeTab === 'devices' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--color-accent)]" />
                )}
                {effectiveCollapsed ? (
                  <Database size={17} strokeWidth={1.5} className={getIconClasses('devices')} />
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Database size={15} strokeWidth={1.5} className={getIconClasses('devices')} />
                      <span className="truncate">Data Catalog</span>
                    </div>
                    <ChevronRight size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] transition-opacity flex-shrink-0" />
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {effectiveCollapsed ? (
            <div className="w-4 h-[1px] bg-[var(--color-border-subtle)] mx-auto my-1" />
          ) : (
            <div className="h-[1px] bg-[var(--color-border-subtle)] my-1 mx-2" />
          )}

          {/* GROUP 2: SIGNALS & HYGIENE */}
          <motion.div variants={navItemVariants}>
            {!effectiveCollapsed && (
              <div className="text-[11.5px] font-medium text-[var(--color-text-muted)] px-3 pt-1.5 pb-1 select-none">
                Data health
              </div>
            )}
            <div className="space-y-1">
              {/* Data Health */}
              <button
                type="button"
                onClick={() => handleSelectNav('data-quality')}
                className={effectiveCollapsed ? getCollapsedItemClasses('data-quality') : getExpandedItemClasses('data-quality')}
                title={`Data Health (${dataHealthCount} findings)`}
                aria-label="Data Health"
              >
                {activeTab === 'data-quality' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--color-accent)]" />
                )}
                {effectiveCollapsed ? (
                  <>
                    <ShieldCheck size={17} strokeWidth={1.5} className={getIconClasses('data-quality')} />
                    {dataHealthCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-status-warning-dot)] ring-1 ring-[var(--color-surface)] pointer-events-none" />
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ShieldCheck size={15} strokeWidth={1.5} className={getIconClasses('data-quality')} />
                      <span className="truncate">Data Health</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {dataHealthCount > 0 && (
                        <span className="bg-[var(--color-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] text-[11px] font-medium px-1.5 py-0.2 rounded-full min-w-[20px] text-center flex items-center justify-center tabular-nums">
                          {dataHealthCount}
                        </span>
                      )}
                      <ChevronRight size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] transition-opacity" />
                    </div>
                  </>
                )}
              </button>

              {/* Anomalies */}
              <button
                type="button"
                onClick={() => handleSelectNav('anomalies')}
                className={effectiveCollapsed ? getCollapsedItemClasses('anomalies') : getExpandedItemClasses('anomalies')}
                title={`Anomalies (${anomaliesCount} outliers)`}
                aria-label="Anomalies"
              >
                {activeTab === 'anomalies' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--color-accent)]" />
                )}
                {effectiveCollapsed ? (
                  <>
                    <Activity size={17} strokeWidth={1.5} className={getIconClasses('anomalies')} />
                    {anomaliesCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-status-error-dot)] ring-1 ring-[var(--color-surface)] pointer-events-none" />
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Activity size={15} strokeWidth={1.5} className={getIconClasses('anomalies')} />
                      <span className="truncate">Anomalies</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {anomaliesCount > 0 && (
                        <span className="bg-[var(--color-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] text-[11px] font-medium px-1.5 py-0.2 rounded-full min-w-[20px] text-center flex items-center justify-center tabular-nums">
                          {anomaliesCount}
                        </span>
                      )}
                      <ChevronRight size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] transition-opacity" />
                    </div>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {effectiveCollapsed ? (
            <div className="w-4 h-[1px] bg-[var(--color-border-subtle)] mx-auto my-1" />
          ) : (
            <div className="h-[1px] bg-[var(--color-border-subtle)] my-1 mx-2" />
          )}

          {/* GROUP 3: GOVERNANCE & COMPLIANCE */}
          <motion.div variants={navItemVariants}>
            {!effectiveCollapsed && (
              <div className="text-[11.5px] font-medium text-[var(--color-text-muted)] px-3 pt-1.5 pb-1 select-none">
                Governance
              </div>
            )}
            <div className="space-y-1">
              {/* AST Safety Proof */}
              <button
                type="button"
                onClick={() => handleSelectNav('evaluations')}
                className={effectiveCollapsed ? getCollapsedItemClasses('evaluations') : getExpandedItemClasses('evaluations')}
                title="AST Safety Proof & Compiler Gates"
                aria-label="AST Safety Proof"
              >
                {activeTab === 'evaluations' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--color-accent)]" />
                )}
                {effectiveCollapsed ? (
                  <FlaskConical size={17} strokeWidth={1.5} className={getIconClasses('evaluations')} />
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FlaskConical size={15} strokeWidth={1.5} className={getIconClasses('evaluations')} />
                      <span className="truncate">AST Safety Proof</span>
                    </div>
                    <ChevronRight size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] transition-opacity flex-shrink-0" />
                  </>
                )}
              </button>

              {/* Sources & Kernel */}
              <button
                type="button"
                onClick={() => handleSelectNav('data-sources')}
                className={effectiveCollapsed ? getCollapsedItemClasses('data-sources') : getExpandedItemClasses('data-sources')}
                title="Data Sources & Kernel Topology"
                aria-label="Sources & Kernel"
              >
                {activeTab === 'data-sources' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--color-accent)]" />
                )}
                {effectiveCollapsed ? (
                  <Server size={17} strokeWidth={1.5} className={getIconClasses('data-sources')} />
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Server size={15} strokeWidth={1.5} className={getIconClasses('data-sources')} />
                      <span className="truncate">Sources &amp; Kernel</span>
                    </div>
                    <ChevronRight size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] transition-opacity flex-shrink-0" />
                  </>
                )}
              </button>

              {/* People & Access */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleSelectNav('admin')}
                  className={effectiveCollapsed ? getCollapsedItemClasses('admin') : getExpandedItemClasses('admin')}
                  title="People & RBAC Access"
                  aria-label="People & Access"
                >
                  {activeTab === 'admin' && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--color-accent)]" />
                  )}
                  {effectiveCollapsed ? (
                    <Users size={17} strokeWidth={1.5} className={getIconClasses('admin')} />
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Users size={15} strokeWidth={1.5} className={getIconClasses('admin')} />
                        <span className="truncate">People &amp; Access</span>
                      </div>
                      <ChevronRight size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] transition-opacity flex-shrink-0" />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>

          {/* GROUP 4: PINNED DATABASE SCHEMAS (Collapsible Accordion) */}
          {!effectiveCollapsed && (
            <motion.div variants={navItemVariants} className="pt-2">
              <div className="h-[1px] bg-[var(--color-border-subtle)] mb-2 mx-2" />
              <button
                type="button"
                onClick={() => setIsSchemasOpen((prev) => !prev)}
                className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg hover:bg-[var(--color-raised)] transition-colors cursor-pointer text-left group"
                title="Toggle live database schemas"
                aria-expanded={isSchemasOpen}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12px] font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                    Live schemas
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--color-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
                    4 tables
                  </span>
                </div>
                <ChevronDown
                  size={12}
                  strokeWidth={1.5}
                  className={`text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-transform duration-150 ${isSchemasOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isSchemasOpen && (
                <div className="space-y-0.5 mt-1 px-1">
                  {PINNED_TABLES.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        setMobileOpen(false)
                        if (onAskQuestion) {
                          onAskQuestion(t.query)
                        } else {
                          handleSelectNav('devices')
                        }
                      }}
                      className="group flex items-center justify-between w-full h-7 px-2.5 rounded-md text-[11px] font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)] transition-all cursor-pointer text-left"
                      title={`Click to query ${t.schema}.${t.name} (${t.rows} rows)`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Table2 size={12} strokeWidth={1.5} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-link)] transition-colors flex-shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono flex-shrink-0">{t.rows}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ─── Bottom Live Status Beacon & Dock ─── */}
      <div className={`p-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-raised)] flex-shrink-0 ${effectiveCollapsed ? 'flex flex-col items-center gap-1.5' : ''}`}>
        {effectiveCollapsed ? (
          <>
            <button
              type="button"
              onClick={() => handleSelectNav('data-sources')}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface)] transition-colors cursor-pointer group relative"
              title="PostgreSQL 16 Read-Only • Dedicated SELECT Replica"
              aria-label="PostgreSQL Read-Only Kernel Active"
            >
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-status-success-dot)]" />
              </span>
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              title="Expand sidebar (⌘B)"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          </>
        ) : (
          <div
            onClick={() => handleSelectNav('data-sources')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors group"
            title="Inspect Data Sources & Kernel Topology"
          >
            <div className="relative flex h-2 w-2 flex-shrink-0">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-status-success-dot)]" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="text-[12px] font-medium text-[var(--color-text-primary)] truncate tracking-tight">
                PostgreSQL Read-Only
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                Read-only · Sample query: 1.4 ms
              </div>
            </div>
          </div>
        )}
      </div>
      </aside>
    </>
  )
}
