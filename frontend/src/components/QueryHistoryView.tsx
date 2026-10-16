import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Shield,
  CheckCircle2,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Search,
  X,
  ChevronRight,
  Zap,
  Database,
} from 'lucide-react'
import {
  fetchQueryHistory,
  submitQueryFeedback,
  type QueryHistoryItem,
  type QueryHistoryResponse,
} from '../api/client'
import { withLayoutTransition } from '../motion'
import { readUrlParam, replaceUrlParams } from '../urlState'
import { ExplainButton } from './ExplainButton'
import { useTheme } from '../context/ThemeContext'
import './QueryHistoryView.css'

export const QueryHistoryView: React.FC = () => {
  const { mode } = useTheme()
  const [data, setData] = useState<QueryHistoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showSqlInSimple, setShowSqlInSimple] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>(() => readUrlParam('status') || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<QueryHistoryItem | null>(null)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [copiedRunId, setCopiedRunId] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const loadHistory = async (page: number, status?: string) => {
    setIsLoading(true)
    setIsRefreshing(true)
    setErrorMessage(null)
    try {
      const res = await fetchQueryHistory(page, 15, status || undefined)
      withLayoutTransition(() => setData(res))
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load query history.')
    } finally {
      withLayoutTransition(() => {
        setIsLoading(false)
        setIsRefreshing(false)
      })
    }
  }

  useEffect(() => {
    loadHistory(currentPage, statusFilter)
  }, [currentPage, statusFilter])

  useEffect(() => {
    replaceUrlParams({ status: statusFilter })
  }, [statusFilter])

  const handleFilterChange = (newStatus: string) => {
    withLayoutTransition(() => {
      setStatusFilter(newStatus)
      setCurrentPage(1)
    })
  }

  useEffect(() => {
    const syncFilterFromBrowserHistory = () => {
      withLayoutTransition(() => {
        setStatusFilter(readUrlParam('status') || '')
        setCurrentPage(1)
      })
    }
    window.addEventListener('popstate', syncFilterFromBrowserHistory)
    return () => window.removeEventListener('popstate', syncFilterFromBrowserHistory)
  }, [])

  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const drawerPanelRef = useRef<HTMLDivElement>(null)

  // Focus management for drawer: focus first element on open
  useEffect(() => {
    if (!selectedItem) return
    const timer = setTimeout(() => {
      const focusable = drawerPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable && focusable.length > 0) {
        focusable[0].focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedItem])

  // Keyboard shortcut '/' to focus search input, 'Escape' to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape' && selectedItem) {
        handleCloseDrawer()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem])

  // Keydown handler to trap focus within drawer
  const handleDrawerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCloseDrawer()
      return
    }
    if (e.key === 'Tab') {
      const focusable = drawerPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }

  const handleOpenDrawer = (item: QueryHistoryItem) => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement
    setSelectedItem(item)
    setFeedbackInput(item.feedback_explanation || '')
    setFeedbackSuccess(false)
    setCopiedSql(false)
    setCopiedRunId(false)
  }

  const handleCloseDrawer = () => {
    setSelectedItem(null)
    lastFocusedElementRef.current?.focus()
  }

  const handleCopySql = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql)
      setCopiedSql(true)
      setTimeout(() => setCopiedSql(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleCopyRunId = async (runId: string) => {
    try {
      await navigator.clipboard.writeText(runId)
      setCopiedRunId(true)
      setTimeout(() => setCopiedRunId(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleSubmitFeedback = async (isHelpful: boolean) => {
    if (!selectedItem) return
    try {
      await submitQueryFeedback(selectedItem.id, isHelpful, feedbackInput)
      setFeedbackSuccess(true)
      setSelectedItem((prev) =>
        prev ? { ...prev, is_helpful: isHelpful, feedback_explanation: feedbackInput } : null
      )
      // Update item in local state
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === selectedItem.id
              ? { ...i, is_helpful: isHelpful, feedback_explanation: feedbackInput }
              : i
          ),
        }
      })
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`)
    }
  }

  const handleInlineFeedback = async (
    itemId: string,
    isHelpful: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    try {
      await submitQueryFeedback(itemId, isHelpful, '')
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, is_helpful: isHelpful } : i
          ),
        }
      })
    } catch (err: any) {
      alert(`Feedback rating failed: ${err.message}`)
    }
  }

  // Aggregate stats from current data
  const totalQueries = data?.total || 0
  const executedCount = data?.items.filter((i) => i.status === 'executed').length || 0
  const blockedCount = data?.items.filter((i) => i.status === 'blocked').length || 0
  const avgDuration =
    data?.items && data.items.length > 0
      ? Math.round(
          data.items.reduce((acc, curr) => acc + (curr.execution_duration_ms || 0), 0) /
            data.items.length
        )
      : 0

  // Filter items by client search query
  const filteredItems = useMemo(() => {
    if (!data?.items) return []
    if (!searchQuery.trim()) return data.items
    const q = searchQuery.toLowerCase().trim()
    return data.items.filter((item) => {
      const matchQuestion = item.question.toLowerCase().includes(q)
      const matchInterpreted = item.interpreted_question?.toLowerCase().includes(q)
      const matchSql = item.generated_sql?.toLowerCase().includes(q)
      const matchStatus = item.status.toLowerCase().includes(q)
      const matchId = item.id.toLowerCase().includes(q)
      return matchQuestion || matchInterpreted || matchSql || matchStatus || matchId
    })
  }, [data?.items, searchQuery])

  // Count by status for segmented pills
  const statusCounts = useMemo(() => {
    if (!data?.items) {
      return { all: 0, executed: 0, previewed: 0, blocked: 0, clarification_needed: 0, unsupported: 0 }
    }
    return {
      all: data.total || data.items.length,
      executed: data.items.filter((i) => i.status === 'executed').length,
      previewed: data.items.filter((i) => i.status === 'previewed').length,
      blocked: data.items.filter((i) => i.status === 'blocked').length,
      clarification_needed: data.items.filter((i) => i.status === 'clarification_needed').length,
      unsupported: data.items.filter((i) => i.status === 'unsupported').length,
    }
  }, [data])

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const dateFormatted = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const timeFormatted = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      return { date: dateFormatted, time: timeFormatted }
    } catch {
      return { date: '—', time: '—' }
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'executed':
        return (
          <span className="semantic-badge executed">
            <span className="semantic-dot" />
            Executed
          </span>
        )
      case 'previewed':
        return (
          <span className="semantic-badge previewed">
            <span className="semantic-dot" />
            Previewed
          </span>
        )
      case 'blocked':
        return (
          <span className="semantic-badge blocked">
            <span className="semantic-dot" />
            Blocked
          </span>
        )
      case 'clarification_needed':
        return (
          <span className="semantic-badge clarification">
            <span className="semantic-dot" />
            Clarification
          </span>
        )
      case 'unsupported':
      default:
        return (
          <span className="semantic-badge unsupported">
            <span className="semantic-dot" />
            Unsupported
          </span>
        )
    }
  }

  // Lightweight SQL syntax highlighter
  const renderSyntaxHighlightedSql = (sql: string) => {
    if (!sql) return null
    const tokenRegex = /(\b(?:SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|ORDER BY|LIMIT|OFFSET|AS|AND|OR|NOT|IN|IS NULL|IS NOT NULL|DESC|ASC|COUNT|SUM|AVG|MIN|MAX|HAVING|DISTINCT|ON|CASE|WHEN|THEN|ELSE|END|CAST|INTERVAL)\b)|('[^']*')|(\b\d+(?:\.\d+)?\b)/gi
    const parts = sql.split(tokenRegex)
    return parts.filter(Boolean).map((part, index) => {
      if (
        /^(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|ORDER BY|LIMIT|OFFSET|AS|AND|OR|NOT|IN|IS NULL|IS NOT NULL|DESC|ASC|COUNT|SUM|AVG|MIN|MAX|HAVING|DISTINCT|ON|CASE|WHEN|THEN|ELSE|END|CAST|INTERVAL)$/i.test(
          part
        )
      ) {
        return (
          <span key={index} className="sql-kw">
            {part}
          </span>
        )
      }
      if (part.startsWith("'") && part.endsWith("'")) {
        return (
          <span key={index} className="sql-str">
            {part}
          </span>
        )
      }
      if (/^\d+(?:\.\d+)?$/.test(part)) {
        return (
          <span key={index} className="sql-num">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="query-history-view">
      {/* 1. HIGH-DENSITY TELEMETRY STRIP */}
      <div className="telemetry-grid">
        {/* Card 1: Recorded Query Runs */}
        <div className="telemetry-card">
          <div className="telemetry-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="telemetry-card-title">Recorded Query Runs</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="telemetry-badge-mono">pg_query_runs</span>
              <ExplainButton
                title="Recorded Query Runs"
                explanation="Every single question and query is permanently logged to an audit table. Nothing runs without an immutable record."
              />
            </div>
          </div>
          <div className="telemetry-card-value">{totalQueries}</div>
          <div className="telemetry-card-subtitle">Audited in PostgreSQL query_runs</div>
        </div>

        {/* Card 2: Executed (SELECT-Only) */}
        <div className="telemetry-card">
          <div className="telemetry-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="telemetry-card-title">Executed (SELECT-Only)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="telemetry-badge-emerald">
                <span className="telemetry-status-dot" />
                READ-ONLY
              </span>
              <ExplainButton
                title="SELECT-Only Execution"
                explanation="These queries passed all safety checks and executed successfully. They use a dedicated read-only role that cannot modify tables."
              />
            </div>
          </div>
          <div className="telemetry-card-value">{executedCount}</div>
          <div className="telemetry-card-subtitle">Completed read-only transactions</div>
        </div>

        {/* Card 3: AST Safety Blocks */}
        <div className="telemetry-card">
          <div className="telemetry-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="telemetry-card-title">AST Safety Blocks</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`telemetry-badge-shield ${blockedCount > 0 ? 'blocked' : 'clear'}`}>
                <Shield size={11} />
                Safety Check
              </span>
              <ExplainButton
                title="Safety Blocks"
                explanation="Queries with harmful keywords like DROP or unauthorized tables are blocked before reaching the database. Your data is always protected."
              />
            </div>
          </div>
          <div className="telemetry-card-value">{blockedCount}</div>
          <div className="telemetry-card-subtitle">Intercepted by SQLGlot guard</div>
        </div>

        {/* Card 4: Average execution latency */}
        <div className="telemetry-card">
          <div className="telemetry-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="telemetry-card-title">Average execution latency</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="telemetry-badge-p95">CURRENT PAGE</span>
              <ExplainButton
                title="Average Execution Latency"
                explanation="The time from submitting a question to receiving safe results. Ensures quick answers for plant and operations teams."
              />
            </div>
          </div>
          <div className="telemetry-card-value">
            {avgDuration}
            <span className="telemetry-card-unit">ms</span>
          </div>
          <div className="telemetry-card-subtitle">Execution duration</div>
        </div>
      </div>

      {/* 2. UNIFIED COMMAND TOOLBAR */}
      <div className="command-toolbar">
        {/* Left Side: Segmented Filter Pills in Clean Title Case */}
        <div className="segmented-track">
          <button
            className={`segmented-tab ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => handleFilterChange('')}
          >
            All
            <span className="tab-count-badge">{statusCounts.all}</span>
          </button>
          <button
            className={`segmented-tab ${statusFilter === 'executed' ? 'active' : ''}`}
            onClick={() => handleFilterChange('executed')}
          >
            Executed
            <span className="tab-count-badge">{statusCounts.executed}</span>
          </button>
          <button
            className={`segmented-tab ${statusFilter === 'previewed' ? 'active' : ''}`}
            onClick={() => handleFilterChange('previewed')}
          >
            Previewed
            <span className="tab-count-badge">{statusCounts.previewed}</span>
          </button>
          <button
            className={`segmented-tab ${statusFilter === 'blocked' ? 'active' : ''}`}
            onClick={() => handleFilterChange('blocked')}
          >
            Blocked
            <span className="tab-count-badge">{statusCounts.blocked}</span>
          </button>
          <button
            className={`segmented-tab ${statusFilter === 'clarification_needed' ? 'active' : ''}`}
            onClick={() => handleFilterChange('clarification_needed')}
          >
            Clarification
            <span className="tab-count-badge">{statusCounts.clarification_needed}</span>
          </button>
          <button
            className={`segmented-tab ${statusFilter === 'unsupported' ? 'active' : ''}`}
            onClick={() => handleFilterChange('unsupported')}
          >
            Unsupported
            <span className="tab-count-badge">{statusCounts.unsupported}</span>
          </button>
        </div>

        {/* Right Side: Search + Refresh */}
        <div className="toolbar-right">
          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search queries, AST rules, or tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-kbd-badge">/</span>
          </div>

          <button
            className="refresh-toolbar-btn"
            onClick={() => loadHistory(currentPage, statusFilter)}
            title="Refresh query history"
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin-animation' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div className="security-alert-box alert-error">
          <div className="alert-title">History Load Error</div>
          <div className="alert-desc">{errorMessage}</div>
        </div>
      )}

      {/* 3. ENTERPRISE AUDIT LOG TABLE (Aligned Padding px-5 / 20px) */}
      <div className="audit-table-card layout-transition-target">
        <div className="audit-table-container">
          <table className="audit-table">
            <thead>
              <tr className="audit-table-header">
                <th style={{ width: '140px' }}>TIMESTAMP</th>
                <th>QUESTION INTENT</th>
                <th style={{ width: '140px' }}>STATUS</th>
                <th style={{ width: '120px' }}>ROW COUNT</th>
                <th style={{ width: '150px' }}>EXECUTION LATENCY</th>
                <th style={{ width: '140px' }}>HELPFUL RATING</th>
                <th style={{ width: '110px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div className="table-loading-spinner" style={{ margin: '0 auto 0.75rem auto' }} />
                    <span style={{ fontSize: '12.5px', color: '#71706B' }}>
                      Loading verified audit records...
                    </span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#141413' }}>
                      No queries found
                    </div>
                    <div style={{ fontSize: '12px', color: '#71706B', marginTop: '0.25rem' }}>
                      {searchQuery
                        ? `No results matching "${searchQuery}"`
                        : 'No queries recorded for the selected status filter.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const ts = formatTimestamp(item.created_at)
                  return (
                    <tr key={item.id} className="audit-table-row group">
                      {/* Timestamp Column */}
                      <td>
                        <div className="timestamp-wrap">
                          <span className="timestamp-date">{ts.date}</span>
                          <span className="timestamp-time">{ts.time}</span>
                        </div>
                      </td>

                      {/* Question Intent Column (Legible Charcoal & High Contrast Subtitle) */}
                      <td>
                        <div className="intent-wrap">
                          <div className="intent-primary">{item.question}</div>
                          {item.interpreted_question && (
                            <div className="intent-secondary" title={item.interpreted_question}>
                              {item.interpreted_question}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td>{renderStatusBadge(item.status)}</td>

                      {/* Row Count Column */}
                      <td>
                        {item.row_count !== null && item.row_count !== undefined ? (
                          <span className="row-count-value">{item.row_count} rows</span>
                        ) : (
                          <span className="empty-metric-dash">—</span>
                        )}
                      </td>

                      {/* Execution Latency Column */}
                      <td>
                        {item.execution_duration_ms ? (
                          <span className="latency-pill">
                            <Zap size={11} />
                            {item.execution_duration_ms} ms
                          </span>
                        ) : (
                          <span className="empty-metric-dash">—</span>
                        )}
                      </td>

                      {/* Helpful Rating Column */}
                      <td>
                        {item.is_helpful === true ? (
                          <button
                            type="button"
                            className="rated-pill helpful"
                            onClick={(e) => handleInlineFeedback(item.id, false, e)}
                            aria-label="Change query rating to needs improvement"
                          >
                            <ThumbsUp size={11} /> Helpful
                          </button>
                        ) : item.is_helpful === false ? (
                          <button
                            type="button"
                            className="rated-pill unhelpful"
                            onClick={(e) => handleInlineFeedback(item.id, true, e)}
                            aria-label="Change query rating to helpful"
                          >
                            <ThumbsDown size={11} /> Unhelpful
                          </button>
                        ) : (
                          <div className="rating-buttons-wrap">
                            <button
                              type="button"
                              className="rate-micro-btn unrated thumbs-up"
                              aria-label="Mark query as helpful"
                              onClick={(e) => handleInlineFeedback(item.id, true, e)}
                            >
                              <ThumbsUp size={12} />
                            </button>
                            <button
                              type="button"
                              className="rate-micro-btn unrated thumbs-down"
                              aria-label="Mark query as needs improvement"
                              onClick={(e) => handleInlineFeedback(item.id, false, e)}
                            >
                              <ThumbsDown size={12} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions Column (Inspect Button with refined physics) */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="inspect-action-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDrawer(item)
                          }}
                        >
                          Inspect
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data && data.total_pages > 1 && (
          <div className="pagination-bar" style={{ borderTop: '1px solid #EFECE6' }}>
            <span style={{ fontSize: '12px', color: '#71706B' }}>
              Showing {filteredItems.length} of {data.total} recorded queries
            </span>
            <div className="pagination-controls">
              <span className="page-current" style={{ fontSize: '12px' }}>
                Page {data.page} of {data.total_pages}
              </span>
              <div className="page-buttons">
                <button
                  className="page-nav-btn"
                  disabled={data.page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                <button
                  className="page-nav-btn"
                  disabled={data.page >= data.total_pages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. SLIDE-OVER AST & SQL INSPECTOR DRAWER (PORTAL ATTACHED) */}
      {selectedItem &&
        createPortal(
          <div className="slideover-backdrop" onClick={handleCloseDrawer}>
            <div
              ref={drawerPanelRef}
              className="slideover-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="query-history-drawer-title"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleDrawerKeyDown}
            >
              {/* Drawer Header */}
              <div className="slideover-header">
                <div className="slideover-header-top">
                  <div className="slideover-header-badges">
                    <button
                      className="run-id-pill"
                      onClick={() => handleCopyRunId(selectedItem.id)}
                      title="Click to copy Run ID"
                    >
                      <span>run_id:</span>
                      <span>{selectedItem.id.slice(0, 8)}...</span>
                      {copiedRunId ? <Check size={12} color="var(--qt-accent, #FF4F00)" /> : <Copy size={12} />}
                    </button>

                    {renderStatusBadge(selectedItem.status)}

                    {selectedItem.execution_duration_ms ? (
                      <span className="latency-pill-dark">
                        <Zap size={10} />
                        {selectedItem.execution_duration_ms} ms
                      </span>
                    ) : null}
                  </div>

                  <button
                    className="slideover-close-btn"
                    onClick={handleCloseDrawer}
                    title="Close inspector (Esc)"
                    aria-label="Close inspection drawer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="slideover-header-meta">
                  <h3 id="query-history-drawer-title" className="sr-only">
                    Query Record Inspection {selectedItem.id}
                  </h3>
                  <span>
                    Recorded: {new Date(selectedItem.created_at).toLocaleString()}
                  </span>
                  {selectedItem.row_count !== null && selectedItem.row_count !== undefined && (
                    <span>{selectedItem.row_count} rows returned</span>
                  )}
                </div>
              </div>

              {/* Drawer Body */}
              <div className="slideover-body">
                {/* Natural Language Question & Target Database */}
                <div>
                  <div className="drawer-section-label">Natural Language Question & Scope</div>
                  <div className="drawer-prompt-box">
                    <div className="prompt-target-db-row">
                      <span style={{ fontSize: '11px', color: '#8A8884', fontWeight: 600 }}>
                        TARGET DATABASE
                      </span>
                      <span className="target-db-badge">
                        <Database size={11} /> PostgreSQL 16 (Synthetic Catalog - Read-Only)
                      </span>
                    </div>
                    <div className="prompt-question">{selectedItem.question}</div>
                    {selectedItem.interpreted_question && (
                      <div className="prompt-interpreted">
                        <span>↳</span>
                        <span>{selectedItem.interpreted_question}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Validated Candidate SQL Block */}
                {selectedItem.generated_sql && (
                  <div>
                    <div className="drawer-section-label">
                      <span>{mode === 'simple' ? 'Generated Query' : 'Validated Candidate SQL'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {mode === 'simple' && (
                          <button
                            type="button"
                            className="copy-code-btn"
                            onClick={() => setShowSqlInSimple(!showSqlInSimple)}
                          >
                            {showSqlInSimple ? 'Hide SQL' : 'View SQL query'}
                          </button>
                        )}
                        <button
                          className="copy-code-btn"
                          onClick={() => handleCopySql(selectedItem.generated_sql)}
                        >
                          {copiedSql ? (
                            <>
                              <Check size={12} color="var(--qt-accent, #FF4F00)" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy SQL
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {(mode === 'expert' || showSqlInSimple) ? (
                      <pre className="sql-code-panel">
                        <code>{renderSyntaxHighlightedSql(selectedItem.generated_sql)}</code>
                      </pre>
                    ) : (
                      <div
                        style={{
                          background: 'var(--qt-surface-muted)',
                          border: '1px solid var(--qt-border)',
                          borderRadius: 'var(--qt-radius-inner)',
                          padding: '0.75rem 1rem',
                          fontSize: '0.8rem',
                          color: 'var(--qt-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Raw SQL is tucked away in Simple view</span>
                        <button
                          type="button"
                          className="copy-code-btn"
                          onClick={() => setShowSqlInSimple(true)}
                        >
                          Inspect SQL
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Documented System Policy (SQLGlot Engine) */}
                <div>
                  <div className="drawer-section-label">
                    <span>Documented System Policy (SQLGlot Engine)</span>
                    <span className="param-pill" style={{ color: 'var(--qt-muted)', fontSize: '10px' }}>
                      Global Architecture
                    </span>
                  </div>
                  <div className="ast-verification-card">
                    <div className="ast-step-item">
                      <Shield size={14} style={{ color: 'var(--qt-accent)', marginTop: 2, flexShrink: 0 }} />
                      <div className="ast-step-content">
                        <div className="ast-step-title">Single SELECT Constraint</div>
                        <div className="ast-step-desc">
                          Static policy enforces single-statement SELECT queries; multi-statement and non-query commands are rejected.
                        </div>
                      </div>
                    </div>

                    <div className="ast-step-item">
                      <Shield size={14} style={{ color: 'var(--qt-accent)', marginTop: 2, flexShrink: 0 }} />
                      <div className="ast-step-content">
                        <div className="ast-step-title">Prohibited Mutation Nodes</div>
                        <div className="ast-step-desc">
                          AST parser validates absence of DROP, ALTER, INSERT, UPDATE, DELETE, TRUNCATE, and GRANT nodes.
                        </div>
                      </div>
                    </div>

                    <div className="ast-step-item">
                      <Shield size={14} style={{ color: 'var(--qt-accent)', marginTop: 2, flexShrink: 0 }} />
                      <div className="ast-step-content">
                        <div className="ast-step-title">Catalog Table Allowlist</div>
                        <div className="ast-step-desc">
                          Execution is restricted to catalog tables: devices, sites, service_events, telemetry_readings.
                        </div>
                      </div>
                    </div>

                    {/* Governance Parameters Strip */}
                    <div className="governance-params-strip">
                      <span className="param-pill">Policy: SELECT-only reader</span>
                      <span className="param-pill">Timeout: 5s statement cap</span>
                      <span className="param-pill">Clamp: 1,000 rows max</span>
                    </div>
                  </div>
                </div>

                {/* Operator Helpfulness Feedback Form */}
                <div>
                  <div className="drawer-section-label">Operator Helpfulness Feedback</div>
                  <div className="drawer-feedback-card">
                    <div style={{ fontSize: '12px', color: '#8A8884', lineHeight: 1.4 }}>
                      Was this query translation accurate and useful for operational analysis?
                    </div>

                    <div className="feedback-buttons-row">
                      <button
                        className={`feedback-btn ${
                          selectedItem.is_helpful === true ? 'active-helpful' : ''
                        }`}
                        onClick={() => handleSubmitFeedback(true)}
                      >
                        <ThumbsUp size={13} />
                        Helpful Query
                      </button>
                      <button
                        className={`feedback-btn ${
                          selectedItem.is_helpful === false ? 'active-unhelpful' : ''
                        }`}
                        onClick={() => handleSubmitFeedback(false)}
                      >
                        <ThumbsDown size={13} />
                        Needs Improvement
                      </button>
                    </div>

                    <textarea
                      className="feedback-textarea"
                      rows={2}
                      placeholder="Optional operator notes or feedback justification..."
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        className="feedback-save-btn"
                        onClick={() => handleSubmitFeedback(selectedItem.is_helpful ?? true)}
                      >
                        Save Notes
                      </button>
                      {feedbackSuccess && (
                        <span className="feedback-success-msg">
                          <CheckCircle2 size={13} /> Saved to query_feedback
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
