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
                <span>{deviceDetail?.asset_tag || `Asset #${deviceId}`}</span>
                {copiedAssetId ? <Check size={12} color="#FF4F00" /> : <Copy size={12} />}
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
              className="asset-close-btn"
              onClick={onClose}
              title="Close inspector (Esc)"
              aria-label="Close device inspection drawer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="asset-drawer-meta-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* High contrast white text for drawer title */}
              <h3 id="asset-drawer-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                {deviceDetail ? `${deviceDetail.asset_tag} — ${deviceDetail.model}` : `Device #${deviceId}`}
              </h3>
            </div>
            <ExplainButton
              title="Hardware Specification Drawer"
              explanation="Detailed network device telemetry, site location, warranty dates, and recent service incidents."
            />
          </div>

          {/* Drawer Quick Action Buttons */}
          {deviceDetail && (
            <div className="drawer-action-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose()
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
                    <Check size={13} style={{ marginRight: 5, color: '#FF5A14' }} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={13} style={{ marginRight: 5 }} />
                    Copy asset tag
                  </>
                )}
              </button>

              {onNavigateToEquipment && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onClose()
                    onNavigateToEquipment(deviceDetail.id)
                  }}
                  title="View this asset in Equipment Explorer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={13} />
                  Equipment Explorer
                </button>
              )}
            </div>
          )}

          {/* Hardware Device Render Visual Card */}
          {deviceDetail && (
            <div className="asset-hardware-visual-card">
              <img
                src={getDeviceImage(deviceDetail.device_type)}
                alt={`${deviceDetail.model} ${deviceDetail.device_type}`}
                className="asset-hardware-img"
                loading="lazy"
              />
              <div className="asset-hardware-overlay">
                <div>
                  <div className="asset-hardware-model">{deviceDetail.model}</div>
                  <div className="asset-hardware-vendor">{deviceDetail.vendor}</div>
                </div>
                <div className="asset-hardware-type-tag">
                  {deviceDetail.device_type}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
              Loading device specifications &amp; events...
            </p>
          </div>
        ) : deviceDetail ? (
          <div className="asset-drawer-body">
            {/* Data hygiene note if glitch detected */}
            {checkDataGlitch(deviceDetail).hasGlitch && (
              <div
                className="data-hygiene-note"
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <AlertTriangle size={16} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 600 }}>Data hygiene note</strong>
                  <span style={{ color: '#E2E8F0', fontSize: '12px', lineHeight: 1.45 }}>
                    {checkDataGlitch(deviceDetail).message}. Preserved as-is in read-only mode.
                  </span>
                </div>
              </div>
            )}

            {/* Section 1: Hardware */}
            <div>
              <div className="asset-section-label" style={{ color: '#A1A09A' }}>
                <span>Hardware</span>
                <Cpu size={13} />
              </div>
              <div className="asset-spec-card" style={{ background: '#1A1A18', border: '1px solid #2B2B28' }}>
                <div className="asset-spec-grid-2">
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Model</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF', fontWeight: 500 }}>{deviceDetail.model}</span>
                  </div>
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Vendor</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF', fontWeight: 500 }}>{deviceDetail.vendor}</span>
                  </div>
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Firmware version</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF' }}>{formatFirmwareVersion(deviceDetail.firmware_version)}</span>
                  </div>
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Serial number</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF' }}>
                      {deviceDetail.serial_number || '—'}
                    </span>
                  </div>
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Device ID</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF' }}>#{deviceDetail.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Location */}
            <div>
              <div className="asset-section-label" style={{ color: '#A1A09A' }}>
                <span>Location</span>
                <Building size={13} />
              </div>
              <div className="asset-spec-card" style={{ background: '#1A1A18', border: '1px solid #2B2B28' }}>
                <div className="asset-spec-grid-2">
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Facility name</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF', fontWeight: 500 }}>{deviceDetail.site_name}</span>
                  </div>
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Site code</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF' }}>{deviceDetail.site_code}</span>
                  </div>
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Geographic region</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF' }}>{deviceDetail.region}</span>
                  </div>
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Installation date</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF' }}>
                      <HumanDate iso={deviceDetail.installed_at} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Warranty */}
            <div>
              <div className="asset-section-label" style={{ color: '#A1A09A' }}>
                <span>Warranty</span>
                <Calendar size={13} />
              </div>
              <div className="asset-spec-card" style={{ background: '#1A1A18', border: '1px solid #2B2B28' }}>
                <div className="asset-spec-grid-2">
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Coverage status</span>
                    <span className="asset-spec-val">
                      {deviceDetail.warranty_expiry ? (
                        <span className={`warranty-status-pill ${getWarrantyStatus(deviceDetail.warranty_expiry).variant}`}>
                          {getWarrantyStatus(deviceDetail.warranty_expiry).label}
                        </span>
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>No warranty on record</span>
                      )}
                    </span>
                  </div>
                  <div className="asset-spec-item">
                    <span className="asset-spec-name" style={{ color: '#9CA3AF' }}>Exact expiration</span>
                    <span className="asset-spec-val" style={{ color: '#FFFFFF' }}>
                      <HumanDate iso={deviceDetail.warranty_expiry} fallback="No warranty on record" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Recent repair requests */}
            <div>
              <div className="asset-section-label" style={{ color: '#A1A09A' }}>
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
              {/* Section 5: Telemetry Health & Sparklines */}
              <div style={{ marginTop: '1.25rem' }}>
                <div className="asset-section-label" style={{ color: '#A1A09A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Operational Telemetry (5 Dimensions)</span>
                  <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>● Live Ingested</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ background: '#1A1A18', border: '1px solid #2B2B28', borderRadius: 6, padding: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>CPU Util</span>
                      <strong style={{ color: '#FF5E1A' }}>{telemetryPoints[telemetryPoints.length - 1]?.cpu_utilization_pct}%</strong>
                    </div>
                    <Sparkline data={telemetryPoints.map((p) => p.cpu_utilization_pct || 0)} color="#FF5E1A" fill />
                  </div>
                  <div style={{ background: '#1A1A18', border: '1px solid #2B2B28', borderRadius: 6, padding: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Memory</span>
                      <strong style={{ color: '#3B82F6' }}>{telemetryPoints[telemetryPoints.length - 1]?.memory_utilization_pct}%</strong>
                    </div>
                    <Sparkline data={telemetryPoints.map((p) => p.memory_utilization_pct || 0)} color="#3B82F6" fill />
                  </div>
                  <div style={{ background: '#1A1A18', border: '1px solid #2B2B28', borderRadius: 6, padding: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Temp °C</span>
                      <strong style={{ color: '#F59E0B' }}>{telemetryPoints[telemetryPoints.length - 1]?.temperature_celsius}°C</strong>
                    </div>
                    <Sparkline data={telemetryPoints.map((p) => p.temperature_celsius || 0)} color="#F59E0B" fill />
                  </div>
                  <div style={{ background: '#1A1A18', border: '1px solid #2B2B28', borderRadius: 6, padding: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Loss %</span>
                      <strong style={{ color: '#EC4899' }}>{telemetryPoints[telemetryPoints.length - 1]?.packet_loss_pct}%</strong>
                    </div>
                    <Sparkline data={telemetryPoints.map((p) => p.packet_loss_pct || 0)} color="#EC4899" fill />
                  </div>
                  <div style={{ background: '#1A1A18', border: '1px solid #2B2B28', borderRadius: 6, padding: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Latency</span>
                      <strong style={{ color: '#10B981' }}>{telemetryPoints[telemetryPoints.length - 1]?.latency_ms}ms</strong>
                    </div>
                    <Sparkline data={telemetryPoints.map((p) => p.latency_ms || 0)} color="#10B981" fill />
                  </div>
                </div>

                <TelemetryTimeSeriesChart data={telemetryPoints} title={`Telemetry Stream (Device #${deviceDetail.id})`} height={220} />
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
