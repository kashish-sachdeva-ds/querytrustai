import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react'
import {
  fetchDataQualitySummary,
  runDataQualityProfile,
  fetchDataQualityFindings,
  type DataQualityRunSummary,
  type DataQualityFindingItem,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { withLayoutTransition } from '../motion'
import { readUrlParam, replaceUrlParams } from '../urlState'
import { ExplainButton } from './ExplainButton'

export const DataQualityView: React.FC = () => {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DataQualityRunSummary | null>(null)
  const [findings, setFindings] = useState<DataQualityFindingItem[]>([])
  const [totalFindings, setTotalFindings] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunningProfile, setIsRunningProfile] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>(() => readUrlParam('severity') || 'all')
  const [tableFilter, setTableFilter] = useState<string>(() => readUrlParam('table') || 'all')
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
      withLayoutTransition(() => setSummary(sum))
      const res = await fetchDataQualityFindings(
        severityFilter === 'all' ? undefined : severityFilter,
        tableFilter === 'all' ? undefined : tableFilter,
        1,
        50
      )
      withLayoutTransition(() => {
        setFindings(res.findings)
        setTotalFindings(res.total)
      })
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load data quality findings.')
    } finally {
      withLayoutTransition(() => setIsLoading(false))
    }
  }

  useEffect(() => {
    loadData()
  }, [severityFilter, tableFilter])

  useEffect(() => {
    replaceUrlParams({
      severity: severityFilter === 'all' ? null : severityFilter,
      table: tableFilter === 'all' ? null : tableFilter,
    })
  }, [severityFilter, tableFilter])

  useEffect(() => {
    const syncFiltersFromBrowserHistory = () => {
      withLayoutTransition(() => {
        setSeverityFilter(readUrlParam('severity') || 'all')
        setTableFilter(readUrlParam('table') || 'all')
      })
    }
    window.addEventListener('popstate', syncFiltersFromBrowserHistory)
    return () => window.removeEventListener('popstate', syncFiltersFromBrowserHistory)
  }, [])

  const handleRunProfile = async () => {
    if (!canRunProfile) return
    setIsRunningProfile(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const res = await runDataQualityProfile()
      withLayoutTransition(() => {
        setSummary(res.summary)
        setFindings(res.findings)
        setTotalFindings(res.findings.length)
      })
      setSuccessMessage(
        `Data health check completed at ${new Date().toLocaleTimeString()} with ${res.findings.length} findings.`
      )
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute data health scan.')
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
      {/* Governance & Read-Only Invariant Banner */}
      <div className="governance-banner" style={{ marginBottom: '1.25rem' }}>
        <div className="banner-left">
          <ShieldCheck size={20} style={{ color: 'var(--qt-accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="banner-title">Data Health &amp; Hygiene Center</div>
            <div className="banner-desc">
              Automated read-only scans check for missing attributes, inverted warranty dates, duplicate chassis serials, and unapproved categories across equipment records.
              <strong style={{ marginLeft: 6, color: 'var(--qt-accent)' }}>
                Strictly read-only diagnostics — automated cleanup suggestions are recommendations only.
              </strong>
            </div>
          </div>
        </div>
        <div className="banner-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-success">
            <span className="live-dot" /> Read-Only Verified
          </span>
          <ExplainButton
            title="Read-Only Data Health"
            explanation="Scans business tables without running UPDATE or DELETE queries. Identified data glitches are flagged for human review to preserve database integrity."
          />
        </div>
      </div>

      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--qt-ink)', margin: 0, letterSpacing: '-0.02em' }}>
            Data Health Checks
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--qt-muted)', margin: '0.25rem 0 0 0' }}>
            {summary?.completed_at
              ? `Last evaluated: ${new Date(summary.completed_at).toLocaleString()}`
              : 'Continuous automated diagnostic monitor'}
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleRunProfile}
          disabled={isRunningProfile || !canRunProfile}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          title={canRunProfile ? 'Run automated data health scan' : 'Admin or Analyst role required'}
        >
          {isRunningProfile ? (
            <>
              <div className="table-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span>Scanning 6 automated rules…</span>
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              <span>Run Health Scan</span>
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
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

      {/* KPI Cards Grid */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Overall Data Health</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="badge badge-success">Weighted Score</span>
              <ExplainButton
                title="Overall Data Health Score"
                explanation="Calculated from 6 automated rule checks across equipment and telemetry tables, giving extra weight to critical issues like duplicate serials or inverted dates."
              />
            </div>
          </div>
          <div className="kpi-value" style={{ color: (summary?.overall_health_score || 0) > 85 ? 'var(--qt-ink)' : 'var(--qt-accent)' }}>
            {summary?.overall_health_score ?? '—'}%
          </div>
          <div className="kpi-footer">Clean records across 30,000 assets &amp; telemetry readings</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Items Needing Attention</span>
            <span className="badge badge-info">Findings</span>
          </div>
          <div className="kpi-value">{summary?.total_findings ?? '—'}</div>
          <div className="kpi-footer">Across 6 automated diagnostic rules</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Critical Attention</span>
            <span className="badge badge-danger">Immediate Action</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--qt-danger)' }}>
            {summary?.critical_count ?? '—'}
          </div>
          <div className="kpi-footer">Duplicate serials &amp; warranty dates preceding install</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Advisory Hygiene</span>
            <span className="badge badge-warning">Advisory</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--qt-accent)' }}>
            {(summary?.high_count ?? 0) + (summary?.medium_count ?? 0)}
          </div>
          <div className="kpi-footer">Formatting quirks (double "v") &amp; category casing</div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--qt-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Severity:
            </span>
            {['all', 'critical', 'high', 'medium'].map((sev) => (
              <button
                key={sev}
                className={`filter-btn ${severityFilter === sev ? 'active' : ''}`}
                onClick={() => withLayoutTransition(() => setSeverityFilter(sev))}
                style={{ textTransform: 'capitalize', padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              >
                {sev}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--qt-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Table:
            </span>
            {['all', 'devices', 'telemetry_readings'].map((tbl) => (
              <button
                key={tbl}
                className={`filter-btn ${tableFilter === tbl ? 'active' : ''}`}
                onClick={() => withLayoutTransition(() => setTableFilter(tbl))}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              >
                {tbl === 'all' ? 'All Tables' : tbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Findings Table Card */}
      <div className="card layout-transition-target" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
              Data Health Findings Register ({totalFindings})
            </h3>
            <ExplainButton
              title="Health Findings Register"
              explanation="Lists all specific discrepancies identified across tables, indicating the affected row counts and safe remediation instructions."
            />
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--qt-muted)' }}>
            Showing {findings.length} findings
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
            <div className="qt-skeleton" style={{ height: 45, width: '100%' }} />
          </div>
        ) : findings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--qt-muted)' }}>
            <CheckCircle2 size={36} style={{ color: 'var(--qt-success)', margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ color: 'var(--qt-ink)', margin: '0 0 0.25rem 0' }}>All Records Clean</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No data health findings match the selected filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Severity</th>
                  <th style={{ width: '100px' }}>Rule ID</th>
                  <th>Rule Name &amp; Target Column</th>
                  <th style={{ width: '130px' }}>Table</th>
                  <th style={{ width: '160px' }}>Affected Rows</th>
                  <th>Remediation Suggestion</th>
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
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--qt-accent)' }}>
                      {finding.rule_id}
                    </td>
                    <td>
                      <div className="cell-truncate" title={finding.rule_name} style={{ fontWeight: 600, color: 'var(--qt-ink)' }}>
                        {finding.rule_name}
                      </div>
                      {finding.column_name && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', marginTop: 2 }}>
                          Column: <code>{finding.column_name}</code>
                        </div>
                      )}
                    </td>
                    <td>
                      <code className="cell-truncate" title={finding.table_name} style={{ fontSize: '0.78rem' }}>
                        {finding.table_name}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{finding.affected_rows.toLocaleString()}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>
                          ({finding.affected_percentage}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '4px',
                          background: 'var(--qt-border)',
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
                                ? 'var(--qt-danger)'
                                : finding.severity === 'high'
                                ? 'var(--qt-accent)'
                                : 'var(--qt-muted)',
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--qt-text)', lineHeight: 1.4 }}>
                      <span className="cell-line-clamp-2" title={finding.suggested_action}>
                        {finding.suggested_action}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {finding.example_identifiers && finding.example_identifiers.length > 0 ? (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
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
                        <span style={{ color: 'var(--qt-muted)', fontSize: '0.75rem' }}>—</span>
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
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="examples-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="modal-header">
              <h3 id="examples-modal-title" className="modal-title" style={{ fontSize: '1rem', color: 'var(--qt-ink)' }}>
                Sample Affected Records
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedExamples(null)}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--qt-muted)', marginBottom: '0.75rem' }}>
                {selectedExamples.ruleName}
              </p>
              <div
                style={{
                  background: 'var(--qt-surface-muted)',
                  border: '1px solid var(--qt-border)',
                  borderRadius: '6px',
                  padding: '0.75rem',
                }}
              >
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--qt-ink)' }}>
                  {selectedExamples.identifiers.map((id, idx) => (
                    <li key={idx} style={{ fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                      {id}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedExamples(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
