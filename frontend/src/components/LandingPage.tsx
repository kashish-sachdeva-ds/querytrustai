import React, { useState } from 'react'
import {
  ShieldAlert,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Terminal,
  Lock,
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { QueryTrustLogo } from './QueryTrustLogo'
import { HeroSpotlightBackground } from './HeroSpotlightBackground'
import { SpotlightCard } from './SpotlightCard'
import { ASTAnimatedBeam } from './ASTAnimatedBeam'
import './LandingPage.css'

interface LandingPageProps {
  onGoToLogin: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const { theme, toggleTheme } = useTheme()
  const { enterDemoMode } = useAuth()
  const [activePreviewTab, setActivePreviewTab] = useState<'safe' | 'blocked'>('safe')
  const [copied, setCopied] = useState(false)

  const copySql = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const safeSql = `SELECT device_name, model, site, warranty_expiry, status
FROM devices
WHERE device_type = 'Switch'
  AND site = 'Dallas Datacenter'
  AND warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY warranty_expiry ASC
LIMIT 100;`

  const blockedSql = `DROP TABLE devices CASCADE; -- Attempted destruction`

  return (
    <div className="landing-page-root min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] selection:bg-orange-500/20 selection:text-orange-500 transition-colors duration-200 relative overflow-x-hidden">
      {/* ─── SECTION A: Minimalist Floating Navbar ─── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[var(--bg-glass)] border-b border-[var(--border-subtle)]">
        <div className="max-w-6xl mx-auto h-16 px-6 flex items-center justify-between">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <QueryTrustLogo size={28} />
            <span className="font-semibold tracking-tight text-base font-display">
              Query<span className="text-[#F97316]">Trust</span>
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-muted)]" aria-label="Main">
            <a href="#interactive-preview" className="hover:text-[var(--text-main)] transition-colors">
              Architecture
            </a>
            <a href="#pillars" className="hover:text-[var(--text-main)] transition-colors">
              Security Proof
            </a>
            <a href="#pillars" className="hover:text-[var(--text-main)] transition-colors">
              Benchmarks
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Sign In Link */}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-sm font-medium px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              Sign In
            </button>

            {/* Launch App Primary CTA Pill */}
            <button
              type="button"
              onClick={() => enterDemoMode('analyst')}
              className="h-9 px-4 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Launch App</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── SECTION B: Centered Atmospheric Hero ─── */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 text-center px-6">
        <HeroSpotlightBackground />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* 1 Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-muted)] mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Compiler-Grade SQL Governance</span>
          </div>

          {/* Dramatic 2-Line Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-semibold tracking-[-0.03em] leading-[1.08] text-[var(--text-main)]">
            Ask your database anything.{' '}
            <span className="block bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              Mathematically zero risk.
            </span>
          </h1>

          {/* Concise 2-Line Subheadline */}
          <p className="mt-6 text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            QueryTrust AI inspects every natural-language query through a 6-layer SQLGlot Abstract Syntax Tree
            compiler and executes strictly on a zero-write PostgreSQL kernel.
          </p>

          {/* ONLY 2 CTA Buttons */}
          <div className="mt-9 flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={onGoToLogin}
              className="h-11 px-6 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <span>Launch Live Workspace</span>
              <ArrowRight size={15} />
            </button>
            <a
              href="#interactive-preview"
              className="h-11 px-6 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-main)] font-medium text-sm transition-all flex items-center gap-2"
            >
              <Sparkles size={15} className="text-[#F97316]" />
              <span>Try Interactive AST Demo</span>
            </a>
          </div>

          {/* ─── Interactive Product Showcase Window ─── */}
          <div id="interactive-preview" className="mt-16 sm:mt-20 text-left max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl overflow-hidden">
              {/* Window Header */}
              <div className="h-12 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between bg-[var(--bg-subtle)]">
                {/* Window Dots */}
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>

                {/* 2 Simple Tabs */}
                <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('safe')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                      activePreviewTab === 'safe'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>Safe Analytics Query</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('blocked')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                      activePreviewTab === 'blocked'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <XCircle size={12} />
                    <span>Blocked SQL Injection</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:block">
                  kernel: <span className="text-emerald-600 dark:text-emerald-400">qt_ai_readonly</span>
                </div>
              </div>

              {/* Interactive Sandbox Body */}
              <div className="p-6 space-y-4">
                {activePreviewTab === 'safe' ? (
                  <>
                    {/* User Prompt */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-[#F97316] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={14} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                          User Prompt
                        </span>
                        <div className="text-sm font-medium text-[var(--text-main)]">
                          &ldquo;Which switches in Dallas have warranties expiring in the next 60 days?&rdquo;
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold flex items-center gap-1">
                        <Check size={10} />
                        AST Verified in 1.4ms
                      </span>
                    </div>

                    {/* Compiled SQL */}
                    <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-3.5 relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          <Terminal size={11} className="text-[#F97316]" />
                          <span>Compiled PostgreSQL (Single Statement &bull; LIMIT 100 Enforced)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => copySql(safeSql)}
                          className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1"
                        >
                          <Copy size={11} />
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="font-mono text-xs text-[var(--text-main)] overflow-x-auto leading-relaxed">
                        {safeSql}
                      </pre>
                    </div>

                    {/* Results Table */}
                    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-mono uppercase text-[10px]">
                          <tr>
                            <th className="px-3.5 py-2">Device Name</th>
                            <th className="px-3.5 py-2">Model</th>
                            <th className="px-3.5 py-2">Site</th>
                            <th className="px-3.5 py-2">Warranty Expiry</th>
                            <th className="px-3.5 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                          <tr>
                            <td className="px-3.5 py-2 font-semibold">CAT9300-DAL-01</td>
                            <td className="px-3.5 py-2 text-[var(--text-muted)]">Cisco Catalyst 9300</td>
                            <td className="px-3.5 py-2 text-[var(--text-muted)]">Dallas Datacenter</td>
                            <td className="px-3.5 py-2 text-amber-500 font-semibold">2026-11-15 (29d)</td>
                            <td className="px-3.5 py-2 text-emerald-500">Active</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-semibold">CAT9300-DAL-04</td>
                            <td className="px-3.5 py-2 text-[var(--text-muted)]">Cisco Catalyst 9300</td>
                            <td className="px-3.5 py-2 text-[var(--text-muted)]">Dallas Datacenter</td>
                            <td className="px-3.5 py-2 text-amber-500 font-semibold">2026-11-28 (42d)</td>
                            <td className="px-3.5 py-2 text-emerald-500">Active</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-semibold">ARISTA-7050-02</td>
                            <td className="px-3.5 py-2 text-[var(--text-muted)]">Arista 7050SX-64</td>
                            <td className="px-3.5 py-2 text-[var(--text-muted)]">Dallas Datacenter</td>
                            <td className="px-3.5 py-2 text-amber-500 font-semibold">2026-12-05 (49d)</td>
                            <td className="px-3.5 py-2 text-emerald-500">Active</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Blocked Injection Vector */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ShieldAlert size={14} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                          Simulated Malicious Payload
                        </span>
                        <div className="text-sm font-medium text-rose-600 dark:text-rose-400 font-mono">
                          {blockedSql}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-mono text-[11px] font-semibold flex items-center gap-1">
                        <XCircle size={10} />
                        Blocked by Gate #1
                      </span>
                    </div>

                    {/* Shield Interception Card */}
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs font-mono">
                        <ShieldAlert size={14} />
                        <span>SQLGlot AST Gate #1 Violation: Mutation/DDL Statement Forbidden</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        The AST root expression was parsed as <code className="text-rose-500">exp.Drop</code>.
                        QueryTrust strictly enforces that the compiled statement must evaluate to a single read-only{' '}
                        <code className="text-emerald-500">exp.Select</code>. Execution was aborted at the compiler layer in 1.1ms
                        before reaching PostgreSQL.
                      </p>
                      <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                        <span>Database writes attempted: 0</span>
                        <span className="text-emerald-500 font-semibold">Database Integrity: 100% Intact</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION C: The 3-Pillar 21st.dev Bento Grid ─── */}
      <section id="pillars" className="py-24 sm:py-32 max-w-6xl mx-auto px-6 border-t border-[var(--border-subtle)]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F97316] block mb-2">
            The Three Invariants
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-main)]">
            Architected for zero data corruption
          </h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Security guarantees enforced by mathematical compilers and database kernels—not fragile prompt templates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Compiler-Grade SQLGlot AST */}
          <SpotlightCard className="flex flex-col justify-between">
            <div>
              <div className="h-36 flex items-center justify-center bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] mb-5 overflow-hidden">
                <ASTAnimatedBeam />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-main)]">
                Mathematical Syntax Verification
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                We inspect the compiled SQLGlot syntax tree across 6 deterministic gates—never relying on fragile LLM instructions.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>SQLGlot 6-Gate AST</span>
              <span className="text-emerald-500 font-semibold">100% Coverage</span>
            </div>
          </SpotlightCard>

          {/* Card 2: Dual-Role PostgreSQL Kernel */}
          <SpotlightCard className="flex flex-col justify-between">
            <div>
              <div className="h-36 flex flex-col justify-center px-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] mb-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <span className="flex items-center gap-1.5 text-[var(--text-main)]">
                    <Database size={13} className="text-emerald-500" />
                    <span>SELECT on devices</span>
                  </span>
                  <span className="text-emerald-500 font-semibold text-[10px]">ALLOWED</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Lock size={13} className="text-rose-500" />
                    <span>DROP / INSERT / UPDATE</span>
                  </span>
                  <span className="text-rose-500 font-semibold text-[10px]">LOCKED</span>
                </div>
              </div>
              <h3 className="text-base font-semibold text-[var(--text-main)]">
                Zero Data Corruption by Design
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                The AI execution role has zero write permissions enforced directly at the PostgreSQL database kernel level.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>Role: qt_ai_readonly</span>
              <span className="text-emerald-500 font-semibold">0 Write Privileges</span>
            </div>
          </SpotlightCard>

          {/* Card 3: Measurable Enterprise Velocity */}
          <SpotlightCard className="flex flex-col justify-between">
            <div>
              <div className="h-36 flex flex-col items-center justify-center bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] mb-5">
                <div className="text-5xl font-mono font-semibold text-[#F97316] tracking-tight">
                  1.4s
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                  vs 4h average Jira lag
                </div>
              </div>
              <h3 className="text-base font-semibold text-[var(--text-main)]">
                From 4-Hour Jira Lag to 1.4 Seconds
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                Self-serve domain velocity backed by 151 automated tests and zero forbidden executions.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>151/151 Test Pass</span>
              <span className="text-emerald-500 font-semibold">65% Deflection</span>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ─── SECTION D: Minimalist Footer ─── */}
      <footer className="py-12 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <QueryTrustLogo size={20} />
            <span className="font-semibold text-[var(--text-main)]">QueryTrust AI</span>
            <span>&bull; Zero-Trust Database Analytics Workbench</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>All 6 AST Gates Operational &bull; PostgreSQL Read-Only Replica Connected</span>
          </div>

          <div>
            &copy; {new Date().getFullYear()} QueryTrust AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
