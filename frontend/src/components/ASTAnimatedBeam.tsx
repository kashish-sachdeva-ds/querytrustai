import { MessageSquare, ShieldCheck, Database, Check } from 'lucide-react'

export function ASTAnimatedBeam({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-between w-full max-w-lg mx-auto py-4 px-2 ${className}`}>
      {/* SVG Path Background & Glowing Sky Pulse */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
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
          className="text-slate-200 dark:text-slate-800"
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
        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300">
          <MessageSquare size={18} className="text-sky-500" />
        </div>
        <div className="text-center">
          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">User Question</span>
          <span className="block text-[10px] font-mono text-slate-500">Plain English</span>
        </div>
      </div>

      {/* Node 2: SQLGlot AST 6-Layer Shield (Center Hero Node) */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-500/30 shadow-md flex items-center justify-center text-sky-500">
            <ShieldCheck size={24} />
          </div>
          {/* Verified Micro-Badge */}
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[9px] font-bold flex items-center gap-0.5 shadow-xs">
            <Check size={8} strokeWidth={3} />
            6/6
          </span>
        </div>
        <div className="text-center">
          <span className="block text-xs font-semibold text-slate-900 dark:text-white">6-Gate AST</span>
          <span className="block text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">Verified Safe</span>
        </div>
      </div>

      {/* Node 3: PostgreSQL Database Engine */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300">
          <Database size={18} className="text-emerald-500" />
        </div>
        <div className="text-center">
          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">DB Kernel</span>
          <span className="block text-[10px] font-mono text-slate-500">qt_ai_readonly</span>
        </div>
      </div>
    </div>
  )
}
