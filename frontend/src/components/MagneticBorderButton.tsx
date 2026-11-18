import React, { useRef, useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════════════════
   MagneticBorderButton — Magnetic CTA button with:
   • Subtle mouse-follow magnetic physics (translation toward cursor)
   • Animated border-beam shader
   • Instant hover preview tooltip
   ═══════════════════════════════════════════════════════════════════════════ */

interface MagneticBorderButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  tooltip?: string
  className?: string
  icon?: React.ReactNode
}

export const MagneticBorderButton: React.FC<MagneticBorderButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  tooltip,
  className = '',
  icon,
}) => {
  const prefersReducedMotion = useReducedMotion()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (prefersReducedMotion || !buttonRef.current) return
      const { left, top, width, height } = buttonRef.current.getBoundingClientRect()
      const centerX = left + width / 2
      const centerY = top + height / 2

      // Magnetic strength (pull by up to 6px)
      const pullX = (e.clientX - centerX) * 0.15
      const pullY = (e.clientY - centerY) * 0.15
      setPosition({ x: pullX, y: pullY })
    },
    [prefersReducedMotion]
  )

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 })
    setIsHovered(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const variantStyles = {
    primary:
      'bg-zinc-950 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-md shadow-black/10 dark:shadow-white/5',
    secondary:
      'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium shadow-xs',
    ghost:
      'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800/60',
  }

  return (
    <div className="relative inline-block">
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{ x: position.x, y: position.y }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className={`relative h-12 px-7 rounded-full text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] overflow-hidden ${variantStyles[variant]} ${className}`}
      >
        {/* Animated border beam for primary buttons */}
        {variant === 'primary' && !prefersReducedMotion && (
          <span
            className="absolute inset-0 rounded-full pointer-events-none p-[1.5px]"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
            }}
          />
        )}

        <span className="relative z-10 flex items-center gap-2">
          {children}
          {icon}
        </span>
      </motion.button>

      {/* Hover preview tooltip */}
      {tooltip && isHovered && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-zinc-950/95 dark:bg-zinc-800/95 text-white font-mono text-[10.5px] shadow-xl whitespace-nowrap z-50 pointer-events-none border border-zinc-800">
          {tooltip}
        </div>
      )}
    </div>
  )
}
