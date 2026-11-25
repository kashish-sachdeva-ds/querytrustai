import React from 'react'
import { Sun, Moon, ArrowUpRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { QueryTrustLogo } from './QueryTrustLogo'

interface CyberHeaderProps {
  onSignIn: () => void
  onLaunchAnalyst: () => void
  onLaunchAdmin: () => void
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  onSignIn,
  onLaunchAnalyst,
  onLaunchAdmin,
}) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-md transition-colors"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 text-left cursor-pointer select-none min-w-0"
        >
          <QueryTrustLogo size={24} />
          <span
            className="font-semibold text-[15px] tracking-tight whitespace-nowrap"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
          >
            QueryTrust AI
          </span>
          <span
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              backgroundColor: 'var(--color-raised)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-status-success-dot)' }}
            />
            <span>Read-only SQL</span>
          </span>
        </button>

        {/* Center: Navigation Anchors */}
        <nav
          className="hidden md:flex items-center gap-1 text-[13px] font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <a
            href="#compiler-lab"
            className="px-3 py-1.5 rounded-[8px] transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)]"
          >
            Safety Check
          </a>
          <a
            href="#platform-showcase"
            className="px-3 py-1.5 rounded-[8px] transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)]"
          >
            Workbench
          </a>
          <a
            href="#three-invariants"
            className="px-3 py-1.5 rounded-[8px] transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)]"
          >
            Safeguards
          </a>
          <a
            href="#attack-matrix"
            className="px-3 py-1.5 rounded-[8px] transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-raised)]"
          >
            Guardrails
          </a>
        </nav>

        {/* Right: Actions & Theme Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:bg-[var(--color-raised)]"
            style={{
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--color-surface)',
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            type="button"
            onClick={onSignIn}
            className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer hover:bg-[var(--color-raised)]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={onLaunchAnalyst}
            className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-3 py-1.5 text-[13px] font-medium cursor-pointer landing-control-secondary"
          >
            <span>Analyst demo</span>
          </button>

          <button
            type="button"
            onClick={onLaunchAdmin}
            className="whitespace-nowrap shrink-0 px-3.5 py-1.5 flex items-center gap-1.5 text-[13px] font-medium cursor-pointer landing-control-primary"
          >
            <span>Open studio</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
