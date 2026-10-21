import React, { useEffect } from 'react'
import {
  ShieldCheck,
  Database,
  Search,
  X,
  HelpCircle,
} from 'lucide-react'
import './OnboardingModal.css'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectQuestion?: (question: string) => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')
  const modKey = isMac ? '⌘' : 'Ctrl'

  return (
    <div
      className="quickstart-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickstart-title"
    >
      <div className="quickstart-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="quickstart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div className="quickstart-icon-wrap" aria-hidden="true">
              <HelpCircle size={15} />
            </div>
            <div>
              <h3 id="quickstart-title" className="quickstart-title">QueryTrust Quickstart</h3>
              <p className="quickstart-subtitle">Core principles &amp; keyboard shortcuts</p>
            </div>
          </div>
          <button
            type="button"
            className="quickstart-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="quickstart-body">
          {/* Section 1: Core Principles */}
          <div className="quickstart-section">
            <span className="quickstart-section-heading">How QueryTrust Works</span>
            <div className="quickstart-principles-list">
              <div className="quickstart-principle-item">
                <Search size={14} className="principle-icon text-orange" aria-hidden="true" />
                <div className="principle-text">
                  <strong>Ask in plain English</strong>
                  <span>Type natural-language questions about equipment, telemetry, and health.</span>
                </div>
              </div>

              <div className="quickstart-principle-item">
                <Database size={14} className="principle-icon text-emerald" aria-hidden="true" />
                <div className="principle-text">
                  <strong>Read-only by design</strong>
                  <span>Database connections are strictly SELECT-only. Mutation or deletion is physically impossible.</span>
                </div>
              </div>

              <div className="quickstart-principle-item">
                <ShieldCheck size={14} className="principle-icon text-sky" aria-hidden="true" />
                <div className="principle-text">
                  <strong>Automated AST safety gates</strong>
                  <span>Every query is verified through 6 strict safety checks before touching the database.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Keyboard Shortcuts */}
          <div className="quickstart-section" style={{ marginTop: 14 }}>
            <span className="quickstart-section-heading">Keyboard Shortcuts</span>
            <div className="quickstart-shortcuts-table">
              <div className="shortcut-row">
                <span className="shortcut-desc">Ask a question / Quick search</span>
                <kbd className="shortcut-kbd">{modKey} K</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Open this cheatsheet</span>
                <kbd className="shortcut-kbd">?</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Close open drawer or dialog</span>
                <kbd className="shortcut-kbd">Esc</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Refresh fleet overview</span>
                <kbd className="shortcut-kbd">R</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="quickstart-footer">
          <button
            type="button"
            className="quickstart-confirm-btn"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
