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
  ChevronDown,
  Copy,
  Check,
  Calendar,
  Cpu,
  Activity,
  AlertTriangle,
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
import { ExplainButton } from './ExplainButton'
import './DevicesView.css'

const readPositiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const readDeviceUrlState = () => {
  const pageSize = readPositiveInteger(readUrlParam('pageSize'), 50)
  const sort = readUrlParam('sort') || 'asset_tag-asc'
  const [sortBy = 'asset_tag', sortDirection = 'asc'] = sort.split('-')

  return {
    page: readPositiveInteger(readUrlParam('page'), 1),
    pageSize: [10, 20, 50, 100].includes(pageSize) ? pageSize : 50,
    search: readUrlParam('q') || '',
    deviceType: readUrlParam('type') || '',
    status: readUrlParam('status') || '',
    siteId: readUrlParam('site') ? readPositiveInteger(readUrlParam('site'), 0) || undefined : undefined,
    sortBy,
    sortDir: sortDirection === 'desc' ? ('desc' as const) : ('asc' as const),
  }
}

export const checkDataGlitch = (dev: DeviceSummary | DeviceDetail): { hasGlitch: boolean; message: string } => {
  const isDoubleV = dev.firmware_version?.startsWith('vv') || dev.firmware_version?.includes('vv')
  const isInvertedWarranty =
    dev.warranty_expiry &&
    dev.installed_at &&
    new Date(dev.warranty_expiry) < new Date(dev.installed_at)

  if (isDoubleV && isInvertedWarranty) {
    return { hasGlitch: true, message: 'Double "v" firmware format & warranty date precedes installation' }
  }
  if (isDoubleV) {
    return { hasGlitch: true, message: 'Double "v" firmware prefix format (e.g. vv1.8.1)' }
  }
  if (isInvertedWarranty) {
    return { hasGlitch: true, message: 'Recorded warranty expiry date precedes installation date' }
  }
  return { hasGlitch: false, message: '' }
}

export const formatFirmwareVersion = (version?: string | null): string => {
  if (!version) return '—'
  const cleaned = version.replace(/^v+/i, '')
  return `v${cleaned}`
}

export interface WarrantyStatusInfo {
  label: string
  variant: 'expired' | 'warning' | 'covered' | 'unknown'
}

export const getWarrantyStatus = (expiryDateStr?: string | null): WarrantyStatusInfo => {
  if (!expiryDateStr) return { label: '—', variant: 'unknown' }
  const expiry = new Date(expiryDateStr)
  if (isNaN(expiry.getTime())) return { label: expiryDateStr, variant: 'unknown' }

  const today = new Date('2026-10-17')
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Expired', variant: 'expired' }
  } else if (diffDays <= 90) {
    return { label: `Ends in ${diffDays} days`, variant: 'warning' }
  } else {
    return { label: `Covered until ${expiry.getFullYear()}`, variant: 'covered' }
  }
}

type QuickFilterKey = 'all' | 'warranty_soon' | 'offline' | 'open_incidents' | 'glitch'

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
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>('all')
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

  // Trap focus inside modal drawer
  const handleDrawerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const panel = drawerPanelRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

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

  // Debounce search input (300ms)
  useEffect(() => {
    if (isInitialSearchEffect.current) {
      isInitialSearchEffect.current = false
      return
    }
    const timer = setTimeout(() => {
      withLayoutTransition(() => {
        setDebouncedSearch(search)
        setPage(1)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadDevices = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchDevices({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
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
      setError(err instanceof Error ? err.message : 'Failed to retrieve inventory data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [page, pageSize, debouncedSearch, deviceType, status, siteId, sortBy, sortDir])

  useEffect(() => {
    replaceUrlParams({
      page: page === 1 ? null : page,
      pageSize: pageSize === 50 ? null : pageSize,
      q: debouncedSearch || null,
      type: deviceType || null,
      status: status || null,
      site: siteId || null,
      sort: sortBy === 'asset_tag' && sortDir === 'asc' ? null : `${sortBy}-${sortDir}`,
    })
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

  useEffect(() => {
    const deviceId = readPositiveInteger(readUrlParam('device'), 0)
    if (!deviceId) return
    openDeviceModal(deviceId)
    replaceUrlParams({ device: null })
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
      /* Fallback */
    }
  }

  const handleSelectQuickFilter = (qf: QuickFilterKey) => {
    setQuickFilter(qf)
    setPage(1)
    if (qf === 'all') {
      setStatus('')
      setSortBy('asset_tag')
      setSortDir('asc')
    } else if (qf === 'warranty_soon') {
      setStatus('')
      setSortBy('warranty_expiry')
      setSortDir('asc')
    } else if (qf === 'offline') {
      setStatus('inactive')
    } else if (qf === 'open_incidents') {
      setStatus('maintenance')
    } else if (qf === 'glitch') {
      setStatus('')
    }
  }

  const displayedDevices = quickFilter === 'glitch'
    ? devices.filter((d) => checkDataGlitch(d).hasGlitch)
    : devices

  const renderStatusPill = (devStatus: string) => {
    const s = devStatus.toLowerCase()
    let className = 'status-semantic-pill '
    let label = 'Active'
    if (s.includes('active')) {
      className += 'active'
      label = 'Active'
    } else if (s.includes('maint')) {
      className += 'maintenance'
      label = 'Maintenance'
    } else if (s.includes('decom')) {
      className += 'decommissioned'
      label = 'Decommissioned'
    } else {
      className += 'offline'
      label = 'Offline'
    }

    return (
      <span className={className}>
        <span className="status-dot-indicator" aria-hidden="true" />
        <span>{label}</span>
      </span>
    )
  }

  return (
    <div className="devices-view-container">
      {/* 1. VIEW HERO ROW */}
      <div className="devices-hero-row">
        <div>
          <h2 className="devices-heading">Find equipment</h2>
          <p className="devices-copy">
            Search 5,000 devices by name, place or status.
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
          <ExplainButton
            title="Hardware Inventory"
            explanation="A read-only catalog of all network devices across all operating sites, with live status and maintenance history."
          />
        </div>
      </div>

      {/* 2. QUICK FILTER CHIPS */}
      <div className="devices-quick-chips" role="group" aria-label="Quick filters">
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'warranty_soon' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('warranty_soon')}
          title="Sorted by upcoming warranty expiration dates"
        >
          Warranty ending soon
        </button>
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'offline' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('offline')}
          title="Filtered to inactive/offline equipment (Real API)"
        >
          Offline
        </button>
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'open_incidents' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('open_incidents')}
          title="Equipment with active maintenance events (Mocked filter)"
        >
          <span>Has open incidents</span>
          <span className="chip-mock-pill">Mocked filter</span>
        </button>
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'glitch' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('glitch')}
          title="Equipment with version format anomalies or inverted warranty records"
        >
          <span>Needs data fix</span>
          <span className="chip-mock-pill">Glitch filter</span>
        </button>
      </div>

      {/* 3. SEARCH & DROPDOWN TOOLBAR */}
      <div className="devices-filter-toolbar">
        {/* Search Input */}
        <div className="devices-search-box">
          <Search size={14} className="devices-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search asset tag, model, vendor, or serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="devices-search-input"
            aria-label="Search equipment"
          />
          <div className="devices-search-badges">
            {search ? (
              <button
                type="button"
                className="devices-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
                aria-label="Clear search"
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
            <option value="inactive">Inactive / Offline</option>
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

      {/* 4. ENTERPRISE DATA TABLE / RESPONSIVE CARDS */}
      <div className="devices-table-card layout-transition-target">
        <div className="devices-table-container">
          <table className="devices-table">
            <thead>
              <tr className="devices-table-header">
                <th style={{ width: '160px' }}>ASSET TAG</th>
                <th style={{ width: '120px' }}>TYPE</th>
                <th>MODEL / VENDOR</th>
                <th style={{ width: '180px' }}>SITE &amp; REGION</th>
                <th style={{ width: '130px' }}>STATUS</th>
                <th style={{ width: '120px' }}>INSTALLED</th>
                <th style={{ width: '160px' }}>WARRANTY</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
                    <span style={{ fontSize: '12.5px', color: 'var(--qt-muted)' }}>
                      Loading equipment inventory...
                    </span>
                  </td>
                </tr>
              ) : displayedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <Server size={30} style={{ color: 'var(--qt-muted)', margin: '0 auto 0.5rem auto' }} />
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--qt-ink)' }}>
                      No devices match filters
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--qt-muted)', marginTop: '0.25rem' }}>
                      Try clearing filters or broadening search parameters.
                    </div>
                  </td>
                </tr>
              ) : (
                displayedDevices.map((dev) => {
                  const glitch = checkDataGlitch(dev)
                  const warrantyInfo = getWarrantyStatus(dev.warranty_expiry)
                  return (
                    <tr
                      key={dev.id}
                      className="devices-table-row group"
                      onClick={() => openDeviceModal(dev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openDeviceModal(dev.id)
                        }
                      }}
                      aria-label={`Inspect ${dev.asset_tag} details`}
                    >
                      {/* Asset Tag Token */}
                      <td data-label="Asset Tag">
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span className="asset-tag-token">{dev.asset_tag}</span>
                          {glitch.hasGlitch && (
                            <span
                              className="data-attention-pill"
                              title={`Data needs attention: ${glitch.message}`}
                            >
                              <AlertTriangle size={10} />
                              Needs attention
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Device Type */}
                      <td data-label="Type">
                        <span className="device-type-token">{dev.device_type}</span>
                      </td>

                      {/* Model & Vendor */}
                      <td data-label="Model / Vendor">
                        <div className="model-vendor-cell">
                          <span className="model-name-text" title={dev.model}>
                            {dev.model}
                          </span>
                          <span
                            className="vendor-subtle-text"
                            title={`${dev.vendor} • ${formatFirmwareVersion(dev.firmware_version)}`}
                          >
                            {dev.vendor} &bull; {formatFirmwareVersion(dev.firmware_version)}
                          </span>
                        </div>
                      </td>

                      {/* Site & Region */}
                      <td data-label="Site & Region">
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
                      <td data-label="Status">{renderStatusPill(dev.status)}</td>

                      {/* Installed Date (WCAG AA High Contrast) */}
                      <td data-label="Installed">
                        <span className="mono-date-text">{dev.installed_at || '—'}</span>
                      </td>

                      {/* Warranty Column (Plain status with exact date on hover) */}
                      <td
                        data-label="Warranty"
                        title={dev.warranty_expiry ? `Exact warranty expiration date: ${dev.warranty_expiry}` : 'No warranty record'}
                      >
                        {dev.warranty_expiry ? (
                          <span className={`warranty-status-pill ${warrantyInfo.variant}`}>
                            {warrantyInfo.label}
                          </span>
                        ) : (
                          <span className="empty-metric-dash">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION FOOTER */}
        <div className="pagination-bar">
          <div className="pagination-info">
            Showing <span className="pagination-strong">{total > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, total)}</span> of <span className="pagination-strong">{total.toLocaleString()}</span>
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
                className="page-select accessible-native-select"
                aria-label="Items per page"
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
                aria-label="Previous page"
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
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. ASSET INSPECT SLIDE-OVER DRAWER */}
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

                <div className="asset-drawer-meta-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 id="asset-drawer-title" className="sr-only">
                      Hardware Inventory Specification {deviceDetail?.asset_tag || `#${selectedDeviceId}`}
                    </h3>
                    <span>Hardware Inventory Specification</span>
                    <span>ID #{selectedDeviceId}</span>
                  </div>
                  <ExplainButton
                    title="Hardware Specification Drawer"
                    explanation="Detailed network device telemetry, site location, warranty dates, and recent service incidents."
                  />
                </div>
              </div>

              {/* Body */}
              {detailLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
                  <p style={{ fontSize: '12.5px', color: 'var(--qt-muted)' }}>
                    Loading device specifications &amp; events...
                  </p>
                </div>
              ) : deviceDetail ? (
                <div className="asset-drawer-body">
                  {/* Data hygiene note if glitch detected */}
                  {deviceDetail && checkDataGlitch(deviceDetail).hasGlitch && (
                    <div className="data-hygiene-note">
                      <AlertTriangle size={15} style={{ color: 'var(--qt-warning)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong>Gentle Data Hygiene Note</strong>
                        <span>{checkDataGlitch(deviceDetail).message}. Because QueryTrust AI maintains strictly read-only access, source records are preserved as-is.</span>
                      </div>
                    </div>
                  )}
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
                          <span className="asset-spec-val mono">{formatFirmwareVersion(deviceDetail.firmware_version)}</span>
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

                  {/* Section 3: Warranty Coverage Horizon */}
                  <div>
                    <div className="asset-section-label">
                      <span>Warranty Horizon</span>
                      <Calendar size={13} />
                    </div>
                    <div className="asset-spec-card">
                      <div className="asset-spec-grid-2">
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Coverage Status</span>
                          <span className="asset-spec-val">
                            {deviceDetail.warranty_expiry ? (
                              <span className={`warranty-status-pill ${getWarrantyStatus(deviceDetail.warranty_expiry).variant}`}>
                                {getWarrantyStatus(deviceDetail.warranty_expiry).label}
                              </span>
                            ) : (
                              'No Warranty Record'
                            )}
                          </span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Exact Expiration</span>
                          <span className="asset-spec-val mono">
                            {deviceDetail.warranty_expiry || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Recent Service Incidents */}
                  <div>
                    <div className="asset-section-label">
                      <span>Recent Service Incidents</span>
                      <Activity size={13} />
                    </div>
                    {deviceDetail.recent_events && deviceDetail.recent_events.length > 0 ? (
                      <div className="asset-events-list">
                        {deviceDetail.recent_events.map((evt) => (
                          <div key={evt.id} className="asset-event-card">
                            <div className="asset-event-top">
                              <span className="asset-event-type">{evt.event_type}</span>
                              <span className={`asset-event-sev ${evt.severity.toLowerCase()}`}>
                                {evt.severity}
                              </span>
                            </div>
                            <div className="asset-event-desc">{evt.description}</div>
                            <div className="asset-event-date">{evt.opened_at}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="asset-events-empty">
                        <span>No historical or open service incidents recorded.</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--qt-muted)' }}>
                  Unable to load specifications for device #{selectedDeviceId}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
