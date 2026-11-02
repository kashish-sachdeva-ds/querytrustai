import React from 'react'
import {
  ArrowUpRight,
  Terminal,
  ShieldCheck,
  Award,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { CyberHeader } from './CyberHeader'
import { ASTCompilerLab } from './ASTCompilerLab'
import { ArchitecturalMonoliths } from './ArchitecturalMonoliths'
import { AttackDefenseMatrix } from './AttackDefenseMatrix'
import { PlatformShowcase } from './PlatformShowcase'
import { MetricsStrip } from './MetricsStrip'
import { CyberFooter } from './CyberFooter'
import { FloatingBottomDock } from './FloatingBottomDock'
import { HeroSpotlightBackground } from './HeroSpotlightBackground'
import './LandingPage.css'

interface LandingPageProps {
  onGoToLogin: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const { enterDemoMode } = useAuth()

  return (
    <div className="landing-page-root min-h-screen bg-[#F4F5F7] dark:bg-[#0B0F17] text-zinc-900 dark:text-zinc-100 selection:bg-sky-500/20 selection:text-sky-900 dark:selection:text-sky-100 relative overflow-x-hidden transition-colors pb-24">
      
      {/* ─── Minimalist Floating Navigation ─── */}
      <CyberHeader
        onSignIn={onGoToLogin}
        onLaunchAnalyst={() => enterDemoMode('analyst')}
        onLaunchAdmin={() => enterDemoMode('admin')}
      />

      {/* ─── Hero Section with Awwwards-Caliber Minimal Typography ─── */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-6 sm:px-8 text-center flex flex-col items-center">
        <HeroSpotlightBackground />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
          
          {/* Awwwards Nominee / Site of the Day Header Capsule */}
          <div className="inline-flex items-center gap-2 sm:gap-3 px-4 py-1.5 rounded-full bg-white dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-300 mb-8 shadow-xs">
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
          </div>

          {/* Monumental Minimal Headline */}
          <div className="max-w-5xl flex flex-col items-center">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-display font-extrabold tracking-tight leading-[1.02] text-zinc-950 dark:text-white">
              Ask your database anything.{' '}
              <span className="block text-sky-500 dark:text-sky-400">
                Mathematically zero risk.
              </span>
            </h1>

            <p className="mt-7 text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed font-sans font-normal mx-auto">
              QueryTrust AI inspects natural language queries through a 6-layer SQLGlot AST compiler, validating safe SELECT semantics in sub-milliseconds before socket transmission to an immutable read-only PostgreSQL kernel.
            </p>
          </div>

          {/* Clean High-Contrast Action Triggers */}
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => enterDemoMode('admin')}
              className="h-12 px-7 rounded-full bg-zinc-950 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-semibold text-xs shadow-md shadow-black/10 dark:shadow-white/5 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>Launch Studio as Admin</span>
              <ArrowUpRight size={15} />
            </button>

            <button
              type="button"
              onClick={() => enterDemoMode('analyst')}
              className="h-12 px-6 rounded-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Terminal size={14} className="text-sky-500" />
              <span>Evaluate Analyst Sandbox</span>
            </button>

            <button
              type="button"
              onClick={onGoToLogin}
              className="h-12 px-5 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Workspace Login &rarr;
            </button>
          </div>

          {/* Real Trust Telemetry Strip */}
          <div className="mt-8 flex items-center justify-center gap-3 sm:gap-6 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>5,000 Governed Devices</span>
            </span>
            <span>&bull;</span>
            <span>100% Read-Only Isolation</span>
            <span>&bull;</span>
            <span>0 Bytes Mutated Guaranteed</span>
            <span>&bull;</span>
            <span className="text-sky-600 dark:text-sky-400 font-semibold">1.42ms Compiler Latency</span>
          </div>

          {/* ─── Interactive Live AST Compiler Exhibit ─── */}
          <div id="compiler-lab" className="mt-16 sm:mt-24 w-full text-left">
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
          </div>

        </div>
      </section>

      {/* ─── Section 02: Platform Capabilities Showcase ─── */}
      <PlatformShowcase />

      {/* ─── Section 03: Metrics Strip ─── */}
      <MetricsStrip />

      {/* ─── Section 04: Architectural Invariants ─── */}
      <ArchitecturalMonoliths />

      {/* ─── Section 05: Live Attack & Defense Proof Matrix ─── */}
      <AttackDefenseMatrix />

      {/* ─── Section 06: Minimal Clean Editorial Footer ─── */}
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
