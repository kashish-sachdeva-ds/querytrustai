import React, { useState } from 'react'
import { ArrowUpRight, Terminal } from 'lucide-react'
import { QueryTrustLogo } from './QueryTrustLogo'

interface CyberFooterProps {
  onGoToLogin: () => void
  onLaunchAnalyst: () => void
  onLaunchAdmin: () => void
}

export const CyberFooter: React.FC<CyberFooterProps> = ({
  onGoToLogin,
  onLaunchAnalyst,
  onLaunchAdmin,
}) => {
  const [isHoveringPortal, setIsHoveringPortal] = useState(false)

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-[#F4F5F7] dark:bg-[#080C14] text-zinc-900 dark:text-white pt-16 pb-14 relative text-left transition-colors overflow-hidden">
      
      {/* 3D Portal Vortex Warp Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(56,189,248,0.15) 0%, transparent 65%), linear-gradient(to right, rgba(56,189,248,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 36px 36px, 36px 36px',
          transform: isHoveringPortal ? 'scale(1.08) perspective(600px) rotateX(10deg)' : 'scale(1)',
          opacity: isHoveringPortal ? 0.8 : 0.35,
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
        
        {/* Giant Editorial Statement & 3D Portal CTA */}
        <div className="pb-14 border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-3">
            06 // ZERO-TRUST DATABASE GOVERNANCE
          </div>
          <div className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-[1.05] text-zinc-950 dark:text-white max-w-4xl">
            Ready to experience compiler-grade analytics?
          </div>
          
          <div className="mt-8 flex items-center gap-3.5 flex-wrap">
            <button
              type="button"
              onMouseEnter={() => setIsHoveringPortal(true)}
              onMouseLeave={() => setIsHoveringPortal(false)}
              onClick={onLaunchAdmin}
              className="px-7 py-3.5 rounded-full bg-zinc-950 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-semibold text-xs shadow-lg shadow-sky-500/10 dark:shadow-sky-400/10 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] relative group"
            >
              <span>Enter Admin Studio</span>
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            <button
              type="button"
              onClick={onLaunchAnalyst}
              className="px-5 py-3.5 rounded-full bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium text-xs transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
            >
              <Terminal size={14} className="text-sky-500" />
              <span>Instant Analyst Demo</span>
            </button>
            <button
              type="button"
              onClick={onGoToLogin}
              className="px-4 py-3.5 rounded-full text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Sign In to Workspace &rarr;
            </button>
          </div>
        </div>

        {/* Technical Specification Matrix */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs font-mono border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-2.5 font-bold">Compiler Architecture</div>
            <div className="text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <div>SQLGlot PostgreSQL Dialect</div>
              <div>6 Deterministic AST Gates</div>
              <div>Strict exp.Select Enforcement</div>
              <div>P95 Compile Latency: 1.42ms</div>
            </div>
          </div>

          <div>
            <div className="text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-2.5 font-bold">Database Kernel</div>
            <div className="text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <div>PostgreSQL 16 Engine</div>
              <div>Role: <code className="text-zinc-950 dark:text-white font-semibold">qt_ai_readonly</code></div>
              <div>SELECT Privileges Only</div>
              <div>0 Bytes Mutated Guaranteed</div>
            </div>
          </div>

          <div>
            <div className="text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-2.5 font-bold">Security Standard</div>
            <div className="text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <div>Zero-Trust Data Isolation</div>
              <div>Synthetic Educational Telemetry</div>
              <div>Automated Security Tests: 151/151</div>
              <div>Deterministic Row Clamping (100)</div>
            </div>
          </div>

          <div>
            <div className="text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-2.5 font-bold">Execution Safety</div>
            <div className="text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <div>5,000ms Hard Statement Timeout</div>
              <div>Cartesian Join Interception</div>
              <div>Server-Stored Preview IDs</div>
              <div>Untrusted Client Browser Model</div>
            </div>
          </div>
        </div>

        {/* Bottom Credits & Status Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <QueryTrustLogo size={24} />
            <span className="font-bold text-zinc-950 dark:text-white">QueryTrust AI</span>
            <span>&bull;</span>
            <span>Governed Natural Language Analytics Workbench</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>PostgreSQL Kernel &bull; AST Compiler Operational</span>
          </div>

          <div>
            &copy; {new Date().getFullYear()} QueryTrust AI. All rights reserved.
          </div>
        </div>

      </div>
    </footer>
  )
}
