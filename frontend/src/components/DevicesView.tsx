import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Server,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Building,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Copy,
  Check,
  Calendar,
  Cpu,
  Activity,
} from 'lucide-react'
import {
  type DeviceSummary,
  type DeviceDetail,
  type SiteSummary,
  fetchDevices,
  fetchDeviceDetail,
  fetchSites,
} from '../api/client'
import { withLayoutTransition } from '../motion'
import { readUrlParam, replaceUrlParams } from '../urlState'
import './DevicesView.css'

const readPositiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const readDeviceUrlState = () => {
  const pageSize = readPositiveInteger(readUrlParam('pageSize'), 20)
  const sort = readUrlParam('sort') || 'asset_tag-asc'
  const [sortBy = 'asset_tag', sortDirection = 'asc'] = sort.split('-')

  return {
    page: readPositiveInteger(readUrlParam('page'), 1),
    pageSize: [10, 20, 50, 100].includes(pageSize) ? pageSize : 20,
    search: readUrlParam('q') || '',
    deviceType: readUrlParam('type') || '',
    status: readUrlParam('status') || '',
    siteId: readUrlParam('site') ? readPositiveInteger(readUrlParam('site'), 0) || undefined : undefined,
    sortBy,
    sortDir: sortDirection === 'desc' ? ('desc' as const) : ('asc' as const),
  }
}

export const DevicesView: React.FC = () => {
  const initialUrlState = readDeviceUrlState()
  const [devices, setDevices] = useState<DeviceSummary[]>([])
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(initialUrlState.page)
  const [pageSize, setPageSize] = useState<number>(initialUrlState.pageSize)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [search, setSearch] = useState<string>(initialUrlState.search)
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialUrlState.search)
  const [deviceType, setDeviceType] = useState<string>(initialUrlState.deviceType)
  const [status, setStatus] = useState<string>(initialUrlState.status)
  const [siteId, setSiteId] = useState<number | undefined>(initialUrlState.siteId)
  const [sortBy, setSortBy] = useState<string>(initialUrlState.sortBy)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialUrlState.sortDir)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedAssetId, setCopiedAssetId] = useState(false)
  const isInitialSearchEffect = useRef(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Drawer / Detail state
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [deviceDetail, setDeviceDetail] = useState<DeviceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const drawerPanelRef = useRef<HTMLDivElement>(null)

  // Load sites once for filter dropdown
  useEffect(() => {
    fetchSites()
      .then((res) => setSites(res.items))
      .catch(() => {})
  }, [])

  // Focus management for drawer: focus first element on open
  useEffect(() => {
    if (!selectedDeviceId) return
    const timer = setTimeout(() => {
      const focusable = drawerPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable && focusable.length > 0) {
        focusable[0].focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedDeviceId])

  // Global shortcut '/' to focus search input, 'Escape' to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape' && selectedDeviceId) {
        closeDeviceModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDeviceId])

  // Keydown handler to trap focus within drawer
  const handleDrawerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeDeviceModal()
      return
    }
    if (e.key === 'Tab') {
      const focusable = drawerPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }

  // Load devices on filter / page change
  const loadDevices = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchDevices({
        page,
        page_size: pageSize,
        search: debouncedSearch.trim() || undefined,
        device_type: deviceType || undefined,
        status: status || undefined,
        site_id: siteId,
        sort_by: sortBy,
        sort_dir: sortDir,
      })
      withLayoutTransition(() => {
        setDevices(res.items)
        setTotal(res.total)
        setTotalPages(res.total_pages)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices.')
    } finally {
      withLayoutTransition(() => setLoading(false))
    }
  }

  useEffect(() => {
    if (isInitialSearchEffect.current) {
      isInitialSearchEffect.current = false
      return
    }
    const timer = setTimeout(() => {
      setPage(1)
      setDebouncedSearch(search)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    replaceUrlParams({
      q: search,
      type: deviceType,
      status,
      site: siteId,
      page: page === 1 ? null : page,
      pageSize: pageSize === 20 ? null : pageSize,
      sort: sortBy === 'asset_tag' && sortDir === 'asc' ? null : `${sortBy}-${sortDir}`,
    })
  }, [search, deviceType, status, siteId, page, pageSize, sortBy, sortDir])

  useEffect(() => {
    loadDevices()
  }, [page, pageSize, debouncedSearch, deviceType, status, siteId, sortBy, sortDir])

  useEffect(() => {
    const syncFiltersFromBrowserHistory = () => {
      const next = readDeviceUrlState()
      withLayoutTransition(() => {
        setPage(next.page)
        setPageSize(next.pageSize)
        setSearch(next.search)
        setDebouncedSearch(next.search)
        setDeviceType(next.deviceType)
        setStatus(next.status)
        setSiteId(next.siteId)
        setSortBy(next.sortBy)
        setSortDir(next.sortDir)
      })
    }
    window.addEventListener('popstate', syncFiltersFromBrowserHistory)
    return () => window.removeEventListener('popstate', syncFiltersFromBrowserHistory)
  }, [])

  const openDeviceModal = async (id: number) => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement
    withLayoutTransition(() => setSelectedDeviceId(id))
    setDetailLoading(true)
    setCopiedAssetId(false)
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
    withLayoutTransition(() => {
      setSelectedDeviceId(null)
      setDeviceDetail(null)
    })
    lastFocusedElementRef.current?.focus()
  }

  const handleCopyAssetId = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag)
      setCopiedAssetId(true)
      setTimeout(() => setCopiedAssetId(false), 2000)
    } catch {
      // Fallback
    }
  }

  const renderStatusPill = (devStatus: string) => {
    const s = devStatus.toLowerCase()
    let className = 'status-semantic-pill '
    let label = 'ACTIVE'
    if (s.includes('active')) {
      className += 'active'
      label = 'ACTIVE'
    } else if (s.includes('maint')) {
      className += 'maintenance'
      label = 'MAINTENANCE'
    } else if (s.includes('decom')) {
      className += 'decommissioned'
      label = 'DECOMMISSIONED'
    } else {
      className += 'offline'
      label = 'OFFLINE'
    }

    return (
      <span className={className}>
        <span className="status-dot-mini" />
        {label}
      </span>
    )
  }

  return (
    <div className="devices-view-container">
      {/* 1. VIEW HERO ROW */}
      <div className="devices-hero-row">
        <div>
          <div className="devices-eyebrow">
            <span style={{ color: 'var(--qt-accent, #FF4F00)' }}>●</span>
            FLEET INVENTORY / ASSET REGISTER
          </div>
          <h2 className="devices-heading">Hardware Inventory Explorer</h2>
          <p className="devices-copy">
            Search, filter, and inspect {total.toLocaleString()} synthetic physical and virtual networking assets.
            Full lifecycle, firmware, and telemetry association.
          </p>
        </div>

        <div className="devices-hero-actions">
          <span className="devices-count-pill">
            <Server size={12} />
            <span>{total.toLocaleString()} Assets</span>
          </span>
          <button
            type="button"
            className="devices-refresh-btn"
            onClick={() => loadDevices()}
            disabled={loading}
            title="Refresh device inventory"
          >
            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. UPGRADED FILTER TOOLBAR */}
      <div className="devices-filter-toolbar">
        {/* Search Input with Magnifying Glass & Keyboard Shortcut Badge */}
        <div className="devices-search-box">
          <Search size={14} className="devices-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search asset tag, model, vendor, or serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="devices-search-input"
          />
          <div className="devices-search-badges">
            {search ? (
              <button
                type="button"
                className="devices-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            ) : (
              <span className="devices-search-kbd">/</span>
            )}
          </div>
        </div>

        {/* Type Select */}
        <div className="select-control-wrapper">
          <label htmlFor="filter-device-type" className="sr-only">Filter by Device Type</label>
          <select
            id="filter-device-type"
            value={deviceType}
            onChange={(e) => {
              withLayoutTransition(() => {
                setDeviceType(e.target.value)
                setPage(1)
              })
            }}
            className="accessible-native-select"
            aria-label="Filter by Device Type"
          >
            <option value="">All Device Types</option>
            <option value="router">Router</option>
            <option value="switch">Switch</option>
            <option value="firewall">Firewall</option>
            <option value="access_point">Access Point</option>
          </select>
          <ChevronDown size={14} className="select-dropdown-icon" aria-hidden="true" />
        </div>

        {/* Status Select */}
        <div className="select-control-wrapper">
          <label htmlFor="filter-status" className="sr-only">Filter by Status</label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => {
              withLayoutTransition(() => {
                setStatus(e.target.value)
                setPage(1)
              })
            }}
            className="accessible-native-select"
            aria-label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="decommissioned">Decommissioned</option>
            <option value="offline">Offline</option>
          </select>
          <ChevronDown size={14} className="select-dropdown-icon" aria-hidden="true" />
        </div>

        {/* Site Select */}
        <div className="select-control-wrapper">
          <label htmlFor="filter-site" className="sr-only">Filter by Site</label>
          <select
            id="filter-site"
            value={siteId !== undefined ? siteId : ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : undefined
              withLayoutTransition(() => {
                setSiteId(val)
                setPage(1)
              })
            }}
            className="accessible-native-select"
            aria-label="Filter by Site"
          >
            <option value="">All Sites ({sites.length || 50})</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.site_name} ({s.region})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="select-dropdown-icon" aria-hidden="true" />
        </div>

        {/* Sort Select */}
        <div className="select-control-wrapper">
          <label htmlFor="filter-sort" className="sr-only">Sort Devices</label>
          <select
            id="filter-sort"
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [sb, sd] = e.target.value.split('-')
              withLayoutTransition(() => {
                setSortBy(sb)
                setSortDir(sd as 'asc' | 'desc')
                setPage(1)
              })
            }}
            className="accessible-native-select"
            aria-label="Sort Devices"
          >
            <option value="asset_tag-asc">Sort: Tag (A-Z)</option>
            <option value="asset_tag-desc">Sort: Tag (Z-A)</option>
            <option value="model-asc">Sort: Model (A-Z)</option>
            <option value="installed_at-desc">Sort: Installed (Newest)</option>
            <option value="installed_at-asc">Sort: Installed (Oldest)</option>
            <option value="warranty_expiry-asc">Sort: Warranty (Expiring Soon)</option>
          </select>
          <ChevronDown size={14} className="select-dropdown-icon" aria-hidden="true" />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="security-alert-box alert-error" role="alert">
          <div className="alert-title">Error Loading Inventory</div>
          <div className="alert-desc">{error}</div>
        </div>
      )}

      {/* 3. ENTERPRISE DATA TABLE */}
      <div className="devices-table-card layout-transition-target">
        <div className="devices-table-container">
          <table className="devices-table">
            <thead>
              <tr className="devices-table-header">
                <th style={{ width: '150px' }}>ASSET TAG</th>
                <th style={{ width: '130px' }}>TYPE</th>
                <th>MODEL / VENDOR</th>
                <th style={{ width: '190px' }}>SITE &amp; REGION</th>
                <th style={{ width: '140px' }}>STATUS</th>
                <th style={{ width: '120px' }}>INSTALLED</th>
                <th style={{ width: '140px' }}>WARRANTY EXPIRY</th>
                <th style={{ width: '110px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && devices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
                    <span style={{ fontSize: '12.5px', color: '#71706B' }}>
                      Querying PostgreSQL inventory repository...
                    </span>
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <Server size={30} style={{ color: '#A1A09A', margin: '0 auto 0.5rem auto' }} />
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#141413' }}>
                      No devices match filters
                    </div>
                    <div style={{ fontSize: '12px', color: '#71706B', marginTop: '0.25rem' }}>
                      Try clearing filters or broadening search parameters.
                    </div>
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr
                    key={dev.id}
                    className="devices-table-row group"
                    onClick={() => openDeviceModal(dev.id)}
                  >
                    {/* Asset Tag Token */}
                    <td>
                      <span className="asset-tag-token">{dev.asset_tag}</span>
                    </td>

                    {/* Device Type */}
                    <td>
                      <span className="device-type-token">{dev.device_type}</span>
                    </td>

                    {/* Model & Vendor */}
                    <td>
                      <div className="model-vendor-cell">
                        <span className="model-name-text" title={dev.model}>
                          {dev.model}
                        </span>
                        <span
                          className="vendor-subtle-text"
                          title={`${dev.vendor} • v${dev.firmware_version}`}
                        >
                          {dev.vendor} &bull; v{dev.firmware_version}
                        </span>
                      </div>
                    </td>

                    {/* Site & Region */}
                    <td>
                      <div className="site-cell-wrap">
                        <span
                          className="site-name-text"
                          title={dev.site_name || `Site #${dev.site_id}`}
                        >
                          {dev.site_name || `Site #${dev.site_id}`}
                        </span>
                        <span className="region-code-badge">
                          {dev.region || 'Region'}
                        </span>
                      </div>
                    </td>

                    {/* Status Semantic Pill */}
                    <td>{renderStatusPill(dev.status)}</td>

                    {/* Installed Date */}
                    <td>
                      <span className="mono-date-text">{dev.installed_at}</span>
                    </td>

                    {/* Warranty Expiry */}
                    <td>
                      {dev.warranty_expiry ? (
                        <span className="mono-date-text">
                          {dev.warranty_expiry}
                        </span>
                      ) : (
                        <span className="empty-metric-dash">—</span>
                      )}
                    </td>

                    {/* Inspect Button */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="device-inspect-btn"
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
        <div className="pagination-bar" style={{ borderTop: '1px solid #EFECE6' }}>
          <div style={{ fontSize: '12px', color: '#71706B' }}>
            Showing{' '}
            <span style={{ fontWeight: 600, color: '#141413' }}>
              {total > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span style={{ fontWeight: 600, color: '#141413' }}>
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span style={{ fontWeight: 600, color: '#141413' }}>{total.toLocaleString()}</span> devices
          </div>

          <div className="pagination-controls">
            <div className="page-size-picker">
              <span style={{ fontSize: '12px', color: '#71706B' }}>Show</span>
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
              <span className="page-current" style={{ fontSize: '12px' }}>
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

      {/* 4. ASSET INSPECT SLIDE-OVER DRAWER (PORTAL ATTACHED) */}
      {selectedDeviceId &&
        createPortal(
          <div className="asset-drawer-backdrop" onClick={closeDeviceModal}>
            <div
              ref={drawerPanelRef}
              className="asset-drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="asset-drawer-title"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleDrawerKeyDown}
            >
              {/* Header */}
              <div className="asset-drawer-header">
                <div className="asset-drawer-header-top">
                  <div className="asset-drawer-badges">
                    <button
                      className="asset-id-pill"
                      onClick={() => {
                        if (deviceDetail?.asset_tag) handleCopyAssetId(deviceDetail.asset_tag)
                      }}
                      title="Click to copy Asset Tag"
                      disabled={!deviceDetail?.asset_tag}
                    >
                      <span>{deviceDetail?.asset_tag || 'Asset identifier loading'}</span>
                      {copiedAssetId ? <Check size={12} color="var(--qt-accent, #FF4F00)" /> : <Copy size={12} />}
                    </button>

                    {deviceDetail && (
                      <span className="asset-category-pill">
                        {deviceDetail.device_type}
                      </span>
                    )}

                    {deviceDetail && renderStatusPill(deviceDetail.status)}
                  </div>

                  <button
                    type="button"
                    className="asset-close-btn"
                    onClick={closeDeviceModal}
                    title="Close inspector (Esc)"
                    aria-label="Close device inspection drawer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="asset-drawer-meta-sub">
                  <h3 id="asset-drawer-title" className="sr-only">
                    Hardware Inventory Specification {deviceDetail?.asset_tag || `#${selectedDeviceId}`}
                  </h3>
                  <span>Hardware Inventory Specification</span>
                  <span>ID #{selectedDeviceId}</span>
                </div>
              </div>

              {/* Body */}
              {detailLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
                  <p style={{ fontSize: '12.5px', color: '#71706B' }}>
                    Loading device specifications &amp; events...
                  </p>
                </div>
              ) : deviceDetail ? (
                <div className="asset-drawer-body">
                  {/* Section 1: Hardware & Firmware Specs */}
                  <div>
                    <div className="asset-section-label">
                      <span>Hardware &amp; Firmware Specs</span>
                      <Cpu size={13} />
                    </div>
                    <div className="asset-spec-card">
                      <div className="asset-spec-grid-2">
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Model</span>
                          <span className="asset-spec-val">{deviceDetail.model}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Vendor</span>
                          <span className="asset-spec-val">{deviceDetail.vendor}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Firmware Version</span>
                          <span className="asset-spec-val mono">v{deviceDetail.firmware_version}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Serial Number</span>
                          <span className="asset-spec-val mono">
                            {deviceDetail.serial_number || '—'}
                          </span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Device ID</span>
                          <span className="asset-spec-val mono">#{deviceDetail.id}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Site & Deployment Details */}
                  <div>
                    <div className="asset-section-label">
                      <span>Site &amp; Deployment Details</span>
                      <Building size={13} />
                    </div>
                    <div className="asset-spec-card">
                      <div className="asset-spec-grid-2">
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Facility Name</span>
                          <span className="asset-spec-val">{deviceDetail.site_name}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Site Code</span>
                          <span className="asset-spec-val mono">{deviceDetail.site_code}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Geographic Region</span>
                          <span className="asset-spec-val">{deviceDetail.region}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Installation Date</span>
                          <span className="asset-spec-val mono">{deviceDetail.installed_at}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Warranty & Lifecycle Status */}
                  <div>
                    <div className="asset-section-label">
                      <span>Warranty &amp; Lifecycle Status</span>
                      <Calendar size={13} />
                    </div>
                    <div className="asset-spec-card">
                      <div className="asset-spec-grid-2">
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Warranty Expiry</span>
                          <span className="asset-spec-val mono">
                            {deviceDetail.warranty_expiry || 'Unspecified'}
                          </span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Device Status</span>
                          <span className="asset-spec-val" style={{ textTransform: 'capitalize' }}>
                            {deviceDetail.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Associated Telemetry & Events */}
                  <div>
                    <div className="asset-section-label">
                      <span>Associated Service Incidents ({deviceDetail.recent_events.length})</span>
                      <Activity size={13} />
                    </div>
                    {deviceDetail.recent_events.length === 0 ? (
                      <div className="asset-spec-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <span style={{ fontSize: '12px', color: '#71706B' }}>
                          No historical service events recorded for this asset.
                        </span>
                      </div>
                    ) : (
                      <div className="incident-history-list">
                        {deviceDetail.recent_events.map((ev) => (
                          <div key={ev.id} className="incident-history-item">
                            <div className="incident-history-header">
                              <span className="incident-type-text">
                                {ev.event_type.replace(/_/g, ' ')}
                              </span>
                              <span
                                className={`severity-pill ${
                                  ev.severity.toLowerCase().includes('high') ||
                                  ev.severity.toLowerCase().includes('crit')
                                    ? 'high'
                                    : ev.severity.toLowerCase().includes('med')
                                    ? 'medium'
                                    : 'low'
                                }`}
                              >
                                {ev.severity}
                              </span>
                            </div>
                            <p className="incident-desc-text">
                              {ev.description || 'No event description recorded.'}
                            </p>
                            <div className="incident-footer-meta">
                              <span>Opened: {new Date(ev.opened_at).toLocaleDateString()}</span>
                              <span style={{ textTransform: 'capitalize' }}>Status: {ev.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444' }}>
                  Failed to load device details from server.
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
