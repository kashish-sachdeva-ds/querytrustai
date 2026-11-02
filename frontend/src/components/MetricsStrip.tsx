import React from 'react'

export const MetricsStrip: React.FC = () => {
  return (
    <section id="metrics" className="border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0F17] py-14 relative text-left transition-colors">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-6">
          05 // PERFORMANCE &amp; GOVERNANCE BENCHMARKS
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Metric 01 */}
          <div className="space-y-1.5">
            <div className="font-mono text-3xl sm:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
              1.42<span className="text-sky-500">ms</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold">
              P95 AST Compiler Latency
            </div>
            <div className="text-xs text-zinc-500 font-sans">
              Microsecond deterministic AST parsing &amp; table whitelisting
            </div>
          </div>

          {/* Metric 02 */}
          <div className="space-y-1.5">
            <div className="font-mono text-3xl sm:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              151<span className="text-zinc-400 dark:text-zinc-600">/</span>151
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold">
              Automated Security Tests
            </div>
            <div className="text-xs text-zinc-500 font-sans">
              Zero mutation or SQL injection regressions across all test suites
            </div>
          </div>

          {/* Metric 03 */}
          <div className="space-y-1.5">
            <div className="font-mono text-3xl sm:text-5xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
              0 <span className="text-xs uppercase font-semibold text-zinc-500 tracking-normal">Writes</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold">
              Physical Kernel Guarantee
            </div>
            <div className="text-xs text-zinc-500 font-sans">
              PostgreSQL <code className="text-sky-600 dark:text-sky-400 font-semibold">qt_ai_readonly</code> role isolation
            </div>
          </div>

          {/* Metric 04 */}
          <div className="space-y-1.5">
            <div className="font-mono text-3xl sm:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
              30,000<span className="text-sky-500">+</span>
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold">
              Synthetically Governed Rows
            </div>
            <div className="text-xs text-zinc-500 font-sans">
              Enterprise network telemetry benchmark across 50 global sites
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
