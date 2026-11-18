import React, { useState } from 'react'
import {
  ShieldAlert,
  Terminal,
  Lock,
  ChevronRight,
  ShieldCheck,
  Shield,
  FileCode,
  Radio,
  Zap,
} from 'lucide-react'

interface ThreatVector {
  id: string
  name: string
  classification: string
  sampleAttack: string
  gateNumber: number
  gateIntercepted: string
  latencyMs: string
  mitigationEngine: string
  description: string
  cweCode: string
}

const THREAT_VECTORS: ThreatVector[] = [
  {
    id: 'ddl-drop',
    name: 'Destructive DDL Table Deletion',
    classification: 'CWE-89: SQL Injection / Table Dropping',
    cweCode: 'CWE-89',
    sampleAttack: "DROP TABLE devices CASCADE; -- wipe production asset catalog",
    gateNumber: 1,
    gateIntercepted: 'Gate #1: AST Statement Classifier',
    latencyMs: '0.18ms',
    mitigationEngine: 'SQLGlot checks root AST node is strictly exp.Select. Found exp.Drop.',
    description: 'Intercepted in user space before reaching connection pool. 0 database locks initiated.',
  },
  {
    id: 'dml-privilege',
    name: 'Privilege Escalation Mutation',
    classification: 'CWE-285: Improper Authorization / Role Tampering',
    cweCode: 'CWE-285',
    sampleAttack: "UPDATE user_accounts SET role = 'superadmin' WHERE email = current_user;",
    gateNumber: 1,
    gateIntercepted: 'Gate #1 & Gate #3: DML Mutator Lockout',
    latencyMs: '0.19ms',
    mitigationEngine: 'SQLGlot checks for exp.Update. Zero mutating statements permitted.',
    description: 'Completely rejected. Physical write commands are non-executable by qt_ai_readonly.',
  },
  {
    id: 'catalog-exfil',
    name: 'System Catalog & Password Exfiltration',
    classification: 'CWE-200: Exposure of Sensitive Information',
    cweCode: 'CWE-200',
    sampleAttack: 'SELECT usename, passwd FROM pg_shadow UNION SELECT 1, 2;',
    gateNumber: 2,
    gateIntercepted: 'Gate #2: Schema Catalog Whitelist',
    latencyMs: '0.24ms',
    mitigationEngine: 'Table "pg_shadow" rejected. Only explicitly whitelisted business tables permitted.',
    description: 'PostgreSQL system tables (pg_*, information_schema) are quarantined at the compiler.',
  },
  {
    id: 'cartesian-dos',
    name: 'Cartesian Product Denial of Service',
    classification: 'CWE-400: Uncontrolled Resource Consumption',
    cweCode: 'CWE-400',
    sampleAttack: 'SELECT * FROM devices, telemetry_readings, service_events;',
    gateNumber: 5,
    gateIntercepted: 'Gate #5: Unbounded Join Guard',
    latencyMs: '0.31ms',
    mitigationEngine: 'Cross join detected without explicit joining predicates. Query rejected.',
    description: 'Prevents CPU-exhaustion attacks that attempt to generate billion-row memory matrices.',
  },
  {
    id: 'unbounded-dump',
    name: 'Mass Data Exfiltration / Table Scrape',
    classification: 'CWE-770: Allocation of Resources Without Limits',
    cweCode: 'CWE-770',
    sampleAttack: 'SELECT * FROM telemetry_readings; -- dump all 10M rows',
    gateNumber: 6,
    gateIntercepted: 'Gate #6: Deterministic Clamp',
    latencyMs: '0.42ms',
    mitigationEngine: 'AST rewrite injects LIMIT 100 clamp regardless of client input.',
    description: 'Enforces memory boundaries. Client response payload never exceeds 100 governed records.',
  },
]

export const AttackDefenseMatrix: React.FC = () => {
  const [selectedThreatId, setSelectedThreatId] = useState<string>('ddl-drop')
  const [animatingPacket, setAnimatingPacket] = useState<boolean>(false)

  const activeThreat = THREAT_VECTORS.find((t) => t.id === selectedThreatId) || THREAT_VECTORS[0]

  const handleSelectThreat = (id: string) => {
    setSelectedThreatId(id)
    setAnimatingPacket(true)
    setTimeout(() => setAnimatingPacket(false), 800)
  }

  return (
    <section id="attack-matrix" className="py-20 sm:py-28 relative text-left bg-white dark:bg-[#09090B] transition-colors border-t border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-4 font-mono">
            <Shield size={13} />
            <span>04 // ADVERSARIAL DEFENSE MATRIX</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.15]">
            Validated against 151 adversarial{' '}
            <span className="text-rose-600 dark:text-rose-400">
              SQL injection and exfiltration vectors.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            The 6-layer compiler deterministically neutralizes destructive DDL, privilege escalation mutations, system catalog reconnaissance, and Cartesian exhaustion in sub-milliseconds before queries touch the database connection pool.
          </p>
        </div>

        {/* ── Interactive Cyber-Defense Radar & Firewall Visualizer ── */}
        <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 text-[11px] font-mono">
            <span className="text-zinc-400 flex items-center gap-2">
              <Radio size={13} className="text-rose-500 animate-pulse" />
              <span>LIVE INTERCEPTION RADAR &bull; THREAT RADAR ACTIVE</span>
            </span>
            <span className="text-emerald-400 font-bold">
              0 SOCKET PAYLOADS TRANSMITTED
            </span>
          </div>

          <div className="relative py-6 grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((gateNum) => {
              const isTargetGate = activeThreat.gateNumber === gateNum
              return (
                <div
                  key={gateNum}
                  className={`p-3 rounded-xl border text-center font-mono transition-all duration-300 relative ${
                    isTargetGate
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                  }`}
                >
                  <div className="text-[10px] uppercase">Gate #{gateNum}</div>
                  <div className="text-xs font-bold mt-1 text-white">
                    {gateNum === 1
                      ? 'exp.Select'
                      : gateNum === 2
                      ? 'Catalog'
                      : gateNum === 3
                      ? 'Column'
                      : gateNum === 4
                      ? 'Where'
                      : gateNum === 5
                      ? 'Join'
                      : 'LIMIT'}
                  </div>
                  {isTargetGate && (
                    <div className="mt-1 text-[9px] text-rose-400 font-bold flex items-center justify-center gap-1">
                      <Zap size={9} />
                      <span>BLOCKED {activeThreat.latencyMs}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Packet Trajectory Ray */}
          {animatingPacket && (
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-rose-400 to-transparent animate-pulse rounded-full" />
          )}
        </div>

        {/* Interactive Matrix Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Threat List (5 cols) */}
          <div className="lg:col-span-5 space-y-2.5">
            {THREAT_VECTORS.map((threat) => {
              const isSelected = threat.id === activeThreat.id
              return (
                <button
                  key={threat.id}
                  type="button"
                  onClick={() => handleSelectThreat(threat.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs'
                      : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-400 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-[#16161A] hover:translate-x-0.5 transition-all duration-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-rose-500 animate-pulse' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                      <span className="font-semibold text-xs sm:text-sm text-zinc-950 dark:text-white tracking-tight">
                        {threat.name}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-zinc-500 pl-4">
                      {threat.gateIntercepted}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${isSelected ? 'translate-x-1 text-rose-500' : 'text-zinc-400 dark:text-zinc-600'}`}
                  />
                </button>
              )
            })}
          </div>

          {/* Inspection Viewport (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/15 transition-colors duration-300 p-6 sm:p-8 space-y-5 shadow-xs">
            
            {/* Threat Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                  {activeThreat.classification}
                </span>
                <h3 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                  {activeThreat.name}
                </h3>
              </div>
              <div className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 font-mono text-[11px] font-semibold flex items-center gap-1.5 flex-shrink-0">
                <ShieldAlert size={12} />
                <span>INTERCEPTED IN {activeThreat.latencyMs}</span>
              </div>
            </div>

            {/* Attack Payload Snippet */}
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 block mb-1.5 flex items-center gap-1.5">
                <FileCode size={12} className="text-rose-500" />
                <span>MALICIOUS PAYLOAD</span>
              </span>
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-rose-300 overflow-x-auto shadow-inner">
                <code>{activeThreat.sampleAttack}</code>
              </div>
            </div>

            {/* Interception Breakdown */}
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-3">
                <Terminal size={14} className="text-sky-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10.5px] uppercase">Interception Gate:</span>
                  <span className="text-zinc-950 dark:text-white font-semibold">{activeThreat.gateIntercepted}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-3">
                <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10.5px] uppercase">Mitigation Engine:</span>
                  <span className="text-emerald-700 dark:text-emerald-300">{activeThreat.mitigationEngine}</span>
                </div>
              </div>
            </div>

            {/* Description & Impact Guarantee */}
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans pt-1">
              {activeThreat.description}
            </p>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between font-mono text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <Lock size={12} className="text-emerald-500" />
                <span>Kernel Guarantee: 0 Mutated Bytes</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">151/151 Tests Pass</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  )
}
