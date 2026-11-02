import React, { useState } from 'react'
import {
  Lock,
  Layers,
  Shield,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

export const ArchitecturalMonoliths: React.FC = () => {
  // Card 2 State: Switchboard simulated write attempt
  const [switchboardTest, setSwitchboardTest] = useState<'idle' | 'rejected'>('idle')

  // Card 3 State: Velocity Race simulation
  const [raceRunning, setRaceRunning] = useState(false)
  const [raceFinished, setRaceFinished] = useState(false)

  const handleStartRace = () => {
    setRaceRunning(true)
    setRaceFinished(false)
    setTimeout(() => {
      setRaceFinished(true)
      setRaceRunning(false)
    }, 1420)
  }

  return (
    <section id="three-invariants" className="py-20 sm:py-28 relative text-left bg-[#F4F5F7] dark:bg-[#090D15] transition-colors border-t border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-4 font-mono">
            <Layers size={13} />
            <span>03 // CORE ARCHITECTURAL INVARIANTS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.05]">
            Architected so failure is{' '}
            <span className="text-sky-500 dark:text-sky-400">
              mathematically impossible.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            We reject the idea that prompt instructions are a security boundary. QueryTrust AI guarantees data safety at two immutable software barriers: an AST compiler that inspects SQL tokens and a physical database role with zero write grants.
          </p>
        </div>

        {/* 3 Interactive Bento Visual Cards with 200px-Tall Custom SVG Illustrations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ── CARD 01: 200px Custom SVG Animated 6-Layer Laser Sieve ── */}
          <div className="group relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 p-6 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700/60 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
            {/* Watermark Numeral */}
            <span className="absolute -top-3 right-4 font-display font-black text-7xl text-zinc-100 dark:text-zinc-800/40 select-none pointer-events-none group-hover:text-sky-100 dark:group-hover:text-sky-950/40 transition-colors">
              01
            </span>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Shield size={14} />
                  <span>INVARIANT 01</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  SQLGlot Sieve
                </span>
              </div>

              {/* 200px-Tall Custom Animated 6-Layer Laser Sieve SVG */}
              <div className="h-[200px] rounded-2xl bg-zinc-950 border border-zinc-800 p-3 mb-6 flex flex-col justify-center font-mono text-xs relative overflow-hidden">
                <div className="absolute top-2 left-3 text-[9.5px] text-zinc-500 font-mono">
                  // 6-LAYER LASER AST SIEVE
                </div>

                <svg viewBox="0 0 320 180" className="w-full h-full">
                  <defs>
                    <linearGradient id="sieve-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>

                  {/* Incoming Unfiltered Stream (Red Triangles + Cyan Circles) */}
                  <g transform="translate(10, 40)">
                    {/* Blocked Red Threat Triangles */}
                    <polygon points="15,20 25,35 5,35" fill="#EF4444" opacity="0.9" />
                    <polygon points="35,65 45,80 25,80" fill="#EF4444" opacity="0.9" />
                    <text x="35" y="100" fill="#F87171" fontSize="7" fontFamily="monospace">DROP / DDL</text>

                    {/* Safe Cyan Query Circles */}
                    <circle cx="20" cy="55" r="5" fill="#38BDF8" />
                    <circle cx="45" cy="30" r="5" fill="#38BDF8" />
                    <circle cx="30" cy="115" r="5" fill="#38BDF8" />
                  </g>

                  {/* 6 Vertical Laser Sieve Grids */}
                  {[
                    { x: 90, name: 'G1', label: 'exp.Select' },
                    { x: 120, name: 'G2', label: 'Catalog' },
                    { x: 150, name: 'G3', label: 'Column' },
                    { x: 180, name: 'G4', label: 'Where' },
                    { x: 210, name: 'G5', label: 'Join' },
                    { x: 240, name: 'G6', label: 'Limit' },
                  ].map((sieve) => (
                    <g key={sieve.name} transform={`translate(${sieve.x}, 25)`}>
                      {/* Laser Line */}
                      <line x1="0" y1="15" x2="0" y2="135" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" opacity="0.85" />
                      <circle cx="0" cy="15" r="2.5" fill="#38bdf8" />
                      <circle cx="0" cy="135" r="2.5" fill="#38bdf8" />
                      <text x="0" y="148" textAnchor="middle" fill="#38BDF8" fontSize="7.5" fontFamily="monospace">{sieve.name}</text>
                    </g>
                  ))}

                  {/* Deflected Red Sparks stopped at Laser Gate 1 */}
                  <g transform="translate(90, 70)">
                    <circle r="8" fill="#EF4444" opacity="0.5" />
                    <line x1="0" y1="0" x2="-12" y2="-10" stroke="#EF4444" strokeWidth="1.5" />
                    <line x1="0" y1="0" x2="-14" y2="8" stroke="#EF4444" strokeWidth="1.5" />
                  </g>

                  {/* Purified Outgoing Stream: Safe Blue Particles Only */}
                  <g transform="translate(260, 40)">
                    <circle cx="15" cy="40" r="5" fill="#10B981" />
                    <circle cx="35" cy="70" r="5" fill="#10B981" />
                    <circle cx="20" cy="95" r="5" fill="#10B981" />
                    <path d="M 5 70 L 45 70" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" />
                    <text x="25" y="125" textAnchor="middle" fill="#10B981" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                      VERIFIED SELECT
                    </text>
                  </g>
                </svg>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                6-Gate Deterministic AST Compiler
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Every query is parsed into a PostgreSQL dialect abstract syntax tree before execution. Destructive DDL, unconstrained cartesian explosions, and system catalog probes are rejected in microseconds.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between font-mono text-xs text-zinc-500 relative z-10">
              <span>Compiler P95</span>
              <strong className="text-zinc-950 dark:text-white font-mono font-semibold">1.42ms Latency</strong>
            </div>
          </div>

          {/* ── CARD 02: 200px Custom SVG Physical Switchboard Illustration ── */}
          <div className="group relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 p-6 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700/60 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
            {/* Watermark Numeral */}
            <span className="absolute -top-3 right-4 font-display font-black text-7xl text-zinc-100 dark:text-zinc-800/40 select-none pointer-events-none group-hover:text-sky-100 dark:group-hover:text-sky-950/40 transition-colors">
              02
            </span>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Lock size={14} />
                  <span>INVARIANT 02</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10.5px] font-mono text-sky-600 dark:text-sky-400 font-semibold">
                  Kernel Boundary
                </span>
              </div>

              {/* 200px Custom SVG Physical Switchboard Illustration */}
              <div className="h-[200px] rounded-2xl bg-zinc-950 border border-zinc-800 p-3 mb-6 flex flex-col justify-between font-mono text-xs relative">
                <div className="flex items-center justify-between text-[9.5px] text-zinc-500">
                  <span>// PHYSICAL KERNEL SWITCHBOARD</span>
                  <span className="text-emerald-400 font-bold">qt_ai_readonly</span>
                </div>

                {/* SVG Switchboard Graphics */}
                <svg viewBox="0 0 320 120" className="w-full h-auto">
                  {/* SELECT SWITCH (ON - GREEN) */}
                  <g transform="translate(20, 10)">
                    <rect width="130" height="95" rx="8" fill="#064E3B" stroke="#10B981" strokeWidth="1.5" />
                    <circle cx="20" cy="20" r="5" fill="#34D399" />
                    <text x="32" y="24" fill="#34D399" fontSize="9" fontFamily="monospace" fontWeight="bold">SELECT</text>
                    <rect x="20" y="38" width="90" height="24" rx="12" fill="#022C22" />
                    <circle cx="85" cy="50" r="10" fill="#10B981" />
                    <text x="65" y="85" textAnchor="middle" fill="#6EE7B7" fontSize="8" fontFamily="monospace">STATUS: GRANTED</text>
                  </g>

                  {/* INSERT/DROP SWITCH (LOCKED - RED BEHIND BOLTED GLASS) */}
                  <g transform="translate(170, 10)">
                    <rect width="130" height="95" rx="8" fill="#4C0519" stroke="#EF4444" strokeWidth="1.5" />
                    {/* Bolted Glass Rivets */}
                    <circle cx="8" cy="8" r="2.5" fill="#71717A" />
                    <circle cx="122" cy="8" r="2.5" fill="#71717A" />
                    <circle cx="8" cy="87" r="2.5" fill="#71717A" />
                    <circle cx="122" cy="87" r="2.5" fill="#71717A" />

                    <circle cx="20" cy="20" r="5" fill="#EF4444" />
                    <text x="32" y="24" fill="#F87171" fontSize="9" fontFamily="monospace" fontWeight="bold">WRITE / DDL</text>
                    <rect x="20" y="38" width="90" height="24" rx="12" fill="#2A020B" />
                    <circle cx="45" cy="50" r="10" fill="#7F1D1D" stroke="#EF4444" strokeWidth="1.5" />
                    <text x="65" y="85" textAnchor="middle" fill="#FCA5A5" fontSize="8" fontFamily="monospace">STATUS: REVOKED</text>
                  </g>
                </svg>

                {/* Interactive Test Action */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSwitchboardTest('rejected')
                      setTimeout(() => setSwitchboardTest('idle'), 2500)
                    }}
                    className="text-[9.5px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Simulate Write Attempt</span>
                  </button>
                  {switchboardTest === 'rejected' && (
                    <span className="text-[9.5px] text-rose-400 font-bold animate-pulse flex items-center gap-1">
                      <XCircle size={10} />
                      <span>Permission Denied (0 Writes)</span>
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Dedicated Read-Only Execution Role
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Natural-language queries execute exclusively through <code className="text-sky-600 dark:text-sky-400 font-mono font-semibold">qt_ai_readonly</code>. Even in the theoretical event of a full compiler bypass, PostgreSQL kernel rules enforce zero write permissions.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between font-mono text-xs text-zinc-500 relative z-10">
              <span>Write Privileges</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">0 Permissions</strong>
            </div>
          </div>

          {/* ── CARD 03: 200px Custom SVG Speed Race Illustration ── */}
          <div className="group relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 p-6 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700/60 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
            {/* Watermark Numeral */}
            <span className="absolute -top-3 right-4 font-display font-black text-7xl text-zinc-100 dark:text-zinc-800/40 select-none pointer-events-none group-hover:text-sky-100 dark:group-hover:text-sky-950/40 transition-colors">
              03
            </span>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Zap size={14} />
                  <span>INVARIANT 03</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10.5px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  Team Velocity
                </span>
              </div>

              {/* 200px Custom SVG Speed Race Illustration */}
              <div className="h-[200px] rounded-2xl bg-zinc-950 border border-zinc-800 p-3 mb-6 flex flex-col justify-between font-mono text-xs relative">
                <div className="flex items-center justify-between text-[9.5px] text-zinc-500">
                  <span>// VELOCITY RACE COMPARATOR</span>
                  <span className="text-sky-400 font-bold">10,140x FASTER</span>
                </div>

                {/* SVG Laser Beam vs Slow Bar */}
                <svg viewBox="0 0 320 120" className="w-full h-auto">
                  {/* Track 1: QueryTrust AI Laser Pulse (1.42s) */}
                  <g transform="translate(10, 15)">
                    <text x="0" y="10" fill="#38BDF8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">QUERYTRUST AI (1.42s)</text>
                    <rect x="0" y="16" width="300" height="18" rx="9" fill="#0c4a6e" />
                    <rect
                      x="0"
                      y="16"
                      width={raceRunning || raceFinished ? 300 : 280}
                      height="18"
                      rx="9"
                      fill="#38BDF8"
                    />
                    <circle cx="280" cy="25" r="5" fill="#FFFFFF" />
                  </g>

                  {/* Track 2: 4-Hour Jira DBA Queue */}
                  <g transform="translate(10, 65)">
                    <text x="0" y="10" fill="#71717A" fontSize="8.5" fontFamily="monospace">4-HOUR JIRA DBA QUEUE</text>
                    <rect x="0" y="16" width="300" height="18" rx="9" fill="#27272a" />
                    <rect x="0" y="16" width="12" height="18" rx="6" fill="#71717a" />
                    <text x="20" y="29" fill="#52525b" fontSize="7.5" fontFamily="monospace">0.01% — Waiting in DBA Triage</text>
                  </g>
                </svg>

                {/* Race Trigger Button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleStartRace}
                    disabled={raceRunning}
                    className="text-[9.5px] text-zinc-300 hover:text-white px-3 py-1 rounded-md bg-sky-600 hover:bg-sky-500 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {raceRunning ? <RotateCcw size={10} className="animate-spin" /> : <Play size={10} />}
                    <span>{raceRunning ? 'Racing...' : 'Run Velocity Race'}</span>
                  </button>
                  {raceFinished && (
                    <span className="text-[9.5px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      <span>10,140x Velocity Delta</span>
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Instant Self-Serve Without Security Risk
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Empower technical analysts and domain stakeholders with direct, natural-language database exploration without creating security reviews or granting raw database credentials.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between font-mono text-xs text-zinc-500 relative z-10">
              <span>DBA Deflection</span>
              <strong className="text-sky-600 dark:text-sky-400 font-mono font-semibold">65% Deflection</strong>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
