import React, { useState } from 'react'
import { ShieldAlert, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

interface ThreatVector {
  id: string
  name: string
  sampleAttack: string
  gateIntercepted: string
  mitigation: string
}

const THREAT_VECTORS: ThreatVector[] = [
  {
    id: 'ddl-drop',
    name: 'Destructive DDL statement',
    sampleAttack: 'DROP TABLE devices CASCADE; -- wipe production catalog',
    gateIntercepted: 'Check #1 · Single SELECT Statement',
    mitigation: 'SQLGlot requires a single top-level exp.Select root. Found exp.Drop and rejected the query before borrowing a database connection.',
  },
  {
    id: 'dml-privilege',
    name: 'Privilege escalation mutation',
    sampleAttack: "UPDATE user_accounts SET role = 'admin' WHERE email = current_user;",
    gateIntercepted: 'Check #1 & #3 · Mutation Lockout',
    mitigation: 'UPDATE statements and user account tables are blocked in AST validation and additionally denied by qt_ai_readonly.',
  },
  {
    id: 'catalog-exfil',
    name: 'System catalog reconnaissance',
    sampleAttack: 'SELECT usename, passwd FROM pg_shadow UNION SELECT 1, 2;',
    gateIntercepted: 'Check #2 · Table Allowlist',
    mitigation: 'System table "pg_shadow" is outside the 4-table analytics allowlist (devices, sites, service_events, telemetry_readings).',
  },
  {
    id: 'cartesian-dos',
    name: 'Unbounded cross-join exhaustion',
    sampleAttack: 'SELECT * FROM devices, telemetry_readings, service_events;',
    gateIntercepted: 'Check #5 · Join Predicate Validation',
    mitigation: 'Cross joins without explicit ON predicates are rejected during AST traversal to prevent multi-table row amplification.',
  },
  {
    id: 'unbounded-dump',
    name: 'Unbounded bulk extraction',
    sampleAttack: 'SELECT * FROM telemetry_readings;',
    gateIntercepted: 'Check #6 · Row Limit Clamp',
    mitigation: 'Server validation injects and clamps a hard LIMIT clause (500 rows max) alongside the 5,000 ms statement timeout.',
  },
]

const handleSpotlightMove = (e: React.PointerEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
}

export const AttackDefenseMatrix: React.FC = () => {
  const [selectedThreatId, setSelectedThreatId] = useState<string>('ddl-drop')
  const activeThreat = THREAT_VECTORS.find((t) => t.id === selectedThreatId) || THREAT_VECTORS[0]

  return (
    <section
      id="attack-matrix"
      className="py-16 sm:py-22 text-left transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE_EXPO }}
          className="max-w-xl mb-8"
        >
          <div
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
          >
            Guardrails
          </div>
          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.15]"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
          >
            Blocked before reaching PostgreSQL
          </h2>
          <p className="mt-2.5 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Select an attack pattern to inspect which SQLGlot check stops it.
          </p>
        </motion.div>

        {/* Split Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE_EXPO }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Vector List with gliding active indicator */}
          <div className="lg:col-span-5 space-y-2">
            {THREAT_VECTORS.map((threat) => {
              const selected = threat.id === activeThreat.id
              return (
                <motion.button
                  key={threat.id}
                  type="button"
                  whileHover={{ x: selected ? 0 : 3 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedThreatId(threat.id)}
                  className="relative w-full text-left px-4 py-3.5 rounded-[10px] cursor-pointer flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: 'var(--color-page-bg)',
                    border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
                  }}
                >
                  {selected && (
                    <motion.span
                      layoutId="threat-selector-bg"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      className="absolute inset-0 rounded-[10px]"
                      style={{ backgroundColor: 'var(--color-raised)', zIndex: 0 }}
                    />
                  )}
                  <div className="relative z-10 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {threat.name}
                    </div>
                    <div
                      className="text-[11px] mt-0.5 truncate"
                      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {threat.gateIntercepted}
                    </div>
                  </div>
                  <ChevronRight
                    size={15}
                    className="relative z-10 shrink-0 transition-transform duration-200"
                    style={{
                      color: selected ? 'var(--color-accent-link)' : 'var(--color-text-muted)',
                      transform: selected ? 'translateX(2px)' : 'none',
                    }}
                  />
                </motion.button>
              )
            })}
          </div>

          {/* Detail Card with AnimatePresence Swap */}
          <div
            onPointerMove={handleSpotlightMove}
            className="lg:col-span-7 landing-card landing-spotlight-card p-6 min-h-[210px]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeThreat.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.22, ease: EASE_EXPO }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                    {activeThreat.name}
                  </h3>
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.04 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium"
                    style={{
                      backgroundColor: 'var(--color-status-error-bg)',
                      color: 'var(--color-status-error-text)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <ShieldAlert size={12} />
                    <span>Blocked</span>
                  </motion.span>
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

                <div className="space-y-1.5">
                  <div
                    className="text-[11px] uppercase tracking-wider font-medium"
                    style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
                  >
                    {activeThreat.gateIntercepted}
                  </div>
                  <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {activeThreat.mitigation}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
