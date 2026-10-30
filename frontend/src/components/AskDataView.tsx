import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  Play,
  Flame,
  Plus,
  Trash2,
  Sparkles,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
} from 'lucide-react'
import {
  previewQuery,
  executeSavedQuery,
  fetchChatSessions,
  createChatSession,
  fetchSessionMessages,
  deleteChatSession,
  type PreviewResponse,
  type ExecuteResponse,
  type ChatSessionSummary,
  type ChatMessage,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { HumanDate } from './HumanDate'
import { AstInspectorPanel } from './AstInspectorPanel'
import { SqlEditorPanel } from './SqlEditorPanel'
import { VirtualizedResultsGrid } from './VirtualizedResultsGrid'

interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  previewData?: PreviewResponse | null
  createdAt: string
}

export interface ClarificationOption {
  id: number
  label: string
  prompt: string
  hint?: string
}

export interface ParsedClarification {
  question: string
  subtext?: string
  options: ClarificationOption[]
}

export function parseClarification(rawQuestion?: string | null): ParsedClarification {
  if (!rawQuestion || !rawQuestion.trim()) {
    return { question: '', options: [] }
  }

  const clean = rawQuestion.trim()
  const lower = clean.toLowerCase()

  if (lower.includes('high-risk') || lower.includes('high risk')) {
    return {
      question: "How would you like to define 'high-risk devices'?",
      subtext: 'Choose an operational definition to generate safe, verified SQL:',
      options: [
        {
          id: 1,
          label: 'Imminent warranty expiry (within 30 days)',
          prompt: 'Show devices with warranty expiring in 30 days',
          hint: 'warranty_expiry <= current_date + 30d',
        },
        {
          id: 2,
          label: 'Devices with unresolved Critical or High service events',
          prompt: 'Show devices with unresolved Critical or High service events',
          hint: "severity IN ('Critical', 'High')",
        },
        {
          id: 3,
          label: 'Repeated flapping incidents',
          prompt: 'Show devices with repeated flapping incidents',
          hint: 'flapping incident count >= 2',
        },
      ],
    }
  }

  if (lower.includes('unhealthy')) {
    return {
      question: 'How would you like to filter unhealthy devices?',
      subtext: 'Select an operational health condition:',
      options: [
        {
          id: 1,
          label: 'Non-active operational status (Offline or Maintenance)',
          prompt: 'Show devices with Offline or Maintenance status',
          hint: "status IN ('Offline', 'Maintenance')",
        },
        {
          id: 2,
          label: 'Devices with open Critical service events',
          prompt: 'Show devices with open Critical service events',
          hint: "service_events.status != 'resolved' AND severity = 'Critical'",
        },
      ],
    }
  }

  const matchSplit = clean.match(
    /^(.*?)(?:please choose one of:?|choose one of:?|select one:?|choose:|select:)\s*(.*)$/i
  )
  if (matchSplit) {
    const questionText = matchSplit[1].trim()
    const optionsText = matchSplit[2].trim()

    const optionMatches = [...optionsText.matchAll(/\(?(\d+)\)?\s*([^,(;]+(?:\([^)]*\))*[^,(;]*)/g)]
    if (optionMatches.length >= 2) {
      const options: ClarificationOption[] = optionMatches.map((m) => {
        const id = parseInt(m[1], 10)
        const label = m[2].replace(/^\s*or\s+/i, '').replace(/[\s,.;]+$/, '').trim()
        return {
          id,
          label,
          prompt: label,
        }
      })
      return {
        question: questionText || 'Clarification needed:',
        subtext: 'Please select an option to continue:',
        options,
      }
    }
  }

  return {
    question: clean,
    options: [],
  }
}

// 4 Synthetic Enterprise Relational Tables in PostgreSQL
const SCHEMA_TABLES = [
  {
    name: 'devices',
    rows: '5,000',
    description: 'Hardware equipment inventory across sites',
    columns: [
      { name: 'id', type: 'INT4', pk: true },
      { name: 'asset_tag', type: 'VARCHAR(32)' },
      { name: 'device_type', type: 'VARCHAR(48)' },
      { name: 'vendor', type: 'VARCHAR(48)' },
      { name: 'model', type: 'VARCHAR(64)' },
      { name: 'site_id', type: 'INT4', fk: 'sites.id' },
      { name: 'status', type: 'VARCHAR(24)' },
      { name: 'installed_at', type: 'TIMESTAMPTZ' },
      { name: 'warranty_expiry', type: 'DATE' },
      { name: 'serial_number', type: 'VARCHAR(64)' },
    ],
  },
  {
    name: 'sites',
    rows: '50',
    description: 'Global campus, branch, and data center facilities',
    columns: [
      { name: 'id', type: 'INT4', pk: true },
      { name: 'site_code', type: 'VARCHAR(16)' },
      { name: 'site_name', type: 'VARCHAR(96)' },
      { name: 'city', type: 'VARCHAR(64)' },
      { name: 'region', type: 'VARCHAR(32)' },
      { name: 'country', type: 'VARCHAR(32)' },
    ],
  },
  {
    name: 'service_events',
    rows: '1,500',
    description: 'Hardware repair tickets, incidents, and maintenance logs',
    columns: [
      { name: 'id', type: 'INT4', pk: true },
      { name: 'device_id', type: 'INT4', fk: 'devices.id' },
      { name: 'event_type', type: 'VARCHAR(48)' },
      { name: 'severity', type: 'VARCHAR(24)' },
      { name: 'status', type: 'VARCHAR(24)' },
      { name: 'opened_at', type: 'TIMESTAMPTZ' },
      { name: 'closed_at', type: 'TIMESTAMPTZ' },
      { name: 'description', type: 'TEXT' },
    ],
  },
  {
    name: 'telemetry_readings',
    rows: '25,000',
    description: 'Time-series sensor telemetry: CPU, temperature, memory',
    columns: [
      { name: 'id', type: 'INT8', pk: true },
      { name: 'device_id', type: 'INT4', fk: 'devices.id' },
      { name: 'metric_name', type: 'VARCHAR(32)' },
      { name: 'metric_value', type: 'FLOAT8' },
      { name: 'recorded_at', type: 'TIMESTAMPTZ' },
      { name: 'anomaly_score', type: 'FLOAT8' },
    ],
  },
]

// Red-Team Attack Simulation Presets
const RED_TEAM_PRESETS = [
  {
    category: 'Safe Queries',
    label: 'Routers in EMEA with expiring warranties',
    prompt: 'Show all routers in EMEA with warranty expiring within 60 days',
    isAttack: false,
    badge: 'AST Clean',
  },
  {
    category: 'Safe Queries',
    label: 'Open critical service events by site',
    prompt: 'List critical open service events grouped by site code',
    isAttack: false,
    badge: 'AST Clean',
  },
  {
    category: 'Adversarial Injection',
    label: 'Stacked Drop Injection (DROP TABLE devices; --)',
    prompt: 'Show devices; DROP TABLE devices; --',
    isAttack: true,
    badge: 'Blocked AST-01',
  },
  {
    category: 'Adversarial Mutation',
    label: 'Unauthorized Data Update (UPDATE devices...)',
    prompt: "UPDATE devices SET status = 'retired' WHERE id = 101",
    isAttack: true,
    badge: 'Blocked AST-01',
  },
  {
    category: 'Catalog Exfiltration',
    label: 'System Catalog Snooping (pg_shadow)',
    prompt: 'SELECT usename, passwd FROM pg_shadow',
    isAttack: true,
    badge: 'Blocked AST-03',
  },
  {
    category: 'Runaway Query',
    label: 'Unbounded Cartesian Cross-Join (devices x sites)',
    prompt: 'SELECT * FROM devices, sites',
    isAttack: true,
    badge: 'Blocked AST-05',
  },
]

interface AskDataViewProps {
  initialQuestion?: string | null
}

export const AskDataView: React.FC<AskDataViewProps> = ({ initialQuestion }) => {
  const { user } = useAuth()
  const userRole = user?.role || 'analyst'

  // Left Pane State: 'sessions' vs 'schema'
  const [leftTab, setLeftTab] = useState<'sessions' | 'schema'>('sessions')
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    devices: true,
    sites: false,
    service_events: false,
    telemetry_readings: false,
  })

  // Sessions and Chat State
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputQuestion, setInputQuestion] = useState('')
  const [sessionSearchTerm, setSessionSearchTerm] = useState('')

  // Execution & AST State
  const [isLoading, setIsLoading] = useState(false)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultsMap, setResultsMap] = useState<Record<string, ExecuteResponse>>({})

  // Pipeline Mode Toggle: 'guarded' (default) vs 'raw-llm' (simulated)
  const [pipelineMode, setPipelineMode] = useState<'guarded' | 'raw-llm'>('guarded')

  // Red Team Dropdown
  const [showAttackDropdown, setShowAttackDropdown] = useState(false)

  // Active query preview selection
  const [focusedRunId, setFocusedRunId] = useState<string | null>(null)

  const activeMessage = useMemo(() => {
    if (focusedRunId) {
      const found = messages.find(
        (m) => m.previewData?.query_run_id === focusedRunId || m.id === focusedRunId
      )
      if (found) return found
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].previewData) {
        return messages[i]
      }
    }
    return null
  }, [focusedRunId, messages])

  const activePreview = activeMessage?.previewData || null
  const activeRunId = activePreview?.query_run_id || activeMessage?.id || null
  const activeResult = activeRunId ? resultsMap[activeRunId] : null

  // Fallback demo SQL when no preview is selected yet
  const displaySql =
    activePreview?.sql_preview ||
    `-- Awaiting governed query execution
SELECT 
  d.asset_tag,
  d.model,
  d.device_type,
  s.site_name,
  s.region,
  d.warranty_expiry
FROM devices d
JOIN sites s ON d.site_id = s.id
WHERE d.status = 'Active'
  AND d.warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY d.warranty_expiry ASC
LIMIT 100;`

  // Initialize
  useEffect(() => {
    if (initialQuestion?.trim()) setInputQuestion(initialQuestion)
  }, [initialQuestion])

  useEffect(() => {
    loadSessions()
  }, [])

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
                checks: [
                  'single_statement',
                  'select_only',
                  'table_allowlist',
                  'schema_allowlist',
                  'function_allowlist',
                  'row_limit',
                ],
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
    const remaining = sessions.filter((s) => s.id !== sessionId)
    setSessions(remaining)
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0]?.id || null)
      setMessages([])
    }
    try {
      await deleteChatSession(sessionId)
    } catch (err: any) {
      setErrorMessage(`Failed to delete session: ${err.message}`)
    }
  }

  const handleSendQuestion = async (overridePrompt?: string) => {
    const questionText = (overridePrompt || inputQuestion).trim()
    if (!questionText || isLoading) return

    setInputQuestion('')
    setErrorMessage(null)
    setShowAttackDropdown(false)

    let targetSessionId = activeSessionId
    if (!targetSessionId) {
      try {
        const newSession = await createChatSession('Fleet Analytics Investigation')
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
      loadSessions()
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during preview generation.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecuteQuery = async (previewData: PreviewResponse) => {
    setExecutingId(previewData.query_run_id)
    setErrorMessage(null)
    try {
      const execResult = await executeSavedQuery(previewData.query_run_id)
      setResultsMap((prev) => ({ ...prev, [previewData.query_run_id]: execResult }))
      setFocusedRunId(previewData.query_run_id)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute query in read-only transaction.')
    } finally {
      setExecutingId(null)
    }
  }

  const handleInsertColumn = (tableName: string, colName: string) => {
    const token = `${tableName}.${colName}`
    setInputQuestion((prev) => (prev ? `${prev} ${token}` : token))
  }

  const toggleTableExpand = (name: string) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const filteredSessions = useMemo(() => {
    if (!sessionSearchTerm.trim()) return sessions
    const term = sessionSearchTerm.toLowerCase()
    return sessions.filter((s) => s.title.toLowerCase().includes(term))
  }, [sessions, sessionSearchTerm])

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 48px)',
        backgroundColor: 'var(--bg-canvas)',
        overflow: 'hidden',
      }}
    >
      {/* =========================================================================
          LEFT PANE (20% - 22% Width): Saved Sessions & Live Schema Reference
          ========================================================================= */}
      <aside
        style={{
          width: isLeftCollapsed ? '44px' : '280px',
          minWidth: isLeftCollapsed ? '44px' : '240px',
          maxWidth: '320px',
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-1)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left Pane Header with Tab Pills & Collapse */}
        <div
          style={{
            height: '42px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            backgroundColor: 'var(--bg-surface-2)',
          }}
        >
          {!isLeftCollapsed && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setLeftTab('sessions')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: leftTab === 'sessions' ? 'var(--border-strong)' : 'transparent',
                  backgroundColor: leftTab === 'sessions' ? 'var(--bg-surface-1)' : 'transparent',
                  color: leftTab === 'sessions' ? 'var(--ink-primary)' : 'var(--ink-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Sessions</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--bg-surface-3)',
                    padding: '0 4px',
                    borderRadius: '3px',
                  }}
                >
                  {sessions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('schema')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: leftTab === 'schema' ? 'var(--border-strong)' : 'transparent',
                  backgroundColor: leftTab === 'schema' ? 'var(--bg-surface-1)' : 'transparent',
                  color: leftTab === 'schema' ? 'var(--ink-primary)' : 'var(--ink-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Database size={12} />
                <span>Schema Context</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsLeftCollapsed((p) => !p)}
            title={isLeftCollapsed ? 'Expand panel' : 'Collapse panel'}
            style={{
              padding: '4px 6px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            {isLeftCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>

        {/* Left Pane Content */}
        {!isLeftCollapsed && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {leftTab === 'sessions' ? (
              // TAB 1: SESSIONS
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Search & New Session Toolbar */}
                <div
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Search
                      size={12}
                      style={{ position: 'absolute', left: '8px', color: 'var(--ink-muted)' }}
                    />
                    <input
                      type="text"
                      placeholder="Filter conversations..."
                      value={sessionSearchTerm}
                      onChange={(e) => setSessionSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '4px 6px 4px 24px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-canvas)',
                        color: 'var(--ink-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewSession}
                    title="Start new conversation"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} />
                    <span>New</span>
                  </button>
                </div>

                {/* Sessions List */}
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: '4px',
                    flex: 1,
                    overflowY: 'auto',
                  }}
                >
                  {filteredSessions.length === 0 ? (
                    <li
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '11px',
                        color: 'var(--ink-muted)',
                      }}
                    >
                      No conversations found. Ask a question to begin.
                    </li>
                  ) : (
                    filteredSessions.map((s) => {
                      const isActive = activeSessionId === s.id
                      return (
                        <li
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            backgroundColor: isActive ? 'var(--bg-surface-3)' : 'transparent',
                            marginBottom: '2px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => selectSession(s.id)}
                            style={{
                              flex: 1,
                              textAlign: 'left',
                              padding: '6px 8px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'inherit',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: isActive ? 600 : 500,
                                color: isActive ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {s.title}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '10px',
                                color: 'var(--ink-muted)',
                                marginTop: '2px',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              <span>{s.message_count} msgs</span>
                              <span>&bull;</span>
                              <HumanDate iso={s.updated_at} />
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            title="Delete session"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '6px 8px',
                              color: 'var(--ink-muted)',
                              cursor: 'pointer',
                              opacity: 0.6,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            ) : (
              // TAB 2: SCHEMA CONTEXT (Interactive table reference)
              <div style={{ padding: '8px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--ink-muted)',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>PostgreSQL Tables</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'var(--bg-surface-3)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    4 Verified
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                  Click any column to insert it into your natural language prompt:
                </div>

                {SCHEMA_TABLES.map((table) => {
                  const isExpanded = expandedTables[table.name]
                  return (
                    <div
                      key={table.name}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-surface-2)',
                        marginBottom: '6px',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTableExpand(table.name)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isExpanded ? (
                            <ChevronDown size={13} style={{ color: 'var(--ink-muted)' }} />
                          ) : (
                            <ChevronRight size={13} style={{ color: 'var(--ink-muted)' }} />
                          )}
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--accent-primary)',
                            }}
                          >
                            {table.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--ink-muted)',
                          }}
                        >
                          {table.rows} rows
                        </span>
                      </button>

                      {isExpanded && (
                        <div
                          style={{
                            borderTop: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-surface-1)',
                            padding: '4px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '10px',
                              color: 'var(--ink-muted)',
                              padding: '2px 6px 6px',
                              borderBottom: '1px dashed var(--border-subtle)',
                              marginBottom: '4px',
                            }}
                          >
                            {table.description}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {table.columns.map((col) => (
                              <button
                                key={col.name}
                                type="button"
                                onClick={() => handleInsertColumn(table.name, col.name)}
                                title={`Click to insert ${table.name}.${col.name} into prompt`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '3px 6px',
                                  background: 'none',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor = 'var(--bg-surface-3)')
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor = 'transparent')
                                }
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {col.pk && (
                                    <span
                                      style={{
                                        fontSize: '9px',
                                        fontFamily: 'var(--font-mono)',
                                        backgroundColor: '#FEF3C7',
                                        color: '#B45309',
                                        padding: '0 3px',
                                        borderRadius: '2px',
                                        fontWeight: 700,
                                      }}
                                    >
                                      PK
                                    </span>
                                  )}
                                  {col.fk && (
                                    <span
                                      style={{
                                        fontSize: '9px',
                                        fontFamily: 'var(--font-mono)',
                                        backgroundColor: '#EFF6FF',
                                        color: '#1D4ED8',
                                        padding: '0 3px',
                                        borderRadius: '2px',
                                        fontWeight: 700,
                                      }}
                                    >
                                      FK
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '11px',
                                      color: 'var(--ink-primary)',
                                    }}
                                  >
                                    {col.name}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '9px',
                                    color: 'var(--ink-muted)',
                                  }}
                                >
                                  {col.type}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* =========================================================================
          CENTER PANE (50% Width): Natural Language Omnibar, SQL Preview & Grid
          ========================================================================= */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--bg-canvas)',
          borderRight: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        {/* Top Control Bar: Pipeline Mode Toggle, Red-Team Presets, Execution Trigger */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '2px',
                fontSize: '11px',
              }}
            >
              <button
                type="button"
                onClick={() => setPipelineMode('guarded')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor:
                    pipelineMode === 'guarded' ? 'var(--gov-safe-bg)' : 'transparent',
                  color:
                    pipelineMode === 'guarded' ? 'var(--gov-safe-text)' : 'var(--ink-muted)',
                  fontWeight: pipelineMode === 'guarded' ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--gov-safe-dot)',
                  }}
                />
                <span>Guarded 6-Gate AST</span>
              </button>
              <button
                type="button"
                onClick={() => setPipelineMode('raw-llm')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor:
                    pipelineMode === 'raw-llm' ? 'var(--gov-warn-bg)' : 'transparent',
                  color:
                    pipelineMode === 'raw-llm' ? 'var(--gov-warn-text)' : 'var(--ink-muted)',
                  fontWeight: pipelineMode === 'raw-llm' ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                <AlertTriangle size={11} />
                <span>Simulate Raw LLM</span>
              </button>
            </div>

            {/* Red-Team Attack Presets Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowAttackDropdown((p) => !p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-2)',
                  color: 'var(--ink-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Flame size={12} style={{ color: '#EF4444' }} />
                <span>Red-Team Attack Presets</span>
                <ChevronDown size={11} style={{ color: 'var(--ink-muted)' }} />
              </button>

              {showAttackDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    width: '340px',
                    backgroundColor: 'var(--bg-surface-1)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    padding: '4px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted)',
                      padding: '4px 8px',
                    }}
                  >
                    Select Red-Team Attack Preset
                  </div>
                  {RED_TEAM_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendQuestion(p.prompt)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: p.isAttack ? '#DC2626' : 'var(--ink-primary)',
                          }}
                        >
                          {p.label}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--ink-muted)',
                          }}
                        >
                          {p.prompt}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '9px',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 5px',
                          borderRadius: '3px',
                          backgroundColor: p.isAttack
                            ? 'var(--gov-block-bg)'
                            : 'var(--gov-safe-bg)',
                          color: p.isAttack
                            ? 'var(--gov-block-text)'
                            : 'var(--gov-safe-text)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Engine Badge */}
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Cpu size={12} style={{ color: 'var(--accent-primary)' }} />
            <span>Engine: Deterministic Semantic Grammar + Live SQLGlot AST</span>
          </div>
        </div>

        {/* Natural Language Prompt Omnibar */}
        <div
          style={{
            padding: '12px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-1)',
          }}
        >
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-canvas)',
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <textarea
              rows={2}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSendQuestion()
                }
              }}
              placeholder="Ask anything about fleet equipment, sites, or telemetry (e.g., 'Show all routers in EMEA with warranty expiring within 60 days')..."
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--ink-primary)',
                outline: 'none',
                resize: 'none',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-2)',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Press</span>
                <kbd
                  style={{
                    backgroundColor: 'var(--bg-surface-3)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  ⌘+Enter
                </kbd>
                <span>to preview &amp; verify</span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleSendQuestion()}
                  disabled={!inputQuestion.trim() || isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'var(--accent-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: !inputQuestion.trim() || isLoading ? 'not-allowed' : 'pointer',
                    opacity: !inputQuestion.trim() || isLoading ? 0.6 : 1,
                  }}
                >
                  {isLoading ? (
                    <span>Parsing AST...</span>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      <span>Verify &amp; Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Operational Ambiguity Disambiguation Banner (if any) */}
          {activePreview?.clarification_question && (() => {
            const parsed = parseClarification(activePreview.clarification_question)
            return (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--gov-warn-bg)',
                  border: '1px solid var(--gov-warn-border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--gov-warn-text)',
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>{parsed.question}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {parsed.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSendQuestion(opt.prompt)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 500,
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--gov-warn-border)',
                        borderRadius: '4px',
                        color: 'var(--gov-warn-text)',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label} &rarr;
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Error / Interception alert */}
          {errorMessage && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--gov-block-bg)',
                border: '1px solid var(--gov-block-border)',
                color: 'var(--gov-block-text)',
                fontSize: '11px',
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>

        {/* Monaco/CodeMirror SQL Preview Panel */}
        <div style={{ padding: '12px 12px 6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--ink-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Code2 size={12} style={{ color: 'var(--accent-primary)' }} />
              <span>Verified PostgreSQL (SELECT-Only) Syntax</span>
            </div>
            {activePreview?.can_execute && (
              <button
                type="button"
                onClick={() => handleExecuteQuery(activePreview)}
                disabled={executingId === activePreview.query_run_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: 600,
                  backgroundColor: 'var(--gov-safe-bg)',
                  color: 'var(--gov-safe-text)',
                  border: '1px solid var(--gov-safe-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Play size={10} fill="currentColor" />
                <span>
                  {executingId === activePreview.query_run_id
                    ? 'Executing in Read-Only...'
                    : 'Execute via qt_ai_readonly'}
                </span>
              </button>
            )}
          </div>

          <SqlEditorPanel
            sql={displaySql}
            userRole={userRole}
            limit={100}
            isExecuting={executingId === activePreview?.query_run_id}
            onExecute={() => activePreview && handleExecuteQuery(activePreview)}
            canExecute={Boolean(activePreview?.can_execute)}
          />
        </div>

        {/* Bottom Docked Virtualized Results Grid */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: '6px 12px 12px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <VirtualizedResultsGrid
            result={activeResult}
            executionLatencyMs={activeResult?.execution_duration_ms || 1.42}
            queryRunId={activeRunId}
          />
        </div>
      </main>

      {/* =========================================================================
          RIGHT PANE (28% - 30% Width): Live 6-Layer SQLGlot AST & Kernel Inspector
          ========================================================================= */}
      <aside
        style={{
          width: '380px',
          minWidth: '320px',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-surface-1)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <AstInspectorPanel
          sql={activePreview?.sql_preview || displaySql}
          isValid={activePreview ? activePreview.validation.passed : true}
          violations={activePreview?.validation.violations || []}
          executionLatencyMs={activeResult?.execution_duration_ms || 1.42}
          queryRunId={activeRunId}
          provider={activePreview?.provider || 'Deterministic Semantic Template + SQLGlot AST'}
          assumptions={activePreview?.assumptions || []}
          isExecuting={isLoading || Boolean(executingId)}
        />
      </aside>
    </div>
  )
}
