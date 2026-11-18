import React from 'react'

export const MetricsStrip: React.FC = () => {
  return (
    <section id="metrics" className="border-y border-zinc-200/90 dark:border-zinc-800 bg-zinc-950 text-white py-20 relative text-left transition-colors overflow-hidden select-none">
      {/* Background SVG Oscilloscope Wave — Monochromatic Graphite */}
      <div className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none opacity-25 overflow-hidden" aria-hidden="true">
        <svg viewBox="0 0 1200 120" className="w-full h-full preserve-3d">
          <path
            d="M0,60 C150,110 350,10 500,60 C650,110 850,10 1000,60 C1100,85 1150,70 1200,60"
            fill="none"
            stroke="#27272A"
            strokeWidth="2.5"
            strokeDasharray="5 3"
          />
          <path
            d="M0,60 C200,30 400,90 600,60 C800,30 1000,90 1200,60"
            fill="none"
            stroke="#3F3F46"
            strokeWidth="2"
            strokeDasharray="6 3"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">

        {/* Monospace Index Stamp */}
        <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between font-bold">
          <span>05 // PERFORMANCE &amp; SCALE BENCHMARKS</span>
          <span className="bg-zinc-800/90 border border-zinc-700/80 text-zinc-300 px-3 py-1 rounded-full text-[10.5px]">
            Deterministic AST Pipeline
          </span>
        </div>

        {/* Executive Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white mb-12 leading-[1.15]">
          Sub-millisecond verification with zero production overhead.
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">

          {/* Metric 01: 1.42ms */}
          <div className="space-y-2 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-white/25 hover:bg-zinc-900/90 hover:-translate-y-1 hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12)] transition-all duration-200 backdrop-blur-md relative shadow-sm group cursor-default">
            <div className="font-mono text-3xl sm:text-5xl font-bold text-white tracking-tight tabular-nums">
              1.42<span className="text-zinc-400 text-xl sm:text-2xl font-mono ml-0.5">ms</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-bold">
              P95 AST Compiler Latency
            </div>
            <div className="text-xs text-zinc-400 font-sans leading-relaxed">
              Deterministic AST parsing &amp; table whitelisting in microseconds
            </div>
          </div>

          {/* Metric 02: 151/151 */}
          <div className="space-y-2 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-white/25 hover:bg-zinc-900/90 hover:-translate-y-1 hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12)] transition-all duration-200 backdrop-blur-md relative shadow-sm group cursor-default">
            <div className="font-mono text-3xl sm:text-5xl font-bold text-white tracking-tight tabular-nums">
              151<span className="text-zinc-500 text-xl sm:text-2xl">/</span>151
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-bold">
              Automated Safety Tests
            </div>
            <div className="text-xs text-zinc-400 font-sans leading-relaxed">
              Zero mutation or SQL injection regressions across all evaluated test suites
            </div>
          </div>

          {/* Metric 03: 0 Writes */}
          <div className="space-y-2 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-white/25 hover:bg-zinc-900/90 hover:-translate-y-1 hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12)] transition-all duration-200 backdrop-blur-md relative shadow-sm group cursor-default">
            <div className="font-mono text-3xl sm:text-5xl font-bold text-white tracking-tight tabular-nums">
              0 <span className="text-base sm:text-lg uppercase font-bold text-zinc-400 tracking-normal font-sans">Writes</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-bold">
              Physical Kernel Guarantee
            </div>
            <div className="text-xs text-zinc-400 font-sans leading-relaxed">
              PostgreSQL <code className="text-zinc-200 bg-zinc-800/80 px-1 py-0.5 rounded font-semibold font-mono">qt_ai_readonly</code> role isolation
            </div>
          </div>

          {/* Metric 04: 30,000+ */}
          <div className="space-y-2 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-white/25 hover:bg-zinc-900/90 hover:-translate-y-1 hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12)] transition-all duration-200 backdrop-blur-md relative shadow-sm group cursor-default">
            <div className="font-mono text-3xl sm:text-5xl font-bold text-white tracking-tight tabular-nums">
              30,000<span className="text-zinc-400 text-xl sm:text-2xl">+</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-bold">
              Synthetically Governed Records
            </div>
            <div className="text-xs text-zinc-400 font-sans leading-relaxed">
              Enterprise network telemetry benchmark across 50 global facilities
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
