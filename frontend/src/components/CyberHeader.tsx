import React from 'react'
import {
  Sun,
  Moon,
  ArrowUpRight,
} from 'lucide-react'
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
    <div className="sticky top-0 z-50 w-full transition-colors">
      {/* Razor-thin Top Architectural Status Strip */}
      <div className="w-full bg-zinc-950 text-zinc-300 border-b border-white/[0.08] text-[9.5px] font-mono py-1 px-4 tracking-wider flex items-center justify-between overflow-x-auto whitespace-nowrap select-none">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LATENCY: 1.42ms P95 // KERNEL: POSTGRESQL 16 (qt_ai_readonly) // FLEET: 5,000 NODES ACROSS 50 GLOBAL SITES</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-zinc-400">
            <span>SPEC: ZERO-TRUST SQLGLOT COMPILER</span>
            <span className="text-zinc-600">//</span>
            <span className="text-emerald-400 font-bold">151/151 TEST SUITE PASSED</span>
          </div>
        </div>
      </div>

      <header className="w-full px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-5 rounded-full bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        
        {/* Left: Brand Identity with Iconic Q-Shield Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 text-left cursor-pointer group select-none"
          >
            <QueryTrustLogo size={26} />
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-sm tracking-tight text-zinc-950 dark:text-white">
                Query<span className="text-sky-500">Trust</span>
              </span>
              <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-[10.5px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Read-Only Kernel</span>
              </span>
            </div>
          </button>
        </div>

        {/* Center: Clean Minimalist Navigation Links with Smooth Pill Hovers */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <a
            href="#compiler-lab"
            className="px-3.5 py-1.5 rounded-full hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
          >
            Compiler Lab
          </a>
          <a
            href="#platform-showcase"
            className="px-3.5 py-1.5 rounded-full hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
          >
            Capabilities
          </a>
          <a
            href="#three-invariants"
            className="px-3.5 py-1.5 rounded-full hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
          >
            Architecture
          </a>
          <a
            href="#attack-matrix"
            className="px-3.5 py-1.5 rounded-full hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
          >
            Threat Matrix
          </a>
          <a
            href="#metrics"
            className="px-3.5 py-1.5 rounded-full hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
          >
            Benchmarks
          </a>
        </nav>

        {/* Right: Actions, Theme Toggle & Evaluator Pills */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white bg-zinc-100/80 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 transition-all cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Direct Sign In */}
          <button
            type="button"
            onClick={onSignIn}
            className="whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
          >
            Sign In
          </button>

          {/* Quick Evaluator: Launch Analyst */}
          <button
            type="button"
            onClick={onLaunchAnalyst}
            className="hidden sm:inline-flex items-center gap-1.5 leading-none whitespace-nowrap shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white hover:bg-zinc-50 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="font-mono text-sky-500 text-xs font-bold flex items-center">&gt;_</span>
            <span>Analyst Sandbox</span>
          </button>

          {/* Primary High-End CTA: Admin Studio */}
          <button
            type="button"
            onClick={onLaunchAdmin}
            className="whitespace-nowrap shrink-0 px-4 py-2 flex items-center gap-1.5 rounded-full text-xs font-semibold text-white bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-xs hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Launch Studio</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

      </div>
    </header>
  </div>
  )
}
