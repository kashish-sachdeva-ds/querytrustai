import React, { useState, useEffect } from 'react'
import {
  fetchDataQualitySummary,
  runDataQualityProfile,
  fetchDataQualityFindings,
  type DataQualityRunSummary,
  type DataQualityFindingItem,
} from '../api/client'
import { useAuth } from '../context/AuthContext'

export const DataQualityView: React.FC = () => {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DataQualityRunSummary | null>(null)
  const [findings, setFindings] = useState<DataQualityFindingItem[]>([])
  const [totalFindings, setTotalFindings] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunningProfile, setIsRunningProfile] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [selectedExamples, setSelectedExamples] = useState<{
    ruleName: string
    identifiers: string[]
  } | null>(null)

  const canRunProfile = user?.role === 'admin' || user?.role === 'analyst'

  const loadData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const sum = await fetchDataQualitySummary()
      setSummary(sum)
      const res = await fetchDataQualityFindings(
        severityFilter === 'all' ? undefined : severityFilter,
        tableFilter === 'all' ? undefined : tableFilter,
        1,
        50
      )
      setFindings(res.findings)
      setTotalFindings(res.total)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load data quality findings.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [severityFilter, tableFilter])

  const handleRunProfile = async () => {
    if (!canRunProfile) return
    setIsRunningProfile(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const res = await runDataQualityProfile()
      setSummary(res.summary)
      setFindings(res.findings)
      setTotalFindings(res.findings.length)
      setSuccessMessage(
        `Diagnostics run completed at ${new Date().toLocaleTimeString()} with ${res.findings.length} findings.`
      )
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute diagnostic profile.')
    } finally {
      setIsRunningProfile(false)
    }
  }

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'badge-danger'
      case 'high':
        return 'badge-warning'
      case 'medium':
        return 'badge-info'
      default:
        return 'badge-neutral'
    }
  }

  return (
    <div className="view-container">
      {/* Governance & Read-Only Disclaimer Banner */}
      <div className="governance-banner" style={{ marginBottom: '1.25rem' }}>
        <div className="banner-left">
          <span className="shield-icon">🛡️</span>
          <div>
            <div className="banner-title">Data Quality Diagnostics Subsystem</div>
            <div className="banner-desc">
              Automated diagnostic scans detecting missing values, inverted dates, duplicate chassis serials, and unapproved categories across 5,000 synthetic devices.
              <strong style={{ marginLeft: 6, color: 'var(--primary-color)' }}>
                Strictly read-only diagnostics — automated fixes are suggestions only.
              </strong>
            </div>
          </div>
        </div>
        <div className="banner-right">
          <span className="badge badge-success">
            <span className="live-dot" /> Read-Only Mode
          </span>
        </div>
      </div>

      {/* Action Header & Alerts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Inventory Quality Profiler
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
            {summary?.completed_at
              ? `Last evaluated: ${new Date(summary.completed_at).toLocaleString()}`
              : 'Continuous diagnostic monitor'}
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleRunProfile}
          disabled={isRunningProfile || !canRunProfile}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isRunningProfile ? (
            <>
              <div className="table-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              Executing Profiling Rules...
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Run Diagnostic Profile
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Overall Data Health</span>
            <span className="badge badge-success">Weighted Score</span>
          </div>
          <div className="kpi-value" style={{ color: (summary?.overall_health_score || 0) > 85 ? '#10b981' : '#f59e0b' }}>
            {summary?.overall_health_score ?? '—'}%
          </div>
          <div className="kpi-footer">Clean records across 30,000 assets & telemetry</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Defects Flagged</span>
            <span className="badge badge-info">Findings</span>
          </div>
          <div className="kpi-value">{summary?.total_findings ?? '—'}</div>
          <div className="kpi-footer">Across 6 automated diagnostic rules</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Critical Severity</span>
            <span className="badge badge-danger">Immediate Action</span>
          </div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>
            {summary?.critical_count ?? '—'}
          </div>
          <div className="kpi-footer">Duplicate serials & inverted warranty dates</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">High / Medium Severity</span>
            <span className="badge badge-warning">Advisory</span>
          </div>
          <div className="kpi-value" style={{ color: '#f59e0b' }}>
            {(summary?.high_count ?? 0) + (summary?.medium_count ?? 0)}
          </div>
          <div className="kpi-footer">Missing attributes & category casing variants</div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Severity:
            </span>
            {['all', 'critical', 'high', 'medium'].map((sev) => (
              <button
                key={sev}
                className={`filter-btn ${severityFilter === sev ? 'active' : ''}`}
                onClick={() => setSeverityFilter(sev)}
                style={{ textTransform: 'capitalize', padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              >
                {sev}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Table:
            </span>
            {['all', 'devices', 'telemetry_readings'].map((tbl) => (
              <button
                key={tbl}
                className={`filter-btn ${tableFilter === tbl ? 'active' : ''}`}
                onClick={() => setTableFilter(tbl)}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              >
                {tbl === 'all' ? 'All Tables' : tbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Findings Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
            Diagnostic Findings Register ({totalFindings})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {findings.length} findings
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="table-loading-spinner" />
            <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              Evaluating data quality rules against PostgreSQL...
            </p>
          </div>
        ) : findings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
            <p>No data quality findings match the selected filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Severity</th>
                  <th style={{ width: '100px' }}>Rule ID</th>
                  <th>Rule Name & Target Column</th>
                  <th style={{ width: '130px' }}>Table</th>
                  <th style={{ width: '160px' }}>Affected Rows</th>
                  <th>Remediation Recommendation</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding) => (
                  <tr key={finding.id}>
                    <td>
                      <span className={`badge ${getSeverityBadgeClass(finding.severity)}`}>
                        {finding.severity.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-color)' }}>
                      {finding.rule_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{finding.rule_name}</div>
                      {finding.column_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Column: <code>{finding.column_name}</code>
                        </div>
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem' }}>{finding.table_name}</code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{finding.affected_rows.toLocaleString()}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({finding.affected_percentage}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '4px',
                          background: 'var(--border-color)',
                          borderRadius: '2px',
                          marginTop: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, finding.affected_percentage * 5)}%`,
                            height: '100%',
                            background:
                              finding.severity === 'critical'
                                ? '#ef4444'
                                : finding.severity === 'high'
                                ? '#f59e0b'
                                : '#3b82f6',
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {finding.suggested_action}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {finding.example_identifiers && finding.example_identifiers.length > 0 ? (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() =>
                            setSelectedExamples({
                              ruleName: `${finding.rule_id}: ${finding.rule_name}`,
                              identifiers: finding.example_identifiers,
                            })
                          }
                        >
                          View Samples
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Example Identifiers Modal */}
      {selectedExamples && (
        <div className="modal-backdrop" onClick={() => setSelectedExamples(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1rem' }}>
                Sample Affected Records
              </h3>
              <button className="modal-close-btn" onClick={() => setSelectedExamples(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                {selectedExamples.ruleName}
              </p>
              <div
                style={{
                  background: 'var(--bg-card-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.75rem',
                }}
              >
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                  {selectedExamples.identifiers.map((id, idx) => (
                    <li key={idx} style={{ fontFamily: 'monospace', marginBottom: '0.35rem' }}>
                      {id}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedExamples(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
