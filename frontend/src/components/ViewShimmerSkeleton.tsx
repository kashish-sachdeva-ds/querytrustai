import React from 'react'

export const ViewShimmerSkeleton: React.FC<{ title?: string }> = ({ title = 'Loading workbench view...' }) => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={title}
      style={{
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            className="skeleton"
            style={{ width: 220, height: 28, borderRadius: 6 }}
          />
          <div
            className="skeleton"
            style={{ width: 340, height: 16, borderRadius: 4 }}
          />
        </div>
        <div
          className="skeleton"
          style={{ width: 120, height: 36, borderRadius: 6 }}
        />
      </div>

      {/* 4 KPI card wells skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: 104,
              borderRadius: 8,
              background: 'var(--qt-surface, #ffffff)',
              border: '1px solid var(--qt-border, #E6E4E0)',
            }}
          />
        ))}
      </div>

      {/* Main panel skeleton */}
      <div
        className="skeleton"
        style={{
          height: 380,
          borderRadius: 8,
          background: 'var(--qt-surface, #ffffff)',
          border: '1px solid var(--qt-border, #E6E4E0)',
        }}
      />
    </div>
  )
}
