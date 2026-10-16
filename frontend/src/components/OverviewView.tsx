import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  RefreshCw,
  Clock,
  Database,
  ShieldCheck,
  Server,
} from 'lucide-react'
import {
  type DashboardSummaryResponse,
  fetchDashboardSummary,
} from '../api/client'
import './OverviewView.css'

export const OverviewView: React.FC = () => {
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
      {/* 1. CONSOLIDATED TOP HERO */}
      <section className="overview-hero" aria-labelledby="operations-heading">
        <div>
          <div className="overview-eyebrow">
            <span style={{ color: '#EA580C' }}>●</span>
            OPERATIONAL INTELLIGENCE / FLEET CONTROL ROOM
          </div>
          <h2 className="overview-heading" id="operations-heading">
            Fleet control room
          </h2>
          <p className="overview-copy">
            Inventory, lifecycle, and service signals sourced from the synthetic PostgreSQL dataset.
            Real-time read-only monitoring and operational distributions.
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
            title="Refresh fleet operations (Press R)"
          >
            <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh data'}</span>
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
            style={{ marginTop: '0.5rem' }}
            onClick={() => loadData()}
          >
            Retry Connection
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="overview-skeleton" role="status" aria-live="polite">
          <div className="skeleton-block" style={{ minHeight: '90px' }} />
          <div className="skeleton-block" style={{ minHeight: '260px' }} />
          <div className="skeleton-block" style={{ minHeight: '280px' }} />
        </div>
      )}

      {data && (
        <>
          {/* 2. OVERVIEW CONTROL STRIP (Consolidated Single Toolbar) */}
          <section className="overview-control-strip" aria-label="Key Fleet Metrics">
            {/* Metric 1: Total Fleet */}
            <div className="strip-metric-item">
              <span className="strip-metric-label">TOTAL FLEET</span>
              <div className="strip-metric-value">
                {data.total_devices.toLocaleString()}
              </div>
              <div className="strip-metric-subtext">
                <Server size={11} />
                <span>{data.total_sites.toLocaleString()} monitored sites</span>
              </div>
            </div>

            {/* Metric 2: Active Status */}
            <div className="strip-metric-item">
              <span className="strip-metric-label">ACTIVE STATUS</span>
              <div className="strip-metric-value">
                {data.active_devices.toLocaleString()}
              </div>
              <div className="strip-metric-subtext operational-subtext-pill">
                <span className="status-pulse-dot" />
                <span>{activeShare}% operational</span>
              </div>
            </div>

            {/* Metric 3: Open Service Queue */}
            <div className="strip-metric-item">
              <span className="strip-metric-label">OPEN SERVICE QUEUE</span>
              <div className="strip-metric-value">
                {data.open_service_events.toLocaleString()}
              </div>
              <div className="strip-metric-subtext warning-subtext-pill">
                <AlertTriangle size={12} />
                <span>Pending maintenance</span>
              </div>
            </div>

            {/* Metric 4: Expiring Warranties (30D) */}
            <div className="strip-metric-item">
              <span className="strip-metric-label">EXPIRING WARRANTIES (30D)</span>
              <div className="strip-metric-value">
                {data.expiring_warranties_30d.toLocaleString()}
              </div>
              <div className="strip-metric-subtext">
                <Clock size={11} />
                <span>Next 30-day lifecycle window</span>
              </div>
            </div>
          </section>

          {/* 3. 2-COLUMN SPLIT BENTO GRID */}
          <section className="overview-bento-grid" aria-label="Fleet Distributions">
            {/* Left Column: Device Fleet Breakdown (Inventory Composition) */}
            <article className="bento-card">
              <div>
                <div className="bento-card-header">
                  <div className="bento-card-title-group">
                    <span className="bento-card-icon">
                      <Database size={16} />
                    </span>
                    <h3 className="bento-card-title">Inventory Composition</h3>
                  </div>
                  <span className="bento-card-meta-badge">
                    {data.devices_by_type.length} Categories
                  </span>
                </div>
                <div className="bento-card-desc">
                  Device distribution across synthetic networking hardware models
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

            {/* Right Column: Severity & Lifecycle Distribution */}
            <article className="bento-card">
              <div>
                <div className="bento-card-header">
                  <div className="bento-card-title-group">
                    <span className="bento-card-icon">
                      <ShieldCheck size={16} />
                    </span>
                    <h3 className="bento-card-title">Lifecycle & Service Severity</h3>
                  </div>

                  {/* Segmented Sub-Tabs */}
                  <div className="bento-segmented-tabs">
                    <button
                      type="button"
                      className={`bento-tab-btn ${activeBentoTab === 'warranty' ? 'active' : ''}`}
                      onClick={() => setActiveBentoTab('warranty')}
                    >
                      Warranty Horizon
                    </button>
                    <button
                      type="button"
                      className={`bento-tab-btn ${activeBentoTab === 'severity' ? 'active' : ''}`}
                      onClick={() => setActiveBentoTab('severity')}
                    >
                      Service Severity
                    </button>
                  </div>
                </div>

                <div className="bento-card-desc">
                  {activeBentoTab === 'warranty'
                    ? `Horizon analysis referenced to anchor date ${data.reference_date}`
                    : 'Active service incident distribution ranked by operational urgency'}
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

          {/* 4. RECENT SERVICE INCIDENTS TABLE */}
          <section className="overview-table-card" aria-labelledby="incidents-heading">
            <div className="overview-table-header-bar">
              <div>
                <h3 className="overview-table-title" id="incidents-heading">
                  Recent service incidents
                </h3>
                <div className="overview-table-sub">
                  Live database event feed from synthetic telemetry & fault records
                </div>
              </div>
              <span className="overview-table-badge">
                LATEST {data.recent_service_events.length} RECORDS
              </span>
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
