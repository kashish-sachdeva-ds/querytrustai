import React, { useState } from 'react'
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Terminal,
  Lock,
  Database,
  XCircle,
  Copy,
  Check,
  Zap,
  Cpu,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { QueryTrustLogo } from './QueryTrustLogo'
import { HeroSpotlightBackground } from './HeroSpotlightBackground'
import { SpotlightCard } from './SpotlightCard'
import { ASTAnimatedBeam } from './ASTAnimatedBeam'
import { BagUiNavbar } from './ui/BagUiNavbar'
import './LandingPage.css'

interface LandingPageProps {
  onGoToLogin: () => void
}

type PresetKey = 'warranty' | 'telemetry' | 'injection'

interface PresetConfig {
  id: PresetKey
  label: string
  icon: typeof Sparkles
  isAttack: boolean
  prompt: string
  badge: string
  badgeColor: 'emerald' | 'rose'
  sql: string
  rows?: Array<Record<string, string>>
  blockedReason?: string
}

const PRESETS: Record<PresetKey, PresetConfig> = {
  warranty: {
    id: 'warranty',
    label: 'Hardware Warranty Expiring',
    icon: Sparkles,
    isAttack: false,
    prompt: 'Which switches in Dallas have warranties expiring in the next 60 days?',
    badge: 'AST Verified in 1.42ms',
    badgeColor: 'emerald',
    sql: `SELECT device_name, model, site, warranty_expiry, status
FROM devices
WHERE device_type = 'Switch'
  AND site = 'Dallas Datacenter'
  AND warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY warranty_expiry ASC
LIMIT 100;`,
    rows: [
      { name: 'CAT9300-DAL-01', model: 'Cisco Catalyst 9300', site: 'Dallas Datacenter', expiry: '2026-11-15 (29d)', status: 'Active' },
      { name: 'CAT9300-DAL-04', model: 'Cisco Catalyst 9300', site: 'Dallas Datacenter', expiry: '2026-11-28 (42d)', status: 'Active' },
      { name: 'ARISTA-7050-02', model: 'Arista 7050SX-64', site: 'Dallas Datacenter', expiry: '2026-12-05 (49d)', status: 'Active' },
    ],
  },
  telemetry: {
    id: 'telemetry',
    label: 'High-Temp Sensor Anomaly',
    icon: Zap,
    isAttack: false,
    prompt: 'Show core routers with temperature > 65°C and packet loss > 0.05%',
    badge: 'Safe Multi-Table Join Verified in 1.84ms',
    badgeColor: 'emerald',
    sql: `SELECT d.device_name, d.model, t.temperature_c, t.packet_loss_pct, t.recorded_at
FROM devices d
INNER JOIN telemetry_readings t ON d.id = t.device_id
WHERE d.device_type = 'Router'
  AND t.temperature_c > 65.0
  AND t.packet_loss_pct > 0.05
ORDER BY t.temperature_c DESC
LIMIT 50;`,
    rows: [
      { name: 'RTR-CORE-MIA-01', model: 'Cisco ASR 9000', site: 'Miami Datacenter 2', expiry: 'Temp: 88.92°C', status: 'Loss: 34.5%' },
      { name: 'RTR-CORE-BOS-03', model: 'Juniper MX480', site: 'Boston Datacenter 1', expiry: 'Temp: 78.40°C', status: 'Loss: 12.1%' },
      { name: 'RTR-EDGE-DEN-02', model: 'Cisco Catalyst 8500', site: 'Denver Datacenter 3', expiry: 'Temp: 69.15°C', status: 'Loss: 5.4%' },
    ],
  },
  injection: {
    id: 'injection',
    label: 'Malicious DROP TABLE Injection',
    icon: ShieldAlert,
    isAttack: true,
    prompt: 'Show devices; DROP TABLE devices CASCADE; --',
    badge: 'Blocked by Gate #1 (AST-01)',
    badgeColor: 'rose',
    sql: `DROP TABLE devices CASCADE; -- Attempted destruction`,
    blockedReason: 'AST expression parsed as exp.Drop. QueryTrust strictly requires single read-only exp.Select. Intercepted in 0.18ms before reaching database kernel.',
  },
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const { enterDemoMode } = useAuth()
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('warranty')
  const [copied, setCopied] = useState(false)

  const activePreset = PRESETS[selectedPreset]

  const copySql = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="landing-page-root min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] selection:bg-orange-500/20 selection:text-orange-500 transition-colors duration-200 relative overflow-x-hidden">
      {/* ─── SECTION A: Bag\Ui Floating Mega-Menu Navbar ─── */}
      <header className="sticky top-0 z-50 w-full">
        <BagUiNavbar
          onSignIn={onGoToLogin}
          onRequestDemo={() => enterDemoMode('admin')}
          onLaunchApp={() => enterDemoMode('analyst')}
        />
      </header>

      {/* ─── SECTION B: Keyvo-Grade Atmospheric Hero ─── */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 text-center px-6">
        <HeroSpotlightBackground />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-muted)] mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">Zero-Trust SQL Compiler &bull; PostgreSQL Read-Only</span>
          </div>

          {/* Bold 2-Line Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[66px] font-semibold tracking-[-0.035em] leading-[1.06] text-[var(--text-main)]">
            Ask your database anything.{' '}
            <span className="block bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              Mathematically zero risk.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            QueryTrust AI inspects natural language through a 6-layer SQLGlot AST compiler, validating safe SELECT semantics in sub-milliseconds before touching a read-only database kernel.
          </p>

          {/* Action Row */}
          <div className="mt-8 flex items-center justify-center gap-3.5 flex-wrap">
            <button
              type="button"
              onClick={onGoToLogin}
              className="h-11 px-6 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer group"
            >
              <span>Enter Governed Studio</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              type="button"
              onClick={() => enterDemoMode('admin')}
              className="h-11 px-5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-main)] font-medium text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Cpu size={14} className="text-[#F97316]" />
              <span>Evaluate Admin Mode (1-Click)</span>
            </button>
          </div>

          {/* ─── SECTION B.2: Keyvo-Style Interactive Showcase Preview Window ─── */}
          <div id="interactive-preview" className="mt-14 sm:mt-18 text-left max-w-4xl mx-auto">
            {/* Preset Selector Pill Bar */}
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              <span className="text-[11px] font-mono text-[var(--text-subtle)] mr-1 hidden sm:inline">Try Scenario:</span>
              {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
                const p = PRESETS[key]
                const isSelected = selectedPreset === key
                const IconComponent = p.icon
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPreset(key)}
                    className={`h-8 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? p.isAttack
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30 font-semibold shadow-xs'
                          : 'bg-orange-500/10 text-[#F97316] border border-orange-500/30 font-semibold shadow-xs'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    <IconComponent size={13} className={isSelected ? (p.isAttack ? 'text-rose-500' : 'text-[#F97316]') : 'text-[var(--text-subtle)]'} />
                    <span>{p.label}</span>
                  </button>
                )
              })}
            </div>

            {/* macOS Window Frame */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl overflow-hidden transition-all duration-200">
              {/* Window Header */}
              <div className="h-11 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between bg-[var(--bg-subtle)]">
                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/40 border border-rose-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40 border border-amber-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/60" />
                </div>

                <div className="text-[10.5px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
                  <Terminal size={11} className="text-[#F97316]" />
                  <span>SQLGlot AST Compiler &bull; PostgreSQL Dialect</span>
                </div>

                <div className="text-[10px] font-mono text-[var(--text-subtle)] hidden sm:flex items-center gap-1">
                  <Lock size={10} className="text-emerald-500" />
                  <span>Role: qt_ai_readonly</span>
                </div>
              </div>

              {/* Window Body */}
              <div className="p-5 space-y-4">
                {/* Prompt Row */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      activePreset.isAttack ? 'bg-rose-500/10 text-rose-500' : 'bg-orange-500/10 text-[#F97316]'
                    }`}
                  >
                    <activePreset.icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-[var(--text-subtle)] uppercase tracking-wider block mb-0.5">
                      Natural Language Input
                    </span>
                    <div className="text-sm font-medium text-[var(--text-main)] tracking-tight">
                      &ldquo;{activePreset.prompt}&rdquo;
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-semibold flex items-center gap-1 border flex-shrink-0 ${
                      activePreset.badgeColor === 'emerald'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {activePreset.badgeColor === 'emerald' ? <Check size={10} /> : <XCircle size={10} />}
                    {activePreset.badge}
                  </span>
                </div>

                {/* Compiled SQL / Blocked Interception Card */}
                {!activePreset.isAttack ? (
                  <>
                    <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-3 relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          <Terminal size={11} className="text-[#F97316]" />
                          <span>Verified PostgreSQL (SELECT-Only &bull; Clamped Limit)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => copySql(activePreset.sql)}
                          className="text-[10.5px] font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={10} />
                          <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                        </button>
                      </div>
                      <pre className="font-mono text-xs text-[var(--text-main)] overflow-x-auto leading-relaxed">
                        {activePreset.sql}
                      </pre>
                    </div>

                    {/* Virtualized Table Preview */}
                    {activePreset.rows && (
                      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-mono uppercase text-[9.5px]">
                            <tr>
                              <th className="px-3 py-1.5">Device Asset</th>
                              <th className="px-3 py-1.5">Model Specification</th>
                              <th className="px-3 py-1.5">Operating Site</th>
                              <th className="px-3 py-1.5">Observation / Metric</th>
                              <th className="px-3 py-1.5">Telemetry Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                            {activePreset.rows.map((r, idx) => (
                              <tr key={idx} className="hover:bg-[var(--bg-subtle)] transition-colors">
                                <td className="px-3 py-1.5 font-semibold text-[var(--text-main)]">{r.name}</td>
                                <td className="px-3 py-1.5 text-[var(--text-muted)]">{r.model}</td>
                                <td className="px-3 py-1.5 text-[var(--text-muted)]">{r.site}</td>
                                <td className="px-3 py-1.5 text-amber-500 font-semibold">{r.expiry}</td>
                                <td className="px-3 py-1.5 text-emerald-500">{r.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs font-mono">
                      <ShieldAlert size={14} />
                      <span>SQLGlot AST Gate #1 Violation: Mutation/DDL Statement Forbidden</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {activePreset.blockedReason}
                    </p>
                    <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-[10.5px] font-mono text-[var(--text-muted)]">
                      <span>Database writes attempted: <strong className="text-rose-500">0</strong></span>
                      <span className="text-emerald-500 font-semibold">Database Integrity: 100% Intact</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION B.3: Keyvo-Grade 4-Metric Trust Strip ─── */}
      <section id="metrics" className="border-y border-[var(--border-subtle)] bg-[var(--bg-card)] py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-mono font-bold text-[var(--text-main)] tracking-tight">1.42ms</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">P95 AST Compiler Latency</div>
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-emerald-500 tracking-tight">151 / 151</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Automated Security Tests Pass</div>
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-[#F97316] tracking-tight">0 Writes</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Physical Kernel Guarantee</div>
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-[var(--text-main)] tracking-tight">30,000</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Synthetically Governed Rows</div>
          </div>
        </div>
      </section>

      {/* ─── SECTION C: The 3-Pillar Bento Grid ─── */}
      <section id="pillars" className="py-20 sm:py-28 max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F97316] block mb-2">
            The Three Invariants
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-main)]">
            Architected for zero data corruption
          </h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Security guarantees enforced by mathematical compilers and database kernels—not fragile LLM prompts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <SpotlightCard className="flex flex-col justify-between">
            <div>
              <div className="h-36 flex items-center justify-center bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] mb-5 overflow-hidden">
                <ASTAnimatedBeam />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-main)]">
                Mathematical Syntax Verification
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                Every query is parsed into a PostgreSQL syntax tree through 6 deterministic gates—rejecting mutations, cartesian explosions, and system catalog exfiltration.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>SQLGlot 6-Gate AST</span>
              <span className="text-emerald-500 font-semibold">100% Coverage</span>
            </div>
          </SpotlightCard>

          {/* Card 2 */}
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
                The natural-language execution role (<code className="text-emerald-500">qt_ai_readonly</code>) possesses zero write permissions directly at the database process level.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>Role: qt_ai_readonly</span>
              <span className="text-emerald-500 font-semibold">0 Write Privileges</span>
            </div>
          </SpotlightCard>

          {/* Card 3 */}
          <SpotlightCard className="flex flex-col justify-between">
            <div>
              <div className="h-36 flex flex-col items-center justify-center bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] mb-5">
                <div className="text-5xl font-mono font-semibold text-[#F97316] tracking-tight">
                  1.42s
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                  vs 4h average Jira turnaround
                </div>
              </div>
              <h3 className="text-base font-semibold text-[var(--text-main)]">
                From 4-Hour Jira Lag to 1.4 Seconds
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                Empower technical analysts and domain stakeholders with self-serve analytics velocity without opening SQL execution loopholes.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>151/151 Test Pass</span>
              <span className="text-emerald-500 font-semibold">65% Deflection</span>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ─── SECTION D: Bottom Keyvo-Style Conversion CTA ─── */}
      <section className="py-20 max-w-4xl mx-auto px-6 text-center">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-radial-[circle_at_50%_0%] from-orange-500/10 via-transparent to-transparent pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            Ready to experience compiler-grade database governance?
          </h2>
          <p className="mt-3 text-sm text-[var(--text-muted)] max-w-xl mx-auto">
            Evaluate QueryTrust AI instantly in offline sandbox mode—no setup, credit cards, or live database connection required.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onGoToLogin}
              className="h-10 px-5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Launch Live Workspace</span>
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => enterDemoMode('analyst')}
              className="h-10 px-4 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-medium transition-all cursor-pointer"
            >
              Explore Analyst Demo
            </button>
          </div>
        </div>
      </section>

      {/* ─── SECTION E: Minimalist Single-Row Footer ─── */}
      <footer className="py-10 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <QueryTrustLogo size={20} />
            <span className="font-semibold text-[var(--text-main)]">QueryTrust AI</span>
            <span>&bull; Zero-Trust Database Analytics Workbench</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10.5px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>All 6 AST Gates Operational &bull; PostgreSQL Read-Only Kernel</span>
          </div>

          <div>
            &copy; {new Date().getFullYear()} QueryTrust AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
