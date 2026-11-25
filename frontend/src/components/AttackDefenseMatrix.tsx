import React, { useState } from 'react'
import { ShieldAlert, Terminal, Lock, ChevronRight, ShieldCheck, FileCode } from 'lucide-react'

interface ThreatVector {
  id: string
  name: string
  classification: string
  sampleAttack: string
  gateNumber: number
  gateIntercepted: string
  mitigationEngine: string
  description: string
}

const THREAT_VECTORS: ThreatVector[] = [
  {
    id: 'ddl-drop',
    name: 'Destructive DDL statement',
    classification: 'CWE-89 · SQL Injection / Schema Destruction',
    sampleAttack: 'DROP TABLE devices CASCADE; -- wipe production catalog',
    gateNumber: 1,
    gateIntercepted: 'Check #1 · Single SELECT Statement',
    mitigationEngine: 'SQLGlot verifies the root AST node is exp.Select. Found exp.Drop and terminated validation.',
    description: 'Rejected in application memory prior to borrowing a connection from the database pool.',
  },
  {
    id: 'dml-privilege',
    name: 'Privilege escalation mutation',
    classification: 'CWE-285 · Unauthorized Write / Role Mutation',
    sampleAttack: "UPDATE user_accounts SET role = 'admin' WHERE email = current_user;",
    gateNumber: 3,
    gateIntercepted: 'Check #1 & #3 · Mutation & User Table Lockout',
    mitigationEngine: 'exp.Update statements and system/user account tables are blocked by both AST policy and qt_ai_readonly.',
    description: 'Prevented at AST analysis and additionally unenforceable under read-only database privileges.',
  },
  {
    id: 'catalog-exfil',
    name: 'System catalog reconnaissance',
    classification: 'CWE-200 · Sensitive Catalog Exposure',
    sampleAttack: 'SELECT usename, passwd FROM pg_shadow UNION SELECT 1, 2;',
    gateNumber: 2,
    gateIntercepted: 'Check #2 · Table Allowlist',
    mitigationEngine: 'Table "pg_shadow" is absent from the explicit allowlist (devices, sites, service_events, telemetry_readings).',
    description: 'PostgreSQL internal catalogs and schema metadata tables cannot be queried through analytics previews.',
  },
  {
    id: 'cartesian-dos',
    name: 'Unbounded cross-join exhaustion',
    classification: 'CWE-400 · Uncontrolled Resource Consumption',
    sampleAttack: 'SELECT * FROM devices, telemetry_readings, service_events;',
    gateNumber: 5,
    gateIntercepted: 'Check #5 · Join Predicate Validation',
    mitigationEngine: 'Cartesian cross joins without explicit ON join predicates are rejected during AST traversal.',
    description: 'Prevents multi-table row amplification alongside the 5,000 ms PostgreSQL statement timeout.',
  },
  {
    id: 'unbounded-dump',
    name: 'Unbounded bulk extraction',
    classification: 'CWE-770 · Unbounded Allocation',
    sampleAttack: 'SELECT * FROM telemetry_readings;',
    gateNumber: 6,
    gateIntercepted: 'Check #6 · Row Limit Clamp',
    mitigationEngine: 'Server validation injects and caps the LIMIT clause before execution.',
    description: 'Keeps payload sizes bounded regardless of client requests.',
  },
]

const CHECK_LABELS = ['Single SELECT', 'Allowlist', 'No Mutation', 'Safe Functions', 'Bounded Joins', 'Row Clamp']

export const AttackDefenseMatrix: React.FC = () => {
  const [selectedThreatId, setSelectedThreatId] = useState<string>('ddl-drop')
  const activeThreat = THREAT_VECTORS.find((t) => t.id === selectedThreatId) || THREAT_VECTORS[0]

  return (
    <section
      id="attack-matrix"
      className="py-16 sm:py-24 text-left transition-colors"
      style={{
        backgroundColor: 'var(--color-page-bg)',
        borderTop: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="max-w-2xl mb-10">
          <div
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
          >
            Adversarial Guardrails
          </div>
          <h2
            className="text-2xl sm:text-4xl font-normal tracking-tight leading-[1.15]"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}
          >
            Where unsafe patterns stop before execution
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Select an attack class below to inspect which SQLGlot AST check blocks it prior to execution.
          </p>
        </div>

        {/* 6-Check Pipeline Strip */}
        <div className="landing-card p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {CHECK_LABELS.map((label, idx) => {
              const gateNum = idx + 1
              const blockedHere = activeThreat.gateNumber === gateNum
              return (
                <div
                  key={label}
                  className="p-3 rounded-[8px] transition-colors"
                  style={{
                    backgroundColor: blockedHere ? 'var(--color-status-error-bg)' : 'var(--color-raised)',
                    border: `1px solid ${blockedHere ? 'var(--color-status-error-dot)' : 'var(--color-border-subtle)'}`,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{
                      color: blockedHere ? 'var(--color-status-error-text)' : 'var(--color-text-muted)',
                    }}
                  >
                    Check #{gateNum}
                  </div>
                  <div
                    className="text-xs font-semibold mt-1"
                    style={{
                      color: blockedHere ? 'var(--color-status-error-text)' : 'var(--color-text-primary)',
                    }}
                  >
                    {label}
                  </div>
                  {blockedHere && (
                    <div
                      className="text-[10px] font-semibold mt-1"
                      style={{ color: 'var(--color-status-error-text)' }}
                    >
                      Intercepted
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Split Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Vector List */}
          <div className="lg:col-span-5 space-y-2">
            {THREAT_VECTORS.map((threat) => {
              const selected = threat.id === activeThreat.id
              return (
                <button
                  key={threat.id}
                  type="button"
                  onClick={() => setSelectedThreatId(threat.id)}
                  className="w-full text-left p-4 rounded-[10px] transition-colors cursor-pointer flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: selected ? 'var(--color-surface)' : 'var(--color-surface)',
                    border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
                    boxShadow: selected ? '0 0 0 1px var(--color-accent)' : 'none',
                  }}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: selected
                            ? 'var(--color-status-error-dot)'
                            : 'var(--color-text-muted)',
                        }}
                      />
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {threat.name}
                      </span>
                    </div>
                    <div
                      className="text-[11px] pl-3.5 truncate"
                      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {threat.gateIntercepted}
                    </div>
                  </div>
                  <ChevronRight
                    size={15}
                    style={{
                      color: selected ? 'var(--color-accent-link)' : 'var(--color-text-muted)',
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* Detail Card */}
          <div className="lg:col-span-7 landing-card p-6 sm:p-7 space-y-5">
            <div
              className="flex flex-wrap items-start justify-between gap-3 pb-4"
              style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
            >
              <div>
                <div
                  className="text-[11px] uppercase tracking-wider mb-1"
                  style={{ color: 'var(--color-status-error-text)', fontFamily: 'var(--font-mono)' }}
                >
                  {activeThreat.classification}
                </div>
                <h3 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {activeThreat.name}
                </h3>
              </div>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--color-status-error-bg)',
                  color: 'var(--color-status-error-text)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <ShieldAlert size={12} />
                <span>Blocked</span>
              </span>
            </div>

            <div>
              <div
                className="text-[11px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                <FileCode size={12} style={{ color: 'var(--color-status-error-dot)' }} />
                <span>Rejected Input Pattern</span>
              </div>
              <pre
                className="p-3.5 rounded-[8px] text-xs overflow-x-auto m-0"
                style={{
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  color: 'var(--color-status-error-text)',
                }}
              >
                <code>{activeThreat.sampleAttack}</code>
              </pre>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                className="p-3.5 rounded-[8px] flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <Terminal size={14} style={{ color: 'var(--color-accent-link)' }} className="shrink-0 mt-0.5" />
                <div>
                  <div
                    className="text-[10.5px] uppercase"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    Stopping Rule
                  </div>
                  <div className="font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {activeThreat.gateIntercepted}
                  </div>
                </div>
              </div>

              <div
                className="p-3.5 rounded-[8px] flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <ShieldCheck size={14} style={{ color: 'var(--color-status-success-dot)' }} className="shrink-0 mt-0.5" />
                <div>
                  <div
                    className="text-[10.5px] uppercase"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    Mitigation Mechanism
                  </div>
                  <div className="mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                    {activeThreat.mitigationEngine}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {activeThreat.description}
            </p>

            <div
              className="pt-4 flex items-center justify-between text-xs"
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span className="flex items-center gap-1.5">
                <Lock size={12} style={{ color: 'var(--color-status-success-dot)' }} />
                <span>PostgreSQL Role: qt_ai_readonly</span>
              </span>
              <span style={{ color: 'var(--color-status-success-text)', fontWeight: 600 }}>
                Read-Only Enforced
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
