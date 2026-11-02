import React, { useState } from 'react'
import {
  Terminal,
  Activity,
  Database,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Lock,
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
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | 'AMER' | 'EMEA' | 'APAC'>('ALL')

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
            Explore how QueryTrust AI unites conversational natural language with compiler-grade AST mathematical verification, 5,000-device telemetry tracking across 50 global sites, and physical read-only database isolation.
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

        {/* ── Tab Content: 3D Perspective Bento Showcase ── */}
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-10 shadow-sm transition-all">
          
          {/* TAB 1: Conversational Studio */}
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
                    className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
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

          {/* TAB 2: Fleet Overview & Interactive Datacenter Topology Graph */}
          {activeTab === 'topology' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold uppercase">
                    Interactive Datacenter Topology Graph
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 dark:text-white tracking-tight mt-1">
                    5,000 Governed Devices Across 50 Global Sites
                  </h3>
                </div>

                {/* Region Filter Buttons */}
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-100 dark:bg-zinc-800 w-fit">
                  {(['ALL', 'AMER', 'EMEA', 'APAC'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRegion(r)}
                      className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer ${
                        selectedRegion === r
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Interactive SVG Datacenter World Topology Map ── */}
              <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-4 sm:p-6 pb-8 overflow-hidden">
                <div className="absolute top-3 left-4 text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Global Telemetry Ring &bull; Active Latency: 1.42ms</span>
                </div>

                <svg viewBox="0 0 900 360" className="w-full h-auto max-h-[360px] select-none">
                  <defs>
                    <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="amer-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="emea-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="apac-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* World Grid Lines */}
                  <g stroke="#ffffff08" strokeWidth="1">
                    <line x1="50" y1="90" x2="850" y2="90" strokeDasharray="4 4" />
                    <line x1="50" y1="180" x2="850" y2="180" strokeDasharray="4 4" />
                    <line x1="50" y1="270" x2="850" y2="270" strokeDasharray="4 4" />
                    <line x1="220" y1="30" x2="220" y2="330" strokeDasharray="4 4" />
                    <line x1="450" y1="30" x2="450" y2="330" strokeDasharray="4 4" />
                    <line x1="680" y1="30" x2="680" y2="330" strokeDasharray="4 4" />
                  </g>

                  {/* Intercontinental Topology Trunks */}
                  <path
                    d="M 220 160 Q 330 110 460 140 T 700 170"
                    fill="none"
                    stroke="#38bdf833"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <path
                    d="M 220 160 Q 300 240 460 210 T 700 170"
                    fill="none"
                    stroke="#10b98133"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />

                  {/* ── REGION 1: AMER (Americas) ── */}
                  <g opacity={selectedRegion === 'ALL' || selectedRegion === 'AMER' ? 1 : 0.25} className="transition-opacity">
                    <circle cx="220" cy="160" r="55" fill="url(#amer-glow)" />
                    <circle cx="220" cy="160" r="8" fill="#38BDF8" />
                    <circle cx="220" cy="160" r="16" fill="none" stroke="#38BDF8" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 2" />
                    
                    {/* AMER Satellite Nodes */}
                    <circle cx="180" cy="120" r="4" fill="#38BDF8" />
                    <line x1="220" y1="160" x2="180" y2="120" stroke="#38bdf844" strokeWidth="1" />
                    <circle cx="260" cy="210" r="4" fill="#38BDF8" />
                    <line x1="220" y1="160" x2="260" y2="210" stroke="#38bdf844" strokeWidth="1" />
                    <circle cx="160" cy="180" r="4" fill="#38BDF8" />
                    <line x1="220" y1="160" x2="160" y2="180" stroke="#38bdf844" strokeWidth="1" />

                    <text x="220" y="220" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                      AMER HUB (Dallas DC 1)
                    </text>
                    <text x="220" y="238" textAnchor="middle" fill="#38BDF8" fontSize="11" fontFamily="monospace">
                      2,150 Devices · 22 Sites
                    </text>
                  </g>

                  {/* ── REGION 2: EMEA (Europe & Middle East) ── */}
                  <g opacity={selectedRegion === 'ALL' || selectedRegion === 'EMEA' ? 1 : 0.25} className="transition-opacity">
                    <circle cx="470" cy="140" r="55" fill="url(#emea-glow)" />
                    <circle cx="470" cy="140" r="8" fill="#10B981" />
                    <circle cx="470" cy="140" r="16" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 2" />
                    
                    {/* EMEA Satellite Nodes */}
                    <circle cx="430" cy="110" r="4" fill="#10B981" />
                    <line x1="470" y1="140" x2="430" y2="110" stroke="#10b98144" strokeWidth="1" />
                    <circle cx="510" cy="170" r="4" fill="#10B981" />
                    <line x1="470" y1="140" x2="510" y2="170" stroke="#10b98144" strokeWidth="1" />

                    <text x="470" y="190" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                      EMEA HUB (Frankfurt DC 2)
                    </text>
                    <text x="470" y="208" textAnchor="middle" fill="#10B981" fontSize="11" fontFamily="monospace">
                      1,650 Devices · 18 Sites
                    </text>
                  </g>

                  {/* ── REGION 3: APAC (Asia Pacific) ── */}
                  <g opacity={selectedRegion === 'ALL' || selectedRegion === 'APAC' ? 1 : 0.25} className="transition-opacity">
                    <circle cx="710" cy="170" r="55" fill="url(#apac-glow)" />
                    <circle cx="710" cy="170" r="8" fill="#818CF8" />
                    <circle cx="710" cy="170" r="16" fill="none" stroke="#818CF8" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 2" />
                    
                    {/* APAC Satellite Nodes */}
                    <circle cx="670" cy="130" r="4" fill="#818CF8" />
                    <line x1="710" y1="170" x2="670" y2="130" stroke="#818cf844" strokeWidth="1" />
                    <circle cx="750" cy="220" r="4" fill="#818CF8" />
                    <line x1="710" y1="170" x2="750" y2="220" stroke="#818cf844" strokeWidth="1" />

                    <text x="710" y="225" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                      APAC HUB (Tokyo DC 1)
                    </text>
                    <text x="710" y="243" textAnchor="middle" fill="#818CF8" fontSize="11" fontFamily="monospace">
                      1,200 Devices · 10 Sites
                    </text>
                  </g>
                </svg>
              </div>

              {/* 4 Hardware Model Health Gauges */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase">
                    <span>OmniSwitch 9300</span>
                    <span className="text-emerald-500 font-bold">99.4% Nominal</span>
                  </div>
                  <div className="text-xl font-bold font-display text-zinc-950 dark:text-white">1,820 Units</div>
                  <div className="text-[10px] text-zinc-400">Core Aggregation · 29 Sites</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase">
                    <span>ApexEdge 7050</span>
                    <span className="text-emerald-500 font-bold">98.8% Nominal</span>
                  </div>
                  <div className="text-xl font-bold font-display text-zinc-950 dark:text-white">1,450 Units</div>
                  <div className="text-[10px] text-zinc-400">Edge Gateway · 18 Sites</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase">
                    <span>SkyBridge 9000</span>
                    <span className="text-amber-500 font-bold">96.2% High-Temp</span>
                  </div>
                  <div className="text-xl font-bold font-display text-zinc-950 dark:text-white">980 Units</div>
                  <div className="text-[10px] text-zinc-400">Core Backbone · 14 Sites</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase">
                    <span>NetMatrix 480</span>
                    <span className="text-emerald-500 font-bold">99.1% Nominal</span>
                  </div>
                  <div className="text-xl font-bold font-display text-zinc-950 dark:text-white">750 Units</div>
                  <div className="text-[10px] text-zinc-400">Telemetry Sensor Hub · 8 Sites</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Dual-Role Kernel Hardware Architecture */}
          {activeTab === 'kernel' && (
            <div className="space-y-6">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-[11px] font-bold uppercase">
                  Physical OS / DB Boundary
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 dark:text-white tracking-tight mt-1">
                  Dual-Role PostgreSQL Kernel Isolation
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans mt-2 max-w-3xl">
                  LLM prompt instructions are not a security perimeter. Even if an attacker were to bypass all compiler AST stages, the physical database connection pool enforces an immutable read-only role with zero write grants.
                </p>
              </div>

              {/* ── Visual OS / Hardware Architecture Diagram ── */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs space-y-6">
                
                {/* 3 Physical Isolation Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Block 1: Untrusted Client Browser */}
                  <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>ZONE 0: UNTRUSTED CLIENT</span>
                    </div>
                    <div className="text-sm font-bold text-white">Browser Environment</div>
                    <div className="text-[11px] text-zinc-400">
                      Cannot submit arbitrary SQL. Only executes verified server-stored query run IDs.
                    </div>
                  </div>

                  {/* Block 2: SQLGlot AST Compiler */}
                  <div className="p-4 rounded-xl bg-zinc-900/90 border border-sky-800/60 space-y-2">
                    <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu size={12} />
                      <span>ZONE 1: DETERMINISTIC AST</span>
                    </div>
                    <div className="text-sm font-bold text-white">SQLGlot 6-Gate Guard</div>
                    <div className="text-[11px] text-zinc-400">
                      Parses abstract syntax tree in 1.42ms P95. Rejects DDL/DML before DB socket pool.
                    </div>
                  </div>

                  {/* Block 3: Dedicated Read-Only Kernel */}
                  <div className="p-4 rounded-xl bg-zinc-900/90 border border-emerald-800/60 space-y-2">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Lock size={12} />
                      <span>ZONE 2: IMMUTABLE KERNEL</span>
                    </div>
                    <div className="text-sm font-bold text-white">qt_ai_readonly Pool</div>
                    <div className="text-[11px] text-zinc-400">
                      Hardware-level read-only socket. 0 mutated bytes. Statement timeout 5,000ms.
                    </div>
                  </div>

                </div>

                {/* SQL Permissions Switchboard */}
                <div className="p-4 rounded-xl bg-black/60 border border-zinc-800/80 space-y-2">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    // PostgreSQL 16 Kernel Role Switchboard Configuration
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-xs">
                        <CheckCircle2 size={13} />
                        <span>SELECT ON ALL TABLES: GRANTED</span>
                      </div>
                      <div className="text-[11px] text-emerald-300/80">
                        GRANT SELECT ON ALL TABLES IN SCHEMA public TO qt_ai_readonly;
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-400 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-xs">
                        <Lock size={13} />
                        <span>INSERT, UPDATE, DROP: PHYSICALLY REVOKED</span>
                      </div>
                      <div className="text-[11px] text-rose-300/80">
                        REVOKE INSERT, UPDATE, DELETE, TRUNCATE FROM qt_ai_readonly;
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800 pt-3">
                  <span>default_transaction_read_only = ON</span>
                  <span>Row Limit Clamping: LIMIT 100</span>
                  <span className="text-emerald-400 font-semibold">151/151 Security Tests Passing</span>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  )
}
