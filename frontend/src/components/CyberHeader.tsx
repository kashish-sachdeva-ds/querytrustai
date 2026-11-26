import React, { useEffect, useState } from 'react'
import { Sun, Moon, ArrowUpRight, Terminal, Menu, X } from 'lucide-react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { QueryTrustLogo } from './QueryTrustLogo'

interface CyberHeaderProps {
  onSignIn: () => void
  onLaunchAnalyst: () => void
  onLaunchAdmin: () => void
}

const NAV_LINKS = [
  { href: '#three-invariants', index: '01', label: 'Safeguards' },
  { href: '#platform-showcase', index: '02', label: 'Workbench' },
  { href: '#attack-matrix', index: '03', label: 'Guardrails' },
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
  const [activeNav, setActiveNav] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const isNowScrolled = latest > 24
    setScrolled(isNowScrolled)
    if (latest < 240) {
      setActiveNav(null)
    }
  })

  // Scroll-spy for section anchors (#three-invariants, #platform-showcase, #attack-matrix)
  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.slice(1))
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveNav(`#${visible[0].target.id}`)
        }
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.1, 0.35, 0.6],
      }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setActiveNav(href)
    setMobileMenuOpen(false)
    const target = document.getElementById(href.slice(1))
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <header
      className="sticky top-0 z-50 w-full h-16 flex items-start justify-center pointer-events-none"
      role="banner"
    >
      {/* Floating Glass Dock (morphs smoothly from full-bleed to centered capsule on scroll with 0 layout shift) */}
      <div
        className={`pointer-events-auto relative flex items-center justify-between gap-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? 'w-[calc(100%-20px)] sm:w-[calc(100%-32px)] max-w-6xl h-[54px] translate-y-2.5 rounded-2xl px-3.5 sm:px-5'
            : 'w-full max-w-full h-16 translate-y-0 rounded-none px-4 sm:px-8'
        }`}
        style={{
          backgroundColor: scrolled
            ? 'color-mix(in srgb, var(--color-surface) 80%, transparent)'
            : 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          border: scrolled
            ? '1px solid color-mix(in srgb, var(--color-border-strong) 38%, var(--color-border-subtle))'
            : '1px solid transparent',
          borderBottom: scrolled
            ? '1px solid color-mix(in srgb, var(--color-border-strong) 38%, var(--color-border-subtle))'
            : '1px solid var(--color-border-subtle)',
          boxShadow: scrolled
            ? 'inset 0 1px 0 color-mix(in srgb, var(--color-accent-contrast) 10%, transparent), 0 18px 42px -14px color-mix(in srgb, var(--color-text-primary) 26%, transparent)'
            : 'inset 0 1px 0 color-mix(in srgb, var(--color-accent-contrast) 6%, transparent)',
        }}
      >
        {/* Clipped background effects & scroll-progress hairline */}
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ borderRadius: 'inherit' }}
        >
          {/* Subtle top radial accent sheen */}
          <div
            className="absolute inset-x-0 top-0 h-full opacity-55"
            style={{
              background:
                'radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--color-accent) 11%, transparent), transparent 72%)',
            }}
          />
          {/* Scroll Reading Progress Hairline */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
            style={{
              scaleX,
              background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-link))',
            }}
          />
        </div>

        <div
          className={`relative z-10 w-full flex items-center justify-between gap-3 ${
            scrolled ? '' : 'max-w-7xl mx-auto'
          }`}
        >
          {/* Left: Brand Identity + Read-Only Micro-Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveNav(null)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="group flex items-center gap-2.5 text-left cursor-pointer select-none min-w-0"
            >
              <span className="relative inline-flex items-center justify-center">
                <span
                  aria-hidden="true"
                  className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    backgroundColor: 'var(--color-accent-subtle)',
                  }}
                />
                <QueryTrustLogo size={24} className="relative z-10" />
              </span>
              <span
                className="font-semibold text-[15px] tracking-tight whitespace-nowrap"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
              >
                QueryTrust AI
              </span>
            </motion.button>

            <span
              aria-hidden="true"
              className="hidden lg:block h-4 w-px shrink-0"
              style={{ backgroundColor: 'var(--color-border-subtle)' }}
            />

            <span
              className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.06em] uppercase whitespace-nowrap shrink-0"
              style={{
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--color-status-success-bg)',
                color: 'var(--color-status-success-text)',
                border: '1px solid color-mix(in srgb, var(--color-status-success-dot) 24%, transparent)',
              }}
              title="Enforced PostgreSQL SELECT-only isolation"
            >
              <span className="landing-live-dot" aria-hidden="true" />
              <span>Read-Only</span>
            </span>
          </div>

          {/* Center: Recessed Glass Nav Capsule with Scroll-Spy */}
          <nav
            aria-label="Landing Page Sections"
            className="hidden md:flex items-center gap-0.5 p-1 rounded-[11px]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-raised) 76%, transparent)',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--color-text-primary) 4%, transparent)',
            }}
            onMouseLeave={() => setHoveredNav(null)}
          >
            {NAV_LINKS.map((link) => {
              const isHovered = hoveredNav === link.href
              const isActive = activeNav === link.href
              const showPill = isHovered || (!hoveredNav && isActive)

              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleAnchorClick(e, link.href)}
                  onMouseEnter={() => setHoveredNav(link.href)}
                  className="relative px-3 py-1 rounded-[8px] text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    color:
                      isActive || isHovered
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                  }}
                >
                  {showPill && (
                    <motion.span
                      layoutId="header-nav-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-[8px]"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border-subtle)',
                        boxShadow:
                          '0 2px 8px -4px color-mix(in srgb, var(--color-text-primary) 18%, transparent)',
                        zIndex: 0,
                      }}
                    />
                  )}
                  <span
                    className="relative z-10 text-[10px] tracking-tight transition-colors"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: isActive ? 'var(--color-accent-link)' : 'var(--color-text-muted)',
                    }}
                  >
                    {link.index}
                  </span>
                  <span className="relative z-10">{link.label}</span>
                </a>
              )
            })}
          </nav>

          {/* Right: Utility & Action Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={toggleTheme}
              className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:bg-[var(--color-raised)] overflow-hidden"
              style={{
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'color-mix(in srgb, var(--color-surface) 85%, transparent)',
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
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <button
              type="button"
              onClick={onSignIn}
              className="hidden sm:inline-flex whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors cursor-pointer hover:bg-[var(--color-raised)] hover:text-[var(--color-text-primary)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sign in
            </button>

            <span
              aria-hidden="true"
              className="hidden sm:block h-4 w-px mx-0.5 shrink-0"
              style={{ backgroundColor: 'var(--color-border-subtle)' }}
            />

            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLaunchAnalyst}
              className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-3 py-1.5 text-[12.5px] font-medium cursor-pointer landing-control-secondary"
              style={{ borderRadius: '9px' }}
            >
              <Terminal size={13} style={{ color: 'var(--color-accent-link)' }} />
              <span>Analyst demo</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLaunchAdmin}
              className="group whitespace-nowrap shrink-0 px-3.5 py-1.5 flex items-center gap-1.5 text-[12.5px] font-medium cursor-pointer landing-control-primary"
              style={{
                borderRadius: '9px',
                boxShadow:
                  'inset 0 1px 0 color-mix(in srgb, var(--color-accent-contrast) 24%, transparent), 0 6px 18px -6px color-mix(in srgb, var(--color-accent) 45%, transparent)',
              }}
            >
              <span>Open studio</span>
              <ArrowUpRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </motion.button>

            {/* Mobile Nav Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:bg-[var(--color-raised)]"
              style={{
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'color-mix(in srgb, var(--color-surface) 85%, transparent)',
              }}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden absolute top-[calc(100%+8px)] left-3 right-3 rounded-xl p-2 flex flex-col gap-1 z-50"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border-subtle)',
                boxShadow:
                  '0 18px 40px -12px color-mix(in srgb, var(--color-text-primary) 24%, transparent)',
              }}
            >
              {NAV_LINKS.map((link) => {
                const isActive = activeNav === link.href
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleAnchorClick(e, link.href)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? 'var(--color-raised)' : 'transparent',
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="text-[11px]"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: isActive ? 'var(--color-accent-link)' : 'var(--color-text-muted)',
                        }}
                      >
                        {link.index}
                      </span>
                      <span>{link.label}</span>
                    </span>
                  </a>
                )
              })}

              <div
                className="my-1 h-px"
                style={{ backgroundColor: 'var(--color-border-subtle)' }}
              />

              <div className="sm:hidden flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onLaunchAnalyst()
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-left cursor-pointer"
                  style={{
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-raised)',
                  }}
                >
                  <Terminal size={13} style={{ color: 'var(--color-accent-link)' }} />
                  <span>Launch Analyst demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onSignIn()
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium text-left cursor-pointer border"
                  style={{
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border-subtle)',
                  }}
                >
                  <span>Sign in to workspace</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
