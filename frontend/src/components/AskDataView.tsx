import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
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
  Search,
  BarChart3,
  PieChart,
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
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { ExplainButton } from './ExplainButton'
import { PageHeader } from './PageHeader'
import { HumanDate } from './HumanDate'
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
const VisualChart: React.FC<{ result: ExecuteResponse }> = ({ result }) => {
  const { chart_recommendation: rec, rows, columns } = result

  if (!rows || rows.length === 0) {
    return <div className="chart-empty">No records available to visualize.</div>
  }

  // 1. Metric Single Value: if exactly 1 row & 1 column, or rec.chart_type === 'metric'
  if (rec.chart_type === 'metric' || (rows.length === 1 && columns.length === 1)) {
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

// 6-Point Safety Shield Sequence Component (ThoughtSpot / Monte Carlo Benchmark)
interface SafetyShieldProps {
  preview: PreviewResponse
}

const SafetyShieldDisplay: React.FC<SafetyShieldProps> = ({ preview }) => {
  const isBlocked = preview.status === 'blocked' || !preview.validation.passed
  const tables =
    preview.validation.tables_referenced?.length > 0
      ? preview.validation.tables_referenced.join(', ')
      : 'devices'

  // The 6 strict safety invariants required by specification
  const checks = [
    {
      id: 'single_statement',
      label: 'Single statement parsed',
      sublabel: 'Rejects multi-command chaining and injection',
      pass: !isBlocked,
    },
    {
      id: 'select_only',
      label: 'SELECT-only execution',
      sublabel: 'Zero mutations: INSERT, UPDATE, DELETE, and DROP forbidden',
      pass: !isBlocked,
    },
    {
      id: 'table_allowlist',
      label: 'Permitted schema tables',
      sublabel: tables ? `Confined to: ${tables}` : 'Equipment inventory tables only',
      pass: !isBlocked,
    },
    {
      id: 'schema_allowlist',
      label: 'Public schema isolation',
      sublabel: 'Blocks access to pg_catalog and system namespaces',
      pass: !isBlocked,
    },
    {
      id: 'function_allowlist',
      label: 'Safe functions only',
      sublabel: 'Permits math & aggregates; rejects system execution routines',
      pass: !isBlocked,
    },
    {
      id: 'row_limit',
      label: 'Row clamp enforced',
      sublabel: 'Strict limit capped to 200 rows max in read-only transaction',
      pass: true,
    },
  ]

  const passedCount = isBlocked ? checks.filter((c) => c.pass).length : 6

  return (
    <div className={`safety-shield ${isBlocked ? 'blocked' : 'passed'}`} role="status" aria-live="polite">
      <div className="safety-shield-header">
        <div className="shield-title-group">
          <div className="shield-icon-badge">
            {isBlocked ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
          </div>
          <div className="shield-title-text">
            <h4>{isBlocked ? 'Query blocked by AST safety rules' : `Safety Shield: ${passedCount} of 6 AST checks verified`}</h4>
            <p>
              {isBlocked
                ? 'Intercepted before reaching your database. Zero modifications possible.'
                : 'Guaranteed read-only. Abstract syntax tree verified. Safe to run.'}
            </p>
          </div>
        </div>
        <ExplainButton
          title="6-Point Safety Shield Verification"
          explanation="Every question must pass 6 automated checks before execution. Antigravity AST guards reject writes, drops, unauthorized tables, and unbound limits."
        />
      </div>

      <div className="shield-checks-grid">
        {checks.map((chk, idx) => (
          <div
            key={chk.id}
            className={`shield-check-card ${chk.pass ? 'check-pass' : 'check-fail'}`}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {chk.pass ? (
              <CheckCircle2 size={15} className="check-icon-pass" />
            ) : (
              <XCircle size={15} className="check-icon-fail" />
            )}
            <div className="check-card-body">
              <span className="check-card-title">{chk.label}</span>
              <span className="check-card-sub">{chk.sublabel}</span>
            </div>
          </div>
        ))}
      </div>
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
  const { mode } = useTheme()
  const { user } = useAuth()
  const isViewer = user?.role === 'viewer'
  const isDemo = !user?.workspace_name || user.workspace_name === 'Default Workspace' || (user.email ? user.email.endsWith('@querytrust.local') : false)
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputQuestion, setInputQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null)
  const [expandedSqlMap, setExpandedSqlMap] = useState<Record<string, boolean>>({})
  const [expandedShieldMap, setExpandedShieldMap] = useState<Record<string, boolean>>({})
  const [sessionSearchTerm, setSessionSearchTerm] = useState('')

  // Execution & Feedback States
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [resultsMap, setResultsMap] = useState<Record<string, ExecuteResponse>>({})
  const [viewModeMap, setViewModeMap] = useState<Record<string, 'table' | 'chart'>>({})
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, { isHelpful: boolean; explanation: string; saved: boolean }>
  >({})

  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const toggleSqlExpansion = (queryId: string) => {
    setExpandedSqlMap((prev) => ({ ...prev, [queryId]: !prev[queryId] }))
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
      {/* Linear-Style Sessions Drawer */}
      <aside className="ask-data-sessions-sidebar" aria-label="Conversation Sessions">
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

      {/* Main Conversation & ThoughtSpot Preview Area */}
      <section className="ask-data-workspace">
        <PageHeader
          title="Ask governed data"
          description="Translate natural-language questions into safe, validated SQL queries."
          helpText="Every generated query is checked across 6 safety checks and run via a SELECT-only PostgreSQL reader."
        />

        {/* Governance & Safety Status Bar */}
        <div className="ask-data-governance-banner">
          <div className="governance-badge-group">
            <span className="badge badge-warning">
              <span className="live-dot" style={{ backgroundColor: 'var(--qt-accent, #FF4F00)' }} />
              Guided demo mode
            </span>
            <span className="badge badge-neutral">Demo inventory</span>
            <span className="badge badge-success">6-layer AST guardrails</span>
            <span className="badge badge-primary">Read-only connection</span>
          </div>
          <div className="governance-notice-text">
            <span>Guaranteed read-only. No raw client SQL execution.</span>
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
              <div className="ask-hero-badge">
                <Sparkles size={13} />
                <span>AI SQL Translation with 6-Layer AST Guardrails</span>
              </div>
              <h2 className="hero-title">Ask your equipment anything, in plain English.</h2>
              <p className="hero-subtitle">
                The enterprise analytics path you can't make dangerous. We interpret your intent, verify compliance across 6 independent AST checks, and execute strictly through a read-only PostgreSQL role.
              </p>

              <div className="ast-visual-hero-banner">
                <img
                  src="/images/ast_architecture.jpg"
                  alt="QueryTrust AI 6-Point AST Safety Shield and Execution Pipeline Architecture"
                  className="ast-visual-hero-img"
                  loading="lazy"
                />
                <div className="ast-visual-hero-overlay">
                  <div className="ast-visual-hero-meta">
                    <span className="ast-visual-tag">AST Security Architecture</span>
                    <span className="ast-visual-sub">Client Query &rarr; LLM &rarr; SQLGlot AST Parse &rarr; Read-Only Replica</span>
                  </div>
                </div>
              </div>

              <ol className="ask-data-steps" aria-label="How asking works">
                <li>
                  <span className="ask-step-num">1</span>
                  <strong>Ask freely</strong>
                  <small>Natural English phrasing without technical SQL syntax.</small>
                </li>
                <li>
                  <span className="ask-step-num">2</span>
                  <strong>Safety check</strong>
                  <small>6-point AST shield blocks destructive commands & injections.</small>
                </li>
                <li>
                  <span className="ask-step-num">3</span>
                  <strong>Trust completely</strong>
                  <small>Verified read-only database reader clamped to 200 rows.</small>
                </li>
              </ol>

              {/* Starter Prompt Chips */}
              <div className="starter-prompts-matrix">
                <div className="starter-prompts-label">
                  {activeSource?.mode === 'connected'
                    ? `Try a question on ${activeSource.name}:`
                    : 'Try one of these real questions:'}
                </div>
                <div className="starter-chips-grid">
                  {starterPrompts.map((item, idx) => (
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
                      <Flame size={14} style={{ color: '#dc2626' }} />
                      Want proof? Try to break it.
                    </h5>
                    <p>
                      Click below to send <code>{breakQuery}</code> directly to the backend. Watch the Safety Shield intercept it live without touching a single record.
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
                const providerLabel = msg.previewData?.provider === 'gemini' ? 'Gemini 1.5' : 'Rule-based AST Engine'

                return (
                  <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                    {msg.role === 'user' ? (
                      <div className="user-message-bubble">
                        <div className="message-sender">You</div>
                        <div className="message-text">{msg.content}</div>
                        <div className="message-time">
                          <HumanDate iso={msg.createdAt} />
                        </div>
                      </div>
                    ) : (
                      <div className="assistant-preview-card">
                        {/* Card Header with Status Badge */}
                        <div className="preview-card-header">
                          <div className="header-left">
                            <span className="brand-pill">QueryTrust Guard</span>
                            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                              {providerLabel}
                            </span>
                            <span className="preview-time" style={{ marginLeft: 6 }}>
                              <HumanDate iso={msg.createdAt} />
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

                        {/* Animated 6-Point Safety Shield Inspector */}
                        {msg.previewData && (
                          isViewer ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                margin: '10px 0 14px',
                                borderRadius: 8,
                                background: msg.previewData.status === 'blocked'
                                  ? 'rgba(239, 68, 68, 0.08)'
                                  : 'rgba(16, 185, 129, 0.08)',
                                border: `1px solid ${msg.previewData.status === 'blocked' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                fontSize: '0.8rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {msg.previewData.status === 'blocked' ? (
                                  <ShieldAlert size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                                ) : (
                                  <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                                )}
                                <span>
                                  <strong>{msg.previewData.status === 'blocked' ? 'AST Safety Guard Blocked:' : '6-Point AST Safety Verified:'}</strong>{' '}
                                  {msg.previewData.status === 'blocked'
                                    ? 'Potentially destructive query intercepted.'
                                    : 'Guaranteed read-only SELECT execution.'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedShieldMap((prev) => ({
                                    ...prev,
                                    [msg.previewData!.query_run_id]: !prev[msg.previewData!.query_run_id],
                                  }))
                                }
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--qt-accent, #ff5a14)',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <span>{expandedShieldMap[msg.previewData.query_run_id] ? 'Hide technical proof' : 'Inspect technical checks'}</span>
                                {expandedShieldMap[msg.previewData.query_run_id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            </div>
                          ) : (
                            <SafetyShieldDisplay preview={msg.previewData} />
                          )
                        )}
                        {msg.previewData && isViewer && expandedShieldMap[msg.previewData.query_run_id] && (
                          <SafetyShieldDisplay preview={msg.previewData} />
                        )}

                        {/* ThoughtSpot-Style Intent Breakdown */}
                        <div className="thoughtspot-intent-card">
                          <div className="intent-card-header">
                            <div className="intent-title-group">
                              <Sparkles size={13} className="intent-sparkle-icon" />
                              <span className="intent-card-label">Semantic interpretation</span>
                            </div>
                            <span className="intent-card-sub">What the engine mapped from plain English</span>
                          </div>
                          <div className="intent-meaning-text">{msg.content}</div>

                          <div className="intent-entities-row">
                            {msg.previewData?.validation.tables_referenced?.map((tbl) => (
                              <span key={tbl} className="entity-chip entity-table">
                                <span className="entity-chip-label">Table:</span> {tbl}
                              </span>
                            ))}
                            {msg.previewData?.business_terms_used?.map((term) => (
                              <span key={term} className="entity-chip entity-term">
                                <span className="entity-chip-label">Term:</span> {term}
                              </span>
                            ))}
                            {msg.previewData?.assumptions?.map((asm, idx) => (
                              <span key={idx} className="entity-chip entity-assumption">
                                <span className="entity-chip-label">Rule:</span> {asm}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Clarification Alert (if ambiguous) */}
                        {msg.previewData?.clarification_question && (
                          <div className="clarification-box">
                            <div className="clarification-title">Quick question before we run this:</div>
                            <div className="clarification-prompt">{msg.previewData.clarification_question}</div>
                            <div className="clarification-actions">
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendQuestion('Show devices with warranty expiring in 30 days')}
                              >
                                Option 1: Imminent Warranty Expiry (&lt;30d)
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendQuestion('List open Critical service events')}
                              >
                                Option 2: Open Critical Incidents
                              </button>
                              <button
                                type="button"
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
                            <div className="unsupported-title">Out-of-domain question</div>
                            <p className="unsupported-desc" style={{ marginBottom: '0.75rem' }}>
                              The requested question is outside the networking device inventory and operational telemetry schema. QueryTrust AI never hallucinates data outside known equipment domains.
                            </p>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--qt-ink)', marginBottom: '0.4rem' }}>
                              Try asking about equipment instead:
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendQuestion('How many active devices are in each region?')}
                              >
                                Devices by region
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendQuestion('Show all routers with warranty expiring in the next 60 days.')}
                              >
                                Warranty expiring soon
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendQuestion('List critical open service events grouped by site.')}
                              >
                                Open critical incidents
                              </button>
                            </div>
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

                        {/* SQL Syntax Highlighted Inspector Block (Simple vs Expert Mode) */}
                        {msg.previewData?.sql_preview && (
                          <div className="sql-preview-container">
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
                                fontSize: '0.75rem',
                              }}
                            >
                              <Code2 size={13} />
                              <span>{isSqlExpanded ? 'Hide SQL preview' : 'Show SQL preview'}</span>
                              {isSqlExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>

                            {isSqlExpanded && (
                              <div className="sql-preview-block">
                                <div className="sql-preview-header">
                                  <span className="sql-dialect-tag">PostgreSQL (SELECT-only)</span>
                                  <div className="sql-header-actions">
                                    <span className="limit-clamped-badge">LIMIT 200 clamped</span>
                                    <button
                                      type="button"
                                      className="copy-btn"
                                      onClick={() =>
                                        handleCopySQL(msg.previewData!.query_run_id, msg.previewData!.sql_preview!)
                                      }
                                      title="Copy SQL statement"
                                    >
                                      {copiedQueryId === msg.previewData.query_run_id ? (
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
                                <pre className="sql-code-box">
                                  <HighlightedSql sql={msg.previewData.sql_preview} />
                                </pre>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Footer (Prominent Solid Orange CTA or Blocked Indicator) */}
                        {msg.previewData && !execResult && (
                          <div className="preview-action-footer">
                            <div className="footer-meta">
                              <span className="run-id-label">Preview ID:</span>
                              <code className="run-id-code">{msg.previewData.query_run_id.slice(0, 12)}…</code>
                            </div>
                            {msg.previewData.can_execute ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-md run-query-btn"
                                onClick={() => handleExecuteQuery(msg.previewData!)}
                                disabled={isExecuting}
                                title="Execute query in read-only transaction"
                              >
                                {isExecuting ? (
                                  <>
                                    <div className="btn-spinner" /> Running safely in read-only mode...
                                  </>
                                ) : (
                                  <>
                                    <Play size={13} fill="currentColor" />
                                    <span>Run query</span>
                                    <kbd className="kbd-shortcut">Ctrl+↵</kbd>
                                  </>
                                )}
                              </button>
                            ) : (
                              <div
                                className="blocked-execution-pill"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 12px',
                                  borderRadius: 'var(--qt-radius-control)',
                                  background: 'var(--qt-danger-soft)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--qt-danger)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                <ShieldAlert size={14} />
                                <span>Execution blocked by safety policy</span>
                              </div>
                            )}
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
                                  <Zap size={12} style={{ verticalAlign: 'middle' }} /> {execResult.execution_duration_ms} ms
                                </span>
                                <span className="result-metric-pill">
                                  <FileText size={12} style={{ verticalAlign: 'middle' }} /> {execResult.row_count} {execResult.row_count === 1 ? 'row' : 'rows'}
                                </span>
                                {execResult.truncated && (
                                  <span className="badge badge-warning">Max 200 row limit reached</span>
                                )}
                              </div>
                              <div className="result-header-right">
                                <button
                                  type="button"
                                  className="toggle-btn"
                                  onClick={() => handleExportCSV(execResult)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: 'var(--qt-surface)',
                                    border: '1px solid var(--qt-border)',
                                    padding: '3px 8px',
                                    borderRadius: 'var(--qt-radius-control)',
                                  }}
                                  title="Export result table as CSV"
                                >
                                  <Download size={12} />
                                  <span>Export CSV</span>
                                </button>
                                <div className="view-mode-toggle">
                                  <button
                                    type="button"
                                    className={`toggle-btn ${activeMode === 'table' ? 'active' : ''}`}
                                    onClick={() => setViewModeMap((p) => ({ ...p, [runId]: 'table' }))}
                                  >
                                    Table
                                  </button>
                                  <button
                                    type="button"
                                    className={`toggle-btn ${activeMode === 'chart' ? 'active' : ''}`}
                                    onClick={() => setViewModeMap((p) => ({ ...p, [runId]: 'chart' }))}
                                  >
                                    Chart
                                  </button>
                                </div>
                                <ExplainButton
                                  title="Query Results"
                                  explanation="These records were retrieved in a read-only database transaction. The system enforces strict SELECT-only access and clamps results to 200 rows."
                                />
                              </div>
                            </div>

                            {/* Result Summary Bar: One sentence takeaway */}
                            <div className="result-summary-box">{execResult.result_summary}</div>

                            {/* View Mode: Chart */}
                            {activeMode === 'chart' && (
                              <div className="result-visualization-area">
                                <VisualChart result={execResult} />
                              </div>
                            )}

                            {/* View Mode: Table (Linear Standard) */}
                            {activeMode === 'table' && (
                              <div className="result-table-wrapper">
                                <table className="result-data-table">
                                  <thead>
                                    <tr>
                                      {execResult.columns.map((col) => (
                                        <th key={col}>{col.replace(/_/g, ' ')}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {execResult.rows.map((row, rIdx) => (
                                      <tr key={rIdx}>
                                        {execResult.columns.map((col) => {
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

                            {/* Feedback Section */}
                            <div className="feedback-subcard">
                              <div className="feedback-header">
                                <span className="feedback-label">Was this answer accurate and helpful?</span>
                                {feedbackState?.saved && (
                                  <span className="badge badge-success">
                                    <Check size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} /> Feedback saved ({feedbackState.isHelpful ? 'Helpful' : 'Needs improvement'})
                                  </span>
                                )}
                              </div>
                              <div className="feedback-actions">
                                <button
                                  type="button"
                                  className={`feedback-btn ${feedbackState?.isHelpful === true ? 'active-helpful' : ''}`}
                                  onClick={() => handleFeedbackSubmit(runId, true)}
                                >
                                  <ThumbsUp size={12} style={{ marginRight: 4 }} /> Helpful
                                </button>
                                <button
                                  type="button"
                                  className={`feedback-btn ${feedbackState?.isHelpful === false ? 'active-unhelpful' : ''}`}
                                  onClick={() => handleFeedbackSubmit(runId, false)}
                                >
                                  <ThumbsDown size={12} style={{ marginRight: 4 }} /> Needs improvement
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
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleFeedbackSubmit(runId, feedbackState?.isHelpful ?? true)}
                                >
                                  Save feedback
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
                      <span>Check & preview</span>
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
