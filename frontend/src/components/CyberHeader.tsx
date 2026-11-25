import React, { useState } from 'react'
import { Sun, Moon, ArrowUpRight } from 'lucide-react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { QueryTrustLogo } from './QueryTrustLogo'

interface CyberHeaderProps {
  onSignIn: () => void
  onLaunchAnalyst: () => void
  onLaunchAdmin: () => void
}

const NAV_LINKS = [
  { href: '#three-invariants', label: 'Safeguards' },
  { href: '#platform-showcase', label: 'Workbench' },
  { href: '#attack-matrix', label: 'Guardrails' },
] as const

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  onSignIn,
  onLaunchAnalyst,
  onLaunchAdmin,
}) => {
  const { theme, toggleTheme } = useTheme()
  const { scrollY, scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 280, damping: 32, restDelta: 0.001 })
  const [scrolled, setScrolled] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 16)
  })

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-md transition-all duration-200"
      style={{
        backgroundColor: scrolled
          ? 'color-mix(in srgb, var(--color-surface) 88%, transparent)'
          : 'color-mix(in srgb, var(--color-surface) 94%, transparent)',
        borderBottom: '1px solid var(--color-border-subtle)',
        boxShadow: scrolled
          ? '0 8px 30px -16px color-mix(in srgb, var(--color-text-primary) 16%, transparent)'
          : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 text-left cursor-pointer select-none min-w-0"
        >
          <QueryTrustLogo size={24} />
          <span
            className="font-semibold text-[15px] tracking-tight whitespace-nowrap"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
          >
            QueryTrust AI
          </span>
        </motion.button>

        {/* Center: Navigation Anchors with sliding hover pill */}
        <nav
          className="hidden md:flex items-center gap-1 text-[13px] font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseLeave={() => setHoveredNav(null)}
        >
          {NAV_LINKS.map((link) => {
            const isHovered = hoveredNav === link.href
            return (
              <a
                key={link.href}
                href={link.href}
                onMouseEnter={() => setHoveredNav(link.href)}
                className="relative px-3.5 py-1.5 rounded-[8px] transition-colors hover:text-[var(--color-text-primary)]"
              >
                {isHovered && (
                  <motion.span
                    layoutId="header-nav-hover"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    className="absolute inset-0 rounded-[8px]"
                    style={{ backgroundColor: 'var(--color-raised)', zIndex: 0 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </a>
            )
          })}
        </nav>

        {/* Right: Actions & Theme Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:bg-[var(--color-raised)] overflow-hidden"
            style={{
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--color-surface)',
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
                transition={{ duration: 0.16 }}
                className="inline-flex items-center justify-center"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <button
            type="button"
            onClick={onSignIn}
            className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer hover:bg-[var(--color-raised)]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Sign in
          </button>

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLaunchAnalyst}
            className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-3 py-1.5 text-[13px] font-medium cursor-pointer landing-control-secondary"
          >
            <span>Analyst demo</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLaunchAdmin}
            className="group whitespace-nowrap shrink-0 px-3.5 py-1.5 flex items-center gap-1.5 text-[13px] font-medium cursor-pointer landing-control-primary"
          >
            <span>Open studio</span>
            <ArrowUpRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </motion.button>
        </div>
      </div>

      {/* Scroll Reading Progress Hairline */}
      <motion.div
        aria-hidden="true"
        className="h-[2px] w-full origin-left pointer-events-none"
        style={{
          scaleX,
          background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-link))',
        }}
      />
    </header>
  )
}
