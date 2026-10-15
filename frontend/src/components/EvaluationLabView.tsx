import { useState, useEffect, useCallback } from 'react'
import {
  type EvaluationRunResponse,
  type EvalCaseResult,
  type EvalCategoryMetric,
  type EvaluationRunListItem,
  runEvaluation,
  fetchEvaluationRuns,
} from '../api/client'
import './EvaluationLabView.css'

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  simple_filter: { label: 'Simple Filter', color: '#3b82f6', icon: '🔍' },
  aggregation: { label: 'Aggregation', color: '#8b5cf6', icon: '📊' },
  date_range: { label: 'Date Range', color: '#f59e0b', icon: '📅' },
  join: { label: 'Multi-Table Join', color: '#10b981', icon: '🔗' },
  semantic: { label: 'Semantic Terms', color: '#06b6d4', icon: '🏷️' },
  multi_turn: { label: 'Multi-Turn', color: '#ec4899', icon: '💬' },
  ambiguity: { label: 'Ambiguity', color: '#f97316', icon: '❓' },
  unsupported: { label: 'Unsupported', color: '#64748b', icon: '🚫' },
  security: { label: 'Security', color: '#ef4444', icon: '🛡️' },
}

const BEHAVIOR_LABELS: Record<string, { label: string; color: string }> = {
  ready: { label: 'Ready', color: '#10b981' },
  previewed: { label: 'Previewed', color: '#10b981' },
  blocked: { label: 'Blocked', color: '#ef4444' },
  blocked_by_ast: { label: 'Blocked (AST)', color: '#ef4444' },
  clarification_needed: { label: 'Clarification', color: '#f59e0b' },
  unsupported: { label: 'Unsupported', color: '#64748b' },
  error: { label: 'Error', color: '#dc2626' },
}

export default function EvaluationLabView() {
  const [runResult, setRunResult] = useState<EvaluationRunResponse | null>(null)
  const [pastRuns, setPastRuns] = useState<EvaluationRunListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<'guarded' | 'baseline'>('guarded')
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'cases' | 'failures'>('overview')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedCase, setExpandedCase] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const runs = await fetchEvaluationRuns()
      setPastRuns(runs)
    } catch (err: any) {
      // Silently handle if admin-only restriction triggers
      setPastRuns([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleRunEvaluation = async () => {
    setLoading(true)
    setError(null)
    setRunResult(null)
    try {
      const result = await runEvaluation(selectedMode)
      setRunResult(result)
      setActiveTab('overview')
      await loadHistory()
    } catch (err: any) {
      setError(err.message || 'Evaluation run failed')
    } finally {
      setLoading(false)
    }
  }

  const filteredCases = runResult?.case_results?.filter(
    (c) => !selectedCategory || c.category === selectedCategory
  ) || []

  const passedCases = filteredCases.filter((c) => c.passed)
  const failedCases = filteredCases.filter((c) => !c.passed)

  return (
    <div className="eval-lab">
      {/* Governance Banner */}
      <div className="eval-lab__governance-banner">
        <span className="eval-lab__governance-icon">🧪</span>
        <div>
          <strong>Evaluation Lab — Regression Benchmark</strong>
          <p>
            Execute the versioned benchmark suite against the configured LLM provider.
            All metrics are computed from real pipeline output — no fabricated accuracy numbers.
            Admin access required.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="eval-lab__controls">
        <div className="eval-lab__mode-selector">
          <label className="eval-lab__mode-label">Pipeline Mode</label>
          <div className="eval-lab__mode-buttons">
            <button
              className={`eval-lab__mode-btn ${selectedMode === 'guarded' ? 'eval-lab__mode-btn--active' : ''}`}
              onClick={() => setSelectedMode('guarded')}
              disabled={loading}
            >
              <span className="eval-lab__mode-icon">🛡️</span>
              Guarded
              <span className="eval-lab__mode-desc">Full AST validation</span>
            </button>
            <button
              className={`eval-lab__mode-btn ${selectedMode === 'baseline' ? 'eval-lab__mode-btn--active' : ''}`}
              onClick={() => setSelectedMode('baseline')}
              disabled={loading}
            >
              <span className="eval-lab__mode-icon">📏</span>
              Baseline
              <span className="eval-lab__mode-desc">LLM only comparison</span>
            </button>
          </div>
        </div>
        <button
          className="eval-lab__run-btn"
          onClick={handleRunEvaluation}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="eval-lab__spinner" />
              Running Benchmark…
            </>
          ) : (
            <>
              <span>▶</span> Execute Benchmark Suite
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="eval-lab__error">
          <strong>Evaluation Error:</strong> {error}
        </div>
      )}

      {/* Past Runs History */}
      {!runResult && !loading && (
        <div className="eval-lab__history-section">
          <h3 className="eval-lab__section-title">📋 Past Evaluation Runs</h3>
          {loadingHistory ? (
            <div className="eval-lab__loading-state">
              <span className="eval-lab__spinner" /> Loading run history…
            </div>
          ) : pastRuns.length === 0 ? (
            <div className="eval-lab__empty-state">
              <div className="eval-lab__empty-icon">🧪</div>
              <h4>No Evaluation Runs Yet</h4>
              <p>Select a pipeline mode above and click "Execute Benchmark Suite" to run your first evaluation.</p>
            </div>
          ) : (
            <div className="eval-lab__history-table-wrapper">
              <table className="eval-lab__history-table">
                <thead>
                  <tr>
                    <th>Benchmark</th>
                    <th>Mode</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Cases</th>
                    <th>Pass Rate</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pastRuns.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <span className="eval-lab__bench-name">{run.benchmark_name}</span>
                        <span className="eval-lab__bench-version">v{run.benchmark_version}</span>
                      </td>
                      <td>
                        <span className={`eval-lab__mode-badge eval-lab__mode-badge--${run.mode}`}>
                          {run.mode === 'guarded' ? '🛡️' : '📏'} {run.mode}
                        </span>
                      </td>
                      <td>{run.provider}</td>
                      <td>
                        <span className={`eval-lab__status-badge eval-lab__status-badge--${run.status}`}>
                          {run.status}
                        </span>
                      </td>
                      <td>{run.passed_cases}/{run.total_cases}</td>
                      <td>
                        <span
                          className="eval-lab__pass-rate"
                          style={{ color: run.overall_pass_rate >= 90 ? '#10b981' : run.overall_pass_rate >= 70 ? '#f59e0b' : '#ef4444' }}
                        >
                          {run.overall_pass_rate}%
                        </span>
                      </td>
                      <td>{new Date(run.started_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {runResult && (
        <>
          {/* Metadata Strip */}
          <div className="eval-lab__metadata-strip">
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">Benchmark</span>
              <span className="eval-lab__meta-value">{runResult.benchmark_name} v{runResult.benchmark_version}</span>
            </div>
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">Provider</span>
              <span className="eval-lab__meta-value">
                {runResult.provider} ({runResult.model})
                {runResult.is_demo_mode && <span className="eval-lab__demo-badge">DEMO</span>}
              </span>
            </div>
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">Mode</span>
              <span className="eval-lab__meta-value">{runResult.mode}</span>
            </div>
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">Prompt</span>
              <span className="eval-lab__meta-value">{runResult.prompt_version}</span>
            </div>
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">Dataset</span>
              <span className="eval-lab__meta-value">{runResult.dataset_version}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="eval-lab__tabs">
            {(['overview', 'categories', 'cases', 'failures'] as const).map((tab) => (
              <button
                key={tab}
                className={`eval-lab__tab ${activeTab === tab ? 'eval-lab__tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'overview' && '📊 '}
                {tab === 'categories' && '🏷️ '}
                {tab === 'cases' && '📝 '}
                {tab === 'failures' && '❌ '}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'failures' && runResult.failed_cases > 0 && (
                  <span className="eval-lab__tab-badge">{runResult.failed_cases}</span>
                )}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="eval-lab__overview">
              {/* Headline Metrics */}
              <div className="eval-lab__metrics-grid">
                <div className="eval-lab__metric-card eval-lab__metric-card--primary">
                  <div className="eval-lab__metric-ring">
                    <svg viewBox="0 0 100 100" className="eval-lab__ring-svg">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={runResult.overall_pass_rate >= 90 ? '#10b981' : runResult.overall_pass_rate >= 70 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        strokeDasharray={`${runResult.overall_pass_rate * 2.64} 264`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <span className="eval-lab__ring-value">{runResult.overall_pass_rate}%</span>
                  </div>
                  <div className="eval-lab__metric-label">Overall Pass Rate</div>
                  <div className="eval-lab__metric-sub">{runResult.passed_cases}/{runResult.total_cases} cases passed</div>
                </div>

                <div className="eval-lab__metric-card">
                  <div className="eval-lab__metric-value" style={{ color: '#10b981' }}>{runResult.safe_rejection_rate}%</div>
                  <div className="eval-lab__metric-label">Safe Rejection Rate</div>
                  <div className="eval-lab__metric-sub">Security cases blocked</div>
                </div>

                <div className="eval-lab__metric-card">
                  <div className="eval-lab__metric-value" style={{ color: runResult.forbidden_execution_count === 0 ? '#10b981' : '#ef4444' }}>
                    {runResult.forbidden_execution_count}
                  </div>
                  <div className="eval-lab__metric-label">Forbidden Executions</div>
                  <div className="eval-lab__metric-sub">Target: 0</div>
                </div>

                <div className="eval-lab__metric-card">
                  <div className="eval-lab__metric-value" style={{ color: '#06b6d4' }}>{runResult.clarification_accuracy}%</div>
                  <div className="eval-lab__metric-label">Clarification Accuracy</div>
                  <div className="eval-lab__metric-sub">Ambiguity handled correctly</div>
                </div>

                <div className="eval-lab__metric-card">
                  <div className="eval-lab__metric-value" style={{ color: '#ec4899' }}>{runResult.multi_turn_correctness}%</div>
                  <div className="eval-lab__metric-label">Multi-Turn Correctness</div>
                  <div className="eval-lab__metric-sub">Conversation context preserved</div>
                </div>

                <div className="eval-lab__metric-card">
                  <div className="eval-lab__metric-value" style={{ color: '#8b5cf6' }}>
                    {runResult.median_latency_ms.toFixed(1)}ms
                  </div>
                  <div className="eval-lab__metric-label">Median Latency</div>
                  <div className="eval-lab__metric-sub">p95: {runResult.p95_latency_ms.toFixed(1)}ms</div>
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="eval-lab__categories">
              <div className="eval-lab__category-grid">
                {Object.entries(runResult.category_metrics).map(([cat, metrics]) => {
                  const info = CATEGORY_LABELS[cat] || { label: cat, color: '#666', icon: '📁' }
                  const catMetric = metrics as EvalCategoryMetric
                  return (
                    <button
                      key={cat}
                      className={`eval-lab__category-card ${selectedCategory === cat ? 'eval-lab__category-card--selected' : ''}`}
                      onClick={() => {
                        setSelectedCategory(selectedCategory === cat ? null : cat)
                        setActiveTab('cases')
                      }}
                    >
                      <div className="eval-lab__cat-header">
                        <span className="eval-lab__cat-icon">{info.icon}</span>
                        <span className="eval-lab__cat-label">{info.label}</span>
                      </div>
                      <div className="eval-lab__cat-bar-wrapper">
                        <div
                          className="eval-lab__cat-bar"
                          style={{
                            width: `${catMetric.pass_rate}%`,
                            backgroundColor: catMetric.pass_rate >= 90 ? '#10b981' : catMetric.pass_rate >= 70 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <div className="eval-lab__cat-stats">
                        <span className="eval-lab__cat-rate" style={{ color: info.color }}>{catMetric.pass_rate}%</span>
                        <span className="eval-lab__cat-count">{catMetric.passed}/{catMetric.total}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cases Tab */}
          {activeTab === 'cases' && (
            <div className="eval-lab__cases">
              {/* Category filter chips */}
              <div className="eval-lab__filter-chips">
                <button
                  className={`eval-lab__chip ${!selectedCategory ? 'eval-lab__chip--active' : ''}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All ({runResult.case_results.length})
                </button>
                {Object.entries(CATEGORY_LABELS).map(([cat, info]) => {
                  const count = runResult.case_results.filter(c => c.category === cat).length
                  if (count === 0) return null
                  return (
                    <button
                      key={cat}
                      className={`eval-lab__chip ${selectedCategory === cat ? 'eval-lab__chip--active' : ''}`}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      style={selectedCategory === cat ? { backgroundColor: info.color, borderColor: info.color } : {}}
                    >
                      {info.icon} {info.label} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Summary strip */}
              <div className="eval-lab__cases-summary">
                <span className="eval-lab__cases-passed">✅ {passedCases.length} Passed</span>
                <span className="eval-lab__cases-failed">❌ {failedCases.length} Failed</span>
              </div>

              {/* Case list */}
              <div className="eval-lab__case-list">
                {filteredCases.map((c: EvalCaseResult) => {
                  const catInfo = CATEGORY_LABELS[c.category] || { label: c.category, color: '#666', icon: '📁' }
                  const behaviorInfo = BEHAVIOR_LABELS[c.actual_behavior] || { label: c.actual_behavior, color: '#666' }
                  const isExpanded = expandedCase === c.case_id

                  return (
                    <div
                      key={c.case_id}
                      className={`eval-lab__case-item ${c.passed ? 'eval-lab__case-item--pass' : 'eval-lab__case-item--fail'}`}
                    >
                      <button
                        className="eval-lab__case-header"
                        onClick={() => setExpandedCase(isExpanded ? null : c.case_id)}
                        aria-expanded={isExpanded}
                      >
                        <span className={`eval-lab__case-status ${c.passed ? 'eval-lab__case-status--pass' : 'eval-lab__case-status--fail'}`}>
                          {c.passed ? '✅' : '❌'}
                        </span>
                        <span className="eval-lab__case-id">{c.case_id}</span>
                        <span className="eval-lab__case-cat" style={{ color: catInfo.color }}>
                          {catInfo.icon} {catInfo.label}
                        </span>
                        <span className="eval-lab__case-question">{c.question}</span>
                        <span className="eval-lab__case-behavior" style={{ color: behaviorInfo.color }}>
                          {behaviorInfo.label}
                        </span>
                        <span className="eval-lab__case-latency">{c.latency_ms.toFixed(1)}ms</span>
                        <span className={`eval-lab__case-chevron ${isExpanded ? 'eval-lab__case-chevron--open' : ''}`}>▼</span>
                      </button>

                      {isExpanded && (
                        <div className="eval-lab__case-detail">
                          <div className="eval-lab__detail-grid">
                            <div className="eval-lab__detail-item">
                              <span className="eval-lab__detail-label">Expected</span>
                              <span className="eval-lab__detail-value">{c.expected_behavior}</span>
                            </div>
                            <div className="eval-lab__detail-item">
                              <span className="eval-lab__detail-label">Actual</span>
                              <span className="eval-lab__detail-value" style={{ color: behaviorInfo.color }}>{c.actual_behavior}</span>
                            </div>
                            {c.interpreted_question && (
                              <div className="eval-lab__detail-item eval-lab__detail-item--wide">
                                <span className="eval-lab__detail-label">Interpreted</span>
                                <span className="eval-lab__detail-value">{c.interpreted_question}</span>
                              </div>
                            )}
                            {c.failure_reason && (
                              <div className="eval-lab__detail-item eval-lab__detail-item--wide">
                                <span className="eval-lab__detail-label">Failure Reason</span>
                                <span className="eval-lab__detail-value eval-lab__detail-value--error">{c.failure_reason}</span>
                              </div>
                            )}
                            {c.generated_sql && (
                              <div className="eval-lab__detail-item eval-lab__detail-item--wide">
                                <span className="eval-lab__detail-label">Generated SQL</span>
                                <pre className="eval-lab__sql-block">{c.generated_sql}</pre>
                              </div>
                            )}
                            {c.validation && Object.keys(c.validation).length > 0 && (
                              <div className="eval-lab__detail-item eval-lab__detail-item--wide">
                                <span className="eval-lab__detail-label">Validation</span>
                                <div className="eval-lab__validation-pills">
                                  {c.validation.checks?.map((check: string) => (
                                    <span key={check} className="eval-lab__val-pill eval-lab__val-pill--pass">{check} ✓</span>
                                  ))}
                                  {c.validation.violations?.map((v: string) => (
                                    <span key={v} className="eval-lab__val-pill eval-lab__val-pill--fail">{v}</span>
                                  ))}
                                  {c.validation.tables_referenced?.map((t: string) => (
                                    <span key={t} className="eval-lab__val-pill eval-lab__val-pill--info">📋 {t}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Failures Tab */}
          {activeTab === 'failures' && (
            <div className="eval-lab__failures">
              {runResult.failures_detail.length === 0 ? (
                <div className="eval-lab__empty-state eval-lab__empty-state--success">
                  <div className="eval-lab__empty-icon">🎉</div>
                  <h4>All Cases Passed!</h4>
                  <p>No failures detected in this evaluation run.</p>
                </div>
              ) : (
                <div className="eval-lab__failure-list">
                  {runResult.failures_detail.map((f) => {
                    const catInfo = CATEGORY_LABELS[f.category] || { label: f.category, color: '#666', icon: '📁' }
                    return (
                      <div key={f.case_id} className="eval-lab__failure-card">
                        <div className="eval-lab__failure-header">
                          <span className="eval-lab__failure-id">{f.case_id}</span>
                          <span className="eval-lab__failure-cat" style={{ color: catInfo.color }}>
                            {catInfo.icon} {catInfo.label}
                          </span>
                        </div>
                        <div className="eval-lab__failure-question">{f.question}</div>
                        <div className="eval-lab__failure-comparison">
                          <div className="eval-lab__failure-expected">
                            <span className="eval-lab__failure-label">Expected:</span> {f.expected_behavior}
                          </div>
                          <span className="eval-lab__failure-arrow">→</span>
                          <div className="eval-lab__failure-actual">
                            <span className="eval-lab__failure-label">Got:</span> {f.actual_behavior}
                          </div>
                        </div>
                        <div className="eval-lab__failure-reason">
                          <strong>Reason:</strong> {f.failure_reason}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
