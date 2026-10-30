import { MessageSquare, ShieldCheck, Database, Check } from 'lucide-react'

export function ASTAnimatedBeam({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-between w-full max-w-lg mx-auto py-4 px-2 ${className}`}>
      {/* SVG Path Background & Glowing Pulse */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#F97316" stopOpacity="1" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
          </linearGradient>
          <filter id="beam-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Static Base Line */}
        <line
          x1="18%"
          y1="50%"
          x2="82%"
          y2="50%"
          stroke="currentColor"
          className="text-zinc-200 dark:text-zinc-800"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Animated Traveling Beam 1: Input to AST */}
        <line
          x1="18%"
          y1="50%"
          x2="50%"
          y2="50%"
          stroke="url(#beam-gradient)"
          strokeWidth="2"
          filter="url(#beam-glow)"
          strokeDasharray="30 150"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="180"
            to="0"
            dur="2s"
            repeatCount="indefinite"
          />
        </line>

        {/* Animated Traveling Beam 2: AST to DB Kernel */}
        <line
          x1="50%"
          y1="50%"
          x2="82%"
          y2="50%"
          stroke="#10B981"
          strokeWidth="2"
          filter="url(#beam-glow)"
          strokeDasharray="30 150"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="180"
            to="0"
            dur="2s"
            begin="0.5s"
            repeatCount="indefinite"
          />
        </line>
      </svg>

      {/* Node 1: Natural Language Input */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm flex items-center justify-center text-zinc-600 dark:text-zinc-300">
          <MessageSquare size={18} className="text-[#F97316]" />
        </div>
        <div className="text-center">
          <span className="block text-xs font-semibold text-[var(--text-main)]">User Question</span>
          <span className="block text-[10px] font-mono text-[var(--text-muted)]">Plain English</span>
        </div>
      </div>

      {/* Node 2: SQLGlot AST 6-Layer Shield (Center Hero Node) */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 shadow-md flex items-center justify-center text-[#F97316]">
            <ShieldCheck size={24} />
          </div>
          {/* Verified Micro-Badge */}
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[9px] font-bold flex items-center gap-0.5 shadow-sm">
            <Check size={8} strokeWidth={3} />
            6/6
          </span>
        </div>
        <div className="text-center">
          <span className="block text-xs font-semibold text-[var(--text-main)]">SQLGlot AST Shield</span>
          <span className="block text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
            Mathematical Gate
          </span>
        </div>
      </div>

      {/* Node 3: PostgreSQL Dedicated Kernel */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm flex items-center justify-center text-zinc-600 dark:text-zinc-300">
          <Database size={18} className="text-emerald-500" />
        </div>
        <div className="text-center">
          <span className="block text-xs font-semibold text-[var(--text-main)]">PostgreSQL Kernel</span>
          <span className="block text-[10px] font-mono text-[var(--text-muted)]">qt_ai_readonly (0 write)</span>
        </div>
      </div>
    </div>
  )
}
