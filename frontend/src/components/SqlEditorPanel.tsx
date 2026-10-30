import React, { useState } from 'react'
import { Copy, Check, Terminal, EyeOff } from 'lucide-react'

interface SqlEditorPanelProps {
  sql?: string | null
  userRole?: string
  limit?: number
  isExecuting?: boolean
  onExecute?: () => void
  canExecute?: boolean
}

export const SqlEditorPanel: React.FC<SqlEditorPanelProps> = ({
  sql,
  userRole = 'analyst',
  limit = 100,
  isExecuting = false,
  onExecute,
  canExecute = true,
}) => {
  const [copied, setCopied] = useState(false)
  const isViewer = userRole.toLowerCase() === 'viewer'

  const copySql = () => {
    if (!sql) return
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // If viewer, show masked governed preview
  if (isViewer) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--ink-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <EyeOff size={13} style={{ color: 'var(--ink-muted)' }} />
          <span>Raw SQL hidden by Operations Viewer policy &bull; Governed natural-language answers only</span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9.5px',
            backgroundColor: 'var(--role-viewer-bg)',
            color: 'var(--role-viewer-text)',
            padding: '1px 6px',
            borderRadius: '4px',
            border: '1px solid var(--role-viewer-border)',
          }}
        >
          GOVERNED VIEW
        </span>
      </div>
    )
  }

  if (!sql) return null

  const lines = sql.trim().split('\n')

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface-2)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Editor Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          minWidth: 0,
          padding: '6px 10px',
          backgroundColor: 'var(--bg-surface-3)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0, flexShrink: 0 }}>
          <Terminal size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, color: 'var(--ink-primary)', whiteSpace: 'nowrap' }}>
            PostgreSQL Compiler Preview
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9.5px',
              backgroundColor: 'var(--gov-safe-bg)',
              color: 'var(--gov-safe-text)',
              border: '1px solid var(--gov-safe-border)',
              padding: '1px 6px',
              borderRadius: '3px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            LIMIT {limit} ENFORCED
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {onExecute && canExecute && (
            <button
              type="button"
              onClick={onExecute}
              disabled={isExecuting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--accent-primary)',
                border: 'none',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                cursor: isExecuting ? 'not-allowed' : 'pointer',
                padding: '2px 8px',
                borderRadius: '3px',
              }}
              title="Execute verified SQL"
            >
              <span>{isExecuting ? 'Running...' : 'Execute'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={copySql}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              fontSize: '10.5px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '3px',
            }}
            title="Copy verified SQL statement"
          >
            {copied ? <Check size={11} style={{ color: 'var(--gov-safe-dot)' }} /> : <Copy size={11} />}
            <span>{copied ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>
      </div>

      {/* Code Area with Line Numbers */}
      <div
        style={{
          display: 'flex',
          padding: '8px 0',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          lineHeight: '1.5',
          overflowX: 'auto',
          backgroundColor: 'var(--bg-surface-2)',
        }}
      >
        {/* Line Numbers Gutter */}
        <div
          style={{
            padding: '0 8px 0 10px',
            color: 'var(--ink-muted)',
            userSelect: 'none',
            textAlign: 'right',
            borderRight: '1px solid var(--border-subtle)',
            marginRight: '10px',
          }}
        >
          {lines.map((_, idx) => (
            <div key={idx} style={{ opacity: 0.6 }}>
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Syntax Highlighted Lines */}
        <div style={{ flex: 1, paddingRight: '12px', whiteSpace: 'pre' }}>
          {lines.map((line, idx) => (
            <div key={idx} style={{ color: 'var(--ink-primary)' }}>
              {highlightSqlKeywords(line)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function highlightSqlKeywords(text: string): React.ReactNode[] {
  const parts = text.split(
    /(\b(?:SELECT|FROM|JOIN|LEFT JOIN|INNER JOIN|RIGHT JOIN|WHERE|GROUP BY|ORDER BY|LIMIT|OFFSET|AS|AND|OR|NOT|IN|ON|IS NULL|IS NOT NULL|COUNT|SUM|AVG|MAX|MIN|INTERVAL)\b)/gi
  )
  return parts.map((part, i) => {
    const isKeyword =
      /^(SELECT|FROM|JOIN|LEFT JOIN|INNER JOIN|RIGHT JOIN|WHERE|GROUP BY|ORDER BY|LIMIT|OFFSET|AS|AND|OR|NOT|IN|ON|IS NULL|IS NOT NULL|COUNT|SUM|AVG|MAX|MIN|INTERVAL)$/i.test(
        part
      )
    if (isKeyword) {
      return (
        <span
          key={i}
          style={{
            fontWeight: 700,
            color:
              part.toUpperCase() === 'LIMIT'
                ? 'var(--accent-primary)'
                : 'var(--accent-primary)',
          }}
        >
          {part}
        </span>
      )
    }
    // Highlight table/column identifiers or strings
    if (/^'.*'$/.test(part.trim())) {
      return (
        <span key={i} style={{ color: '#059669' }}>
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}
