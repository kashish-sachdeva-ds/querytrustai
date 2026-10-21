import React from 'react'

export interface SparklineProps {
  data: number[]
  width?: number | string
  height?: number
  color?: string
  fill?: boolean
  className?: string
  ariaLabel?: string
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = '100%',
  height = 24,
  color = 'var(--qt-accent, #FF4F00)',
  fill = false,
  className = '',
  ariaLabel = 'Metric trend sparkline',
}) => {
  if (!data || data.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--qt-muted, #766F68)',
          fontSize: '0.7rem',
        }}
      >
        —
      </div>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2
  const svgHeight = height
  const svgWidth = 100 // Normalized coordinate space

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (svgWidth - padding * 2)
    const y = svgHeight - padding - ((val - min) / range) * (svgHeight - padding * 2)
    return { x, y }
  })

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`
  }, '')

  const lastPoint = points[points.length - 1]

  const areaD = fill
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`
    : ''

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      preserveAspectRatio="none"
      style={{ width, height, overflow: 'visible', display: 'block' }}
      className={className}
    >
      {fill && (
        <path
          d={areaD}
          fill={color}
          fillOpacity={0.12}
        />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  )
}
