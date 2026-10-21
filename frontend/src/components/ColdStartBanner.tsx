import React from 'react'
import { AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react'
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

  if (connectionState === 'connected') return null

  if (isWakingBackend) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          background: 'linear-gradient(90deg, #182030 0%, #111723 100%)',
          borderBottom: '1px solid #FF5E1A',
          color: '#FAF8F5',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.82rem',
          zIndex: 9999,
          position: 'sticky',
          top: 0,
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#FF5E1A',
              boxShadow: '0 0 8px #FF5E1A',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <AlertCircle size={15} style={{ color: '#FF5E1A', flexShrink: 0 }} />
          <span>
            <strong>Backend Waking Up:</strong> Render server is starting from idle (Render cold start 30–50s).
            {' '}Auto-retrying in <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#FF5E1A' }}>{retryCountdown}s</span>.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={retryConnection}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 600,
              background: 'transparent',
              color: '#FAF8F5',
              border: '1px solid #334056',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} />
            Retry Now
          </button>
          <button
            type="button"
            onClick={() => enterDemoMode('analyst')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: '#FF4F00',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(255, 79, 0, 0.4)',
            }}
          >
            <Sparkles size={12} />
            Enter Interactive Demo Workbench
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
          background: 'rgba(255, 79, 0, 0.08)',
          borderBottom: '1px solid rgba(255, 79, 0, 0.25)',
          color: 'var(--qt-ink, #191817)',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.78rem',
          zIndex: 9998,
          position: 'sticky',
          top: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: '#FF4F00',
              color: '#FFFFFF',
            }}
          >
            Offline Demo Mode
          </span>
          <span>
            Operating with deterministic 5,000-device schema fixtures and simulated AST validation.
          </span>
        </div>

        <button
          type="button"
          onClick={exitDemoMode}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            fontSize: '0.74rem',
            fontWeight: 600,
            background: 'var(--qt-surface, #ffffff)',
            color: 'var(--qt-ink, #191817)',
            border: '1px solid var(--qt-border, #E6E4E0)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          <CheckCircle2 size={12} style={{ color: '#1F7A4C' }} />
          Connect Live Backend
        </button>
      </div>
    )
  }

  return null
}
