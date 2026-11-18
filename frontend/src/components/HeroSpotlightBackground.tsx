export function HeroSpotlightBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Subtle 1px Minimalist Grid with Radial Fade Mask */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"
        style={{
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 0%, #000 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 0%, #000 70%, transparent 100%)',
        }}
      />
      {/* Soft Monochromatic Engineering Spotlight (Direction B) */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 h-[440px] w-[820px] rounded-full bg-zinc-400/[0.04] dark:bg-white/[0.03] blur-[140px] pointer-events-none" />
      {/* Secondary Soft Titanium Depth Highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-zinc-300/[0.03] dark:bg-white/[0.02] blur-[110px] pointer-events-none" />
    </div>
  )
}
