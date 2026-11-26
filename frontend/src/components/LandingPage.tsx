import React, { useEffect, useState } from 'react'
import { ArrowUpRight, Terminal } from 'lucide-react'
import { MotionConfig, animate, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { CyberHeader } from './CyberHeader'
import { HeroCinematicBackground } from './HeroCinematicBackground'
import { HeroVisualStage } from './HeroVisualStage'
import { PlatformShowcase } from './PlatformShowcase'
import { ArchitecturalMonoliths } from './ArchitecturalMonoliths'
import { AttackDefenseMatrix } from './AttackDefenseMatrix'
import { CyberFooter } from './CyberFooter'
import './LandingPage.css'

interface LandingPageProps {
  onGoToLogin: () => void
}

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

interface HeroStat {
  label: string
  target: number
  suffix: string
  detail: string
}

const HERO_STATS: HeroStat[] = [
  { label: 'Synthetic Fleet', target: 5000, suffix: '', detail: 'Devices across 50 sites' },
  { label: 'AST Validation', target: 6, suffix: ' Checks', detail: 'Single SELECT only' },
  { label: 'Query Bounds', target: 5000, suffix: ' ms', detail: '500-row hard cap' },
]

const AnimatedStatValue: React.FC<{ target: number; suffix: string; delay?: number }> = ({
  target,
  suffix,
  delay = 0.2,
}) => {
  const [display, setDisplay] = useState(target)

  useEffect(() => {
    setDisplay(0)
    const controls = animate(0, target, {
      duration: 0.75,
      delay,
      ease: EASE_EXPO,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    })
    return () => controls.stop()
  }, [target, delay])

  return (
    <span>
      {display.toLocaleString('en-US')}
      {suffix}
    </span>
  )
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const { enterDemoMode } = useAuth()

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-page-root relative overflow-x-clip transition-colors">
        <CyberHeader
          onSignIn={onGoToLogin}
          onLaunchAnalyst={() => enterDemoMode('analyst')}
          onLaunchAdmin={() => enterDemoMode('admin')}
        />

        {/* Above-the-Fold Hero Section */}
        <section className="relative pt-14 sm:pt-20 lg:pt-24 pb-16 sm:pb-24 px-4 sm:px-8 overflow-hidden">
          <HeroCinematicBackground />

          <div className="max-w-7xl mx-auto relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              {/* Left Column: Choreographed Editorial Reveal */}
              <div className="col-span-12 lg:col-span-6 text-left space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_EXPO }}
                  className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full text-[11.5px] font-medium"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border-subtle)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span className="landing-live-dot" aria-hidden="true" />
                  <span>PostgreSQL 16 &middot; Read-Only SQL</span>
                </motion.div>

                <div className="space-y-4">
                  <h1
                    className="text-[34px] sm:text-[44px] lg:text-[50px] font-semibold tracking-[-0.03em] leading-[1.1]"
                    style={{
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    <span className="block overflow-hidden">
                      <motion.span
                        className="block"
                        initial={{ y: '105%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.08, ease: EASE_EXPO }}
                      >
                        Ask your fleet database anything.
                      </motion.span>
                    </span>
                    <span className="block overflow-hidden mt-1">
                      <motion.span
                        className="block landing-gradient-text"
                        initial={{ y: '105%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.18, ease: EASE_EXPO }}
                      >
                        Read-only by construction.
                      </motion.span>
                    </span>
                  </h1>

                  <motion.p
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.28, ease: EASE_EXPO }}
                    className="text-[15.5px] leading-relaxed max-w-lg"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Query fleet telemetry in plain English. Every query passes 6 SQLGlot AST checks and runs under the read-only{' '}
                    <code
                      className="px-1.5 py-0.5 rounded-[4px] text-[13px]"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--color-raised)',
                        color: 'var(--color-accent-link)',
                      }}
                    >
                      qt_ai_readonly
                    </code>{' '}
                    role.
                  </motion.p>
                </div>

                {/* Tactile Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.36, ease: EASE_EXPO }}
                  className="flex flex-wrap items-center gap-3 pt-1"
                >
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => enterDemoMode('admin')}
                    className="group px-5 py-2.5 text-[13.5px] font-medium inline-flex items-center gap-2 whitespace-nowrap cursor-pointer landing-control-primary"
                  >
                    <span>Open Admin Studio</span>
                    <ArrowUpRight
                      size={15}
                      className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => enterDemoMode('analyst')}
                    className="px-4 py-2.5 text-[13.5px] font-medium inline-flex items-center gap-2 whitespace-nowrap cursor-pointer landing-control-secondary"
                  >
                    <Terminal size={14} style={{ color: 'var(--color-accent-link)' }} />
                    <span>Analyst Demo</span>
                  </motion.button>

                  <button
                    type="button"
                    onClick={onGoToLogin}
                    className="px-2.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer hover:underline"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Sign in &rarr;
                  </button>
                </motion.div>

                {/* Animated 3-Stat Strip */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.44, ease: EASE_EXPO }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6"
                  style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                >
                  {HERO_STATS.map((stat, idx) => (
                    <div key={stat.label} className="text-left">
                      <div
                        className="text-[11px] font-medium uppercase tracking-wider mb-1"
                        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                      >
                        {stat.label}
                      </div>
                      <div
                        className="text-xl font-semibold tracking-tight"
                        style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
                      >
                        <AnimatedStatValue
                          target={stat.target}
                          suffix={stat.suffix}
                          delay={0.22 + idx * 0.06}
                        />
                      </div>
                      <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {stat.detail}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right Column: Live Interactive Query & AST Verifier Card */}
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.75, delay: 0.22, ease: EASE_EXPO }}
                className="col-span-12 lg:col-span-6 w-full"
              >
                <HeroVisualStage onOpenStudio={() => enterDemoMode('analyst')} />
              </motion.div>
            </div>
          </div>
        </section>

        <ArchitecturalMonoliths />

        <PlatformShowcase />

        <AttackDefenseMatrix />

        <CyberFooter
          onGoToLogin={onGoToLogin}
          onLaunchAnalyst={() => enterDemoMode('analyst')}
          onLaunchAdmin={() => enterDemoMode('admin')}
        />
      </div>
    </MotionConfig>
  )
}
