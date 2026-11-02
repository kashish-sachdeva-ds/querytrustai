import React, { useEffect } from 'react'
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
              Enterprise Governance Velocity &amp; ROI Telemetry
            </h2>
            <span className="roi-version-pill">PROD-AUDIT-v3.4</span>
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
          {/* 4 Swiss Grid KPI Ribbon */}
          <div className="roi-kpi-grid">
            <div className="roi-kpi-tile">
              <div className="roi-kpi-label" style={{ color: '#38BDF8' }}>
                <Zap size={12} />
                <span>Turnaround</span>
              </div>
              <div className="roi-kpi-val">1.42s</div>
              <div className="roi-kpi-sub" style={{ color: '#34D399' }}>
                <TrendingDown size={11} />
                <span>99.9% vs 4h Jira Lag</span>
              </div>
            </div>

            <div className="roi-kpi-tile">
              <div className="roi-kpi-label" style={{ color: '#38BDF8' }}>
                <Clock size={12} />
                <span>Deflection</span>
              </div>
              <div className="roi-kpi-val">65%</div>
              <div className="roi-kpi-sub" style={{ color: '#94A3B8' }}>
                Routine SQL Tickets
              </div>
            </div>

            <div className="roi-kpi-tile">
              <div className="roi-kpi-label" style={{ color: '#34D399' }}>
                <ShieldCheck size={12} />
                <span>Safety Tests</span>
              </div>
              <div className="roi-kpi-val">151/151</div>
              <div className="roi-kpi-sub" style={{ color: '#34D399' }}>
                100% Automated Pass
              </div>
            </div>

            <div className="roi-kpi-tile">
              <div className="roi-kpi-label" style={{ color: '#34D399' }}>
                <Terminal size={12} />
                <span>Forbidden</span>
              </div>
              <div className="roi-kpi-val" style={{ color: '#34D399' }}>0 Runs</div>
              <div className="roi-kpi-sub" style={{ color: '#34D399' }}>
                100% Interception
              </div>
            </div>
          </div>

          {/* 3 Core Architecture Pillars */}
          <div>
            <h3 className="roi-section-title">
              The 3 Architectural Pillars of Zero-Trust NL-to-SQL
            </h3>

            <div className="roi-pillars-grid">
              <div className="roi-pillar-card">
                <div className="roi-pillar-head">
                  <Layers size={14} style={{ color: '#38BDF8' }} />
                  <span>1. SQLGlot Compiler</span>
                </div>
                <p className="roi-pillar-desc">
                  Mathematical Abstract Syntax Tree inspection across 6 deterministic gates. Never trusts LLM prompt instructions for security.
                </p>
                <span
                  className="roi-pillar-badge"
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    color: '#38BDF8',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                  }}
                >
                  [6/6 Gates Enforced]
                </span>
              </div>

              <div className="roi-pillar-card">
                <div className="roi-pillar-head">
                  <Database size={14} style={{ color: '#34D399' }} />
                  <span>2. Dual-Role Kernel</span>
                </div>
                <p className="roi-pillar-desc">
                  Dedicated PostgreSQL role <code>qt_ai_readonly</code> with 0 write/DDL permissions enforced by database kernel privileges.
                </p>
                <span
                  className="roi-pillar-badge"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#34D399',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  [0 Write/DDL/DCL Perms]
                </span>
              </div>

              <div className="roi-pillar-card">
                <div className="roi-pillar-head">
                  <ShieldCheck size={14} style={{ color: '#818CF8' }} />
                  <span>3. Enterprise Velocity</span>
                </div>
                <p className="roi-pillar-desc">
                  Non-technical domain operators query relational fleet data safely in under 1.5s, freeing data engineers from ad-hoc extraction queues.
                </p>
                <span
                  className="roi-pillar-badge"
                  style={{
                    backgroundColor: 'rgba(129, 140, 248, 0.1)',
                    color: '#818CF8',
                    border: '1px solid rgba(129, 140, 248, 0.25)',
                  }}
                >
                  [Jira Deflection: 65%]
                </span>
              </div>
            </div>
          </div>

          {/* Technical Verification Details */}
          <div className="roi-tech-box">
            <div>
              <strong>Kernel Binding:</strong> PostgreSQL 16.4 | SSL Verify-Full | Role:{' '}
              <code>qt_ai_readonly</code>
            </div>
            <div>
              <strong>AST Engine:</strong> SQLGlot Dialect Parser (PostgreSQL) | AST-01 to AST-06 Pipeline Active
            </div>
            <div>
              <strong>Regression Suite:</strong> 37/37 Benchmark Test Cases Passing | 151 Unit/Integration Tests
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="roi-modal-footer">
          <span className="roi-footer-spec">
            Zero-Trust Architectural Specification &bull; MIT Licensed
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
