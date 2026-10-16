import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Zap,
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

export const AnomalyMonitorView: React.FC = () => {
  const { user } = useAuth()
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

  const canTrain = user?.role === 'admin' || user?.role === 'analyst'

  const loadInitialData = async () => {
    setIsLoadingMeta(true)
    setErrorMessage(null)
    try {
      const meta = await fetchAnomalySummary()
      setModelMeta(meta)
      // Run initial scan
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
        `Scanned ${scan.total_telemetry_scanned.toLocaleString()} telemetry observations in ${scan.scan_time_ms} ms. Detected ${scan.anomalies_detected} outliers.`
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
      // Re-run scan with updated model
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
    if (score >= 0.85) return 'var(--qt-danger, #A7382C)' // Critical outlier
    if (score >= 0.70) return 'var(--qt-accent, #FF4F00)' // High outlier
    return 'var(--qt-text, #4F4A45)' // Moderate outlier
  }

  return (
    <div className="view-container">
      {/* Non-Negotiable Governance Disclaimer Banner */}
      <div className="governance-banner" style={{ marginBottom: '1.25rem', borderColor: 'rgba(167, 56, 44, 0.3)' }}>
        <div className="banner-left">
          <AlertTriangle size={18} style={{ color: 'var(--qt-danger)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="banner-title" style={{ color: 'var(--qt-danger)' }}>
              Governance Disclosure: Statistical Outlier Monitor
            </div>
            <div className="banner-desc">
              Anomaly scores reflect multidimensional distance calculated by an unsupervised{' '}
              <strong>scikit-learn IsolationForest</strong> model across CPU, memory, temperature, packet loss, and latency.
              <strong style={{ display: 'block', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                Mandatory Policy: Outlier scores are strictly statistical deviations, NEVER calibrated probabilities of hardware failure.
              </strong>
            </div>
          </div>
        </div>
        <div className="banner-right">
          <span className="badge badge-warning">Unsupervised ML</span>
        </div>
      </div>

      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} /> <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={14} /> <span>{errorMessage}</span>
        </div>
      )}

      {/* Model Metadata & Synthetic Benchmark Card */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        {isLoadingMeta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
            <div className="table-loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading IsolationForest model metadata...</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                  <span className="brand-pill" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {modelMeta?.algorithm || 'IsolationForest'}
                  </span>
              <span className="status-tag status-success">
                <span className="live-dot" /> Version {modelMeta?.version || 'Unavailable'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Fitted on {modelMeta?.dataset_identifier || 'synthetic training data'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Feature Vector: <code>cpu_percent</code>, <code>memory_percent</code>, <code>temperature_c</code>,{' '}
              <code>packet_loss_percent</code>, <code>latency_ms</code> (StandardScaler normalized)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {canTrain && (
              <button
                className="btn btn-outline"
                onClick={handleRetrain}
                disabled={isTraining || isScanning}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                {isTraining ? 'Refitting Model...' : 'Refit Model (Fixed Seed 42)'}
              </button>
            )}
          </div>
        </div>

        {/* Synthetic Benchmark Metrics Row */}
        {modelMeta?.metrics?.synthetic_benchmark_metrics && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Benchmark Precision
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {(modelMeta.metrics.synthetic_benchmark_metrics.precision * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Benchmark Recall
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {(modelMeta.metrics.synthetic_benchmark_metrics.recall * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Benchmark F1-Score
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--qt-accent)' }}>
                {modelMeta.metrics.synthetic_benchmark_metrics.f1_score.toFixed(3)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Expected Contamination
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {((modelMeta.contamination || 0.015) * 100).toFixed(1)}%
              </div>
            </div>
            <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                * Evaluated on synthetic injected spikes
              </span>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Interactive Controls Dock */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Min Outlier Threshold:
              </label>
              <select
                className="select-input"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
                style={{ width: '110px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
              >
                <option value={0.55}>0.55 (Broad)</option>
                <option value={0.65}>0.65 (Balanced)</option>
                <option value={0.75}>0.75 (Strict)</option>
                <option value={0.85}>0.85 (Extreme)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Max Display Rows:
              </label>
              <select
                className="select-input"
                value={scanLimit}
                onChange={(e) => setScanLimit(parseInt(e.target.value))}
                style={{ width: '90px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleScan}
            disabled={isScanning}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isScanning ? (
              <>
                <div className="table-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Scanning telemetry readings...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Scan Telemetry Readings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ranked Outliers Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
              Ranked Outlier Telemetry Observations ({anomalies.length})
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Observations sorted descending by multidimensional statistical deviation score
            </p>
          </div>
          {scanResult && (
            <span className="badge badge-neutral" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}>
              <Zap size={11} style={{ marginRight: 4 }} /> Scanned in {scanResult.scan_time_ms} ms
            </span>
          )}
        </div>

        {isScanning ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="table-loading-spinner" />
            <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              Computing IsolationForest decision function across telemetry feature vectors...
            </p>
          </div>
        ) : anomalies.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No telemetry readings exceeded the anomaly threshold of {scoreThreshold}.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th style={{ width: '130px' }}>Outlier Score</th>
                  <th style={{ width: '130px' }}>Asset Tag</th>
                  <th style={{ width: '120px' }}>Device Model</th>
                  <th>Location & Site</th>
                  <th>Telemetry Readings (CPU / Mem / Temp / PktLoss / Latency)</th>
                  <th style={{ width: '130px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((item) => (
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
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                          }}
                        >
                          {item.anomaly_score.toFixed(3)}
                        </span>
                        {item.known_injected_outlier && (
                          <span
                            className="badge badge-primary"
                            style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}
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
                          background: 'var(--border-color)',
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
                      <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontFamily: 'monospace' }}>
                        {item.asset_tag}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.device_type}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.model}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.vendor}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.site_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Region: {item.region}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span
                          className="badge"
                          style={{
                            background: item.telemetry.cpu_percent > 85 ? 'var(--qt-danger-soft, #FFF1EE)' : 'var(--bg-card-secondary)',
                            color: item.telemetry.cpu_percent > 85 ? 'var(--qt-danger, #A7382C)' : 'var(--text-secondary)',
                            border: `1px solid ${item.telemetry.cpu_percent > 85 ? 'var(--qt-danger, #A7382C)' : 'var(--border-color)'}`,
                          }}
                        >
                          CPU: {item.telemetry.cpu_percent}%
                        </span>
                        <span
                          className="badge"
                          style={{
                            background: item.telemetry.memory_percent > 85 ? 'var(--qt-danger-soft, #FFF1EE)' : 'var(--bg-card-secondary)',
                            color: item.telemetry.memory_percent > 85 ? 'var(--qt-danger, #A7382C)' : 'var(--text-secondary)',
                            border: `1px solid ${item.telemetry.memory_percent > 85 ? 'var(--qt-danger, #A7382C)' : 'var(--border-color)'}`,
                          }}
                        >
                          Mem: {item.telemetry.memory_percent}%
                        </span>
                        <span
                          className="badge"
                          style={{
                            background: item.telemetry.temperature_c > 75 ? 'var(--qt-accent-soft, #FFF0E8)' : 'var(--bg-card-secondary)',
                            color: item.telemetry.temperature_c > 75 ? 'var(--qt-accent, #FF4F00)' : 'var(--text-secondary)',
                            border: `1px solid ${item.telemetry.temperature_c > 75 ? 'var(--qt-accent, #FF4F00)' : 'var(--border-color)'}`,
                          }}
                        >
                          {item.telemetry.temperature_c}°C
                        </span>
                        <span
                          className="badge"
                          style={{
                            background: item.telemetry.packet_loss_percent > 5 ? 'var(--qt-danger-soft, #FFF1EE)' : 'var(--bg-card-secondary)',
                            color: item.telemetry.packet_loss_percent > 5 ? 'var(--qt-danger, #A7382C)' : 'var(--text-secondary)',
                            border: `1px solid ${item.telemetry.packet_loss_percent > 5 ? 'var(--qt-danger, #A7382C)' : 'var(--border-color)'}`,
                          }}
                        >
                          Loss: {item.telemetry.packet_loss_percent}%
                        </span>
                        <span
                          className="badge"
                          style={{
                            background: item.telemetry.latency_ms > 100 ? 'var(--qt-accent-soft, #FFF0E8)' : 'var(--bg-card-secondary)',
                            color: item.telemetry.latency_ms > 100 ? 'var(--qt-accent, #FF4F00)' : 'var(--text-secondary)',
                            border: `1px solid ${item.telemetry.latency_ms > 100 ? 'var(--qt-accent, #FF4F00)' : 'var(--border-color)'}`,
                          }}
                        >
                          {item.telemetry.latency_ms}ms
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(item.recorded_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
