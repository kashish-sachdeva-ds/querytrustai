import React, { useState } from 'react'
import {
  ShieldAlert,
  Terminal,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Lock,
  Database,
  Layers,
  Code2,
} from 'lucide-react'

export type LabPresetKey = 'warranty' | 'telemetry' | 'injection' | 'exfiltration'

interface LabPreset {
  id: LabPresetKey
  title: string
  category: 'READ_QUERY' | 'ATTACK_VECTOR'
  prompt: string
  verdict: 'VERIFIED_SAFE' | 'BLOCKED_AT_GATE_1' | 'BLOCKED_AT_GATE_2'
  blockedAtGateIndex?: number
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
      { name: 'SW-CORE-DAL-01', model: 'OmniSwitch 9300', site: 'Dallas DC', metric: '2026-11-15 (29d)', status: 'Active' },
      { name: 'SW-DIST-DAL-04', model: 'OmniSwitch 9300', site: 'Dallas DC', metric: '2026-11-28 (42d)', status: 'Active' },
      { name: 'SW-EDGE-DAL-02', model: 'ApexEdge 7050', site: 'Dallas DC', metric: '2026-12-05 (49d)', status: 'Active' },
    ],
  },
  telemetry: {
    id: 'telemetry',
    title: 'Thermal Anomaly Join',
    category: 'READ_QUERY',
    prompt: 'Show core routers with temperature > 65°C and packet loss > 0.05%',
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
      { name: 'RTR-CORE-MIA-01', model: 'SkyBridge Core-9000', site: 'Miami DC 2', metric: '88.9°C', status: 'Loss: 34.5%' },
      { name: 'RTR-CORE-BOS-03', model: 'NetMatrix 480', site: 'Boston DC 1', metric: '78.4°C', status: 'Loss: 12.1%' },
      { name: 'RTR-EDGE-DEN-02', model: 'OmniRoute 8500', site: 'Denver DC 3', metric: '69.2°C', status: 'Loss: 5.4%' },
    ],
  },
  injection: {
    id: 'injection',
    title: 'DROP TABLE Injection',
    category: 'ATTACK_VECTOR',
    prompt: 'Show devices; DROP TABLE devices CASCADE; -- bypass security',
    verdict: 'BLOCKED_AT_GATE_1',
    blockedAtGateIndex: 0,
    astTokens: [
      { token: 'exp.Select', type: 'Query Statement', status: 'safe' },
      { token: 'DROP TABLE', type: 'exp.Drop (Forbidden)', status: 'danger' },
      { token: 'CASCADE', type: 'exp.Cascade (Forbidden)', status: 'danger' },
    ],
    sql: `DROP TABLE devices CASCADE; -- Blocked prior to execution`,
    blockedReason:
      'Statement parsed with multiple roots including "exp.Drop". SQLGlot policy permits only a single top-level exp.Select statement.',
  },
  exfiltration: {
    id: 'exfiltration',
    title: 'Catalog Reconnaissance',
    category: 'ATTACK_VECTOR',
    prompt: 'SELECT usename, passwd FROM pg_shadow UNION SELECT 1, 2;',
    verdict: 'BLOCKED_AT_GATE_2',
    blockedAtGateIndex: 1,
    astTokens: [
      { token: 'SELECT', type: 'exp.Select', status: 'safe' },
      { token: 'pg_shadow', type: 'exp.Table (Forbidden)', status: 'danger' },
      { token: 'UNION', type: 'exp.Union (Rejected)', status: 'danger' },
    ],
    sql: `SELECT usename, passwd FROM pg_shadow UNION SELECT 1, 2; -- Blocked prior to execution`,
    blockedReason:
      'Table "pg_shadow" is excluded from the synthetic catalog allowlist and unreachable by the qt_ai_readonly role.',
  },
}

const SIX_GATES = [
  { num: 1, name: 'Statement', token: 'exp.Select' },
  { num: 2, name: 'Allowlist', token: 'exp.Table' },
  { num: 3, name: 'Projections', token: 'exp.Column' },
  { num: 4, name: 'Predicates', token: 'exp.Where' },
  { num: 5, name: 'Joins', token: 'exp.Join' },
  { num: 6, name: 'Row Clamp', token: 'LIMIT 100' },
]

export const ASTCompilerLab: React.FC = () => {
  const [activePresetKey, setActivePresetKey] = useState<LabPresetKey>('warranty')
  const [copied, setCopied] = useState(false)

  const active = PRESETS[activePresetKey]
  const isAttack = active.category === 'ATTACK_VECTOR'
  const passedCount = isAttack ? (active.blockedAtGateIndex ?? 0) : SIX_GATES.length

  const handleCopy = () => {
    navigator.clipboard.writeText(active.sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="w-full overflow-hidden text-left"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-container)',
      }}
    >
      {/* Top Scenario Selector Bar */}
      <div
        className="px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--color-raised)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[11px] font-medium uppercase tracking-wider mr-1 flex items-center gap-1.5"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            <Layers size={12} style={{ color: 'var(--color-accent-link)' }} />
            <span>Scenarios:</span>
          </span>

          {(Object.keys(PRESETS) as LabPresetKey[]).map((key) => {
            const preset = PRESETS[key]
            const isSelected = activePresetKey === key
            const isPresetAttack = preset.category === 'ATTACK_VECTOR'

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActivePresetKey(key)}
                className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: isSelected
                    ? isPresetAttack
                      ? 'var(--color-status-error-bg)'
                      : 'var(--color-accent)'
                    : 'var(--color-surface)',
                  color: isSelected
                    ? isPresetAttack
                      ? 'var(--color-status-error-text)'
                      : 'var(--color-accent-contrast)'
                    : 'var(--color-text-secondary)',
                  border: `1px solid ${
                    isSelected
                      ? isPresetAttack
                        ? 'var(--color-status-error-dot)'
                        : 'var(--color-accent)'
                      : 'var(--color-border-subtle)'
                  }`,
                }}
              >
                {isPresetAttack ? (
                  <ShieldAlert
                    size={12}
                    style={{
                      color: isSelected ? 'var(--color-status-error-text)' : 'var(--color-status-error-dot)',
                    }}
                  />
                ) : (
                  <CheckCircle2
                    size={12}
                    style={{
                      color: isSelected ? 'var(--color-accent-contrast)' : 'var(--color-status-success-dot)',
                    }}
                  />
                )}
                <span>{preset.title}</span>
              </button>
            )
          })}
        </div>

        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium"
          style={{
            backgroundColor: 'var(--color-status-success-bg)',
            color: 'var(--color-status-success-text)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-status-success-dot)' }}
          />
          <span>PostgreSQL 16 Dialect</span>
        </div>
      </div>

      {/* 6-Check Pipeline Bar */}
      <div
        className="px-4 sm:px-6 py-4"
        style={{
          backgroundColor: 'var(--color-page-bg)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[11px]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span className="uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            6-Check AST Verification Sequence
          </span>
          <span
            className="font-medium"
            style={{
              color: isAttack ? 'var(--color-status-error-text)' : 'var(--color-status-success-text)',
            }}
          >
            {isAttack
              ? `Blocked at Check #${(active.blockedAtGateIndex ?? 0) + 1}`
              : 'All 6 Checks Passed'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SIX_GATES.map((gate, idx) => {
            const isBlockedHere = isAttack && active.blockedAtGateIndex === idx
            const isPassed = !isAttack || idx < (active.blockedAtGateIndex ?? 0)

            return (
              <div
                key={gate.num}
                className="p-2.5 rounded-[8px] text-left transition-colors"
                style={{
                  backgroundColor: isBlockedHere
                    ? 'var(--color-status-error-bg)'
                    : isPassed
                    ? 'var(--color-status-success-bg)'
                    : 'var(--color-surface)',
                  border: `1px solid ${
                    isBlockedHere
                      ? 'var(--color-status-error-dot)'
                      : isPassed
                      ? 'var(--color-status-success-dot)'
                      : 'var(--color-border-subtle)'
                  }`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-semibold uppercase"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: isBlockedHere
                        ? 'var(--color-status-error-text)'
                        : isPassed
                        ? 'var(--color-status-success-text)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    Check #{gate.num}
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: isBlockedHere
                        ? 'var(--color-status-error-dot)'
                        : isPassed
                        ? 'var(--color-status-success-dot)'
                        : 'var(--color-border-strong)',
                    }}
                  />
                </div>
                <div
                  className="text-xs font-semibold truncate"
                  style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                >
                  {gate.token}
                </div>
                <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {gate.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Split Inspector Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Pane */}
        <div
          className="lg:col-span-5 p-5 sm:p-6 space-y-5 min-w-0"
          style={{
            backgroundColor: 'var(--color-raised)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[11px] uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                <Terminal size={12} style={{ color: 'var(--color-accent-link)' }} />
                <span>Natural-language input</span>
              </span>
            </div>
            <div
              className="p-3.5 rounded-[8px] text-sm leading-relaxed"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-primary)',
              }}
            >
              &ldquo;{active.prompt}&rdquo;
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[11px] uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                <Code2 size={12} style={{ color: 'var(--color-accent-link)' }} />
                <span>Parsed AST nodes</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {active.astTokens.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 rounded-[8px] text-xs"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    backgroundColor:
                      item.status === 'danger'
                        ? 'var(--color-status-error-bg)'
                        : item.status === 'clamped'
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                    border: `1px solid ${
                      item.status === 'danger'
                        ? 'var(--color-status-error-dot)'
                        : item.status === 'clamped'
                        ? 'var(--color-accent-border)'
                        : 'var(--color-border-subtle)'
                    }`,
                    color:
                      item.status === 'danger'
                        ? 'var(--color-status-error-text)'
                        : item.status === 'clamped'
                        ? 'var(--color-accent-link)'
                        : 'var(--color-text-primary)',
                  }}
                >
                  <span className="font-semibold">{item.token}</span>
                  <span className="text-[11px] opacity-85">{item.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict Banner */}
          <div
            className="p-4 rounded-[8px] flex items-start gap-3"
            style={{
              backgroundColor:
                active.verdict === 'VERIFIED_SAFE'
                  ? 'var(--color-status-success-bg)'
                  : 'var(--color-status-error-bg)',
              border: `1px solid ${
                active.verdict === 'VERIFIED_SAFE'
                  ? 'var(--color-status-success-dot)'
                  : 'var(--color-status-error-dot)'
              }`,
              color:
                active.verdict === 'VERIFIED_SAFE'
                  ? 'var(--color-status-success-text)'
                  : 'var(--color-status-error-text)',
            }}
          >
            {active.verdict === 'VERIFIED_SAFE' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <XCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold">
                {active.verdict === 'VERIFIED_SAFE' ? 'AST Verification Passed' : 'Statement Rejected'}
              </div>
              <p className="leading-relaxed opacity-90 m-0">
                {active.verdict === 'VERIFIED_SAFE'
                  ? 'Validated as a single read-only SELECT statement with row limits bounded prior to execution.'
                  : active.blockedReason}
              </p>
            </div>
          </div>
        </div>

        {/* Right Pane */}
        <div
          className="lg:col-span-7 p-5 sm:p-6 space-y-5 min-w-0"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderLeft: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Candidate SQL Block */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className="text-[11px] uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                <Database size={12} style={{ color: 'var(--color-accent-link)' }} />
                <span>
                  {active.category === 'ATTACK_VECTOR' ? 'Rejected Statement' : 'Validated PostgreSQL Query'}
                </span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] cursor-pointer landing-control-secondary"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {copied ? <Check size={11} style={{ color: 'var(--color-status-success-dot)' }} /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>

            <pre
              className="p-4 rounded-[8px] text-xs leading-relaxed overflow-x-auto m-0"
              style={{
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--color-raised)',
                border: '1px solid var(--color-border-subtle)',
                color: isAttack ? 'var(--color-status-error-text)' : 'var(--color-text-primary)',
              }}
            >
              <code>{active.sql}</code>
            </pre>
          </div>

          {/* Outcome Preview */}
          {active.category === 'READ_QUERY' && active.rows && (
            <div>
              <div
                className="flex items-center justify-between mb-2 text-[11px]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span className="uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Sample Output (&le; 100 rows)
                </span>
                <span style={{ color: 'var(--color-status-success-text)', fontWeight: 600 }}>
                  Checks cleared: {passedCount} / 6
                </span>
              </div>

              <div
                className="rounded-[8px] overflow-x-auto"
                style={{ border: '1px solid var(--color-border-subtle)' }}
              >
                <table className="w-full min-w-[460px] text-xs text-left border-collapse">
                  <tbody style={{ fontFamily: 'var(--font-mono)' }}>
                    {active.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                        className="last:border-b-0"
                      >
                        <td className="px-3.5 py-2.5 font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {row.name}
                        </td>
                        <td className="px-3.5 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {row.model}
                        </td>
                        <td className="px-3.5 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {row.site}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium" style={{ color: 'var(--color-accent-link)' }}>
                          {row.metric}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium" style={{ color: 'var(--color-status-success-text)' }}>
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active.category === 'ATTACK_VECTOR' && (
            <div
              className="rounded-[8px] p-4 space-y-2.5"
              style={{
                backgroundColor: 'var(--color-status-error-bg)',
                border: '1px solid var(--color-status-error-dot)',
              }}
            >
              <div
                className="flex items-center justify-between text-xs font-semibold"
                style={{ color: 'var(--color-status-error-text)', fontFamily: 'var(--font-mono)' }}
              >
                <span className="flex items-center gap-1.5">
                  <Lock size={13} />
                  <span>Execution Prevented Prior to Connection Pool</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--color-text-secondary)' }}>
                The AST validator rejected the query in application memory before requesting a cursor from the PostgreSQL reader role.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Policy Strip */}
      <div
        className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-[11px]"
        style={{
          backgroundColor: 'var(--color-raised)',
          borderTop: '1px solid var(--color-border-subtle)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-status-success-dot)' }}
          />
          <span>Dedicated Reader: SELECT-only privileges via qt_ai_readonly</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Max 500 rows</span>
          <span>&middot;</span>
          <span>5,000 ms timeout</span>
          <span>&middot;</span>
          <span>PostgreSQL 16</span>
        </div>
      </div>
    </div>
  )
}
