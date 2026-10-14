import React, { useState, useEffect } from 'react'
import {
  Server,
  Activity,
  Calendar,
  AlertTriangle,
  Building,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react'
import {
  type DashboardSummaryResponse,
  fetchDashboardSummary,
} from '../api/client'

export const OverviewView: React.FC = () => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

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

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'badge-critical'
      case 'high':
        return 'badge-high'
      case 'medium':
        return 'badge-medium'
      case 'low':
        return 'badge-low'
      default:
        return 'badge-default'
    }
  }

  return (
    <div className="overview-container">
      {/* Top Banner & Refresh */}
      <div className="page-action-row">
        <div>
          <h2 className="view-section-title">Fleet Operations &amp; Inventory KPI</h2>
          <p className="view-section-desc">
            Aggregated telemetry, inventory, and lifecycle signals derived directly from PostgreSQL.
          </p>
        </div>

        <div className="action-buttons-group">
          {lastUpdated && (
            <span className="last-updated-text">
              <Clock size={13} />
              Updated at {lastUpdated}
            </span>
          )}
          <button
            type="button"
            className="refresh-btn"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            id="refresh-dashboard-btn"
          >
            <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Updating...' : 'Live Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-card" role="alert">
          <AlertTriangle size={24} className="text-rose" />
          <div className="error-content">
            <h3>Unable to Load Dashboard Data</h3>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="retry-button"
            onClick={() => loadData()}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="skeleton-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-kpi-card" />
          ))}
        </div>
      )}

      {/* Main Content */}
      {data && (
        <>
          {/* KPI Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">TOTAL MONITORED DEVICES</span>
                <div className="kpi-icon-wrapper bg-indigo-subtle">
                  <Server size={18} className="text-indigo" />
                </div>
              </div>
              <div className="kpi-value">{data.total_devices.toLocaleString()}</div>
              <div className="kpi-footer">
                <span className="text-emerald font-semibold">100%</span>
                <span className="text-muted"> synthetic networking assets</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">ACTIVE FLEET STATUS</span>
                <div className="kpi-icon-wrapper bg-emerald-subtle">
                  <Activity size={18} className="text-emerald" />
                </div>
              </div>
              <div className="kpi-value">{data.active_devices.toLocaleString()}</div>
              <div className="kpi-footer">
                <span className="text-emerald font-semibold">
                  {Math.round((data.active_devices / data.total_devices) * 100)}%
                </span>
                <span className="text-muted"> online &amp; routing traffic</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">EXPIRING WARRANTIES (30D)</span>
                <div className="kpi-icon-wrapper bg-amber-subtle">
                  <Calendar size={18} className="text-amber" />
                </div>
              </div>
              <div className="kpi-value">{data.expiring_warranties_30d.toLocaleString()}</div>
              <div className="kpi-footer">
                <span className="text-amber font-semibold">Ref Date: </span>
                <span className="text-muted">{data.reference_date}</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">OPEN SERVICE EVENTS</span>
                <div className="kpi-icon-wrapper bg-rose-subtle">
                  <AlertTriangle size={18} className="text-rose" />
                </div>
              </div>
              <div className="kpi-value">{data.open_service_events.toLocaleString()}</div>
              <div className="kpi-footer">
                <span className="text-rose font-semibold">Active tickets</span>
                <span className="text-muted"> requiring intervention</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">MONITORED SITES</span>
                <div className="kpi-icon-wrapper bg-cyan-subtle">
                  <Building size={18} className="text-cyan" />
                </div>
              </div>
              <div className="kpi-value">{data.total_sites}</div>
              <div className="kpi-footer">
                <span className="text-cyan font-semibold">4 Regions</span>
                <span className="text-muted"> North, South, East, West</span>
              </div>
            </div>
          </div>

          {/* Breakdown Panels Row */}
          <div className="breakdown-grid">
            {/* Devices by Type */}
            <div className="content-card">
              <div className="card-header">
                <div className="card-header-title">
                  <Layers size={18} className="text-indigo" />
                  <h3>Devices by Type</h3>
                </div>
                <span className="badge-pill">{data.devices_by_type.length} Classes</span>
              </div>
              <div className="distribution-list">
                {data.devices_by_type.map((item) => (
                  <div key={item.name} className="distribution-item">
                    <div className="distribution-label-row">
                      <span className="dist-name">{item.name}</span>
                      <span className="dist-count">
                        {item.value.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="dist-bar-track">
                      <div
                        className="dist-bar-fill fill-indigo"
                        style={{ width: `${item.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Devices by Status */}
            <div className="content-card">
              <div className="card-header">
                <div className="card-header-title">
                  <Activity size={18} className="text-emerald" />
                  <h3>Operational Status</h3>
                </div>
                <span className="badge-pill">{data.devices_by_status.length} States</span>
              </div>
              <div className="distribution-list">
                {data.devices_by_status.map((item) => (
                  <div key={item.name} className="distribution-item">
                    <div className="distribution-label-row">
                      <span className="dist-name">{item.name}</span>
                      <span className="dist-count">
                        {item.value.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="dist-bar-track">
                      <div
                        className={`dist-bar-fill ${
                          item.name.toLowerCase() === 'active'
                            ? 'fill-emerald'
                            : item.name.toLowerCase() === 'maintenance'
                            ? 'fill-amber'
                            : 'fill-rose'
                        }`}
                        style={{ width: `${item.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Events by Severity */}
            <div className="content-card">
              <div className="card-header">
                <div className="card-header-title">
                  <AlertTriangle size={18} className="text-amber" />
                  <h3>Incidents by Severity</h3>
                </div>
                <span className="badge-pill">{data.events_by_severity.length} Tiers</span>
              </div>
              <div className="distribution-list">
                {data.events_by_severity.map((item) => (
                  <div key={item.name} className="distribution-item">
                    <div className="distribution-label-row">
                      <span className="dist-name">{item.name}</span>
                      <span className="dist-count">
                        {item.value.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="dist-bar-track">
                      <div
                        className={`dist-bar-fill ${
                          item.name.toLowerCase() === 'critical'
                            ? 'fill-rose'
                            : item.name.toLowerCase() === 'high'
                            ? 'fill-amber'
                            : item.name.toLowerCase() === 'medium'
                            ? 'fill-cyan'
                            : 'fill-indigo'
                        }`}
                        style={{ width: `${item.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Warranty Horizon & Top Expiring Sites */}
          <div className="two-column-grid">
            {/* Warranty Lifecycle Horizon */}
            <div className="content-card">
              <div className="card-header">
                <div className="card-header-title">
                  <Calendar size={18} className="text-cyan" />
                  <h3>Warranty Horizon Buckets</h3>
                </div>
                <span className="badge-pill">Baseline 2026-10-14</span>
              </div>
              <div className="distribution-list">
                {data.warranties_by_bucket.map((bucket) => {
                  const pct = Math.round((bucket.value / data.total_devices) * 100)
                  return (
                    <div key={bucket.name} className="distribution-item">
                      <div className="distribution-label-row">
                        <span className="dist-name">{bucket.name}</span>
                        <span className="dist-count">
                          {bucket.value.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="dist-bar-track">
                        <div
                          className="dist-bar-fill fill-cyan"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Sites with Expiring Warranties */}
            <div className="content-card">
              <div className="card-header">
                <div className="card-header-title">
                  <Building size={18} className="text-amber" />
                  <h3>Top Sites: Impending Expiry (30d)</h3>
                </div>
                <span className="badge-pill">Immediate Renewal Priority</span>
              </div>
              <div className="top-sites-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Site Name</th>
                      <th style={{ textAlign: 'right' }}>Expiring Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_sites_by_expiring_warranties.map((site) => (
                      <tr key={site.name}>
                        <td className="font-medium text-primary">{site.name}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="badge-amber font-semibold">{site.value} devices</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Service Incidents Table */}
          <div className="content-card full-width-card">
            <div className="card-header">
              <div className="card-header-title">
                <AlertTriangle size={18} className="text-rose" />
                <h3>Recent Service Incidents</h3>
              </div>
              <span className="badge-pill">Latest 5 Database Events</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Asset Tag</th>
                    <th>Event Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Opened At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_service_events.map((event) => (
                    <tr key={event.id}>
                      <td className="font-mono text-muted">#{event.id}</td>
                      <td>
                        <span className="asset-tag-badge">{event.asset_tag}</span>
                      </td>
                      <td className="font-medium text-primary">
                        {event.event_type.replace(/_/g, ' ')}
                      </td>
                      <td>
                        <span className={`badge-severity ${getSeverityBadgeClass(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="badge-status-subtle">{event.status}</span>
                      </td>
                      <td className="text-muted">
                        {new Date(event.opened_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
