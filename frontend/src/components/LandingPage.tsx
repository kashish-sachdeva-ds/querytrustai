import React from 'react'
import {
  ArrowUpRight,
  Terminal,
  ShieldCheck,
  Activity,
  Database,
  Cpu,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { CyberHeader } from './CyberHeader'
import { HeroCinematicBackground } from './HeroCinematicBackground'
import { HeroVisualStage } from './HeroVisualStage'
import { MagneticBorderButton } from './MagneticBorderButton'
import { ASTCompilerLab } from './ASTCompilerLab'
import { PlatformShowcase } from './PlatformShowcase'
import { ArchitecturalMonoliths } from './ArchitecturalMonoliths'
import { AttackDefenseMatrix } from './AttackDefenseMatrix'
import { MetricsStrip } from './MetricsStrip'
import { CyberFooter } from './CyberFooter'
import { FloatingBottomDock } from './FloatingBottomDock'
import './LandingPage.css'

interface LandingPageProps {
  onGoToLogin: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const { enterDemoMode } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="landing-page-root min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 selection:bg-sky-500/20 selection:text-sky-900 dark:selection:text-sky-100 relative overflow-x-hidden transition-colors pb-24">

      {/* ─── Minimalist Floating Navigation ─── */}
      <CyberHeader
        onSignIn={onGoToLogin}
        onLaunchAnalyst={() => enterDemoMode('analyst')}
        onLaunchAdmin={() => enterDemoMode('admin')}
      />

      {/* ─── Above-the-Fold Hero Section (12-Column Visual-First Split Layout) ─── */}
      <section className="relative pt-32 sm:pt-36 lg:pt-40 pb-16 sm:pb-24 lg:pb-28 px-4 sm:px-8 overflow-hidden">

        {/* Cinematic Spatial Grid, Cursor Spotlight & Volumetric Light Beams */}
        <HeroCinematicBackground />

        <div className="max-w-7xl mx-auto relative z-10 w-full">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">

            {/* ══════════════════════════════════════════════════════════════════
                LEFT COLUMN (col-span-12 lg:col-span-6) — Executive Headline & Proof Metrics
                ══════════════════════════════════════════════════════════════════ */}
            <div className="col-span-12 lg:col-span-6 text-left space-y-6">

              {/* 1. Top Enterprise Security Pill Badge */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#121215]/90 border border-zinc-200/90 dark:border-white/[0.12] font-mono text-[10.5px] text-zinc-600 dark:text-zinc-300 shadow-xs backdrop-blur-md"
              >
                <span className="flex items-center gap-1.5 font-bold text-zinc-950 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
                  <span>ZERO-TRUST SQL GOVERNANCE</span>
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">POSTGRESQL 16</span>
                <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">&bull;</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold text-[10px] border border-sky-500/20">
                  MATHEMATICAL IMMUTABILITY
                </span>
              </motion.div>

              {/* 2. Executive Headline with Architectural Contrast */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-[3.4rem] font-display font-bold tracking-tight leading-[1.14] text-zinc-950 dark:text-white">
                  Ask your database anything.{' '}
                  <span className="block mt-1 sm:mt-2 text-zinc-600 dark:text-zinc-300 font-normal">
                    With <span className="font-serif-italic text-sky-600 dark:text-sky-400">mathematically zero</span> mutation risk.
                  </span>
                </h1>

                {/* 3. Executive Subtitle */}
                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans font-normal max-w-xl pt-1">
                  Empower engineers and operators to query production telemetry in natural language. Every prompt is verified by a 6-layer SQLGlot AST compiler before reaching an immutable PostgreSQL 16 <code className="text-sky-600 dark:text-sky-400 font-mono font-semibold">qt_ai_readonly</code> kernel.
                </p>
              </motion.div>

              {/* 4. Action Buttons with Clean Tactile Badges */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-3.5 pt-2"
              >
                <MagneticBorderButton
                  variant="primary"
                  onClick={() => enterDemoMode('admin')}
                  tooltip="Full RBAC + 6-Gate AST Verification Lab"
                  icon={<span className="tactile-arrow-circle"><ArrowUpRight size={13} /></span>}
                >
                  Launch Admin Studio
                </MagneticBorderButton>

                <MagneticBorderButton
                  variant="secondary"
                  onClick={() => enterDemoMode('analyst')}
                  tooltip="Live Natural-Language SQL Generation Sandbox"
                  icon={<Terminal size={14} className="text-sky-500" />}
                >
                  Explore Analyst Sandbox
                </MagneticBorderButton>

                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="inline-flex items-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white font-medium text-xs transition-colors cursor-pointer pl-1"
                >
                  Sign in to workspace &rarr;
                </button>
              </motion.div>

              {/* 5. Sleek 4-Column Architectural Spec Ribbon */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 font-mono text-xs"
              >
                {/* Metric 1 */}
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#121215]/80 border border-zinc-200/90 dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#16161A] hover:-translate-y-0.5 hover:shadow-sm dark:hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-200 backdrop-blur-md shadow-xs relative group cursor-default">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                      <Activity size={11} className="text-zinc-400" />
                      <span>FLEET NODES</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
                  </div>
                  <div className="text-lg font-bold font-mono tracking-tight tabular-nums text-zinc-950 dark:text-white">5,000</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">50 Production Sites</div>
                </div>

                {/* Metric 2 */}
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#121215]/80 border border-zinc-200/90 dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#16161A] hover:-translate-y-0.5 hover:shadow-sm dark:hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-200 backdrop-blur-md shadow-xs relative group cursor-default">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                      <ShieldCheck size={11} className="text-zinc-400" />
                      <span>ISOLATION</span>
                    </span>
                    <span className="text-[9px] text-zinc-400 font-bold font-mono">100%</span>
                  </div>
                  <div className="text-lg font-bold font-mono tracking-tight tabular-nums text-zinc-950 dark:text-white">Read-Only</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">qt_ai_readonly Role</div>
                </div>

                {/* Metric 3 */}
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#121215]/80 border border-zinc-200/90 dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#16161A] hover:-translate-y-0.5 hover:shadow-sm dark:hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-200 backdrop-blur-md shadow-xs relative group cursor-default">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                      <Database size={11} className="text-zinc-400" />
                      <span>MUTATIONS</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-300 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
                  </div>
                  <div className="text-lg font-bold font-mono tracking-tight tabular-nums text-zinc-950 dark:text-white">0 Bytes</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">151/151 Test Passes</div>
                </div>

                {/* Metric 4 */}
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#121215]/80 border border-zinc-200/90 dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#16161A] hover:-translate-y-0.5 hover:shadow-sm dark:hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-200 backdrop-blur-md shadow-xs relative group cursor-default">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                      <Cpu size={11} className="text-zinc-400" />
                      <span>P95 AST</span>
                    </span>
                    <span className="text-[9px] text-zinc-400 font-bold font-mono">SUB-MS</span>
                  </div>
                  <div className="text-lg font-bold font-mono tracking-tight tabular-nums text-zinc-950 dark:text-white">1.42ms</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Deterministic Parse</div>
                </div>
              </motion.div>

            </div>

            {/* ══════════════════════════════════════════════════════════════════
                RIGHT COLUMN (col-span-12 lg:col-span-6) — Clean Hardware Centerpiece
                ══════════════════════════════════════════════════════════════════ */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="col-span-12 lg:col-span-6 relative w-full pt-4 lg:pt-0"
            >
              <HeroVisualStage />
            </motion.div>

          </div>

        </div>
      </section>

      {/* ─── Section 01: Interactive Live AST Compiler Exhibit ─── */}
      <section id="compiler-lab" className="max-w-7xl mx-auto px-4 sm:px-8 my-16 sm:my-24 lg:my-32 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8 px-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-[10px] uppercase tracking-wider font-mono">
              01 // INTERACTIVE WORKBENCH
            </span>
            <span className="font-semibold text-xs tracking-tight text-zinc-700 dark:text-zinc-300 font-display">
              AST Compiler &amp; Deflection Lab
            </span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
            <ShieldCheck size={13} className="text-sky-500" />
            <span>Select a query or adversarial scenario to test live compiler deflection</span>
          </div>
        </div>

        <ASTCompilerLab />
      </section>

      {/* ─── Section 02: Platform Capabilities Showcase (3D Bento Showcase) ─── */}
      <PlatformShowcase />

      {/* ─── Section 03: Core Architectural Invariants (3 Interactive Bento Cards) ─── */}
      <ArchitecturalMonoliths />

      {/* ─── Section 04: Live Attack & Defense Proof Matrix (Cyber-Defense Radar) ─── */}
      <AttackDefenseMatrix />

      {/* ─── Section 05: Benchmark Metrics Strip (Oscilloscope Waves) ─── */}
      <MetricsStrip />

      {/* ─── Section 06: Minimal Clean Editorial Footer (3D Portal CTA) ─── */}
      <CyberFooter
        onGoToLogin={onGoToLogin}
        onLaunchAnalyst={() => enterDemoMode('analyst')}
        onLaunchAdmin={() => enterDemoMode('admin')}
      />

      {/* ─── Floating Awwwards Nominee Bottom Dock ─── */}
      <FloatingBottomDock />

    </div>
  )
}
