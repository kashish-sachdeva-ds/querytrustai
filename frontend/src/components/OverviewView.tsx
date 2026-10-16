import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
  Database,
  MessageSquareText,
  Search,
  ShieldCheck,
  Server,
  Sun,
} from 'lucide-react'
import {
  type DashboardSummaryResponse,
  fetchDashboardSummary,
} from '../api/client'
import { ExplainButton } from './ExplainButton'
import './OverviewView.css'

interface OverviewViewProps {
  onNavigate: (destination: 'devices' | 'ask-data' | 'data-quality') => void
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [activeBentoTab, setActiveBentoTab] = useState<'warranty' | 'severity'>('warranty')

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const summary = await fetchDashboardSummary()
      setData(summary)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to retrieve live analytics data from server.'
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

  // Keyboard shortcut 'r' to refresh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'r' || e.key === 'R') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
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

  const getSeverityPillClass = (sev: string) => {
    const s = sev.toLowerCase()
    if (s.includes('crit') || s.includes('high')) return 'high'
    if (s.includes('med')) return 'medium'
    return 'low'
  }

  const formatStatus = (st: string) => {
    return st
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  return (
    <div className="overview-command-center">
      {/* 1. Hero Header */}
      <section className="overview-hero" aria-labelledby="operations-heading">
        <div>
          <div className="overview-eyebrow">
            <span className="overview-eyebrow-marker" aria-hidden="true" />
            MORNING BRIEFING &amp; FLEET OVERVIEW
          </div>
          <h2 className="overview-heading" id="operations-heading">
            Your equipment, at a glance
          </h2>
          <p className="overview-copy">
            "Ask freely. Trust completely." Plain-English insights backed by guaranteed read-only safety checks.
          </p>
        </div>

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
            id="refresh-dashboard-btn"
            title="Refresh this overview (Press R)"
            aria-label="Refresh overview data"
          >
            <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
            <kbd className="hero-kbd-badge">R</kbd>
          </button>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="security-alert-box alert-error" role="alert">
          <div className="alert-title">Unable to Load Dashboard Data</div>
          <div className="alert-desc">{error}</div>
          <button
            type="button"
            className="hero-refresh-btn"
            style={{ marginTop: '0.75rem' }}
            onClick={() => loadData()}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="overview-skeleton" role="status" aria-live="polite">
          <div className="skeleton-shield-card">
            <div className="qt-skeleton" style={{ height: 24, width: '35%' }} />
            <div className="qt-skeleton" style={{ height: 16, width: '70%' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
              <div className="qt-skeleton" style={{ height: 60 }} />
              <div className="qt-skeleton" style={{ height: 60 }} />
              <div className="qt-skeleton" style={{ height: 60 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
            <div className="qt-skeleton" style={{ height: 85 }} />
            <div className="qt-skeleton" style={{ height: 85 }} />
            <div className="qt-skeleton" style={{ height: 85 }} />
            <div className="qt-skeleton" style={{ height: 85 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
            <div className="qt-skeleton" style={{ height: 260 }} />
            <div className="qt-skeleton" style={{ height: 260 }} />
          </div>
        </div>
      )}

      {/* Real Data Loaded */}
      {data && (
        <>
          {/* Human Narrative Morning Briefing Card */}
          <section className="morning-briefing-card" aria-label="Morning Briefing">
            <div className="morning-briefing-header">
              <div className="morning-briefing-title-group">
                <Sun size={18} style={{ color: 'var(--qt-accent)' }} />
                <h3>Morning Briefing</h3>
                <span className="morning-briefing-tag">Active Fleet Status</span>
              </div>
              <ExplainButton
                title="Morning Briefing Rationale"
                explanation="This briefing synthesizes fleet inventory, urgent service requests, and warranty horizons into clear operational priorities without requiring SQL knowledge."
              />
            </div>

            <p className="morning-briefing-lead">
              <strong>
                {((data.expiring_warranties_30d > 0 ? 1 : 0) +
                  (data.open_service_events > 0 ? 1 : 0) +
                  (data.total_devices > data.active_devices ? 1 : 0))} things need your attention today.
              </strong>{' '}
              <strong>{activeShare}%</strong> of your {data.total_devices.toLocaleString()} network assets are online, with {data.open_service_events.toLocaleString()} open service incidents and {data.expiring_warranties_30d.toLocaleString()} expiring warranties.
            </p>

            <div className="morning-briefing-items">
              <div
                className="morning-briefing-item"
                onClick={() => onNavigate('devices')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onNavigate('devices') }}
                aria-label="Review expiring warranties"
              >
                <div className="morning-briefing-item-content">
                  <span className="morning-briefing-item-badge badge-attention">1. Coverage Horizon</span>
                  <span className="morning-briefing-item-text">
                    {data.expiring_warranties_30d.toLocaleString()} devices have warranty coverage expiring in the next 30 days.
                  </span>
                </div>
                <ArrowRight size={15} className="morning-briefing-item-arrow" />
              </div>

              <div
                className="morning-briefing-item"
                onClick={() => onNavigate('ask-data')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onNavigate('ask-data') }}
                aria-label="Review open service events"
              >
                <div className="morning-briefing-item-content">
                  <span className="morning-briefing-item-badge badge-urgent">2. Service Tickets</span>
                  <span className="morning-briefing-item-text">
                    {data.open_service_events.toLocaleString()} open service incidents across {data.total_sites.toLocaleString()} operating sites.
                  </span>
                </div>
                <ArrowRight size={15} className="morning-briefing-item-arrow" />
              </div>

              <div
                className="morning-briefing-item"
                onClick={() => onNavigate('data-quality')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onNavigate('data-quality') }}
                aria-label="Review data health checks"
              >
                <div className="morning-briefing-item-content">
                  <span className="morning-briefing-item-badge badge-healthy">3. Data Health Flag</span>
                  <span className="morning-briefing-item-text">
                    Inventory diagnostics clean; gentle data attention noted for minor version formats.
                  </span>
                </div>
                <ArrowRight size={15} className="morning-briefing-item-arrow" />
              </div>
            </div>
          </section>

          {/* Real Metrics Strip */}
          <section className="overview-control-strip" aria-label="At-a-glance equipment summary">
            <div className="strip-metric-item">
              <span className="strip-metric-label">TOTAL EQUIPMENT</span>
              <div className="strip-metric-value">
                {data.total_devices.toLocaleString()}
              </div>
              <div className="strip-metric-subtext">
                <Server size={11} />
                <span>Across {data.total_sites.toLocaleString()} locations</span>
              </div>
            </div>

            <div className="strip-metric-item">
              <span className="strip-metric-label">ACTIVE FLEET</span>
              <div className="strip-metric-value">
                {data.active_devices.toLocaleString()}
              </div>
              <div className="strip-metric-subtext operational-subtext-pill">
                <span className="status-pulse-dot" />
                <span>{activeShare}% currently active</span>
              </div>
            </div>

            <div className="strip-metric-item">
              <span className="strip-metric-label">SERVICE TO REVIEW</span>
              <div className="strip-metric-value">
                {data.open_service_events.toLocaleString()}
              </div>
              <div className="strip-metric-subtext warning-subtext-pill">
                <AlertTriangle size={12} />
                <span>Open service requests</span>
              </div>
            </div>

            <div className="strip-metric-item">
              <span className="strip-metric-label">COVERAGE ENDING SOON</span>
              <div className="strip-metric-value">
                {data.expiring_warranties_30d.toLocaleString()}
              </div>
              <div className="strip-metric-subtext">
                <Clock size={11} />
                <span>Within the next 30 days</span>
              </div>
            </div>
          </section>

          {/* Start Here Action Doors */}
          <section className="overview-start-here" aria-labelledby="start-here-heading">
            <div className="start-here-intro">
              <span className="start-here-kicker">WORKFLOW HUBS</span>
              <h3 id="start-here-heading">Choose your next step</h3>
              <p>Each path keeps data read-only and provides plain-English previews before anything runs.</p>
            </div>
            <div className="start-here-actions">
              <button
                type="button"
                className="start-here-action"
                onClick={() => onNavigate('ask-data')}
                aria-label="Go to Ask a question"
              >
                <span className="start-here-icon"><MessageSquareText size={18} aria-hidden="true" /></span>
                <span className="start-here-copy">
                  <strong>Ask a question</strong>
                  <small>Plain-English query with live Safety Shield preview.</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="start-here-action"
                onClick={() => onNavigate('devices')}
                aria-label="Go to Find equipment"
              >
                <span className="start-here-icon"><Search size={18} aria-hidden="true" /></span>
                <span className="start-here-copy">
                  <strong>Find equipment</strong>
                  <small>Browse 5,000 devices by tag, location, vendor, or status.</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="start-here-action"
                onClick={() => onNavigate('data-quality')}
                aria-label="Go to Check data health"
              >
                <span className="start-here-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
                <span className="start-here-copy">
                  <strong>Check data health</strong>
                  <small>Review diagnostic checks and automated hygiene flags.</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </section>

          {/* Bento Grid */}
          <section className="overview-bento-grid" aria-label="Fleet Distributions">
            <article className="bento-card">
              <div>
                <div className="bento-card-header">
                  <div className="bento-card-title-group">
                    <span className="bento-card-icon">
                      <Database size={16} />
                    </span>
                    <h3 className="bento-card-title">Equipment by type</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="bento-card-meta-badge">
                      {data.devices_by_type.length} Categories
                    </span>
                    <ExplainButton
                      title="Equipment Categories"
                      explanation="Distribution of routers, switches, access points, and firewalls currently provisioned in your synthetic educational fleet."
                    />
                  </div>
                </div>
                <div className="bento-card-desc">
                  Breakdown across network hardware categories.
                </div>

                <div className="bento-distribution-list">
                  {data.devices_by_type.length ? (
                    data.devices_by_type.map((item) => (
                      <div className="bento-distribution-row" key={item.name}>
                        <div className="distribution-name-wrap">
                          <span className="distribution-name" title={item.name}>
                            {item.name}
                          </span>
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
              </div>
            </article>

            <article className="bento-card">
              <div>
                <div className="bento-card-header">
                  <div className="bento-card-title-group">
                    <span className="bento-card-icon">
                      <ShieldCheck size={16} />
                    </span>
                    <h3 className="bento-card-title">Coverage and service</h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="bento-segmented-tabs">
                      <button
                        type="button"
                        className={`bento-tab-btn ${activeBentoTab === 'warranty' ? 'active' : ''}`}
                        onClick={() => setActiveBentoTab('warranty')}
                        aria-label="Show coverage dates"
                      >
                        Coverage dates
                      </button>
                      <button
                        type="button"
                        className={`bento-tab-btn ${activeBentoTab === 'severity' ? 'active' : ''}`}
                        onClick={() => setActiveBentoTab('severity')}
                        aria-label="Show service urgency"
                      >
                        Service urgency
                      </button>
                    </div>
                    <ExplainButton
                      title="Coverage & Urgency Breakdown"
                      explanation="Tracks warranty expirations relative to dataset reference date alongside real-time service incident severities."
                    />
                  </div>
                </div>

                <div className="bento-card-desc">
                  {activeBentoTab === 'warranty'
                    ? `Coverage grouped relative to baseline date: ${data.reference_date}`
                    : 'Open service requests grouped by recorded urgency'}
                </div>

                {/* Tab 1: Warranty Horizon */}
                {activeBentoTab === 'warranty' && (
                  <div className="bento-distribution-list">
                    {data.warranties_by_bucket.map((bucket) => {
                      const percent = data.total_devices
                        ? Math.round((bucket.value / data.total_devices) * 100)
                        : 0
                      return (
                        <div className="bento-distribution-row" key={bucket.name}>
                          <div className="distribution-name-wrap">
                            <span className="distribution-name" title={bucket.name}>
                              {bucket.name}
                            </span>
                          </div>
                          <div className="distribution-track">
                            <div
                              className="distribution-fill warranty"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="distribution-value">
                            {bucket.value.toLocaleString()} / {percent}%
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Tab 2: Service Severity */}
                {activeBentoTab === 'severity' && (
                  <div className="bento-distribution-list">
                    {data.events_by_severity.map((item) => {
                      const sevClass = getSeverityPillClass(item.name)
                      return (
                        <div className="bento-distribution-row" key={item.name}>
                          <div className="distribution-name-wrap">
                            <span className={`distribution-dot ${sevClass}`} />
                            <span className="distribution-name" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <div className="distribution-track">
                            <div
                              className={`distribution-fill ${sevClass}`}
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
                )}
              </div>
            </article>
          </section>

          {/* Recent Service Requests Table */}
          <section className="overview-table-card" aria-labelledby="incidents-heading">
            <div className="overview-table-header-bar">
              <div>
                <h3 className="overview-table-title" id="incidents-heading">
                  Recent service requests
                </h3>
                <div className="overview-table-sub">
                  Live maintenance and operational incident tickets in the system.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="overview-table-badge">
                  {data.recent_service_events.length} LATEST RECORDS
                </span>
                <ExplainButton
                  title="Service Request Audit"
                  explanation="Lists the latest service events across equipment sites. All statuses and severities are synced in real time."
                />
              </div>
            </div>

            <div className="overview-table-container">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>EVENT</th>
                    <th style={{ width: '150px' }}>ASSET</th>
                    <th>TYPE</th>
                    <th style={{ width: '120px' }}>SEVERITY</th>
                    <th style={{ width: '130px' }}>STATUS</th>
                    <th style={{ width: '120px' }}>OPENED</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_service_events.length ? (
                    data.recent_service_events.map((event) => {
                      const sevClass = getSeverityPillClass(event.severity)
                      return (
                        <tr key={event.id}>
                          <td className="event-id-cell">#{event.id}</td>
                          <td className="asset-tag-cell">{event.asset_tag}</td>
                          <td className="event-type-cell">
                            {event.event_type.replace(/_/g, ' ')}
                          </td>
                          <td>
                            <span className={`severity-pill ${sevClass}`}>
                              {event.severity}
                            </span>
                          </td>
                          <td>
                            <span className="status-tag-cell">
                              {formatStatus(event.status)}
                            </span>
                          </td>
                          <td className="date-opened-cell">
                            {new Date(event.opened_at).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <span style={{ color: '#8A8884', fontSize: '13px' }}>
                          No recent service events were returned.
                        </span>
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
