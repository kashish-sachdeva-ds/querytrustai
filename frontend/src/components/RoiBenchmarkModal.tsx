import React, { useEffect } from 'react'
import {
  X,
  Zap,
  ShieldCheck,
  Database,
  ArrowRight,
  Layers,
  Clock,
  Terminal,
} from 'lucide-react'
import './RoiBenchmarkModal.css'

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
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roi-modal-title"
      className="roi-modal-backdrop"
      onClick={onClose}
    >
      <div className="roi-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="roi-modal-header">
          <div className="roi-header-title-group">
            <span className="roi-beacon-dot" />
            <h2 id="roi-modal-title" className="roi-modal-title">
              Read-Only Execution &amp; Kernel Architecture
            </h2>
            <span className="roi-version-pill">PostgreSQL 16</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog (Esc)"
            className="roi-close-btn"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="roi-modal-body">
          {/* 4 Metric Tiles */}
          <div className="roi-kpi-grid">
            <div className="roi-kpi-tile">
              <div className="roi-kpi-label">
                <Zap size={12} style={{ color: 'var(--color-accent-link)' }} />
                <span>Sample query</span>
              </div>
              <div className="roi-kpi-val">1.4 ms</div>
              <div className="roi-kpi-sub">
                <span>Bounded SELECT timing</span>
              </div>
            </div>

            <div className="roi-kpi-tile">
              <div className="roi-kpi-label">
                <Clock size={12} style={{ color: 'var(--color-accent-link)' }} />
                <span>Row limit</span>
              </div>
              <div className="roi-kpi-val">&le; 500</div>
              <div className="roi-kpi-sub">
                <span>Clamped in AST parser</span>
              </div>
            </div>

            <div className="roi-kpi-tile">
              <div className="roi-kpi-label">
                <ShieldCheck size={12} style={{ color: 'var(--color-status-success-dot)' }} />
                <span>AST rules</span>
              </div>
              <div className="roi-kpi-val">6 / 6</div>
              <div className="roi-kpi-sub" style={{ color: 'var(--color-status-success-text)' }}>
                Verified per query
              </div>
            </div>

            <div className="roi-kpi-tile">
              <div className="roi-kpi-label">
                <Terminal size={12} style={{ color: 'var(--color-status-success-dot)' }} />
                <span>Write privileges</span>
              </div>
              <div className="roi-kpi-val">0</div>
              <div className="roi-kpi-sub" style={{ color: 'var(--color-status-success-text)' }}>
                SELECT-only DB role
              </div>
            </div>
          </div>

          {/* 3 Core Architecture Pillars */}
          <div>
            <h3 className="roi-section-title">
              Layered Enforcement Boundaries
            </h3>

            <div className="roi-pillars-grid">
              <div className="roi-pillar-card">
                <div className="roi-pillar-head">
                  <Layers size={14} style={{ color: 'var(--color-accent-link)' }} />
                  <span>1. SQLGlot AST Parser</span>
                </div>
                <p className="roi-pillar-desc">
                  Deterministic syntax tree validation across 6 checks before any SQL string reaches PostgreSQL.
                </p>
                <span className="roi-pillar-badge">
                  AST-01 to AST-06
                </span>
              </div>

              <div className="roi-pillar-card">
                <div className="roi-pillar-head">
                  <Database size={14} style={{ color: 'var(--color-status-success-dot)' }} />
                  <span>2. Read-Only Role</span>
                </div>
                <p className="roi-pillar-desc">
                  Dedicated PostgreSQL role <code>qt_ai_readonly</code> with only table SELECT grants and no write privileges.
                </p>
                <span className="roi-pillar-badge" style={{ color: 'var(--color-status-success-text)' }}>
                  SELECT-only role
                </span>
              </div>

              <div className="roi-pillar-card">
                <div className="roi-pillar-head">
                  <ShieldCheck size={14} style={{ color: 'var(--color-accent-link)' }} />
                  <span>3. Preview Binding</span>
                </div>
                <p className="roi-pillar-desc">
                  The browser never submits raw SQL. Execution references a server-validated preview record ID.
                </p>
                <span className="roi-pillar-badge">
                  Server preview ID
                </span>
              </div>
            </div>
          </div>

          {/* Technical Verification Details */}
          <div className="roi-tech-box">
            <div>
              <strong>Kernel Binding:</strong> PostgreSQL 16 | Role: <code>qt_ai_readonly</code> | <code>default_transaction_read_only = ON</code>
            </div>
            <div>
              <strong>AST Parser:</strong> SQLGlot (PostgreSQL dialect) | Single SELECT statement &amp; table allowlist
            </div>
            <div>
              <strong>Benchmark Suite:</strong> 37-case regression catalog available in AST Safety Proof
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="roi-modal-footer">
          <span className="roi-footer-spec">
            Read-only enforcement verified at parser and database layers
          </span>
          <div className="roi-footer-actions">
            {onNavigateToProof && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onNavigateToProof()
                }}
                className="roi-btn-proof"
              >
                <span>View Full Safety Proof</span>
                <ArrowRight size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="roi-btn-close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
