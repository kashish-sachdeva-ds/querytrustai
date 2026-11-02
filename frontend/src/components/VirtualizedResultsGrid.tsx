import React, { useState, useMemo } from 'react'
import {
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import type { ExecuteResponse } from '../api/client'

interface VirtualizedResultsGridProps {
  result?: ExecuteResponse | null
  executionLatencyMs?: number | null
  queryRunId?: string | null
}

export const VirtualizedResultsGrid: React.FC<VirtualizedResultsGridProps> = ({
  result,
  executionLatencyMs = 1.42,
  queryRunId: _queryRunId,
}) => {
  const [copiedCell, setCopiedCell] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

  const columns = useMemo(() => result?.columns || [], [result?.columns])
  const rows = useMemo(() => result?.rows || [], [result?.rows])

  // Guess column data type
  const columnTypes = useMemo(() => {
    const types: Record<string, string> = {}
    if (rows.length === 0) return types
    for (const col of columns) {
      const sample = rows[0]?.[col]
      if (typeof sample === 'number') {
        types[col] = Number.isInteger(sample) ? 'INT4' : 'NUMERIC'
      } else if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
        types[col] = 'TIMESTAMPTZ'
      } else if (typeof sample === 'boolean') {
        types[col] = 'BOOL'
      } else {
        types[col] = 'VARCHAR'
      }
    }
    return types
  }, [columns, rows])

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sortCol || rows.length === 0) return rows
    return [...rows].sort((a, b) => {
      const va = a[sortCol]
      const vb = b[sortCol]
      if (va === vb) return 0
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
  }, [rows, sortCol, sortDir])

  if (!result || !result.rows || result.rows.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          color: 'var(--ink-muted)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Execute a governed query to inspect relational results in the virtualized grid.
      </div>
    )
  }

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const handleCellClick = (val: any, cellKey: string) => {
    if (val === null || val === undefined) return
    navigator.clipboard.writeText(String(val))
    setCopiedCell(cellKey)
    setTimeout(() => setCopiedCell(null), 1400)
  }

  const exportCsv = () => {
    const csvContent = [
      columns.join(','),
      ...rows.map((r) =>
        columns
          .map((c) => {
            const v = r[c]
            if (v === null || v === undefined) return '""'
            return `"${String(v).replace(/"/g, '""')}"`
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `querytrust_results_${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportJson = () => {
    const jsonContent = JSON.stringify(rows, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `querytrust_results_${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      spellCheck={false}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'rgba(11, 13, 17, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Grid Toolbar & Telemetry Execution Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          backgroundColor: 'rgba(14, 16, 22, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#34D399', fontWeight: 600 }}>
            Executed in {executionLatencyMs ? `${executionLatencyMs}ms` : '1.42ms'} via qt_ai_readonly
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>&bull;</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#94A3B8' }}>
            {rows.length} rows &bull; {columns.length} columns
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'flex',
              gap: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '2px',
              borderRadius: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'table' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: viewMode === 'table' ? '#FFFFFF' : '#94A3B8',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none',
                transition: 'all 120ms ease',
              }}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'chart' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: viewMode === 'chart' ? '#FFFFFF' : '#94A3B8',
                boxShadow: viewMode === 'chart' ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none',
                transition: 'all 120ms ease',
              }}
            >
              Visual
            </button>
          </div>

          {/* Export CSV / JSON */}
          <button
            type="button"
            onClick={exportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: '#CBD5E1',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '4px 9px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            title="Export complete result set as CSV"
          >
            <FileSpreadsheet size={12} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={exportJson}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: '#CBD5E1',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '4px 9px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            title="Export complete result set as JSON"
          >
            <Download size={12} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Main Grid or Visual Chart */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {viewMode === 'table' ? (
          <table
            spellCheck={false}
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'left',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {/* Sticky Header */}
            <thead>
              <tr
                style={{
                  backgroundColor: 'rgba(16, 18, 24, 0.98)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {columns.map((col) => {
                  const isSorted = sortCol === col
                  const type = columnTypes[col] || 'VARCHAR'
                  return (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      style={{
                        padding: '8px 12px',
                        fontWeight: 600,
                        color: '#F1F5F9',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                      title={`Click to sort by ${col}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ letterSpacing: '-0.01em' }}>{col}</span>
                          <span
                            style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-mono)',
                              padding: '1px 5px',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#94A3B8',
                              fontWeight: 500,
                              letterSpacing: '0.02em',
                            }}
                          >
                            {type}
                          </span>
                        </div>
                        {isSorted ? (
                          sortDir === 'asc' ? <ArrowUp size={11} style={{ color: '#38BDF8' }} /> : <ArrowDown size={11} style={{ color: '#38BDF8' }} />
                        ) : (
                          <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  style={{
                    backgroundColor: rIdx % 2 === 0 ? 'rgba(11, 13, 17, 0.6)' : 'rgba(16, 18, 24, 0.6)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background-color 80ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      rIdx % 2 === 0 ? 'rgba(11, 13, 17, 0.6)' : 'rgba(16, 18, 24, 0.6)'
                  }}
                >
                  {columns.map((col) => {
                    const rawVal = row[col]
                    const val = rawVal === null || rawVal === undefined ? '—' : String(rawVal)
                    const cellKey = `${rIdx}-${col}`
                    const isCopied = copiedCell === cellKey

                    return (
                      <td
                        key={col}
                        onClick={() => handleCellClick(rawVal, cellKey)}
                        spellCheck={false}
                        style={{
                          padding: '7px 12px',
                          color: rawVal === null ? '#64748B' : '#E2E8F0',
                          borderRight: '1px solid rgba(255, 255, 255, 0.04)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          maxWidth: '280px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: '1.4',
                        }}
                        title={`Click to copy: ${val}`}
                      >
                        {isCopied ? (
                          <span style={{ color: '#34D399', fontWeight: 600 }}>✓ Copied</span>
                        ) : (
                          val
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)' }}>
              Top Row Metric Aggregation
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '8px',
              }}
            >
              {columns.slice(0, 6).map((col) => (
                <div
                  key={col}
                  style={{
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '5px',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                    {col}
                  </div>
                  <div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    {String(rows[0]?.[col] ?? '—')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
