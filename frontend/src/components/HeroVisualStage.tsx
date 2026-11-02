import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Lock,
  Radio,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   HeroVisualStage — 4-Layer Visual Centerpiece (Mandatory Right Column Stage)
   Layer 1: /hero-ast-vault.png 3D backdrop + ambient neon gradient
   Layer 2: Animated custom SVG 6-Gate AST Prism & PostgreSQL Vault + Crimson Laser
   Layer 3: Tilted 3D perspective QueryTrust Studio window (bottom-right overlap)
   Layer 4: Floating Parallax HUD Cards (Top-Right Global Map & Bottom-Left Lockout)
   ═══════════════════════════════════════════════════════════════════════════ */

export const HeroVisualStage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const [laserActive, setLaserActive] = useState(false)
  const [blockedBadge, setBlockedBadge] = useState(false)
  const [imgError, setImgError] = useState(false)

  // Crimson laser firing cycle every 3.5 seconds
  useEffect(() => {
    if (prefersReducedMotion) return

    const interval = setInterval(() => {
      setLaserActive(true)
      setTimeout(() => {
        setBlockedBadge(true)
      }, 300)

      setTimeout(() => {
        setLaserActive(false)
      }, 1200)

      setTimeout(() => {
        setBlockedBadge(false)
      }, 2600)
    }, 3800)

    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  return (
    <div className="relative w-full max-w-[680px] lg:max-w-none mx-auto select-none">
      
      {/* ── Ambient Volumetric Backlight Glow ── */}
      <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-sky-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-96 h-96 rounded-full bg-blue-600/20 blur-[130px] pointer-events-none" />

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN STAGE CONTAINER (Layer 1 + Layer 2)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative w-full h-[440px] sm:h-[480px] rounded-3xl overflow-hidden border border-sky-500/30 bg-gradient-to-b from-slate-900/95 via-[#050B14] to-black shadow-[0_0_80px_-15px_rgba(0,102,255,0.45)]">
        
        {/* Subtle Specular Top Rim Border Highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent pointer-events-none z-20" />

        {/* ── LAYER 1: Hero Artwork Image / 3D Canvas Backdrop ── */}
        {!imgError ? (
          <img
            src="/hero-ast-vault.png"
            alt="QueryTrust 6-Gate AST Security Vault"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none z-0 transition-opacity duration-700"
          />
        ) : null}

        {/* Ambient Dark Gradient Layer to blend artwork borders seamlessly with UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none z-[1]" />

        {/* Top Architectural Status Bar inside Stage */}
        <div className="absolute top-4 inset-x-5 z-20 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/30 text-sky-300 backdrop-blur-md">
            <Radio size={11} className="text-sky-400 animate-pulse" />
            <span className="font-bold tracking-wider">6-GATE AST SECURITY PRISM &amp; VAULT</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 backdrop-blur-md font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>PostgreSQL 16 · qt_ai_readonly</span>
          </div>
        </div>

        {/* ── LAYER 2: Bespoke Animated Isometric 3D SVG Overlay ── */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 800 500" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="ast-cyan-beam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
              </linearGradient>

              <linearGradient id="ast-laser-red" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF0055" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
              </linearGradient>

              <filter id="ast-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="ast-glow-red" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {!imgError ? (
              /* ── PRIMARY MODE: Augmented Holographic HUD Overlay over 3D Render ── */
              <g>
                {/* Diagonal Holographic Sweep along the perspective axis of the 6 rings */}
                <path
                  d="M 140 140 L 590 370"
                  stroke="url(#ast-cyan-beam)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="url(#ast-glow-cyan)"
                  opacity="0.65"
                  strokeDasharray="6 4"
                />

                {/* Natural Language Origin Node */}
                <g transform="translate(115, 125)">
                  <circle r="10" fill="#0369A1" opacity="0.6" />
                  <circle r="5" fill="#38BDF8" filter="url(#ast-glow-cyan)" />
                  <text x="-4" y="-12" textAnchor="middle" fill="#7DD3FC" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    NL QUERY
                  </text>
                </g>

                {/* 6 Tactical HUD Callouts aligned with the 3D Prism Gates */}
                {[
                  { x: 175, y: 155, name: 'G1', label: 'exp.Select' },
                  { x: 245, y: 195, name: 'G2', label: 'Whitelist' },
                  { x: 315, y: 235, name: 'G3', label: 'DML Lock' },
                  { x: 385, y: 275, name: 'G4', label: 'Where Clamped' },
                  { x: 455, y: 315, name: 'G5', label: 'Join Guard' },
                  { x: 525, y: 355, name: 'G6', label: 'LIMIT 100' },
                ].map((gate) => (
                  <g key={gate.name} transform={`translate(${gate.x}, ${gate.y})`}>
                    {/* Reticle Dot */}
                    <circle r="3" fill="#38BDF8" opacity="0.9" filter="url(#ast-glow-cyan)" />
                    <circle r="7" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.5" strokeDasharray="2 2" />
                    {/* Annotation Line */}
                    <line x1="0" y1="-8" x2="0" y2="-22" stroke="#38BDF8" strokeWidth="1" opacity="0.7" />
                    <line x1="0" y1="-22" x2="16" y2="-22" stroke="#38BDF8" strokeWidth="1" opacity="0.7" />
                    {/* Text Label */}
                    <text x="20" y="-19" fill="#E0F2FE" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                      {gate.name}: {gate.label}
                    </text>
                  </g>
                ))}

                {/* Tactical Target Reticle framing the 3D Database Vault Cube */}
                <g transform="translate(620, 360)">
                  {/* Outer Reticle Brackets */}
                  <path d="M -45 -35 L -35 -45 L -15 -45" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.9" />
                  <path d="M 45 -35 L 35 -45 L 15 -45" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.9" />
                  <path d="M -45 35 L -35 45 L -15 45" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.9" />
                  <path d="M 45 35 L 35 45 L 15 45" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.9" />
                  {/* Vault Badge */}
                  <rect x="-60" y="52" width="120" height="20" rx="10" fill="#064E3B" opacity="0.85" stroke="#10B981" strokeWidth="1" />
                  <text x="0" y="65" textAnchor="middle" fill="#A7F3D0" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                    POSTGRESQL 16 · qt_ai_readonly
                  </text>
                </g>

                {/* Threat Laser & Deflection at Gate 1 */}
                {laserActive && (
                  <g>
                    {/* Red Threat Lasers targeting Gate 1 */}
                    <path
                      d="M 60 40 L 175 155"
                      stroke="url(#ast-laser-red)"
                      strokeWidth="3.5"
                      filter="url(#ast-glow-red)"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 60 40 L 175 155"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 30 180 L 175 155"
                      stroke="url(#ast-laser-red)"
                      strokeWidth="2.5"
                      filter="url(#ast-glow-red)"
                      strokeLinecap="round"
                    />

                    {/* Deflection Burst at Gate 1 */}
                    <g transform="translate(175, 155)">
                      <circle r="26" fill="#EF4444" opacity="0.35" filter="url(#ast-glow-red)" />
                      <circle r="14" fill="#F87171" opacity="0.8" />
                      <circle r="5" fill="#FFFFFF" />
                      {/* Radiating deflection sparks */}
                      <line x1="0" y1="0" x2="-28" y2="-25" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                      <line x1="0" y1="0" x2="-32" y2="18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                      <line x1="0" y1="0" x2="-18" y2="32" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="0" y1="0" x2="28" y2="-28" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                      <line x1="0" y1="0" x2="30" y2="24" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                  </g>
                )}
              </g>
            ) : (
              /* ── FALLBACK MODE: Standalone SVG Illustration (When PNG unavailable) ── */
              <g>
                <path
                  d="M 120 250 L 680 250"
                  stroke="url(#ast-cyan-beam)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  filter="url(#ast-glow-cyan)"
                  opacity="0.85"
                />
                <path
                  d="M 120 250 L 680 250"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                <g transform="translate(100, 250)">
                  <circle r="14" fill="#0369A1" opacity="0.6" />
                  <circle r="8" fill="#38BDF8" filter="url(#ast-glow-cyan)" />
                  <text x="0" y="-22" textAnchor="middle" fill="#7DD3FC" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    NL QUERY
                  </text>
                </g>

                {[
                  { x: 190, name: 'Gate 1', token: 'exp.Select' },
                  { x: 270, name: 'Gate 2', token: 'Catalog Whitelist' },
                  { x: 350, name: 'Gate 3', token: 'DML Lockout' },
                  { x: 430, name: 'Gate 4', token: 'Where Bound' },
                  { x: 510, name: 'Gate 5', token: 'Join Guard' },
                  { x: 590, name: 'Gate 6', token: 'LIMIT 100' },
                ].map((ring, idx) => (
                  <g key={ring.name} transform={`translate(${ring.x}, 250)`}>
                    <ellipse
                      rx="18"
                      ry="65"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      opacity={laserActive && idx === 0 ? 0.3 : 0.75}
                      filter="url(#ast-glow-cyan)"
                      transform="rotate(-15)"
                    />
                    <ellipse
                      rx="14"
                      ry="58"
                      fill="none"
                      stroke="#E0F2FE"
                      strokeWidth="1"
                      opacity="0.9"
                      strokeDasharray="4 2"
                      transform="rotate(-15)"
                    />
                    <text x="0" y="85" textAnchor="middle" fill="#38BDF8" fontSize="9.5" fontFamily="monospace" opacity="0.85">
                      {ring.name}
                    </text>
                    <text x="0" y="98" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                      {ring.token}
                    </text>
                  </g>
                ))}

                <g transform="translate(680, 250)">
                  <ellipse cx="0" cy="-35" rx="26" ry="12" fill="#10B981" opacity="0.6" filter="url(#ast-glow-cyan)" />
                  <rect x="-26" y="-35" width="52" height="70" fill="#064E3B" opacity="0.75" />
                  <ellipse cx="0" cy="35" rx="26" ry="12" fill="#047857" opacity="0.9" />
                  <ellipse cx="0" cy="-35" rx="22" ry="10" fill="#34D399" opacity="0.9" />
                  <line x1="-26" y1="-5" x2="26" y2="-5" stroke="#34D399" strokeWidth="1.5" opacity="0.8" />
                  <line x1="-26" y1="15" x2="26" y2="15" stroke="#34D399" strokeWidth="1.5" opacity="0.8" />
                  <text x="0" y="58" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    POSTGRESQL 16
                  </text>
                  <text x="0" y="70" textAnchor="middle" fill="#6EE7B7" fontSize="8.5" fontFamily="monospace">
                    qt_ai_readonly
                  </text>
                </g>

                {laserActive && (
                  <g>
                    <path d="M 60 140 L 190 240" stroke="url(#ast-laser-red)" strokeWidth="3.5" filter="url(#ast-glow-red)" strokeLinecap="round" />
                    <path d="M 60 140 L 190 240" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                    <g transform="translate(190, 245)">
                      <circle r="22" fill="#EF4444" opacity="0.4" filter="url(#ast-glow-red)" />
                      <circle r="12" fill="#F87171" opacity="0.8" />
                      <circle r="4" fill="#FFFFFF" />
                    </g>
                  </g>
                )}
              </g>
            )}
          </svg>
        </div>

        {/* Live Attack Interception Deflection Badge (HUD Overlay) */}
        <AnimatePresence>
          {blockedBadge && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="absolute top-14 left-1/2 -translate-x-1/2 z-30"
            >
              <div className="px-4 py-2 rounded-full bg-rose-950/90 border border-rose-500/70 text-rose-300 font-mono text-[11px] font-bold shadow-[0_0_30px_rgba(244,63,94,0.5)] backdrop-blur-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>⚡ BLOCKED AT GATE #1 · 0.18ms · 0 BYTES MUTATED</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LAYER 3: FLOATING 3D PERSPECTIVE PRODUCT UI WINDOW (Bottom-Right Overlap)
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute -bottom-5 sm:-bottom-6 -right-2 sm:-right-4 w-[92%] sm:w-[440px] z-20 transition-all duration-500 hover:rotate-0 hover:scale-105"
        style={{
          transform: prefersReducedMotion
            ? 'none'
            : 'perspective(1200px) rotateX(8deg) rotateY(-12deg) rotateZ(2deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="rounded-2xl bg-zinc-950/95 border border-sky-400/30 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(56,189,248,0.2)] backdrop-blur-xl font-mono text-xs text-left">
          {/* Dark macOS Window Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/90 pb-2.5 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-[10px] text-zinc-400 font-mono">
                qt_ai_readonly — PostgreSQL 16
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9.5px] font-bold">
              ✓ 6/6 GATES VERIFIED (1.42ms)
            </span>
          </div>

          {/* Compiled SQL Query Code Preview */}
          <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-sky-200 text-[11px] leading-relaxed overflow-hidden">
            <span className="text-zinc-500 block text-[9.5px] uppercase mb-0.5">// Verified Read-Only Dialect</span>
            <code className="text-sky-300 font-bold">SELECT</code> device_name, site, warranty_expiry<br />
            <code className="text-sky-300 font-bold">FROM</code> devices <code className="text-emerald-400 font-bold">LIMIT 100;</code>
          </div>

          {/* Mini Telemetry Row with Bounded Clamps */}
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Rows Clamped: 100</span>
            </span>
            <span className="text-zinc-500">Timeout: 5,000ms</span>
            <span className="text-sky-400 font-bold">P95: 1.42ms</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LAYER 4: TWO FLOATING PARALLAX HUD CARDS
          ══════════════════════════════════════════════════════════════════════ */}

      {/* Floating Card 1 (Top-Right): Global Fleet Telemetry Mini-Map */}
      <motion.div
        animate={prefersReducedMotion ? {} : { y: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-6 -right-2 sm:-right-4 z-30 w-52 sm:w-60 p-3 rounded-2xl bg-zinc-950/90 border border-sky-400/40 shadow-xl backdrop-blur-xl text-left font-mono text-xs hidden sm:block"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
            <Radio size={11} className="animate-pulse" />
            <span>GLOBAL TOPOLOGY</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-bold">
            50 SITES
          </span>
        </div>
        <div className="text-sm font-bold text-white">5,000 Active Devices</div>
        {/* Stylized SVG Map Silhouette with Pulsing Beacons */}
        <div className="h-10 w-full mt-1.5 pt-1">
          <svg viewBox="0 0 180 40" className="w-full h-full">
            <path
              d="M10,25 Q30,10 60,20 T110,15 T160,25"
              fill="none"
              stroke="#38BDF833"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            {/* AMER beacon */}
            <circle cx="35" cy="20" r="4" fill="#38BDF8" />
            <circle cx="35" cy="20" r="8" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />
            <text x="35" y="36" textAnchor="middle" fill="#94A3B8" fontSize="7">AMER 2,150</text>
            {/* EMEA beacon */}
            <circle cx="95" cy="18" r="4" fill="#10B981" />
            <text x="95" y="36" textAnchor="middle" fill="#94A3B8" fontSize="7">EMEA 1,650</text>
            {/* APAC beacon */}
            <circle cx="150" cy="22" r="4" fill="#818CF8" />
            <text x="150" y="36" textAnchor="middle" fill="#94A3B8" fontSize="7">APAC 1,200</text>
          </svg>
        </div>
      </motion.div>

      {/* Floating Card 2 (Bottom-Left): Physical Kernel Lockout Badge */}
      <motion.div
        animate={prefersReducedMotion ? {} : { y: [3, -3, 3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-4 sm:-bottom-5 -left-2 sm:-left-6 z-30 p-3 sm:p-3.5 rounded-2xl bg-zinc-950/95 border border-emerald-500/40 shadow-xl backdrop-blur-xl text-left font-mono text-xs"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Lock size={13} />
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              KERNEL LOCKOUT
            </div>
            <div className="text-xs font-bold text-white">
              0 Bytes Mutated Guaranteed
            </div>
          </div>
        </div>
        <div className="text-[10px] text-zinc-400 pl-8">
          WRITE / DDL / DML: <strong className="text-rose-400">REVOKED</strong>
        </div>
      </motion.div>

    </div>
  )
}
