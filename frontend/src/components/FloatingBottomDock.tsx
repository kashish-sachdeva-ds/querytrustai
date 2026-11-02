import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { QueryTrustLogo } from './QueryTrustLogo'

export const FloatingBottomDock: React.FC = () => {
  const { enterDemoMode } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 280)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <aside
      aria-label="Quick Navigation Dock"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-400 ease-out ${
        scrolled
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-full bg-zinc-950/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/90 shadow-[0_12px_40px_rgba(0,0,0,0.35)] text-white text-xs font-medium">
        
        {/* Brand Monogram Pill */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-[11px] font-mono font-bold tracking-wider cursor-pointer"
          title="Scroll to top"
        >
          <QueryTrustLogo size={14} theme="dark" />
          <span>QT</span>
        </button>

        <span className="text-zinc-700 hidden sm:inline">&bull;</span>

        {/* Section Quick Anchors */}
        <div className="hidden md:flex items-center gap-1 text-[11.5px] text-zinc-300">
          <button
            type="button"
            onClick={() => scrollTo('compiler-lab')}
            className="px-2.5 py-1 rounded-full hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Cpu size={12} className="text-sky-400" />
            <span>Lab</span>
          </button>

          <button
            type="button"
            onClick={() => scrollTo('platform-showcase')}
            className="px-2.5 py-1 rounded-full hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Activity size={12} className="text-sky-400" />
            <span>Capabilities</span>
          </button>

          <button
            type="button"
            onClick={() => scrollTo('three-invariants')}
            className="px-2.5 py-1 rounded-full hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Layers size={12} className="text-sky-400" />
            <span>Architecture</span>
          </button>

          <button
            type="button"
            onClick={() => scrollTo('attack-matrix')}
            className="px-2.5 py-1 rounded-full hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ShieldCheck size={12} className="text-rose-400" />
            <span>Defense</span>
          </button>
        </div>

        <span className="text-zinc-700 hidden sm:inline">&bull;</span>

        {/* 1-Click Launch Studio Pill */}
        <button
          type="button"
          onClick={() => enterDemoMode('admin')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs transition-all shadow-xs cursor-pointer ml-1 active:scale-[0.98]"
        >
          <Sparkles size={12} className="text-sky-600" />
          <span>Launch Studio</span>
          <ArrowUpRight size={13} />
        </button>

      </div>
    </aside>
  )
}
