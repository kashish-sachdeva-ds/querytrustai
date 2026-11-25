import React from 'react'

const ARCHITECTURAL_GUARANTEES = [
  {
    value: '6',
    label: 'AST Validation Checks',
    detail: 'Single SELECT root, allowed catalog tables, safe functions, bounded joins, and LIMIT enforcement.',
  },
  {
    value: 'qt_ai_readonly',
    label: 'PostgreSQL Reader Role',
    detail: 'Database connection executes exclusively under a SELECT-only role with zero write privileges.',
    monoValue: true,
  },
  {
    value: '5,000 ms',
    label: 'Statement Timeout',
    detail: 'Hard PostgreSQL statement timeout paired with a server-side 500-row cap per execution.',
  },
  {
    value: '4 Tables',
    label: 'Schema Allowlist',
    detail: 'Queries resolve only against devices, sites, service_events, and telemetry_readings.',
  },
]

export const MetricsStrip: React.FC = () => {
  return (
    <section
      id="metrics"
      className="py-16 sm:py-20 text-left transition-colors"
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
            Runtime Boundaries
          </div>
          <h2
            className="text-2xl sm:text-3xl font-normal tracking-tight"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}
          >
            Deterministic enforcement at every boundary
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ARCHITECTURAL_GUARANTEES.map((item) => (
            <div key={item.label} className="landing-card p-5 space-y-2">
              <div
                className={`${item.monoValue ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-semibold tracking-tight`}
                style={{
                  color: 'var(--color-text-primary)',
                  fontFamily: item.monoValue ? 'var(--font-mono)' : 'var(--font-sans)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.value}
              </div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {item.label}
              </div>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
