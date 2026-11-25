export function HeroSpotlightBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-36 left-1/2 -translate-x-1/2 h-[420px] w-[760px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'var(--color-accent-subtle)' }}
      />
    </div>
  )
}
