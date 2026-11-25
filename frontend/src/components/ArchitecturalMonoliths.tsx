import React, { useState } from 'react'
import { Shield, Lock, FileCheck, XCircle, CheckCircle2 } from 'lucide-react'

export const ArchitecturalMonoliths: React.FC = () => {
  const [writeTestState, setWriteTestState] = useState<'idle' | 'denied'>('idle')

  return (
    <section
      id="three-invariants"
      className="py-16 sm:py-24 text-left transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="max-w-2xl mb-10">
          <div
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
          >
            Core Safeguards
          </div>
          <h2
            className="text-2xl sm:text-4xl font-normal tracking-tight leading-[1.15]"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}
          >
            Two independent enforcement layers
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Natural-language queries pass strict AST verification before reaching the database, and the database role itself refuses mutations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: AST Parser */}
          <div className="landing-card p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
                >
                  <Shield size={14} />
                  <span>SQLGlot AST</span>
                </span>
                <span
                  className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium"
                  style={{
                    backgroundColor: 'var(--color-status-success-bg)',
                    color: 'var(--color-status-success-text)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  PostgreSQL Dialect
                </span>
              </div>

              <div
                className="p-4 rounded-[8px] space-y-2 text-xs"
                style={{
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {[
                  ['01', 'Single SELECT root', 'Allowed'],
                  ['02', 'Catalog allowlist', '4 tables'],
                  ['03', 'DDL / DML nodes', 'Blocked'],
                  ['04', 'Join & row limits', 'Clamped'],
                ].map(([num, label, status]) => (
                  <div key={num} className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>{num}</strong> {label}
                    </span>
                    <span
                      style={{
                        color:
                          status === 'Blocked'
                            ? 'var(--color-status-error-text)'
                            : 'var(--color-status-success-text)',
                      }}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  Deterministic Syntax Validation
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  Every candidate statement is parsed and revalidated via SQLGlot on execution. Multi-statement batches, DDL, DML, and system tables are rejected before connecting.
                </p>
              </div>
            </div>

            <div
              className="pt-4 flex items-center justify-between text-xs"
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>Parser Mode</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>6 AST Checks</strong>
            </div>
          </div>

          {/* Card 2: Read-Only DB Role */}
          <div className="landing-card p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
                >
                  <Lock size={14} />
                  <span>Reader Role</span>
                </span>
                <span
                  className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium"
                  style={{
                    backgroundColor: 'var(--color-accent-subtle)',
                    color: 'var(--color-accent-link)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  qt_ai_readonly
                </span>
              </div>

              <div
                className="p-4 rounded-[8px] space-y-3 text-xs"
                style={{
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-primary)' }}>SELECT</span>
                  <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-status-success-text)' }}>
                    <CheckCircle2 size={12} />
                    <span>Granted</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-primary)' }}>INSERT / UPDATE / DROP</span>
                  <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-status-error-text)' }}>
                    <XCircle size={12} />
                    <span>Revoked</span>
                  </span>
                </div>
                <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setWriteTestState('denied')}
                    className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium cursor-pointer landing-control-secondary"
                  >
                    Simulate write call
                  </button>
                  {writeTestState === 'denied' && (
                    <span className="text-[11px] font-medium" style={{ color: 'var(--color-status-error-text)' }}>
                      ERROR: permission denied for table devices
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  Least-Privilege Database Role
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  Analytics queries run over a dedicated read-only PostgreSQL credential with{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                    default_transaction_read_only
                  </code>{' '}
                  and zero mutation privileges.
                </p>
              </div>
            </div>

            <div
              className="pt-4 flex items-center justify-between text-xs"
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>Write Privileges</span>
              <strong style={{ color: 'var(--color-status-success-text)' }}>None</strong>
            </div>
          </div>

          {/* Card 3: Preview IDs & Bounds */}
          <div className="landing-card p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
                >
                  <FileCheck size={14} />
                  <span>Execution Bounds</span>
                </span>
                <span
                  className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium"
                  style={{
                    backgroundColor: 'var(--color-raised)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Audited Runs
                </span>
              </div>

              <div
                className="p-4 rounded-[8px] space-y-2 text-xs"
                style={{
                  backgroundColor: 'var(--color-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Execution target</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>Server Preview ID</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Default row limit</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>LIMIT 100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Maximum row cap</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>500 rows</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Statement timeout</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>5,000 ms</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  Bounded &amp; Audited Execution
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  The client never supplies arbitrary SQL directly to execution. Only server-stored preview IDs run after ownership checks, with full history logging.
                </p>
              </div>
            </div>

            <div
              className="pt-4 flex items-center justify-between text-xs"
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>Client Contract</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>Preview ID Only</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
