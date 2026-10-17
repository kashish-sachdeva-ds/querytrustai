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
  MessageSquareText,
} from 'lucide-react'
import {
  type DeviceSummary,
  type DeviceDetail,
  type SiteSummary,
  type DeviceCountsResponse,
  fetchDevices,
  fetchDeviceDetail,
  fetchDeviceCounts,
  fetchSites,
} from '../api/client'
import { withLayoutTransition } from '../motion'
import { readUrlParam, replaceUrlParams } from '../urlState'
import { ExplainButton } from './ExplainButton'
import { PageHeader } from './PageHeader'
import { HumanDate } from './HumanDate'
import './DevicesView.css'

interface DevicesViewProps {
  onAskQuestion?: (question: string) => void
}

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

const APPROVED_DEVICE_TYPES = new Set(['Switch', 'Router', 'Firewall', 'Access Point', 'Gateway'])
const APPROVED_STATUSES = new Set(['active', 'inactive', 'maintenance', 'decommissioned'])

export const checkDataGlitch = (
  dev: DeviceSummary | DeviceDetail
): { hasGlitch: boolean; message: string; ruleId?: string } => {
  const issues: string[] = []
  let ruleId = ''

  if (!dev.warranty_expiry) {
    issues.push('Missing warranty expiration date')
    ruleId = 'DQ-001a'
  }
  if (!dev.serial_number || dev.serial_number.trim() === '') {
    issues.push('Missing hardware chassis serial number')
    ruleId = ruleId || 'DQ-001b'
  }
  if (
    dev.warranty_expiry &&
    dev.installed_at &&
    new Date(dev.warranty_expiry) < new Date(dev.installed_at)
  ) {
    issues.push('Warranty expiry date precedes installation date')
    ruleId = ruleId || 'DQ-002'
  }
  if (dev.device_type && !APPROVED_DEVICE_TYPES.has(dev.device_type)) {
    issues.push(`Inconsistent category format: "${dev.device_type}"`)
    ruleId = ruleId || 'DQ-004'
  }
  const normStatus = dev.status ? dev.status.trim().toLowerCase() : ''
  if (normStatus && !APPROVED_STATUSES.has(normStatus)) {
    issues.push(`Unapproved lifecycle status: "${dev.status}"`)
    ruleId = ruleId || 'DQ-005'
  }

  if (issues.length > 0) {
    return { hasGlitch: true, message: issues.join('; '), ruleId }
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
  if (!expiryDateStr) return { label: 'No warranty on record', variant: 'unknown' }
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

type QuickFilterKey = 'all' | 'active' | 'offline' | 'warranty_soon' | 'open_incidents' | 'needs_data_fix'

export const DevicesView: React.FC<DevicesViewProps> = ({ onAskQuestion }) => {
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
  const [deviceCounts, setDeviceCounts] = useState<DeviceCountsResponse | null>(null)
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

  // Load sites and quick counts once on mount
  useEffect(() => {
    fetchSites()
      .then((res) => setSites(res.items))
      .catch(() => {})
    fetchDeviceCounts()
      .then((counts) => setDeviceCounts(counts))
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
        has_open_incidents: quickFilter === 'open_incidents' ? true : undefined,
        needs_data_fix: quickFilter === 'needs_data_fix' ? true : undefined,
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
  }, [page, pageSize, debouncedSearch, deviceType, status, siteId, sortBy, sortDir, quickFilter])

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
    } else if (qf === 'active') {
      setStatus('active')
    } else if (qf === 'offline') {
      setStatus('offline')
    } else if (qf === 'warranty_soon') {
      setStatus('')
      setSortBy('warranty_expiry')
      setSortDir('asc')
    } else {
      setStatus('')
    }
  }

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
      label = 'Retired'
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
      {/* 1. Standard Unified Header */}
      <PageHeader
        title="Equipment explorer"
        description="Search and inspect 5,000 synthetic network devices across all operating sites."
        helpText="Filter devices by model, vendor, location, status, or warranty. Click any row to view full hardware specs, location details, warranty horizon, and maintenance events."
        actions={
          <div className="devices-hero-actions">
            <span className="devices-count-pill">
              <Server size={12} />
              <span>{total.toLocaleString()} assets</span>
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
        }
      />

      {/* 2. QUICK FILTER CHIPS with server-sourced counts */}
      <div className="devices-quick-chips" role="group" aria-label="Quick filters">
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('all')}
        >
          All{deviceCounts ? ` · ${deviceCounts.total.toLocaleString()}` : ''}
        </button>
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'active' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('active')}
          title="Standard operational equipment (groups casing variants)"
        >
          Active{deviceCounts ? ` · ${deviceCounts.active.toLocaleString()}` : ''}
        </button>
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'offline' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('offline')}
          title="Powered off or awaiting link activation"
        >
          Offline{deviceCounts ? ` · ${deviceCounts.offline.toLocaleString()}` : ''}
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
          className={`quick-chip ${quickFilter === 'open_incidents' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('open_incidents')}
          title="Equipment with active maintenance incidents"
        >
          Has open incidents{deviceCounts ? ` · ${deviceCounts.open_incidents.toLocaleString()}` : ''}
        </button>
        <button
          type="button"
          className={`quick-chip ${quickFilter === 'needs_data_fix' ? 'active' : ''}`}
          onClick={() => handleSelectQuickFilter('needs_data_fix')}
          title="Equipment flagged by DQ-001..DQ-005 (missing serial/warranty, inverted dates, duplicate serials, category formatting, unapproved status)"
        >
          Needs data fix{deviceCounts ? ` · ${deviceCounts.needs_data_fix.toLocaleString()}` : ''}
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
            <option value="">All types</option>
            <option value="switch">Switch</option>
            <option value="router">Router</option>
            <option value="access point">Access Point</option>
            <option value="gateway">Gateway</option>
            <option value="firewall">Firewall</option>
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
            <option value="">All statuses</option>
            <option value="active">Active ({deviceCounts?.active.toLocaleString() ?? '…'})</option>
            <option value="offline">Offline ({deviceCounts?.offline.toLocaleString() ?? '…'})</option>
            <option value="maintenance">Maintenance ({deviceCounts?.maintenance.toLocaleString() ?? '…'})</option>
            <option value="retired">Retired ({deviceCounts?.retired.toLocaleString() ?? '…'})</option>
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
            <option value="">All sites ({sites.length || 50})</option>
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
                <th style={{ width: '160px' }}>Asset tag</th>
                <th style={{ width: '120px' }}>Type</th>
                <th>Model / vendor</th>
                <th style={{ width: '180px' }}>Site &amp; region</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '130px' }}>Installed</th>
                <th style={{ width: '170px' }}>Warranty</th>
              </tr>
            </thead>
            <tbody>
              {loading && devices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
                    <span style={{ fontSize: '12.5px', color: 'var(--qt-muted)' }}>
                      Loading equipment inventory...
                    </span>
                  </td>
                </tr>
              ) : devices.length === 0 ? (
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
                devices.map((dev) => {
                  const glitch = checkDataGlitch(dev)
                  const isInverted =
                    dev.warranty_expiry &&
                    dev.installed_at &&
                    new Date(dev.warranty_expiry) < new Date(dev.installed_at)
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

                      {/* Installed Date */}
                      <td data-label="Installed">
                        <span className="mono-date-text">
                          <HumanDate iso={dev.installed_at} fallback="—" />
                        </span>
                      </td>

                      {/* Warranty Column: Inverted -> 'Date error', Missing -> 'No warranty on record', else relative */}
                      <td data-label="Warranty">
                        {isInverted ? (
                          <span
                            className="warranty-status-pill warning"
                            title="Date error: Recorded warranty expiration precedes installation date. See Data health."
                          >
                            Date error
                          </span>
                        ) : !dev.warranty_expiry ? (
                          <span
                            className="warranty-status-pill empty"
                            title="No warranty expiration date on record for this hardware asset."
                          >
                            No warranty on record
                          </span>
                        ) : (
                          <span
                            className={`warranty-status-pill ${warrantyInfo.variant}`}
                            title={`Expiration date: ${dev.warranty_expiry}`}
                          >
                            {warrantyInfo.label}
                          </span>
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
            <div className="page-size-wrap">
              <label htmlFor="devices-page-size" className="page-size-label">Rows per page:</label>
              <select
                id="devices-page-size"
                value={pageSize}
                onChange={(e) => {
                  withLayoutTransition(() => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  })
                }}
                className="page-size-select"
                aria-label="Rows per page"
              >
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
                      title="Click to copy asset tag"
                      disabled={!deviceDetail?.asset_tag}
                    >
                      <span>{deviceDetail?.asset_tag || 'Loading...'}</span>
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

                <div className="asset-drawer-meta-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 id="asset-drawer-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--qt-ink)', margin: 0 }}>
                      {deviceDetail ? `${deviceDetail.asset_tag} — ${deviceDetail.model}` : `Device #${selectedDeviceId}`}
                    </h3>
                  </div>
                  <ExplainButton
                    title="Hardware Specification Drawer"
                    explanation="Detailed network device telemetry, site location, warranty dates, and recent service incidents."
                  />
                </div>

                {/* Drawer Quick Action Buttons */}
                {deviceDetail && (
                  <div className="drawer-action-buttons">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        closeDeviceModal()
                        onAskQuestion?.(`Show all telemetry and open events for device ${deviceDetail.asset_tag}`)
                      }}
                      title="Ask a governed question about this device"
                    >
                      <MessageSquareText size={13} style={{ marginRight: 5 }} />
                      Ask about this device
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopyAssetId(deviceDetail.asset_tag)}
                      title="Copy asset tag to clipboard"
                    >
                      {copiedAssetId ? (
                        <>
                          <Check size={13} style={{ marginRight: 5, color: 'var(--qt-accent)' }} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={13} style={{ marginRight: 5 }} />
                          Copy asset tag
                        </>
                      )}
                    </button>
                  </div>
                )}
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
                        <strong>Data hygiene note</strong>
                        <span>{checkDataGlitch(deviceDetail).message}. Preserved as-is in read-only mode.</span>
                      </div>
                    </div>
                  )}

                  {/* Section 1: Hardware (Plain title) */}
                  <div>
                    <div className="asset-section-label">
                      <span>Hardware</span>
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
                          <span className="asset-spec-name">Firmware version</span>
                          <span className="asset-spec-val mono">{formatFirmwareVersion(deviceDetail.firmware_version)}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Serial number</span>
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

                  {/* Section 2: Location (Plain title) */}
                  <div>
                    <div className="asset-section-label">
                      <span>Location</span>
                      <Building size={13} />
                    </div>
                    <div className="asset-spec-card">
                      <div className="asset-spec-grid-2">
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Facility name</span>
                          <span className="asset-spec-val">{deviceDetail.site_name}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Site code</span>
                          <span className="asset-spec-val mono">{deviceDetail.site_code}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Geographic region</span>
                          <span className="asset-spec-val">{deviceDetail.region}</span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Installation date</span>
                          <span className="asset-spec-val mono">
                            <HumanDate iso={deviceDetail.installed_at} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Warranty (Plain title) */}
                  <div>
                    <div className="asset-section-label">
                      <span>Warranty</span>
                      <Calendar size={13} />
                    </div>
                    <div className="asset-spec-card">
                      <div className="asset-spec-grid-2">
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Coverage status</span>
                          <span className="asset-spec-val">
                            {deviceDetail.warranty_expiry ? (
                              <span className={`warranty-status-pill ${getWarrantyStatus(deviceDetail.warranty_expiry).variant}`}>
                                {getWarrantyStatus(deviceDetail.warranty_expiry).label}
                              </span>
                            ) : (
                              'No warranty on record'
                            )}
                          </span>
                        </div>
                        <div className="asset-spec-item">
                          <span className="asset-spec-name">Exact expiration</span>
                          <span className="asset-spec-val mono">
                            <HumanDate iso={deviceDetail.warranty_expiry} fallback="No warranty on record" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Recent repair requests (Plain title, fix Configuration Drift + High collision) */}
                  <div>
                    <div className="asset-section-label">
                      <span>Recent repair requests</span>
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
                            <div className="asset-event-date">
                              <HumanDate iso={evt.opened_at} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="asset-events-empty">
                        <span>No historical or open repair requests recorded.</span>
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
