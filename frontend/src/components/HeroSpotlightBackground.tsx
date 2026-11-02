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
      {/* Soft Ethereal Sky Spotlight */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 h-[440px] w-[820px] rounded-full bg-sky-400/[0.08] dark:bg-sky-500/[0.12] blur-[130px] pointer-events-none" />
      {/* Secondary Soft Slate/Sky Depth Aura */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-sky-200/[0.05] dark:bg-sky-400/[0.05] blur-[100px] pointer-events-none" />
    </div>
  )
}
