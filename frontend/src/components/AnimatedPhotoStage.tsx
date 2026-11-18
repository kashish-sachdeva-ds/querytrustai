import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Lock, Radio, ShieldCheck, Database, Terminal, Activity } from 'lucide-react'

interface AnimatedPhotoStageProps {
  imageSrc?: string
  alt?: string
  aspectRatio?: string
  className?: string
  showHeroAstOverlay?: boolean
  showBladeLeds?: boolean
  titleBadge?: string
  subtitleBadge?: string
  children?: React.ReactNode
}

export const AnimatedPhotoStage: React.FC<AnimatedPhotoStageProps> = ({
  imageSrc = '/endcap-hero-showcase.png',
  alt = 'QueryTrust Hardware & Studio Showcase',
  className = '',
  showHeroAstOverlay = false,
  showBladeLeds = false,
  titleBadge = '6-GATE AST SECURITY PRISM & VAULT',
  subtitleBadge = 'PostgreSQL 16 · qt_ai_readonly',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const [imgError, setImgError] = useState(false)
  const [laserActive, setLaserActive] = useState(false)
  const [blockedBadge, setBlockedBadge] = useState(false)

  // 3D Mouse Parallax State
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || prefersReducedMotion) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -6 // max 6 deg
    const rotateY = ((x - centerX) / centerX) * 6  // max 6 deg
    setTilt({ x: rotateX, y: rotateY })
  }, [prefersReducedMotion])

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 })
    setIsHovered(false)
  }, [])

  // Crimson laser firing cycle if AST overlay is active
  useEffect(() => {
    if (!showHeroAstOverlay || prefersReducedMotion) return
    const interval = setInterval(() => {
      setLaserActive(true)
      setTimeout(() => setBlockedBadge(true), 280)
      setTimeout(() => setLaserActive(false), 1100)
      setTimeout(() => setBlockedBadge(false), 2600)
    }, 4000)
    return () => clearInterval(interval)
  }, [showHeroAstOverlay, prefersReducedMotion])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full rounded-3xl overflow-hidden border border-white/20 dark:border-white/10 bg-[#0B0C0E] select-none perspective-[1200px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] ${className}`}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* ── Outer Specular Hairline Rim Highlight ── */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-30" />

      {/* ── Living Cinemagraph Stage with Ken-Burns Drift & Caustics ── */}
      <div
        className="relative w-full h-full overflow-hidden transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Layer 1: High-Resolution Photo-Render */}
        {!imgError ? (
          <img
            src={imageSrc}
            alt={alt}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover object-center pointer-events-none transition-all duration-1000 ${
              prefersReducedMotion ? '' : 'animate-[kenburns_14s_ease-in-out_infinite_alternate]'
            }`}
          />
        ) : (
          /* Multi-layered CSS/SVG Studio Hardware Fallback */
          <div className="w-full h-full min-h-[440px] bg-gradient-to-br from-[#14161A] via-[#0B0C0E] to-[#040608] flex items-center justify-center relative p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,85,255,0.18)_0%,transparent_70%)]" />
            <div className="relative z-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/20">
                <Database size={32} />
              </div>
              <div className="font-mono text-sm font-bold text-white tracking-wider">
                QUERYTRUST PHYSICAL KERNEL
              </div>
              <div className="font-mono text-xs text-zinc-400">
                PostgreSQL 16 · qt_ai_readonly
              </div>
            </div>
          </div>
        )}

        {/* Layer 2: Moving Diagonal Caustic Window-Sunlight Shadow Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay opacity-15 transition-opacity"
          style={{
            background: 'linear-gradient(125deg, rgba(255,255,255,0.2) 0%, transparent 40%, rgba(255,255,255,0.1) 70%, transparent 100%)',
          }}
        />

        {/* Layer 3: Subtle Precision Scanline Texture */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-5 overflow-hidden"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.3) 3px, rgba(0,0,0,0.3) 6px)',
          }}
        />

        {/* Architectural Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 pointer-events-none z-10" />

        {/* ── Top Architectural Status Bar ── */}
        <div className="absolute top-4 inset-x-5 z-20 flex items-center justify-between text-[10.5px] font-mono pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-zinc-200 backdrop-blur-md shadow-xs">
            <Radio size={11} className="text-sky-400 animate-pulse" />
            <span className="font-bold tracking-wider">{titleBadge}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 backdrop-blur-md shadow-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{subtitleBadge}</span>
          </div>
        </div>

        {/* ── Blinking Blade Port LEDs Overlay (When showBladeLeds === true) ── */}
        {showBladeLeds && (
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 shadow-xl font-mono text-[10px]">
            <div className="text-zinc-400 font-semibold mr-1">PORT ACTIVITY:</div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((port) => (
                <div key={port} className="flex flex-col items-center gap-0.5">
                  <span
                    className={`w-2 h-2 rounded-xs shadow-xs ${
                      port === 5
                        ? 'bg-amber-400 animate-ping'
                        : port % 2 === 0
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                    style={{ animationDuration: `${0.8 + (port % 3) * 0.4}s` }}
                  />
                  <span className="text-[7.5px] text-zinc-500">{port + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 6 Glowing Isometric Glass AST Rings (When showHeroAstOverlay === true) ── */}
        {showHeroAstOverlay && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 800 500" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="laser-cyan-pulse" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#E4E4E7" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.85" />
                </linearGradient>
                <filter id="laser-glow">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Central Beam Line */}
              <line
                x1="80"
                y1="250"
                x2="720"
                y2="250"
                stroke="url(#laser-cyan-pulse)"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.45"
              />

              {/* 6 Inset Isometric Glass Rings */}
              {[
                { name: 'G1: exp.Select', x: 140, y: 250, rX: 24, rY: 48 },
                { name: 'G2: Whitelist', x: 240, y: 250, rX: 24, rY: 48 },
                { name: 'G3: DML Lockout', x: 340, y: 250, rX: 24, rY: 48 },
                { name: 'G4: Where Clamped', x: 440, y: 250, rX: 24, rY: 48 },
                { name: 'G5: Join Guard', x: 540, y: 250, rX: 24, rY: 48 },
                { name: 'G6: LIMIT 100', x: 640, y: 250, rX: 24, rY: 48 },
              ].map((gate, i) => (
                <g key={i} transform={`translate(${gate.x}, ${gate.y})`}>
                  <ellipse
                    cx="0"
                    cy="0"
                    rx={gate.rX}
                    ry={gate.rY}
                    fill="rgba(0, 85, 255, 0.08)"
                    stroke={i === 0 && laserActive ? '#EF4444' : '#38BDF8'}
                    strokeWidth={i === 0 && laserActive ? '2.5' : '1.5'}
                    opacity={i === 0 && laserActive ? 1 : 0.75}
                    filter="url(#laser-glow)"
                  />
                  <ellipse
                    cx="0"
                    cy="0"
                    rx={gate.rX * 0.7}
                    ry={gate.rY * 0.7}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <text
                    x="0"
                    y={gate.rY + 16}
                    textAnchor="middle"
                    fill="#F4F2EC"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    letterSpacing="0.04em"
                  >
                    {gate.name}
                  </text>
                </g>
              ))}

              {/* Periodic Crimson Deflection Threat Laser */}
              {laserActive && (
                <g>
                  <line
                    x1="20"
                    y1="250"
                    x2="140"
                    y2="250"
                    stroke="#EF4444"
                    strokeWidth="4"
                    filter="url(#laser-glow)"
                  />
                  <circle cx="140" cy="250" r="10" fill="#EF4444" filter="url(#laser-glow)">
                    <animate attributeName="r" values="8;16;8" dur="0.4s" repeatCount="indefinite" />
                  </circle>
                  <text x="75" y="235" fill="#F87171" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    DROP TABLE devices CASCADE;
                  </text>
                </g>
              )}
            </svg>
          </div>
        )}

        {/* ── Inset Floating Glassmorphic React UI Cards (Layer 4) ── */}
        {showHeroAstOverlay && (
          <>
            {/* Top-Left Inset: Deflection Badge */}
            <div className="absolute top-14 left-5 z-20">
              <AnimatePresence>
                {blockedBadge ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -6 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 backdrop-blur-xl shadow-xl font-mono text-[11px] font-bold"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>⚡ BLOCKED AT GATE #1 · 0.18ms</span>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-zinc-300 backdrop-blur-xl shadow-lg font-mono text-[10.5px]">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    <span>ZERO MUTATIONS IN 151/151 RUNS</span>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Top-Right Inset: Global Topology */}
            <div className="absolute top-14 right-5 z-20">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-zinc-300 backdrop-blur-xl shadow-lg font-mono text-[10.5px]">
                <Activity size={12} className="text-sky-400" />
                <span>GLOBAL TOPOLOGY · 5,000 NODES</span>
              </div>
            </div>

            {/* Bottom-Left Inset: Kernel Lockout */}
            <div className="absolute bottom-5 left-5 z-20">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/75 border border-emerald-500/30 text-emerald-300 backdrop-blur-xl shadow-xl font-mono text-[11px] font-semibold">
                <Lock size={12} className="text-emerald-400" />
                <span>KERNEL LOCKOUT: SELECT-ONLY</span>
              </div>
            </div>

            {/* Bottom-Right Inset: qt_ai_readonly Live Terminal */}
            <div className="absolute bottom-5 right-5 z-20">
              <div className="px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-zinc-300 backdrop-blur-xl shadow-xl font-mono text-[10.5px] max-w-[260px] truncate">
                <div className="flex items-center gap-1.5 text-zinc-400 text-[9.5px] mb-0.5">
                  <Terminal size={10} className="text-sky-400" />
                  <span>qt_ai_readonly terminal</span>
                </div>
                <span className="text-sky-300">SELECT * FROM devices LIMIT 10;</span>
              </div>
            </div>
          </>
        )}

        {/* ── Bottom Status Readout (Clean Minimalist Enclave Bar) ── */}
        {!showHeroAstOverlay && (
          <div className="absolute bottom-4 inset-x-5 z-20 flex items-center justify-between text-[10.5px] font-mono pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-zinc-300 backdrop-blur-md shadow-xs">
              <Lock size={11} className="text-emerald-400" />
              <span>HARDWARE ENCLAVE · ZERO WRITES PERMITTED</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-zinc-300 backdrop-blur-md shadow-xs">
              <ShieldCheck size={11} className="text-sky-400" />
              <span>151/151 ZERO-MUTATION VERIFIED</span>
            </div>
          </div>
        )}

        {/* Custom Children Injected Inside Stage */}
        {children}
      </div>
    </div>
  )
}
