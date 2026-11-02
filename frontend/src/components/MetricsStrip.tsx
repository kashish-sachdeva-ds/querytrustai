import React from 'react'

export const MetricsStrip: React.FC = () => {
  return (
    <section id="metrics" className="border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0F17] py-16 sm:py-20 relative text-left transition-colors overflow-hidden">
      
      {/* Background SVG Oscilloscope Wave */}
      <div className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none opacity-20 dark:opacity-15 overflow-hidden" aria-hidden="true">
        <svg viewBox="0 0 1200 120" className="w-full h-full preserve-3d">
          <path
            d="M0,60 C150,110 350,10 500,60 C650,110 850,10 1000,60 C1100,85 1150,70 1200,60"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          <path
            d="M0,60 C200,30 400,90 600,60 C800,30 1000,90 1200,60"
            fill="none"
            stroke="#10B981"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
        
        <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-8 flex items-center justify-between">
          <span>05 // PERFORMANCE &amp; GOVERNANCE BENCHMARKS</span>
          <span className="text-sky-600 dark:text-sky-400 font-bold">100% Deterministic Verification</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          
          {/* Metric 01: 1.42ms */}
          <div className="space-y-2 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/[0.06] backdrop-blur-sm relative group hover:border-sky-400/50 transition-all">
            <div className="font-mono text-4xl sm:text-6xl font-black text-zinc-950 dark:text-white tracking-tighter">
              1.42<span className="text-sky-500 text-2xl sm:text-3xl font-sans ml-0.5">ms</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-bold">
              P95 AST Compiler Latency
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed">
              Deterministic AST parsing &amp; table whitelisting in microseconds
            </div>
          </div>

          {/* Metric 02: 151/151 */}
          <div className="space-y-2 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/[0.06] backdrop-blur-sm relative group hover:border-emerald-400/50 transition-all">
            <div className="font-mono text-4xl sm:text-6xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
              151<span className="text-zinc-400 dark:text-zinc-600 text-2xl sm:text-3xl">/</span>151
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-bold">
              Automated Security Tests
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed">
              Zero mutation or SQL injection regressions across all test suites
            </div>
          </div>

          {/* Metric 03: 0 Writes */}
          <div className="space-y-2 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/[0.06] backdrop-blur-sm relative group hover:border-sky-400/50 transition-all">
            <div className="font-mono text-4xl sm:text-6xl font-black text-sky-600 dark:text-sky-400 tracking-tighter">
              0 <span className="text-lg sm:text-xl uppercase font-bold text-zinc-500 tracking-normal font-sans">Writes</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-bold">
              Physical Kernel Guarantee
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed">
              PostgreSQL <code className="text-sky-600 dark:text-sky-400 font-semibold font-mono">qt_ai_readonly</code> role isolation
            </div>
          </div>

          {/* Metric 04: 30,000+ */}
          <div className="space-y-2 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/[0.06] backdrop-blur-sm relative group hover:border-sky-400/50 transition-all">
            <div className="font-mono text-4xl sm:text-6xl font-black text-zinc-950 dark:text-white tracking-tighter">
              30,000<span className="text-sky-500 text-2xl sm:text-3xl">+</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-bold">
              Synthetically Governed Rows
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed">
              Enterprise network telemetry benchmark across 50 global sites
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
