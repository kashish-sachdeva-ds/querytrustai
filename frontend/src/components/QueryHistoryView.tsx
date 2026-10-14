import React, { useState, useEffect } from 'react'
import {
  fetchQueryHistory,
  submitQueryFeedback,
  type QueryHistoryItem,
  type QueryHistoryResponse,
} from '../api/client'

export const QueryHistoryView: React.FC = () => {
  const [data, setData] = useState<QueryHistoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<QueryHistoryItem | null>(null)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  const loadHistory = async (page: number, status?: string) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const res = await fetchQueryHistory(page, 15, status || undefined)
      setData(res)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load query history.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(currentPage, statusFilter)
  }, [currentPage, statusFilter])

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    setCurrentPage(1)
  }

  const handleOpenModal = (item: QueryHistoryItem) => {
    setSelectedItem(item)
    setFeedbackInput(item.feedback_explanation || '')
    setFeedbackSuccess(false)
  }

  const handleCloseModal = () => {
    setSelectedItem(null)
  }

  const handleSubmitFeedback = async (isHelpful: boolean) => {
    if (!selectedItem) return
    try {
      await submitQueryFeedback(selectedItem.id, isHelpful, feedbackInput)
      setFeedbackSuccess(true)
      // Update local state
      setSelectedItem((prev) =>
        prev ? { ...prev, is_helpful: isHelpful, feedback_explanation: feedbackInput } : null
      )
      loadHistory(currentPage, statusFilter)
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`)
    }
  }

  // Aggregate stats
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

  return (
    <div className="view-container">
      {/* Top Metric Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Recorded Query Runs</div>
          <div className="kpi-value">{totalQueries}</div>
          <div className="kpi-subtitle">Audited in PostgreSQL query_runs</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Executed (SELECT-Only)</div>
          <div className="kpi-value" style={{ color: '#34d399' }}>
            {executedCount}
          </div>
          <div className="kpi-subtitle">Completed read-only transactions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">AST Safety Blocks</div>
          <div className="kpi-value" style={{ color: '#f87171' }}>
            {blockedCount}
          </div>
          <div className="kpi-subtitle">Intercepted by SQLGlot guard</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Average DB Latency</div>
          <div className="kpi-value" style={{ color: '#60a5fa' }}>
            {avgDuration} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>ms</span>
          </div>
          <div className="kpi-subtitle">Execution duration</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar" style={{ marginTop: '1.25rem' }}>
        <div className="filter-group">
          <span className="filter-label">Filter by Status:</span>
          <div className="filter-chips">
            {['', 'executed', 'previewed', 'blocked', 'clarification_needed', 'unsupported'].map(
              (st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleFilterChange(st)}
                >
                  {st === '' ? 'All Statuses' : st.replace('_', ' ').toUpperCase()}
                </button>
              )
            )}
          </div>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => loadHistory(currentPage, statusFilter)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="security-alert-box alert-error" style={{ marginTop: '1rem' }}>
          <div className="alert-title">History Load Error</div>
          <div className="alert-desc">{errorMessage}</div>
        </div>
      )}

      {/* History Table */}
      <div className="data-table-card" style={{ marginTop: '1rem' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Question Intent</th>
                <th>Status</th>
                <th>Row Count</th>
                <th>Execution Latency</th>
                <th>Helpful Rating</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="table-loading-spinner" style={{ margin: '0 auto 0.5rem auto' }} />
                    <span className="text-muted">Loading audit records...</span>
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="empty-state-text">No queries found matching the active criteria.</div>
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="interactive-row" onClick={() => handleOpenModal(item)}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#f8fafc' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#e2e8f0', maxWidth: '340px' }} className="truncate">
                        {item.question}
                      </div>
                      {item.interpreted_question && (
                        <div style={{ fontSize: '0.725rem', color: '#94a3b8', maxWidth: '340px' }} className="truncate">
                          {item.interpreted_question}
                        </div>
                      )}
                    </td>
                    <td>
                      {item.status === 'executed' && (
                        <span className="status-tag status-success">Executed</span>
                      )}
                      {item.status === 'previewed' && (
                        <span className="status-tag status-warning">Previewed</span>
                      )}
                      {item.status === 'blocked' && (
                        <span className="status-tag status-danger">Blocked</span>
                      )}
                      {item.status === 'clarification_needed' && (
                        <span className="status-tag status-warning">Clarification</span>
                      )}
                      {item.status === 'unsupported' && (
                        <span className="status-tag status-neutral">Unsupported</span>
                      )}
                    </td>
                    <td>
                      {item.row_count !== null && item.row_count !== undefined ? (
                        <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{item.row_count} rows</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {item.execution_duration_ms ? (
                        <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                          ⚡ {item.execution_duration_ms} ms
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {item.is_helpful === true && (
                        <span className="badge badge-success">👍 Helpful</span>
                      )}
                      {item.is_helpful === false && (
                        <span className="badge badge-danger">👎 Unhelpful</span>
                      )}
                      {item.is_helpful === null && <span className="text-muted">Unrated</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="inspect-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenModal(item)
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {data && data.total_pages > 1 && (
          <div className="pagination-bar">
            <span>
              Showing {data.items.length} of {data.total} recorded queries
            </span>
            <div className="pagination-controls">
              <span className="page-current">
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

      {/* Query Detail Modal Drawer */}
      {selectedItem && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="modal-drawer-header">
              <div>
                <h3 className="modal-drawer-title">Query Execution Audit</h3>
                <span className="run-id-code" style={{ fontSize: '0.75rem' }}>
                  {selectedItem.id}
                </span>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <div className="modal-drawer-body">
              {/* Question Intent */}
              <div className="drawer-section">
                <div className="drawer-section-title">Natural Language Question</div>
                <div className="drawer-value-box">{selectedItem.question}</div>
              </div>

              {selectedItem.interpreted_question && (
                <div className="drawer-section">
                  <div className="drawer-section-title">Interpreted Intent</div>
                  <div className="drawer-value-box" style={{ color: '#93c5fd' }}>
                    {selectedItem.interpreted_question}
                  </div>
                </div>
              )}

              {/* Status and Latency KPIs */}
              <div className="spec-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="spec-card">
                  <div className="spec-label">Execution Status</div>
                  <div className="spec-value" style={{ textTransform: 'capitalize' }}>
                    {selectedItem.status}
                  </div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">Rows Returned</div>
                  <div className="spec-value">{selectedItem.row_count ?? '—'}</div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">DB Latency</div>
                  <div className="spec-value">
                    {selectedItem.execution_duration_ms ? `${selectedItem.execution_duration_ms} ms` : '—'}
                  </div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">Executed At</div>
                  <div className="spec-value">
                    {selectedItem.executed_at ? new Date(selectedItem.executed_at).toLocaleTimeString() : 'Not executed'}
                  </div>
                </div>
              </div>

              {/* SQL Statement Block */}
              {selectedItem.generated_sql && (
                <div className="drawer-section">
                  <div className="drawer-section-title">Validated Candidate SQL</div>
                  <pre className="sql-code-box" style={{ borderRadius: 'var(--radius-sm)' }}>
                    <code>{selectedItem.generated_sql}</code>
                  </pre>
                </div>
              )}

              {/* Interactive Helpfulness Feedback Form */}
              <div className="drawer-section" style={{ marginTop: '1.5rem', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div className="drawer-section-title" style={{ color: '#fbbf24' }}>
                  Operator Helpfulness Feedback
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0.75rem 0' }}>
                  Was this generated query and result accurate and useful?
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <button
                    className={`btn btn-sm ${selectedItem.is_helpful === true ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSubmitFeedback(true)}
                  >
                    👍 Helpful Query
                  </button>
                  <button
                    className={`btn btn-sm ${selectedItem.is_helpful === false ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => handleSubmitFeedback(false)}
                  >
                    👎 Needs Improvement
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    className="query-textarea"
                    rows={2}
                    placeholder="Optional operator notes or explanation..."
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => handleSubmitFeedback(selectedItem.is_helpful ?? true)}
                  >
                    Save Notes
                  </button>
                </div>

                {feedbackSuccess && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>
                    ✓ Feedback saved to query_feedback table.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
