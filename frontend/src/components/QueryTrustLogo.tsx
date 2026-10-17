import React from 'react'

interface QueryTrustLogoProps {
  size?: number | string
  className?: string
  style?: React.CSSProperties
  variant?: 'glyph' | 'badge'
}

/**
 * QueryTrust AI Official Brand Symbol
 * Represents:
 * 1. Shield (Trust & AST Zero-Mutation Boundary)
 * 2. Faceted Quantum Prism / Nodes (Hardware Telemetry & Infrastructure)
 * 3. Dynamic Query Vector (The "Q" anchor loop and telemetry pulse)
 */
export const QueryTrustLogo: React.FC<QueryTrustLogoProps> = ({
  size = 32,
  className = '',
  style = {},
  variant = 'glyph',
}) => {
  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 32

  const svgContent = (
    <svg
      width={numSize}
      height={numSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`qt-brand-symbol ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="QueryTrust AI Logo"
      role="img"
    >
      <defs>
        {/* Primary vibrant orange to warm amber gradient */}
        <linearGradient id="qt-shield-grad-left" x1="15" y1="15" x2="55" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="60%" stopColor="#FF5A14" />
          <stop offset="100%" stopColor="#DF3800" />
        </linearGradient>

        {/* Deep vermillion to crimson contrast facet */}
        <linearGradient id="qt-shield-grad-right" x1="85" y1="15" x2="45" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF5A14" />
          <stop offset="50%" stopColor="#E04400" />
          <stop offset="100%" stopColor="#B32B00" />
        </linearGradient>

        {/* Dynamic Query Vector (The 'Q' leg) */}
        <linearGradient id="qt-query-tail" x1="50" y1="50" x2="92" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA23A" />
          <stop offset="100%" stopColor="#FF5A14" />
        </linearGradient>

        {/* Core telemetry spark glow */}
        <linearGradient id="qt-core-glow" x1="50" y1="30" x2="50" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFE0B2" />
        </linearGradient>

        {/* Drop shadow for depth */}
        <filter id="qt-glow-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FF5A14" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* ─── Facet 1: Left Armor Wing ─── */}
      <path
        d="M50 8 L14 26 C14 56 30 78 50 92 C50 78 50 62 50 50 L26 36 L50 24 Z"
        fill="url(#qt-shield-grad-left)"
        filter="url(#qt-glow-shadow)"
      />

      {/* ─── Facet 2: Right Protective Wing ─── */}
      <path
        d="M50 8 L86 26 C86 56 70 78 50 92 C50 78 50 62 50 50 L74 36 L50 24 Z"
        fill="url(#qt-shield-grad-right)"
      />

      {/* ─── Facet 3: Central Nexus Prism (Hardware Security Core) ─── */}
      <path
        d="M50 24 L74 36 L50 48 L26 36 Z"
        fill="url(#qt-core-glow)"
        fillOpacity="0.95"
      />

      {/* ─── Facet 4: Telemetry Node Hexagon ─── */}
      <path
        d="M50 48 L70 58 L50 68 L30 58 Z"
        fill="#FF7A00"
        fillOpacity="0.85"
      />

      {/* ─── Facet 5: Dynamic Query Vector (The 'Q' Tail & Interlocking Spark) ─── */}
      <path
        d="M52 56 L86 86 C89 89 94 87 93 83 L84 62 L66 52 Z"
        fill="url(#qt-query-tail)"
      />

      {/* Inner safe nexus node (white laser spark) */}
      <circle cx="50" cy="48" r="4.5" fill="#FFFFFF" />
      <circle cx="86" cy="86" r="3" fill="#FFE0B2" />
    </svg>
  )

  if (variant === 'badge') {
    return (
      <div
        className="qt-brand-badge-container"
        style={{
          width: numSize + 8,
          height: numSize + 8,
          borderRadius: Math.round(numSize * 0.28),
          background: 'linear-gradient(145deg, #1e1b18 0%, #11100e 100%)',
          border: '1px solid rgba(255, 90, 20, 0.35)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {svgContent}
      </div>
    )
  }

  return svgContent
}
