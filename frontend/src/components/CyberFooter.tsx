import React from 'react'
import { ArrowUpRight, Terminal } from 'lucide-react'
import { QueryTrustLogo } from './QueryTrustLogo'

interface CyberFooterProps {
  onGoToLogin: () => void
  onLaunchAnalyst: () => void
  onLaunchAdmin: () => void
}

export const CyberFooter: React.FC<CyberFooterProps> = ({
  onGoToLogin,
  onLaunchAnalyst,
  onLaunchAdmin,
}) => {
  return (
    <footer
      className="py-16 text-left transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Top Editorial CTA */}
        <div
          className="pb-12"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <div
            className="text-xs font-medium uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
          >
            Interactive Workbench
          </div>
          <h2
            className="text-3xl sm:text-4xl font-normal tracking-tight leading-[1.12] max-w-2xl"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}
          >
            Inspect natural-language SQL governance in action.
          </h2>
          <p
            className="mt-3 text-sm sm:text-base leading-relaxed max-w-xl"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Explore the full 8-tab workbench across synthetic infrastructure fixtures, or launch the read-only Analyst sandbox.
          </p>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onLaunchAdmin}
              className="px-5 py-2.5 text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer landing-control-primary"
            >
              <span>Open Admin Studio</span>
              <ArrowUpRight size={14} />
            </button>
            <button
              type="button"
              onClick={onLaunchAnalyst}
              className="px-4 py-2.5 text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer landing-control-secondary"
            >
              <Terminal size={14} style={{ color: 'var(--color-accent-link)' }} />
              <span>Try Analyst Sandbox</span>
            </button>
            <button
              type="button"
              onClick={onGoToLogin}
              className="px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer hover:underline"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sign in &rarr;
            </button>
          </div>
        </div>

        {/* Technical Specification Matrix */}
        <div
          className="py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <div>
            <div
              className="uppercase tracking-wider mb-2.5 font-semibold"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              AST Validation
            </div>
            <div className="space-y-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <div>SQLGlot PostgreSQL Dialect</div>
              <div>6 Deterministic AST Checks</div>
              <div>Single SELECT Root Policy</div>
              <div>Server-Stored Preview IDs</div>
            </div>
          </div>

          <div>
            <div
              className="uppercase tracking-wider mb-2.5 font-semibold"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              Database Reader
            </div>
            <div className="space-y-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <div>PostgreSQL 16 Engine</div>
              <div>
                Role:{' '}
                <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                  qt_ai_readonly
                </code>
              </div>
              <div>SELECT Grants Only</div>
              <div>Zero Write Privileges</div>
            </div>
          </div>

          <div>
            <div
              className="uppercase tracking-wider mb-2.5 font-semibold"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              Synthetic Dataset
            </div>
            <div className="space-y-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <div>5,000 Synthetic Devices</div>
              <div>50 Infrastructure Sites</div>
              <div>25,000 Telemetry Readings</div>
              <div>1,500 Service Events</div>
            </div>
          </div>

          <div>
            <div
              className="uppercase tracking-wider mb-2.5 font-semibold"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              Execution Limits
            </div>
            <div className="space-y-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <div>5,000 ms Statement Timeout</div>
              <div>100-Row Default Preview Clamp</div>
              <div>500-Row Server Maximum</div>
              <div>Schema Allowlist Enforced</div>
            </div>
          </div>
        </div>

        {/* Bottom Attribution Row */}
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <div className="flex items-center gap-2.5">
            <QueryTrustLogo size={20} />
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              QueryTrust AI
            </span>
            <span>&middot;</span>
            <span>Governed Natural-Language SQL Workbench</span>
          </div>

          <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-status-success-dot)' }}
            />
            <span>PostgreSQL 16 &middot; Read-Only Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
