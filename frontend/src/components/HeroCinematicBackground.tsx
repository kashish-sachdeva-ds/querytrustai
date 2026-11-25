import React, { useEffect } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'

export const HeroCinematicBackground: React.FC = () => {
  const mouseX = useMotionValue(720)
  const mouseY = useMotionValue(220)
  const smoothX = useSpring(mouseX, { stiffness: 120, damping: 24 })
  const smoothY = useSpring(mouseY, { stiffness: 120, damping: 24 })

  const spotlight = useMotionTemplate`radial-gradient(560px circle at ${smoothX}px ${smoothY}px, color-mix(in srgb, var(--color-accent) 13%, transparent), transparent 70%)`

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('pointermove', handleMove, { passive: true })
    return () => window.removeEventListener('pointermove', handleMove)
  }, [mouseX, mouseY])

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {/* Crisp architectural grid masked radially */}
      <div className="landing-hero-grid absolute inset-0 opacity-75" />

      {/* Top atmospheric zenith wash */}
      <div
        className="absolute inset-x-0 top-0 h-[460px]"
        style={{
          background:
            'radial-gradient(ellipse 75% 60% at 50% 0%, var(--color-accent-subtle), transparent 72%)',
        }}
      />

      {/* Interactive pointer-tracking ambient glow */}
      <motion.div
        className="absolute inset-0 hidden md:block"
        style={{ background: spotlight }}
      />

      {/* Ambient slow-breathing accent orb left */}
      <motion.div
        className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 16%, transparent) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, 28, -12, 0],
          y: [0, 18, -10, 0],
          scale: [1, 1.08, 0.96, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Ambient slow-breathing orb right */}
      <motion.div
        className="absolute top-12 -right-24 w-[380px] h-[380px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-status-success-dot) 11%, transparent) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, -24, 14, 0],
          y: [0, -16, 18, 0],
          scale: [1, 0.94, 1.06, 1],
        }}
        transition={{
          duration: 19,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}
