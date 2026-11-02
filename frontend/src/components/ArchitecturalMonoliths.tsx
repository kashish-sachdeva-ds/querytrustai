import React from 'react'
import {
  Lock,
  Database,
  Layers,
  Shield,
  Zap,
} from 'lucide-react'

export const ArchitecturalMonoliths: React.FC = () => {
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

        {/* 3 Minimal Architectural Monoliths with Clean White/Grey Surfaces & Watermark Numerals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 01: 6-Gate AST Compiler */}
          <div className="group relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 p-8 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700/60 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
            {/* Watermark Numeral */}
            <span className="absolute -top-3 right-4 font-display font-black text-7xl text-zinc-100 dark:text-zinc-800/40 select-none pointer-events-none group-hover:text-sky-100 dark:group-hover:text-sky-950/40 transition-colors">
              01
            </span>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Shield size={14} />
                  <span>INVARIANT 01</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  SQLGlot Engine
                </span>
              </div>

              {/* Graphic Representation */}
              <div className="h-40 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 p-4 mb-6 flex flex-col justify-center space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Statement Gate:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Strict exp.Select</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Catalog Barrier:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Whitelisted Tables</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Output Bound:</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">LIMIT &le; 100 Clamped</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                6-Gate Deterministic AST Compiler
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Every query is parsed into a PostgreSQL dialect abstract syntax tree before execution. Destructive DDL, unconstrained cartesian explosions, and system catalog probes are rejected in microseconds.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between font-mono text-xs text-zinc-500 relative z-10">
              <span>Compiler P95</span>
              <strong className="text-zinc-950 dark:text-white font-mono font-semibold">1.42ms Latency</strong>
            </div>
          </div>

          {/* Card 02: Kernel Role Isolation */}
          <div className="group relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 p-8 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700/60 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
            {/* Watermark Numeral */}
            <span className="absolute -top-3 right-4 font-display font-black text-7xl text-zinc-100 dark:text-zinc-800/40 select-none pointer-events-none group-hover:text-sky-100 dark:group-hover:text-sky-950/40 transition-colors">
              02
            </span>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Lock size={14} />
                  <span>INVARIANT 02</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10.5px] font-mono text-sky-600 dark:text-sky-400 font-semibold">
                  Kernel Boundary
                </span>
              </div>

              {/* Graphic Representation */}
              <div className="h-40 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 p-4 mb-6 flex flex-col justify-center space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                  <span className="flex items-center gap-2">
                    <Database size={13} />
                    <span>SELECT Privileges</span>
                  </span>
                  <span className="font-semibold text-[10px]">GRANTED</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400">
                  <span className="flex items-center gap-2">
                    <Lock size={13} />
                    <span>INSERT / UPDATE / DROP</span>
                  </span>
                  <span className="font-semibold text-[10px]">REVOKED</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Dedicated Read-Only Execution Role
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Natural-language queries execute exclusively through <code className="text-sky-600 dark:text-sky-400 font-mono font-semibold">qt_ai_readonly</code>. Even in the theoretical event of a full compiler bypass, PostgreSQL kernel rules enforce zero write permissions.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between font-mono text-xs text-zinc-500 relative z-10">
              <span>Write Privileges</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">0 Permissions</strong>
            </div>
          </div>

          {/* Card 03: Velocity Transformation */}
          <div className="group relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 p-8 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700/60 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
            {/* Watermark Numeral */}
            <span className="absolute -top-3 right-4 font-display font-black text-7xl text-zinc-100 dark:text-zinc-800/40 select-none pointer-events-none group-hover:text-sky-100 dark:group-hover:text-sky-950/40 transition-colors">
              03
            </span>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Zap size={14} />
                  <span>INVARIANT 03</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10.5px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  Team Velocity
                </span>
              </div>

              {/* Graphic Representation */}
              <div className="h-40 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 p-4 mb-6 flex flex-col items-center justify-center text-center">
                <div className="font-mono text-4xl sm:text-5xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
                  1.42s
                </div>
                <div className="font-mono text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">
                  Self-Serve Query Latency
                </div>
                <div className="text-[10.5px] text-zinc-400 mt-1.5 font-mono">
                  vs. 4-Hour Jira Ticket DBA Queue
                </div>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Instant Self-Serve Without Security Risk
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                Empower technical analysts and domain stakeholders with direct, natural-language database exploration without creating security reviews or granting raw database credentials.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between font-mono text-xs text-zinc-500 relative z-10">
              <span>DBA Deflection</span>
              <strong className="text-sky-600 dark:text-sky-400 font-mono font-semibold">65% Deflection</strong>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
