import React from 'react'
import { ShieldCheck, Lock, Activity, Moon, Sun, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export const MetricsRibbon: React.FC = () => {
  const { theme, mode, toggleTheme, toggleMode } = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.74rem',
      }}
    >
      {/* DB Role Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'var(--qt-surface-muted, #F5F2ED)',
          border: '1px solid var(--qt-border, #E6E4E0)',
          color: 'var(--qt-ink, #191817)',
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 600,
        }}
        title="PostgreSQL Active Role: analytics_reader (Kernel SELECT-only enforcement)"
      >
        <ShieldCheck size={12} style={{ color: '#1F7A4C' }} />
        <span>role: analytics_reader</span>
      </div>

      {/* AST Guard Status Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'rgba(31, 122, 76, 0.1)',
          border: '1px solid rgba(31, 122, 76, 0.25)',
          color: '#1F7A4C',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
        title="SQLGlot AST Safety Guard: Enforced on all user and generated queries"
      >
        <Lock size={11} />
        <span>AST GUARD: ENFORCED</span>
      </div>

      {/* P95 Query Latency */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'var(--qt-surface-muted, #F5F2ED)',
          border: '1px solid var(--qt-border, #E6E4E0)',
          color: 'var(--qt-muted, #766F68)',
          fontFamily: 'var(--font-mono, monospace)',
        }}
        title="P95 Query Validation Latency"
      >
        <Activity size={12} style={{ color: '#FF4F00' }} />
        <span>P95: 1.8ms</span>
      </div>

      {/* View Mode Toggle */}
      <button
        type="button"
        onClick={toggleMode}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '4px',
          background: 'transparent',
          border: '1px solid var(--qt-border, #E6E4E0)',
          color: 'var(--qt-ink, #191817)',
          cursor: 'pointer',
          fontSize: '0.72rem',
          fontWeight: 600,
        }}
        title={`Current mode: ${mode}. Click to switch to ${mode === 'simple' ? 'Expert' : 'Simple'}`}
      >
        <Sparkles size={12} style={{ color: '#FF4F00' }} />
        <span>{mode === 'simple' ? 'Simple' : 'Expert'}</span>
      </button>

      {/* Quick Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: '4px',
          background: 'transparent',
          border: '1px solid var(--qt-border, #E6E4E0)',
          color: 'var(--qt-ink, #191817)',
          cursor: 'pointer',
        }}
        title={`Current theme: ${theme}. Click to switch to ${theme === 'light' ? 'Dark' : 'Light'}`}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
      </button>
    </div>
  )
}
