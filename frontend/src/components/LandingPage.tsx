import React from 'react'
import { ArrowUpRight, Terminal, ShieldCheck, Activity, Database, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { CyberHeader } from './CyberHeader'
import { HeroCinematicBackground } from './HeroCinematicBackground'
import { HeroVisualStage } from './HeroVisualStage'
import { ASTCompilerLab } from './ASTCompilerLab'
import { PlatformShowcase } from './PlatformShowcase'
import { ArchitecturalMonoliths } from './ArchitecturalMonoliths'
import { AttackDefenseMatrix } from './AttackDefenseMatrix'
import { MetricsStrip } from './MetricsStrip'
import { CyberFooter } from './CyberFooter'
import './LandingPage.css'

interface LandingPageProps {
  onGoToLogin: () => void
}

const HERO_SPECS = [
  {
    icon: Activity,
    label: 'Synthetic Fleet',
    value: '5,000',
    detail: 'Across 50 sites',
    mono: false,
  },
  {
    icon: ShieldCheck,
    label: 'Execution Role',
    value: 'Read-Only',
    detail: 'qt_ai_readonly',
    mono: false,
  },
  {
    icon: Database,
    label: 'AST Safety Checks',
    value: '6 Gates',
    detail: 'Single SELECT only',
    mono: false,
  },
  {
    icon: Lock,
    label: 'Statement Cap',
    value: '5,000 ms',
    detail: '500-row hard max',
    mono: false,
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const { enterDemoMode } = useAuth()

  return (
    <div className="landing-page-root relative overflow-x-hidden transition-colors">
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
            {/* Left Column: Editorial Headline, Summary, Actions & Spec Strip */}
            <div className="col-span-12 lg:col-span-6 text-left space-y-6">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11.5px] font-medium"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border-subtle)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-status-success-dot)' }}
                />
                <span>PostgreSQL 16 &middot; Read-Only SQL Governance</span>
              </div>

              <div className="space-y-4">
                <h1
                  className="text-[34px] sm:text-[44px] lg:text-[52px] font-normal tracking-[-0.02em] leading-[1.08]"
                  style={{
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  Ask your fleet database anything.{' '}
                  <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Read-only by construction.
                  </span>
                </h1>

                <p
                  className="text-[15px] sm:text-base leading-relaxed max-w-xl"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Let operators and analysts query infrastructure telemetry in plain English. Every generated query passes a 6-check SQLGlot AST validator before executing under the dedicated{' '}
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
                  database role.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => enterDemoMode('admin')}
                  className="px-5 py-2.5 text-[13.5px] font-medium inline-flex items-center gap-2 cursor-pointer landing-control-primary"
                >
                  <span>Open Admin Studio</span>
                  <ArrowUpRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => enterDemoMode('analyst')}
                  className="px-4 py-2.5 text-[13.5px] font-medium inline-flex items-center gap-2 cursor-pointer landing-control-secondary"
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
                  Sign in to workspace &rarr;
                </button>
              </div>

              {/* Grounded Architectural Spec Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
                {HERO_SPECS.map((spec) => {
                  const Icon = spec.icon
                  return (
                    <div key={spec.label} className="landing-card p-3.5 text-left">
                      <div
                        className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                      >
                        <Icon size={12} />
                        <span className="truncate">{spec.label}</span>
                      </div>
                      <div
                        className="text-lg font-semibold tracking-tight"
                        style={{
                          color: 'var(--color-text-primary)',
                          fontFamily: spec.mono ? 'var(--font-mono)' : 'var(--font-sans)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {spec.value}
                      </div>
                      <div
                        className="text-[11px] mt-0.5 truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {spec.detail}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Live Interactive Query & AST Verifier Card */}
            <div className="col-span-12 lg:col-span-6 w-full">
              <HeroVisualStage onOpenStudio={() => enterDemoMode('analyst')} />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Live AST Check Lab */}
      <section
        id="compiler-lab"
        className="py-16 sm:py-20 text-left transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
              >
                AST Validation Workbench
              </div>
              <h2
                className="text-2xl sm:text-3xl font-normal tracking-tight"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}
              >
                Test read queries against adversarial inputs
              </h2>
            </div>
            <div
              className="text-xs flex items-center gap-1.5"
              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
            >
              <ShieldCheck size={14} style={{ color: 'var(--color-status-success-dot)' }} />
              <span>SQLGlot PostgreSQL AST pipeline</span>
            </div>
          </div>

          <ASTCompilerLab />
        </div>
      </section>

      <PlatformShowcase />

      <ArchitecturalMonoliths />

      <AttackDefenseMatrix />

      <MetricsStrip />

      <CyberFooter
        onGoToLogin={onGoToLogin}
        onLaunchAnalyst={() => enterDemoMode('analyst')}
        onLaunchAdmin={() => enterDemoMode('admin')}
      />
    </div>
  )
}
