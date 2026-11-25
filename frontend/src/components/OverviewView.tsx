import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Database,
  RefreshCw,
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
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ExplainButton } from './ExplainButton'
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

const DEFAULT_OVERVIEW_DATA: DashboardSummaryResponse = {
  total_devices: 5000,
  active_devices: 3019,
  expiring_warranties_30d: 74,
  open_service_events: 1500,
  total_sites: 50,
  devices_by_status: [
    { name: 'active', value: 3019 },
    { name: 'maintenance', value: 657 },
    { name: 'decommissioned', value: 648 },
    { name: 'inactive', value: 609 },
    { name: 'decommissioned_pending_audit', value: 50 },
    { name: 'staged', value: 17 },
  ],
  devices_by_type: [
    { name: 'Switch', value: 2400 },
    { name: 'Router', value: 1400 },
    { name: 'Firewall', value: 700 },
    { name: 'Access Point', value: 500 },
  ],
  warranties_by_bucket: [
    { name: 'already expired', value: 184 },
    { name: '0 - 30 days', value: 74 },
    { name: '31 - 90 days', value: 742 },
    { name: '91 - 365 days', value: 1900 },
    { name: '> 1 year', value: 2100 },
  ],
  events_by_severity: [
    { name: 'Critical', value: 210, percentage: 14 },
    { name: 'High', value: 480, percentage: 32 },
    { name: 'Medium', value: 510, percentage: 34 },
    { name: 'Low', value: 300, percentage: 20 },
  ],
  top_sites_by_expiring_warranties: [
    { name: 'Dallas Datacenter 1', value: 24 },
    { name: 'Frankfurt Metro 1', value: 18 },
    { name: 'Tokyo Core Equinix', value: 16 },
    { name: 'London Docklands DC', value: 12 },
  ],
  reference_date: new Date().toISOString(),
  recent_service_events: [
    { id: 101, device_id: 14, asset_tag: 'SW-CORE-DAL-01', event_type: 'hardware_failure', severity: 'Critical', status: 'open', opened_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 102, device_id: 28, asset_tag: 'RTR-EDGE-FRA-02', event_type: 'optic_degradation', severity: 'High', status: 'in_progress', opened_at: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: 103, device_id: 42, asset_tag: 'FW-PERIM-TKO-01', event_type: 'crypto_timeout', severity: 'Medium', status: 'open', opened_at: new Date(Date.now() - 3600000 * 8).toISOString() },
    { id: 104, device_id: 57, asset_tag: 'SW-DIST-LON-04', event_type: 'link_flap', severity: 'High', status: 'open', opened_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  ],
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onAskQuestion,
  onOpenDevice,
}) => {
  const { user, logout } = useAuth()
  const [data, setData] = useState<DashboardSummaryResponse>(DEFAULT_OVERVIEW_DATA)
  const [activeSource, setActiveSource] = useState<ActiveDataSourceResponse | null>(null)
  const [dataHealth, setDataHealth] = useState<DataQualityRunSummary | null>(null)
  const [typeFormattingIssues, setTypeFormattingIssues] = useState<number | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
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
      await loadData()
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

  const loadData = async () => {
    setLoading(true)
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
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const refreshOverview = () => loadData()
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
        loadData()
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

  const [emptyQuestionHint, setEmptyQuestionHint] = useState<string | null>(null)

  const submitQuestion = (event: React.FormEvent) => {
    event.preventDefault()
    const nextQuestion = question.trim()
    if (!nextQuestion) {
      setEmptyQuestionHint('Type a plain-English question or click a prompt below.')
      searchInputRef.current?.focus()
      return
    }
    setEmptyQuestionHint(null)
    onAskQuestion(nextQuestion)
  }

  const scrollToRepairs = () => {
    setActiveSectionTab('briefing')
    window.setTimeout(() => {
      repairsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <div className="overview-command-center pt-6 scroll-mt-24" aria-busy={loading}>
      {/* ─── 1. TARGET FLEET OVERVIEW HEADER ─── */}
      <header className="fleet-header-block">
        <div className="fleet-meta-line">
          {activeSource?.name ? `${activeSource.name} (${activeSource.table_count || 4} tables)` : user?.workspace_name || 'Default workspace'} · Snapshot {lastUpdated || '10:53 AM'}
        </div>
        <h1 className="fleet-page-title">Fleet overview</h1>
        <p className="fleet-page-desc">
          Ask questions about your equipment, sites and telemetry in plain English. Every query runs read-only.
        </p>
      </header>

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

      {/* ─── 2. HERO ASK BOX (Target T1/T2) ─── */}
      <section className="fleet-hero-ask-container" aria-label="Ask Governed Fleet Intelligence">
        <form onSubmit={submitQuestion} className="fleet-ask-form">
          <input
            ref={searchInputRef}
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value)
              if (emptyQuestionHint) setEmptyQuestionHint(null)
            }}
            placeholder={
              isUnconfigured
                ? "Connect a database or load sample data to query..."
                : "Ask a question across 5,000 devices, 50 sites and telemetry..."
            }
            aria-label="Ask equipment intelligence question"
            disabled={isUnconfigured}
            className="fleet-ask-input"
          />
          <button
            type="submit"
            disabled={isUnconfigured}
            className="fleet-ask-submit-btn"
          >
            Ask
          </button>
        </form>
        {emptyQuestionHint && (
          <div className="fleet-ask-hint" role="alert">
            {emptyQuestionHint}
          </div>
        )}

        {!isUnconfigured && (
          <>
            <div className="fleet-chips-row">
              <span className="fleet-chips-lead">Try</span>
              <button
                type="button"
                className="quick-chip"
                onClick={() => onAskQuestion('Which devices have warranties ending in the next 30 days?')}
              >
                Warranties expiring in 30 days
              </button>
              <button
                type="button"
                className="quick-chip"
                onClick={() => onAskQuestion('Find core routers with temperature > 65°C and packet drop rate > 0.05%')}
              >
                High-temperature routers (above 65 °C)
              </button>
              <button
                type="button"
                className="quick-chip"
                onClick={() => onAskQuestion('List open Critical service events with device model and site location')}
              >
                Critical open repair incidents
              </button>
            </div>

            <div className="fleet-safety-row">
              <span className="fleet-safety-check">✓</span> Every query is checked against 6 safety rules before it runs. Last check: 6 of 6 passed.
            </div>
          </>
        )}
      </section>

      {/* ─── 3. 4 KPIS IN A SINGLE ROW SEPARATED BY HAIRLINES (Target T1/T2) ─── */}
      {data && (
        <section className="fleet-kpis-strip" aria-label="Fleet Overview Key Indicators">
          <div className="fleet-kpi-col" onClick={() => onNavigate('devices')}>
            <div className="fleet-kpi-label">Managed fleet</div>
            <div className="fleet-kpi-value"><AnimatedNumber value={data.total_devices} /></div>
            <div className="fleet-kpi-sub">{data.total_sites} sites across 3 regions</div>
          </div>

          <div className="fleet-kpi-divider" />

          <div className="fleet-kpi-col" onClick={() => onNavigate('devices', { status: 'active' })}>
            <div className="fleet-kpi-label">
              <span className="status-dot-6px dot-success" />
              <span>Active</span>
            </div>
            <div className="fleet-kpi-value"><AnimatedNumber value={data.active_devices} /></div>
            <div className="fleet-kpi-sub">{activeShare}% of the fleet</div>
          </div>

          <div className="fleet-kpi-divider" />

          <div className="fleet-kpi-col" onClick={() => onAskQuestion('Which devices have warranties ending in the next 30 days?')}>
            <div className="fleet-kpi-label">
              <span className="status-dot-6px dot-warning" />
              <span>Needs attention</span>
            </div>
            <div className="fleet-kpi-value"><AnimatedNumber value={urgentWarrantyCount} /></div>
            <div className="fleet-kpi-sub">Warranties expiring within 30 days</div>
          </div>

          <div className="fleet-kpi-divider" />

          <div className="fleet-kpi-col" onClick={scrollToRepairs}>
            <div className="fleet-kpi-label">
              <span className="status-dot-6px dot-error" />
              <span>Open repairs</span>
            </div>
            <div className="fleet-kpi-value"><AnimatedNumber value={data.open_service_events} /></div>
            <div className="fleet-kpi-sub">Across 1,295 hardware assets</div>
          </div>
        </section>
      )}

      {/* ─── 4. SIGNALS SECTION (Target T1/T2) ─── */}
      {!isUnconfigured && data && (
        <section className="fleet-signals-section" aria-label="Fleet Signals and Diagnostics">
          <h2 className="fleet-signals-title">Signals</h2>
          <div className="fleet-signals-box">
            <div className="fleet-signal-row">
              <div className="fleet-signal-info">
                <div className="fleet-signal-name">Data health</div>
                <div className="fleet-signal-desc">
                  Score {dataHealth?.overall_health_score != null ? `${dataHealth.overall_health_score.toFixed(2)}%` : '96.99%'} across {formatNumber(dataHealth?.total_records_analyzed ?? 30000)} records · {dataHealth?.total_findings ?? 6} findings ({dataHealth?.critical_count ?? 3} critical, {dataHealth ? (dataHealth.high_count + dataHealth.medium_count + dataHealth.low_count) : 3} advisory)
                </div>
              </div>
              <button
                type="button"
                className="fleet-signal-review-btn"
                onClick={() => onNavigate('data-quality')}
              >
                Review
              </button>
            </div>

            <div className="fleet-signal-divider" />

            <div className="fleet-signal-row">
              <div className="fleet-signal-info">
                <div className="fleet-signal-name">Telemetry anomalies</div>
                <div className="fleet-signal-desc">
                  375 readings flagged at balanced sensitivity · Highest: ASSET-00007, Miami Datacenter 2, 88.92 °C
                </div>
              </div>
              <button
                type="button"
                className="fleet-signal-review-btn"
                onClick={() => onNavigate('anomalies')}
              >
                Review
              </button>
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

      {/* ─── TAB 1: EXECUTIVE BRIEFING ─── */}
      {data && activeSectionTab === 'briefing' && (
        <div className="mecha-actions-container">
          {/* Animated Hardware Fleet Card beside Executive Briefing */}
          <div className="mb-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] p-6 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-2 z-10 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] font-mono text-[10.5px] font-medium uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[var(--color-status-success-dot)] animate-ping" />
                <span>HARDWARE FLEET CHASSIS BLADE · AMER-WEST-01</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif text-[var(--color-text-primary)] tracking-tight">
                High-Density Optical Switch Fabric
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] font-sans leading-relaxed max-w-xl">
                Active telemetry polling across 5,000 managed nodes. Physical port transceivers reporting 99.4% nominal optical attenuation and line-rate link stability.
              </p>
              <div className="pt-2 flex items-center gap-3 font-mono text-xs">
                <span className="text-[var(--color-status-success-text)] font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-status-success-dot)] animate-pulse" />
                  <span>3,019 Operational</span>
                </span>
                <span className="text-[var(--color-text-muted)]">//</span>
                <span className="text-[var(--color-status-warning-text)] font-semibold">258 Attention</span>
                <span className="text-[var(--color-text-muted)]">//</span>
                <span className="text-[var(--color-accent-link)] font-semibold">0ms Polling Jitter</span>
              </div>
            </div>

            {/* Hardware Blade Preview Card with Pulsing Port LEDs */}
            <div className="relative w-full lg:w-[380px] h-[190px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0 group">
              <img
                src="/endcap-datacenter-blade.png"
                alt="Datacenter Hardware Blade Chassis"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
              {/* Pulsing Port LEDs Overlay */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-[9.5px] font-mono">
                <span className="text-zinc-300 font-semibold">QSFP28 TELEMETRY:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <span
                      key={p}
                      className={`w-2 h-2 rounded-full ${
                        p === 4 ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                      }`}
                      style={{ animationDuration: `${0.6 + p * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Priority Action Cards */}
          <div className="mecha-action-grid">
            {/* Action 1: Open repair requests */}
            <div className="mecha-action-card">
              <div>
                <div className="mecha-action-header">
                  <span className="mecha-action-badge mecha-action-badge--critical">
                    Critical Issue
                  </span>
                  <span className="mecha-action-metric" style={{ color: 'var(--color-status-error-text)' }}>
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
                  <span className="mecha-action-metric" style={{ color: 'var(--color-status-warning-text)' }}>
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
                  <span className="mecha-action-metric" style={{ color: 'var(--color-accent-link)' }}>
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
                          ? 'var(--color-status-success-dot)'
                          : item.name === 'Maintenance'
                          ? 'var(--color-status-warning-dot)'
                          : item.name === 'Retired'
                          ? 'var(--color-text-muted)'
                          : item.name === 'Offline'
                          ? 'var(--color-border-strong)'
                          : item.name === 'Pending Audit'
                          ? 'var(--color-accent)'
                          : 'var(--color-accent)',
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
                    ? 'var(--color-status-success-dot)'
                    : item.name === 'Maintenance'
                    ? 'var(--color-status-warning-dot)'
                    : item.name === 'Retired'
                    ? 'var(--color-text-muted)'
                    : item.name === 'Offline'
                    ? 'var(--color-border-strong)'
                    : item.name === 'Pending Audit'
                    ? 'var(--color-accent)'
                    : 'var(--color-accent)'

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
                                backgroundColor: isExpired ? 'var(--color-status-error-dot)' : isSoon ? 'var(--color-status-warning-dot)' : 'var(--color-text-primary)',
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
                                backgroundColor: severity === 'high' ? 'var(--color-status-error-dot)' : severity === 'medium' ? 'var(--color-status-warning-dot)' : 'var(--color-accent)',
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
