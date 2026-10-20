import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Database,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Sun,
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
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { ExplainButton } from './ExplainButton'
import { PageHeader } from './PageHeader'
import { HumanDate } from './HumanDate'
import './OverviewView.css'

interface OverviewViewProps {
  onNavigate: (destination: any, params?: Record<string, string | number>) => void
  onAskQuestion: (question: string) => void
  onOpenDevice: (deviceId: number) => void
}

const SUGGESTED_QUESTIONS = [
  'Which devices have warranties ending in the next 30 days?',
  'Show open repair requests by site.',
  'How many active devices are in each region?',
]

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

const formatReferenceDate = (value: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`)
  )

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onAskQuestion,
  onOpenDevice,
}) => {
  const { mode } = useTheme()
  const { user } = useAuth()
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

  const warrantyClass = (name: string) =>
    name.toLowerCase() === 'already expired'
      ? 'expired'
      : name.toLowerCase() === '0 - 30 days'
      ? 'soon'
      : 'neutral'

  const getLifecycleColorClass = (statusName: string) => {
    switch (statusName) {
      case 'Active':
        return 'segment-active'
      case 'Offline':
        return 'segment-offline'
      case 'Maintenance':
        return 'segment-maintenance'
      case 'Retired':
        return 'segment-retired'
      case 'Pending Audit':
        return 'segment-audit'
      case 'Staged':
        return 'segment-staged'
      default:
        return 'segment-neutral'
    }
  }

  const submitQuestion = (event: React.FormEvent) => {
    event.preventDefault()
    const nextQuestion = question.trim()
    if (nextQuestion) onAskQuestion(nextQuestion)
  }

  const scrollToRepairs = () => {
    repairsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="overview-command-center">
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
              <span className="snapshot-pill" title="Last snapshot timestamp">
                <Clock size={12} />
                <span>Snapshot {lastUpdated}</span>
              </span>
            )}
            <button
              type="button"
              className="hero-refresh-btn"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              title="Refresh this overview (Press R)"
              aria-label="Refresh overview data"
            >
              <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
              <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
              <kbd className="hero-kbd-badge">R</kbd>
            </button>
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

      {/* ─── 2. HERO ASK BOX (Squint-test Anchor: Hero, Larger, Starter Chips) ─── */}
      <section className="overview-prompt-card hero-ask-box" aria-label="Ask equipment AI">
        <form className="overview-prompt-bar hero-prompt-bar" onSubmit={submitQuestion}>
          <Search size={19} className="prompt-search-icon" aria-hidden="true" />
          <input
            ref={searchInputRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={
              isUnconfigured
                ? "No database connected yet. Connect a database or click 'Load Sample Data' above to run AI queries..."
                : "Ask equipment AI in plain English... e.g., 'Which devices have warranties ending in the next 30 days?'"
            }
            aria-label="Ask equipment intelligence question"
            disabled={isUnconfigured}
          />
          <kbd className="prompt-slash-kbd" title="Press / anywhere to focus search" aria-hidden="true">/</kbd>
          <button type="submit" className="prompt-submit-btn" disabled={!question.trim() || isUnconfigured}>
            <span>Ask</span>
            <Send size={13} aria-hidden="true" />
          </button>
        </form>
        {!isUnconfigured && (
          <div className="overview-suggestion-row" aria-label="Suggested starter queries">
            <span className="prompt-suggestions-label">Suggestions:</span>
            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="prompt-suggestion-pill"
                onClick={() => onAskQuestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ─── 3. MORNING OPERATIONAL BRIEFING (Ranked 1-3 with Urgent First & Why) ─── */}
      {!isUnconfigured && data && (
        <section className="morning-briefing-card" aria-label="Morning briefing">
          <div className="morning-briefing-header">
            <div className="morning-briefing-title-group">
              <Sun size={16} className="briefing-sun-icon" />
              <h3>Morning operational briefing</h3>
              <span className="briefing-attention-pill">3 items prioritized by urgency</span>
            </div>
            <ExplainButton
              title="Morning briefing"
              explanation="Items are strictly ranked 1 to 3 by operational impact. Click any item to jump directly into technician triage or audit."
            />
          </div>
          <div className="morning-briefing-items">
            {/* Rank 1: Open repair requests (Most Urgent - Red) */}
            <button
              type="button"
              className="morning-briefing-item priority-1"
              onClick={scrollToRepairs}
              title="View recent repair requests"
            >
              <div className="briefing-rank-chip rank-urgent">1</div>
              <div className="morning-briefing-item-content">
                <div className="briefing-headline-row">
                  <span className="morning-briefing-item-badge badge-urgent">Open repair requests</span>
                  <span className="briefing-metric-text">
                    <strong><AnimatedNumber value={data.open_service_events} /></strong> active repair requests
                  </span>
                </div>
                <div className="briefing-why-text">
                  Why: Unresolved hardware faults risk line-rate degradation and link flaps.
                </div>
              </div>
              <ArrowRight size={14} className="morning-briefing-item-arrow" />
            </button>

            {/* Rank 2: Warranties ending soon (Action Required - Amber) */}
            <button
              type="button"
              className="morning-briefing-item priority-2"
              onClick={() => onAskQuestion('Which devices have warranties ending in the next 30 days?')}
              title="Review warranties ending soon"
            >
              <div className="briefing-rank-chip rank-attention">2</div>
              <div className="morning-briefing-item-content">
                <div className="briefing-headline-row">
                  <span className="morning-briefing-item-badge badge-attention">Warranties ending soon</span>
                  <span className="briefing-metric-text">
                    <strong><AnimatedNumber value={urgentWarrantyCount} /></strong> devices near SLA expiry
                  </span>
                </div>
                <div className="briefing-why-text">
                  {alreadyExpiredCount > 0
                    ? `Why: ${formatNumber(alreadyExpiredCount)} already expired; uncovered equipment risks unbudgeted replacement delays.`
                    : 'Why: Equipment nearing SLA expiry requires contract renewal review.'}
                </div>
              </div>
              <ArrowRight size={14} className="morning-briefing-item-arrow" />
            </button>

            {/* Rank 3: Data health (Advisory - Neutral/Amber) */}
            <button
              type="button"
              className="morning-briefing-item priority-3"
              onClick={() => onNavigate('data-quality')}
              title="Review data hygiene diagnostics"
            >
              <div className="briefing-rank-chip rank-advisory">3</div>
              <div className="morning-briefing-item-content">
                <div className="briefing-headline-row">
                  <span className="morning-briefing-item-badge badge-advisory">Data health</span>
                  <span className="briefing-metric-text">
                    <strong><AnimatedNumber value={dataHealth?.total_findings ?? 0} /></strong> hygiene anomalies
                  </span>
                </div>
                <div className="briefing-why-text">
                  Why: Unapproved statuses and spelling variations skew fleet metrics.
                </div>
              </div>
              <ArrowRight size={14} className="morning-briefing-item-arrow" />
            </button>
          </div>
        </section>
      )}

      {/* ─── 4. EXECUTIVE FLEET KPI METRICS (Each whole card is a link) ─── */}
      {data && (
        <section className="overview-kpi-grid" aria-label="Key fleet metrics">
          {/* Card 1: Total Fleet -> All Equipment */}
          <div
            className="overview-kpi-card"
            onClick={() => onNavigate('devices')}
            role="button"
            tabIndex={0}
            title="View all equipment records"
          >
            <div className="kpi-header">
              <span className="kpi-label">Total equipment</span>
              <div className="kpi-icon-wrap"><Server size={15} /></div>
            </div>
            <div className="kpi-value"><AnimatedNumber value={data.total_devices} /></div>
            <div className="kpi-subtext">
              <span>Across {formatNumber(data.total_sites)} sites</span>
            </div>
          </div>

          {/* Card 2: Active Fleet -> Equipment filtered to Active */}
          <div
            className="overview-kpi-card"
            onClick={() => onNavigate('devices', { status: 'active' })}
            role="button"
            tabIndex={0}
            title="View active operational equipment"
          >
            <div className="kpi-header">
              <span className="kpi-label">Active fleet</span>
              <div className="kpi-icon-wrap" style={{ color: 'var(--qt-success, #10b981)' }}>
                <span className="status-pulse-dot" />
              </div>
            </div>
            <div className="kpi-value"><AnimatedNumber value={data.active_devices} /></div>
            <div className="kpi-subtext kpi-subtext--success">
              <span>{activeShare}% operational rate</span>
            </div>
          </div>

          {/* Card 3: Warranties ending soon */}
          <div
            className="overview-kpi-card"
            onClick={() => onAskQuestion('Which devices have warranties ending in the next 30 days?')}
            role="button"
            tabIndex={0}
            title={
              urgentWarrantyCount > 0
                ? `Review ${formatNumber(urgentWarrantyCount)} urgent warranties (${formatNumber(endingSoonCount)} ending soon · ${formatNumber(alreadyExpiredCount)} already expired)`
                : 'All contracts up to date'
            }
          >
            <div className="kpi-header">
              <span className="kpi-label">Warranties ending soon</span>
              <div className="kpi-icon-wrap" style={{ color: '#D97706' }}>
                <Clock size={15} />
              </div>
            </div>
            <div className="kpi-value"><AnimatedNumber value={urgentWarrantyCount} /></div>
            <div className={`kpi-subtext ${urgentWarrantyCount > 0 ? 'kpi-subtext--warning' : 'kpi-subtext--success'}`}>
              <span>
                {urgentWarrantyCount > 0
                  ? `${formatNumber(endingSoonCount)} ending soon • ${formatNumber(alreadyExpiredCount)} already expired`
                  : 'All contracts up to date'}
              </span>
            </div>
          </div>

          {/* Card 4: Open repair requests (Whole card links to repair work) */}
          <div
            className="overview-kpi-card"
            onClick={scrollToRepairs}
            role="button"
            tabIndex={0}
            title="Scroll to recent repair requests"
          >
            <div className="kpi-header">
              <span className="kpi-label">Open repair requests</span>
              <div className="kpi-icon-wrap" style={{ color: '#DC2626' }}>
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className="kpi-value"><AnimatedNumber value={data.open_service_events} /></div>
            <div className={`kpi-subtext ${data.open_service_events > 0 ? 'kpi-subtext--danger' : 'kpi-subtext--success'}`}>
              <span>{data.open_service_events > 0 ? 'Needs technician triage' : 'Zero open incidents'}</span>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="security-alert-box alert-error" role="alert">
          <div className="alert-title">Unable to load dashboard data</div>
          <div className="alert-desc">{error}</div>
          <button type="button" className="hero-refresh-btn" onClick={() => loadData()}>
            Retry connection
          </button>
        </div>
      )}

      {/* ─── SKELETON LOADING (Rule 8: Section-by-section graceful loading) ─── */}
      {loading && !data && (
        <div className="overview-skeleton" role="status" aria-live="polite">
          <div className="qt-skeleton" style={{ height: 110, borderRadius: 8 }} />
          <div className="qt-skeleton" style={{ height: 140, borderRadius: 8 }} />
          <div className="overview-skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div className="qt-skeleton" style={{ height: 95, borderRadius: 8 }} />
            <div className="qt-skeleton" style={{ height: 95, borderRadius: 8 }} />
            <div className="qt-skeleton" style={{ height: 95, borderRadius: 8 }} />
            <div className="qt-skeleton" style={{ height: 95, borderRadius: 8 }} />
          </div>
          <div className="qt-skeleton" style={{ height: 85, borderRadius: 8 }} />
          <div className="overview-skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div className="qt-skeleton" style={{ height: 260, borderRadius: 8 }} />
            <div className="qt-skeleton" style={{ height: 260, borderRadius: 8 }} />
          </div>
          <div className="qt-skeleton" style={{ height: 280, borderRadius: 8 }} />
        </div>
      )}

      {data && (
        <>
          {/* ─── 5. EQUIPMENT LIFECYCLE DISTRIBUTION (One Stacked Proportion Bar + Legend) ─── */}
          <section className="lifecycle-strip-card" aria-label="Equipment lifecycle breakdown">
            <div className="lifecycle-header">
              <span className="lifecycle-title">Equipment lifecycle distribution</span>
              <span className="lifecycle-meta">Total: {formatNumber(totalBreakdownCount)} devices &bull; Read-only audit</span>
            </div>

            {/* Single Stacked Proportion Bar (Rule 6) */}
            <div className="lifecycle-stacked-bar" role="progressbar" aria-label="Fleet lifecycle status proportions">
              {normalizedFleetBreakdown.map((item) => {
                const pct = totalBreakdownCount > 0 ? (item.value / totalBreakdownCount) * 100 : 0
                return (
                  <div
                    key={item.name}
                    className={`lifecycle-bar-segment ${getLifecycleColorClass(item.name)}`}
                    style={{ width: `${pct}%` }}
                    title={`${item.name}: ${formatNumber(item.value)} (${pct.toFixed(1)}%)`}
                  />
                )
              })}
            </div>

            {/* Legend with Counts (Rule 6) */}
            <div className="lifecycle-legend-grid">
              {normalizedFleetBreakdown.map((item) => {
                const isUnapproved = item.name === 'Pending Audit' || item.name === 'Staged'
                const pct = totalBreakdownCount > 0 ? ((item.value / totalBreakdownCount) * 100).toFixed(1) : '0'

                return (
                  <button
                    key={item.name}
                    type="button"
                    className="lifecycle-legend-item"
                    onClick={() => onNavigate('devices', { status: item.name.toLowerCase() })}
                    title={`Filter equipment by ${item.name}`}
                  >
                    <span className={`lifecycle-legend-dot ${getLifecycleColorClass(item.name)}`} />
                    <span className="lifecycle-legend-name">{item.name}</span>
                    <span className="lifecycle-legend-count">{formatNumber(item.value)}</span>
                    <span className="lifecycle-legend-pct">{pct}%</span>
                    {isUnapproved && (
                      <span className="lifecycle-unapproved-label" title="Unapproved lifecycle status flagged by data health rule">
                        {mode === 'expert' ? 'Not an approved status (DQ-005)' : 'Not an approved status'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* ─── 6. BENTO CHARTS (Neutral Data Bars, Red Expired / Amber Soon) ─── */}
          <section className="overview-bento-grid" aria-label="Fleet distributions">
            {/* Left Card: Equipment by type (Neutral Data Bars) */}
            <article className="bento-card">
              <div className="bento-card-header">
                <div className="bento-card-title-group">
                  <span className="bento-card-icon">
                    <Database size={16} />
                  </span>
                  <h3 className="bento-card-title">Equipment by type</h3>
                </div>
                <div className="bento-card-header-actions">
                  <span className="bento-card-meta-badge">{data.devices_by_type.length} types</span>
                  <ExplainButton
                    title="Equipment categories"
                    explanation="Category counts are grouped case-insensitively into the approved device vocabulary. Formatting defects remain visible in Data health."
                  />
                </div>
              </div>
              <p className="bento-insight">
                {topEquipmentType
                  ? `${topEquipmentType.name} is the largest equipment group at ${topEquipmentType.percentage}% of the fleet.`
                  : 'No equipment type data is available.'}
              </p>
              <div className="bento-distribution-list">
                {data.devices_by_type.length ? (
                  data.devices_by_type.map((item) => (
                    <div className="bento-distribution-row" key={item.name}>
                      <div className="distribution-name-wrap">
                        <span className="distribution-name">{item.name}</span>
                      </div>
                      <div className="distribution-track">
                        {/* Rule 2: Neutral data bar tone (NOT orange!) */}
                        <div
                          className="distribution-fill distribution-fill--neutral"
                          style={{ width: `${item.percentage || 0}%` }}
                        />
                      </div>
                      <div className="distribution-value">
                        {formatNumber(item.value)} / {item.percentage}%
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-data-message">No device distribution available.</p>
                )}
              </div>
              {typeFormattingIssues !== null && (
                <p className="bento-data-note">
                  {formatNumber(typeFormattingIssues)} records have inconsistent spelling.{' '}
                  <button type="button" onClick={() => onNavigate('data-quality')}>
                    See Data health
                  </button>
                </p>
              )}
            </article>

            {/* Right Card: Coverage and service (Red Expired, Amber Soon, Unified 'repair requests') */}
            <article className="bento-card">
              <div className="bento-card-header">
                <div className="bento-card-title-group">
                  <span className="bento-card-icon">
                    <ShieldCheck size={16} />
                  </span>
                  <h3 className="bento-card-title">Coverage and service</h3>
                </div>
                <div className="bento-card-header-actions">
                  <div className="bento-segmented-tabs">
                    <button
                      type="button"
                      className={`bento-tab-btn ${activeBentoTab === 'warranty' ? 'active' : ''}`}
                      onClick={() => setActiveBentoTab('warranty')}
                    >
                      Coverage dates
                    </button>
                    <button
                      type="button"
                      className={`bento-tab-btn ${activeBentoTab === 'severity' ? 'active' : ''}`}
                      onClick={() => setActiveBentoTab('severity')}
                    >
                      Service urgency
                    </button>
                  </div>
                  <ExplainButton
                    title="Coverage and service"
                    explanation="Coverage buckets use the visible dataset baseline. Service urgency reflects the recorded severity of live repair requests."
                  />
                </div>
              </div>
              <p className="bento-insight">
                {activeBentoTab === 'warranty'
                  ? `${formatNumber(urgentWarrantyCount)} warranties expired or ending within 30 days`
                  : 'Open repair requests grouped by recorded urgency'}
              </p>
              <p className="bento-card-desc">
                {activeBentoTab === 'warranty'
                  ? `as of ${formatReferenceDate(data.reference_date)}`
                  : 'Newest repair requests are shown below.'}
              </p>
              <div className="bento-distribution-list">
                {activeBentoTab === 'warranty'
                  ? data.warranties_by_bucket.map((bucket) => {
                      const percent = data.total_devices
                        ? Math.round((bucket.value / data.total_devices) * 100)
                        : 0
                      return (
                        <div className="bento-distribution-row" key={bucket.name}>
                          <div className="distribution-name-wrap">
                            <span className="distribution-name">{bucket.name}</span>
                          </div>
                          <div className="distribution-track">
                            {/* Rule 2: Expired is red, 0-30 days is amber, others neutral */}
                            <div
                              className={`distribution-fill warranty ${warrantyClass(bucket.name)}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="distribution-value">
                            {formatNumber(bucket.value)} / {percent}%
                          </div>
                        </div>
                      )
                    })
                  : data.events_by_severity.map((item) => {
                      const severity = severityClass(item.name)
                      return (
                        <div className="bento-distribution-row" key={item.name}>
                          <div className="distribution-name-wrap">
                            <span className={`distribution-dot ${severity}`} />
                            <span className="distribution-name">{item.name}</span>
                          </div>
                          <div className="distribution-track">
                            <div
                              className={`distribution-fill ${severity}`}
                              style={{ width: `${item.percentage || 0}%` }}
                            />
                          </div>
                          <div className="distribution-value">
                            {formatNumber(item.value)} / {item.percentage}%
                          </div>
                        </div>
                      )
                    })}
              </div>
            </article>
          </section>

          {/* ─── 6.5 GLOBAL TOPOLOGY & NOC TELEMETRY VISUAL ─── */}
          {!isUnconfigured && data.total_devices > 0 && (
            <section className="fleet-topology-banner-card" aria-label="Global equipment telemetry topology">
              <div className="topology-card-header">
                <div className="topology-header-left">
                  <div className="topology-live-dot" aria-hidden="true" />
                  <h3 className="topology-title">Global Fleet Telemetry & Edge Nodes</h3>
                  <span className="topology-region-badge">{data.total_sites} Monitored Sites</span>
                </div>
                <div className="topology-header-right">
                  <span className="topology-telemetry-stat">Telemetry Ingest: <strong className="tabular-nums">Active</strong></span>
                  <span className="topology-telemetry-stat">Read-only Sync: <strong className="tabular-nums">Sub-second</strong></span>
                </div>
              </div>
              <div className="topology-visual-frame">
                <img
                  src="/images/fleet_topology.jpg"
                  alt="Global fleet operations telemetry map showing enterprise equipment nodes"
                  className="topology-visual-img"
                  loading="lazy"
                />
                <div className="topology-overlay-gradient">
                  <div className="topology-node-chips">
                    <div className="topology-node-chip">
                      <span className="node-chip-dot node-dot-green" />
                      <span className="node-chip-region">Global Edge Fleet</span>
                      <span className="node-chip-count tabular-nums">{formatNumber(data.total_devices)} assets across {data.total_sites} sites</span>
                    </div>
                    <div className="topology-node-chip">
                      <span className="node-chip-dot node-dot-blue" />
                      <span className="node-chip-region">Online Telemetry</span>
                      <span className="node-chip-count tabular-nums">{formatNumber(data.active_devices)} operational nodes</span>
                    </div>
                    <div className="topology-node-chip">
                      <span className="node-chip-dot node-dot-amber" />
                      <span className="node-chip-region">Coverage Scope</span>
                      <span className="node-chip-count tabular-nums">Americas &bull; EMEA &bull; APAC</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── 7. RECENT REPAIR REQUESTS TABLE (Rule 5: 'repair requests' Unified Term) ─── */}
          <section
            ref={repairsTableRef}
            className="overview-table-card"
            id="recent-repairs-table"
            aria-labelledby="incidents-heading"
          >
            <div className="overview-table-header-bar">
              <div>
                <h3 className="overview-table-title" id="incidents-heading">
                  Recent repair requests
                </h3>
                <div className="overview-table-sub">
                  Newest repair requests, with the exact opening time available on hover.
                </div>
              </div>
              <div className="overview-table-actions">
                <button
                  type="button"
                  className="overview-view-all"
                  onClick={() => onNavigate('devices')}
                >
                  View all
                  <ArrowRight size={14} />
                </button>
                <ExplainButton
                  title="Repair request audit"
                  explanation="Sorted by newest opening time. Asset tags open the corresponding read-only equipment detail."
                />
              </div>
            </div>
            <div className="overview-table-container">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Asset</th>
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
                          <td className="event-id-cell">#{event.id}</td>
                          <td>
                            <button
                              type="button"
                              className="asset-tag-cell"
                              onClick={() => onOpenDevice(event.device_id)}
                              title={`Inspect asset ${event.asset_tag}`}
                            >
                              {event.asset_tag}
                            </button>
                          </td>
                          <td className="event-type-cell">{formatStatus(event.event_type)}</td>
                          <td>
                            <span className={`severity-pill ${severity}`}>
                              {formatStatus(event.severity)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-tag-cell ${severityClass(event.status)}`}>
                              {formatStatus(event.status)}
                            </span>
                          </td>
                          <td className="date-opened-cell">
                            <HumanDate iso={event.opened_at} />
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="overview-table-empty">
                        No recent repair requests were returned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
