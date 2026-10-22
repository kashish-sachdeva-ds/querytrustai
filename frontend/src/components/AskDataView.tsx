import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Check,
  Copy,
  Download,
  Play,
  Flame,
  Plus,
  Trash2,
  Sparkles,
  Code2,
  Search,
  BarChart3,
  PieChart,
  Table as TableIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
} from 'lucide-react'
import {
  previewQuery,
  executeSavedQuery,
  submitQueryFeedback,
  fetchChatSessions,
  createChatSession,
  fetchSessionMessages,
  deleteChatSession,
  fetchActiveDataSource,
  type PreviewResponse,
  type ExecuteResponse,
  type ChatSessionSummary,
  type ChatMessage,
  type ActiveDataSourceResponse,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ExplainButton } from './ExplainButton'
import { HumanDate } from './HumanDate'
import { AstSafetyStepper } from './AstSafetyStepper'
import { useWorkbenchStore } from '../store/workbenchStore'
import './AskDataView.css'

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

// Accessible, balanced categorical palette (ThoughtSpot / Datadog inspired)
const DONUT_PALETTE = [
  '#475569', // slate 600
  '#0d9488', // teal 600
  '#6366f1', // indigo 500
  '#d97706', // amber 600
  '#0284c7', // sky 600
  '#8b5cf6', // violet 500
  '#64748b', // slate 500
  '#a1a1aa', // zinc 400
]

// Developer-grade SQL syntax highlighter (Pure React, zero external dependencies)
const HighlightedSql: React.FC<{ sql: string }> = ({ sql }) => {
  const tokens = useMemo(() => {
    if (!sql) return []
    const tokenRegex =
      /('(?:''|[^'])*'|\b(?:SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|ON|AS|AND|OR|NOT|IN|IS|NULL|LIKE|ILIKE|BETWEEN|CASE|WHEN|THEN|ELSE|END|DISTINCT|HAVING|ASC|DESC|UNION|ALL)\b|\b(?:COUNT|SUM|AVG|MIN|MAX|DATE_TRUNC|COALESCE|ROUND|NOW)\b|\b\d+(?:\.\d+)?\b|[().,;*:=<>!+-]+|[a-zA-Z_][a-zA-Z0-9_]*|\s+)/gi

    const matched = sql.match(tokenRegex) || [sql]
    return matched.map((token, idx) => {
      const upper = token.toUpperCase()
      if (/^'.*'$/.test(token)) {
        return (
          <span key={idx} className="sql-token-string">
            {token}
          </span>
        )
      }
      if (
        /^(SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|ON|AS|AND|OR|NOT|IN|IS|NULL|LIKE|ILIKE|BETWEEN|CASE|WHEN|THEN|ELSE|END|DISTINCT|HAVING|ASC|DESC|UNION|ALL)$/i.test(
          upper
        )
      ) {
        return (
          <span key={idx} className="sql-token-keyword">
            {token}
          </span>
        )
      }
      if (/^(COUNT|SUM|AVG|MIN|MAX|DATE_TRUNC|COALESCE|ROUND|NOW)$/i.test(upper)) {
        return (
          <span key={idx} className="sql-token-function">
            {token}
          </span>
        )
      }
      if (/^\d+(?:\.\d+)?$/.test(token)) {
        return (
          <span key={idx} className="sql-token-number">
            {token}
          </span>
        )
      }
      if (/^[().,;*:=<>!+-]+$/.test(token)) {
        return (
          <span key={idx} className="sql-token-punct">
            {token}
          </span>
        )
      }
      return (
        <span key={idx} className="sql-token-ident">
          {token}
        </span>
      )
    })
  }, [sql])

  return <code>{tokens}</code>
}

// Visual Chart Component (Strict Invariant: Neutral Data Bars, No Orange Monochrome)
const MetricChart: React.FC<{ result: ExecuteResponse }> = ({ result }) => {
  const { chart_recommendation: rec, rows, columns } = result
  const rawVal = rows[0][columns[0]]
  const displayVal =
    typeof rawVal === 'number'
      ? rawVal.toLocaleString()
      : String(rawVal ?? '0')

  return (
    <div className="metric-chart-container">
      <div className="metric-chart-label">{rec.title || columns[0].replace(/_/g, ' ')}</div>
      <div className="metric-chart-value">{displayVal}</div>
      <div className="metric-chart-sub">Read-only verified aggregate metric</div>
    </div>
  )
}

const CategoricalChart: React.FC<{ result: ExecuteResponse }> = ({ result }) => {
  const { chart_recommendation: rec, rows, columns } = result

  // Check if dataset is a 2-column pre-aggregated distribution (e.g. region + count)
  const isTwoColAggregate = useMemo(() => {
    if (columns.length !== 2) return false
    const val0 = rows[0]?.[columns[0]]
    const val1 = rows[0]?.[columns[1]]
    const isNum0 = typeof val0 === 'number' || (!isNaN(Number(val0)) && val0 !== '' && val0 !== null)
    const isNum1 = typeof val1 === 'number' || (!isNaN(Number(val1)) && val1 !== '' && val1 !== null)
    return (isNum0 && !isNum1) || (!isNum0 && isNum1)
  }, [columns, rows])

  // Detect candidate categorical dimensions across columns for multi-attribute tables
  const candidateDimensions = useMemo(() => {
    if (isTwoColAggregate) return []
    return columns.filter((col) => {
      const lower = col.toLowerCase()
      // Skip IDs and UUIDs
      if (lower === 'id' || lower.endsWith('_id') || lower === 'uuid') return false

      const distinct = new Set<string>()
      for (const r of rows) {
        const v = r[col]
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          distinct.add(String(v).trim())
        }
        if (distinct.size > 35) return false // Too broad for a clean categorical breakdown
      }
      return distinct.size >= 2
    })
  }, [columns, rows, isTwoColAggregate])

  // Determine initial/default dimension
  const defaultDimension = useMemo(() => {
    if (rec.x_axis && candidateDimensions.includes(rec.x_axis)) {
      return rec.x_axis
    }
    const priority = ['device_type', 'region', 'status', 'severity', 'site_name', 'model', 'vendor']
    for (const p of priority) {
      const match = candidateDimensions.find((c) => c.toLowerCase() === p)
      if (match) return match
    }
    return candidateDimensions[0] || ''
  }, [candidateDimensions, rec.x_axis])

  const [selectedDimension, setSelectedDimension] = useState<string>(defaultDimension)
  const [chartType, setChartType] = useState<'bar' | 'pie'>(rec.chart_type === 'pie' ? 'pie' : 'bar')

  useEffect(() => {
    if (defaultDimension && (!selectedDimension || !candidateDimensions.includes(selectedDimension))) {
      setSelectedDimension(defaultDimension)
    }
  }, [defaultDimension, candidateDimensions, selectedDimension])

  // Prepare chart items
  const chartItems = useMemo(() => {
    if (isTwoColAggregate) {
      const val0 = rows[0]?.[columns[0]]
      const isNum0 = typeof val0 === 'number' || (!isNaN(Number(val0)) && val0 !== '' && val0 !== null)
      const catCol = isNum0 ? columns[1] : columns[0]
      const numCol = isNum0 ? columns[0] : columns[1]

      return rows.map((r) => {
        const rawNum = Number(r[numCol])
        return {
          label: String(r[catCol] ?? 'Unknown'),
          value: isNaN(rawNum) ? 0 : rawNum,
        }
      })
    }

    if (!selectedDimension) return []

    // Aggregate counts by selected dimension
    const counts: Record<string, number> = {}
    for (const r of rows) {
      const key = String(r[selectedDimension] ?? 'Unknown').trim() || 'Unknown'
      counts[key] = (counts[key] || 0) + 1
    }

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [isTwoColAggregate, columns, rows, selectedDimension])

  // Title & Subtitle computation
  const title = useMemo(() => {
    if (isTwoColAggregate && rec.title) return rec.title
    if (selectedDimension) {
      return `Distribution by ${selectedDimension.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`
    }
    return rec.title || 'Data Visualization'
  }, [isTwoColAggregate, rec.title, selectedDimension])

  const subtitle = useMemo(() => {
    if (isTwoColAggregate) {
      const sum = chartItems.reduce((acc, c) => acc + c.value, 0)
      return `${chartItems.length} categories (${sum.toLocaleString()} total)`
    }
    if (selectedDimension) {
      return `Aggregated from ${rows.length} records across ${chartItems.length} ${selectedDimension.replace(/_/g, ' ')} categories`
    }
    return null
  }, [isTwoColAggregate, chartItems, selectedDimension, rows.length])

  // If no chart items can be computed (e.g. no categories and not 2-col), render summary fallback card
  if (chartItems.length === 0) {
    return (
      <div className="chart-fallback-card">
        <div className="chart-fallback-badge">
          <FileText size={13} />
          <span>Tabular Dataset Overview</span>
        </div>
        <div className="chart-fallback-title">Showing {rows.length} detailed records across {columns.length} attributes</div>
        <div className="chart-fallback-desc">
          This query returned detailed individual items with high uniqueness. Switch to the <strong>Table</strong> tab to inspect, sort, and review individual columns, or use <strong>Export CSV</strong> to save the complete dataset.
        </div>
        <div className="chart-attribute-pills">
          {columns.map((c) => (
            <span key={c} className="chart-attribute-pill">
              {c.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // Display top items for readability (Bar shows up to 16, Donut shows up to 8 + Other)
  const barChartData = chartItems.slice(0, 16)
  const maxVal = Math.max(...barChartData.map((d) => d.value), 1)
  const height = 240
  const barWidth = Math.max(28, Math.min(56, Math.floor(520 / barChartData.length) - 16))
  const totalWidth = Math.max(540, barChartData.length * (barWidth + 24))

  // Donut data preparation
  const donutTop = chartItems.slice(0, 7)
  const donutRemainder = chartItems.slice(7)
  const remainderSum = donutRemainder.reduce((sum, item) => sum + item.value, 0)
  const donutData = remainderSum > 0 ? [...donutTop, { label: 'Other', value: remainderSum }] : donutTop
  const donutTotal = donutData.reduce((acc, curr) => acc + curr.value, 0) || 1

  let accumulatedAngle = 0
  const center = 90
  const radius = 70
  const innerRadius = 45

  const slices = donutData.map((d, idx) => {
    const sliceAngle = (d.value / donutTotal) * 2 * Math.PI
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

    const pct = Math.round((d.value / donutTotal) * 100)
    return { pathData, color: DONUT_PALETTE[idx % DONUT_PALETTE.length], label: d.label, value: d.value, pct }
  })

  return (
    <div className="svg-chart-wrapper">
      {/* Chart Controls: Dimension switcher and Chart style toggle */}
      <div className="chart-controls-toolbar">
        {candidateDimensions.length > 1 ? (
          <div className="chart-dimension-selector">
            <span className="chart-control-label">Group by:</span>
            {candidateDimensions.map((dim) => (
              <button
                key={dim}
                type="button"
                className={`dimension-pill ${selectedDimension === dim ? 'active' : ''}`}
                onClick={() => setSelectedDimension(dim)}
                title={`Group records by ${dim.replace(/_/g, ' ')}`}
              >
                {dim.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}

        <div className="chart-style-toggle" role="group" aria-label="Chart representation">
          <button
            type="button"
            className={`chart-style-btn ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
            title="Display as neutral bar chart"
          >
            <BarChart3 size={13} />
            <span>Bar</span>
          </button>
          <button
            type="button"
            className={`chart-style-btn ${chartType === 'pie' ? 'active' : ''}`}
            onClick={() => setChartType('pie')}
            title="Display as multi-color donut chart"
          >
            <PieChart size={13} />
            <span>Donut</span>
          </button>
        </div>
      </div>

      <div className="chart-title">{title}</div>
      {subtitle && <div className="chart-subtitle">{subtitle}</div>}

      {/* Render Bar Chart */}
      {chartType === 'bar' && (
        <div className="bar-chart-scroll">
          <svg width={totalWidth} height={height} className="svg-chart" role="img" aria-label={title}>
            {/* Subtle baseline */}
            <line
              x1="20"
              y1={height - 38}
              x2={totalWidth - 20}
              y2={height - 38}
              stroke="var(--qt-border)"
              strokeWidth="1"
            />
            {barChartData.map((d, i) => {
              const barHeight = Math.max(4, Math.round((d.value / maxVal) * (height - 75)))
              const x = 30 + i * (barWidth + 24)
              const y = height - 40 - barHeight

              return (
                <g key={i} className="bar-group" tabIndex={0} role="graphics-symbol" aria-label={`${d.label}: ${d.value}`}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    className="svg-neutral-bar"
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
                    {d.label.length > 12 ? d.label.substring(0, 10) + '…' : d.label}
                  </text>
                  <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
                </g>
              )
            })}
          </svg>
        </div>
      )}

      {/* Render Donut Chart */}
      {chartType === 'pie' && (
        <div className="donut-chart-container">
          <svg width="180" height="180" viewBox="0 0 180 180" className="donut-svg" role="img" aria-label={title}>
            {slices.map((s, idx) => (
              <path key={idx} d={s.pathData} fill={s.color} className="donut-slice">
                <title>{`${s.label}: ${s.value.toLocaleString()} (${s.pct}%)`}</title>
              </path>
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
      )}
    </div>
  )
}

const VisualChart: React.FC<{ result: ExecuteResponse }> = ({ result }) => {
  const { chart_recommendation: rec, rows, columns } = result

  if (!rows || rows.length === 0) {
    return <div className="chart-empty">No records available to visualize.</div>
  }

  if (rec.chart_type === 'metric' || (rows.length === 1 && columns.length === 1)) {
    return <MetricChart result={result} />
  }

  return <CategoricalChart result={result} />
}

// 6-Point Safety Shield Sequence Component (ThoughtSpot / Monte Carlo Benchmark)
interface SafetyShieldProps {
  preview: PreviewResponse
}

const SafetyShieldDisplay: React.FC<SafetyShieldProps> = ({ preview }) => {
  const isBlocked = preview.status === 'blocked' || !preview.validation.passed

  return (
    <div style={{ margin: '14px 0' }}>
      <AstSafetyStepper
        isValid={!isBlocked}
        violations={preview.validation.violations || []}
        checksPerformed={{
          single_statement: !isBlocked,
          select_only: !isBlocked,
          table_allowlist: !isBlocked,
          system_catalog_blocked: !isBlocked,
          row_limit_enforced: true,
        }}
        executed={preview.can_execute}
      />
    </div>
  )
}


// Skeleton loading placeholder
const QueryLoadingSkeleton: React.FC = () => (
  <div className="chat-message-row assistant">
    <div className="skeleton-shield-card" style={{ width: '100%', background: 'var(--qt-surface)', border: '1px solid var(--qt-border)', borderRadius: 'var(--qt-radius-inner)', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="qt-skeleton" style={{ width: 34, height: 34, borderRadius: 8 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="qt-skeleton" style={{ width: '35%', height: 14 }} />
          <div className="qt-skeleton" style={{ width: '60%', height: 11 }} />
        </div>
      </div>
      <div className="shield-checks-grid" style={{ marginTop: '1rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="qt-skeleton" style={{ height: 42, borderRadius: 6 }} />
        ))}
      </div>
      <div className="qt-skeleton" style={{ width: '85%', height: 16, marginTop: '1rem' }} />
    </div>
  </div>
)

interface AskDataViewProps {
  initialQuestion?: string | null
}

export const AskDataView: React.FC<AskDataViewProps> = ({ initialQuestion }) => {
  const { user } = useAuth()
  const isDemo = !user?.workspace_name || user.workspace_name === 'Default Workspace' || (user.email ? user.email.endsWith('@querytrust.local') : false)
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputQuestion, setInputQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null)
  const [sessionSearchTerm, setSessionSearchTerm] = useState('')

  const { activeSqlInspectorTab, setActiveSqlInspectorTab } = useWorkbenchStore()
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [resultsMap, setResultsMap] = useState<Record<string, ExecuteResponse>>({})
  const [viewModeMap, setViewModeMap] = useState<Record<string, 'table' | 'chart'>>({})
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, { isHelpful: boolean; explanation: string; saved: boolean }>
  >({})

  // Split-Pane Workbench States
  const [isSessionsCollapsed, setIsSessionsCollapsed] = useState(false)
  const [focusedRunId, setFocusedRunId] = useState<string | null>(null)
  const [activeCanvasTab, setActiveCanvasTab] = useState<'results' | 'sql' | 'safety'>('results')
  const [mobilePane, setMobilePane] = useState<'thread' | 'canvas'>('thread')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Resolve currently focused / latest assistant message and preview
  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].previewData) {
        return messages[i]
      }
    }
    return null
  }, [messages])

  const activeMessage = useMemo(() => {
    if (focusedRunId) {
      const found = messages.find(
        (m) => m.previewData?.query_run_id === focusedRunId || m.id === focusedRunId
      )
      if (found) return found
    }
    return latestAssistantMessage
  }, [focusedRunId, messages, latestAssistantMessage])

  const activePreview = activeMessage?.previewData || null
  const activeRunId = activePreview?.query_run_id || activeMessage?.id || null
  const activeResult = activeRunId ? resultsMap[activeRunId] : null
  const activeMode = (activeRunId && viewModeMap[activeRunId]) || (activeSqlInspectorTab === 'chart' ? 'chart' : 'table')
  const activeFeedback = activeRunId ? feedbackMap[activeRunId] : null

  useEffect(() => {
    if (initialQuestion?.trim()) setInputQuestion(initialQuestion)
  }, [initialQuestion])

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, executingId])

  const [activeSource, setActiveSource] = useState<ActiveDataSourceResponse | null>(null)

  useEffect(() => {
    fetchActiveDataSource()
      .then(setActiveSource)
      .catch(() => {})
  }, [])

  const starterPrompts = useMemo(() => {
    if (activeSource?.mode === 'connected' && activeSource.tables && activeSource.tables.length > 0) {
      const t1 = activeSource.tables[0]
      const t2 = activeSource.tables[1] || t1
      const t3 = activeSource.tables[2] || t1

      return [
        {
          category: 'Sample inspection',
          label: `Sample rows from ${t1}`,
          prompt: `Show the first 10 records from table ${t1}.`,
          badge: 'Explore Table',
          badgeClass: 'badge-success',
        },
        {
          category: 'Record aggregation',
          label: `Total count of ${t2}`,
          prompt: `How many rows are in table ${t2}?`,
          badge: 'Aggregation',
          badgeClass: 'badge-info',
        },
        {
          category: 'Multi-table insights',
          label: `Records in ${t3}`,
          prompt: `Show sample rows and summary from table ${t3}.`,
          badge: 'Data Insights',
          badgeClass: 'badge-primary',
        },
        {
          category: 'Safety check demo',
          label: 'Test safety with injection',
          prompt: `SELECT 1; DROP TABLE ${t1};`,
          badge: 'AST Interception',
          badgeClass: 'badge-warning',
        },
      ]
    }

    if (!isDemo && activeSource?.mode === 'unconfigured') {
      return [
        {
          category: 'Workspace onboarding',
          label: 'Connect organization database',
          prompt: 'How do I connect my company PostgreSQL database to QueryTrust AI?',
          badge: 'Setup Guide',
          badgeClass: 'badge-primary',
        },
        {
          category: 'Security Architecture',
          label: 'How does AST read-only safety work?',
          prompt: 'Explain the 6-layer SQLGlot AST safety checks.',
          badge: 'Security Whitepaper',
          badgeClass: 'badge-success',
        },
      ]
    }

    return STARTER_PROMPTS
  }, [activeSource, isDemo])

  const filteredSessions = useMemo(() => {
    if (!sessionSearchTerm.trim()) return sessions
    const term = sessionSearchTerm.toLowerCase()
    return sessions.filter((s) => s.title.toLowerCase().includes(term))
  }, [sessions, sessionSearchTerm])

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
                checks: ['single_statement', 'select_only', 'table_allowlist', 'schema_allowlist', 'function_allowlist', 'row_limit'],
                violations: m.metadata_json.violations || [],
                warnings: [],
                tables_referenced: ['devices'],
              },
              assumptions: [],
              business_terms_used: [],
              can_execute: m.metadata_json.can_execute || false,
              provider: m.metadata_json.provider || 'demo',
              model: m.metadata_json.model || 'rule-based-engine',
              is_demo_mode: m.metadata_json.is_demo_mode ?? true,
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
      setFocusedRunId(previewRes.query_run_id)
      setActiveCanvasTab('results')
      setMobilePane('canvas')
      loadSessions()
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during preview generation.')
    } finally {
      setIsLoading(false)
    }
  }

  // Real "Try to break it" trigger: calls the backend with a dangerous statement
  const breakQuery =
    activeSource?.mode === 'connected' && activeSource.tables && activeSource.tables.length > 0
      ? `DROP TABLE ${activeSource.tables[0]};`
      : 'DROP TABLE devices;'

  const handleTryToBreakIt = () => {
    handleSendQuestion(breakQuery)
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
      const askedForChart = /chart|graph|plot|visualiz|breakdown|distribution/i.test(
        previewData.interpreted_question || ''
      )
      const initialMode =
        execResult.chart_recommendation.chart_type !== 'table' || askedForChart ? 'chart' : 'table'
      setViewModeMap((prev) => ({ ...prev, [previewData.query_run_id]: initialMode }))
      setFocusedRunId(previewData.query_run_id)
      setActiveCanvasTab('results')
      setMobilePane('canvas')
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute query in read-only transaction.')
    } finally {
      setExecutingId(null)
    }
  }

  // Global Ctrl+Enter shortcut to execute currently validated query
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (activePreview?.can_execute && !executingId && !resultsMap[activePreview.query_run_id]) {
          e.preventDefault()
          handleExecuteQuery(activePreview)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePreview, executingId, resultsMap])

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

  const handleExportJSON = (result: ExecuteResponse) => {
    if (!result || !result.rows || result.rows.length === 0) return
    const blob = new Blob([JSON.stringify(result.rows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `querytrust-data-${result.query_run_id.slice(0, 8)}.json`)
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
      {/* Linear-Style Sessions Drawer */}
      <aside
        className={`ask-data-sessions-sidebar ${isSessionsCollapsed ? 'collapsed' : ''}`}
        aria-label="Conversation Sessions"
      >
        <div className="sessions-header">
          <div className="sessions-header-left">
            <span className="sessions-title">Conversations</span>
            <span className="sessions-count-badge">{sessions.length}</span>
          </div>
          <button
            type="button"
            className="new-session-btn"
            onClick={handleCreateNewSession}
            title="Start a new query conversation"
            aria-label="New Session"
          >
            <Plus size={13} />
            <span>New</span>
          </button>
        </div>

        {sessions.length > 2 && (
          <div className="sessions-filter-box">
            <Search size={12} className="sessions-filter-icon" />
            <input
              type="text"
              className="sessions-filter-input"
              placeholder="Search conversations..."
              value={sessionSearchTerm}
              onChange={(e) => setSessionSearchTerm(e.target.value)}
              aria-label="Filter conversations"
            />
          </div>
        )}

        <ul className="sessions-list" role="list">
          {filteredSessions.length === 0 ? (
            <li className="sessions-empty">
              <span>No conversations found.</span>
              <small>Ask a question to begin a new session.</small>
            </li>
          ) : (
            filteredSessions.map((s) => (
              <li
                key={s.id}
                role="listitem"
                className="session-list-wrapper"
              >
                <button
                  type="button"
                  className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                  onClick={() => selectSession(s.id)}
                  aria-current={activeSessionId === s.id ? 'page' : undefined}
                >
                  <div className="session-item-content">
                    <div className="session-item-title" title={s.title}>
                      {s.title}
                    </div>
                    <div className="session-item-meta">
                      <span className="session-msg-badge">
                        {s.message_count} {s.message_count === 1 ? 'msg' : 'msgs'}
                      </span>
                      <span>•</span>
                      <HumanDate iso={s.updated_at} />
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="session-delete-btn"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  title="Delete conversation"
                  aria-label={`Delete ${s.title}`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      {/* Main Split-Pane Workspace */}
      <section className="ask-data-workspace">
        {/* Governance & Safety Status Bar */}
        <div className="ask-data-governance-banner">
          <div className="governance-badge-group">
            <button
              type="button"
              className="collapse-sessions-btn"
              onClick={() => setIsSessionsCollapsed((p) => !p)}
              title={isSessionsCollapsed ? 'Expand conversations drawer' : 'Collapse conversations drawer'}
            >
              {isSessionsCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
              <span>{isSessionsCollapsed ? 'Conversations' : 'Collapse'}</span>
            </button>
            <span className="badge badge-warning">
              <span className="live-dot" style={{ backgroundColor: 'var(--qt-accent, #FF4F00)' }} />
              Guided demo mode
            </span>
            <span className="badge badge-neutral">Demo inventory</span>
            <span className="badge badge-success">6-layer AST guardrails</span>
            <span className="badge badge-primary">Read-only connection</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="split-mobile-toggle">
              <button
                type="button"
                className={`split-mobile-btn ${mobilePane === 'thread' ? 'active' : ''}`}
                onClick={() => setMobilePane('thread')}
              >
                Questions
              </button>
              <button
                type="button"
                className={`split-mobile-btn ${mobilePane === 'canvas' ? 'active' : ''}`}
                onClick={() => setMobilePane('canvas')}
              >
                Data Canvas
              </button>
            </div>
            <div className="governance-notice-text">
              <span>Split-Pane Analytics Canvas &bull; Guaranteed read-only</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="security-alert-box alert-error" style={{ margin: '0.5rem 1rem 0' }}>
            <div className="alert-title">Notice</div>
            <div className="alert-desc">{errorMessage}</div>
          </div>
        )}

        {/* Split-Pane Wrapper */}
        <div className="ask-split-pane-wrapper">
          {/* LEFT: Conversation Thread & Input */}
          <div
            className="ask-thread-pane"
            style={{ display: mobilePane === 'canvas' ? undefined : undefined }}
          >
            <div className="thread-feed">
              {messages.length === 0 ? (
                <div className="thread-empty-state">
                  <div className="ask-hero-badge">
                    <Sparkles size={13} />
                    <span>AI SQL Translation with 6-Layer AST Guardrails</span>
                  </div>
                  <h3 className="thread-empty-title">Ask your equipment anything</h3>
                  <p className="thread-empty-sub">
                    Enter any natural English question. The safety shield validates the SQL before executing strictly via a read-only PostgreSQL role.
                  </p>
                  <div className="starter-chips-compact-grid">
                    {starterPrompts.map((item, idx) => (
                      <button
                        key={idx}
                        className="starter-chip-compact"
                        onClick={() => handleSendQuestion(item.prompt)}
                        disabled={isLoading}
                      >
                        <span className={`chip-badge ${item.badgeClass}`}>{item.badge}</span>
                        <span className="chip-prompt-text">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Try to break it Banner */}
                  <div className="try-break-card" style={{ marginTop: '0.75rem' }}>
                    <div className="try-break-text">
                      <h5 style={{ margin: 0, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Flame size={13} style={{ color: '#dc2626' }} />
                        Test security live
                      </h5>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--qt-muted)' }}>
                        Send <code>{breakQuery}</code> to test AST interception.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="try-break-btn"
                      onClick={handleTryToBreakIt}
                      disabled={isLoading}
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                    >
                      <Flame size={11} />
                      <span>Try it</span>
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const runId = msg.previewData?.query_run_id || msg.id
                  const isSelected = activeRunId === runId
                  const msgExecResult = resultsMap[runId]
                  const isExecuting = executingId === runId
                  const providerLabel = msg.previewData?.provider === 'gemini' ? 'Gemini 1.5' : 'Rule-based AST Engine'

                  if (msg.role === 'user') {
                    return (
                      <div key={msg.id} className="user-message-bubble">
                        <div className="message-sender">You</div>
                        <div className="message-text">{msg.content}</div>
                        <div className="message-time">
                          <HumanDate iso={msg.createdAt} />
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`thread-assistant-card ${isSelected ? 'active-card' : ''}`}
                      onClick={() => {
                        setFocusedRunId(runId)
                        setMobilePane('canvas')
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="Select query result to view on canvas"
                    >
                      {/* Card Header */}
                      <div className="thread-assistant-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="brand-pill" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                            QueryTrust Guard
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                            {providerLabel}
                          </span>
                        </div>
                        <div>
                          {msgExecResult ? (
                            <span className="status-tag status-success" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              <span className="live-dot" /> Executed ({msgExecResult.row_count} rows)
                            </span>
                          ) : msg.previewData?.status === 'previewed' ? (
                            <span className="status-tag status-success" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              <span className="live-dot" /> Ready to run
                            </span>
                          ) : msg.previewData?.status === 'blocked' ? (
                            <span className="status-tag status-danger" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              <ShieldAlert size={11} style={{ marginRight: 3 }} /> Blocked
                            </span>
                          ) : (
                            <span className="status-tag status-warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              <AlertTriangle size={11} style={{ marginRight: 3 }} /> Question
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Semantic Meaning */}
                      <div className="thread-card-meaning">
                        {msg.content}
                      </div>

                      {/* Entities */}
                      {msg.previewData && (
                        <div className="thread-card-entities">
                          {msg.previewData.validation.tables_referenced?.map((tbl) => (
                            <span key={tbl} className="entity-chip entity-table" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              <span className="entity-chip-label">Table:</span> {tbl}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Clarification Alert */}
                      {msg.previewData?.clarification_question && (
                        <div className="clarification-box" style={{ padding: '8px 10px', margin: '4px 0' }}>
                          <div className="clarification-title" style={{ fontSize: '0.72rem' }}>Clarification requested:</div>
                          <div className="clarification-prompt" style={{ fontSize: '0.75rem' }}>{msg.previewData.clarification_question}</div>
                        </div>
                      )}

                      {/* Blocked Violations */}
                      {msg.previewData?.validation.violations && msg.previewData.validation.violations.length > 0 && (
                        <div className="security-alert-box alert-error" style={{ padding: '6px 10px', margin: '4px 0', fontSize: '0.72rem' }}>
                          <strong>Blocked:</strong> {msg.previewData.validation.violations[0]}
                        </div>
                      )}

                      {/* Action Row */}
                      <div className="thread-card-actions">
                        {msg.previewData?.can_execute && !msgExecResult ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm run-query-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExecuteQuery(msg.previewData!)
                            }}
                            disabled={isExecuting}
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            {isExecuting ? (
                              <>
                                <div className="btn-spinner" /> Running...
                              </>
                            ) : (
                              <>
                                <Play size={11} fill="currentColor" />
                                <span>Run query</span>
                              </>
                            )}
                          </button>
                        ) : msgExecResult ? (
                          <button
                            type="button"
                            className="thread-open-canvas-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFocusedRunId(runId)
                              setActiveCanvasTab('results')
                              setMobilePane('canvas')
                            }}
                          >
                            <TableIcon size={12} />
                            <span>View in Canvas &rarr;</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--qt-muted)' }}>Non-executable query</span>
                        )}

                        <span style={{ fontSize: '0.68rem', color: 'var(--qt-muted)' }}>
                          <HumanDate iso={msg.createdAt} />
                        </span>
                      </div>
                    </div>
                  )
                })
              )}

              {isLoading && <QueryLoadingSkeleton />}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Query Composer Dock */}
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
                    <kbd>Enter ↵</kbd> preview &bull; <kbd>Ctrl+↵</kbd> run
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="try-break-btn"
                      onClick={handleTryToBreakIt}
                      disabled={isLoading}
                      title="Test security with DROP TABLE"
                      style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                    >
                      <Flame size={12} />
                      <span>Try to break it</span>
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={!inputQuestion.trim() || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="btn-spinner" /> Checking...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} style={{ marginRight: 3 }} />
                          <span>Check &amp; preview</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: Dedicated Data & Safety Canvas */}
          <div className="ask-canvas-pane">
            {/* Canvas Header */}
            <div className="canvas-top-bar">
              <div className="canvas-header-left">
                <div className="canvas-title-group">
                  <TableIcon size={16} style={{ color: 'var(--qt-accent)' }} />
                  <span className="canvas-title">
                    {activePreview ? activePreview.interpreted_question : 'Equipment Intelligence Canvas'}
                  </span>
                </div>
                {activeResult && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="result-metric-pill">
                      <Zap size={11} style={{ verticalAlign: 'middle' }} /> {activeResult.execution_duration_ms} ms
                    </span>
                    <span className="result-metric-pill">
                      <FileText size={11} style={{ verticalAlign: 'middle' }} /> {activeResult.row_count} rows
                    </span>
                    {activeResult.truncated && (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        LIMIT 200 clamped
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="canvas-header-right">
                {/* Segmented Tabs */}
                <div className="canvas-tabs-group" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCanvasTab === 'results'}
                    className={`canvas-tab-btn ${activeCanvasTab === 'results' ? 'active' : ''}`}
                    onClick={() => setActiveCanvasTab('results')}
                  >
                    <TableIcon size={12} />
                    <span>Data Results {activeResult ? `(${activeResult.row_count})` : ''}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCanvasTab === 'sql'}
                    className={`canvas-tab-btn ${activeCanvasTab === 'sql' ? 'active' : ''}`}
                    onClick={() => setActiveCanvasTab('sql')}
                  >
                    <Code2 size={12} />
                    <span>SQL Preview</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCanvasTab === 'safety'}
                    className={`canvas-tab-btn ${activeCanvasTab === 'safety' ? 'active' : ''}`}
                    onClick={() => setActiveCanvasTab('safety')}
                  >
                    <ShieldCheck size={12} />
                    <span>Safety Proof</span>
                  </button>
                </div>

                {/* Actions when executed */}
                {activeResult && activeCanvasTab === 'results' && (
                  <>
                    <div className="view-mode-toggle" style={{ margin: 0 }}>
                      <button
                        type="button"
                        className={`toggle-btn ${activeMode === 'table' ? 'active' : ''}`}
                        onClick={() => {
                          if (activeRunId) setViewModeMap((p) => ({ ...p, [activeRunId]: 'table' }))
                          setActiveSqlInspectorTab('table')
                        }}
                      >
                        Table
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${activeMode === 'chart' ? 'active' : ''}`}
                        onClick={() => {
                          if (activeRunId) setViewModeMap((p) => ({ ...p, [activeRunId]: 'chart' }))
                          setActiveSqlInspectorTab('chart')
                        }}
                      >
                        Chart
                      </button>
                    </div>
                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() => handleExportCSV(activeResult)}
                      title="Export CSV"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    >
                      <Download size={11} />
                      <span>CSV</span>
                    </button>
                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() => handleExportJSON(activeResult)}
                      title="Export JSON"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    >
                      <Download size={11} />
                      <span>JSON</span>
                    </button>
                    <ExplainButton
                      title="Query Results"
                      explanation="These records were retrieved in a read-only database transaction. The system enforces strict SELECT-only access and clamps results to 200 rows."
                    />
                  </>
                )}

                {/* Primary CTA when previewed but not executed */}
                {activePreview?.can_execute && !activeResult && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm run-query-btn"
                    onClick={() => handleExecuteQuery(activePreview)}
                    disabled={executingId === activePreview.query_run_id}
                    title="Execute query in read-only transaction (Ctrl+Enter)"
                  >
                    {executingId === activePreview.query_run_id ? (
                      <>
                        <div className="btn-spinner" /> Running safely...
                      </>
                    ) : (
                      <>
                        <Play size={11} fill="currentColor" />
                        <span>Run query</span>
                        <kbd className="kbd-shortcut">Ctrl+↵</kbd>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Canvas Body */}
            <div className="canvas-content-area">
              {/* TAB 1: RESULTS */}
              {activeCanvasTab === 'results' && (
                <>
                  {activeResult ? (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                      <div className="result-summary-box" style={{ marginBottom: '1rem' }}>
                        {activeResult.result_summary}
                      </div>

                      {activeMode === 'chart' ? (
                        <div className="canvas-chart-area">
                          <VisualChart result={activeResult} />
                        </div>
                      ) : (
                        <div className="canvas-table-wrapper">
                          <table className="result-data-table">
                            <thead>
                              <tr>
                                {activeResult.columns.map((col) => (
                                  <th key={col}>{col.replace(/_/g, ' ')}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {activeResult.rows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {activeResult.columns.map((col) => {
                                    const val = row[col]
                                    const isNumeric = typeof val === 'number'
                                    const isAssetTag = typeof val === 'string' && /^ASSET-\d+/i.test(val)

                                    return (
                                      <td
                                        key={col}
                                        className={isNumeric ? 'cell-numeric' : undefined}
                                        title={val !== null && val !== undefined ? String(val) : undefined}
                                      >
                                        {val === null || val === undefined ? (
                                          <span className="cell-null">—</span>
                                        ) : isAssetTag ? (
                                          <span className="asset-tag-token">{String(val)}</span>
                                        ) : isNumeric ? (
                                          Number(val).toLocaleString()
                                        ) : (
                                          String(val)
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Feedback bar */}
                      <div className="feedback-subcard" style={{ marginTop: '1rem' }}>
                        <div className="feedback-header">
                          <span className="feedback-label">Was this answer accurate and helpful?</span>
                          {activeFeedback?.saved && (
                            <span className="badge badge-success">
                              <Check size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} /> Feedback saved
                            </span>
                          )}
                        </div>
                        <div className="feedback-actions">
                          <button
                            type="button"
                            className={`feedback-btn ${activeFeedback?.isHelpful === true ? 'active-helpful' : ''}`}
                            onClick={() => handleFeedbackSubmit(activeRunId!, true)}
                          >
                            <ThumbsUp size={12} style={{ marginRight: 4 }} /> Helpful
                          </button>
                          <button
                            type="button"
                            className={`feedback-btn ${activeFeedback?.isHelpful === false ? 'active-unhelpful' : ''}`}
                            onClick={() => handleFeedbackSubmit(activeRunId!, false)}
                          >
                            <ThumbsDown size={12} style={{ marginRight: 4 }} /> Needs improvement
                          </button>
                          <input
                            type="text"
                            className="feedback-notes-input"
                            placeholder="Optional note for model evaluation..."
                            value={activeFeedback?.explanation || ''}
                            onChange={(e) =>
                              setFeedbackMap((p) => ({
                                ...p,
                                [activeRunId!]: {
                                  isHelpful: p[activeRunId!]?.isHelpful ?? true,
                                  explanation: e.target.value,
                                  saved: false,
                                },
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleFeedbackSubmit(activeRunId!, activeFeedback?.isHelpful ?? true)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : activePreview?.can_execute ? (
                    <div className="canvas-ready-hero">
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <ShieldCheck size={28} style={{ color: '#10b981' }} />
                      </div>
                      <div>
                        <h3>Query Safe &amp; Validated</h3>
                        <p style={{ maxWidth: 460 }}>
                          Parsed by SQLGlot AST guardrails. Verified SELECT-only transaction clamped to 200 rows.
                        </p>
                      </div>

                      <div style={{ background: 'var(--qt-canvas)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--qt-border)', width: '100%', textAlign: 'left' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', marginBottom: 4 }}>Mapped question:</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--qt-ink)' }}>"{activePreview.interpreted_question}"</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {activePreview.validation.tables_referenced?.map((t) => (
                            <span key={t} className="entity-chip entity-table" style={{ fontSize: '0.7rem' }}>
                              Table: {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-md run-query-btn"
                        onClick={() => handleExecuteQuery(activePreview)}
                        disabled={executingId === activePreview.query_run_id}
                        style={{ padding: '8px 20px', fontSize: '0.875rem' }}
                      >
                        {executingId === activePreview.query_run_id ? (
                          <>
                            <div className="btn-spinner" /> Executing in read-only transaction...
                          </>
                        ) : (
                          <>
                            <Play size={14} fill="currentColor" />
                            <span>Run query in read-only mode</span>
                            <kbd className="kbd-shortcut" style={{ marginLeft: 6 }}>Ctrl+↵</kbd>
                          </>
                        )}
                      </button>
                    </div>
                  ) : activePreview?.status === 'blocked' ? (
                    <div className="canvas-blocked-hero">
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <ShieldAlert size={28} style={{ color: '#ef4444' }} />
                      </div>
                      <h3>Query Blocked for Safety</h3>
                      <p>
                        The SQL statement violates QueryTrust read-only governance rules. No query was executed against the database.
                      </p>
                      {activePreview.validation.violations && activePreview.validation.violations.length > 0 && (
                        <div style={{ textAlign: 'left', width: '100%', background: 'var(--qt-canvas)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                            Violations detected:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: '#ef4444' }}>
                            {activePreview.validation.violations.map((v, i) => (
                              <li key={i}>{v}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="canvas-welcome-panel">
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          background: 'var(--qt-accent-soft)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255, 79, 0, 0.25)',
                        }}
                      >
                        <Sparkles size={30} style={{ color: 'var(--qt-accent)' }} />
                      </div>
                      <div>
                        <h3>Equipment Intelligence Canvas</h3>
                        <p>
                          Ask a question on the left or click a starter chip to view live tabular records, charts, and AST security proofs here without page scrolling.
                        </p>
                      </div>

                      <div style={{ marginTop: '0.5rem', width: '100%', maxWidth: 520 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--qt-muted)', marginBottom: 8, textAlign: 'center' }}>
                          Available Equipment Schema
                        </div>
                        <div className="canvas-schema-pills">
                          <span className="canvas-schema-pill">
                            <Database size={11} style={{ color: 'var(--qt-accent)' }} />
                            <code>devices</code> (5,000 nodes)
                          </span>
                          <span className="canvas-schema-pill">
                            <Database size={11} style={{ color: '#10b981' }} />
                            <code>telemetry</code> (30,000+ readings)
                          </span>
                          <span className="canvas-schema-pill">
                            <Database size={11} style={{ color: '#6366f1' }} />
                            <code>sites</code> (50 regions)
                          </span>
                          <span className="canvas-schema-pill">
                            <Database size={11} style={{ color: '#f59e0b' }} />
                            <code>maintenance_events</code> (1,200 logs)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: SQL PREVIEW */}
              {activeCanvasTab === 'sql' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activePreview?.sql_preview ? (
                    <div className="sql-preview-block" style={{ margin: 0 }}>
                      <div className="sql-preview-header">
                        <span className="sql-dialect-tag">PostgreSQL (SELECT-only) Dialect</span>
                        <div className="sql-header-actions">
                          <span className="limit-clamped-badge">LIMIT 200 clamped</span>
                          <button
                            type="button"
                            className="copy-btn"
                            onClick={() =>
                              handleCopySQL(activePreview.query_run_id, activePreview.sql_preview!)
                            }
                            title="Copy SQL statement"
                          >
                            {copiedQueryId === activePreview.query_run_id ? (
                              <span style={{ color: '#4ade80' }}>
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
                      <pre className="sql-code-box" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        <HighlightedSql sql={activePreview.sql_preview} />
                      </pre>
                    </div>
                  ) : (
                    <div className="sessions-empty" style={{ padding: '3rem 1rem' }}>
                      <Code2 size={28} style={{ color: 'var(--qt-muted)' }} />
                      <span>No SQL query generated yet.</span>
                      <small>Select or ask a question on the left to inspect its SQL AST parse.</small>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SAFETY PROOF */}
              {activeCanvasTab === 'safety' && (
                <div>
                  {activePreview ? (
                    <SafetyShieldDisplay preview={activePreview} />
                  ) : (
                    <div className="sessions-empty" style={{ padding: '3rem 1rem' }}>
                      <ShieldCheck size={28} style={{ color: 'var(--qt-muted)' }} />
                      <span>No query active to inspect.</span>
                      <small>Run a query on the left to review its 6-point AST safety checks.</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

