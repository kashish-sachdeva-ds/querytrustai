import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Zap,
  Search,
  Flame,
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

export const AnomalyMonitorView: React.FC<AnomalyMonitorViewProps> = ({ onOpenDevice }) => {
  const { user } = useAuth()
  const { mode: viewMode } = useTheme()
  const [modelMeta, setModelMeta] = useState<ModelMetadataResponse | null>(null)
  const [scanResult, setScanResult] = useState<AnomalyScanResponse | null>(null)
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([])
  const [isLoadingMeta, setIsLoadingMeta] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [scanLimit, setScanLimit] = useState(50)
  const [scoreThreshold, setScoreThreshold] = useState(0.65)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [shownNumbers, setShownNumbers] = useState<Set<number>>(() => new Set())
  const [inspectingDeviceId, setInspectingDeviceId] = useState<number | null>(null)

  const canManageScan = user?.role === 'admin' || user?.role === 'analyst'
  const canTrain = canManageScan

  const loadInitialData = async () => {
    setIsLoadingMeta(viewMode === 'expert')
    setErrorMessage(null)
    try {
      if (viewMode === 'expert') {
        const meta = await fetchAnomalySummary()
        setModelMeta(meta)
      }
      setIsScanning(true)
      const scan = canManageScan
        ? await runAnomalyScan(scanLimit, scoreThreshold)
        : await fetchCurrentUnusualActivity()
      setScanResult(scan)
      setAnomalies(scan.top_anomalies)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize anomaly detector.')
    } finally {
      setIsLoadingMeta(false)
      setIsScanning(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [viewMode, canManageScan])

  const handleScan = async () => {
    setIsScanning(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const scan = await runAnomalyScan(scanLimit, scoreThreshold)
      setScanResult(scan)
      setAnomalies(scan.top_anomalies)
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
      const scan = await runAnomalyScan(scanLimit, scoreThreshold)
      setScanResult(scan)
      setAnomalies(scan.top_anomalies)
    } catch (err: any) {
      setErrorMessage(err.message || 'Model training failed.')
    } finally {
      setIsTraining(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'var(--qt-danger)'
    if (score >= 0.70) return 'var(--qt-accent)'
    return 'var(--qt-text)'
  }

  const getUnusualLabel = (score: number) => {
    if (score >= 0.85) return 'Extremely unusual'
    if (score >= 0.7) return 'Very unusual'
    return 'Slightly unusual'
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

  // Group anomalies by device (collapse repeated identical-looking rows)
  const groupedAnomalies = useMemo(() => {
    if (anomalies.length === 0) return []
    const deviceMap = new Map<number, { primary: AnomalyItem; count: number }>()
    for (const item of anomalies) {
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
  }, [anomalies])

  return (
    <div className="view-container">
      <PageHeader
        title="Unusual activity"
        description="Equipment that is behaving differently from normal right now. Unusual does not mean it will fail — this flags readings that look different from normal so you can take a look."
        eyebrow="Telemetry monitor · Demo data"
        helpText="Scores reflect statistical distance from typical readings using an IsolationForest model. They are NOT calibrated probabilities of hardware failure."
      />

      {viewMode === 'expert' && (
      <div className="governance-banner unusual-activity-technical-note" style={{ marginBottom: '1.25rem' }}>
        <div className="banner-left">
          <Info size={20} style={{ color: 'var(--qt-accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="banner-title" style={{ fontSize: '0.9rem' }}>
              Technical disclosure: statistical outlier monitor
            </div>
            <div className="banner-desc">
              Scores reflect statistical distance calculated by an unsupervised <strong>scikit-learn IsolationForest</strong> model across CPU, memory, operating temperature, packet loss, and latency.
              <strong style={{ display: 'block', marginTop: '0.25rem', color: 'var(--qt-ink)' }}>
                Mandatory Safety Policy: Outlier scores are strictly statistical deviations, NEVER calibrated probabilities of hardware failure.
              </strong>
            </div>
          </div>
        </div>
        <div className="banner-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExplainButton
            title="Statistical Outliers vs Failure"
            explanation="IsolationForest computes multidimensional distance from typical readings. While unusual readings highlight equipment needing review, they are not failure probabilities."
          />
        </div>
      </div>
      )}

      {/* Success and Error Alerts */}
      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} /> <span>{errorMessage}</span>
        </div>
      )}

      {/* Technical model metadata is intentionally exclusive to Expert mode. */}
      {viewMode === 'expert' && (
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        {isLoadingMeta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
            <div className="table-loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--qt-muted)' }}>Loading IsolationForest model telemetry profile…</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span className="brand-pill" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {modelMeta?.algorithm || 'IsolationForest'}
                  </span>
                  <span className="status-tag status-success">
                    <span className="live-dot" /> Version {modelMeta?.version || '1.0'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--qt-muted)' }}>
                    Fitted on {modelMeta?.dataset_identifier || 'synthetic telemetry baseline'}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--qt-text)', margin: 0 }}>
                  Active Sensor Inputs: <code>cpu_percent</code>, <code>memory_percent</code>, <code>temperature_c</code>,{' '}
                  <code>packet_loss_percent</code>, <code>latency_ms</code> (StandardScaler normalized)
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ExplainButton
                  title="IsolationForest Telemetry Model"
                  explanation="An unsupervised tree ensemble that isolates anomalies by partitioning readings. Anomalous spikes require fewer random splits than normal readings."
                />
                {canTrain && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleRetrain}
                    disabled={isTraining || isScanning}
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                  >
                    {isTraining ? 'Refitting Model…' : 'Refit Model (Fixed Seed 42)'}
                  </button>
                )}
              </div>
            </div>

            {canManageScan && modelMeta?.metrics?.synthetic_benchmark_metrics && (
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--qt-border)',
                  display: 'flex',
                  gap: '2rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Benchmark Precision
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--qt-ink)', fontFamily: 'var(--font-mono)' }}>
                    {(modelMeta.metrics.synthetic_benchmark_metrics.precision * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Benchmark Recall
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--qt-ink)', fontFamily: 'var(--font-mono)' }}>
                    {(modelMeta.metrics.synthetic_benchmark_metrics.recall * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Benchmark F1-Score
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--qt-accent)', fontFamily: 'var(--font-mono)' }}>
                    {modelMeta.metrics.synthetic_benchmark_metrics.f1_score.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Expected Contamination
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--qt-ink)', fontFamily: 'var(--font-mono)' }}>
                    {((modelMeta.contamination || 0.015) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
      )}

      {/* Interactive Controls Dock */}
      {canManageScan && (
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--qt-muted)' }}>
                Sensitivity
              </label>
              <select
                className="select-input unusual-activity-select"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
                style={{ width: '130px', padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                aria-label="Sensitivity"
              >
                <option value={0.85}>Fewer</option>
                <option value={0.65}>Balanced</option>
                <option value={0.55}>More</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--qt-muted)' }}>
                Show
              </label>
              <select
                className="select-input unusual-activity-select"
                value={scanLimit}
                onChange={(e) => setScanLimit(parseInt(e.target.value))}
                style={{ width: '90px', padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                aria-label="Number of unusual activity rows to show"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleScan}
            disabled={isScanning}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isScanning ? (
              <>
                <div className="table-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span>Scanning telemetry readings…</span>
              </>
            ) : (
              <>
                <Search size={14} />
                <span>Scan Telemetry Readings</span>
              </>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Ranked Outliers Table with Human Stories */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="card-title unusual-activity-section-title" style={{ fontSize: '1rem', margin: 0 }}>
                Unusual equipment
              </h3>
              <ExplainButton
                title="Unusual Activity Stories"
                explanation="Translates raw multidimensional telemetry readings into human observations (e.g., thermal spikes or high CPU consumption) without guessing failure probabilities."
              />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--qt-muted)', margin: '0.2rem 0 0 0' }}>
              {scanResult
                ? `Showing ${groupedAnomalies.length} devices (${anomalies.length} readings) of ${scanResult.anomalies_detected.toLocaleString()} detected.`
                : 'Loading unusual activity.'}
            </p>
          </div>
          {scanResult && (
            <span className="badge badge-neutral" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}>
              <Zap size={12} style={{ marginRight: 4 }} /> Checked {scanResult.total_telemetry_scanned.toLocaleString()} readings
            </span>
          )}
        </div>

        {isScanning ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
          </div>
        ) : anomalies.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--qt-muted)' }}>
            <CheckCircle2 size={36} style={{ color: 'var(--qt-success)', margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ color: 'var(--qt-ink)', margin: '0 0 0.25rem 0' }}>All Telemetry Normal</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No readings are currently unusual enough to appear here.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table unusual-activity-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th style={{ width: '150px' }}>How unusual</th>
                  <th>Observed patterns</th>
                  <th style={{ width: '130px' }}>Asset tag</th>
                  <th style={{ width: '160px' }}>Location</th>
                  {viewMode === 'expert' && <th>Raw sensor readings</th>}
                  <th style={{ width: '120px' }}>Recorded</th>
                  <th style={{ width: '130px' }}>Device</th>
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
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onOpenDevice(item.device_id)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open ${item.asset_tag} device details`}
                    >
                      <td>
                        <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                          #{item.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: getScoreColor(item.anomaly_score),
                              fontSize: '0.88rem',
                            }}
                          >
                            {getUnusualLabel(item.anomaly_score)}
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '4px',
                            background: 'var(--qt-border)',
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
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {stories.map((st, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: 'var(--qt-ink)',
                              }}
                            >
                              <Flame size={11} style={{ color: 'var(--qt-accent)', flexShrink: 0 }} />
                              {st}
                            </span>
                          ))}
                          {count > 1 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', marginTop: 2 }}>
                              +{count - 1} more unusual reading{count > 2 ? 's' : ''} from this device
                            </span>
                          )}
                          {viewMode === 'simple' && (
                            <div>
                              <button
                                type="button"
                                className="unusual-activity-numbers-toggle"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setShownNumbers((previous) => {
                                    const next = new Set(previous)
                                    if (next.has(item.reading_id)) next.delete(item.reading_id)
                                    else next.add(item.reading_id)
                                    return next
                                  })
                                }}
                                aria-expanded={shownNumbers.has(item.reading_id)}
                              >
                                {shownNumbers.has(item.reading_id) ? 'Hide numbers' : 'Show numbers'}
                              </button>
                              {shownNumbers.has(item.reading_id) && (
                                <div className="unusual-activity-numbers" aria-label={`Sensor readings for ${item.asset_tag}`}>
                                  CPU {item.telemetry.cpu_percent}% · Memory {item.telemetry.memory_percent}% · Temperature {item.telemetry.temperature_c}°C · Packet loss {item.telemetry.packet_loss_percent}% · Latency {item.telemetry.latency_ms}ms
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--qt-accent)', fontFamily: 'var(--font-mono)' }}>
                          {item.asset_tag}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>{item.device_type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--qt-ink)' }}>{item.site_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>Region: {item.region}</div>
                      </td>
                      {viewMode === 'expert' && <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span
                            className="badge"
                            style={{
                              background: item.telemetry.cpu_percent > 85 ? 'var(--qt-danger-soft)' : 'var(--qt-surface-muted)',
                              color: item.telemetry.cpu_percent > 85 ? 'var(--qt-danger)' : 'var(--qt-text)',
                              border: `1px solid ${item.telemetry.cpu_percent > 85 ? 'var(--qt-danger)' : 'var(--qt-border)'}`,
                            }}
                          >
                            CPU: {item.telemetry.cpu_percent}%
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: item.telemetry.memory_percent > 85 ? 'var(--qt-danger-soft)' : 'var(--qt-surface-muted)',
                              color: item.telemetry.memory_percent > 85 ? 'var(--qt-danger)' : 'var(--qt-text)',
                              border: `1px solid ${item.telemetry.memory_percent > 85 ? 'var(--qt-danger)' : 'var(--qt-border)'}`,
                            }}
                          >
                            Mem: {item.telemetry.memory_percent}%
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: item.telemetry.temperature_c > 75 ? 'var(--qt-accent-soft)' : 'var(--qt-surface-muted)',
                              color: item.telemetry.temperature_c > 75 ? 'var(--qt-accent)' : 'var(--qt-text)',
                              border: `1px solid ${item.telemetry.temperature_c > 75 ? 'var(--qt-accent)' : 'var(--qt-border)'}`,
                            }}
                          >
                            {item.telemetry.temperature_c}°C
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: item.telemetry.packet_loss_percent > 5 ? 'var(--qt-danger-soft)' : 'var(--qt-surface-muted)',
                              color: item.telemetry.packet_loss_percent > 5 ? 'var(--qt-danger)' : 'var(--qt-text)',
                              border: `1px solid ${item.telemetry.packet_loss_percent > 5 ? 'var(--qt-danger)' : 'var(--qt-border)'}`,
                            }}
                          >
                            Loss: {item.telemetry.packet_loss_percent}%
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: item.telemetry.latency_ms > 100 ? 'var(--qt-accent-soft)' : 'var(--qt-surface-muted)',
                              color: item.telemetry.latency_ms > 100 ? 'var(--qt-accent)' : 'var(--qt-text)',
                              border: `1px solid ${item.telemetry.latency_ms > 100 ? 'var(--qt-accent)' : 'var(--qt-border)'}`,
                            }}
                          >
                            {item.telemetry.latency_ms}ms
                          </span>
                        </div>
                      </td>}
                      <td>
                        <HumanDate iso={item.recorded_at} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline unusual-activity-open-device"
                          onClick={(event) => {
                            event.stopPropagation()
                            setInspectingDeviceId(item.device_id)
                          }}
                        >
                          Inspect device <ChevronRight size={14} aria-hidden="true" />
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
