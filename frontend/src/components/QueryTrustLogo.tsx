import React from 'react'

interface QueryTrustLogoProps {
  size?: number | string
  className?: string
  style?: React.CSSProperties
  variant?: 'glyph' | 'badge'
  theme?: 'dark' | 'light' | 'auto'
}

/**
 * QueryTrust AI Official Brand Symbol — The "Q-Shield"
 * 
 * An iconic, high-contrast synthesis representing the core intuition of QueryTrust AI:
 * 1. Letter 'Q': Natural Language Query Intelligence
 * 2. Shield Perimeter: Zero-Trust AST Compiler Security Boundary
 * 3. Stratified Cylinder Discs: Relational PostgreSQL 16 Database
 * 4. Forward Terminal Chevron (`>`): Sub-millisecond Governed SQL Execution
 * 5. Cyan/Sky Precision Node: Mathematical Zero-Risk Integrity
 * 
 * Built with pure vectors (0 filters, 0 repaint latency) for synchronous 0ms paint.
 */
export const QueryTrustLogo: React.FC<QueryTrustLogoProps> = ({
  size = 28,
  className = '',
  style = {},
  variant = 'glyph',
  theme = 'auto',
}) => {
  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 28

  // Theme-aware fill tokens
  // If theme === 'auto', uses CSS classes to follow dark/light mode automatically
  // If explicitly 'dark' or 'light', forces the respective colors
  const isExplicitDark = theme === 'dark'
  const isExplicitLight = theme === 'light'

  const primaryStroke = isExplicitDark
    ? 'rgb(236, 236, 238)'
    : isExplicitLight
    ? 'rgb(22, 23, 26)'
    : undefined

  const primaryFill = isExplicitDark
    ? 'rgb(236, 236, 238)'
    : isExplicitLight
    ? 'rgb(22, 23, 26)'
    : undefined

  const secondaryFill = isExplicitDark
    ? 'rgb(154, 156, 163)'
    : isExplicitLight
    ? 'rgb(84, 87, 94)'
    : undefined

  const accentFill = 'var(--color-accent)'

  const svgContent = (
    <svg
      width={numSize}
      height={numSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`qt-brand-symbol ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      aria-label="QueryTrust AI Logo"
      role="img"
    >
      {/* ─── Layer 1: Outer Architectural Zero-Trust Shield (The Q Ring) ─── */}
      <path
        d="M50 8
           C68 8 84 14 86 26
           C88 48 82 70 56 88
           L50 92
           L44 88
           C18 70 12 48 14 26
           C16 14 32 8 50 8Z"
        stroke={primaryStroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={!isExplicitDark && !isExplicitLight ? 'stroke-zinc-950 dark:stroke-white' : undefined}
      />

      {/* ─── Layer 2: Relational Database Strata (Tier 1 & Tier 2 Cylinder Discs) ─── */}
      {/* Top Database Disc Arc */}
      <path
        d="M30 30 C30 24 40 20 50 20 C60 20 70 24 70 30 C70 36 60 40 50 40 C40 40 30 36 30 30 Z"
        className={!isExplicitDark && !isExplicitLight ? 'fill-zinc-950 dark:fill-white' : undefined}
        fill={primaryFill}
      />

      {/* Middle Database Plate Cut */}
      <path
        d="M30 42 C36 47 43 49 50 49 C57 49 64 47 70 42 C70 47 62 52 50 52 C38 52 30 47 30 42 Z"
        className={!isExplicitDark && !isExplicitLight ? 'fill-zinc-400 dark:fill-zinc-500' : undefined}
        fill={secondaryFill}
      />

      {/* Lower Database Plate Cut */}
      <path
        d="M32 54 C37 59 43 61 50 61 C57 61 63 59 68 54 C67 59 59 64 50 64 C41 64 33 59 32 54 Z"
        className={!isExplicitDark && !isExplicitLight ? 'fill-zinc-400 dark:fill-zinc-500' : undefined}
        fill={secondaryFill}
      />

      {/* ─── Layer 3: Dynamic Query Vector & Terminal Chevron (`>` Q-Tail) ─── */}
      {/* Precision Query Chevron piercing the boundary */}
      <path
        d="M44 48 L58 60 L44 72"
        stroke={accentFill}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dynamic Q-Tail Vector extending down-right */}
      <path
        d="M60 62 L82 84"
        stroke={accentFill}
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* Precision Node */}
      <circle
        cx="82"
        cy="84"
        r="4.5"
        fill={accentFill}
      />
    </svg>
  )

  if (variant === 'badge') {
    return (
      <div
        className="qt-brand-badge-container inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: numSize + 10,
          height: numSize + 10,
          borderRadius: Math.round(numSize * 0.35),
          background: isExplicitDark
            ? 'rgb(20, 21, 24)'
            : isExplicitLight
            ? 'rgb(255, 255, 255)'
            : 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {svgContent}
      </div>
    )
  }

  return svgContent
}
