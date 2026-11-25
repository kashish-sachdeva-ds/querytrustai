import React, { useState } from 'react'
import {
  Terminal,
  Activity,
  Database,
  CheckCircle2,
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
  note: string
  rows: Array<{ tag: string; model: string; dc: string; metric: string; status: 'error' | 'warning' | 'success' | 'accent' }>
}

const DEMO_QUERIES: StudioDemoQuery[] = [
  {
    id: 'temp',
    label: 'Thermal spikes > 65°C',
    prompt: 'Find core routers with temperature above 65°C and packet drop rate above 0.05%',
    sql: `SELECT d.asset_tag, d.model, s.city, t.temperature_c, t.packet_drop_rate
FROM devices d
JOIN sites s ON d.site_id = s.id
JOIN telemetry_readings t ON d.id = t.device_id
WHERE d.device_type = 'Router'
  AND t.temperature_c > 65.0
  AND t.packet_drop_rate > 0.0005
ORDER BY t.temperature_c DESC
LIMIT 100;`,
    note: 'Preview validated · LIMIT 100 enforced',
    rows: [
      { tag: 'RTR-CORE-001', model: 'SkyBridge-9000', dc: 'Dallas DC 1', metric: '88.9°C (Alert)', status: 'error' },
      { tag: 'RTR-CORE-042', model: 'SkyBridge-9000', dc: 'Frankfurt DC 2', metric: '74.2°C (Elevated)', status: 'warning' },
      { tag: 'RTR-EDGE-019', model: 'NetMatrix 480', dc: 'Tokyo DC 1', metric: '58.4°C (Nominal)', status: 'success' },
    ],
  },
  {
    id: 'warranty',
    label: 'Warranties < 60 days',
    prompt: 'Show switches in Dallas with warranty expiring in the next 60 days',
    sql: `SELECT d.asset_tag, d.model, s.city, d.warranty_expiry
FROM devices d
JOIN sites s ON d.site_id = s.id
WHERE d.device_type = 'Switch'
  AND s.city = 'Dallas'
  AND d.warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY d.warranty_expiry ASC
LIMIT 100;`,
    note: 'Preview validated · LIMIT 100 enforced',
    rows: [
      { tag: 'SW-CORE-DAL-01', model: 'OmniSwitch 9300', dc: 'Dallas DC 1', metric: '2026-11-15 (29d)', status: 'accent' },
      { tag: 'SW-DIST-DAL-04', model: 'OmniSwitch 9300', dc: 'Dallas DC 1', metric: '2026-11-28 (42d)', status: 'accent' },
      { tag: 'SW-EDGE-DAL-02', model: 'ApexEdge 7050', dc: 'Dallas DC 2', metric: '2026-12-05 (49d)', status: 'accent' },
    ],
  },
  {
    id: 'crc',
    label: 'CRC error spikes',
    prompt: 'List devices with anomalous CRC error counts exceeding 1,000 in the past 24h',
    sql: `SELECT d.asset_tag, d.model, s.city, t.crc_errors
FROM devices d
JOIN sites s ON d.site_id = s.id
JOIN telemetry_readings t ON d.id = t.device_id
WHERE t.crc_errors > 1000
ORDER BY t.crc_errors DESC
LIMIT 50;`,
    note: 'Preview validated · LIMIT 50 enforced',
    rows: [
      { tag: 'RTR-PE-LON-08', model: 'NetMatrix 480', dc: 'London DC 1', metric: '12,450 errors', status: 'error' },
      { tag: 'SW-DIST-SIN-03', model: 'OmniSwitch 9300', dc: 'Singapore DC 1', metric: '3,210 errors', status: 'warning' },
      { tag: 'RTR-EDGE-SFO-11', model: 'ApexEdge 7050', dc: 'San Francisco DC 3', metric: '1,890 errors', status: 'warning' },
    ],
  },
]

const REGION_SITES = [
  { region: 'AMER', hub: 'Dallas DC 1', devices: '2,150', sites: '22 Sites', status: 'Operational' },
  { region: 'EMEA', hub: 'Frankfurt DC 2', devices: '1,650', sites: '18 Sites', status: 'Operational' },
  { region: 'APAC', hub: 'Tokyo DC 1', devices: '1,200', sites: '10 Sites', status: 'Operational' },
] as const

const HARDWARE_MODELS = [
  { name: 'OmniSwitch 9300', units: '1,820 units', role: 'Core Aggregation · 29 sites', health: '99.4% nominal', tone: 'success' as const },
  { name: 'ApexEdge 7050', units: '1,450 units', role: 'Edge Gateway · 18 sites', health: '98.8% nominal', tone: 'success' as const },
  { name: 'SkyBridge 9000', units: '980 units', role: 'Core Backbone · 14 sites', health: '96.2% high-temp', tone: 'warning' as const },
  { name: 'NetMatrix 480', units: '750 units', role: 'Sensor Hub · 8 sites', health: '99.1% nominal', tone: 'success' as const },
]

function toneColor(tone: 'error' | 'warning' | 'success' | 'accent') {
  if (tone === 'error') return 'var(--color-status-error-text)'
  if (tone === 'warning') return 'var(--color-status-warning-text)'
  if (tone === 'success') return 'var(--color-status-success-text)'
  return 'var(--color-accent-link)'
}

export const PlatformShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'topology' | 'kernel'>('studio')
  const [selectedDemoId, setSelectedDemoId] = useState<string>('temp')
  const [showSql, setShowSql] = useState<boolean>(false)
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | 'AMER' | 'EMEA' | 'APAC'>('ALL')

  const activeDemo = DEMO_QUERIES.find((q) => q.id === selectedDemoId) || DEMO_QUERIES[0]

  const visibleRegions =
    selectedRegion === 'ALL'
      ? REGION_SITES
      : REGION_SITES.filter((r) => r.region === selectedRegion)

  return (
    <section
      id="platform-showcase"
      className="py-16 sm:py-24 text-left transition-colors"
      style={{
        backgroundColor: 'var(--color-page-bg)',
        borderTop: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="max-w-2xl mb-8">
          <div
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
          >
            Workbench Overview
          </div>
          <h2
            className="text-2xl sm:text-4xl font-normal tracking-tight leading-[1.15]"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}
          >
            Built for accountable analytics across fleet data
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Inspect conversational SQL generation, synthetic fleet distribution across 50 sites, and PostgreSQL reader isolation inside one cohesive workspace.
          </p>
        </div>

        {/* Segmented Control */}
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-[10px] mb-8"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          {[
            { id: 'studio' as const, label: 'Query Studio', icon: Terminal },
            { id: 'topology' as const, label: 'Fleet Topology', icon: Activity },
            { id: 'kernel' as const, label: 'Kernel Isolation', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="px-3.5 py-2 rounded-[8px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-2"
                style={{
                  backgroundColor: active ? 'var(--color-accent)' : 'transparent',
                  color: active ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                }}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Showcase Panel */}
        <div className="landing-card p-5 sm:p-8">
          {activeTab === 'studio' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-4">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-medium"
                  style={{
                    backgroundColor: 'var(--color-accent-subtle)',
                    color: 'var(--color-accent-link)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Natural Language to SQL
                </span>
                <h3
                  className="text-xl sm:text-2xl font-semibold tracking-tight"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Single-canvas conversational studio
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  Ask operational questions in plain English. Generated SQL and AST check details remain neatly inspectable alongside virtualized tabular results.
                </p>

                <div className="pt-1">
                  <div
                    className="text-[11px] uppercase tracking-wider mb-2"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    Sample questions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_QUERIES.map((q) => {
                      const selected = selectedDemoId === q.id
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setSelectedDemoId(q.id)}
                          className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors cursor-pointer"
                          style={{
                            backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-raised)',
                            color: selected ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                            border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
                          }}
                        >
                          {q.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: 'var(--color-status-success-dot)' }} className="shrink-0" />
                    <span>Server-stored preview ID executed without arbitrary client SQL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: 'var(--color-status-success-dot)' }} className="shrink-0" />
                    <span>Collapsible SQL and 6-check AST trace drawer on every response</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3 min-w-0">
                <div
                  className="p-3.5 rounded-[8px] flex flex-wrap items-center justify-between gap-3"
                  style={{
                    backgroundColor: 'var(--color-raised)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
                    &ldquo;{activeDemo.prompt}&rdquo;
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium shrink-0"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: 'var(--color-accent-contrast)',
                    }}
                  >
                    Ask Fleet AI
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <span
                    className="font-medium flex items-center gap-1.5"
                    style={{ color: 'var(--color-status-success-text)', fontFamily: 'var(--font-mono)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--color-status-success-dot)' }}
                    />
                    {activeDemo.note}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSql(!showSql)}
                    className="flex items-center gap-1 cursor-pointer hover:underline"
                    style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
                  >
                    <span>{showSql ? 'Hide SQL' : 'Inspect SQL'}</span>
                    {showSql ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {showSql && (
                  <pre className="landing-mono-block p-3.5 text-[11.5px] leading-relaxed overflow-x-auto m-0">
                    {activeDemo.sql}
                  </pre>
                )}

                <div
                  className="rounded-[8px] overflow-x-auto"
                  style={{ border: '1px solid var(--color-border-subtle)' }}
                >
                  <table className="w-full min-w-[460px] text-left border-collapse text-xs">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--color-raised)',
                          borderBottom: '1px solid var(--color-border-subtle)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <th className="py-2.5 px-3 font-medium">Asset Tag</th>
                        <th className="py-2.5 px-3 font-medium">Device Model</th>
                        <th className="py-2.5 px-3 font-medium">Site</th>
                        <th className="py-2.5 px-3 font-medium">Telemetry</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontFamily: 'var(--font-mono)' }}>
                      {activeDemo.rows.map((row) => (
                        <tr
                          key={row.tag}
                          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                          className="last:border-b-0"
                        >
                          <td className="py-2.5 px-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {row.tag}
                          </td>
                          <td className="py-2.5 px-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {row.model}
                          </td>
                          <td className="py-2.5 px-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {row.dc}
                          </td>
                          <td className="py-2.5 px-3 font-medium" style={{ color: toneColor(row.status) }}>
                            {row.metric}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'topology' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-medium mb-1.5"
                    style={{
                      backgroundColor: 'var(--color-status-success-bg)',
                      color: 'var(--color-status-success-text)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Synthetic Infrastructure Dataset
                  </span>
                  <h3 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                    5,000 synthetic devices across 50 sites
                  </h3>
                </div>

                <div
                  className="inline-flex p-1 rounded-[8px] w-fit"
                  style={{
                    backgroundColor: 'var(--color-raised)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  {(['ALL', 'AMER', 'EMEA', 'APAC'] as const).map((r) => {
                    const selected = selectedRegion === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRegion(r)}
                        className="px-3 py-1 rounded-[6px] text-xs font-medium cursor-pointer transition-colors"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: selected ? 'var(--color-accent)' : 'transparent',
                          color: selected ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {visibleRegions.map((hub) => (
                  <div
                    key={hub.region}
                    className="p-4 rounded-[10px] space-y-2"
                    style={{
                      backgroundColor: 'var(--color-raised)',
                      border: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                      <span className="font-semibold" style={{ color: 'var(--color-accent-link)' }}>
                        {hub.region}
                      </span>
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--color-status-success-text)' }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--color-status-success-dot)' }}
                        />
                        {hub.status}
                      </span>
                    </div>
                    <div className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {hub.hub}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {hub.devices} devices &middot; {hub.sites}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {HARDWARE_MODELS.map((m) => (
                  <div
                    key={m.name}
                    className="p-4 rounded-[10px] space-y-1.5"
                    style={{
                      backgroundColor: 'var(--color-raised)',
                      border: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div
                      className="flex items-center justify-between text-[11px]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      <span style={{ color: 'var(--color-text-muted)' }}>{m.name}</span>
                      <span style={{ color: toneColor(m.tone), fontWeight: 600 }}>{m.health}</span>
                    </div>
                    <div
                      className="text-lg font-semibold tracking-tight"
                      style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {m.units}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {m.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'kernel' && (
            <div className="space-y-6">
              <div>
                <span
                  className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-medium mb-1.5"
                  style={{
                    backgroundColor: 'var(--color-accent-subtle)',
                    color: 'var(--color-accent-link)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Defense in Depth
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  Dual-layer AST validation and read-only execution
                </h3>
                <p className="text-sm leading-relaxed mt-1.5 max-w-3xl" style={{ color: 'var(--color-text-secondary)' }}>
                  LLM instructions are never a security boundary. Every query runs through deterministic PostgreSQL AST checks and connects through a read-only database role.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="p-4 rounded-[10px] space-y-2"
                  style={{
                    backgroundColor: 'var(--color-raised)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'var(--color-status-warning-text)', fontFamily: 'var(--font-mono)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--color-status-warning-dot)' }}
                    />
                    <span>Untrusted Client</span>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Preview ID Execution
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    The browser never sends raw SQL for execution; requests reference server-stored validated preview IDs.
                  </p>
                </div>

                <div
                  className="p-4 rounded-[10px] space-y-2"
                  style={{
                    backgroundColor: 'var(--color-raised)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
                  >
                    <Cpu size={12} />
                    <span>SQLGlot Parser</span>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    6-Gate AST Inspection
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    Enforces single SELECT roots, table and function allowlists, join bounds, and row clamping prior to DB calls.
                  </p>
                </div>

                <div
                  className="p-4 rounded-[10px] space-y-2"
                  style={{
                    backgroundColor: 'var(--color-raised)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'var(--color-status-success-text)', fontFamily: 'var(--font-mono)' }}
                  >
                    <Lock size={12} />
                    <span>Read-Only Role</span>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    qt_ai_readonly Pool
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    Dedicated PostgreSQL reader holds SELECT grants only with a 5,000 ms statement timeout.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                <div
                  className="p-3.5 rounded-[8px] space-y-1"
                  style={{
                    backgroundColor: 'var(--color-status-success-bg)',
                    border: '1px solid var(--color-status-success-dot)',
                    color: 'var(--color-status-success-text)',
                  }}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    <span>Granted</span>
                  </div>
                  <div>GRANT SELECT ON ALL TABLES IN SCHEMA public TO qt_ai_readonly;</div>
                </div>
                <div
                  className="p-3.5 rounded-[8px] space-y-1"
                  style={{
                    backgroundColor: 'var(--color-status-error-bg)',
                    border: '1px solid var(--color-status-error-dot)',
                    color: 'var(--color-status-error-text)',
                  }}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <Lock size={13} />
                    <span>Revoked</span>
                  </div>
                  <div>REVOKE INSERT, UPDATE, DELETE, TRUNCATE FROM qt_ai_readonly;</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
