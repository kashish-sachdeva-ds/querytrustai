import React from 'react'
import {
  X,
  Zap,
  ShieldCheck,
  Database,
  ArrowRight,
  TrendingDown,
  Layers,
  Clock,
  Terminal,
} from 'lucide-react'

interface RoiBenchmarkModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigateToProof?: () => void
}

export const RoiBenchmarkModal: React.FC<RoiBenchmarkModalProps> = ({
  isOpen,
  onClose,
  onNavigateToProof,
}) => {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roi-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          backgroundColor: 'var(--bg-surface-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: '8px',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
              }}
            />
            <h2
              id="roi-modal-title"
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--ink-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Enterprise Governance Velocity &amp; ROI Telemetry
            </h2>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                backgroundColor: 'var(--bg-surface-3)',
                padding: '2px 6px',
                borderRadius: '4px',
                color: 'var(--ink-muted)',
              }}
            >
              PROD-AUDIT-v2.4
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-muted)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 4 Swiss Grid KPI Ribbon */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1px',
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <div style={{ backgroundColor: 'var(--bg-surface-1)', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                <Zap size={13} />
                <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Turnaround
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                1.42s
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gov-safe-text)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                <TrendingDown size={11} />
                <span>-99.9% vs 4h Jira Lag</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-1)', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                <Clock size={13} />
                <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Deflection
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                65%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                Routine SQL Tickets
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-1)', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gov-safe-text)', marginBottom: '4px' }}>
                <ShieldCheck size={13} />
                <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Safety Tests
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                151/151
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gov-safe-text)', marginTop: '2px' }}>
                100% Automated Pass
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-1)', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gov-safe-text)', marginBottom: '4px' }}>
                <Terminal size={13} />
                <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Forbidden
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gov-safe-text)' }}>
                0 Runs
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                100% Interception
              </div>
            </div>
          </div>

          {/* 3 Core Architecture Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-muted)', margin: 0 }}>
              The 3 Architectural Pillars of Zero-Trust NL-to-SQL
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Layers size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    1. SQLGlot Compiler
                  </span>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', lineHeight: 1.45, margin: 0 }}>
                  Mathematical Abstract Syntax Tree inspection across 6 deterministic gates. Never trusts LLM prompt instructions for security.
                </p>
                <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-primary)' }}>
                  [6/6 Gates Enforced]
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Database size={14} style={{ color: 'var(--gov-safe-text)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    2. Dual-Role Kernel
                  </span>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', lineHeight: 1.45, margin: 0 }}>
                  Dedicated PostgreSQL role <code>qt_ai_readonly</code> with 0 write/DDL permissions enforced by database kernel privileges.
                </p>
                <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--gov-safe-text)' }}>
                  [0 Write/DDL/DCL Perms]
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    3. Enterprise Velocity
                  </span>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', lineHeight: 1.45, margin: 0 }}>
                  Non-technical domain operators query relational fleet data safely in under 1.5s, freeing data engineers from ad-hoc extraction queues.
                </p>
                <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-primary)' }}>
                  [Jira Deflection: 65%]
                </div>
              </div>
            </div>
          </div>

          {/* Technical Verification Details */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-surface-3)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--ink-secondary)',
              lineHeight: 1.6,
            }}
          >
            <div><strong>Kernel Binding:</strong> PostgreSQL 16.4 | SSL Verify-Full | Role: <code>qt_ai_readonly</code></div>
            <div><strong>AST Engine:</strong> SQLGlot Dialect Parser (PostgreSQL) | AST-01 to AST-06 Pipeline Active</div>
            <div><strong>Regression Suite:</strong> 37/37 Benchmark Test Cases Passing | 151 Unit/Integration Tests</div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
            Zero-Trust Architectural Specification &bull; MIT Licensed
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onNavigateToProof && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onNavigateToProof()
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>View Full Safety Proof</span>
                <ArrowRight size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'var(--bg-surface-1)',
                color: 'var(--ink-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

