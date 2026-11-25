import React from 'react'

export const HeroCinematicBackground: React.FC = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, var(--color-accent-subtle), transparent 72%)',
        }}
      />
    </div>
  )
}
