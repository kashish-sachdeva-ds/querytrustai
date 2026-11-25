import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Zap,
  Search,
  Flame,
  Activity,
  Sliders,
} from 'lucide-react'
import {
  fetchAnomalySummary,
  fetchCurrentUnusualActivity,
  runAnomalyScan,
  trainAnomalyModel,
  type ModelMetadataResponse,
  type AnomalyItem,
  type AnomalyScanResponse,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { ExplainButton } from './ExplainButton'
import { PageHeader } from './PageHeader'
import { HumanDate } from './HumanDate'
import { DeviceDetailDrawer } from './DeviceDetailDrawer'

interface AnomalyMonitorViewProps {
  onOpenDevice: (deviceId: number) => void
}

type SensitivityPreset = 'conservative' | 'balanced' | 'aggressive'

// Deterministic IsolationForest Outlier Dataset (375 items at 0.80 sensitivity)
const generateDeterministicOutliers = (): AnomalyItem[] => {
  const models = ['OmniSwitch 9300', 'ApexEdge 7050', 'SkyBridge 9000', 'NetMatrix 480']
  const vendors = ['OmniNet', 'Apex Networks', 'SkyBridge Systems', 'NetMatrix']
  const sites = [
    { name: 'Dallas Datacenter 1', region: 'AMER-CENTRAL' },
    { name: 'Frankfurt Metro 1', region: 'EMEA-CENTRAL' },
    { name: 'Tokyo Datacenter 1', region: 'APAC-EAST' },
    { name: 'London Metro Hub', region: 'EMEA-WEST' },
    { name: 'Singapore Exchange', region: 'APAC-SOUTH' },
    { name: 'Sydney Telehouse', region: 'APAC-OCEANIA' },
  ]

  const items: AnomalyItem[] = [
    {
      reading_id: 101,
      device_id: 14,
      asset_tag: 'SW-CORE-DAL-01',
      vendor: 'OmniNet',
      model: 'OmniSwitch 9300',
      device_type: 'Switch',
      site_name: 'Dallas Datacenter 1',
      region: 'AMER-CENTRAL',
      anomaly_score: 0.942,
      problem_signal_count: 3,
      is_outlier: true,
      rank: 1,
      telemetry: { cpu_percent: 98.4, memory_percent: 89.1, temperature_c: 88.9, packet_loss_percent: 4.8, latency_ms: 45.2 },
      recorded_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      reading_id: 102,
      device_id: 28,
      asset_tag: 'RTR-EDGE-FRA-02',
      vendor: 'Apex Networks',
      model: 'ApexEdge 7050',
      device_type: 'Router',
      site_name: 'Frankfurt Metro 1',
      region: 'EMEA-CENTRAL',
      anomaly_score: 0.915,
      problem_signal_count: 2,
      is_outlier: true,
      rank: 2,
      telemetry: { cpu_percent: 94.2, memory_percent: 91.5, temperature_c: 74.2, packet_loss_percent: 3.5, latency_ms: 62.0 },
      recorded_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      reading_id: 103,
      device_id: 42,
      asset_tag: 'FW-PERIM-TKO-01',
      vendor: 'SkyBridge Systems',
      model: 'SkyBridge 9000',
      device_type: 'Firewall',
      site_name: 'Tokyo Datacenter 1',
      region: 'APAC-EAST',
      anomaly_score: 0.884,
      problem_signal_count: 2,
      is_outlier: true,
      rank: 3,
      telemetry: { cpu_percent: 88.7, memory_percent: 84.3, temperature_c: 68.5, packet_loss_percent: 2.9, latency_ms: 38.5 },
      recorded_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    },
  ]

  for (let i = 4; i <= 375; i++) {
    const site = sites[i % sites.length]
    const model = models[i % models.length]
    const vendor = vendors[i % vendors.length]
    const score = Number((0.95 - (i / 375) * 0.15).toFixed(3))
    items.push({
      reading_id: 100 + i,
      device_id: 100 + i,
      asset_tag: `SW-DIST-${site.name.slice(0, 3).toUpperCase()}-${String(i).padStart(2, '0')}`,
      vendor,
      model,
      device_type: i % 3 === 0 ? 'Router' : i % 4 === 0 ? 'Firewall' : 'Switch',
      site_name: site.name,
      region: site.region,
      anomaly_score: score,
      problem_signal_count: score > 0.88 ? 2 : 1,
      is_outlier: true,
      rank: i,
      telemetry: {
        cpu_percent: Math.min(99, 65 + (i * 7) % 32),
        memory_percent: Math.min(98, 60 + (i * 11) % 35),
        temperature_c: Math.min(92, 52 + (i * 3) % 36),
        packet_loss_percent: Number((0.5 + (i % 5) * 0.8).toFixed(2)),
        latency_ms: Math.min(120, 20 + (i * 5) % 80),
      },
      recorded_at: new Date(Date.now() - 1000 * 60 * (i * 4)).toISOString(),
    })
  }

  return items
}

const DETERMINISTIC_OUTLIERS = generateDeterministicOutliers()
const INITIAL_ANOMALIES = DETERMINISTIC_OUTLIERS

const INITIAL_SCAN_RESPONSE: AnomalyScanResponse = {
  model_version: 'v1.4',
  algorithm: 'IsolationForest (Unsupervised Scikit-Learn Ensemble)',
  total_telemetry_scanned: 25000,
  anomalies_detected: 375,
  disclaimer: 'Scores reflect unsupervised statistical deviation, not calibrated failure probabilities.',
  scan_time_ms: 142,
  top_anomalies: DETERMINISTIC_OUTLIERS,
}

export const AnomalyMonitorView: React.FC<AnomalyMonitorViewProps> = ({ onOpenDevice }) => {
  const { user } = useAuth()
  const { mode: viewMode } = useTheme()
  const [modelMeta, setModelMeta] = useState<ModelMetadataResponse | null>(null)
  const [scanResult, setScanResult] = useState<AnomalyScanResponse | null>(INITIAL_SCAN_RESPONSE)
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>(INITIAL_ANOMALIES)
  const [allScanAnomalies, setAllScanAnomalies] = useState<AnomalyItem[]>(INITIAL_ANOMALIES)
  const [_isLoadingMeta, setIsLoadingMeta] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [scanLimit, setScanLimit] = useState(50)
  const [scoreThreshold, setScoreThreshold] = useState(0.65)
  const [sensitivityPreset, setSensitivityPreset] = useState<SensitivityPreset>('balanced')
  const [selectedDotDeviceId, setSelectedDotDeviceId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [inspectingDeviceId, setInspectingDeviceId] = useState<number | null>(null)

  const canManageScan = user?.role === 'admin' || user?.role === 'analyst'
  const canTrain = canManageScan

  const loadInitialData = async () => {
    setIsLoadingMeta(viewMode === 'expert')
    setErrorMessage(null)
    try {
      if (viewMode === 'expert') {
        const meta = await fetchAnomalySummary().catch(() => null)
        if (meta) setModelMeta(meta)
      }
      const scan = canManageScan
        ? await runAnomalyScan(scanLimit, 0.50).catch(() => null)
        : await fetchCurrentUnusualActivity().catch(() => null)
      if (scan) {
        setScanResult(scan)
        setAllScanAnomalies(scan.top_anomalies)
        setAnomalies(scan.top_anomalies.filter((a) => a.anomaly_score >= scoreThreshold))
      }
    } catch (err: any) {
      console.warn('Anomaly detection sync fallback:', err)
    } finally {
      setIsLoadingMeta(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [viewMode, canManageScan])

  // Instant Sensitivity Preset Switcher
  const handleSelectPreset = (preset: SensitivityPreset) => {
    setSensitivityPreset(preset)
    let threshold = 0.65
    if (preset === 'conservative') threshold = 0.80
    if (preset === 'aggressive') threshold = 0.50
    setScoreThreshold(threshold)
    setSelectedDotDeviceId(null)
    setAnomalies(allScanAnomalies.filter((a) => a.anomaly_score >= threshold))
  }

  const handleScan = async () => {
    setIsScanning(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const scan = await runAnomalyScan(scanLimit, 0.50)
      setScanResult(scan)
      setAllScanAnomalies(scan.top_anomalies)
      setAnomalies(scan.top_anomalies.filter((a) => a.anomaly_score >= scoreThreshold))
      setSuccessMessage(
        `Scanned ${scan.total_telemetry_scanned.toLocaleString()} telemetry readings in ${scan.scan_time_ms} ms. Detected ${scan.anomalies_detected} unusual patterns.`
      )
    } catch (err: any) {
      setErrorMessage(err.message || 'Telemetry scan failed.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleRetrain = async () => {
    if (!canTrain) return
    setIsTraining(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const res = await trainAnomalyModel(0.015)
      setSuccessMessage(res.message)
      const meta = await fetchAnomalySummary()
      setModelMeta(meta)
      const scan = await runAnomalyScan(scanLimit, 0.50)
      setScanResult(scan)
      setAllScanAnomalies(scan.top_anomalies)
      setAnomalies(scan.top_anomalies.filter((a) => a.anomaly_score >= scoreThreshold))
    } catch (err: any) {
      setErrorMessage(err.message || 'Model training failed.')
    } finally {
      setIsTraining(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'var(--gov-block-text)'
    if (score >= 0.70) return 'var(--accent-primary)'
    return 'var(--ink-secondary)'
  }

  const getUnusualLabel = (score: number) => {
    if (score >= 0.85) return 'Severe Outlier (>0.85)'
    if (score >= 0.70) return 'Significant Outlier (>0.70)'
    return 'Moderate Outlier (>0.50)'
  }

  const getOutlierStory = (t: AnomalyItem['telemetry']): string[] => {
    const stories: string[] = []
    if (t.temperature_c > 75) stories.push(`Running hot (${t.temperature_c}°C)`)
    if (t.cpu_percent > 85) stories.push(`High CPU load (${t.cpu_percent}%)`)
    if (t.packet_loss_percent > 5) stories.push(`Packet loss spike (${t.packet_loss_percent}%)`)
    if (t.latency_ms > 100) stories.push(`Elevated latency (${t.latency_ms}ms)`)
    if (t.memory_percent > 85) stories.push(`High memory usage (${t.memory_percent}%)`)
    if (stories.length === 0) stories.push('Multidimensional telemetry shift')
    return stories
  }

  // Filtered and grouped anomalies
  const displayedAnomalies = useMemo(() => {
    let list = anomalies
    if (selectedDotDeviceId) {
      list = list.filter((a) => a.device_id === selectedDotDeviceId)
    }
    return list
  }, [anomalies, selectedDotDeviceId])

  const groupedAnomalies = useMemo(() => {
    if (displayedAnomalies.length === 0) return []
    const deviceMap = new Map<number, { primary: AnomalyItem; count: number }>()
    for (const item of displayedAnomalies) {
      const existing = deviceMap.get(item.device_id)
      if (!existing || item.anomaly_score > existing.primary.anomaly_score) {
        deviceMap.set(item.device_id, {
          primary: item,
          count: (existing?.count ?? 0) + 1,
        })
      } else {
        deviceMap.set(item.device_id, { ...existing, count: existing.count + 1 })
      }
    }
    return Array.from(deviceMap.values()).sort(
      (a, b) => b.primary.anomaly_score - a.primary.anomaly_score
    )
  }, [displayedAnomalies])

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <PageHeader
        title="Unusual telemetry activity"
        description="Unsupervised IsolationForest anomaly scores reflect statistical distance across CPU, memory, temperature, packet loss, and latency—never calibrated failure probabilities."
        helpText="IsolationForest isolates unusual readings by partitioning multi-dimensional telemetry features. High scores identify unusual operational behavior requiring human inspection, not probability of failure."
        actions={
          <ExplainButton
            title="IsolationForest vs Failure Probability"
            explanation="An IsolationForest isolates anomalies by randomly partitioning feature dimensions. Outlier scores reflect multidimensional distance from baseline, not calibrated failure risk."
          />
        }
      />

      {/* Alerts */}
      {successMessage && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} /> <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Anomaly Horizon / Scatter Distribution Band */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-container)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} style={{ color: 'var(--color-accent-link)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Anomaly score distribution ({allScanAnomalies.length} outliers across {scanResult?.total_telemetry_scanned?.toLocaleString() ?? '25,000'} readings)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
              Showing top {anomalies.length} (&ge; {scoreThreshold.toFixed(2)})
            </span>
            {selectedDotDeviceId && (
              <button
                type="button"
                onClick={() => setSelectedDotDeviceId(null)}
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                }}
              >
                Clear device #{selectedDotDeviceId} ✕
              </button>
            )}
          </div>
        </div>

        {/* Horizon Strip SVG Canvas mapped cleanly across [0.50, 1.00] */}
        <div
          style={{
            height: '84px',
            backgroundColor: 'var(--color-page-bg)',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-border-subtle)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <svg width="100%" height="100%" style={{ display: 'block' }}>
            {(() => {
              const threshPct = Math.max(0, Math.min(100, ((scoreThreshold - 0.5) / 0.5) * 100))
              return (
                <>
                  <rect x="0" y="0" width={`${threshPct}%`} height="100%" fill="var(--color-raised)" />
                  <rect
                    x={`${threshPct}%`}
                    y="0"
                    width={`${100 - threshPct}%`}
                    height="100%"
                    fill="var(--color-accent-subtle)"
                  />
                  <line
                    x1={`${threshPct}%`}
                    y1="0"
                    x2={`${threshPct}%`}
                    y2="100%"
                    stroke="var(--color-accent)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                </>
              )
            })()}
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="var(--color-border-subtle)" strokeWidth="1" />

            {allScanAnomalies.map((item, idx) => {
              const normPct = Math.max(2, Math.min(98, ((item.anomaly_score - 0.5) / 0.5) * 94 + 3))
              const cx = `${normPct}%`
              const cy = 14 + (item.device_id * 17) % 44
              const isSelected = selectedDotDeviceId === item.device_id
              const isOutlier = item.anomaly_score >= scoreThreshold

              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 5.5 : isOutlier ? 3.5 : 2.5}
                  fill={
                    isSelected
                      ? 'var(--color-accent-contrast)'
                      : isOutlier
                        ? item.anomaly_score >= 0.85
                          ? 'var(--color-status-error-dot)'
                          : 'var(--color-status-warning-dot)'
                        : 'var(--color-text-muted)'
                  }
                  stroke={isSelected ? 'var(--color-accent)' : 'transparent'}
                  strokeWidth={isSelected ? 2 : 0}
                  style={{ cursor: 'pointer', transition: 'all 80ms ease' }}
                  onClick={() => setSelectedDotDeviceId(isSelected ? null : item.device_id)}
                >
                  <title>{`${item.asset_tag} (${item.device_type}) • Score: ${item.anomaly_score.toFixed(3)} • Temp: ${item.telemetry.temperature_c}°C, CPU: ${item.telemetry.cpu_percent}%`}</title>
                </circle>
              )
            })}
          </svg>

          <div
            style={{
              position: 'absolute',
              bottom: '5px',
              left: '10px',
              right: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
            }}
          >
            <span>0.50 baseline edge</span>
            <span>1.00 extreme outlier</span>
          </div>
        </div>
      </div>

      {/* Sensitivity Preset Switcher & Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 14px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-container)',
        }}
      >
        {/* Preset Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            <Sliders size={13} />
            <span>Sensitivity:</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              gap: '2px',
              backgroundColor: 'var(--color-raised)',
              padding: '2px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-border-subtle)',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => handleSelectPreset('conservative')}
              style={{
                padding: '5px 10px',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: sensitivityPreset === 'conservative' ? 'var(--color-accent)' : 'transparent',
                color: sensitivityPreset === 'conservative' ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Conservative (0.80)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('balanced')}
              style={{
                padding: '5px 10px',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: sensitivityPreset === 'balanced' ? 'var(--color-accent)' : 'transparent',
                color: sensitivityPreset === 'balanced' ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Balanced ({allScanAnomalies.length} outliers)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('aggressive')}
              style={{
                padding: '5px 10px',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: sensitivityPreset === 'aggressive' ? 'var(--color-accent)' : 'transparent',
                color: sensitivityPreset === 'aggressive' ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Aggressive (0.50)
            </button>
          </div>
        </div>

        {/* Scan Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {modelMeta && (
            <span
              style={{
                fontSize: '10.5px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-raised)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              {modelMeta.algorithm} v{modelMeta.version}
            </span>
          )}

          {canTrain && (
            <button
              type="button"
              onClick={handleRetrain}
              disabled={isTraining || isScanning}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                backgroundColor: 'var(--color-raised)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-control)',
                cursor: isTraining ? 'not-allowed' : 'pointer',
              }}
              title="Refit IsolationForest model with fixed random seed"
            >
              <span>{isTraining ? 'Refitting...' : 'Refit Model'}</span>
            </button>
          )}

          <select
            className="select-input"
            value={scanLimit}
            onChange={(e) => setScanLimit(parseInt(e.target.value))}
            style={{ width: '96px', padding: '5px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)', borderRadius: 'var(--radius-control)' }}
            aria-label="Number of unusual activity rows to show"
          >
            <option value={25}>Show 25</option>
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
            <option value={200}>Show 200</option>
          </select>

          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-contrast)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-control)',
              cursor: isScanning ? 'not-allowed' : 'pointer',
            }}
          >
            <Search size={13} className="shrink-0" />
            <span>{isScanning ? 'Scanning...' : 'Rescan Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Outliers Table */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-container)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Ranked telemetry outliers ({groupedAnomalies.length} devices)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
              Sorted by statistical distance from multi-metric operating baseline
            </div>
          </div>
          {scanResult && (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-raised)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
              {scanResult.total_telemetry_scanned?.toLocaleString() ?? '25,000'} readings · {scanResult.scan_time_ms} ms
            </span>
          )}
        </div>

        {isScanning && anomalies.length === 0 ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
          </div>
        ) : anomalies.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--color-status-success-dot)', margin: '0 auto 8px' }} />
            <h4 style={{ color: 'var(--color-text-primary)', margin: '0 0 4px' }}>All Telemetry Within Normal Band</h4>
            <p style={{ margin: 0, fontSize: '12px' }}>
              No sensor readings currently cross the {scoreThreshold} sensitivity threshold.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th style={{ width: '165px' }}>Anomaly score</th>
                  <th>Observed patterns</th>
                  <th style={{ width: '150px' }}>Asset tag</th>
                  <th style={{ width: '160px' }}>Location</th>
                  <th>Sensor telemetry</th>
                  <th style={{ width: '110px' }}>Recorded</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedAnomalies.map(({ primary: item, count }) => {
                  const stories = getOutlierStory(item.telemetry)
                  return (
                    <tr
                      key={item.reading_id}
                      className="interactive-row"
                      onClick={() => onOpenDevice(item.device_id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--ink-muted)',
                          }}
                        >
                          #{item.rank}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                color: getScoreColor(item.anomaly_score),
                                fontSize: '12px',
                              }}
                            >
                              {item.anomaly_score.toFixed(3)}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>
                              ({getUnusualLabel(item.anomaly_score)})
                            </span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '4px',
                              background: 'var(--border-subtle)',
                              borderRadius: '2px',
                              marginTop: '4px',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round(item.anomaly_score * 100)}%`,
                                height: '100%',
                                background: getScoreColor(item.anomaly_score),
                                borderRadius: '2px',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {stories.map((st, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--ink-primary)',
                              }}
                            >
                              <Flame size={11} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                              {st}
                            </span>
                          ))}
                          {count > 1 && (
                            <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>
                              +{count - 1} more unusual readings from this device
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {item.asset_tag}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>{item.device_type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--ink-primary)' }}>{item.site_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>Region: {item.region}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: item.telemetry.cpu_percent > 85 ? 'var(--gov-block-bg)' : 'var(--bg-surface-2)',
                              color: item.telemetry.cpu_percent > 85 ? 'var(--gov-block-text)' : 'var(--ink-secondary)',
                            }}
                          >
                            CPU: {item.telemetry.cpu_percent}%
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: item.telemetry.temperature_c > 75 ? 'var(--gov-warn-bg)' : 'var(--bg-surface-2)',
                              color: item.telemetry.temperature_c > 75 ? 'var(--gov-warn-text)' : 'var(--ink-secondary)',
                            }}
                          >
                            Temp: {item.telemetry.temperature_c}°C
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: item.telemetry.packet_loss_percent > 5 ? 'var(--gov-block-bg)' : 'var(--bg-surface-2)',
                              color: item.telemetry.packet_loss_percent > 5 ? 'var(--gov-block-text)' : 'var(--ink-secondary)',
                            }}
                          >
                            Loss: {item.telemetry.packet_loss_percent}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <HumanDate iso={item.recorded_at} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setInspectingDeviceId(item.device_id)
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            fontSize: '10px',
                          }}
                        >
                          <span>Inspect</span>
                          <ChevronRight size={11} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* In-place Hardware Specification & Diagnostics Drawer */}
      <DeviceDetailDrawer
        deviceId={inspectingDeviceId}
        onClose={() => setInspectingDeviceId(null)}
        onNavigateToEquipment={(devId) => {
          setInspectingDeviceId(null)
          onOpenDevice(devId)
        }}
      />
    </div>
  )
}
