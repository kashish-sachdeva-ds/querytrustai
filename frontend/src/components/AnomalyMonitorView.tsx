import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Zap,
  Search,
  Flame,
} from 'lucide-react'
import {
  fetchAnomalySummary,
  runAnomalyScan,
  trainAnomalyModel,
  type ModelMetadataResponse,
  type AnomalyItem,
  type AnomalyScanResponse,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { ExplainButton } from './ExplainButton'

export const AnomalyMonitorView: React.FC = () => {
  const { user } = useAuth()
  const { mode: viewMode } = useTheme()
  const [modelMeta, setModelMeta] = useState<ModelMetadataResponse | null>(null)
  const [scanResult, setScanResult] = useState<AnomalyScanResponse | null>(null)
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([])
  const [isLoadingMeta, setIsLoadingMeta] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [scanLimit, setScanLimit] = useState(50)
  const [scoreThreshold, setScoreThreshold] = useState(0.65)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showTechnicalMetrics, setShowTechnicalMetrics] = useState(false)

  const canTrain = user?.role === 'admin' || user?.role === 'analyst'

  const loadInitialData = async () => {
    setIsLoadingMeta(true)
    setErrorMessage(null)
    try {
      const meta = await fetchAnomalySummary()
      setModelMeta(meta)
      setIsScanning(true)
      const scan = await runAnomalyScan(scanLimit, scoreThreshold)
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
  }, [])

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

  return (
    <div className="view-container">
      {/* Governance & Policy Disclosure Banner */}
      <div className="governance-banner" style={{ marginBottom: '1.25rem', borderColor: 'rgba(167, 56, 44, 0.3)' }}>
        <div className="banner-left">
          <AlertTriangle size={20} style={{ color: 'var(--qt-danger)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="banner-title" style={{ color: 'var(--qt-danger)', fontSize: '0.9rem' }}>
              Governance Disclosure: Statistical Outlier Monitor
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
          <span className="badge badge-warning">Unsupervised ML</span>
          <ExplainButton
            title="Statistical Outliers vs Failure"
            explanation="IsolationForest computes multidimensional distance from typical readings. While unusual readings highlight equipment needing review, they are not failure probabilities."
          />
        </div>
      </div>

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

      {/* Model Metadata Card */}
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

            {/* Benchmark Toggle for Simple vs Expert Mode */}
            {(viewMode === 'expert' || showTechnicalMetrics) && modelMeta?.metrics?.synthetic_benchmark_metrics && (
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

            {viewMode === 'simple' && !showTechnicalMetrics && (
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowTechnicalMetrics(true)}
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.72rem',
                  background: 'var(--qt-surface-muted)',
                  border: '1px solid var(--qt-border)',
                  padding: '3px 8px',
                  borderRadius: 'var(--qt-radius-control)',
                }}
              >
                Inspect technical model benchmarks (Precision / Recall / F1)
              </button>
            )}
          </>
        )}
      </div>

      {/* Interactive Controls Dock */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--qt-muted)' }}>
                How Unusual (Threshold):
              </label>
              <select
                className="select-input"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
                style={{ width: '130px', padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                aria-label="Filter outlier score threshold"
              >
                <option value={0.55}>0.55 (Broad)</option>
                <option value={0.65}>0.65 (Balanced)</option>
                <option value={0.75}>0.75 (Strict)</option>
                <option value={0.85}>0.85 (Extreme)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--qt-muted)' }}>
                Max Display Rows:
              </label>
              <select
                className="select-input"
                value={scanLimit}
                onChange={(e) => setScanLimit(parseInt(e.target.value))}
                style={{ width: '90px', padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                aria-label="Filter max display rows"
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

      {/* Ranked Outliers Table with Human Stories */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
                Unusual Equipment Activity Stories ({anomalies.length})
              </h3>
              <ExplainButton
                title="Unusual Activity Stories"
                explanation="Translates raw multidimensional telemetry readings into human observations (e.g., thermal spikes or high CPU consumption) without guessing failure probabilities."
              />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--qt-muted)', margin: '0.2rem 0 0 0' }}>
              Observations sorted descending by statistical deviation score.
            </p>
          </div>
          {scanResult && (
            <span className="badge badge-neutral" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}>
              <Zap size={12} style={{ marginRight: 4 }} /> Scanned in {scanResult.scan_time_ms} ms
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
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No telemetry readings exceeded the deviation threshold of {scoreThreshold}.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th style={{ width: '150px' }}>How Unusual</th>
                  <th>Observed Pattern Story</th>
                  <th style={{ width: '130px' }}>Asset Tag</th>
                  <th style={{ width: '160px' }}>Location</th>
                  <th>Raw Sensor Readings</th>
                  <th style={{ width: '120px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((item) => {
                  const stories = getOutlierStory(item.telemetry)
                  return (
                    <tr key={item.reading_id}>
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
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.88rem',
                            }}
                          >
                            {item.anomaly_score.toFixed(3)}
                          </span>
                          {item.known_injected_outlier && (
                            <span
                              className="badge badge-primary"
                              style={{ fontSize: '0.62rem', padding: '1px 5px' }}
                              title="Synthetic benchmark verified anomaly spike"
                            >
                              Injected Spike
                            </span>
                          )}
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
                      <td>
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
                      </td>
                      <td style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(item.recorded_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
