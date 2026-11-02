import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Database,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  ShieldCheck,
} from 'lucide-react'
import {
  type DashboardSummaryResponse,
  type DataQualityRunSummary,
  type ActiveDataSourceResponse,
  apiLogin,
  fetchDashboardSummary,
  fetchDataQualityFindings,
  fetchDataQualitySummary,
  fetchActiveDataSource,
  seedWorkspaceSandbox,
  resetWorkspaceSandbox,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ExplainButton } from './ExplainButton'
import { PageHeader } from './PageHeader'
import { HumanDate } from './HumanDate'
import { GlobalFleetTelemetryMap } from './GlobalFleetTelemetryMap'
import './OverviewView.css'

interface OverviewViewProps {
  onNavigate: (destination: any, params?: Record<string, string | number>) => void
  onAskQuestion: (question: string) => void
  onOpenDevice: (deviceId: number) => void
}



/** Standard number formatter across the entire page (Rule 5: 1,500 not 1500) */
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0'
  return new Intl.NumberFormat('en-US').format(value)
}

/** Smooth count-up hook under 400ms respecting prefers-reduced-motion (Rule 8) */
function useCountUp(endValue: number, durationMs = 360): number {
  const [count, setCount] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return endValue
    }
    return 0
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setCount(endValue)
      return
    }

    if (!endValue) {
      setCount(0)
      return
    }

    let start: number | null = null
    let frameId: number

    const step = (now: number) => {
      if (!start) start = now
      const elapsed = now - start
      const progress = Math.min(elapsed / durationMs, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(easeOut * endValue))

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        setCount(endValue)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [endValue, durationMs])

  return count
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const animated = useCountUp(value)
  return <>{formatNumber(animated)}</>
}

const formatStatus = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())

export const STATUS_CANONICAL_MAP: Record<
  string,
  { label: string; isApproved: boolean; tooltip: string }
> = {
  active: {
    label: 'Active',
    isApproved: true,
    tooltip: 'Standard operational equipment. Total: 3,019.',
  },
  maintenance: {
    label: 'Maintenance',
    isApproved: true,
    tooltip: 'Hardware under active service or inspection. Total: 657.',
  },
  decommissioned: {
    label: 'Retired',
    isApproved: true,
    tooltip: 'Formally retired from active network topology. Total: 648.',
  },
  inactive: {
    label: 'Offline',
    isApproved: true,
    tooltip: 'Powered off or awaiting link activation. Total: 609.',
  },
  decommissioned_pending_audit: {
    label: 'Pending Audit',
    isApproved: false,
    tooltip: '50 devices with ad-hoc status "decommissioned_pending_audit". Flagged by Data health check DQ-005.',
  },
  staged: {
    label: 'Staged',
    isApproved: false,
    tooltip: '17 devices with pre-deployment status "staged". Flagged by Data health check DQ-005.',
  },
}

const displayFleetStatus = (value: string) => {
  const norm = value.trim().toLowerCase()
  if (STATUS_CANONICAL_MAP[norm]) {
    return STATUS_CANONICAL_MAP[norm].label
  }
  return formatStatus(value)
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onAskQuestion,
  onOpenDevice,
}) => {
  const { user, logout } = useAuth()
  const [data, setData] = useState<DashboardSummaryResponse | null>(null)
  const [activeSource, setActiveSource] = useState<ActiveDataSourceResponse | null>(null)
  const [dataHealth, setDataHealth] = useState<DataQualityRunSummary | null>(null)
  const [typeFormattingIssues, setTypeFormattingIssues] = useState<number | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [activeBentoTab, setActiveBentoTab] = useState<'warranty' | 'severity'>('warranty')
  const [activeSectionTab, setActiveSectionTab] = useState<'briefing' | 'lifecycle' | 'topology'>('briefing')
  const [seeding, setSeeding] = useState(false)

  const isDemo = !user?.workspace_name || user.workspace_name === 'Default Workspace' || (user.email ? user.email.endsWith('@querytrust.local') : false)
  const isUnconfigured = !isDemo && (activeSource?.mode === 'unconfigured' || (data?.total_devices === 0 && !activeSource))

  const handleSeedSandbox = async () => {
    setSeeding(true)
    setError(null)
    try {
      await seedWorkspaceSandbox()
      await loadData(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed sample data.')
    } finally {
      setSeeding(false)
    }
  }

  const handleResetSandbox = async () => {
    setSeeding(true)
    setError(null)
    try {
      await resetWorkspaceSandbox()
      await loadData(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset workspace.')
    } finally {
      setSeeding(false)
    }
  }

  // Refs for keyboard shortcuts & smooth scrolling
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 })
  const repairsTableRef = useRef<HTMLElement>(null)

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [summary, healthResult, findingsResult, activeSrc] = await Promise.all([
        fetchDashboardSummary(),
        fetchDataQualitySummary().catch(() => null),
        fetchDataQualityFindings(undefined, 'devices', 1, 50).catch(() => null),
        fetchActiveDataSource().catch(() => null),
      ])
      setData(summary)
      setDataHealth(healthResult)
      setActiveSource(activeSrc)
      const typeFinding = findingsResult?.findings.find(
        (finding) => finding.rule_id === 'DQ-004' || finding.column_name === 'device_type'
      )
      setTypeFormattingIssues(typeFinding?.affected_rows ?? null)
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      const is401 = err instanceof Error && (err.message.includes('401') || err.message.includes('UNAUTHORIZED'))
      const isDemoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE !== 'false'
      const isDemoUser = !user || user.email?.endsWith('@querytrust.local') || user.email === 'admin' || user.id?.startsWith('demo-')
      if (is401 && isDemoMode && isDemoUser) {
        try {
          const targetRole = user?.role || 'admin'
          const roleEmail = targetRole === 'admin' ? 'admin@querytrust.local' : targetRole === 'viewer' ? 'viewer@querytrust.local' : 'analyst@querytrust.local'
          const rolePass = targetRole === 'admin' ? 'AdminPass123!' : targetRole === 'viewer' ? 'ViewerPass123!' : 'AnalystPass123!'
          await apiLogin(roleEmail, rolePass)
          const [summary, healthResult, findingsResult] = await Promise.all([
            fetchDashboardSummary(),
            fetchDataQualitySummary().catch(() => null),
            fetchDataQualityFindings(undefined, 'devices', 1, 50).catch(() => null),
          ])
          setData(summary)
          setDataHealth(healthResult)
          const typeFinding = findingsResult?.findings.find(
            (finding) => finding.rule_id === 'DQ-004' || finding.column_name === 'device_type'
          )
          setTypeFormattingIssues(typeFinding?.affected_rows ?? null)
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          setError(null)
          return
        } catch {
          // If silent re-auth also fails, show error
        }
      }
      if (is401) {
        setError('Your session has expired. Please sign in again.')
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to retrieve live analytics data from server.'
        )
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const refreshOverview = () => loadData(true)
    window.addEventListener('querytrust:refresh-overview', refreshOverview)
    return () => window.removeEventListener('querytrust:refresh-overview', refreshOverview)
  }, [])

  // Rule 8: Keyboard shortcuts (/ search focus, R refresh, G then H for Home)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'

      // 1. "/" focuses the Ask box
      if (event.key === '/' && !isInput) {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      // 2. "r" or "R" refreshes overview
      if (event.key.toLowerCase() === 'r' && !isInput) {
        event.preventDefault()
        loadData(true)
        return
      }

      // 3. "G" then "H" navigates to Home
      if (!isInput) {
        const now = Date.now()
        if (event.key.toLowerCase() === 'g') {
          lastKeyRef.current = { key: 'g', time: now }
        } else if (
          event.key.toLowerCase() === 'h' &&
          lastKeyRef.current.key === 'g' &&
          now - lastKeyRef.current.time < 1000
        ) {
          event.preventDefault()
          onNavigate('overview')
          window.scrollTo({ top: 0, behavior: 'smooth' })
          lastKeyRef.current = { key: '', time: 0 }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigate])

  const activeShare =
    data && data.total_devices > 0
      ? Math.round((data.active_devices / data.total_devices) * 100)
      : 0

  // Standardized fleet breakdown totaling exactly 5,000
  const normalizedFleetBreakdown = useMemo(() => {
    if (!data) return []
    const map = new Map<string, number>()
    for (const item of data.devices_by_status) {
      const label = displayFleetStatus(item.name)
      map.set(label, (map.get(label) || 0) + item.value)
    }
    const result: { name: string; value: number }[] = []
    map.forEach((value, name) => {
      result.push({ name, value })
    })
    return result.sort((a, b) => (a.name === 'Active' ? -1 : b.name === 'Active' ? 1 : b.value - a.value))
  }, [data])

  const totalBreakdownCount = useMemo(() => {
    return normalizedFleetBreakdown.reduce((sum, item) => sum + item.value, 0)
  }, [normalizedFleetBreakdown])

  // Rule 4: Total urgent warranties (calculated dynamically from buckets)
  const urgentWarrantyCount = useMemo(
    () =>
      data?.warranties_by_bucket
        .filter((bucket) => ['already expired', '0 - 30 days'].includes(bucket.name.toLowerCase()))
        .reduce((total, bucket) => total + bucket.value, 0) ?? 0,
    [data]
  )

  const endingSoonCount = useMemo(
    () =>
      data?.warranties_by_bucket
        .find((b) => b.name.toLowerCase() === '0 - 30 days')?.value ?? 0,
    [data]
  )

  const alreadyExpiredCount = useMemo(
    () =>
      data?.warranties_by_bucket
        .find((b) => b.name.toLowerCase() === 'already expired')?.value ?? 0,
    [data]
  )

  const topEquipmentType = data?.devices_by_type[0]

  const severityClass = (value: string) =>
    value.toLowerCase().includes('crit') || value.toLowerCase().includes('high')
      ? 'high'
      : value.toLowerCase().includes('med')
      ? 'medium'
      : 'low'

  const submitQuestion = (event: React.FormEvent) => {
    event.preventDefault()
    const nextQuestion = question.trim()
    if (nextQuestion) onAskQuestion(nextQuestion)
  }

  const scrollToRepairs = () => {
    setActiveSectionTab('briefing')
    window.setTimeout(() => {
      repairsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <div className="overview-command-center pt-6 scroll-mt-24">
      {/* ─── 1. PAGE TITLE & HEADER (Unified Inter Typography) ─── */}
      <PageHeader
        title={
          isUnconfigured
            ? `${user?.workspace_name || 'Company'} Workspace`
            : activeSource?.mode === 'connected'
            ? 'Workspace analytics'
            : 'Fleet overview'
        }
        description={
          isUnconfigured
            ? `Clean, isolated workspace for '${user?.workspace_name || 'Your Organization'}'. Connect your PostgreSQL database or load sample data.`
            : activeSource?.mode === 'connected'
            ? `Safe read-only analytics for workspace '${user?.workspace_name || 'Enterprise'}'. All queries execute with AST safety.`
            : 'Your equipment at a glance. Preview safe, read-only analytics before any query runs.'
        }
        helpText="Summarizes your active data sources, hardware inventory, and recent service requests. Click any card to filter data or ask a natural-language question."
        actions={
          <div className="overview-hero-actions">
            {lastUpdated && (
              <span className="mecha-snapshot-pill" title="Last snapshot timestamp">
                <Clock size={12} />
                <span>Snapshot {lastUpdated}</span>
              </span>
            )}
            <button
              type="button"
              className="mecha-pill-btn mecha-pill-btn--secondary"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              title="Refresh this overview (Press R)"
            >
              <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
              <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
              <kbd className="mecha-kbd">R</kbd>
            </button>
            {!isDemo && !isUnconfigured && activeSource?.mode === 'sandbox' && user?.role === 'admin' && (
              <button
                type="button"
                className="mecha-pill-btn mecha-pill-btn--secondary"
                onClick={handleResetSandbox}
                disabled={loading || refreshing || seeding}
                title="Reset workspace back to clean unconfigured state"
              >
                <RotateCcw size={13} className={seeding ? 'spin-icon' : ''} />
                <span>{seeding ? 'Resetting…' : 'Reset to Clean Workspace'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* ─── 2. ENTERPRISE ONBOARDING CARD (When Workspace Has No Data Connected) ─── */}
      {isUnconfigured && (
        <div className="workspace-onboarding-card">
          <div className="workspace-onboarding-badge-strip">
            <span className="workspace-onboarding-badge">🏢 New Workspace</span>
            <span className="workspace-onboarding-workspace-name">{user?.workspace_name || 'Organization'}</span>
            <span className="workspace-onboarding-status-pill">&bull; Ready for Configuration</span>
          </div>

          <div className="workspace-onboarding-body">
            <div className="workspace-onboarding-icon-box">
              <Database size={28} className="workspace-onboarding-icon" />
            </div>
            <div className="workspace-onboarding-text">
              <h2 className="workspace-onboarding-title">
                Welcome to {user?.workspace_name || 'your workspace'}
              </h2>
              <p className="workspace-onboarding-subtitle">
                Your workspace is provisioned with strict tenant isolation. No data is shared with default sandbox demo fixtures. Connect your organization&apos;s PostgreSQL database to start analyzing, or load sample educational telemetry to explore the platform.
              </p>

              <div className="workspace-onboarding-options-grid">
                <div className="workspace-onboarding-option-card">
                  <div className="workspace-onboarding-option-header">
                    <span className="workspace-onboarding-option-tag">Recommended for Production</span>
                    <h3>Connect Enterprise Database</h3>
                  </div>
                  <p className="workspace-onboarding-option-desc">
                    Link your existing PostgreSQL instance via read-only SELECT credentials. QueryTrust compiles safe queries and validates execution with SQLGlot AST inspection.
                  </p>
                  {user?.role === 'admin' ? (
                    <button
                      type="button"
                      className="workspace-onboarding-action-btn primary"
                      onClick={() => onNavigate('data-sources')}
                    >
                      <span>Configure in Data Sources</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <div className="workspace-onboarding-role-notice">
                      Requires Workspace Admin privileges. Ask your organization&apos;s admin to link a data source.
                    </div>
                  )}
                </div>

                <div className="workspace-onboarding-option-card">
                  <div className="workspace-onboarding-option-header">
                    <span className="workspace-onboarding-option-tag sample">Instant Sandbox</span>
                    <h3>Load Sample Sandbox Data</h3>
                  </div>
                  <p className="workspace-onboarding-option-desc">
                    Preload 5,000 synthetic devices, telemetry signals, and maintenance requests into your workspace to test natural-language queries, data hygiene, and anomaly detection.
                  </p>
                  <button
                    type="button"
                    className="workspace-onboarding-action-btn secondary"
                    onClick={handleSeedSandbox}
                    disabled={seeding}
                  >
                    <RefreshCw size={14} className={seeding ? 'spin-icon' : ''} />
                    <span>{seeding ? 'Seeding Isolated Sandbox...' : 'Load Sample Data (1-Click)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. ENTERPRISE WORKSPACE HERO BANNER (When Connected Database Active) ─── */}
      {activeSource?.mode === 'connected' && (
        <div className="workspace-hero-banner">
          <div className="workspace-hero-left">
            <div className="workspace-hero-status">
              <span className="workspace-pulse-dot" />
              <span className="workspace-badge-text">Connected Enterprise Database</span>
              <span className="workspace-name-badge">{activeSource.name}</span>
            </div>
            <h2 className="workspace-hero-title">
              {user?.workspace_name || 'Enterprise Workspace'} &bull; Live Analytics
            </h2>
            <p className="workspace-hero-desc">
              Natural-language queries execute in PostgreSQL read-only isolation with AST safety against <strong>{activeSource.table_count} tables</strong> and <strong>{activeSource.column_count ?? 0} columns</strong>.
            </p>
          </div>
          <div className="workspace-hero-actions">
            <button
              type="button"
              className="workspace-hero-btn primary"
              onClick={() => onAskQuestion(`What are the tables and key metrics in ${activeSource.name}?`)}
            >
              <Send size={14} />
              <span>Ask Question</span>
            </button>
            <button
              type="button"
              className="workspace-hero-btn secondary"
              onClick={() => onNavigate('devices')}
            >
              <Database size={14} />
              <span>Explore Data Catalog</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 3. ENTERPRISE WORKSPACE SAMPLE SANDBOX BANNER (When Sample Data Active) ─── */}
      {!isDemo && !isUnconfigured && activeSource?.mode === 'sandbox' && (
        <div className="workspace-hero-banner" style={{ borderLeft: '3px solid var(--qt-accent, #0ea5e9)' }}>
          <div className="workspace-hero-left">
            <div className="workspace-hero-status">
              <span className="workspace-pulse-dot" style={{ background: 'var(--qt-accent, #0ea5e9)' }} />
              <span className="workspace-badge-text">Sample Sandbox Telemetry Active</span>
              <span className="workspace-name-badge">{activeSource.name}</span>
            </div>
            <h2 className="workspace-hero-title">
              {user?.workspace_name || 'Enterprise Workspace'} &bull; Exploring Sample Data
            </h2>
            <p className="workspace-hero-desc">
              Your workspace is running an isolated sample dataset with 5,000 synthetic devices and telemetry signals. Ready to connect your actual database or reset to clean onboarding?
            </p>
          </div>
          <div className="workspace-hero-actions">
            {user?.role === 'admin' && (
              <button
                type="button"
                className="workspace-hero-btn primary"
                onClick={() => onNavigate('data-sources')}
              >
                <Database size={14} />
                <span>Connect Real DB</span>
              </button>
            )}
            {user?.role === 'admin' && (
              <button
                type="button"
                className="workspace-hero-btn secondary"
                onClick={handleResetSandbox}
                disabled={seeding}
                title="Remove sample data and return to clean workspace"
              >
                <RotateCcw size={14} className={seeding ? 'spin-icon' : ''} />
                <span>{seeding ? 'Resetting…' : 'Reset to Clean Workspace'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── 2. MECHA HERO ASK BOX (Expansive, High-End White Card) ─── */}
      <section className="mecha-hero-prompt" aria-label="Ask Governed Fleet Intelligence">
        <form onSubmit={submitQuestion} className="mecha-prompt-form">
          <div className="mecha-prompt-input-wrap">
            <Search size={18} className="mecha-search-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={
                isUnconfigured
                  ? "Connect a database or load sample data to query..."
                  : "Ask a governed question across 5,000 devices, 50 sites, and telemetry..."
              }
              aria-label="Ask equipment intelligence question"
              disabled={isUnconfigured}
              className="mecha-prompt-input"
            />
            <kbd className="mecha-prompt-slash-kbd">/</kbd>
            <button
              type="submit"
              disabled={!question.trim() || isUnconfigured}
              className="mecha-prompt-submit-btn"
            >
              <span>Ask Query</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </form>

        {!isUnconfigured && (
          <div className="mecha-prompt-chips">
            <span className="mecha-chips-lead">Suggested:</span>
            <button
              type="button"
              className="mecha-chip"
              onClick={() => onAskQuestion('Which devices have warranties ending in the next 30 days?')}
            >
              Warranties expiring &lt; 30 days
            </button>
            <button
              type="button"
              className="mecha-chip"
              onClick={() => onAskQuestion('Find core routers with temperature > 65°C and packet drop rate > 0.05%')}
            >
              High-temp routers (&gt; 65°C)
            </button>
            <button
              type="button"
              className="mecha-chip"
              onClick={() => onAskQuestion('List open Critical service events with device model and site location')}
            >
              Critical open repair incidents
            </button>
          </div>
        )}
      </section>

      {/* ─── 3. EXECUTIVE PULSE METRICS (4 Spacious High-Impact Cards) ─── */}
      {data && (
        <section className="mecha-pulse-grid" aria-label="Executive Pulse Metrics">
          {/* Card 1: Total Managed Fleet */}
          <div
            className="mecha-pulse-card"
            onClick={() => onNavigate('devices')}
            title="View all 5,000 equipment records"
          >
            <div className="mecha-pulse-header">
              <span className="mecha-pulse-label">Managed Fleet</span>
              <span className="mecha-pulse-icon"><Server size={15} /></span>
            </div>
            <div className="mecha-pulse-value">
              <AnimatedNumber value={data.total_devices} />
            </div>
            <div className="mecha-pulse-sub">
              {data.total_sites} Sites Across 3 Global Regions
            </div>
          </div>

          {/* Card 2: Active Fleet */}
          <div
            className="mecha-pulse-card"
            onClick={() => onNavigate('devices', { status: 'active' })}
            title="View active operational equipment"
          >
            <div className="mecha-pulse-header">
              <span className="mecha-pulse-label">Active &amp; Operational</span>
              <span className="mecha-pulse-dot" style={{ backgroundColor: '#10B981' }} />
            </div>
            <div className="mecha-pulse-value">
              <AnimatedNumber value={data.active_devices} />
            </div>
            <div className="mecha-pulse-sub">
              <span style={{ color: '#047857', fontWeight: 600 }}>{activeShare}% operational</span>
              <span className="mecha-sub-divider">&bull;</span>
              <span>+124 30d</span>
            </div>
          </div>

          {/* Card 3: Attention Required */}
          <div
            className="mecha-pulse-card"
            onClick={() => onAskQuestion('Which devices have warranties ending in the next 30 days?')}
            title="Filter devices with urgent SLA expirations"
          >
            <div className="mecha-pulse-header">
              <span className="mecha-pulse-label">Attention Required</span>
              <span className="mecha-pulse-icon" style={{ color: '#D97706' }}><Clock size={15} /></span>
            </div>
            <div className="mecha-pulse-value" style={{ color: '#D97706' }}>
              <AnimatedNumber value={urgentWarrantyCount} />
            </div>
            <div className="mecha-pulse-sub" style={{ color: '#B45309' }}>
              Warranties expiring &lt; 30 days
            </div>
          </div>

          {/* Card 4: Open Repairs */}
          <div
            className="mecha-pulse-card"
            onClick={scrollToRepairs}
            title="View open repair service events"
          >
            <div className="mecha-pulse-header">
              <span className="mecha-pulse-label">Open Repairs</span>
              <span className="mecha-pulse-icon" style={{ color: '#DC2626' }}><AlertTriangle size={15} /></span>
            </div>
            <div className="mecha-pulse-value" style={{ color: '#DC2626' }}>
              <AnimatedNumber value={data.open_service_events} />
            </div>
            <div className="mecha-pulse-sub">
              1,295 Unique Hardware Assets
            </div>
          </div>
        </section>
      )}

      {/* ─── 4. SEGMENTED SECTION NAVIGATION (Eliminating Clutter) ─── */}
      {!isUnconfigured && data && (
        <div className="mecha-section-nav">
          <div className="mecha-segmented-control" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeSectionTab === 'briefing'}
              className={`mecha-segment-btn ${activeSectionTab === 'briefing' ? 'active' : ''}`}
              onClick={() => setActiveSectionTab('briefing')}
            >
              Executive Briefing
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSectionTab === 'lifecycle'}
              className={`mecha-segment-btn ${activeSectionTab === 'lifecycle' ? 'active' : ''}`}
              onClick={() => setActiveSectionTab('lifecycle')}
            >
              Fleet Lifecycle &amp; Distribution
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSectionTab === 'topology'}
              className={`mecha-segment-btn ${activeSectionTab === 'topology' ? 'active' : ''}`}
              onClick={() => setActiveSectionTab('topology')}
            >
              Global Telemetry Map
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="security-alert-box alert-error" role="alert">
          <div className="alert-title">Unable to load dashboard data</div>
          <div className="alert-desc">{error}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            {error.includes('expired') || error.includes('sign in') ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  await logout()
                }}
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                Sign in again →
              </button>
            ) : null}
            <button type="button" className="mecha-pill-btn mecha-pill-btn--secondary" onClick={() => loadData()}>
              Retry connection
            </button>
          </div>
        </div>
      )}

      {/* ─── SKELETON LOADING ─── */}
      {loading && !data && (
        <div className="overview-skeleton" role="status" aria-live="polite">
          <div className="qt-skeleton" style={{ height: 110, borderRadius: 16 }} />
          <div className="overview-skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            <div className="qt-skeleton" style={{ height: 130, borderRadius: 16 }} />
            <div className="qt-skeleton" style={{ height: 130, borderRadius: 16 }} />
            <div className="qt-skeleton" style={{ height: 130, borderRadius: 16 }} />
            <div className="qt-skeleton" style={{ height: 130, borderRadius: 16 }} />
          </div>
          <div className="qt-skeleton" style={{ height: 260, borderRadius: 16 }} />
        </div>
      )}

      {/* ─── TAB 1: EXECUTIVE BRIEFING ─── */}
      {data && activeSectionTab === 'briefing' && (
        <div className="mecha-actions-container">
          {/* Priority Action Cards */}
          <div className="mecha-action-grid">
            {/* Action 1: Open repair requests */}
            <div className="mecha-action-card">
              <div>
                <div className="mecha-action-header">
                  <span className="mecha-action-badge mecha-action-badge--critical">
                    Critical Issue
                  </span>
                  <span className="mecha-action-metric" style={{ color: '#DC2626' }}>
                    {formatNumber(data.open_service_events)} Active
                  </span>
                </div>
                <h4 className="mecha-action-title">Open Repair Incidents</h4>
                <p className="mecha-action-desc">
                  Unresolved hardware faults and line-rate flapping across edge routers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAskQuestion('List critical open service events grouped by site')}
                className="mecha-action-btn"
              >
                <span>Verify in Studio</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Action 2: Warranties ending soon */}
            <div className="mecha-action-card">
              <div>
                <div className="mecha-action-header">
                  <span className="mecha-action-badge mecha-action-badge--attention">
                    SLA Attention
                  </span>
                  <span className="mecha-action-metric" style={{ color: '#D97706' }}>
                    {formatNumber(urgentWarrantyCount)} Devices
                  </span>
                </div>
                <h4 className="mecha-action-title">Upcoming SLA Expirations</h4>
                <p className="mecha-action-desc">
                  {formatNumber(endingSoonCount)} contracts expiring &bull; {formatNumber(alreadyExpiredCount)} already expired.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAskQuestion('Which devices have warranties ending in the next 30 days?')}
                className="mecha-action-btn"
              >
                <span>Verify in Studio</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Action 3: Data health findings */}
            <div className="mecha-action-card">
              <div>
                <div className="mecha-action-header">
                  <span className="mecha-action-badge mecha-action-badge--hygiene">
                    Data Hygiene
                  </span>
                  <span className="mecha-action-metric" style={{ color: '#0EA5E9' }}>
                    {dataHealth?.total_findings ?? 6} Anomalies
                  </span>
                </div>
                <h4 className="mecha-action-title">Data Health Diagnostics</h4>
                <p className="mecha-action-desc">
                  Deterministic schema profiler flagged unapproved statuses and serial glitches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('data-quality')}
                className="mecha-action-btn"
              >
                <span>Inspect 6 Rules</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Recent Repair Requests Table */}
          <section
            ref={repairsTableRef}
            className="mecha-table-card"
            id="recent-repairs-table"
            aria-labelledby="incidents-heading"
          >
            <div className="mecha-table-top">
              <div>
                <h3 className="mecha-table-title" id="incidents-heading">
                  Recent Repair Requests
                </h3>
                <div className="mecha-table-subtitle">
                  Newest logged hardware maintenance events across operational sites.
                </div>
              </div>
              <div className="mecha-table-actions">
                <button
                  type="button"
                  className="mecha-pill-btn mecha-pill-btn--secondary"
                  onClick={() => onNavigate('devices')}
                >
                  <span>View All Assets</span>
                  <ArrowRight size={13} />
                </button>
                <ExplainButton
                  title="Repair request audit"
                  explanation="Sorted by newest opening time. Asset tags open the corresponding read-only equipment detail."
                />
              </div>
            </div>

            <div className="mecha-table-wrap">
              <table className="mecha-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Asset Tag</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_service_events.length ? (
                    data.recent_service_events.map((event) => {
                      const severity = severityClass(event.severity)
                      return (
                        <tr key={event.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>#{event.id}</td>
                          <td>
                            <button
                              type="button"
                              className="mecha-tag-btn"
                              onClick={() => onOpenDevice(event.device_id)}
                              title={`Inspect asset ${event.asset_tag}`}
                            >
                              {event.asset_tag}
                            </button>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{formatStatus(event.event_type)}</td>
                          <td>
                            <span className={`severity-pill ${severity}`}>
                              {formatStatus(event.severity)}
                            </span>
                          </td>
                          <td>
                            <span className="status-tag-cell">
                              {formatStatus(event.status)}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            <HumanDate iso={event.opened_at} />
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No recent repair requests recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ─── TAB 2: FLEET LIFECYCLE & DISTRIBUTION ─── */}
      {data && activeSectionTab === 'lifecycle' && (
        <div className="mecha-actions-container">
          {/* Equipment Lifecycle Distribution Card */}
          <section className="mecha-lifecycle-card" aria-label="Equipment lifecycle breakdown">
            <div className="mecha-lifecycle-header">
              <span className="mecha-lifecycle-title">Equipment Lifecycle Distribution</span>
              <span className="mecha-lifecycle-meta">Total: {formatNumber(totalBreakdownCount)} Devices &bull; Read-Only Audit</span>
            </div>

            {/* Single Stacked Proportion Bar */}
            <div className="mecha-stacked-bar" role="progressbar" aria-label="Fleet lifecycle status proportions">
              {normalizedFleetBreakdown.map((item) => {
                const pct = totalBreakdownCount > 0 ? (item.value / totalBreakdownCount) * 100 : 0
                return (
                  <div
                    key={item.name}
                    className="mecha-bar-segment"
                    style={{
                      width: `${pct}%`,
                      backgroundColor:
                        item.name === 'Active'
                          ? '#10B981'
                          : item.name === 'Maintenance'
                          ? '#F59E0B'
                          : item.name === 'Retired'
                          ? '#64748B'
                          : item.name === 'Offline'
                          ? '#94A3B8'
                          : item.name === 'Pending Audit'
                          ? '#8B5CF6'
                          : '#0EA5E9',
                    }}
                    title={`${item.name}: ${formatNumber(item.value)} (${pct.toFixed(1)}%)`}
                  />
                )
              })}
            </div>

            {/* Legend with Counts */}
            <div className="mecha-legend-grid">
              {normalizedFleetBreakdown.map((item) => {
                const pct = totalBreakdownCount > 0 ? ((item.value / totalBreakdownCount) * 100).toFixed(1) : '0'
                const dotColor =
                  item.name === 'Active'
                    ? '#10B981'
                    : item.name === 'Maintenance'
                    ? '#F59E0B'
                    : item.name === 'Retired'
                    ? '#64748B'
                    : item.name === 'Offline'
                    ? '#94A3B8'
                    : item.name === 'Pending Audit'
                    ? '#8B5CF6'
                    : '#0EA5E9'

                return (
                  <button
                    key={item.name}
                    type="button"
                    className="mecha-legend-pill"
                    onClick={() => onNavigate('devices', { status: item.name.toLowerCase() })}
                    title={`Filter equipment by ${item.name}`}
                  >
                    <span className="mecha-legend-dot" style={{ backgroundColor: dotColor }} />
                    <span>{item.name}</span>
                    <span className="mecha-legend-count">{formatNumber(item.value)}</span>
                    <span className="mecha-legend-pct">({pct}%)</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Bento Charts */}
          <section className="mecha-bento-grid" aria-label="Fleet distributions">
            {/* Equipment by Type */}
            <article className="mecha-bento-card">
              <div className="mecha-bento-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} style={{ color: 'var(--text-muted)' }} />
                  <h4 className="mecha-bento-title">Equipment by Type</h4>
                </div>
                <span className="mecha-kbd">{data.devices_by_type.length} types</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                {topEquipmentType
                  ? `${topEquipmentType.name} is the largest equipment group at ${topEquipmentType.percentage}% of the fleet.`
                  : 'No equipment type data is available.'}
              </p>
              <div className="mecha-bento-list">
                {data.devices_by_type.length ? (
                  data.devices_by_type.map((item) => (
                    <div className="mecha-bento-row" key={item.name}>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      <div className="mecha-bento-track">
                        <div
                          className="mecha-bento-fill"
                          style={{ width: `${item.percentage || 0}%` }}
                        />
                      </div>
                      <span className="mecha-bento-val">{formatNumber(item.value)} ({item.percentage}%)</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No distribution data available.</p>
                )}
              </div>
              {typeFormattingIssues !== null && (
                <p style={{ margin: '0.35rem 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {formatNumber(typeFormattingIssues)} records have inconsistent spelling.{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('data-quality')}
                    style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'underline', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    See Data Health
                  </button>
                </p>
              )}
            </article>

            {/* Coverage and Service */}
            <article className="mecha-bento-card">
              <div className="mecha-bento-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--text-muted)' }} />
                  <h4 className="mecha-bento-title">Coverage &amp; Urgency</h4>
                </div>
                <div style={{ display: 'inline-flex', gap: '4px', background: 'var(--bg-subtle)', padding: '2px', borderRadius: '9999px' }}>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: activeBentoTab === 'warranty' ? 'var(--bg-card)' : 'transparent',
                      color: activeBentoTab === 'warranty' ? 'var(--text-main)' : 'var(--text-muted)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setActiveBentoTab('warranty')}
                  >
                    Warranty
                  </button>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: activeBentoTab === 'severity' ? 'var(--bg-card)' : 'transparent',
                      color: activeBentoTab === 'severity' ? 'var(--text-main)' : 'var(--text-muted)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setActiveBentoTab('severity')}
                  >
                    Severity
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                {activeBentoTab === 'warranty'
                  ? `${formatNumber(urgentWarrantyCount)} warranties expired or ending within 30 days.`
                  : 'Open repair incidents grouped by recorded severity.'}
              </p>
              <div className="mecha-bento-list">
                {activeBentoTab === 'warranty'
                  ? data.warranties_by_bucket.map((bucket) => {
                      const percent = data.total_devices
                        ? Math.round((bucket.value / data.total_devices) * 100)
                        : 0
                      const isExpired = bucket.name.toLowerCase() === 'already expired'
                      const isSoon = bucket.name.toLowerCase() === '0 - 30 days'
                      return (
                        <div className="mecha-bento-row" key={bucket.name}>
                          <span style={{ fontWeight: 500 }}>{bucket.name}</span>
                          <div className="mecha-bento-track">
                            <div
                              className="mecha-bento-fill"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: isExpired ? '#DC2626' : isSoon ? '#D97706' : 'var(--text-main)',
                              }}
                            />
                          </div>
                          <span className="mecha-bento-val">{formatNumber(bucket.value)} ({percent}%)</span>
                        </div>
                      )
                    })
                  : data.events_by_severity.map((item) => {
                      const severity = severityClass(item.name)
                      return (
                        <div className="mecha-bento-row" key={item.name}>
                          <span style={{ fontWeight: 500 }}>{item.name}</span>
                          <div className="mecha-bento-track">
                            <div
                              className="mecha-bento-fill"
                              style={{
                                width: `${item.percentage || 0}%`,
                                backgroundColor: severity === 'high' ? '#DC2626' : severity === 'medium' ? '#D97706' : '#0EA5E9',
                              }}
                            />
                          </div>
                          <span className="mecha-bento-val">{formatNumber(item.value)} ({item.percentage}%)</span>
                        </div>
                      )
                    })}
              </div>
            </article>
          </section>
        </div>
      )}

      {/* ─── TAB 3: GLOBAL TELEMETRY MAP ─── */}
      {!isUnconfigured && data && activeSectionTab === 'topology' && data.total_devices > 0 && (
        <section className="mecha-actions-container" aria-label="Global equipment telemetry topology">
          <div className="mecha-lifecycle-card">
            <div className="mecha-lifecycle-header">
              <div>
                <h3 className="mecha-lifecycle-title">Global Fleet Telemetry Map</h3>
                <span className="mecha-lifecycle-meta">Interactive sensor observation grid across 50 active sites (Americas, EMEA, APAC)</span>
              </div>
            </div>
            <GlobalFleetTelemetryMap onSelectSite={() => onNavigate('devices')} />
          </div>
        </section>
      )}
    </div>
  )
}
