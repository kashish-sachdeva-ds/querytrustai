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
} from 'lucide-react'
import {
  type DashboardSummaryResponse,
  fetchDashboardSummary,
} from '../api/client'
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
      <section className="overview-hero" aria-labelledby="operations-heading">
        <div>
          <div className="overview-eyebrow">
            <span className="overview-eyebrow-marker" aria-hidden="true" />
            EQUIPMENT OVERVIEW
          </div>
          <h2 className="overview-heading" id="operations-heading">
            Your equipment, at a glance
          </h2>
          <p className="overview-copy">
            Start with a question, find a specific device, or review the items that may need attention.
            This workspace uses synthetic practice data.
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
          <section className="overview-control-strip" aria-label="At-a-glance equipment summary">
            <div className="strip-metric-item">
              <span className="strip-metric-label">EQUIPMENT</span>
              <div className="strip-metric-value">
                {data.total_devices.toLocaleString()}
              </div>
              <div className="strip-metric-subtext">
                <Server size={11} />
                <span>Across {data.total_sites.toLocaleString()} locations</span>
              </div>
            </div>

            <div className="strip-metric-item">
              <span className="strip-metric-label">ACTIVE</span>
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

          <section className="overview-start-here" aria-labelledby="start-here-heading">
            <div className="start-here-intro">
              <span className="start-here-kicker">START HERE</span>
              <h3 id="start-here-heading">Choose your next step</h3>
              <p>Each path keeps the data read-only and explains what happens before anything is run.</p>
            </div>
            <div className="start-here-actions">
              <button type="button" className="start-here-action" onClick={() => onNavigate('ask-data')}>
                <span className="start-here-icon"><MessageSquareText size={18} aria-hidden="true" /></span>
                <span className="start-here-copy">
                  <strong>Ask a question</strong>
                  <small>Use everyday language. Review a safe preview before it reads data.</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="start-here-action" onClick={() => onNavigate('devices')}>
                <span className="start-here-icon"><Search size={18} aria-hidden="true" /></span>
                <span className="start-here-copy">
                  <strong>Find equipment</strong>
                  <small>Search by asset tag, location, model, or operational status.</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="start-here-action" onClick={() => onNavigate('data-quality')}>
                <span className="start-here-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
                <span className="start-here-copy">
                  <strong>Check data health</strong>
                  <small>Review missing or inconsistent records without changing source data.</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </section>

          {/* 3. 2-COLUMN SPLIT BENTO GRID */}
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
                  <span className="bento-card-meta-badge">
                    {data.devices_by_type.length} Categories
                  </span>
                </div>
                <div className="bento-card-desc">
                  A simple breakdown of the equipment in this practice dataset.
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

                  {/* Segmented Sub-Tabs */}
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
                </div>

                <div className="bento-card-desc">
                  {activeBentoTab === 'warranty'
                    ? `Coverage grouped using the dataset date: ${data.reference_date}`
                    : 'Open service requests grouped by their recorded urgency'}
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

          <section className="overview-table-card" aria-labelledby="incidents-heading">
            <div className="overview-table-header-bar">
              <div>
                <h3 className="overview-table-title" id="incidents-heading">
                  Recent service requests
                </h3>
                <div className="overview-table-sub">
                  The latest service records available in the synthetic practice dataset.
                </div>
              </div>
              <span className="overview-table-badge">
                {data.recent_service_events.length} LATEST RECORDS
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
