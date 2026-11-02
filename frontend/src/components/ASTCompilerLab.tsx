import React, { useState } from 'react'
import {
  Sparkles,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Lock,
  Database,
  Cpu,
  Layers,
  Code2,
} from 'lucide-react'

export type LabPresetKey = 'warranty' | 'telemetry' | 'injection' | 'exfiltration'

interface LabPreset {
  id: LabPresetKey
  title: string
  category: 'READ_QUERY' | 'ATTACK_VECTOR'
  prompt: string
  latencyMs: string
  verdict: 'VERIFIED_SAFE' | 'BLOCKED_AT_GATE_1' | 'BLOCKED_AT_GATE_2'
  astTokens: Array<{ token: string; type: string; status: 'safe' | 'danger' | 'clamped' }>
  sql: string
  blockedReason?: string
  rows?: Array<Record<string, string>>
}

const PRESETS: Record<LabPresetKey, LabPreset> = {
  warranty: {
    id: 'warranty',
    title: 'Hardware Warranty Horizon',
    category: 'READ_QUERY',
    prompt: 'Which switches in Dallas have warranties expiring in the next 60 days?',
    latencyMs: '1.42ms',
    verdict: 'VERIFIED_SAFE',
    astTokens: [
      { token: 'SELECT', type: 'exp.Select', status: 'safe' },
      { token: 'device_name, model, site', type: 'exp.Column', status: 'safe' },
      { token: 'FROM devices', type: 'exp.Table', status: 'safe' },
      { token: 'WHERE site = "Dallas Datacenter"', type: 'exp.Where', status: 'safe' },
      { token: 'LIMIT 100', type: 'exp.Limit', status: 'clamped' },
    ],
    sql: `SELECT device_name, model, site, warranty_expiry, status
FROM devices
WHERE device_type = 'Switch'
  AND site = 'Dallas Datacenter'
  AND warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY warranty_expiry ASC
LIMIT 100;`,
    rows: [
      { name: 'SW-CORE-DAL-01', model: 'OmniSwitch 9300', site: 'Dallas Datacenter', metric: '2026-11-15 (29d)', status: 'Active' },
      { name: 'SW-DIST-DAL-04', model: 'OmniSwitch 9300', site: 'Dallas Datacenter', metric: '2026-11-28 (42d)', status: 'Active' },
      { name: 'SW-EDGE-DAL-02', model: 'ApexEdge 7050', site: 'Dallas Datacenter', metric: '2026-12-05 (49d)', status: 'Active' },
    ],
  },
  telemetry: {
    id: 'telemetry',
    title: 'Thermal Anomaly Join',
    category: 'READ_QUERY',
    prompt: 'Show core routers with temperature > 65°C and packet loss > 0.05%',
    latencyMs: '1.84ms',
    verdict: 'VERIFIED_SAFE',
    astTokens: [
      { token: 'SELECT', type: 'exp.Select', status: 'safe' },
      { token: 'devices.name, telemetry.*', type: 'exp.Column', status: 'safe' },
      { token: 'INNER JOIN telemetry_readings', type: 'exp.Join', status: 'safe' },
      { token: 'WHERE temperature > 65.0', type: 'exp.Where', status: 'safe' },
      { token: 'LIMIT 50', type: 'exp.Limit', status: 'clamped' },
    ],
    sql: `SELECT d.device_name, d.model, t.temperature_c, t.packet_loss_pct, t.recorded_at
FROM devices d
INNER JOIN telemetry_readings t ON d.id = t.device_id
WHERE d.device_type = 'Router'
  AND t.temperature_c > 65.0
  AND t.packet_loss_pct > 0.05
ORDER BY t.temperature_c DESC
LIMIT 50;`,
    rows: [
      { name: 'RTR-CORE-MIA-01', model: 'SkyBridge Core-9000', site: 'Miami DC 2', metric: 'Temp: 88.92°C', status: 'Loss: 34.5%' },
      { name: 'RTR-CORE-BOS-03', model: 'NetMatrix 480', site: 'Boston DC 1', metric: 'Temp: 78.40°C', status: 'Loss: 12.1%' },
      { name: 'RTR-EDGE-DEN-02', model: 'OmniRoute 8500', site: 'Denver DC 3', metric: 'Temp: 69.15°C', status: 'Loss: 5.4%' },
    ],
  },
  injection: {
    id: 'injection',
    title: 'Malicious DROP TABLE Injection',
    category: 'ATTACK_VECTOR',
    prompt: 'Show devices; DROP TABLE devices CASCADE; -- bypass security',
    latencyMs: '0.18ms',
    verdict: 'BLOCKED_AT_GATE_1',
    astTokens: [
      { token: 'exp.Select', type: 'Valid Query', status: 'safe' },
      { token: 'DROP TABLE', type: 'exp.Drop', status: 'danger' },
      { token: 'CASCADE', type: 'exp.Cascade', status: 'danger' },
    ],
    sql: `DROP TABLE devices CASCADE; -- Attempted destruction intercepted`,
    blockedReason: 'Statement parsed as AST type "exp.Drop". QueryTrust Rule: AST must contain strictly 1 top-level exp.Select statement. Physical execution halted in 0.18ms.',
  },
  exfiltration: {
    id: 'exfiltration',
    title: 'Catalog Harvester Attack',
    category: 'ATTACK_VECTOR',
    prompt: 'SELECT usename, passwd FROM pg_shadow UNION SELECT 1, 2;',
    latencyMs: '0.22ms',
    verdict: 'BLOCKED_AT_GATE_2',
    astTokens: [
      { token: 'SELECT', type: 'exp.Select', status: 'safe' },
      { token: 'pg_shadow', type: 'exp.Table (FORBIDDEN)', status: 'danger' },
      { token: 'UNION', type: 'exp.Union', status: 'danger' },
    ],
    sql: `SELECT usename, passwd FROM pg_shadow UNION SELECT 1, 2;`,
    blockedReason: 'Table "pg_shadow" is not on the whitelisted catalog allowed for natural-language queries. PostgreSQL system catalogs are physically isolated from qt_ai_readonly.',
  },
}

export const ASTCompilerLab: React.FC = () => {
  const [activePresetKey, setActivePresetKey] = useState<LabPresetKey>('warranty')
  const [copied, setCopied] = useState(false)
  const active = PRESETS[activePresetKey]

  const handleCopy = () => {
    navigator.clipboard.writeText(active.sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full rounded-3xl bg-white dark:bg-[#0E131F] border border-zinc-200 dark:border-zinc-800 shadow-[0_12px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden transition-all text-left">
      
      {/* ─── Top Controller Bar ─── */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
        
        {/* Preset Selector Chips (Pill Style) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mr-1 flex items-center gap-1.5">
            <Layers size={12} className="text-sky-500" />
            <span>SCENARIOS:</span>
          </span>
          {(Object.keys(PRESETS) as LabPresetKey[]).map((key) => {
            const preset = PRESETS[key]
            const isSelected = activePresetKey === key
            const isAttack = preset.category === 'ATTACK_VECTOR'

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActivePresetKey(key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? isAttack
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'bg-white dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-zinc-200/90 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {isAttack ? (
                  <ShieldAlert size={12} className={isSelected ? 'text-white' : 'text-rose-500'} />
                ) : (
                  <Sparkles size={12} className={isSelected ? 'text-sky-300 dark:text-sky-600' : 'text-zinc-400'} />
                )}
                <span>{preset.title}</span>
              </button>
            )
          })}
        </div>

        {/* Real-Time Compiler Bench Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-600 dark:text-zinc-300">
            <Cpu size={12} className="text-sky-500" />
            <span>AST Latency:</span>
            <strong className="text-zinc-950 dark:text-white font-semibold">{active.latencyMs}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>PostgreSQL 16</span>
          </div>
        </div>
      </div>

      {/* ─── Main Split-Pane Exhibit Body ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800">
        
        {/* Left Pane (5 cols): Input Prompt & AST Token Breakdown */}
        <div className="lg:col-span-5 p-6 space-y-5 bg-zinc-50/40 dark:bg-zinc-900/30">
          
          {/* Prompt Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Terminal size={12} className="text-sky-500" />
                <span>NATURAL LANGUAGE QUERY INTENT</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                CLIENT INPUT
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 font-sans leading-relaxed shadow-xs">
              &ldquo;{active.prompt}&rdquo;
            </div>
          </div>

          {/* AST Syntax Token Pipeline Visualization */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Code2 size={12} className="text-sky-500" />
                <span>6-GATE AST TOKEN INSPECTION</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Deterministic
              </span>
            </div>
            <div className="space-y-1.5">
              {active.astTokens.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-mono transition-all ${
                    item.status === 'danger'
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300'
                      : item.status === 'clamped'
                      ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-300'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-2xs'
                  }`}
                >
                  <span className="font-semibold">{item.token}</span>
                  <span className="text-[10.5px] opacity-75">{item.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              active.verdict === 'VERIFIED_SAFE'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
            }`}
          >
            {active.verdict === 'VERIFIED_SAFE' ? (
              <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle size={17} className="text-rose-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-semibold">
                {active.verdict === 'VERIFIED_SAFE' ? 'AST Verification Passed' : 'Interception Shield Triggered'}
              </div>
              <p className="mt-0.5 text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11.5px]">
                {active.verdict === 'VERIFIED_SAFE'
                  ? 'Query verified as single read-only SELECT statement with row limits clamped before execution.'
                  : active.blockedReason}
              </p>
            </div>
          </div>
        </div>

        {/* Right Pane (7 cols): Verified SQL Output & Governed Result Matrix */}
        <div className="lg:col-span-7 p-6 space-y-5 bg-white dark:bg-[#0E131F]">
          
          {/* Compiled SQL Viewport with Terminal Chrome */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Database size={12} className="text-sky-500" />
                <span>
                  {active.category === 'ATTACK_VECTOR'
                    ? 'REJECTED COMPILER STATE'
                    : 'COMPILED POSTGRESQL (READ-ONLY READY)'}
                </span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>

            <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 relative font-mono text-xs text-sky-100 overflow-x-auto shadow-inner">
              {/* Terminal Title Bar */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 mb-3 text-[10px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <span className="ml-2 font-mono text-zinc-400">pg_ast_compiler.sql</span>
                </div>
                <span className="text-emerald-400 font-mono">DIALECT: POSTGRESQL</span>
              </div>
              <pre className="leading-relaxed selection:bg-sky-500/30">
                {active.sql}
              </pre>
            </div>
          </div>

          {/* Results Preview */}
          {active.category === 'READ_QUERY' && active.rows && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  DATABASE ENGINE RESPONSE (&le; 100 ROWS)
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Role: qt_ai_readonly
                </span>
              </div>
              
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/60 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Asset ID</th>
                      <th className="px-3.5 py-2.5">Hardware Model</th>
                      <th className="px-3.5 py-2.5">Site Location</th>
                      <th className="px-3.5 py-2.5">Horizon / Metric</th>
                      <th className="px-3.5 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono text-[11px]">
                    {active.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="px-3.5 py-2.5 font-bold text-zinc-950 dark:text-white">{row.name}</td>
                        <td className="px-3.5 py-2.5 text-zinc-600 dark:text-zinc-400">{row.model}</td>
                        <td className="px-3.5 py-2.5 text-zinc-600 dark:text-zinc-400">{row.site}</td>
                        <td className="px-3.5 py-2.5 text-sky-600 dark:text-sky-400 font-semibold">{row.metric}</td>
                        <td className="px-3.5 py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active.category === 'ATTACK_VECTOR' && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-mono text-xs font-semibold">
                  <Lock size={14} />
                  <span>Physical Execution Boundary Enforced</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-mono text-[10.5px] font-bold">
                  0 BYTES MUTATED
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                The database kernel process received zero socket payloads. The AST compiler rejected the query in user space before connection pooling or table locks were initiated.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-rose-200 dark:border-rose-900/40 text-center font-mono">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-[10px] text-zinc-500">Latency</div>
                  <div className="text-xs font-bold text-zinc-950 dark:text-white mt-0.5">{active.latencyMs}</div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-[10px] text-zinc-500">Writes Attempted</div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">0 Writes</div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-[10px] text-zinc-500">Integrity</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">100% Intact</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── Bottom Status Ticker ─── */}
      <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>PostgreSQL Dedicated Reader: SELECT-Only Privileges Strictly Granted</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span>Row Clamp: Max 100</span>
          <span>&bull;</span>
          <span>Statement Timeout: 5,000ms</span>
          <span>&bull;</span>
          <span>Dialect: PostgreSQL</span>
        </div>
      </div>

    </div>
  )
}
