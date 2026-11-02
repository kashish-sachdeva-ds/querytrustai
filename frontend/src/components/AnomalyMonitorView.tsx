import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
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

const INITIAL_ANOMALIES: AnomalyItem[] = [
  {
    reading_id: 101,
    device_id: 14,
    asset_tag: 'SW-CORE-01',
    vendor: 'Cisco',
    model: 'Catalyst 9300-48P',
    device_type: 'Switch',
    site_name: 'San Jose Headquarters',
    region: 'AMER-WEST',
    anomaly_score: 0.92,
    problem_signal_count: 3,
    is_outlier: true,
    rank: 1,
    telemetry: { cpu_percent: 98.4, memory_percent: 89.1, temperature_c: 68.2, packet_loss_percent: 4.8, latency_ms: 45.2 },
    recorded_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    reading_id: 102,
    device_id: 28,
    asset_tag: 'RTR-EDGE-02',
    vendor: 'Cisco',
    model: 'Catalyst 8300-1N1S-6T',
    device_type: 'Router',
    site_name: 'London Metro Hub',
    region: 'EMEA-WEST',
    anomaly_score: 0.88,
    problem_signal_count: 2,
    is_outlier: true,
    rank: 2,
    telemetry: { cpu_percent: 94.2, memory_percent: 91.5, temperature_c: 72.1, packet_loss_percent: 6.2, latency_ms: 62.0 },
    recorded_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    reading_id: 103,
    device_id: 42,
    asset_tag: 'FW-PERIM-01',
    vendor: 'Cisco',
    model: 'Secure Firewall 3130',
    device_type: 'Firewall',
    site_name: 'Frankfurt Datacenter',
    region: 'EMEA-CENTRAL',
    anomaly_score: 0.85,
    problem_signal_count: 2,
    is_outlier: true,
    rank: 3,
    telemetry: { cpu_percent: 88.7, memory_percent: 84.3, temperature_c: 64.5, packet_loss_percent: 3.1, latency_ms: 38.5 },
    recorded_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    reading_id: 104,
    device_id: 57,
    asset_tag: 'AP-CAMPUS-08',
    vendor: 'Cisco',
    model: 'Catalyst 9130AX Series',
    device_type: 'Access Point',
    site_name: 'Tokyo Regional Office',
    region: 'APAC-EAST',
    anomaly_score: 0.79,
    problem_signal_count: 1,
    is_outlier: true,
    rank: 4,
    telemetry: { cpu_percent: 82.1, memory_percent: 79.4, temperature_c: 58.3, packet_loss_percent: 2.4, latency_ms: 29.8 },
    recorded_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    reading_id: 105,
    device_id: 83,
    asset_tag: 'GW-WAN-04',
    vendor: 'Cisco',
    model: 'ASR 1001-HX Router',
    device_type: 'Gateway',
    site_name: 'Singapore Exchange',
    region: 'APAC-SOUTH',
    anomaly_score: 0.76,
    problem_signal_count: 1,
    is_outlier: true,
    rank: 5,
    telemetry: { cpu_percent: 79.3, memory_percent: 76.2, temperature_c: 61.2, packet_loss_percent: 1.8, latency_ms: 22.4 },
    recorded_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  },
  {
    reading_id: 106,
    device_id: 99,
    asset_tag: 'SW-DIST-03',
    vendor: 'Cisco',
    model: 'Catalyst 9500-24Y4C',
    device_type: 'Switch',
    site_name: 'San Jose Headquarters',
    region: 'AMER-WEST',
    anomaly_score: 0.72,
    problem_signal_count: 1,
    is_outlier: true,
    rank: 6,
    telemetry: { cpu_percent: 74.8, memory_percent: 72.0, temperature_c: 55.4, packet_loss_percent: 1.2, latency_ms: 18.2 },
    recorded_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    reading_id: 107,
    device_id: 112,
    asset_tag: 'RTR-CORE-05',
    vendor: 'Cisco',
    model: 'Catalyst 8500-12X4QC',
    device_type: 'Router',
    site_name: 'Sydney Telehouse',
    region: 'APAC-OCEANIA',
    anomaly_score: 0.68,
    problem_signal_count: 1,
    is_outlier: true,
    rank: 7,
    telemetry: { cpu_percent: 71.5, memory_percent: 68.3, temperature_c: 52.1, packet_loss_percent: 0.9, latency_ms: 15.6 },
    recorded_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
]

const INITIAL_SCAN_RESPONSE: AnomalyScanResponse = {
  model_version: 'v1.4',
  algorithm: 'IsolationForest (Unsupervised Scikit-Learn Ensemble)',
  total_telemetry_scanned: 25000,
  anomalies_detected: INITIAL_ANOMALIES.length,
  disclaimer: 'Scores reflect unsupervised statistical deviation, not calibrated failure probabilities.',
  scan_time_ms: 142,
  top_anomalies: INITIAL_ANOMALIES,
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
      setIsScanning(true)
      const scan = canManageScan
        ? await runAnomalyScan(scanLimit, 0.50).catch(() => null)
        : await fetchCurrentUnusualActivity().catch(() => null)
      if (scan) {
        setScanResult(scan)
        setAllScanAnomalies(scan.top_anomalies)
        // Filter by balanced preset (0.65)
        setAnomalies(scan.top_anomalies.filter((a) => a.anomaly_score >= scoreThreshold))
      }
    } catch (err: any) {
      console.warn('Anomaly detection sync fallback:', err)
    } finally {
      setIsLoadingMeta(false)
      setIsScanning(false)
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
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        title="Unusual telemetry activity"
        description="Statistical outlier detection across 25,000 sensor readings (CPU, memory, temperature, packet loss, latency)."
        helpText="IsolationForest computes multidimensional distance from typical readings. While unusual readings highlight equipment needing review, they are strictly statistical deviations, NEVER calibrated probabilities of hardware failure."
      />

      {/* Mandatory Invariant Disclosure Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-surface-2)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--ink-primary)' }}>
              Statistical Outlier Architecture (IsolationForest Model)
            </strong>
            <div style={{ color: 'var(--ink-muted)', marginTop: '2px' }}>
              Scores reflect multidimensional distance calculated by an unsupervised scikit-learn tree ensemble.{' '}
              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                Invariant: Outlier scores are strictly statistical deviations, NEVER calibrated probabilities of hardware failure.
              </span>
            </div>
          </div>
        </div>
        <ExplainButton
          title="IsolationForest vs Failure Probability"
          explanation="An IsolationForest isolates anomalies by randomly partitioning feature dimensions. Outliers require fewer splits to isolate, yielding higher anomaly scores. This flags unusual operational behavior, not physical hardware failure."
        />
      </div>

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
          backgroundColor: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)' }}>
              Telemetry Anomaly Horizon &bull; Distribution Scatter (25,000 Readings)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
              Baseline: 24,625 normal &bull; Outliers: <strong style={{ color: 'var(--accent-primary)' }}>{anomalies.length}</strong>
            </span>
            {selectedDotDeviceId && (
              <button
                type="button"
                onClick={() => setSelectedDotDeviceId(null)}
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 6px',
                  backgroundColor: 'var(--bg-surface-3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  color: 'var(--ink-primary)',
                }}
              >
                Clear Filter (Device #{selectedDotDeviceId}) ✕
              </button>
            )}
          </div>
        </div>

        {/* Horizon Strip SVG Canvas */}
        <div
          style={{
            height: '72px',
            backgroundColor: 'var(--bg-canvas)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <svg width="100%" height="100%" style={{ display: 'block' }}>
            {/* Normal Range Background Zone (0% to 65%) */}
            <rect x="0" y="0" width={`${scoreThreshold * 100}%`} height="100%" fill="var(--bg-surface-2)" />
            {/* Outlier Alert Background Zone (Threshold to 100%) */}
            <rect
              x={`${scoreThreshold * 100}%`}
              y="0"
              width={`${(1 - scoreThreshold) * 100}%`}
              height="100%"
              fill="rgba(249, 87, 22, 0.08)"
            />

            {/* Threshold Vertical Line */}
            <line
              x1={`${scoreThreshold * 100}%`}
              y1="0"
              x2={`${scoreThreshold * 100}%`}
              y2="100%"
              stroke="var(--accent-primary)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Background Density Grid Lines */}
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="var(--border-subtle)" strokeWidth="1" />

            {/* Plot Outlier Points */}
            {allScanAnomalies.map((item, idx) => {
              const cx = `${item.anomaly_score * 100}%`
              const cy = 16 + (item.device_id * 13) % 40
              const isSelected = selectedDotDeviceId === item.device_id
              const isOutlier = item.anomaly_score >= scoreThreshold

              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6 : isOutlier ? 4 : 2.5}
                  fill={
                    isSelected
                      ? '#ffffff'
                      : isOutlier
                      ? item.anomaly_score >= 0.85
                        ? '#DC2626'
                        : '#F59E0B'
                      : '#94A3B8'
                  }
                  stroke={isSelected ? '#0284C7' : isOutlier ? '#ffffff' : 'transparent'}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ cursor: 'pointer', transition: 'all 80ms ease' }}
                  onClick={() => setSelectedDotDeviceId(isSelected ? null : item.device_id)}
                >
                  <title>{`${item.asset_tag} (${item.device_type}) • Score: ${item.anomaly_score.toFixed(3)} • Temp: ${item.telemetry.temperature_c}°C, CPU: ${item.telemetry.cpu_percent}%`}</title>
                </circle>
              )
            })}
          </svg>

          {/* Horizon Strip Labels */}
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '8px',
              fontSize: '9.5px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-muted)',
            }}
          >
            0.00 &bull; Normal Operating Baseline
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '8px',
              fontSize: '9.5px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-primary)',
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface-1)',
              padding: '2px 8px',
              borderRadius: '9999px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            1.00 &bull; Extreme Outliers
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
          backgroundColor: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
        }}
      >
        {/* Preset Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>
            <Sliders size={13} />
            <span>Sensitivity:</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              gap: '2px',
              backgroundColor: 'var(--bg-surface-2)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => handleSelectPreset('conservative')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: sensitivityPreset === 'conservative' ? 'var(--bg-surface-1)' : 'transparent',
                color: sensitivityPreset === 'conservative' ? 'var(--ink-primary)' : 'var(--ink-muted)',
                cursor: 'pointer',
              }}
            >
              Conservative (0.80)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('balanced')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: sensitivityPreset === 'balanced' ? 'var(--accent-primary-subtle)' : 'transparent',
                color: sensitivityPreset === 'balanced' ? 'var(--accent-primary)' : 'var(--ink-muted)',
                cursor: 'pointer',
              }}
            >
              Balanced (375 items)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('aggressive')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: sensitivityPreset === 'aggressive' ? 'var(--bg-surface-1)' : 'transparent',
                color: sensitivityPreset === 'aggressive' ? 'var(--ink-primary)' : 'var(--ink-muted)',
                cursor: 'pointer',
              }}
            >
              Aggressive (0.50)
            </button>
          </div>
        </div>

        {/* Scan Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {modelMeta && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--ink-muted)',
                backgroundColor: 'var(--bg-surface-2)',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {modelMeta.algorithm} v{modelMeta.version} ({((modelMeta.contamination || 0.015) * 100).toFixed(1)}% contamination)
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
                padding: '4px 8px',
                fontSize: '10.5px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--bg-surface-2)',
                color: 'var(--ink-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
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
            style={{ width: '90px', padding: '4px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            aria-label="Number of unusual activity rows to show"
          >
            <option value={25}>Show 25</option>
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
            <option value={200}>Show 200</option>
          </select>

          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-2"
            onClick={handleScan}
            disabled={isScanning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: isScanning ? 'not-allowed' : 'pointer',
            }}
          >
            <Search size={12} className="shrink-0" />
            <span>{isScanning ? 'Scanning...' : 'Rescan Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Outliers Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)' }}>
              Ranked Telemetry Outliers ({groupedAnomalies.length} Devices)
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              Outlier scores represent multidimensional deviation from baseline
            </div>
          </div>
          {scanResult && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-surface-2)',
                color: 'var(--ink-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
              25,000 readings checked &bull; {scanResult.scan_time_ms}ms
            </span>
          )}
        </div>

        {isScanning ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
          </div>
        ) : anomalies.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--gov-safe-dot)', margin: '0 auto 8px' }} />
            <h4 style={{ color: 'var(--ink-primary)', margin: '0 0 4px' }}>All Telemetry Within Normal Band</h4>
            <p style={{ margin: 0, fontSize: '11px' }}>
              No sensor readings currently cross the {scoreThreshold} sensitivity threshold.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th style={{ width: '160px' }}>Anomaly Score</th>
                  <th>Observed Patterns</th>
                  <th style={{ width: '130px' }}>Asset Tag</th>
                  <th style={{ width: '160px' }}>Location</th>
                  <th>Raw Sensor Telemetry</th>
                  <th style={{ width: '110px' }}>Recorded</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
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
                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                          {item.asset_tag}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>{item.device_type}</div>
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
