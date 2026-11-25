import React, { useState } from 'react'
import {
  Terminal,
  Activity,
  Database,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

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
    prompt: 'Find core routers above 65°C with packet drop rate over 0.05%',
    sql: `SELECT d.asset_tag, d.model, s.city, t.temperature_c
FROM devices d
JOIN sites s ON d.site_id = s.id
JOIN telemetry_readings t ON d.id = t.device_id
WHERE d.device_type = 'Router' AND t.temperature_c > 65.0
ORDER BY t.temperature_c DESC
LIMIT 100;`,
    note: 'Preview validated · LIMIT 100',
    rows: [
      { tag: 'RTR-CORE-001', model: 'SkyBridge-9000', dc: 'Dallas DC 1', metric: '88.9°C (Alert)', status: 'error' },
      { tag: 'RTR-CORE-042', model: 'SkyBridge-9000', dc: 'Frankfurt DC 2', metric: '74.2°C (Elevated)', status: 'warning' },
      { tag: 'RTR-EDGE-019', model: 'NetMatrix 480', dc: 'Tokyo DC 1', metric: '58.4°C (Nominal)', status: 'success' },
    ],
  },
  {
    id: 'crc',
    label: 'CRC error spikes',
    prompt: 'List devices with anomalous CRC error counts over 1,000 in 24h',
    sql: `SELECT d.asset_tag, d.model, s.city, t.crc_errors
FROM devices d
JOIN sites s ON d.site_id = s.id
JOIN telemetry_readings t ON d.id = t.device_id
WHERE t.crc_errors > 1000
ORDER BY t.crc_errors DESC
LIMIT 50;`,
    note: 'Preview validated · LIMIT 50',
    rows: [
      { tag: 'RTR-PE-LON-08', model: 'NetMatrix 480', dc: 'London DC 1', metric: '12,450 errors', status: 'error' },
      { tag: 'SW-DIST-SIN-03', model: 'OmniSwitch 9300', dc: 'Singapore DC 1', metric: '3,210 errors', status: 'warning' },
      { tag: 'RTR-EDGE-SFO-11', model: 'ApexEdge 7050', dc: 'San Francisco DC 3', metric: '1,890 errors', status: 'warning' },
    ],
  },
  {
    id: 'warranty',
    label: 'Warranties < 60 days',
    prompt: 'Show Dallas switches with warranty expiring within 60 days',
    sql: `SELECT d.asset_tag, d.model, s.city, d.warranty_expiry
FROM devices d
JOIN sites s ON d.site_id = s.id
WHERE d.device_type = 'Switch' AND s.city = 'Dallas'
ORDER BY d.warranty_expiry ASC
LIMIT 100;`,
    note: 'Preview validated · LIMIT 100',
    rows: [
      { tag: 'SW-CORE-DAL-01', model: 'OmniSwitch 9300', dc: 'Dallas DC 1', metric: '2026-11-15 (29d)', status: 'accent' },
      { tag: 'SW-DIST-DAL-04', model: 'OmniSwitch 9300', dc: 'Dallas DC 1', metric: '2026-11-28 (42d)', status: 'accent' },
      { tag: 'SW-EDGE-DAL-02', model: 'ApexEdge 7050', dc: 'Dallas DC 2', metric: '2026-12-05 (49d)', status: 'accent' },
    ],
  },
]

const REGION_SITES = [
  { region: 'AMER', hub: 'Dallas DC 1', devices: '2,150', sites: '22 Sites' },
  { region: 'EMEA', hub: 'Frankfurt DC 2', devices: '1,650', sites: '18 Sites' },
  { region: 'APAC', hub: 'Tokyo DC 1', devices: '1,200', sites: '10 Sites' },
] as const

const HARDWARE_MODELS = [
  { name: 'OmniSwitch 9300', units: '1,820 units', role: 'Core Aggregation', health: '99.4%', healthNum: 0.994, tone: 'success' as const },
  { name: 'ApexEdge 7050', units: '1,450 units', role: 'Edge Gateway', health: '98.8%', healthNum: 0.988, tone: 'success' as const },
  { name: 'SkyBridge 9000', units: '980 units', role: 'Core Backbone', health: '96.2%', healthNum: 0.962, tone: 'warning' as const },
  { name: 'NetMatrix 480', units: '750 units', role: 'Sensor Hub', health: '99.1%', healthNum: 0.991, tone: 'success' as const },
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
      className="py-16 sm:py-22 text-left transition-colors"
      style={{
        backgroundColor: 'var(--color-page-bg)',
        borderTop: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE_EXPO }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
        >
          <div className="max-w-xl">
            <div
              className="text-xs font-medium uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}
            >
              Workbench
            </div>
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.15]"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
            >
              Built for accountable fleet analytics
            </h2>
          </div>

          {/* Segmented Control with Spring Pill */}
          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-[10px] w-fit"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            {[
              { id: 'studio' as const, label: 'Query Studio', icon: Terminal },
              { id: 'topology' as const, label: 'Fleet Topology', icon: Activity },
              { id: 'kernel' as const, label: 'Database Isolation', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="relative px-3.5 py-2 rounded-[8px] text-xs font-medium cursor-pointer flex items-center gap-2"
                  style={{
                    color: active ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="showcase-tab-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 35 }}
                      className="absolute inset-0 rounded-[8px]"
                      style={{ backgroundColor: 'var(--color-accent)', zIndex: 0 }}
                    />
                  )}
                  <Icon size={13} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Showcase Panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE_EXPO }}
          className="landing-card p-5 sm:p-7 overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'studio' && (
              <motion.div
                key="studio"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: EASE_EXPO }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                <div className="lg:col-span-5 space-y-4">
                  <h3
                    className="text-xl font-semibold tracking-tight"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Plain-English query studio
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    Ask operational questions and inspect generated SQL alongside bounded tabular results.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {DEMO_QUERIES.map((q) => {
                      const selected = selectedDemoId === q.id
                      return (
                        <motion.button
                          key={q.id}
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setSelectedDemoId(q.id)}
                          className="relative px-3 py-1.5 rounded-[8px] text-xs font-medium cursor-pointer"
                          style={{
                            color: selected ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                            border: `1px solid ${selected ? 'transparent' : 'var(--color-border-subtle)'}`,
                            backgroundColor: selected ? 'transparent' : 'var(--color-raised)',
                          }}
                        >
                          {selected && (
                            <motion.span
                              layoutId="studio-preset-pill"
                              transition={{ type: 'spring', stiffness: 460, damping: 35 }}
                              className="absolute inset-0 rounded-[8px]"
                              style={{ backgroundColor: 'var(--color-accent)', zIndex: 0 }}
                            />
                          )}
                          <span className="relative z-10">{q.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-3 min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeDemo.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: EASE_EXPO }}
                      className="space-y-3"
                    >
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
                          className="font-medium flex items-center gap-2"
                          style={{ color: 'var(--color-status-success-text)', fontFamily: 'var(--font-mono)' }}
                        >
                          <span className="landing-live-dot" aria-hidden="true" />
                          <span>{activeDemo.note}</span>
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

                      <AnimatePresence initial={false}>
                        {showSql && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: EASE_EXPO }}
                            className="overflow-hidden"
                          >
                            <pre className="landing-mono-block p-3.5 text-[11.5px] leading-relaxed overflow-x-auto m-0">
                              {activeDemo.sql}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>

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
                            {activeDemo.rows.map((row, idx) => (
                              <motion.tr
                                key={row.tag}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25, delay: idx * 0.05, ease: EASE_EXPO }}
                                style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                                className="last:border-b-0 transition-colors hover:bg-[var(--color-raised)]"
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
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeTab === 'topology' && (
              <motion.div
                key="topology"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: EASE_EXPO }}
                className="space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                    5,000 synthetic devices across 50 sites
                  </h3>

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
                          className="relative px-3 py-1 rounded-[6px] text-xs font-medium cursor-pointer"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: selected ? 'var(--color-accent-contrast)' : 'var(--color-text-secondary)',
                          }}
                        >
                          {selected && (
                            <motion.span
                              layoutId="topology-region-pill"
                              transition={{ type: 'spring', stiffness: 460, damping: 35 }}
                              className="absolute inset-0 rounded-[6px]"
                              style={{ backgroundColor: 'var(--color-accent)', zIndex: 0 }}
                            />
                          )}
                          <span className="relative z-10">{r}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {visibleRegions.map((hub) => (
                      <motion.div
                        layout
                        key={hub.region}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.25, ease: EASE_EXPO }}
                        whileHover={{ y: -2 }}
                        className="p-4 rounded-[10px] space-y-1.5"
                        style={{
                          backgroundColor: 'var(--color-raised)',
                          border: '1px solid var(--color-border-subtle)',
                        }}
                      >
                        <div className="text-xs font-semibold" style={{ color: 'var(--color-accent-link)', fontFamily: 'var(--font-mono)' }}>
                          {hub.region}
                        </div>
                        <div className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {hub.hub}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {hub.devices} devices &middot; {hub.sites}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {HARDWARE_MODELS.map((m, idx) => (
                    <motion.div
                      key={m.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05, ease: EASE_EXPO }}
                      whileHover={{ y: -2 }}
                      className="p-3.5 rounded-[10px] space-y-2"
                      style={{
                        backgroundColor: 'var(--color-raised)',
                        border: '1px solid var(--color-border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>{m.name}</span>
                        <span style={{ color: toneColor(m.tone), fontWeight: 600 }}>{m.health}</span>
                      </div>
                      <div className="text-base font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.units}
                      </div>
                      <div
                        className="h-1 w-full rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--color-surface)' }}
                      >
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: m.healthNum }}
                          transition={{ duration: 0.65, delay: 0.1 + idx * 0.06, ease: EASE_EXPO }}
                          className="h-full origin-left rounded-full"
                          style={{ backgroundColor: toneColor(m.tone) }}
                        />
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {m.role}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'kernel' && (
              <motion.div
                key="kernel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: EASE_EXPO }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                    PostgreSQL permission boundary
                  </h3>
                  <p className="text-sm leading-relaxed mt-1 max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                    Analytics connections hold only <code style={{ fontFamily: 'var(--font-mono)' }}>SELECT</code> grants on allowlisted tables.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: EASE_EXPO }}
                    whileHover={{ y: -2 }}
                    className="p-4 rounded-[8px] space-y-1.5"
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
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.06, ease: EASE_EXPO }}
                    whileHover={{ y: -2 }}
                    className="p-4 rounded-[8px] space-y-1.5"
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
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
