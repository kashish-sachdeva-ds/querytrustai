import React, { useState } from 'react'

export interface TelemetryPoint {
  timestamp: string
  cpu_utilization_pct: number
  memory_utilization_pct: number
  temperature_celsius: number
  packet_loss_pct: number
  latency_ms: number
}

interface MetricConfig {
  key: keyof Omit<TelemetryPoint, 'timestamp'>
  label: string
  unit: string
  color: string
}

const METRICS: MetricConfig[] = [
  { key: 'cpu_utilization_pct', label: 'CPU Utilization', unit: '%', color: 'var(--color-accent-link)' },
  { key: 'memory_utilization_pct', label: 'Memory', unit: '%', color: 'var(--color-status-warning-dot)' },
  { key: 'temperature_celsius', label: 'Temperature', unit: '°C', color: 'var(--color-status-error-dot)' },
  { key: 'packet_loss_pct', label: 'Packet Loss', unit: '%', color: 'var(--color-status-success-dot)' },
  { key: 'latency_ms', label: 'Latency', unit: 'ms', color: 'var(--color-text-secondary)' },
]

export interface TelemetryTimeSeriesChartProps {
  data: TelemetryPoint[]
  title?: string
  height?: number
}

export const TelemetryTimeSeriesChart: React.FC<TelemetryTimeSeriesChartProps> = ({
  data,
  title = '5-Metric Telemetry Distribution',
  height = 240,
}) => {
  const [activeMetrics, setActiveMetrics] = useState<Record<string, boolean>>({
    cpu_utilization_pct: true,
    memory_utilization_pct: true,
    temperature_celsius: true,
    packet_loss_pct: false,
    latency_ms: false,
  })
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-raised)',
          borderRadius: 8,
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
        }}
      >
        No telemetry records available
      </div>
    )
  }

  const svgWidth = 600
  const svgHeight = height - 60
  const paddingLeft = 40
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 30

  const plotWidth = svgWidth - paddingLeft - paddingRight
  const plotHeight = svgHeight - paddingTop - paddingBottom

  // Calculate normalized range for active metrics

  let maxVal = 100
  if (activeMetrics.latency_ms) {
    const maxLat = Math.max(...data.map((d) => d.latency_ms || 0), 100)
    maxVal = Math.max(maxVal, maxLat)
  }

  const getX = (idx: number) => paddingLeft + (idx / (data.length - 1 || 1)) * plotWidth
  const getY = (val: number) => paddingTop + plotHeight - (val / (maxVal || 1)) * plotHeight

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 8,
        padding: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: '0.92rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            {title}
          </h4>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
            Real-time multi-dimensional sensor metrics
          </span>
        </div>

        {/* Metric toggles */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {METRICS.map((m) => {
            const isActive = activeMetrics[m.key]
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleMetric(m.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? m.color : 'var(--color-border-subtle)'}`,
                  background: isActive ? `color-mix(in srgb, ${m.color} 12%, transparent)` : 'transparent',
                  color: isActive ? m.color : 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: isActive ? m.color : 'var(--color-border-strong)',
                  }}
                />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: svgHeight, display: 'block', minWidth: 480 }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + plotHeight * (1 - pct)
            const val = Math.round(pct * maxVal)
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--color-border-subtle)"
                  strokeDasharray="3 3"
                  strokeWidth={0.75}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--color-text-muted)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {val}
                </text>
              </g>
            )
          })}

          {/* Metric lines */}
          {METRICS.filter((m) => activeMetrics[m.key]).map((m) => {
            const pts = data.map((d, i) => `${getX(i)},${getY(d[m.key] as number)}`).join(' ')
            return (
              <polyline
                key={m.key}
                fill="none"
                stroke={m.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pts}
              />
            )
          })}

          {/* Hover highlight column */}
          {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < data.length && (
            <line
              x1={getX(hoverIndex)}
              y1={paddingTop}
              x2={getX(hoverIndex)}
              y2={paddingTop + plotHeight}
              stroke="var(--color-text-primary)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}

          {/* Interactive hover overlays */}
          {data.map((_, i) => {
            const x = getX(i)
            const step = plotWidth / (data.length - 1 || 1)
            return (
              <rect
                key={i}
                x={x - step / 2}
                y={paddingTop}
                width={step}
                height={plotHeight}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoverIndex(i)}
              />
            )
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoverIndex !== null && data[hoverIndex] && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 15,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: '0.72rem',
              boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--color-text-primary)' }}>
              Reading #{hoverIndex + 1}
            </div>
            {METRICS.filter((m) => activeMetrics[m.key]).map((m) => (
              <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: m.color, fontWeight: 600 }}>{m.label}:</span>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                  {data[hoverIndex][m.key]}
                  {m.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
