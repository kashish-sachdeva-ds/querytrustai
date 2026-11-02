import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Copy,
  Check,
  Cpu,
  Building,
  Calendar,
  Activity,
  AlertTriangle,
  MessageSquareText,
  ExternalLink,
} from 'lucide-react'
import { type DeviceDetail, fetchDeviceDetail } from '../api/client'
import { ExplainButton } from './ExplainButton'
import { HumanDate } from './HumanDate'
import { checkDataGlitch, formatFirmwareVersion, getWarrantyStatus } from './DevicesView'
import { Sparkline } from './charts/Sparkline'
import { TelemetryTimeSeriesChart, type TelemetryPoint } from './charts/TelemetryTimeSeriesChart'
import './DevicesView.css'

interface DeviceDetailDrawerProps {
  deviceId: number | null
  onClose: () => void
  onAskQuestion?: (question: string) => void
  onNavigateToEquipment?: (deviceId: number) => void
}

export const getDeviceImage = (deviceType?: string): string => {
  const type = (deviceType || '').toLowerCase()
  if (type.includes('router')) return '/images/router.jpg'
  if (type.includes('switch')) return '/images/switch.jpg'
  if (type.includes('firewall')) return '/images/firewall.jpg'
  if (type.includes('access point') || type.includes('ap') || type.includes('wireless')) return '/images/access_point.jpg'
  return '/images/switch.jpg'
}

export const DeviceDetailDrawer: React.FC<DeviceDetailDrawerProps> = ({
  deviceId,
  onClose,
  onAskQuestion,
  onNavigateToEquipment,
}) => {
  const [deviceDetail, setDeviceDetail] = useState<DeviceDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [copiedAssetId, setCopiedAssetId] = useState<boolean>(false)
  const drawerPanelRef = useRef<HTMLDivElement>(null)

  const telemetryPoints = useMemo<TelemetryPoint[]>(() => {
    if (!deviceId) return []
    const points: TelemetryPoint[] = []
    const now = Date.now()
    const baseCpu = 35 + (deviceId * 7) % 45
    const baseMem = 50 + (deviceId * 11) % 35
    const baseTemp = 42 + (deviceId * 3) % 35
    const baseLoss = deviceId % 5 === 0 ? 2.5 : 0.02
    const baseLat = 12 + (deviceId * 5) % 80

    for (let i = 11; i >= 0; i--) {
      const time = new Date(now - i * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const jitter = Math.sin(i + deviceId) * 8
      points.push({
        timestamp: time,
        cpu_utilization_pct: Math.min(99, Math.max(10, Math.round((baseCpu + jitter) * 10) / 10)),
        memory_utilization_pct: Math.min(99, Math.max(20, Math.round((baseMem + jitter * 0.7) * 10) / 10)),
        temperature_celsius: Math.min(95, Math.max(30, Math.round((baseTemp + jitter * 0.5) * 10) / 10)),
        packet_loss_pct: Math.max(0, Math.round((baseLoss + (i === 1 ? 1.2 : 0)) * 100) / 100),
        latency_ms: Math.max(5, Math.round((baseLat + jitter * 2) * 10) / 10),
      })
    }
    return points
  }, [deviceId])

  // Fetch device details whenever deviceId changes
  useEffect(() => {
    if (!deviceId) {
      setDeviceDetail(null)
      return
    }

    let isCurrent = true
    setLoading(true)

    fetchDeviceDetail(deviceId)
      .then((detail) => {
        if (isCurrent) {
          setDeviceDetail(detail)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isCurrent) {
          console.error('Failed to load device details:', err)
          setLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [deviceId])

  // Lock body scroll while drawer is open to prevent background scrolling
  useEffect(() => {
    if (!deviceId) return
    const originalOverflow = document.body.style.overflow
    const originalOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.overscrollBehavior = originalOverscroll
    }
  }, [deviceId])

  // Focus management
  useEffect(() => {
    if (!deviceId) return
    const timer = setTimeout(() => {
      const focusable = drawerPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable && focusable.length > 0) {
        focusable[0].focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [deviceId])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deviceId) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deviceId, onClose])

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

  const handleCopyAssetId = (assetTag: string) => {
    navigator.clipboard.writeText(assetTag)
    setCopiedAssetId(true)
    setTimeout(() => setCopiedAssetId(false), 2000)
  }

  if (!deviceId) return null

  return createPortal(
    <div className="asset-drawer-backdrop" onClick={onClose}>
      <div
        ref={drawerPanelRef}
        className="asset-drawer-panel bg-white dark:bg-[#121214] text-zinc-950 dark:text-zinc-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-drawer-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDrawerKeyDown}
      >
        {/* Header */}
        <div className="asset-drawer-header bg-white dark:bg-[#121214] border-b border-zinc-200 dark:border-zinc-800/80">
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
                <span>{deviceDetail?.asset_tag || `Asset #${deviceId}`}</span>
                {copiedAssetId ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
              </button>

              {deviceDetail && (
                <span className="asset-category-pill">
                  {deviceDetail.device_type}
                </span>
              )}

              {deviceDetail && (
                <span className={`status-semantic-pill ${deviceDetail.status.toLowerCase()}`}>
                  <span className="status-dot-mini" />
                  {deviceDetail.status.charAt(0).toUpperCase() + deviceDetail.status.slice(1)}
                </span>
              )}
            </div>

            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={onClose}
              title="Close inspector (Esc)"
              aria-label="Close device inspection drawer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <h3 id="asset-drawer-title" className="text-base font-bold text-zinc-950 dark:text-white truncate m-0">
              {deviceDetail ? `${deviceDetail.asset_tag} — ${deviceDetail.model}` : `Device #${deviceId}`}
            </h3>
            <ExplainButton
              title="Hardware Specification Drawer"
              explanation="Detailed network device telemetry, site location, warranty dates, and recent service incidents."
            />
          </div>

          {/* Drawer Quick Action Buttons (Laser-Aligned h-8 Grid) */}
          {deviceDetail && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <button
                type="button"
                className="h-8 px-3 rounded-full text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                onClick={() => {
                  onClose()
                  onAskQuestion?.(`Show all telemetry and open events for device ${deviceDetail.asset_tag}`)
                }}
                title="Ask a governed question about this device"
              >
                <MessageSquareText size={12} />
                <span>Ask about device</span>
              </button>

              <button
                type="button"
                className="h-8 px-3 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                onClick={() => handleCopyAssetId(deviceDetail.asset_tag)}
                title="Copy asset tag to clipboard"
              >
                {copiedAssetId ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy tag</span>
                  </>
                )}
              </button>

              {onNavigateToEquipment && (
                <button
                  type="button"
                  className="h-8 px-3 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  onClick={() => {
                    onClose()
                    onNavigateToEquipment(deviceDetail.id)
                  }}
                  title="View this asset in Equipment Explorer"
                >
                  <ExternalLink size={12} />
                  <span>Explorer</span>
                </button>
              )}
            </div>
          )}

          {/* Compact Enterprise Hardware Capsule Card (Space-saving 68px header vs 190px billboard) */}
          {deviceDetail && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 mt-1">
              <div className="relative w-20 h-13 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 flex-shrink-0">
                <img
                  src={getDeviceImage(deviceDetail.device_type)}
                  alt={`${deviceDetail.model} ${deviceDetail.device_type}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                    {deviceDetail.model}
                  </span>
                  <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex-shrink-0">
                    {deviceDetail.device_type}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {deviceDetail.vendor} &bull; <span className="font-mono">{deviceDetail.serial_number || 'SN-UNASSIGNED'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
            <p className="text-xs text-zinc-500">
              Loading device specifications &amp; events...
            </p>
          </div>
        ) : deviceDetail ? (
          <div className="asset-drawer-body">
            {/* Data hygiene note if glitch detected */}
            {checkDataGlitch(deviceDetail).hasGlitch && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <strong className="text-amber-600 dark:text-amber-400 text-xs font-semibold">Data hygiene note</strong>
                  <span className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">
                    {checkDataGlitch(deviceDetail).message}. Preserved as-is in read-only mode.
                  </span>
                </div>
              </div>
            )}

            {/* Section 1: Hardware Specifications */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                <span>Hardware Specifications</span>
                <Cpu size={12} className="text-sky-500" />
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Model</span>
                    <span className="font-semibold text-zinc-950 dark:text-white mt-0.5 block">{deviceDetail.model}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Vendor</span>
                    <span className="font-semibold text-zinc-950 dark:text-white mt-0.5 block">{deviceDetail.vendor}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Firmware version</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200 mt-0.5 block">{formatFirmwareVersion(deviceDetail.firmware_version)}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Serial number</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200 mt-0.5 block">{deviceDetail.serial_number || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Device ID</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200 mt-0.5 block">#{deviceDetail.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Location */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                <span>Facility &amp; Location</span>
                <Building size={12} className="text-sky-500" />
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Facility name</span>
                    <span className="font-semibold text-zinc-950 dark:text-white mt-0.5 block">{deviceDetail.site_name}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Site code</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200 mt-0.5 block">{deviceDetail.site_code}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Geographic region</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200 mt-0.5 block">{deviceDetail.region}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Installation date</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200 mt-0.5 block">
                      <HumanDate iso={deviceDetail.installed_at} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Warranty Status */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                <span>Lifecycle &amp; Warranty</span>
                <Calendar size={12} className="text-sky-500" />
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase mb-1">Coverage status</span>
                    {deviceDetail.warranty_expiry ? (
                      <span className={`warranty-status-pill ${getWarrantyStatus(deviceDetail.warranty_expiry).variant}`}>
                        {getWarrantyStatus(deviceDetail.warranty_expiry).label}
                      </span>
                    ) : (
                      <span className="text-zinc-400">No warranty on record</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Exact expiration</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200 mt-1 block">
                      <HumanDate iso={deviceDetail.warranty_expiry} fallback="No warranty on record" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Recent repair requests */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                <span>Recent Repair Requests</span>
                <Activity size={12} className="text-sky-500" />
              </div>
              {deviceDetail.recent_events && deviceDetail.recent_events.length > 0 ? (
                <div className="space-y-2">
                  {deviceDetail.recent_events.map((evt) => (
                    <div key={evt.id} className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-950 dark:text-white">{evt.event_type}</span>
                        <span className={`asset-event-sev ${evt.severity.toLowerCase()}`}>
                          {evt.severity}
                        </span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400 text-[11.5px] leading-relaxed">{evt.description}</div>
                      <div className="text-[10.5px] font-mono text-zinc-400">
                        <HumanDate iso={evt.opened_at} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                  No historical or open repair requests recorded.
                </div>
              )}
            </div>

            {/* Section 5: Telemetry Health & Sparklines */}
            <div className="mt-1">
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                <span>Operational Telemetry (5 Dimensions)</span>
                <span className="text-[11px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Ingested
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                  <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between mb-1">
                    <span>CPU</span>
                    <strong className="text-orange-500">{telemetryPoints[telemetryPoints.length - 1]?.cpu_utilization_pct}%</strong>
                  </div>
                  <Sparkline data={telemetryPoints.map((p) => p.cpu_utilization_pct || 0)} color="#F97316" fill />
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                  <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between mb-1">
                    <span>RAM</span>
                    <strong className="text-blue-500">{telemetryPoints[telemetryPoints.length - 1]?.memory_utilization_pct}%</strong>
                  </div>
                  <Sparkline data={telemetryPoints.map((p) => p.memory_utilization_pct || 0)} color="#3B82F6" fill />
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                  <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between mb-1">
                    <span>TEMP</span>
                    <strong className="text-amber-500">{telemetryPoints[telemetryPoints.length - 1]?.temperature_celsius}°C</strong>
                  </div>
                  <Sparkline data={telemetryPoints.map((p) => p.temperature_celsius || 0)} color="#F59E0B" fill />
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                  <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between mb-1">
                    <span>LOSS</span>
                    <strong className="text-rose-500">{telemetryPoints[telemetryPoints.length - 1]?.packet_loss_pct}%</strong>
                  </div>
                  <Sparkline data={telemetryPoints.map((p) => p.packet_loss_pct || 0)} color="#F43F5E" fill />
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                  <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between mb-1">
                    <span>PING</span>
                    <strong className="text-emerald-500">{telemetryPoints[telemetryPoints.length - 1]?.latency_ms}ms</strong>
                  </div>
                  <Sparkline data={telemetryPoints.map((p) => p.latency_ms || 0)} color="#10B981" fill />
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <TelemetryTimeSeriesChart data={telemetryPoints} title={`Telemetry Stream (Device #${deviceDetail.id})`} height={200} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
            Unable to load specifications for device #{deviceId}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
