import React, { useState } from 'react'
import { Shield, Lock, FileCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

const handleSpotlightMove = (e: React.PointerEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
}

export const ArchitecturalMonoliths: React.FC = () => {
  const [writeTestState, setWriteTestState] = useState<'idle' | 'denied'>('idle')

  return (
    <section
      id="three-invariants"
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
          className="max-w-xl mb-10"
        >
          <div
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
          >
            Safeguards
          </div>
          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.15]"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
          >
            Read-only enforcement at every step
          </h2>
          <p className="mt-2.5 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            LLM instructions are never a security boundary. Three independent layers keep data safe.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Layer 1 */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, delay: 0.05, ease: EASE_EXPO }}
            whileHover={{ y: -4 }}
            onPointerMove={handleSpotlightMove}
            className="group landing-card landing-spotlight-card p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-[8px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  color: 'var(--color-accent-link)',
                }}
              >
                <Shield size={16} />
              </div>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                01
              </span>
            </div>
            <h3 className="text-base font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              SQLGlot AST Validation
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Every generated statement is parsed before execution. Multi-statement queries, writes, and system tables are rejected immediately.
            </p>
          </motion.div>

          {/* Layer 2 */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, delay: 0.14, ease: EASE_EXPO }}
            whileHover={{ y: -4 }}
            onPointerMove={handleSpotlightMove}
            className="group landing-card landing-spotlight-card p-6 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-[8px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                  style={{
                    backgroundColor: 'var(--color-status-success-bg)',
                    color: 'var(--color-status-success-text)',
                  }}
                >
                  <Lock size={16} />
                </div>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  02
                </span>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setWriteTestState(writeTestState === 'denied' ? 'idle' : 'denied')}
                className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium cursor-pointer landing-control-secondary"
              >
                {writeTestState === 'denied' ? 'Reset test' : 'Test write call'}
              </motion.button>
            </div>
            <h3 className="text-base font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Dedicated Reader Role
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Queries connect via{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                qt_ai_readonly
              </code>{' '}
              with <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>SELECT</code>-only grants and zero write privileges.
            </p>
            <AnimatePresence>
              {writeTestState === 'denied' && (
                <motion.div
                  initial={{ opacity: 0, height: 0, x: -6 }}
                  animate={{ opacity: 1, height: 'auto', x: [0, -4, 4, -2, 0] }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE_EXPO }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-3 py-2 rounded-[6px] text-[11.5px]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'var(--color-status-error-bg)',
                      color: 'var(--color-status-error-text)',
                    }}
                  >
                    ERROR: permission denied for table devices
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Layer 3 */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, delay: 0.23, ease: EASE_EXPO }}
            whileHover={{ y: -4 }}
            onPointerMove={handleSpotlightMove}
            className="group landing-card landing-spotlight-card p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-[8px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                style={{
                  backgroundColor: 'var(--color-raised)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <FileCheck size={16} />
              </div>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                03
              </span>
            </div>
            <h3 className="text-base font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Bounded Preview IDs
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Browsers never send raw SQL to execution. Only server-stored preview IDs run, capped at 500 rows and 5,000 ms.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
