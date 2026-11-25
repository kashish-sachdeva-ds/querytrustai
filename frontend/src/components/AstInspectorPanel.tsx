import React, { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'

export interface AstInspectorPanelProps {
  sql?: string | null
  isValid?: boolean
  violations?: string[]
  executionLatencyMs?: number | null
  queryRunId?: string | null
  provider?: string | null
  assumptions?: string[]
  isExecuting?: boolean
}

export const AstInspectorPanel: React.FC<AstInspectorPanelProps> = ({
  sql,
  isValid = true,
  violations = [],
  executionLatencyMs = null,
  queryRunId,
  provider,
  assumptions = [],
  isExecuting = false,
}) => {
  const [activeTab, setActiveTab] = useState<'gates' | 'ast-tree' | 'kernel-proof'>('gates')
  const [copiedSql, setCopiedSql] = useState(false)
  const [expandedGateId, setExpandedGateId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const gates = [
    {
      id: '01',
      name: 'Read-only SELECT only',
      summary: 'Allows reading data only. Blocks DROP, DELETE, UPDATE, and INSERT.',
      rule: 'Root SQL statement must be exp.Select',
      passed:
        isValid &&
        !violations.some(
          (v) => v.toLowerCase().includes('statement') || v.toLowerCase().includes('select')
        ),
    },
    {
      id: '02',
      name: 'Single query at a time',
      summary: 'Allows one SQL statement only. Stops stacked commands like ; DROP TABLE.',
      rule: 'len(parsed_statements) == 1',
      passed:
        isValid &&
        !violations.some(
          (v) => v.toLowerCase().includes('multiple') || v.toLowerCase().includes('injection')
        ),
    },
    {
      id: '03',
      name: 'System tables hidden',
      summary: 'Blocks internal PostgreSQL catalogs and functions like pg_sleep().',
      rule: 'Disallow pg_catalog, information_schema, and pg_* functions',
      passed:
        isValid &&
        !violations.some(
          (v) => v.toLowerCase().includes('catalog') || v.toLowerCase().includes('schema')
        ),
    },
    {
      id: '04',
      name: 'Approved fleet tables only',
      summary: 'Restricts queries to devices, sites, service_events, and telemetry_readings.',
      rule: 'Table allowlist: devices, sites, service_events, telemetry_readings',
      passed:
        isValid &&
        !violations.some(
          (v) => v.toLowerCase().includes('table') || v.toLowerCase().includes('allowlist')
        ),
    },
    {
      id: '05',
      name: 'Safe joins & row cap',
      summary: 'Requires explicit join conditions and limits output to 500 rows max.',
      rule: 'Explicit ON predicates required; LIMIT <= 500 injected',
      passed: isValid,
    },
    {
      id: '06',
      name: 'Read-only database login',
      summary: 'Connects via PostgreSQL role qt_ai_readonly, which has zero write access.',
      rule: 'SET default_transaction_read_only = ON (SELECT grants only)',
      passed: true,
    },
  ]

  const passedCount = gates.filter((g) => g.passed).length

  const copySql = () => {
    if (!sql) return
    navigator.clipboard.writeText(sql)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  const parsedNodes = React.useMemo(() => {
    if (!sql) return []
    const nodes: Array<{ id: string; label: string; token: string; explanation: string }> = []
    nodes.push({
      id: 'root',
      label: 'Action',
      token: 'SELECT',
      explanation: 'Confirmed read-only SELECT operation (no edits or deletes).',
    })

    if (sql.toLowerCase().includes('from')) {
      const fromMatch = sql.match(/FROM\s+([a-zA-Z_]+(?:\s+[a-zA-Z_]+)?)/i)
      nodes.push({
        id: 'from',
        label: 'Main Table',
        token: fromMatch ? `FROM ${fromMatch[1]}` : 'FROM devices',
        explanation: 'Table verified against the 4-table fleet allowlist.',
      })
    }

    if (sql.toLowerCase().includes('join')) {
      const joinMatch = sql.match(/JOIN\s+([a-zA-Z_]+(?:\s+[a-zA-Z_]+)?\s+ON\s+[^,\n;]+)/i)
      nodes.push({
        id: 'join',
        label: 'Linked Table',
        token: joinMatch ? joinMatch[0] : 'JOIN sites ON devices.site_id = sites.id',
        explanation: 'Safe table join with an explicit ON condition.',
      })
    }

    if (sql.toLowerCase().includes('where')) {
      const whereMatch = sql.match(/WHERE\s+([^,\n;]+)/i)
      nodes.push({
        id: 'where',
        label: 'Filter',
        token: whereMatch ? `WHERE ${whereMatch[1].slice(0, 48)}${whereMatch[1].length > 48 ? '...' : ''}` : 'WHERE ...',
        explanation: 'Row filters checked for safe syntax and allowed columns.',
      })
    }

    if (sql.toLowerCase().includes('limit')) {
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
      nodes.push({
        id: 'limit',
        label: 'Row Cap',
        token: limitMatch ? `LIMIT ${limitMatch[1]}` : 'LIMIT 100',
        explanation: 'Server-enforced limit keeps results at or below 500 rows.',
      })
    }

    return nodes
  }, [sql])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Clean Segmented Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-raised)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            gap: '3px',
            padding: '3px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          {[
            { id: 'gates' as const, label: 'Safety Checks' },
            { id: 'ast-tree' as const, label: 'Structure' },
            { id: 'kernel-proof' as const, label: 'DB Access' },
          ].map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11.5px',
                  fontWeight: active ? 600 : 500,
                  padding: '5px 9px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  backgroundColor: active ? 'var(--color-accent)' : 'transparent',
                  color: active ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                  transition: 'all 120ms ease',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            backgroundColor: isValid ? 'var(--color-status-success-bg)' : 'var(--color-status-error-bg)',
            color: isValid ? 'var(--color-status-success-text)' : 'var(--color-status-error-text)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isValid ? 'var(--color-status-success-dot)' : 'var(--color-status-error-dot)',
            }}
          />
          {isValid ? `${passedCount}/6 PASS` : 'BLOCKED'}
        </span>
      </div>

      {/* Scrollable Drawer Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          scrollbarWidth: 'thin',
        }}
      >
        {/* TAB 1: PLAIN-ENGLISH SAFETY CHECKS */}
        {activeTab === 'gates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Top Summary Banner */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: isValid ? 'var(--color-status-success-bg)' : 'var(--color-status-error-bg)',
                border: `1px solid color-mix(in srgb, ${
                  isValid ? 'var(--color-status-success-dot)' : 'var(--color-status-error-dot)'
                } 28%, transparent)`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              {isValid ? (
                <ShieldCheck size={18} style={{ color: 'var(--color-status-success-dot)', flexShrink: 0, marginTop: '1px' }} />
              ) : (
                <ShieldAlert size={18} style={{ color: 'var(--color-status-error-dot)', flexShrink: 0, marginTop: '1px' }} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: isValid ? 'var(--color-status-success-text)' : 'var(--color-status-error-text)',
                  }}
                >
                  {isExecuting
                    ? 'Checking query safety...'
                    : isValid
                    ? 'Safe to run (all 6 checks passed)'
                    : 'Blocked before touching the database'}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    marginTop: '3px',
                    lineHeight: 1.45,
                  }}
                >
                  {isValid
                    ? 'SQLGlot verified this is a bounded, read-only SELECT query.'
                    : 'A safety rule stopped this query during syntax inspection.'}
                </div>
                {(provider || executionLatencyMs !== null) && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      marginTop: '6px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {provider && <span>Parser: {provider}</span>}
                    {executionLatencyMs !== null && <span>Run time: {executionLatencyMs} ms</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Violations Box if Blocked */}
            {!isValid && violations.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--color-status-error-bg)',
                  border: '1px solid var(--color-status-error-dot)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: 'var(--color-status-error-text)',
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Why it was blocked
                </div>
                {violations.map((v, idx) => (
                  <div key={idx} style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    &bull; {v}
                  </div>
                ))}
              </div>
            )}

            {/* Applied Query Filters (Readable list instead of cramped strip) */}
            {assumptions.length > 0 && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--color-text-muted)',
                    marginBottom: '6px',
                  }}
                >
                  Applied rules
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '16px',
                    listStyleType: 'disc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    fontSize: '11.5px',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {assumptions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6 Clean Check Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {gates.map((g) => {
                const isExpanded = expandedGateId === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setExpandedGateId(isExpanded ? null : g.id)}
                    style={{
                      textAlign: 'left',
                      width: '100%',
                      backgroundColor: g.passed ? 'var(--color-surface)' : 'var(--color-status-error-bg)',
                      border: `1px solid ${g.passed ? 'var(--color-border-subtle)' : 'var(--color-status-error-dot)'}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      transition: 'border-color 140ms ease, background-color 140ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {g.passed ? (
                          <CheckCircle2 size={15} style={{ color: 'var(--color-status-success-dot)', flexShrink: 0 }} />
                        ) : (
                          <XCircle size={15} style={{ color: 'var(--color-status-error-dot)', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {g.id}. {g.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: g.passed ? 'var(--color-status-success-text)' : 'var(--color-status-error-text)',
                          }}
                        >
                          {g.passed ? 'Pass' : 'Blocked'}
                        </span>
                        <ChevronDown
                          size={14}
                          style={{
                            color: 'var(--color-text-muted)',
                            transform: isExpanded ? 'rotate(180deg)' : 'none',
                            transition: 'transform 160ms ease',
                          }}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-secondary)',
                        paddingLeft: '23px',
                        lineHeight: 1.45,
                      }}
                    >
                      {g.summary}
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '4px',
                          marginLeft: '23px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--color-raised)',
                          border: '1px solid var(--color-border-subtle)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'var(--color-accent-link)',
                        }}
                      >
                        Rule: {g.rule}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SIMPLE QUERY STRUCTURE */}
        {activeTab === 'ast-tree' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              SQLGlot splits the generated query into parts and verifies each piece before running. Click any step below to see what it checks.
            </div>

            {parsedNodes.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  fontSize: '12.5px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Run or select a query in Query Studio to inspect its parsed SQL parts.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {parsedNodes.map((n) => {
                  const isSelected = selectedNode === n.id
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedNode(isSelected ? null : n.id)}
                      style={{
                        textAlign: 'left',
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        backgroundColor: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-raised)',
                        border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: 'var(--color-accent-link)',
                          }}
                        >
                          {n.label}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-status-success-text)' }}>
                          Verified
                        </span>
                      </div>
                      <code
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: 'var(--color-text-primary)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {n.token}
                      </code>
                      {isSelected && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                          {n.explanation}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: READ-ONLY DATABASE ACCESS */}
        {activeTab === 'kernel-proof' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Even if unsafe SQL slipped past parsing, PostgreSQL connects with a read-only login that cannot change or delete data.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {/* Active AI Query Role */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-status-success-dot)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    qt_ai_readonly
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--color-status-success-bg)',
                      color: 'var(--color-status-success-text)',
                    }}
                  >
                    Active for AI Queries
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '12px' }}>
                  <div style={{ color: 'var(--color-status-success-text)', fontWeight: 600 }}>SELECT: Allowed</div>
                  <div style={{ color: 'var(--color-status-error-text)', fontWeight: 600 }}>INSERT: Blocked</div>
                  <div style={{ color: 'var(--color-status-error-text)', fontWeight: 600 }}>UPDATE: Blocked</div>
                  <div style={{ color: 'var(--color-status-error-text)', fontWeight: 600 }}>DELETE / DROP: Blocked</div>
                </div>
              </div>

              {/* Admin Migrator Role */}
              <div
                style={{
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    qt_admin_migrator
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Setup migrations only
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                  Used only when setting up database tables offline—never used when answering user questions.
                </div>
              </div>
            </div>

            {/* PostgreSQL Grant SQL */}
            <div
              style={{
                backgroundColor: 'var(--color-raised)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.55,
              }}
            >
              <div style={{ color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                PostgreSQL role setup
              </div>
              <code>
                REVOKE ALL ON ALL TABLES IN SCHEMA public FROM qt_ai_readonly;
                <br />
                GRANT SELECT ON ALL TABLES IN SCHEMA public TO qt_ai_readonly;
                <br />
                ALTER ROLE qt_ai_readonly SET default_transaction_read_only = ON;
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-raised)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
          {queryRunId ? `Run ID: ${queryRunId.slice(0, 8)}` : 'Ready'}
        </span>
        {sql && (
          <button
            type="button"
            onClick={copySql}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent-link)',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {copiedSql ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedSql ? 'Copied SQL' : 'Copy SQL'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
