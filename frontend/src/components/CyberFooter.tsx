import React from 'react'
import { ArrowUpRight, Terminal } from 'lucide-react'
import { motion } from 'framer-motion'
import { QueryTrustLogo } from './QueryTrustLogo'

interface CyberFooterProps {
  onGoToLogin: () => void
  onLaunchAnalyst: () => void
  onLaunchAdmin: () => void
}

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

export const CyberFooter: React.FC<CyberFooterProps> = ({
  onGoToLogin,
  onLaunchAnalyst,
  onLaunchAdmin,
}) => {
  return (
    <footer
      className="relative py-16 text-left transition-colors overflow-hidden"
      style={{
        backgroundColor: 'var(--color-page-bg)',
        borderTop: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Subtle Top Accent Hairline Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[520px] max-w-full h-[1px]"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10 relative z-10">
        {/* Clean CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: EASE_EXPO }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="max-w-xl">
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.15]"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
            >
              Inspect natural-language SQL governance live.
            </h2>
            <p
              className="mt-2 text-sm sm:text-base leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Try the read-only Analyst sandbox or open the full Admin Studio.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLaunchAdmin}
              className="group px-5 py-2.5 text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer landing-control-primary"
            >
              <span>Open Admin Studio</span>
              <ArrowUpRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLaunchAnalyst}
              className="px-4 py-2.5 text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer landing-control-secondary"
            >
              <Terminal size={14} style={{ color: 'var(--color-accent-link)' }} />
              <span>Analyst Demo</span>
            </motion.button>
            <button
              type="button"
              onClick={onGoToLogin}
              className="px-2.5 py-2 text-[13px] font-medium transition-colors cursor-pointer hover:underline"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sign in &rarr;
            </button>
          </div>
        </motion.div>

        {/* Bottom Attribution Row */}
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{
            borderTop: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-muted)',
          }}
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
            <span className="landing-live-dot" aria-hidden="true" />
            <span>PostgreSQL 16 &middot; Read-Only</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
