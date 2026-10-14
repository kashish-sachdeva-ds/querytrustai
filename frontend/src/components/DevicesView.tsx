import React, { useState, useEffect } from 'react'
import {
  Server,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Building,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import {
  type DeviceSummary,
  type DeviceDetail,
  type SiteSummary,
  fetchDevices,
  fetchDeviceDetail,
  fetchSites,
} from '../api/client'

export const DevicesView: React.FC = () => {
  const [devices, setDevices] = useState<DeviceSummary[]>([])
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [search, setSearch] = useState<string>('')
  const [deviceType, setDeviceType] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [siteId, setSiteId] = useState<number | undefined>(undefined)
  const [sortBy, setSortBy] = useState<string>('asset_tag')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer / Detail state
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [deviceDetail, setDeviceDetail] = useState<DeviceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)

  // Load sites once for filter dropdown
  useEffect(() => {
    fetchSites()
      .then((res) => setSites(res.items))
      .catch(() => {})
  }, [])

  // Load devices on filter / page change
  const loadDevices = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchDevices({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        device_type: deviceType || undefined,
        status: status || undefined,
        site_id: siteId,
        sort_by: sortBy,
        sort_dir: sortDir,
      })
      setDevices(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [page, pageSize, deviceType, status, siteId, sortBy, sortDir])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      loadDevices()
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const openDeviceModal = async (id: number) => {
    setSelectedDeviceId(id)
    setDetailLoading(true)
    try {
      const detail = await fetchDeviceDetail(id)
      setDeviceDetail(detail)
    } catch {
      setDeviceDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDeviceModal = () => {
    setSelectedDeviceId(null)
    setDeviceDetail(null)
  }

  const getStatusClass = (devStatus: string) => {
    switch (devStatus.toLowerCase()) {
      case 'active':
        return 'badge-status-active'
      case 'maintenance':
        return 'badge-status-maintenance'
      case 'decommissioned':
        return 'badge-status-decom'
      default:
        return 'badge-status-subtle'
    }
  }

  return (
    <div className="devices-view-container">
      {/* View Header */}
      <div className="page-action-row">
        <div>
          <h2 className="view-section-title">Hardware Inventory Explorer</h2>
          <p className="view-section-desc">
            Search, filter, and inspect {total.toLocaleString()} synthetic physical and virtual networking assets.
          </p>
        </div>

        <button
          type="button"
          className="refresh-btn"
          onClick={() => loadDevices()}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        {/* Search */}
        <div className="search-box">
          <Search size={16} className="text-secondary" />
          <input
            type="text"
            placeholder="Search asset tag, model, vendor, or serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div className="filter-select-wrapper">
          <select
            value={deviceType}
            onChange={(e) => {
              setDeviceType(e.target.value)
              setPage(1)
            }}
            className="filter-select"
          >
            <option value="">All Device Types</option>
            <option value="router">Router</option>
            <option value="switch">Switch</option>
            <option value="firewall">Firewall</option>
            <option value="access_point">Access Point</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="filter-select-wrapper">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="decommissioned">Decommissioned</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {/* Site Filter */}
        <div className="filter-select-wrapper">
          <select
            value={siteId !== undefined ? siteId : ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : undefined
              setSiteId(val)
              setPage(1)
            }}
            className="filter-select"
          >
            <option value="">All Sites ({sites.length})</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.site_name} ({s.region})
              </option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div className="filter-select-wrapper">
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [sb, sd] = e.target.value.split('-')
              setSortBy(sb)
              setSortDir(sd as 'asc' | 'desc')
              setPage(1)
            }}
            className="filter-select"
          >
            <option value="asset_tag-asc">Sort: Tag (A-Z)</option>
            <option value="asset_tag-desc">Sort: Tag (Z-A)</option>
            <option value="model-asc">Sort: Model (A-Z)</option>
            <option value="installed_at-desc">Sort: Installed (Newest)</option>
            <option value="installed_at-asc">Sort: Installed (Oldest)</option>
            <option value="warranty_expiry-asc">Sort: Warranty (Expiring Soon)</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-card" role="alert">
          <AlertTriangle size={20} className="text-rose" />
          <div className="error-content">
            <h4>Error Loading Inventory</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Type</th>
                <th>Model / Vendor</th>
                <th>Site &amp; Region</th>
                <th>Status</th>
                <th>Installed</th>
                <th>Warranty Expiry</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && devices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="table-loading-spinner" />
                    <p className="text-muted" style={{ marginTop: '0.75rem' }}>
                      Querying PostgreSQL database reader...
                    </p>
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Server size={32} className="text-secondary" style={{ margin: '0 auto 0.75rem auto' }} />
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      No devices match filters
                    </h4>
                    <p className="text-muted">
                      Try clearing filters or broadening search parameters.
                    </p>
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.id} className="interactive-row" onClick={() => openDeviceModal(dev.id)}>
                    <td>
                      <span className="asset-tag-badge">{dev.asset_tag}</span>
                    </td>
                    <td>
                      <span className="device-type-tag">{dev.device_type}</span>
                    </td>
                    <td>
                      <div className="model-vendor-cell">
                        <span className="model-name">{dev.model}</span>
                        <span className="vendor-subtle">{dev.vendor} &bull; v{dev.firmware_version}</span>
                      </div>
                    </td>
                    <td>
                      <div className="site-cell">
                        <span className="site-name">{dev.site_name || `Site #${dev.site_id}`}</span>
                        <span className="region-badge">{dev.region || 'Region'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge-pill ${getStatusClass(dev.status)}`}>
                        {dev.status}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{dev.installed_at}</td>
                    <td className="text-sm">
                      {dev.warranty_expiry ? (
                        <span
                          className={
                            new Date(dev.warranty_expiry) < new Date('2026-10-14')
                              ? 'text-rose font-medium'
                              : 'text-primary'
                          }
                        >
                          {dev.warranty_expiry}
                        </span>
                      ) : (
                        <span className="badge-missing-data">Missing</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="inspect-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeviceModal(dev.id)
                        }}
                      >
                        <span>Inspect</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="pagination-bar">
          <div className="pagination-info">
            Showing{' '}
            <span className="font-semibold text-primary">
              {total > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-primary">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className="font-semibold text-primary">{total.toLocaleString()}</span> devices
          </div>

          <div className="pagination-controls">
            <div className="page-size-picker">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value))
                  setPage(1)
                }}
                className="page-select"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="page-buttons">
              <button
                type="button"
                className="page-nav-btn"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="page-current">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                className="page-nav-btn"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Device Detail Modal Drawer */}
      {selectedDeviceId && (
        <div className="modal-backdrop" onClick={closeDeviceModal}>
          <div className="modal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Server size={20} className="text-indigo" />
                <div>
                  <h3 className="modal-title">Device Specification</h3>
                  <span className="modal-subtitle">ID #{selectedDeviceId}</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeDeviceModal}
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="modal-loading-state">
                <div className="table-loading-spinner" />
                <p className="text-muted">Loading telemetry &amp; events...</p>
              </div>
            ) : deviceDetail ? (
              <div className="modal-body">
                {/* Hardware Spec Grid */}
                <div className="spec-card">
                  <div className="spec-header-row">
                    <div>
                      <span className="asset-tag-badge" style={{ fontSize: '1rem', padding: '4px 10px' }}>
                        {deviceDetail.asset_tag}
                      </span>
                      <h4 className="spec-model-title">{deviceDetail.model}</h4>
                    </div>
                    <span className={`status-badge-pill ${getStatusClass(deviceDetail.status)}`}>
                      {deviceDetail.status}
                    </span>
                  </div>

                  <div className="spec-grid">
                    <div className="spec-item">
                      <span className="spec-label">Device Type</span>
                      <span className="spec-value">{deviceDetail.device_type}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Vendor</span>
                      <span className="spec-value">{deviceDetail.vendor}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Firmware</span>
                      <span className="spec-value">{deviceDetail.firmware_version}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Serial Number</span>
                      <span className="spec-value font-mono">{deviceDetail.serial_number || 'N/A'}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Installation Date</span>
                      <span className="spec-value">{deviceDetail.installed_at}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Warranty Expiry</span>
                      <span className="spec-value">{deviceDetail.warranty_expiry || 'Unspecified'}</span>
                    </div>
                  </div>
                </div>

                {/* Site Location Card */}
                <div className="spec-card" style={{ marginTop: '1rem' }}>
                  <div className="card-header-title" style={{ marginBottom: '0.75rem' }}>
                    <Building size={16} className="text-cyan" />
                    <h4 style={{ fontSize: '0.95rem' }}>Site Assignment</h4>
                  </div>
                  <div className="spec-grid">
                    <div className="spec-item">
                      <span className="spec-label">Facility</span>
                      <span className="spec-value">{deviceDetail.site_name}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Site Code</span>
                      <span className="spec-value font-mono">{deviceDetail.site_code}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Geographic Region</span>
                      <span className="spec-value">{deviceDetail.region}</span>
                    </div>
                  </div>
                </div>

                {/* Service Incident History */}
                <div className="spec-card" style={{ marginTop: '1rem' }}>
                  <div className="card-header-title" style={{ marginBottom: '0.75rem' }}>
                    <AlertTriangle size={16} className="text-amber" />
                    <h4 style={{ fontSize: '0.95rem' }}>
                      Associated Service Incidents ({deviceDetail.recent_events.length})
                    </h4>
                  </div>

                  {deviceDetail.recent_events.length === 0 ? (
                    <p className="text-muted text-sm">No historical service events recorded for this asset.</p>
                  ) : (
                    <div className="event-history-list">
                      {deviceDetail.recent_events.map((ev) => (
                        <div key={ev.id} className="event-history-item">
                          <div className="event-history-header">
                            <span className="font-semibold text-primary text-sm">
                              {ev.event_type.replace(/_/g, ' ')}
                            </span>
                            <span className="badge-severity badge-medium text-xs">
                              {ev.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="event-history-desc">{ev.description || 'System generated event log'}</p>
                          <div className="event-history-footer">
                            <span className="text-xs text-muted">Opened: {new Date(ev.opened_at).toLocaleDateString()}</span>
                            <span className="badge-status-subtle text-xs">{ev.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-rose">Failed to load device details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
