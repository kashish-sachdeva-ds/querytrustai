import React, { useState } from 'react'
import { AlertCircle, RefreshCw, Sparkles, CheckCircle2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const ColdStartBanner: React.FC = () => {
  const {
    connectionState,
    retryCountdown,
    enterDemoMode,
    exitDemoMode,
    retryConnection,
    isWakingBackend,
    isOfflineDemo,
  } = useAuth()

  const [dismissed, setDismissed] = useState(false)

  if (connectionState === 'connected' || dismissed) return null

  if (isWakingBackend) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-50 w-full h-8 px-4 bg-zinc-950 text-white border-b border-zinc-800 text-xs font-mono flex items-center justify-between gap-3 shadow-md overflow-hidden"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />
          <span className="truncate text-[11px]">
            <strong className="text-amber-300">Backend Server Waking Up:</strong> Render instance waking (~30s).
            {' '}Auto-retrying in <span className="font-bold text-sky-400">{retryCountdown}s</span>.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={retryConnection}
            className="h-6 px-2.5 rounded-full text-[10.5px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={10} />
            <span>Retry</span>
          </button>
          <button
            type="button"
            onClick={() => enterDemoMode('analyst')}
            className="h-6 px-3 rounded-full text-[10.5px] font-semibold bg-white hover:bg-zinc-100 text-zinc-950 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <Sparkles size={10} className="text-sky-600" />
            <span>Interactive Demo</span>
          </button>
        </div>
      </div>
    )
  }

  if (isOfflineDemo) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          background: 'var(--color-raised)',
          borderBottom: '1px solid var(--color-border-subtle)',
          color: 'var(--color-text-secondary)',
        }}
        className="sticky top-0 z-50 w-full h-8 px-4 text-xs font-mono flex items-center justify-between gap-3 overflow-hidden"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider flex-shrink-0"
            style={{
              background: 'var(--color-accent-subtle)',
              color: 'var(--color-accent-link)',
              border: '1px solid var(--color-accent-border)',
            }}
          >
            Offline Demo Mode
          </span>
          <span className="text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
            Operating with deterministic 5,000-device fixtures and simulated AST validation.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={exitDemoMode}
            className="h-6 px-2.5 rounded-full text-[10.5px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-subtle)',
            }}
            title="Connect to live backend"
          >
            <CheckCircle2 size={11} style={{ color: 'var(--color-status-success-dot)' }} />
            <span>Connect Backend</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Dismiss banner"
            aria-label="Dismiss banner"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    )
  }

  return null
}
