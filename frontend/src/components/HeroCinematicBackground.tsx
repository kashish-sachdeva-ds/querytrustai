import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useReducedMotion } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════════════════
   HeroCinematicBackground — Interactive perspective spatial grid with:
   • Cursor-following radial spotlight glow
   • Subtle film grain noise texture
   • Ambient volumetric light beams
   ═══════════════════════════════════════════════════════════════════════════ */

export const HeroCinematicBackground: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 30 })

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (prefersReducedMotion) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePos({ x, y })
  }, [prefersReducedMotion])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => el.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {/* ── Interactive Perspective Spatial Grid ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(56,189,248,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)',
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      />

      {/* ── Cursor-Following Radial Spotlight ── */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(56,189,248,0.07), transparent 50%)`,
          opacity: prefersReducedMotion ? 0 : 1,
        }}
      />

      {/* ── Ambient Volumetric Light Beams ── */}
      {/* Electric Cobalt beam */}
      <div
        className="absolute -top-40 left-1/4 w-[500px] h-[600px] opacity-[0.06] dark:opacity-[0.09] blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, #0066FF, transparent 70%)',
        }}
      />
      {/* Cyber Cyan beam */}
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.07] dark:opacity-[0.1] blur-[130px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, #00E5FF, transparent 70%)',
        }}
      />
      {/* Emerald Safe glow */}
      <div
        className="absolute top-1/3 right-1/4 w-[300px] h-[300px] opacity-[0.04] dark:opacity-[0.06] blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, #10B981, transparent 70%)',
        }}
      />

      {/* ── Subtle Film Grain Noise Texture ── */}
      <div
        className="absolute inset-0 mix-blend-overlay dark:mix-blend-soft-light"
        style={{
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* ── Secondary depth aura ── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[320px] w-[640px] rounded-full bg-sky-200/[0.04] dark:bg-sky-400/[0.05] blur-[100px] pointer-events-none" />
    </div>
  )
}

