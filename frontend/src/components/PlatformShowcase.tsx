import React, { useState } from 'react'
import {
  Terminal,
  Activity,
  Database,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Globe,
  Server,
} from 'lucide-react'

interface StudioDemoQuery {
  id: string
  label: string
  prompt: string
  sql: string
  latency: string
  rows: Array<{ tag: string; model: string; dc: string; metric: string; metricColor: string }>
}

const DEMO_QUERIES: StudioDemoQuery[] = [
  {
    id: 'temp',
    label: 'Thermal Spikes > 65°C',
    prompt: 'Find all core routers with temperature > 65°C and packet drop rate > 0.05%',
    sql: `SELECT d.asset_tag, d.model, s.city, t.temperature_c, t.packet_drop_rate
FROM devices d
JOIN sites s ON d.site_id = s.id
JOIN telemetry_readings t ON d.id = t.device_id
WHERE d.device_type = 'Router'
  AND t.temperature_c > 65.0
  AND t.packet_drop_rate > 0.0005
ORDER BY t.temperature_c DESC
LIMIT 100;`,
    latency: '0.18ms',
    rows: [
      { tag: 'RTR-CORE-001', model: 'SkyBridge-9000', dc: 'Dallas DC 1', metric: 'Temp: 88.9°C (Alert)', metricColor: 'text-rose-600 dark:text-rose-400' },
      { tag: 'RTR-CORE-042', model: 'SkyBridge-9000', dc: 'Frankfurt DC 2', metric: 'Temp: 74.2°C (Warn)', metricColor: 'text-amber-600 dark:text-amber-400' },
      { tag: 'RTR-EDGE-019', model: 'NetMatrix 480', dc: 'Tokyo DC 1', metric: 'Temp: 58.4°C (Nominal)', metricColor: 'text-emerald-600 dark:text-emerald-400' },
    ],
  },
  {
    id: 'warranty',
    label: 'Warranty Horizon < 60d',
    prompt: 'Show switches in Dallas with warranty expiring in next 60 days',
    sql: `SELECT d.asset_tag, d.model, s.city, d.warranty_expiry
FROM devices d
JOIN sites s ON d.site_id = s.id
WHERE d.device_type = 'Switch'
  AND s.city = 'Dallas'
  AND d.warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY d.warranty_expiry ASC
LIMIT 100;`,
    latency: '0.14ms',
    rows: [
      { tag: 'SW-CORE-DAL-01', model: 'OmniSwitch 9300', dc: 'Dallas DC 1', metric: 'Exp: 2026-11-15 (29d)', metricColor: 'text-sky-600 dark:text-sky-400' },
      { tag: 'SW-DIST-DAL-04', model: 'OmniSwitch 9300', dc: 'Dallas DC 1', metric: 'Exp: 2026-11-28 (42d)', metricColor: 'text-sky-600 dark:text-sky-400' },
      { tag: 'SW-EDGE-DAL-02', model: 'ApexEdge 7050', dc: 'Dallas DC 2', metric: 'Exp: 2026-12-05 (49d)', metricColor: 'text-sky-600 dark:text-sky-400' },
    ],
  },
  {
    id: 'crc',
    label: 'Anomalous CRC Spikes',
    prompt: 'List devices with anomalous CRC error counts exceeding 1,000 in past 24h',
    sql: `SELECT d.asset_tag, d.model, s.city, t.crc_errors
FROM devices d
JOIN sites s ON d.site_id = s.id
JOIN telemetry_readings t ON d.id = t.device_id
WHERE t.crc_errors > 1000
ORDER BY t.crc_errors DESC
LIMIT 50;`,
    latency: '0.22ms',
    rows: [
      { tag: 'RTR-PE-LON-08', model: 'NetMatrix 480', dc: 'London DC 1', metric: 'CRC: 12,450 errs', metricColor: 'text-rose-600 dark:text-rose-400' },
      { tag: 'SW-DIST-SIN-03', model: 'OmniSwitch 9300', dc: 'Singapore DC 1', metric: 'CRC: 3,210 errs', metricColor: 'text-amber-600 dark:text-amber-400' },
      { tag: 'RTR-EDGE-SFO-11', model: 'ApexEdge 7050', dc: 'San Francisco DC 3', metric: 'CRC: 1,890 errs', metricColor: 'text-amber-600 dark:text-amber-400' },
    ],
  },
]

export const PlatformShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'topology' | 'kernel'>('studio')
  const [selectedDemoId, setSelectedDemoId] = useState<string>('temp')
  const [showSql, setShowSql] = useState<boolean>(false)

  const activeDemo = DEMO_QUERIES.find((q) => q.id === selectedDemoId) || DEMO_QUERIES[0]

  return (
    <section id="platform-showcase" className="py-20 sm:py-28 relative text-left bg-zinc-50/70 dark:bg-[#090D15] border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-4 font-mono">
            <Sparkles size={12} />
            <span>02 // FULL-STACK WORKBENCH CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.05]">
            Engineered for high-stakes{' '}
            <span className="text-sky-500 dark:text-sky-400">enterprise telemetry.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            Explore how QueryTrust AI unites conversational natural language with compiler-grade AST mathematical verification, 5,000-device telemetry tracking, and physical read-only database isolation.
          </p>
        </div>

        {/* 3-Tab Segmented Control (Awwwards / MECHA Pill Style) */}
        <div className="flex items-center gap-2 p-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit mb-10 shadow-xs flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'studio'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Terminal size={13} className={activeTab === 'studio' ? 'text-sky-400 dark:text-sky-600' : 'text-zinc-400'} />
            <span>Conversational Query Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('topology')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'topology'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Activity size={13} className={activeTab === 'topology' ? 'text-sky-400 dark:text-sky-600' : 'text-zinc-400'} />
            <span>Fleet Overview &amp; Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kernel')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'kernel'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Database size={13} className={activeTab === 'kernel' ? 'text-sky-400 dark:text-sky-600' : 'text-zinc-400'} />
            <span>Dual-Role PostgreSQL Kernel</span>
          </button>
        </div>

        {/* Tab Content Display Area */}
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-10 shadow-sm transition-all">
          {activeTab === 'studio' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-bold uppercase">
                  1-Click Governed Analytics
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 dark:text-white tracking-tight">
                  Single-Canvas Conversational Studio
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                  Ask questions in plain English without technical SQL friction. Raw code editor and compiler rule internals are tucked into clean on-demand drawers, dedicating 100% of the canvas to answers and virtualized data grids.
                </p>
                
                {/* Clickable Preset Chips */}
                <div className="pt-2">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block mb-2">
                    Try Sample Fleet Queries:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {DEMO_QUERIES.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setSelectedDemoId(q.id)}
                        className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                          selectedDemoId === q.id
                            ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs'
                            : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>Instant automatic execution with &le; 100 row bounded clamps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>Expandable SQL syntax disclosure for engineering review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>Slide-over AST proof drawer verifying 6 deterministic compiler gates</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-3.5 shadow-2xs font-mono text-xs">
                {/* Simulated Studio Input */}
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                  <span className="text-zinc-900 dark:text-zinc-100 font-sans text-xs">
                    &ldquo;{activeDemo.prompt}&rdquo;
                  </span>
                  <span className="px-3 py-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10.5px] font-bold flex-shrink-0">
                    Ask Fleet AI &rarr;
                  </span>
                </div>

                {/* Verified Synthesis Strip with Interactive SQL Toggle */}
                <div className="flex items-center justify-between px-2 text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verified SELECT-Only &bull; {activeDemo.latency}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSql(!showSql)}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>&lt;/&gt; {showSql ? 'Hide SQL' : 'View SQL'}</span>
                    {showSql ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Expandable SQL Code Box */}
                {showSql && (
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sky-200 text-[11px] overflow-x-auto shadow-inner">
                    <pre className="selection:bg-sky-500/30 font-mono leading-relaxed">
                      {activeDemo.sql}
                    </pre>
                  </div>
                )}

                {/* Simulated Virtualized Grid */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                  <div className="grid grid-cols-4 bg-zinc-100 dark:bg-zinc-800/60 p-2.5 text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <span>Asset Tag</span>
                    <span>Device Model</span>
                    <span>Datacenter</span>
                    <span>Sensor Telemetry</span>
                  </div>
                  {activeDemo.rows.map((row, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-4 p-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-700 dark:text-zinc-300 ${
                        idx % 2 === 1 ? 'bg-zinc-50/50 dark:bg-zinc-800/30' : ''
                      }`}
                    >
                      <span className="font-bold text-zinc-950 dark:text-white">{row.tag}</span>
                      <span>{row.model}</span>
                      <span>{row.dc}</span>
                      <span className={`font-semibold ${row.metricColor}`}>{row.metric}</span>
                    </div>
                  ))}
                </div>

                {/* AST Proof Indicator Footer */}
                <div className="px-2 pt-1 flex items-center justify-between text-[10.5px] text-zinc-500 border-t border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={12} />
                    <span>AST Proof: 6/6 Compiler Gates Passed</span>
                  </span>
                  <span>Execution Bound: &le; 100 rows</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'topology' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold uppercase">
                  Executive Briefing &amp; Distribution
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 dark:text-white tracking-tight">
                  Fleet Topology Across 50 Global Sites
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                  Decluttered executive pulse metrics replace crowded data dumps. Instant visibility into 5,000 devices across Americas, EMEA, and APAC with 6 deterministic integrity scanners flagging serial glitches and unapproved statuses.
                </p>

                {/* Regional Breakdown Card */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-xs font-mono">
                  <div className="text-[10.5px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={12} className="text-sky-500" />
                    <span>Regional Device Distribution</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                    <span>Americas (AMER)</span>
                    <strong className="text-zinc-950 dark:text-white">2,150 devices &bull; 22 sites</strong>
                  </div>
                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                    <span>Europe &amp; Middle East (EMEA)</span>
                    <strong className="text-zinc-950 dark:text-white">1,650 devices &bull; 18 sites</strong>
                  </div>
                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                    <span>Asia Pacific (APAC)</span>
                    <strong className="text-zinc-950 dark:text-white">1,200 devices &bull; 10 sites</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>4 Executive Pulse Cards: Managed, Active, Attention, Open Repairs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>Synthetic Hardware Breakdown: OmniSwitch, SkyBridge, NetMatrix, ApexEdge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>Continuous data hygiene profiling across 30,000 relational records</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-2 gap-3.5 font-mono text-xs">
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-2 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Managed Fleet</span>
                  <div className="text-3xl sm:text-4xl font-display font-extrabold text-zinc-950 dark:text-white">5,000</div>
                  <div className="text-[11px] text-zinc-500">50 Datacenter Sites Across 3 Regions</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-2 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Active &amp; Operational</span>
                  <div className="text-3xl sm:text-4xl font-display font-extrabold text-emerald-600 dark:text-emerald-400">3,019</div>
                  <div className="text-[11px] text-zinc-500">60.4% Operational &bull; +124 30d</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-2 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Attention Required</span>
                  <div className="text-3xl sm:text-4xl font-display font-extrabold text-amber-600 dark:text-amber-400">258</div>
                  <div className="text-[11px] text-zinc-500">Warranties Expiring &lt; 30 Days</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-2 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">Open Repairs</span>
                  <div className="text-3xl sm:text-4xl font-display font-extrabold text-rose-600 dark:text-rose-400">1,500</div>
                  <div className="text-[11px] text-zinc-500">1,295 Unique Hardware Assets</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kernel' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-[11px] font-bold uppercase">
                  Physical OS / DB Boundary
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 dark:text-white tracking-tight">
                  Dual-Role PostgreSQL Kernel Isolation
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                  LLM prompt instructions are not a security perimeter. Even if an attacker were to bypass all compiler AST stages, the physical database connection pool enforces an immutable read-only role with zero write grants.
                </p>
                <div className="space-y-2 pt-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>Dedicated PostgreSQL role: qt_ai_readonly (SELECT only)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>Physical OS/DB command: SET default_transaction_read_only = ON</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>0 mutating statements permitted. 0 bytes altered guaranteed.</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl bg-zinc-950 p-6 font-mono text-xs text-zinc-300 space-y-3.5 shadow-md border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-800 pb-2.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Server size={13} className="text-sky-400" />
                    <span>// PostgreSQL 16 Kernel Isolation Invariant</span>
                  </div>
                  <span className="text-emerald-400 font-bold">ROLE_VERIFIED: PASS</span>
                </div>
                <div className="space-y-1.5 text-zinc-400">
                  <div className="text-zinc-500">-- 1. Grant strict SELECT on public schema</div>
                  <div>GRANT SELECT ON ALL TABLES IN SCHEMA public TO <span className="text-sky-400 font-semibold">qt_ai_readonly</span>;</div>
                  <div className="text-zinc-500 pt-1">-- 2. Revoke all DDL and DML write capabilities</div>
                  <div>REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES FROM <span className="text-sky-400 font-semibold">qt_ai_readonly</span>;</div>
                  <div>REVOKE CREATE, DROP, ALTER ON SCHEMA public FROM <span className="text-sky-400 font-semibold">qt_ai_readonly</span>;</div>
                  <div className="text-zinc-500 pt-1">-- 3. Hardware socket session enforcement</div>
                  <div className="text-emerald-400 font-semibold">SET default_transaction_read_only = ON;</div>
                  <div className="text-emerald-400 font-semibold">SET statement_timeout = '5000ms';</div>
                </div>
                <div className="pt-2 text-[11px] text-zinc-500 border-t border-zinc-800/80 flex items-center justify-between">
                  <span>Connection: Read-Only Socket Replica</span>
                  <span className="text-sky-400">Pool Latency: 1.42ms P95</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
