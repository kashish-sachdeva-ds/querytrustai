import React, { useState } from 'react'
import { CheckCircle2, XCircle, ShieldCheck, ArrowUpRight, Database } from 'lucide-react'

interface HeroVisualStageProps {
  onOpenStudio?: () => void
}

const PREVIEW_SCENARIOS = {
  safe: {
    label: 'Safe fleet query',
    question: 'Which Dallas switches have warranties expiring within 60 days?',
    status: 'PASSED' as const,
    summary: 'All 6 AST checks passed · Executed via qt_ai_readonly',
    sql: `SELECT d.asset_tag, d.model, s.site_name, d.warranty_expiry
FROM devices d
JOIN sites s ON d.site_id = s.id
WHERE d.device_type = 'Switch'
  AND s.city = 'Dallas'
  AND d.warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY d.warranty_expiry ASC
LIMIT 100;`,
    gates: [
      { id: 1, name: 'Single SELECT', ok: true },
      { id: 2, name: 'Allowlist tables', ok: true },
      { id: 3, name: 'No mutation AST', ok: true },
      { id: 4, name: 'Safe functions', ok: true },
      { id: 5, name: 'Bounded joins', ok: true },
      { id: 6, name: 'LIMIT 100 clamp', ok: true },
    ],
    rows: [
      { tag: 'SW-CORE-DAL-01', model: 'OmniSwitch 9300', expiry: '2026-11-15', health: '99.4%' },
      { tag: 'SW-DIST-DAL-04', model: 'OmniSwitch 9300', expiry: '2026-11-28', health: '98.8%' },
      { tag: 'SW-EDGE-DAL-02', model: 'ApexEdge 7050', expiry: '2026-12-05', health: '97.9%' },
    ],
  },
  blocked: {
    label: 'Blocked DDL injection',
    question: 'List switches; DROP TABLE devices CASCADE;',
    status: 'BLOCKED' as const,
    summary: 'Rejected at AST Check #1 · 0 queries sent to PostgreSQL',
    sql: `SELECT * FROM devices;
DROP TABLE devices CASCADE; -- blocked prior to execution`,
    gates: [
      { id: 1, name: 'Single SELECT', ok: false },
      { id: 2, name: 'Allowlist tables', ok: true },
      { id: 3, name: 'No mutation AST', ok: false },
      { id: 4, name: 'Safe functions', ok: true },
      { id: 5, name: 'Bounded joins', ok: true },
      { id: 6, name: 'LIMIT 100 clamp', ok: true },
    ],
    rows: [],
  },
}

export const HeroVisualStage: React.FC<HeroVisualStageProps> = ({ onOpenStudio }) => {
  const [scenarioKey, setScenarioKey] = useState<'safe' | 'blocked'>('safe')
  const current = PREVIEW_SCENARIOS[scenarioKey]

  return (
    <div
      className="w-full overflow-hidden text-left"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-container)',
      }}
    >
      {/* Window Header */}
      <div
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
        style={{
          backgroundColor: 'var(--color-raised)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <Database size={14} style={{ color: 'var(--color-accent-link)' }} />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
          >
            Query Studio Preview
          </span>
        </div>

        <div
          className="inline-flex p-0.5 rounded-[8px]"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          {(['safe', 'blocked'] as const).map((key) => {
            const active = scenarioKey === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setScenarioKey(key)}
                className="px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: active
                    ? key === 'blocked'
                      ? 'var(--color-status-error-bg)'
                      : 'var(--color-accent)'
                    : 'transparent',
                  color: active
                    ? key === 'blocked'
                      ? 'var(--color-status-error-text)'
                      : 'var(--color-accent-contrast)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {PREVIEW_SCENARIOS[key].label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Natural Language Question */}
      <div className="p-4 sm:p-5 space-y-4">
        <div
          className="px-3.5 py-2.5 rounded-[8px] flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--color-raised)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {current.question}
          </span>
          <span
            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium"
            style={{
              fontFamily: 'var(--font-mono)',
              backgroundColor:
                current.status === 'PASSED'
                  ? 'var(--color-status-success-bg)'
                  : 'var(--color-status-error-bg)',
              color:
                current.status === 'PASSED'
                  ? 'var(--color-status-success-text)'
                  : 'var(--color-status-error-text)',
            }}
          >
            {current.status === 'PASSED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            <span>{current.status}</span>
          </span>
        </div>

        {/* 6-Check AST Gates */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] font-medium flex items-center gap-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <ShieldCheck size={13} style={{ color: 'var(--color-accent-link)' }} />
              <span>SQLGlot AST Validation</span>
            </span>
            <span
              className="text-[11px]"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {current.summary}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {current.gates.map((g) => (
              <div
                key={g.id}
                className="px-2.5 py-1.5 rounded-[8px] flex items-center gap-2 text-[11.5px]"
                style={{
                  backgroundColor: g.ok ? 'var(--color-raised)' : 'var(--color-status-error-bg)',
                  border: `1px solid ${g.ok ? 'var(--color-border-subtle)' : 'var(--color-status-error-dot)'}`,
                  color: g.ok ? 'var(--color-text-primary)' : 'var(--color-status-error-text)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: g.ok
                      ? 'var(--color-status-success-dot)'
                      : 'var(--color-status-error-dot)',
                  }}
                />
                <span className="truncate font-medium">{g.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SQL Output */}
        <pre
          className="p-3 rounded-[8px] text-[11.5px] leading-relaxed overflow-x-auto m-0"
          style={{
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--color-raised)',
            border: '1px solid var(--color-border-subtle)',
            color:
              current.status === 'BLOCKED'
                ? 'var(--color-status-error-text)'
                : 'var(--color-text-primary)',
          }}
        >
          <code>{current.sql}</code>
        </pre>

        {/* Preview Rows OR Rejection Notice */}
        {current.status === 'PASSED' ? (
          <div
            className="rounded-[8px] overflow-hidden"
            style={{ border: '1px solid var(--color-border-subtle)' }}
          >
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-raised)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <th className="py-2 px-3 font-medium">Asset Tag</th>
                  <th className="py-2 px-3 font-medium">Model</th>
                  <th className="py-2 px-3 font-medium">Warranty</th>
                  <th className="py-2 px-3 font-medium text-right">Health</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                {current.rows.map((r) => (
                  <tr
                    key={r.tag}
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                    className="last:border-b-0"
                  >
                    <td className="py-2 px-3 font-medium">{r.tag}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {r.model}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {r.expiry}
                    </td>
                    <td
                      className="py-2 px-3 text-right"
                      style={{ color: 'var(--color-status-success-text)' }}
                    >
                      {r.health}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="p-3 rounded-[8px] text-[12px] leading-relaxed"
            style={{
              backgroundColor: 'var(--color-status-error-bg)',
              border: '1px solid var(--color-status-error-dot)',
              color: 'var(--color-status-error-text)',
            }}
          >
            SQLGlot parser requires a single top-level SELECT expression. Statement terminated before acquiring a database connection from the <code className="font-mono font-semibold">qt_ai_readonly</code> pool.
          </div>
        )}

        {onOpenStudio && (
          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={onOpenStudio}
              className="inline-flex items-center gap-1 text-[12px] font-medium cursor-pointer hover:underline"
              style={{ color: 'var(--color-accent-link)' }}
            >
              <span>Run live in Query Studio</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
