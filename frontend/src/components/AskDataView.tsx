import React, { useState, useEffect, useRef } from 'react'
import {
  previewQuery,
  executeSavedQuery,
  submitQueryFeedback,
  fetchChatSessions,
  createChatSession,
  fetchSessionMessages,
  deleteChatSession,
  type PreviewResponse,
  type ExecuteResponse,
  type ChatSessionSummary,
  type ChatMessage,
} from '../api/client'

interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  previewData?: PreviewResponse | null
  createdAt: string
}

const STARTER_PROMPTS = [
  {
    category: 'Fleet Aggregations',
    label: 'Active devices by region',
    prompt: 'How many active devices are in each region?',
    badge: 'Standard Query',
    badgeClass: 'badge-success',
  },
  {
    category: 'Warranty Horizon',
    label: 'Routers expiring in 60 days',
    prompt: 'Show all routers with warranty expiring in the next 60 days.',
    badge: 'Time Horizon',
    badgeClass: 'badge-info',
  },
  {
    category: 'Incident Triage',
    label: 'Open incidents by facility site',
    prompt: 'List critical open service events grouped by site.',
    badge: 'Multi-table Join',
    badgeClass: 'badge-primary',
  },
  {
    category: 'Ambiguity Disambiguation',
    label: 'High-risk devices (Requires clarification)',
    prompt: 'Show all high-risk devices in New York.',
    badge: 'Clarification Needed',
    badgeClass: 'badge-warning',
  },
  {
    category: 'Out of Domain',
    label: 'Quarterly financial revenue (Unsupported)',
    prompt: 'What is our total quarterly revenue and customer churn?',
    badge: 'Unsupported Intent',
    badgeClass: 'badge-neutral',
  },
  {
    category: 'Security Injection Test',
    label: 'Multi-statement DROP TABLE (Safety blocked)',
    prompt: 'SELECT * FROM devices; DROP TABLE sites; --',
    badge: 'SQLGlot Block',
    badgeClass: 'badge-danger',
  },
]

// Pure SVG Chart Component
const VisualChart: React.FC<{ result: ExecuteResponse }> = ({ result }) => {
  const { chart_recommendation: rec, rows, columns } = result
  if (!rows || rows.length === 0) {
    return <div className="chart-empty">No data to visualize.</div>
  }

  // 1. Metric Single Value
  if (rec.chart_type === 'metric' || (rows.length === 1 && columns.length === 1)) {
    const val = rows[0][columns[0]]
    return (
      <div className="metric-chart-container">
        <div className="metric-chart-label">{rec.title || columns[0].replace('_', ' ').toUpperCase()}</div>
        <div className="metric-chart-value">{val?.toLocaleString?.() ?? val}</div>
      </div>
    )
  }

  const xKey = rec.x_axis || columns[0]
  const yKey = rec.y_axis || columns[1]

  // 2. Bar Chart
  if (rec.chart_type === 'bar') {
    const chartData = rows.slice(0, 15).map((r) => ({
      label: String(r[xKey] ?? 'Unknown'),
      value: Number(r[yKey] ?? 0),
    }))
    const maxVal = Math.max(...chartData.map((d) => d.value), 1)
    const height = 240
    const barWidth = Math.max(28, Math.min(56, Math.floor(520 / chartData.length) - 16))

    return (
      <div className="svg-chart-wrapper">
        <div className="chart-title">{rec.title}</div>
        <div className="bar-chart-scroll">
          <svg width={Math.max(540, chartData.length * (barWidth + 24))} height={height} className="svg-chart">
            {chartData.map((d, i) => {
              const barHeight = Math.max(4, Math.round((d.value / maxVal) * (height - 70)))
              const x = 30 + i * (barWidth + 24)
              const y = height - 40 - barHeight

              return (
                <g key={i} className="bar-group">
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    fill="url(#barGradient)"
                    className="svg-bar"
                  />
                  <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="bar-value-label">
                    {d.value.toLocaleString()}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={height - 18}
                    textAnchor="middle"
                    className="bar-axis-label"
                  >
                    {d.label.length > 10 ? d.label.substring(0, 8) + '…' : d.label}
                  </text>
                </g>
              )
            })}
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    )
  }

  // 3. Donut / Pie Chart
  if (rec.chart_type === 'pie') {
    const chartData = rows.slice(0, 8).map((r) => ({
      label: String(r[xKey] ?? 'Unknown'),
      value: Number(r[yKey] ?? 0),
    }))
    const total = chartData.reduce((acc, curr) => acc + curr.value, 0) || 1
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#64748b']

    // Compute SVG donut arcs
    let accumulatedAngle = 0
    const center = 90
    const radius = 70
    const innerRadius = 45

    const slices = chartData.map((d, idx) => {
      const sliceAngle = (d.value / total) * 2 * Math.PI
      const startAngle = accumulatedAngle
      const endAngle = accumulatedAngle + sliceAngle
      accumulatedAngle = endAngle

      const x1 = center + radius * Math.cos(startAngle)
      const y1 = center + radius * Math.sin(startAngle)
      const x2 = center + radius * Math.cos(endAngle)
      const y2 = center + radius * Math.sin(endAngle)

      const x3 = center + innerRadius * Math.cos(endAngle)
      const y3 = center + innerRadius * Math.sin(endAngle)
      const x4 = center + innerRadius * Math.cos(startAngle)
      const y4 = center + innerRadius * Math.sin(startAngle)

      const largeArc = sliceAngle > Math.PI ? 1 : 0
      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ')

      const pct = Math.round((d.value / total) * 100)
      return { pathData, color: colors[idx % colors.length], label: d.label, value: d.value, pct }
    })

    return (
      <div className="donut-chart-container">
        <div className="chart-title" style={{ width: '100%', marginBottom: '0.75rem' }}>
          {rec.title}
        </div>
        <svg width="180" height="180" viewBox="0 0 180 180" className="donut-svg">
          {slices.map((s, idx) => (
            <path key={idx} d={s.pathData} fill={s.color} className="donut-slice" />
          ))}
        </svg>
        <div className="donut-legend">
          {slices.map((s, idx) => (
            <div key={idx} className="legend-item">
              <span className="legend-color-dot" style={{ backgroundColor: s.color }} />
              <span className="legend-label">{s.label}:</span>
              <span className="legend-val">
                {s.value.toLocaleString()} ({s.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Fallback to table
  return null
}

export const AskDataView: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputQuestion, setInputQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null)

  // Execution & Feedback States
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [resultsMap, setResultsMap] = useState<Record<string, ExecuteResponse>>({})
  const [viewModeMap, setViewModeMap] = useState<Record<string, 'table' | 'chart'>>({})
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, { isHelpful: boolean; explanation: string; saved: boolean }>
  >({})

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, executingId])

  const loadSessions = async () => {
    try {
      const data = await fetchChatSessions()
      setSessions(data)
      if (data.length > 0 && !activeSessionId) {
        selectSession(data[0].id)
      }
    } catch (err: any) {
      console.error('Failed to load sessions:', err)
    }
  }

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId)
    setErrorMessage(null)
    try {
      const history = await fetchSessionMessages(sessionId)
      const mapped: MessageItem[] = history.map((m: ChatMessage) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        previewData: m.metadata_json
          ? {
              query_run_id: m.metadata_json.query_run_id || m.id,
              status: m.metadata_json.status || 'previewed',
              intent_status: m.metadata_json.intent_status || 'ready',
              interpreted_question: m.content,
              sql_preview: m.metadata_json.sql_preview,
              validation: {
                passed: m.metadata_json.status === 'previewed',
                checks: ['single_statement', 'select_only', 'table_allowlist', 'row_limit'],
                violations: m.metadata_json.violations || [],
                warnings: [],
                tables_referenced: ['devices'],
              },
              assumptions: [],
              business_terms_used: [],
              can_execute: m.metadata_json.can_execute || false,
              provider: 'demo',
              model: 'deterministic-rule-v1',
              is_demo_mode: true,
              created_at: m.created_at,
            }
          : null,
        createdAt: m.created_at,
      }))
      setMessages(mapped)
    } catch (err: any) {
      setErrorMessage(`Failed to load session messages: ${err.message}`)
    }
  }

  const handleCreateNewSession = async () => {
    try {
      const newSession = await createChatSession(
        `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      )
      setSessions((prev) => [newSession, ...prev])
      setActiveSessionId(newSession.id)
      setMessages([])
      setErrorMessage(null)
    } catch (err: any) {
      setErrorMessage(`Failed to create new session: ${err.message}`)
    }
  }

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    try {
      await deleteChatSession(sessionId)
      const remaining = sessions.filter((s) => s.id !== sessionId)
      setSessions(remaining)
      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          selectSession(remaining[0].id)
        } else {
          setActiveSessionId(null)
          setMessages([])
        }
      }
    } catch (err: any) {
      setErrorMessage(`Failed to delete session: ${err.message}`)
    }
  }

  const handleSendQuestion = async (overridePrompt?: string) => {
    const questionText = (overridePrompt || inputQuestion).trim()
    if (!questionText || isLoading) return

    setInputQuestion('')
    setErrorMessage(null)

    let targetSessionId = activeSessionId
    if (!targetSessionId) {
      try {
        const newSession = await createChatSession('Fleet Analytics Conversation')
        setSessions([newSession])
        setActiveSessionId(newSession.id)
        targetSessionId = newSession.id
      } catch (err: any) {
        setErrorMessage(`Failed to initialize session: ${err.message}`)
        return
      }
    }

    const tempUserMsg: MessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: questionText,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setIsLoading(true)

    try {
      const previewRes = await previewQuery(questionText, targetSessionId)

      const assistantMsg: MessageItem = {
        id: previewRes.query_run_id,
        role: 'assistant',
        content: previewRes.interpreted_question,
        previewData: previewRes,
        createdAt: previewRes.created_at,
      }
      setMessages((prev) => [...prev, assistantMsg])
      loadSessions()
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during preview generation.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopySQL = (queryId: string, sql: string) => {
    navigator.clipboard.writeText(sql)
    setCopiedQueryId(queryId)
    setTimeout(() => setCopiedQueryId(null), 2000)
  }

  const handleExecuteQuery = async (previewData: PreviewResponse) => {
    setExecutingId(previewData.query_run_id)
    setErrorMessage(null)
    try {
      const execResult = await executeSavedQuery(previewData.query_run_id)
      setResultsMap((prev) => ({ ...prev, [previewData.query_run_id]: execResult }))
      // Default view mode: chart if pie/bar/metric, else table
      const initialMode =
        execResult.chart_recommendation.chart_type === 'table' ? 'table' : 'chart'
      setViewModeMap((prev) => ({ ...prev, [previewData.query_run_id]: initialMode }))
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute query in read-only transaction.')
    } finally {
      setExecutingId(null)
    }
  }

  const handleFeedbackSubmit = async (queryRunId: string, isHelpful: boolean) => {
    const currentExplanation = feedbackMap[queryRunId]?.explanation || ''
    try {
      await submitQueryFeedback(queryRunId, isHelpful, currentExplanation)
      setFeedbackMap((prev) => ({
        ...prev,
        [queryRunId]: { isHelpful, explanation: currentExplanation, saved: true },
      }))
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`)
    }
  }

  return (
    <div className="ask-data-container">
      {/* Sessions Drawer / Sidebar */}
      <aside className="ask-data-sessions-sidebar">
        <div className="sessions-header">
          <span className="sessions-title">Conversations</span>
          <button className="btn btn-secondary btn-sm" onClick={handleCreateNewSession} title="Start a new query session">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Session
          </button>
        </div>

        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="sessions-empty">No conversations yet. Start one above!</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                onClick={() => selectSession(s.id)}
              >
                <div className="session-item-content">
                  <div className="session-item-title" title={s.title}>
                    {s.title}
                  </div>
                  <div className="session-item-meta">
                    <span>
                      {s.message_count} {s.message_count === 1 ? 'msg' : 'msgs'}
                    </span>
                    <span>•</span>
                    <span>{new Date(s.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  className="session-delete-btn"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  title="Delete conversation"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Conversation & Preview Area */}
      <section className="ask-data-workspace">
        {/* Governance & Status Banner */}
        <div className="ask-data-governance-banner">
          <div className="governance-badge-group">
            <span className="badge badge-warning">
              <span className="live-dot" style={{ backgroundColor: '#f59e0b' }} />
              LLM Mode: Demo (Deterministic Rule Engine)
            </span>
            <span className="badge badge-neutral">Synthetic Data Only (5,000 Assets)</span>
            <span className="badge badge-success">SQLGlot AST Guard Active</span>
            <span className="badge badge-primary">SELECT-Only Reader Enforced</span>
          </div>
          <div className="governance-notice-text">
            Natural-language requests generate read-only SQL previews. SQL is never executed directly from the prompt.
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="security-alert-box alert-error" style={{ margin: '0.75rem 1.25rem 0 1.25rem' }}>
            <div className="alert-title">Execution Error</div>
            <div className="alert-desc">{errorMessage}</div>
          </div>
        )}

        {/* Messages & Feed */}
        <div className="ask-data-feed">
          {messages.length === 0 ? (
            <div className="ask-data-hero">
              <div className="hero-icon-container">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="9" y1="10" x2="15" y2="10" />
                  <line x1="12" y1="7" x2="12" y2="13" />
                </svg>
              </div>
              <h2 className="hero-title">Governed Natural-Language Analytics</h2>
              <p className="hero-subtitle">
                Ask analytical questions about networking devices, warranty horizons, site distributions, and service events.
                Every candidate query undergoes multi-layer SQLGlot AST validation before an opaque preview ID is issued.
              </p>

              {/* Starter Prompt Chips */}
              <div className="starter-prompts-matrix">
                <div className="starter-prompts-label">Try an example inquiry:</div>
                <div className="starter-chips-grid">
                  {STARTER_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      className="starter-chip-card"
                      onClick={() => handleSendQuestion(item.prompt)}
                      disabled={isLoading}
                    >
                      <div className="chip-card-top">
                        <span className={`chip-badge ${item.badgeClass}`}>{item.badge}</span>
                      </div>
                      <div className="chip-card-title">{item.label}</div>
                      <div className="chip-card-prompt">"{item.prompt}"</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-messages-container">
              {messages.map((msg) => {
                const runId = msg.previewData?.query_run_id || msg.id
                const execResult = resultsMap[runId]
                const isExecuting = executingId === runId
                const activeMode = viewModeMap[runId] || 'table'
                const feedbackState = feedbackMap[runId]

                return (
                  <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                    {msg.role === 'user' ? (
                      <div className="user-message-bubble">
                        <div className="message-sender">You</div>
                        <div className="message-text">{msg.content}</div>
                        <div className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ) : (
                      <div className="assistant-preview-card">
                        {/* Card Header */}
                        <div className="preview-card-header">
                          <div className="header-left">
                            <span className="brand-pill">QueryTrust Guard</span>
                            <span className="preview-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="header-right">
                            {msg.previewData?.status === 'previewed' && (
                              <span className="status-tag status-success">
                                <span className="live-dot" /> Preview Validated
                              </span>
                            )}
                            {msg.previewData?.status === 'clarification_needed' && (
                              <span className="status-tag status-warning">⚠️ Clarification Needed</span>
                            )}
                            {msg.previewData?.status === 'unsupported' && (
                              <span className="status-tag status-neutral">⛔ Unsupported Intent</span>
                            )}
                            {msg.previewData?.status === 'blocked' && (
                              <span className="status-tag status-danger">🛡️ AST Safety Blocked</span>
                            )}
                          </div>
                        </div>

                        {/* Interpreted Meaning */}
                        <div className="interpretation-section">
                          <div className="section-label">INTERPRETED QUERY INTENT:</div>
                          <div className="interpretation-text">{msg.content}</div>
                        </div>

                        {/* Clarification Alert (if needed) */}
                        {msg.previewData?.clarification_question && (
                          <div className="clarification-box">
                            <div className="clarification-title">Operator Disambiguation Required:</div>
                            <div className="clarification-prompt">{msg.previewData.clarification_question}</div>
                            <div className="clarification-actions">
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendQuestion('Show devices with warranty expiring in 30 days')}
                              >
                                Option 1: Imminent Warranty Expiry (&lt;30d)
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendQuestion('List open Critical service events')}
                              >
                                Option 2: Open Critical Incidents
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendQuestion('Show offline or maintenance devices')}
                              >
                                Option 3: Offline / Non-Active Status
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Unsupported Alert (if out of bounds) */}
                        {msg.previewData?.intent_status === 'unsupported' && (
                          <div className="unsupported-box">
                            <div className="unsupported-title">Out-of-Domain Concept Detected</div>
                            <p className="unsupported-desc">
                              The requested concept (such as revenue, financial billing, or customer churn) is outside the networking device inventory and operational telemetry schema. QueryTrust AI does not fabricate queries or results for undefined domains.
                            </p>
                          </div>
                        )}

                        {/* AST Violations Alert (if blocked) */}
                        {msg.previewData?.validation.violations && msg.previewData.validation.violations.length > 0 && (
                          <div className="security-alert-box alert-error">
                            <div className="alert-title">SQLGlot AST Security Violations Detected:</div>
                            <ul className="violations-list">
                              {msg.previewData.validation.violations.map((v, i) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* SQL Preview Block */}
                        {msg.previewData?.sql_preview && (
                          <div className="sql-preview-block">
                            <div className="sql-preview-header">
                              <span className="sql-dialect-tag">PostgreSQL (SELECT-Only)</span>
                              <div className="sql-header-actions">
                                <span className="limit-clamped-badge">Max Limit: 200</span>
                                <button
                                  className="copy-btn"
                                  onClick={() =>
                                    handleCopySQL(msg.previewData!.query_run_id, msg.previewData!.sql_preview!)
                                  }
                                  title="Copy SQL statement"
                                >
                                  {copiedQueryId === msg.previewData.query_run_id ? (
                                    <span style={{ color: '#10b981' }}>✓ Copied</span>
                                  ) : (
                                    'Copy SQL'
                                  )}
                                </button>
                              </div>
                            </div>
                            <pre className="sql-code-box">
                              <code>{msg.previewData.sql_preview}</code>
                            </pre>
                          </div>
                        )}

                        {/* AST Security Checklist */}
                        {msg.previewData && (
                          <div className="security-checklist-grid">
                            <div className="checklist-item">
                              <span className="check-icon">{msg.previewData.validation.passed ? '✅' : '❌'}</span>
                              <span className="check-label">Single Statement AST</span>
                            </div>
                            <div className="checklist-item">
                              <span className="check-icon">{msg.previewData.status === 'blocked' ? '❌' : '✅'}</span>
                              <span className="check-label">Read-Only SELECT</span>
                            </div>
                            <div className="checklist-item">
                              <span className="check-icon">✅</span>
                              <span className="check-label">
                                Table Allowlist ({msg.previewData.validation.tables_referenced.join(', ') || 'verified'})
                              </span>
                            </div>
                            <div className="checklist-item">
                              <span className="check-icon">✅</span>
                              <span className="check-label">Row Clamping Active</span>
                            </div>
                          </div>
                        )}

                        {/* Assumptions */}
                        {msg.previewData && msg.previewData.assumptions.length > 0 && (
                          <div className="assumptions-container">
                            <span className="assumptions-title">Semantic Catalog Assumptions:</span>
                            <ul className="assumptions-list">
                              {msg.previewData.assumptions.map((asm, idx) => (
                                <li key={idx}>{asm}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Footer (Execute button) */}
                        {msg.previewData && !execResult && (
                          <div className="preview-action-footer">
                            <div className="footer-meta">
                              <span className="run-id-label">Preview ID:</span>
                              <code className="run-id-code">{msg.previewData.query_run_id}</code>
                            </div>
                            <button
                              className={`btn ${msg.previewData.can_execute ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                              onClick={() => handleExecuteQuery(msg.previewData!)}
                              disabled={!msg.previewData.can_execute || isExecuting}
                              title={
                                msg.previewData.can_execute
                                  ? 'Execute query in read-only transaction'
                                  : 'Query cannot be executed'
                              }
                            >
                              {isExecuting ? (
                                <>
                                  <div className="btn-spinner" /> Executing via Reader Role...
                                </>
                              ) : (
                                <>
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                  Execute Candidate Query
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* ==============================================================
                            MILIESTONE 4: LIVE QUERY EXECUTION RESULTS CONTAINER
                            ============================================================== */}
                        {execResult && (
                          <div className="execution-result-card">
                            <div className="result-card-header">
                              <div className="result-header-left">
                                <span className="status-tag status-success">
                                  <span className="live-dot" /> Read-Only Executed
                                </span>
                                <span className="result-metric-pill">
                                  ⚡ {execResult.execution_duration_ms} ms
                                </span>
                                <span className="result-metric-pill">
                                  📋 {execResult.row_count} {execResult.row_count === 1 ? 'row' : 'rows'}
                                </span>
                                {execResult.truncated && (
                                  <span className="badge badge-warning">Max Limit Reached</span>
                                )}
                              </div>
                              <div className="result-header-right">
                                <div className="view-mode-toggle">
                                  <button
                                    className={`toggle-btn ${activeMode === 'table' ? 'active' : ''}`}
                                    onClick={() => setViewModeMap((p) => ({ ...p, [runId]: 'table' }))}
                                  >
                                    Table
                                  </button>
                                  <button
                                    className={`toggle-btn ${activeMode === 'chart' ? 'active' : ''}`}
                                    onClick={() => setViewModeMap((p) => ({ ...p, [runId]: 'chart' }))}
                                  >
                                    {execResult.chart_recommendation.chart_type.toUpperCase()} Chart
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Result Summary Bar */}
                            <div className="result-summary-box">{execResult.result_summary}</div>

                            {/* View Mode: Chart */}
                            {activeMode === 'chart' && (
                              <div className="result-visualization-area">
                                <VisualChart result={execResult} />
                              </div>
                            )}

                            {/* View Mode: Table */}
                            {activeMode === 'table' && (
                              <div className="result-table-wrapper">
                                <table className="result-data-table">
                                  <thead>
                                    <tr>
                                      {execResult.columns.map((col) => (
                                        <th key={col}>{col.replace('_', ' ').toUpperCase()}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {execResult.rows.map((row, rIdx) => (
                                      <tr key={rIdx}>
                                        {execResult.columns.map((col) => (
                                          <td key={col}>{row[col] !== null ? String(row[col]) : '—'}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Feedback Section */}
                            <div className="feedback-subcard">
                              <div className="feedback-header">
                                <span className="feedback-label">Was this query and result accurate?</span>
                                {feedbackState?.saved && (
                                  <span className="badge badge-success">
                                    ✓ Feedback saved ({feedbackState.isHelpful ? 'Helpful' : 'Needs Improvement'})
                                  </span>
                                )}
                              </div>
                              <div className="feedback-actions">
                                <button
                                  className={`feedback-btn ${feedbackState?.isHelpful === true ? 'active-helpful' : ''}`}
                                  onClick={() => handleFeedbackSubmit(runId, true)}
                                >
                                  👍 Helpful
                                </button>
                                <button
                                  className={`feedback-btn ${feedbackState?.isHelpful === false ? 'active-unhelpful' : ''}`}
                                  onClick={() => handleFeedbackSubmit(runId, false)}
                                >
                                  👎 Needs Improvement
                                </button>
                                <input
                                  type="text"
                                  className="feedback-notes-input"
                                  placeholder="Optional feedback explanation..."
                                  value={feedbackState?.explanation || ''}
                                  onChange={(e) =>
                                    setFeedbackMap((p) => ({
                                      ...p,
                                      [runId]: {
                                        isHelpful: p[runId]?.isHelpful ?? true,
                                        explanation: e.target.value,
                                        saved: false,
                                      },
                                    }))
                                  }
                                />
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleFeedbackSubmit(runId, feedbackState?.isHelpful ?? true)}
                                >
                                  Save Feedback
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Parsing Loading State */}
              {isLoading && (
                <div className="chat-message-row assistant">
                  <div className="assistant-preview-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>
                      Translating question & parsing PostgreSQL AST safety invariants...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Query Input Box */}
        <div className="ask-data-input-dock">
          <form
            className="input-form-wrapper"
            onSubmit={(e) => {
              e.preventDefault()
              handleSendQuestion()
            }}
          >
            <textarea
              className="query-textarea"
              placeholder="Ask an analytical question in plain English (e.g. 'How many active devices are in each region?')..."
              rows={2}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendQuestion()
                }
              }}
              disabled={isLoading}
            />
            <div className="input-actions-bar">
              <span className="input-hint-text">
                Press <kbd>Enter ↵</kbd> to generate preview. <kbd>Shift+Enter</kbd> for new line. Preview is strictly read-only.
              </span>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!inputQuestion.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="btn-spinner" /> Validating AST...
                  </>
                ) : (
                  <>
                    <span>Generate Preview</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
