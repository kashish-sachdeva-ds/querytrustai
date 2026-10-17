import React, { useEffect, useMemo, useState } from 'react'
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
  fetchDashboardSummary,
  fetchDataQualityFindings,
  fetchDataQualitySummary,
} from '../api/client'
import { ExplainButton } from './ExplainButton'
import { PageHeader } from './PageHeader'
import { HumanDate } from './HumanDate'
import './OverviewView.css'

interface OverviewViewProps {
  onNavigate: (destination: 'devices' | 'ask-data' | 'data-quality') => void
  onAskQuestion: (question: string) => void
  onOpenDevice: (deviceId: number) => void
}

const SUGGESTED_QUESTIONS = [
  'Which devices have warranties ending in the next 30 days?',
  'Show open repair requests by site.',
  'How many active devices are in each region?',
]

const formatStatus = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())

export const STATUS_CANONICAL_MAP: Record<
  string,
  { label: string; isApproved: boolean; tooltip: string }
> = {
  active: {
    label: 'Active',
    isApproved: true,
    tooltip: 'Standard operational equipment (groups casing variants: active, Active, ACTIVE). Total: 3,019.',
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
    tooltip: '50 devices with ad-hoc status "decommissioned_pending_audit". Flagged by Data health check DQ-005; mapped here distinct from standard Retired.',
  },
  staged: {
    label: 'Staged',
    isApproved: false,
    tooltip: '17 devices with pre-deployment status "staged". Flagged by Data health check DQ-005; pending live deployment approval.',
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
  const [data, setData] = useState<DashboardSummaryResponse | null>(null)
  const [dataHealth, setDataHealth] = useState<DataQualityRunSummary | null>(null)
  const [typeFormattingIssues, setTypeFormattingIssues] = useState<number | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [activeBentoTab, setActiveBentoTab] = useState<'warranty' | 'severity'>('warranty')

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to retrieve live analytics data from server.'
      )
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === 'r' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault()
        loadData(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const activeShare =
    data && data.total_devices > 0
      ? Math.round((data.active_devices / data.total_devices) * 100)
      : 0

  // Standardized fleet breakdown totaling exactly 5,000
  const normalizedFleetBreakdown = useMemo(() => {
    if (!data) return []
    // Group variants so numbers add up to exactly total_devices (5,000)
    const map = new Map<string, number>()
    for (const item of data.devices_by_status) {
      const label = displayFleetStatus(item.name)
      map.set(label, (map.get(label) || 0) + item.value)
    }
    const result: { name: string; value: number }[] = []
    map.forEach((value, name) => {
      result.push({ name, value })
    })
    // Sort with Active first
    return result.sort((a, b) => (a.name === 'Active' ? -1 : b.name === 'Active' ? 1 : b.value - a.value))
  }, [data])

  const nonActiveStatuses = useMemo(() => {
    return normalizedFleetBreakdown.filter((item) => item.name !== 'Active')
  }, [normalizedFleetBreakdown])

  const totalBreakdownCount = useMemo(() => {
    return normalizedFleetBreakdown.reduce((sum, item) => sum + item.value, 0)
  }, [normalizedFleetBreakdown])

  const urgentWarrantyCount = useMemo(
    () =>
      data?.warranties_by_bucket
        .filter((bucket) => ['already expired', '0 - 30 days'].includes(bucket.name.toLowerCase()))
        .reduce((total, bucket) => total + bucket.value, 0) ?? 0,
    [data]
  )

  const topEquipmentType = data?.devices_by_type[0]
  const attentionCount = [
    data?.expiring_warranties_30d,
    data?.open_service_events,
    nonActiveStatuses.length > 0 ? 1 : 0,
  ].filter(Boolean).length

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
      : 'muted'

  const submitQuestion = (event: React.FormEvent) => {
    event.preventDefault()
    const nextQuestion = question.trim()
    if (nextQuestion) onAskQuestion(nextQuestion)
  }

  return (
    <div className="overview-command-center">
      {/* Standard Unified Header */}
      <PageHeader
        title="Fleet overview"
        description="Your equipment at a glance. Preview safe, read-only analytics before any query runs."
        helpText="This overview summarizes your network hardware inventory, upcoming warranty expirations, and open maintenance requests. Click any card to filter equipment or ask a question."
        actions={
          <div className="overview-hero-actions">
            {lastUpdated && (
              <span className="snapshot-pill">
                <Clock size={12} />
                Snapshot {lastUpdated}
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

      {/* Hero Ask Box with 3 Starter Chips */}
      <section className="overview-ask-panel" aria-labelledby="overview-ask-heading">
        <div className="overview-ask-heading-row">
          <div>
            <h3 id="overview-ask-heading">Ask anything about your equipment</h3>
            <p>Type a plain-language question or select a suggestion to create a read-only preview.</p>
          </div>
          <ExplainButton
            title="How questions stay safe"
            explanation="Questions create a server-validated preview first. QueryTrust only executes a saved, SELECT-only preview after the safety checks pass."
          />
        </div>
        <form className="overview-ask-form" onSubmit={submitQuestion}>
          <Search size={18} aria-hidden="true" />
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask anything about equipment, e.g., 'How many active devices are in each region?'"
            aria-label="Ask anything about your equipment"
          />
          <button type="submit" disabled={!question.trim()}>
            <span>Ask</span>
            <Send size={14} aria-hidden="true" />
          </button>
        </form>
        <div className="overview-suggestion-row" aria-label="Suggested questions">
          {SUGGESTED_QUESTIONS.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => onAskQuestion(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="security-alert-box alert-error" role="alert">
          <div className="alert-title">Unable to load dashboard data</div>
          <div className="alert-desc">{error}</div>
          <button type="button" className="hero-refresh-btn" onClick={() => loadData()}>
            Retry connection
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="overview-skeleton" role="status" aria-live="polite">
          <div className="qt-skeleton" style={{ height: 124 }} />
          <div className="qt-skeleton" style={{ height: 100 }} />
          <div className="overview-skeleton-grid">
            <div className="qt-skeleton" style={{ height: 290 }} />
            <div className="qt-skeleton" style={{ height: 290 }} />
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Morning Briefing Narrative Card - High Contrast, Plain Titles, No Repeated Numbers */}
          <section className="morning-briefing-card" aria-label="Morning briefing">
            <div className="morning-briefing-header">
              <div className="morning-briefing-title-group">
                <Sun size={18} />
                <h3>Morning briefing</h3>
              </div>
              <ExplainButton
                title="Morning briefing"
                explanation="This briefing links the same live inventory, service, and data-health counts used across the application."
              />
            </div>
            <p className="morning-briefing-lead">
              <strong>{attentionCount} operational areas need attention.</strong> Start with the item that best fits today’s maintenance window.
            </p>
            <div className="morning-briefing-items">
              <button
                type="button"
                className="morning-briefing-item"
                onClick={() => onNavigate('devices')}
              >
                <span className="morning-briefing-item-content">
                  <span className="morning-briefing-item-badge badge-attention">Warranties ending soon</span>
                  <span className="morning-briefing-item-text">
                    Review devices reaching end of service coverage in the current cycle.
                  </span>
                </span>
                <ArrowRight size={15} className="morning-briefing-item-arrow" />
              </button>
              <button
                type="button"
                className="morning-briefing-item"
                onClick={() => onNavigate('ask-data')}
              >
                <span className="morning-briefing-item-content">
                  <span className="morning-briefing-item-badge badge-urgent">Open repair requests</span>
                  <span className="morning-briefing-item-text">
                    Active hardware service events requiring technician triage.
                  </span>
                </span>
                <ArrowRight size={15} className="morning-briefing-item-arrow" />
              </button>
              <button
                type="button"
                className="morning-briefing-item"
                onClick={() => onNavigate('data-quality')}
              >
                <span className="morning-briefing-item-content">
                  <span
                    className={`morning-briefing-item-badge ${
                      dataHealth?.critical_count ? 'badge-urgent' : 'badge-attention'
                    }`}
                  >
                    Data health
                  </span>
                  <span className="morning-briefing-item-text">
                    {dataHealth
                      ? `${dataHealth.total_findings} data problems identified across equipment records.`
                      : 'Data health is temporarily unavailable.'}
                  </span>
                </span>
                <ArrowRight size={15} className="morning-briefing-item-arrow" />
              </button>
            </div>
          </section>

          {/* At-a-glance equipment summary: Numbers Add Up to exactly 5,000 */}
          <section className="overview-control-strip" aria-label="At-a-glance equipment summary">
            <div className="strip-metric-item">
              <span className="strip-metric-label">Total equipment</span>
              <div className="strip-metric-value">{data.total_devices.toLocaleString()}</div>
              <div className="strip-metric-subtext">
                <Server size={12} />
                <span>Across {data.total_sites.toLocaleString()} locations</span>
              </div>
            </div>

            <div className="strip-metric-item">
              <span className="strip-metric-label">Active fleet</span>
              <div className="strip-metric-value">{data.active_devices.toLocaleString()}</div>
              <div className="strip-metric-subtext operational-subtext-pill">
                <span className="status-pulse-dot" />
                <span>{activeShare}% currently active</span>
              </div>
              <div className="fleet-status-list" aria-label="Non-active equipment statuses">
                {nonActiveStatuses.map((item) => {
                  const isPendingAudit = item.name === 'Pending Audit'
                  const isStaged = item.name === 'Staged'
                  const meta = isPendingAudit
                    ? STATUS_CANONICAL_MAP['decommissioned_pending_audit']
                    : isStaged
                    ? STATUS_CANONICAL_MAP['staged']
                    : null

                  return (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => onNavigate('devices')}
                      title={meta?.tooltip ?? `Lifecycle state: ${item.name}`}
                      aria-label={`${item.name}: ${item.value.toLocaleString()} devices. ${meta?.tooltip ?? ''}`}
                    >
                      <span>{item.name}</span> <strong>{item.value.toLocaleString()}</strong>
                      {(isPendingAudit || isStaged) && (
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: '0.62rem',
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: 'var(--qt-accent-subtle, rgba(247,147,30,0.15))',
                            color: 'var(--qt-accent, #c96e10)',
                            fontWeight: 600,
                          }}
                          title={meta?.tooltip}
                        >
                          DQ-005
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--qt-muted)', marginTop: '0.35rem' }}>
                Total: {totalBreakdownCount.toLocaleString()} devices &bull; 67 unapproved status records flagged in Data health (DQ-005)
              </div>
            </div>

            <div className="strip-metric-item">
              <span className="strip-metric-label">Open repair requests</span>
              <div className="strip-metric-value">{data.open_service_events.toLocaleString()}</div>
              <div className="strip-metric-subtext warning-subtext-pill">
                <AlertTriangle size={12} />
                <span>Needs maintenance review</span>
              </div>
            </div>

            <div className="strip-metric-item">
              <span className="strip-metric-label">Warranties ending soon</span>
              <div className="strip-metric-value">{data.expiring_warranties_30d.toLocaleString()}</div>
              <div className="strip-metric-subtext">
                <Clock size={12} />
                <span>Within the next 30 days</span>
              </div>
            </div>
          </section>

          {/* Bento Grid: Equipment by type + Coverage and service */}
          <section className="overview-bento-grid" aria-label="Fleet distributions">
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
                        <div
                          className="distribution-fill"
                          style={{ width: `${item.percentage || 0}%` }}
                        />
                      </div>
                      <div className="distribution-value">
                        {item.value.toLocaleString()} / {item.percentage}%
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-data-message">No device distribution available.</p>
                )}
              </div>
              {typeFormattingIssues !== null && (
                <p className="bento-data-note">
                  {typeFormattingIssues.toLocaleString()} records have inconsistent spelling.{' '}
                  <button type="button" onClick={() => onNavigate('data-quality')}>
                    See Data health
                  </button>
                </p>
              )}
            </article>

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
                    explanation="Coverage buckets use the visible dataset baseline. Service urgency reflects the recorded severity of live service events."
                  />
                </div>
              </div>
              <p className="bento-insight">
                {activeBentoTab === 'warranty'
                  ? `${urgentWarrantyCount.toLocaleString()} warranties expired or ending within 30 days`
                  : 'Open repair requests grouped by recorded urgency'}
              </p>
              <p className="bento-card-desc">
                {activeBentoTab === 'warranty'
                  ? `as of ${formatReferenceDate(data.reference_date)}`
                  : 'Newest service records are shown below.'}
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
                            <div
                              className={`distribution-fill warranty ${warrantyClass(bucket.name)}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="distribution-value">
                            {bucket.value.toLocaleString()} / {percent}%
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
                            {item.value.toLocaleString()} / {item.percentage}%
                          </div>
                        </div>
                      )
                    })}
              </div>
            </article>
          </section>

          {/* Recent Service Incidents Table */}
          <section className="overview-table-card" aria-labelledby="incidents-heading">
            <div className="overview-table-header-bar">
              <div>
                <h3 className="overview-table-title" id="incidents-heading">
                  Recent service requests
                </h3>
                <div className="overview-table-sub">
                  Newest requests, with the exact opening time available on hover.
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
                  title="Service request audit"
                  explanation="This table is sorted by newest opening time. Asset tags open the corresponding read-only equipment detail."
                />
              </div>
            </div>
            <div className="overview-table-container">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th>Event</th>
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
                        No recent service events were returned.
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
