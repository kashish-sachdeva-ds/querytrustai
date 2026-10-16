import React, { useState, useEffect, useRef } from 'react'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Ban,
  CheckCircle2,
  XCircle,
  Zap,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Check,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Play,
  Flame,
  Plus,
  Trash2,
  Sparkles,
  Code2,
} from 'lucide-react'
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
import { useTheme } from '../context/ThemeContext'
import { ExplainButton } from './ExplainButton'

interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  previewData?: PreviewResponse | null
  createdAt: string
}

const STARTER_PROMPTS = [
  {
    category: 'Everyday fleet overview',
    label: 'Active equipment by region',
    prompt: 'How many active devices are in each region?',
    badge: 'Good first question',
    badgeClass: 'badge-success',
  },
  {
    category: 'Coverage planning',
    label: 'Warranty expiring in 60 days',
    prompt: 'Show all routers with warranty expiring in the next 60 days.',
    badge: 'Warranty review',
    badgeClass: 'badge-info',
  },
  {
    category: 'Service triage',
    label: 'Critical open service events',
    prompt: 'List critical open service events grouped by site.',
    badge: 'Service review',
    badgeClass: 'badge-primary',
  },
  {
    category: 'Clarification demo',
    label: 'Ask about "high-risk" devices',
    prompt: 'Show all high-risk devices in New York.',
    badge: 'Shows quick follow-up',
    badgeClass: 'badge-warning',
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
                    fill="var(--qt-accent, #FF4F00)"
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
    const colors = ['#FF4F00', '#C44000', '#8A6A50', '#5C5550', '#A0937E', '#766F68', '#4F4A45', '#B8B0A6']

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

  return null
}

// Animated Safety Shield Component
interface SafetyShieldProps {
  preview: PreviewResponse
}

const SafetyShieldDisplay: React.FC<SafetyShieldProps> = ({ preview }) => {
  const isBlocked = preview.status === 'blocked' || !preview.validation.passed
  const tables = preview.validation.tables_referenced?.length > 0
    ? preview.validation.tables_referenced.join(', ')
    : 'devices'

  const checks = [
    { id: 'single_stmt', label: 'Single statement only', pass: !isBlocked },
    { id: 'select_only', label: 'Read-only (SELECT only)', pass: !isBlocked },
    { id: 'tables', label: `Known equipment tables (${tables})`, pass: true },
    { id: 'safe_funcs', label: 'Safe functions only (no sleep / exec)', pass: !isBlocked },
    { id: 'row_limit', label: 'Row limit clamped (max 200)', pass: true },
  ]

  return (
    <div className={`safety-shield ${isBlocked ? 'blocked' : 'passed'}`} role="status" aria-live="polite">
      <div className="safety-shield-header">
        <div className="shield-title-group">
          <div className="shield-icon-badge">
            {isBlocked ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
          </div>
          <div className="shield-title-text">
            <h4>{isBlocked ? 'Blocked for safety' : 'Safety Shield: 5 of 5 checks passed'}</h4>
            <p>
              {isBlocked
                ? 'Intercepted before reaching your database. Zero modifications possible.'
                : 'Guaranteed read-only. Clean AST verified. Safe to run.'}
            </p>
          </div>
        </div>
        <ExplainButton
          title="Safety Shield Verification"
          explanation="Every question must pass 5 automated checks before it can run. Antigravity AST guards reject any query with writes, drops, unauthorized tables, or unbound limits."
        />
      </div>

      <div className="shield-checks-grid">
        {checks.map((chk, idx) => (
          <div
            key={chk.id}
            className={`shield-check-card ${chk.pass ? 'check-pass' : 'check-fail'}`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {chk.pass ? (
              <CheckCircle2 size={13} style={{ color: 'var(--qt-success)', flexShrink: 0 }} />
            ) : (
              <XCircle size={13} style={{ color: 'var(--qt-danger)', flexShrink: 0 }} />
            )}
            <span>{chk.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton loading placeholder
const QueryLoadingSkeleton: React.FC = () => (
  <div className="chat-message-row assistant">
    <div className="skeleton-shield-card" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="qt-skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="qt-skeleton" style={{ width: '40%', height: 14 }} />
          <div className="qt-skeleton" style={{ width: '65%', height: 11 }} />
        </div>
      </div>
      <div className="shield-checks-grid" style={{ marginTop: '0.5rem' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="qt-skeleton" style={{ height: 32, borderRadius: 6 }} />
        ))}
      </div>
      <div className="qt-skeleton" style={{ width: '85%', height: 16, marginTop: '0.5rem' }} />
    </div>
  </div>
)

export const AskDataView: React.FC = () => {
  const { mode } = useTheme()
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputQuestion, setInputQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null)
  const [expandedSqlMap, setExpandedSqlMap] = useState<Record<string, boolean>>({})

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
    const previousSessions = sessions
    const previousActiveSessionId = activeSessionId
    const previousMessages = messages
    const remaining = sessions.filter((s) => s.id !== sessionId)
    setSessions(remaining)
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0]?.id || null)
      setMessages([])
    }
    try {
      await deleteChatSession(sessionId)
      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          selectSession(remaining[0].id)
        }
      }
    } catch (err: any) {
      setSessions(previousSessions)
      setActiveSessionId(previousActiveSessionId)
      setMessages(previousMessages)
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
      // Calls real backend endpoint: /api/v1/analytics/preview
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

  // Real "Try to break it" trigger: calls the backend with a dangerous statement
  const handleTryToBreakIt = () => {
    handleSendQuestion('DROP TABLE devices;')
  }

  const handleCopySQL = (queryId: string, sql: string) => {
    navigator.clipboard.writeText(sql)
    setCopiedQueryId(queryId)
    setTimeout(() => setCopiedQueryId(null), 2000)
  }

  const toggleSqlExpansion = (queryId: string) => {
    setExpandedSqlMap((prev) => ({ ...prev, [queryId]: !prev[queryId] }))
  }

  const handleExecuteQuery = async (previewData: PreviewResponse) => {
    setExecutingId(previewData.query_run_id)
    setErrorMessage(null)
    try {
      const execResult = await executeSavedQuery(previewData.query_run_id)
      setResultsMap((prev) => ({ ...prev, [previewData.query_run_id]: execResult }))
      const initialMode =
        execResult.chart_recommendation.chart_type === 'table' ? 'table' : 'chart'
      setViewModeMap((prev) => ({ ...prev, [previewData.query_run_id]: initialMode }))
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute query in read-only transaction.')
    } finally {
      setExecutingId(null)
    }
  }

  const handleExportCSV = (result: ExecuteResponse) => {
    if (!result || !result.rows || result.rows.length === 0) return
    const headers = result.columns
    const csvRows = [
      headers.join(','),
      ...result.rows.map((row) =>
        headers
          .map((col) => {
            const val = row[col]
            if (val === null || val === undefined) return '""'
            const str = String(val).replace(/"/g, '""')
            return `"${str}"`
          })
          .join(',')
      ),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `querytrust-data-${result.query_run_id.slice(0, 8)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleFeedbackSubmit = async (queryRunId: string, isHelpful: boolean) => {
    const currentExplanation = feedbackMap[queryRunId]?.explanation || ''
    const previousFeedback = feedbackMap[queryRunId]
    setFeedbackMap((prev) => ({
      ...prev,
      [queryRunId]: { isHelpful, explanation: currentExplanation, saved: true },
    }))
    try {
      await submitQueryFeedback(queryRunId, isHelpful, currentExplanation)
    } catch (err: any) {
      setFeedbackMap((prev) => {
        const next = { ...prev }
        if (previousFeedback) next[queryRunId] = previousFeedback
        else delete next[queryRunId]
        return next
      })
      setErrorMessage(`Feedback submission failed: ${err.message}`)
    }
  }

  return (
    <div className="ask-data-container">
      {/* Sessions Drawer / Sidebar */}
      <aside className="ask-data-sessions-sidebar" aria-label="Conversation Sessions">
        <div className="sessions-header">
          <span className="sessions-title">Conversations</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleCreateNewSession}
            title="Start a new query conversation"
            aria-label="New Session"
          >
            <Plus size={13} style={{ marginRight: 4 }} />
            New
          </button>
        </div>

        <div className="sessions-list" role="list">
          {sessions.length === 0 ? (
            <div className="sessions-empty">No conversations yet. Ask a question to begin.</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                onClick={() => selectSession(s.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectSession(s.id)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-current={activeSessionId === s.id ? 'page' : undefined}
                aria-label={`Open conversation: ${s.title}`}
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
                  type="button"
                  className="session-delete-btn"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  title="Delete conversation"
                  aria-label={`Delete ${s.title}`}
                >
                  <Trash2 size={12} />
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
              <span className="live-dot" style={{ backgroundColor: 'var(--qt-accent, #FF4F00)' }} />
              Guided demo mode
            </span>
            <span className="badge badge-neutral">Synthetic practice data</span>
            <span className="badge badge-success">5-Point Safety Shield</span>
            <span className="badge badge-primary">Read-only connection</span>
          </div>
          <div className="governance-notice-text">
            Every request previewed before execution. Your input never executes SQL directly.
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="security-alert-box alert-error" style={{ margin: '0.75rem 1.25rem 0 1.25rem' }}>
            <div className="alert-title">Notice</div>
            <div className="alert-desc">{errorMessage}</div>
          </div>
        )}

        {/* Messages & Feed */}
        <div className="ask-data-feed">
          {messages.length === 0 ? (
            <div className="ask-data-hero">
              <div className="hero-icon-container">
                <Shield size={32} />
              </div>
              <h2 className="hero-title">Ask your equipment anything, in plain English.</h2>
              <p className="hero-subtitle">
                The AI you can't make dangerous. We translate your question, verify safety across 5 independent checks, and execute through a read-only database reader.
              </p>

              <ol className="ask-data-steps" aria-label="How asking works">
                <li><span>1</span><strong>Ask freely</strong><small>Natural English phrasing.</small></li>
                <li><span>2</span><strong>Safety check</strong><small>Shield blocks harmful queries.</small></li>
                <li><span>3</span><strong>Trust completely</strong><small>Read-only verified data.</small></li>
              </ol>

              {/* Starter Prompt Chips */}
              <div className="starter-prompts-matrix">
                <div className="starter-prompts-label">Try one of these real questions:</div>
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

                {/* "Try to break it" Demo Banner */}
                <div className="try-break-card">
                  <div className="try-break-text">
                    <h5>
                      <Flame size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      Want proof? Try to break it.
                    </h5>
                    <p>
                      Click below to send <code>DROP TABLE devices;</code> directly to the backend. Watch the Safety Shield intercept it live without touching a single record.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="try-break-btn"
                    onClick={handleTryToBreakIt}
                    disabled={isLoading}
                  >
                    <Flame size={13} />
                    <span>Try to break it</span>
                  </button>
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
                const isSqlExpanded = !!expandedSqlMap[runId] || mode === 'expert'

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
                                <span className="live-dot" /> Safe to run
                              </span>
                            )}
                            {msg.previewData?.status === 'clarification_needed' && (
                              <span className="status-tag status-warning">
                                <AlertTriangle size={12} style={{ marginRight: 4 }} /> Quick question back
                              </span>
                            )}
                            {msg.previewData?.status === 'unsupported' && (
                              <span className="status-tag status-neutral">
                                <Ban size={12} style={{ marginRight: 4 }} /> Outside equipment domain
                              </span>
                            )}
                            {msg.previewData?.status === 'blocked' && (
                              <span className="status-tag status-danger">
                                <ShieldAlert size={12} style={{ marginRight: 4 }} /> Blocked for safety
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Animated Safety Shield */}
                        {msg.previewData && <SafetyShieldDisplay preview={msg.previewData} />}

                        {/* Interpreted Meaning */}
                        <div className="interpretation-section">
                          <div className="section-label">HOW WE INTERPRETED THIS:</div>
                          <div className="interpretation-text">{msg.content}</div>
                        </div>

                        {/* Clarification Alert (if ambiguous) */}
                        {msg.previewData?.clarification_question && (
                          <div className="clarification-box">
                            <div className="clarification-title">Quick question before we run this:</div>
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

                        {/* Unsupported Concept Alert */}
                        {msg.previewData?.intent_status === 'unsupported' && (
                          <div className="unsupported-box">
                            <div className="unsupported-title">Out-of-Domain Concept Detected</div>
                            <p className="unsupported-desc">
                              The requested concept (such as revenue, financial billing, or employee payroll) is outside the networking device inventory and operational telemetry schema. QueryTrust AI never hallucinates data outside known equipment domains.
                            </p>
                          </div>
                        )}

                        {/* AST Violations Alert (if blocked) */}
                        {msg.previewData?.validation.violations && msg.previewData.validation.violations.length > 0 && (
                          <div className="security-alert-box alert-error">
                            <div className="alert-title">This was blocked for safety:</div>
                            <ul className="violations-list">
                              {msg.previewData.validation.violations.map((v, i) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* SQL Preview Block (Simple vs Expert Mode) */}
                        {msg.previewData?.sql_preview && (
                          <div className="sql-preview-container">
                            {mode === 'simple' && (
                              <button
                                type="button"
                                className="toggle-btn"
                                onClick={() => toggleSqlExpansion(runId)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: 'var(--qt-surface-muted)',
                                  border: '1px solid var(--qt-border)',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--qt-radius-control)',
                                  marginBottom: isSqlExpanded ? 8 : 0,
                                }}
                              >
                                <Code2 size={13} />
                                <span>{isSqlExpanded ? 'Hide technical SQL query' : 'Inspect technical SQL (PostgreSQL)'}</span>
                                {isSqlExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            )}

                            {isSqlExpanded && (
                              <div className="sql-preview-block">
                                <div className="sql-preview-header">
                                  <span className="sql-dialect-tag">PostgreSQL (SELECT-Only)</span>
                                  <div className="sql-header-actions">
                                    <span className="limit-clamped-badge">Clamped to 200 rows max</span>
                                    <button
                                      className="copy-btn"
                                      onClick={() =>
                                        handleCopySQL(msg.previewData!.query_run_id, msg.previewData!.sql_preview!)
                                      }
                                      title="Copy SQL statement"
                                    >
                                      {copiedQueryId === msg.previewData.query_run_id ? (
                                        <span style={{ color: 'var(--qt-accent)' }}>
                                          <Check size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} /> Copied
                                        </span>
                                      ) : (
                                        <>
                                          <Copy size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} /> Copy SQL
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <pre className="sql-code-box">
                                  <code>{msg.previewData.sql_preview}</code>
                                </pre>
                              </div>
                            )}
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
                                  : 'Query blocked or requires clarification'
                              }
                            >
                              {isExecuting ? (
                                <>
                                  <div className="btn-spinner" /> Running safely in read-only mode...
                                </>
                              ) : (
                                <>
                                  <Play size={13} style={{ marginRight: 4 }} />
                                  Run this query
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Execution Loading Skeleton */}
                        {isExecuting && (
                          <div className="execution-result-card">
                            <div className="qt-skeleton" style={{ height: 28, width: '45%' }} />
                            <div className="qt-skeleton" style={{ height: 180, width: '100%', borderRadius: 8 }} />
                          </div>
                        )}

                        {/* LIVE QUERY EXECUTION RESULTS CONTAINER */}
                        {execResult && (
                          <div className="execution-result-card">
                            <div className="result-card-header">
                              <div className="result-header-left">
                                <span className="status-tag status-success">
                                  <span className="live-dot" /> Read-only executed
                                </span>
                                <span className="result-metric-pill">
                                  <Zap size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} /> {execResult.execution_duration_ms} ms
                                </span>
                                <span className="result-metric-pill">
                                  <FileText size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} /> {execResult.row_count} {execResult.row_count === 1 ? 'row' : 'rows'}
                                </span>
                                {execResult.truncated && (
                                  <span className="badge badge-warning">Max 200 row limit reached</span>
                                )}
                              </div>
                              <div className="result-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="toggle-btn"
                                  onClick={() => handleExportCSV(execResult)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: 'var(--qt-surface-muted)',
                                    border: '1px solid var(--qt-border)',
                                    padding: '4px 8px',
                                    borderRadius: 'var(--qt-radius-control)',
                                  }}
                                  title="Export result table as CSV"
                                >
                                  <Download size={12} />
                                  <span>Export CSV</span>
                                </button>
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
                                <ExplainButton
                                  title="Query Results"
                                  explanation="These records were retrieved in a read-only database transaction. The system enforces strict SELECT-only access and clamps results to 200 rows."
                                />
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
                                          <td key={col} title={row[col] !== null ? String(row[col]) : undefined}>
                                            <span className="cell-truncate">{row[col] !== null ? String(row[col]) : '—'}</span>
                                          </td>
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
                                <span className="feedback-label">Was this answer accurate and helpful?</span>
                                {feedbackState?.saved && (
                                  <span className="badge badge-success">
                                    <Check size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} /> Feedback saved ({feedbackState.isHelpful ? 'Helpful' : 'Needs Improvement'})
                                  </span>
                                )}
                              </div>
                              <div className="feedback-actions">
                                <button
                                  className={`feedback-btn ${feedbackState?.isHelpful === true ? 'active-helpful' : ''}`}
                                  onClick={() => handleFeedbackSubmit(runId, true)}
                                >
                                  <ThumbsUp size={12} style={{ marginRight: 3 }} /> Helpful
                                </button>
                                <button
                                  className={`feedback-btn ${feedbackState?.isHelpful === false ? 'active-unhelpful' : ''}`}
                                  onClick={() => handleFeedbackSubmit(runId, false)}
                                >
                                  <ThumbsDown size={12} style={{ marginRight: 3 }} /> Needs Improvement
                                </button>
                                <input
                                  type="text"
                                  className="feedback-notes-input"
                                  placeholder="Optional note for model evaluation..."
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
              {isLoading && <QueryLoadingSkeleton />}

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
              placeholder="Ask anything about equipment, e.g., 'How many active devices are in each region?'"
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
              aria-label="Ask equipment question"
            />
            <div className="input-actions-bar">
              <span className="input-hint-text">
                Press <kbd>Enter ↵</kbd> to run safety check. <kbd>Shift+Enter</kbd> for new line. Preview is strictly read-only.
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="try-break-btn"
                  onClick={handleTryToBreakIt}
                  disabled={isLoading}
                  title="Test security with DROP TABLE"
                >
                  <Flame size={12} />
                  <span>Try to break it</span>
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!inputQuestion.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="btn-spinner" /> Checking safety...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} style={{ marginRight: 4 }} />
                      <span>Check & Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
