import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import {
  Filter,
  BarChart3,
  Calendar,
  Layers,
  Tag,
  MessageSquare,
  HelpCircle,
  Ban,
  ShieldAlert,
  Folder,
  CheckCircle2,
  XCircle,
  Play,
  History,
  AlertTriangle,
  ChevronDown,
  Shield,
  SlidersHorizontal,
  FileCheck,
  FlaskConical,
  Database,
  ArrowRight,
} from 'lucide-react'
import {
  type EvaluationRunResponse,
  type EvalCaseResult,
  type EvalCategoryMetric,
  type EvaluationRunListItem,
  runEvaluation,
  fetchEvaluationRuns,
} from '../api/client'
import './EvaluationLabView.css'
import { withLayoutTransition } from '../motion'
import { readUrlParam, replaceUrlParams } from '../urlState'

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  simple_filter: { label: 'Simple Filter', icon: Filter },
  aggregation: { label: 'Aggregation', icon: BarChart3 },
  date_range: { label: 'Date Range', icon: Calendar },
  join: { label: 'Multi-Table Join', icon: Layers },
  semantic: { label: 'Semantic Terms', icon: Tag },
  multi_turn: { label: 'Multi-Turn', icon: MessageSquare },
  ambiguity: { label: 'Ambiguity', icon: HelpCircle },
  unsupported: { label: 'Unsupported', icon: Ban },
  security: { label: 'Security', icon: ShieldAlert },
}

const BEHAVIOR_LABELS: Record<string, { label: string; statusClass: string }> = {
  ready: { label: 'Ready', statusClass: 'status-ready' },
  previewed: { label: 'Previewed', statusClass: 'status-ready' },
  blocked: { label: 'Blocked', statusClass: 'status-blocked' },
  blocked_by_ast: { label: 'Blocked (AST)', statusClass: 'status-blocked' },
  clarification_needed: { label: 'Clarification', statusClass: 'status-warn' },
  unsupported: { label: 'Unsupported', statusClass: 'status-neutral' },
  error: { label: 'Error', statusClass: 'status-error' },
}

type EvaluationTab = 'overview' | 'categories' | 'cases' | 'failures'

export default function EvaluationLabView() {
  const [runResult, setRunResult] = useState<EvaluationRunResponse | null>(null)
  const [pastRuns, setPastRuns] = useState<EvaluationRunListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<'guarded' | 'baseline'>('guarded')
  const [activeTab, setActiveTab] = useState<EvaluationTab>(() => {
    const tab = readUrlParam('evaluationTab')
    return tab === 'categories' || tab === 'cases' || tab === 'failures' ? tab : 'overview'
  })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedCase, setExpandedCase] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const tabs = tabsRef.current
      const activeTabButton = activeTabRef.current
      if (!tabs || !activeTabButton) return

      const tabsBounds = tabs.getBoundingClientRect()
      const activeBounds = activeTabButton.getBoundingClientRect()
      setTabIndicator({
        left: activeBounds.left - tabsBounds.left,
        width: activeBounds.width,
        ready: true,
      })
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab, runResult])

  const selectTab = (tab: EvaluationTab) => {
    replaceUrlParams({ evaluationTab: tab === 'overview' ? null : tab })
    withLayoutTransition(() => setActiveTab(tab))
  }

  useEffect(() => {
    const syncTabFromBrowserHistory = () => {
      const tab = readUrlParam('evaluationTab')
      withLayoutTransition(() =>
        setActiveTab(tab === 'categories' || tab === 'cases' || tab === 'failures' ? tab : 'overview')
      )
    }
    window.addEventListener('popstate', syncTabFromBrowserHistory)
    return () => window.removeEventListener('popstate', syncTabFromBrowserHistory)
  }, [])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const runs = await fetchEvaluationRuns()
      setPastRuns(runs)
    } catch {
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
      withLayoutTransition(() => {
        setRunResult(result)
        setActiveTab('overview')
      })
      await loadHistory()
    } catch (err: any) {
      setError(err.message || 'Evaluation run failed')
    } finally {
      setLoading(false)
    }
  }

  const filteredCases =
    runResult?.case_results?.filter((c) => !selectedCategory || c.category === selectedCategory) || []

  const passedCases = filteredCases.filter((c) => c.passed)
  const failedCases = filteredCases.filter((c) => !c.passed)

  return (
    <div className="eval-lab">
      {/* View Hero Header */}
      <div className="eval-lab__hero">
        <div>
          <div className="eval-lab__eyebrow">
            <span className="eval-lab__eyebrow-dot">●</span>
            EVALUATION &amp; BENCHMARK BENCH
          </div>
          <h2 className="eval-lab__heading">Evaluation Lab</h2>
          <p className="eval-lab__copy">
            Deterministic regression suite evaluating SQL generation safety, AST guardrails, and query correctness
            across synthetic network schemas.
          </p>
        </div>
      </div>

      {/* Governance Banner */}
      <div className="eval-lab__governance-banner">
        <FlaskConical size={18} className="eval-lab__governance-icon" />
        <div>
          <strong>Evaluation Lab — Regression Benchmark</strong>
          <p>
            Execute the versioned benchmark suite against the configured LLM provider. All metrics are computed
            from real pipeline output — no fabricated accuracy numbers. Admin access required.
          </p>
        </div>
      </div>

      {/* Controls Strip */}
      <div className="eval-lab__controls">
        <div className="eval-lab__mode-selector">
          <label className="eval-lab__mode-label">Pipeline Mode</label>
          <div className="eval-lab__mode-buttons">
            <button
              type="button"
              className={`eval-lab__mode-btn ${selectedMode === 'guarded' ? 'eval-lab__mode-btn--active' : ''}`}
              onClick={() => setSelectedMode('guarded')}
              disabled={loading}
            >
              <div className="eval-lab__mode-btn-header">
                <Shield size={14} />
                <span>Guarded</span>
              </div>
              <span className="eval-lab__mode-desc">Full AST validation</span>
            </button>
            <button
              type="button"
              className={`eval-lab__mode-btn ${selectedMode === 'baseline' ? 'eval-lab__mode-btn--active' : ''}`}
              onClick={() => setSelectedMode('baseline')}
              disabled={loading}
            >
              <div className="eval-lab__mode-btn-header">
                <SlidersHorizontal size={14} />
                <span>Baseline</span>
              </div>
              <span className="eval-lab__mode-desc">LLM-only comparison</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className="eval-lab__run-btn"
          onClick={handleRunEvaluation}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="eval-lab__spinner" />
              <span>Running Benchmark…</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>Execute Benchmark Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="eval-lab__error" role="alert">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Past Runs History (Shown when no current run is active) */}
      {!runResult && !loading && (
        <div className="eval-lab__history-section">
          <div className="eval-lab__history-header">
            <History size={16} />
            <h3 className="eval-lab__section-title">Past Evaluation Runs</h3>
          </div>

          {loadingHistory ? (
            <div className="eval-lab__loading-state">
              <span className="eval-lab__spinner" /> Loading run history…
            </div>
          ) : pastRuns.length === 0 ? (
            <div className="eval-lab__empty-state">
              <div className="eval-lab__empty-icon">
                <FlaskConical size={32} />
              </div>
              <h4>No Evaluation Runs Yet</h4>
              <p>Select a pipeline mode above and click "Execute Benchmark Suite" to run your first evaluation.</p>
            </div>
          ) : (
            <div className="eval-lab__history-table-wrapper">
              <table className="eval-lab__history-table">
                <thead>
                  <tr>
                    <th>BENCHMARK</th>
                    <th>MODE</th>
                    <th>PROVIDER</th>
                    <th>STATUS</th>
                    <th>CASES</th>
                    <th>PASS RATE</th>
                    <th>DATE</th>
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
                          {run.mode === 'guarded' ? <Shield size={12} /> : <SlidersHorizontal size={12} />}
                          <span>{run.mode}</span>
                        </span>
                      </td>
                      <td className="mono">{run.provider}</td>
                      <td>
                        <span className={`eval-lab__status-badge eval-lab__status-badge--${run.status}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="mono">
                        {run.passed_cases}/{run.total_cases}
                      </td>
                      <td>
                        <span
                          className="eval-lab__pass-rate"
                          style={{
                            color:
                              run.overall_pass_rate >= 90
                                ? '#15803D'
                                : run.overall_pass_rate >= 70
                                ? '#B45309'
                                : 'var(--qt-danger)',
                          }}
                        >
                          {run.overall_pass_rate}%
                        </span>
                      </td>
                      <td className="mono">{new Date(run.started_at).toLocaleDateString()}</td>
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
              <span className="eval-lab__meta-label">BENCHMARK</span>
              <span className="eval-lab__meta-value">
                {runResult.benchmark_name} v{runResult.benchmark_version}
              </span>
            </div>
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">PROVIDER</span>
              <span className="eval-lab__meta-value">
                {runResult.provider} ({runResult.model})
                {runResult.is_demo_mode && <span className="eval-lab__demo-badge">DEMO</span>}
              </span>
            </div>
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">MODE</span>
              <span className="eval-lab__meta-value mono">{runResult.mode}</span>
            </div>
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">PROMPT</span>
              <span className="eval-lab__meta-value mono">{runResult.prompt_version}</span>
            </div>
            <div className="eval-lab__meta-item">
              <span className="eval-lab__meta-label">DATASET</span>
              <span className="eval-lab__meta-value mono">{runResult.dataset_version}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="eval-lab__tabs" role="tablist" aria-label="Evaluation results" ref={tabsRef}>
            <span
              aria-hidden="true"
              className="eval-lab__tab-indicator"
              style={{
                opacity: tabIndicator.ready ? 1 : 0,
                transform: `translateX(${tabIndicator.left}px)`,
                width: tabIndicator.width,
              }}
            />
            {(['overview', 'categories', 'cases', 'failures'] as const).map((tab) => (
              <button
                key={tab}
                className={`eval-lab__tab ${activeTab === tab ? 'eval-lab__tab--active' : ''}`}
                onClick={() => selectTab(tab)}
                ref={activeTab === tab ? activeTabRef : undefined}
                role="tab"
                aria-selected={activeTab === tab}
              >
                {tab === 'overview' && <BarChart3 size={14} />}
                {tab === 'categories' && <Tag size={14} />}
                {tab === 'cases' && <FileCheck size={14} />}
                {tab === 'failures' && <AlertTriangle size={14} />}
                <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                {tab === 'failures' && runResult.failed_cases > 0 && (
                  <span className="eval-lab__tab-badge">{runResult.failed_cases}</span>
                )}
              </button>
            ))}
          </div>

          <div className="eval-lab__tab-panel layout-transition-target">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="eval-lab__overview">
                {/* Headline Metrics Grid */}
                <div className="eval-lab__metrics-grid">
                  <div className="eval-lab__metric-card eval-lab__metric-card--primary">
                    <div className="eval-lab__metric-value">
                      {runResult.overall_pass_rate}%
                    </div>
                    <div className="eval-lab__metric-label">Overall Pass Rate</div>
                    <div className="eval-lab__metric-sub">
                      {runResult.passed_cases}/{runResult.total_cases} cases passed
                    </div>
                  </div>

                  <div className="eval-lab__metric-card">
                    <div className="eval-lab__metric-value">
                      {runResult.safe_rejection_rate}%
                    </div>
                    <div className="eval-lab__metric-label">Safe Rejection Rate</div>
                    <div className="eval-lab__metric-sub">Security cases blocked</div>
                  </div>

                  <div className="eval-lab__metric-card">
                    <div
                      className="eval-lab__metric-value"
                      style={{
                        color:
                          runResult.forbidden_execution_count === 0
                            ? 'var(--qt-ink)'
                            : 'var(--qt-danger)',
                      }}
                    >
                      {runResult.forbidden_execution_count}
                    </div>
                    <div className="eval-lab__metric-label">Forbidden Executions</div>
                    <div className="eval-lab__metric-sub">Target: 0 mutations</div>
                  </div>

                  <div className="eval-lab__metric-card">
                    <div className="eval-lab__metric-value">
                      {runResult.clarification_accuracy}%
                    </div>
                    <div className="eval-lab__metric-label">Clarification Accuracy</div>
                    <div className="eval-lab__metric-sub">Ambiguity handled correctly</div>
                  </div>

                  <div className="eval-lab__metric-card">
                    <div className="eval-lab__metric-value">
                      {runResult.multi_turn_correctness}%
                    </div>
                    <div className="eval-lab__metric-label">Multi-Turn Correctness</div>
                    <div className="eval-lab__metric-sub">Conversation context preserved</div>
                  </div>

                  <div className="eval-lab__metric-card">
                    <div className="eval-lab__metric-value mono">
                      {runResult.median_latency_ms.toFixed(1)}ms
                    </div>
                    <div className="eval-lab__metric-label">Median Latency</div>
                    <div className="eval-lab__metric-sub mono">
                      p95: {runResult.p95_latency_ms.toFixed(1)}ms
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="eval-lab__categories">
                <div className="eval-lab__category-grid">
                  {Object.entries(runResult.category_metrics).map(([cat, metrics]) => {
                    const info = CATEGORY_META[cat] || { label: cat, icon: Folder }
                    const CatIcon = info.icon
                    const catMetric = metrics as EvalCategoryMetric
                    return (
                      <button
                        type="button"
                        key={cat}
                        className={`eval-lab__category-card ${
                          selectedCategory === cat ? 'eval-lab__category-card--selected' : ''
                        }`}
                        onClick={() => {
                          withLayoutTransition(() => {
                            setSelectedCategory(selectedCategory === cat ? null : cat)
                            setActiveTab('cases')
                          })
                        }}
                      >
                        <div className="eval-lab__cat-header">
                          <CatIcon size={15} className="eval-lab__cat-icon" />
                          <span className="eval-lab__cat-label">{info.label}</span>
                        </div>
                        <div className="eval-lab__cat-bar-wrapper">
                          <div
                            className="eval-lab__cat-bar"
                            style={{
                              width: `${catMetric.pass_rate}%`,
                              backgroundColor:
                                catMetric.pass_rate >= 90
                                ? '#15803D'
                                : catMetric.pass_rate >= 70
                                ? '#B45309'
                                : 'var(--qt-danger)',
                            }}
                          />
                        </div>
                        <div className="eval-lab__cat-stats">
                          <span className="eval-lab__cat-rate mono">{catMetric.pass_rate}%</span>
                          <span className="eval-lab__cat-count mono">
                            {catMetric.passed}/{catMetric.total}
                          </span>
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
                    type="button"
                    className={`eval-lab__chip ${!selectedCategory ? 'eval-lab__chip--active' : ''}`}
                    onClick={() => withLayoutTransition(() => setSelectedCategory(null))}
                  >
                    All ({runResult.case_results.length})
                  </button>
                  {Object.entries(CATEGORY_META).map(([cat, info]) => {
                    const count = runResult.case_results.filter((c) => c.category === cat).length
                    if (count === 0) return null
                    const ChipIcon = info.icon
                    return (
                      <button
                        type="button"
                        key={cat}
                        className={`eval-lab__chip ${
                          selectedCategory === cat ? 'eval-lab__chip--active' : ''
                        }`}
                        onClick={() =>
                          withLayoutTransition(() =>
                            setSelectedCategory(selectedCategory === cat ? null : cat)
                          )
                        }
                      >
                        <ChipIcon size={12} />
                        <span>{info.label}</span>
                        <span className="eval-lab__chip-count mono">({count})</span>
                      </button>
                    )
                  })}
                </div>

                {/* Summary strip */}
                <div className="eval-lab__cases-summary">
                  <span className="eval-lab__cases-passed">
                    <CheckCircle2 size={13} style={{ color: '#15803D' }} />
                    <span>{passedCases.length} Passed</span>
                  </span>
                  <span className="eval-lab__cases-failed">
                    <XCircle size={13} style={{ color: 'var(--qt-danger)' }} />
                    <span>{failedCases.length} Failed</span>
                  </span>
                </div>

                {/* Case list */}
                <div className="eval-lab__case-list">
                  {filteredCases.map((c: EvalCaseResult) => {
                    const catInfo = CATEGORY_META[c.category] || { label: c.category, icon: Folder }
                    const CatIcon = catInfo.icon
                    const behavior = BEHAVIOR_LABELS[c.actual_behavior] || {
                      label: c.actual_behavior,
                      statusClass: 'status-neutral',
                    }
                    const isExpanded = expandedCase === c.case_id

                    return (
                      <div
                        key={c.case_id}
                        className={`eval-lab__case-item ${
                          c.passed ? 'eval-lab__case-item--pass' : 'eval-lab__case-item--fail'
                        }`}
                      >
                        <button
                          type="button"
                          className="eval-lab__case-header"
                          onClick={() =>
                            withLayoutTransition(() =>
                              setExpandedCase(isExpanded ? null : c.case_id)
                            )
                          }
                          aria-expanded={isExpanded}
                        >
                          <span
                            className={`eval-lab__case-status ${
                              c.passed ? 'eval-lab__case-status--pass' : 'eval-lab__case-status--fail'
                            }`}
                          >
                            {c.passed ? (
                              <CheckCircle2 size={14} style={{ color: '#15803D' }} />
                            ) : (
                              <XCircle size={14} style={{ color: 'var(--qt-danger)' }} />
                            )}
                          </span>
                          <span className="eval-lab__case-id mono">{c.case_id}</span>
                          <span className="eval-lab__case-cat">
                            <CatIcon size={12} />
                            <span>{catInfo.label}</span>
                          </span>
                          <span className="eval-lab__case-question">{c.question}</span>
                          <span className={`eval-lab__case-behavior ${behavior.statusClass}`}>
                            {behavior.label}
                          </span>
                          <span className="eval-lab__case-latency mono">{c.latency_ms.toFixed(1)}ms</span>
                          <ChevronDown
                            size={14}
                            className={`eval-lab__case-chevron ${
                              isExpanded ? 'eval-lab__case-chevron--open' : ''
                            }`}
                          />
                        </button>

                        <div
                          className={`eval-lab__case-detail ${
                            isExpanded ? 'eval-lab__case-detail--open' : ''
                          }`}
                          aria-hidden={!isExpanded}
                        >
                          <div className="eval-lab__case-detail-inner">
                            <div className="eval-lab__detail-grid">
                              <div className="eval-lab__detail-item">
                                <span className="eval-lab__detail-label">Expected</span>
                                <span className="eval-lab__detail-value">{c.expected_behavior}</span>
                              </div>
                              <div className="eval-lab__detail-item">
                                <span className="eval-lab__detail-label">Actual</span>
                                <span className={`eval-lab__detail-value ${behavior.statusClass}`}>
                                  {c.actual_behavior}
                                </span>
                              </div>
                              {c.interpreted_question && (
                                <div className="eval-lab__detail-item eval-lab__detail-item--wide">
                                  <span className="eval-lab__detail-label">Interpreted Intent</span>
                                  <span className="eval-lab__detail-value">{c.interpreted_question}</span>
                                </div>
                              )}
                              {c.failure_reason && (
                                <div className="eval-lab__detail-item eval-lab__detail-item--wide">
                                  <span className="eval-lab__detail-label">Failure Reason</span>
                                  <span className="eval-lab__detail-value eval-lab__detail-value--error">
                                    {c.failure_reason}
                                  </span>
                                </div>
                              )}
                              {c.generated_sql && (
                                <div className="eval-lab__detail-item eval-lab__detail-item--wide">
                                  <span className="eval-lab__detail-label">Generated SQL</span>
                                  <pre className="eval-lab__sql-block">
                                    <code>{c.generated_sql}</code>
                                  </pre>
                                </div>
                              )}
                              {c.validation && Object.keys(c.validation).length > 0 && (
                                <div className="eval-lab__detail-item eval-lab__detail-item--wide">
                                  <span className="eval-lab__detail-label">Validation</span>
                                  <div className="eval-lab__validation-pills">
                                    {c.validation.checks?.map((check: string) => (
                                      <span
                                        key={check}
                                        className="eval-lab__val-pill eval-lab__val-pill--pass"
                                      >
                                        <CheckCircle2 size={11} /> {check}
                                      </span>
                                    ))}
                                    {c.validation.violations?.map((v: string) => (
                                      <span
                                        key={v}
                                        className="eval-lab__val-pill eval-lab__val-pill--fail"
                                      >
                                        <XCircle size={11} /> {v}
                                      </span>
                                    ))}
                                    {c.validation.tables_referenced?.map((t: string) => (
                                      <span
                                        key={t}
                                        className="eval-lab__val-pill eval-lab__val-pill--info"
                                      >
                                        <Database size={11} /> {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
                    <div className="eval-lab__empty-icon">
                      <CheckCircle2 size={32} style={{ color: '#15803D' }} />
                    </div>
                    <h4>All Cases Passed</h4>
                    <p>Zero test failures detected across this benchmark evaluation run.</p>
                  </div>
                ) : (
                  <div className="eval-lab__failure-list">
                    {runResult.failures_detail.map((f) => {
                      const catInfo = CATEGORY_META[f.category] || { label: f.category, icon: Folder }
                      const CatIcon = catInfo.icon
                      return (
                        <div key={f.case_id} className="eval-lab__failure-card">
                          <div className="eval-lab__failure-header">
                            <span className="eval-lab__failure-id mono">{f.case_id}</span>
                            <span className="eval-lab__failure-cat">
                              <CatIcon size={12} />
                              <span>{catInfo.label}</span>
                            </span>
                          </div>
                          <div className="eval-lab__failure-question">{f.question}</div>
                          <div className="eval-lab__failure-comparison">
                            <div className="eval-lab__failure-expected">
                              <span className="eval-lab__failure-label">Expected:</span>{' '}
                              <span className="mono">{f.expected_behavior}</span>
                            </div>
                            <ArrowRight size={14} className="eval-lab__failure-arrow" />
                            <div className="eval-lab__failure-actual">
                              <span className="eval-lab__failure-label">Got:</span>{' '}
                              <span className="mono">{f.actual_behavior}</span>
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
          </div>
        </>
      )}
    </div>
  )
}
