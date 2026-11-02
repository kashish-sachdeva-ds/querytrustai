import React from 'react'
import {
  ArrowUpRight,
  Terminal,
  ShieldCheck,
  Award,
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
    <div className="landing-page-root min-h-screen bg-[#F4F5F7] dark:bg-[#0B0F17] text-zinc-900 dark:text-zinc-100 selection:bg-sky-500/20 selection:text-sky-900 dark:selection:text-sky-100 relative overflow-x-hidden transition-colors pb-24">
      
      {/* ─── Minimalist Floating Navigation ─── */}
      <CyberHeader
        onSignIn={onGoToLogin}
        onLaunchAnalyst={() => enterDemoMode('analyst')}
        onLaunchAdmin={() => enterDemoMode('admin')}
      />

      {/* ─── Above-the-Fold Hero Section (12-Column Visual-First Split Layout) ─── */}
      <section className="relative pt-28 lg:pt-36 pb-8 sm:pb-12 px-4 sm:px-8 overflow-hidden">
        
        {/* Cinematic Spatial Grid, Cursor Spotlight & Volumetric Light Beams */}
        <HeroCinematicBackground />

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          
          <div className="grid grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* ══════════════════════════════════════════════════════════════════
                LEFT COLUMN (col-span-12 lg:col-span-5) — Compact Editorial Copy
                ══════════════════════════════════════════════════════════════════ */}
            <div className="col-span-12 lg:col-span-5 text-left space-y-6">
              
              {/* 1. Top Pill Badge with Glowing Border Beam */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-white/[0.08] font-mono text-[10.5px] text-zinc-600 dark:text-zinc-300 shadow-xs backdrop-blur-md"
              >
                <span className="flex items-center gap-1.5 font-bold text-zinc-950 dark:text-white">
                  <Award size={13} className="text-amber-500" />
                  <span>AWWWARDS NOMINEE</span>
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">ZERO-TRUST BENCHMARK</span>
                <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">&bull;</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 font-semibold text-[10px]">
                  SCORE 9.94 / 10
                </span>
              </motion.div>

              {/* 2. Scaled-Down, Left-Aligned Headline */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2"
              >
                <h1 className="text-3xl sm:text-5xl xl:text-6xl font-display font-extrabold tracking-tight leading-[1.05] text-zinc-950 dark:text-white">
                  Ask your database anything.{' '}
                  <span className="block shimmer-liquid-blue">
                    Mathematically zero risk.
                  </span>
                </h1>

                {/* 3. Concise Subtitle */}
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans font-normal pt-2">
                  Natural language analytics powered by a 6-layer SQLGlot AST compiler and an immutable PostgreSQL 16 <code className="text-sky-600 dark:text-sky-400 font-mono font-semibold">qt_ai_readonly</code> kernel. Zero bytes mutated guaranteed.
                </p>
              </motion.div>

              {/* 4. Action Buttons with Animated Border Beams & Tooltips */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-4 pt-1"
              >
                <MagneticBorderButton
                  variant="primary"
                  onClick={() => enterDemoMode('admin')}
                  tooltip="Full RBAC + 6-Gate AST Verification Lab"
                  icon={<ArrowUpRight size={15} />}
                >
                  Launch Studio as Admin
                </MagneticBorderButton>

                <MagneticBorderButton
                  variant="secondary"
                  onClick={() => enterDemoMode('analyst')}
                  tooltip="Live Natural-Language SQL Generation Sandbox"
                  icon={<Terminal size={14} className="text-sky-500" />}
                >
                  Evaluate Analyst Sandbox
                </MagneticBorderButton>

                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="inline-flex items-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Workspace Login &rarr;
                </button>
              </motion.div>

              {/* 5. Compact 2x2 HUD Metric Grid directly under buttons */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-2 gap-2.5 pt-2 font-mono text-xs"
              >
                {/* Metric 1 */}
                <div className="p-4 pb-5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Activity size={10} className="text-sky-500" />
                      <span>DEVICES</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-lg font-bold text-zinc-950 dark:text-white">5,000 Nodes</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">50 Global Sites</div>
                </div>

                {/* Metric 2 */}
                <div className="p-4 pb-5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={10} className="text-emerald-500" />
                      <span>ISOLATION</span>
                    </span>
                    <span className="text-[9px] text-emerald-500 font-bold">100%</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Read-Only</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">qt_ai_readonly</div>
                </div>

                {/* Metric 3 */}
                <div className="p-4 pb-5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Database size={10} className="text-sky-500" />
                      <span>MUTATIONS</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  </div>
                  <div className="text-lg font-bold text-zinc-950 dark:text-white">0 Bytes</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">151/151 Pass</div>
                </div>

                {/* Metric 4 */}
                <div className="p-4 pb-5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Cpu size={10} className="text-sky-500" />
                      <span>P95 LATENCY</span>
                    </span>
                    <span className="text-[9px] text-sky-400 font-bold">AST</span>
                  </div>
                  <div className="text-lg font-bold text-sky-600 dark:text-sky-400">1.42ms</div>
                  <div className="h-2 w-full mt-2 pr-1 pb-1">
                    <svg viewBox="0 0 60 8" className="w-full h-full">
                      <path d="M0 4 Q 15 1, 30 4 T 60 4" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* ══════════════════════════════════════════════════════════════════
                RIGHT COLUMN (col-span-12 lg:col-span-7) — 4-Layer Visual Centerpiece
                ══════════════════════════════════════════════════════════════════ */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="col-span-12 lg:col-span-7 relative w-full pt-4 lg:pt-0"
            >
              <HeroVisualStage />
            </motion.div>

          </div>

        </div>
      </section>

      {/* ─── Section 01: Interactive Live AST Compiler Exhibit ─── */}
      <section id="compiler-lab" className="max-w-7xl mx-auto px-4 sm:px-8 mt-4 sm:mt-6 text-left">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-[10px] uppercase tracking-wider font-mono">
              01 // INTERACTIVE EXHIBIT
            </span>
            <span className="font-semibold text-xs tracking-tight text-zinc-700 dark:text-zinc-300 font-display">
              AST Compiler &amp; Interception Lab
            </span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:flex items-center gap-1.5 font-mono">
            <ShieldCheck size={13} className="text-sky-500" />
            <span>Select a scenario to test live AST deflection</span>
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
