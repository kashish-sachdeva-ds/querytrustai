import React, { useState } from 'react'
import { CheckCircle2, XCircle, ArrowUpRight, Database } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface HeroVisualStageProps {
  onOpenStudio?: () => void
}

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

const PREVIEW_SCENARIOS = {
  safe: {
    label: 'Safe query',
    question: 'Which Dallas switches have warranties expiring within 60 days?',
    status: 'PASSED' as const,
    summary: '6/6 AST checks passed · qt_ai_readonly',
    sql: `SELECT d.asset_tag, d.model, d.warranty_expiry
FROM devices d
JOIN sites s ON d.site_id = s.id
WHERE d.device_type = 'Switch' AND s.city = 'Dallas'
LIMIT 100;`,
    rows: [
      { tag: 'SW-CORE-DAL-01', model: 'OmniSwitch 9300', expiry: '2026-11-15', health: '99.4%' },
      { tag: 'SW-DIST-DAL-04', model: 'OmniSwitch 9300', expiry: '2026-11-28', health: '98.8%' },
      { tag: 'SW-EDGE-DAL-02', model: 'ApexEdge 7050', expiry: '2026-12-05', health: '97.9%' },
    ],
  },
  blocked: {
    label: 'Blocked DDL',
    question: 'List switches; DROP TABLE devices CASCADE;',
    status: 'BLOCKED' as const,
    summary: 'Stopped at Check #1 · 0 queries sent to PostgreSQL',
    sql: `SELECT * FROM devices;
DROP TABLE devices CASCADE; -- rejected by AST policy`,
    rows: [],
  },
}

const handleSpotlightMove = (e: React.PointerEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
}

export const HeroVisualStage: React.FC<HeroVisualStageProps> = ({ onOpenStudio }) => {
  const [scenarioKey, setScenarioKey] = useState<'safe' | 'blocked'>('safe')
  const current = PREVIEW_SCENARIOS[scenarioKey]

  return (
    <motion.div
      onPointerMove={handleSpotlightMove}
      animate={
        scenarioKey === 'blocked'
          ? { x: [0, -5, 5, -3, 3, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.36, ease: 'easeInOut' }}
      className="landing-card landing-spotlight-card w-full overflow-hidden text-left"
      style={{
        boxShadow: '0 20px 50px -24px color-mix(in srgb, var(--color-text-primary) 18%, transparent)',
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

        {/* Segmented Control with Spring Sliding Pill */}
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
                className="relative px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium cursor-pointer"
                style={{
                  color: active
                    ? key === 'blocked'
                      ? 'var(--color-status-error-text)'
                      : 'var(--color-accent-contrast)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {active && (
                  <motion.span
                    layoutId="hero-scenario-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    className="absolute inset-0 rounded-[6px]"
                    style={{
                      backgroundColor:
                        key === 'blocked'
                          ? 'var(--color-status-error-bg)'
                          : 'var(--color-accent)',
                      zIndex: 0,
                    }}
                  />
                )}
                <span className="relative z-10">{PREVIEW_SCENARIOS[key].label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Animated Scenario Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scenarioKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: EASE_EXPO }}
          className="p-4 sm:p-5 space-y-3.5 min-h-[348px] flex flex-col justify-between"
        >
          <div className="space-y-3.5">
          {/* Natural Language Question */}
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
            <motion.span
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.22, delay: 0.05 }}
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
            </motion.span>
          </div>

          {/* Single-line Validation Summary */}
          <div
            className="flex items-center justify-between text-[11.5px] px-1"
            style={{
              color:
                current.status === 'PASSED'
                  ? 'var(--color-status-success-text)'
                  : 'var(--color-status-error-text)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>{current.summary}</span>
          </div>

          {/* SQL Output */}
          <pre
            className="p-3.5 rounded-[8px] text-[11.5px] leading-relaxed overflow-x-auto m-0"
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
                  {current.rows.map((r, idx) => (
                    <motion.tr
                      key={r.tag}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.28, delay: 0.08 + idx * 0.05, ease: EASE_EXPO }}
                      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                      className="last:border-b-0 transition-colors hover:bg-[var(--color-raised)]"
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: EASE_EXPO }}
              className="p-3.5 rounded-[8px] text-[12.5px] leading-relaxed"
              style={{
                backgroundColor: 'var(--color-status-error-bg)',
                border: '1px solid var(--color-status-error-dot)',
                color: 'var(--color-status-error-text)',
              }}
            >
              SQLGlot requires a single top-level <code className="font-mono font-semibold">SELECT</code> statement. Multi-statement DDL is rejected before touching the database pool.
            </motion.div>
          )}
          </div>

          {onOpenStudio && (
            <div className="pt-0.5 flex items-center justify-end">
              <button
                type="button"
                onClick={onOpenStudio}
                className="group inline-flex items-center gap-1 text-[12px] font-medium cursor-pointer hover:underline"
                style={{ color: 'var(--color-accent-link)' }}
              >
                <span>Run live in Query Studio</span>
                <ArrowUpRight
                  size={13}
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
