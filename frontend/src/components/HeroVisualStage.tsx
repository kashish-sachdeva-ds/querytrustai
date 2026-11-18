import React from 'react'
import { AnimatedPhotoStage } from './AnimatedPhotoStage'

/* ═══════════════════════════════════════════════════════════════════════════
   HeroVisualStage — Photorealistic Hardware Centerpiece on Travertine Stone
   Clean, spacious framing with interactive 3D mouse parallax tilt
   Asset: /endcap-hero-showcase.png
   ═══════════════════════════════════════════════════════════════════════════ */

export const HeroVisualStage: React.FC = () => {
  return (
    <div className="relative w-full max-w-2xl lg:max-w-none mx-auto select-none">
      {/* ── Minimalist Engineering Backlight (Direction B) ── */}
      <div className="absolute -inset-4 rounded-3xl bg-radial from-white/[0.04] to-transparent pointer-events-none" />

      {/* ── Endcap Animated Photo Stage ── */}
      <AnimatedPhotoStage
        imageSrc="/endcap-hero-showcase.png"
        alt="QueryTrust 6-Gate AST Security Prism Staged on Travertine Stone"
        className="h-[400px] sm:h-[450px] lg:h-[480px]"
        showHeroAstOverlay={false}
        titleBadge="QUERYTRUST PHYSICAL ENCLAVE"
        subtitleBadge="PostgreSQL 16 · qt_ai_readonly"
      />
    </div>
  )
}
