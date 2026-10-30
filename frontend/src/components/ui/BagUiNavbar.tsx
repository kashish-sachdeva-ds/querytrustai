import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Globe,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { QueryTrustLogo } from '../QueryTrustLogo'

interface BagUiNavbarProps {
  onSignIn?: () => void
  onRequestDemo?: () => void
  onLaunchApp?: () => void
}

type ActiveDropdown = 'pricing' | 'solutions' | 'resources' | null

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: { duration: 0.12 },
  },
}

export const BagUiNavbar: React.FC<BagUiNavbarProps> = ({
  onSignIn,
  onRequestDemo,
  onLaunchApp,
}) => {
  const { theme, toggleTheme } = useTheme()
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null)
  const [activeLang, setActiveLang] = useState<'EN' | 'ES' | 'FR'>('EN')
  const [langOpen, setLangOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
        setLangOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null)
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const toggleDropdown = (menu: ActiveDropdown) => {
    setActiveDropdown((current) => (current === menu ? null : menu))
  }

  return (
    <div ref={navRef} className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 z-50">
      {/* ─── Main Bag\Ui Floating Pill / Navbar ─── */}
      <nav
        className="relative flex items-center justify-between h-16 px-6 rounded-full bg-white/95 dark:bg-[#121215]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors"
        aria-label="BagUi Global Navigation"
      >
        {/* Left: Brand Mark */}
        <div className="flex items-center gap-3">
          <QueryTrustLogo size={26} />
          <button
            type="button"
            onClick={onLaunchApp}
            className="flex items-center gap-1 font-display font-bold text-lg tracking-tight text-gray-900 dark:text-white cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span>Query</span>
            <span className="text-gray-400 dark:text-zinc-500 font-light">\</span>
            <span className="text-[#F97316]">Trust</span>
          </button>
        </div>

        {/* Center: Interactive Nav Items */}
        <div className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          {/* Solutions Menu Trigger */}
          <button
            type="button"
            onClick={() => toggleDropdown('solutions')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDropdown === 'solutions'
                ? 'bg-black/[0.06] dark:bg-white/[0.1] text-gray-900 dark:text-white font-semibold'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
            }`}
          >
            <span>Solutions</span>
            {activeDropdown === 'solutions' ? (
              <ChevronUp size={13} className="text-gray-900 dark:text-white" />
            ) : (
              <ChevronDown size={13} className="text-gray-400 dark:text-gray-500" />
            )}
          </button>

          {/* Pricing Menu Trigger (Bag\\Ui pill styling) */}
          <button
            type="button"
            onClick={() => toggleDropdown('pricing')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDropdown === 'pricing'
                ? 'bg-black/[0.06] dark:bg-white/[0.1] text-gray-900 dark:text-white font-semibold'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
            }`}
          >
            <span>Pricing</span>
            {activeDropdown === 'pricing' ? (
              <ChevronUp size={13} className="text-gray-900 dark:text-white" />
            ) : (
              <ChevronDown size={13} className="text-gray-400 dark:text-gray-500" />
            )}
          </button>

          {/* Resources Menu Trigger */}
          <button
            type="button"
            onClick={() => toggleDropdown('resources')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDropdown === 'resources'
                ? 'bg-black/[0.06] dark:bg-white/[0.1] text-gray-900 dark:text-white font-semibold'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
            }`}
          >
            <span>Resources</span>
            {activeDropdown === 'resources' ? (
              <ChevronUp size={13} className="text-gray-900 dark:text-white" />
            ) : (
              <ChevronDown size={13} className="text-gray-400 dark:text-gray-500" />
            )}
          </button>

          {/* Contact Direct Link */}
          <a
            href="#interactive-preview"
            onClick={() => setActiveDropdown(null)}
            className="px-3.5 py-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            Contact
          </a>
        </div>

        {/* Right: Language, Theme, Sign in & Request Demo Pill CTAs */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((prev) => !prev)}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Select language"
            >
              <Globe size={13} className="text-gray-500" />
              <span>{activeLang}</span>
              <ChevronDown size={11} className="text-gray-400" />
            </button>

            {langOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-28 rounded-xl bg-white dark:bg-[#18181B] border border-black/[0.08] dark:border-white/[0.1] shadow-xl p-1 z-50">
                {(['EN', 'ES', 'FR'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setActiveLang(lang)
                      setLangOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeLang === lang
                        ? 'bg-black/[0.05] dark:bg-white/[0.08] text-gray-900 dark:text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {lang === 'EN' ? 'English' : lang === 'ES' ? 'Español' : 'Français'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Sign In Rounded Pill */}
          <button
            type="button"
            onClick={onSignIn}
            className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100/80 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.14] border border-black/[0.04] dark:border-white/[0.06] transition-all cursor-pointer"
          >
            Sign in
          </button>

          {/* Request a demo High-Contrast Pill CTA */}
          <button
            type="button"
            onClick={onRequestDemo || onLaunchApp}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>Request a demo</span>
          </button>
        </div>
      </nav>

      {/* ─── Mega Menu Dropdown Modal (Bag\Ui Reference Design) ─── */}
      <AnimatePresence>
        {activeDropdown === 'pricing' && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-[calc(100%+8px)] left-4 right-4 sm:left-6 sm:right-6 max-w-4xl mx-auto rounded-3xl bg-white dark:bg-[#121215] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.6)] p-8 z-50 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr_2fr] gap-8 items-start">
              {/* Column 1: Plans */}
              <div className="flex flex-col">
                <span className="inline-block w-fit px-3 py-0.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] mb-4">
                  Plans
                </span>
                <div className="space-y-3.5">
                  <button
                    type="button"
                    onClick={onLaunchApp}
                    className="text-left text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Starter
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onLaunchApp}
                      className="text-left text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer"
                    >
                      Pro
                    </button>
                    <span className="bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase shadow-xs">
                      POPULAR
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onRequestDemo || onLaunchApp}
                    className="text-left text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Enterprise
                  </button>
                </div>
              </div>

              {/* Column 2: Details */}
              <div className="flex flex-col">
                <span className="inline-block w-fit px-3 py-0.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] mb-4">
                  Details
                </span>
                <div className="space-y-3.5">
                  <a
                    href="#interactive-preview"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Compare all plans
                  </a>
                  <a
                    href="#pillars"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Billing FAQ
                  </a>
                  <button
                    type="button"
                    onClick={onRequestDemo || onLaunchApp}
                    className="text-left text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Talk to sales
                  </button>
                </div>
              </div>

              {/* Column 3: Landscape Image Showcase Card */}
              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-gray-100 dark:bg-zinc-800 shadow-md group">
                <img
                  src="https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&w=650&q=80"
                  alt="Plans that grow with your team"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-4">
                  <span className="text-white font-medium text-sm tracking-tight drop-shadow-sm">
                    Plans that grow with your team
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-footer Note */}
            <div className="text-center text-xs text-gray-400 dark:text-zinc-500 pt-6 mt-6 border-t border-gray-100 dark:border-white/[0.06]">
              Student &amp; non-profit discounts available upon enterprise review
            </div>
          </motion.div>
        )}

        {/* ─── Solutions Mega Menu ─── */}
        {activeDropdown === 'solutions' && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-[calc(100%+8px)] left-4 right-4 sm:left-6 sm:right-6 max-w-4xl mx-auto rounded-3xl bg-white dark:bg-[#121215] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.6)] p-8 z-50 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr_2fr] gap-8 items-start">
              <div className="flex flex-col">
                <span className="inline-block w-fit px-3 py-0.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] mb-4">
                  Platform
                </span>
                <div className="space-y-3.5">
                  <a
                    href="#interactive-preview"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Query Studio
                  </a>
                  <a
                    href="#pillars"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Deterministic AST
                  </a>
                  <a
                    href="#metrics"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Zero-Write Kernel
                  </a>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="inline-block w-fit px-3 py-0.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] mb-4">
                  Governance
                </span>
                <div className="space-y-3.5">
                  <a
                    href="#interactive-preview"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    6-Gate Security Guard
                  </a>
                  <a
                    href="#pillars"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Role Privilege Enforcement
                  </a>
                  <a
                    href="#metrics"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Tamper-Evident Audit
                  </a>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-gray-100 dark:bg-zinc-800 shadow-md group">
                <img
                  src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=650&q=80"
                  alt="Enterprise SQL Governance"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-4">
                  <span className="text-white font-medium text-sm tracking-tight drop-shadow-sm">
                    Enterprise Zero-Trust Relational Analytics
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400 dark:text-zinc-500 pt-6 mt-6 border-t border-gray-100 dark:border-white/[0.06]">
              Sub-millisecond AST compiler &bull; 0 Writes physically allowed at the driver layer
            </div>
          </motion.div>
        )}

        {/* ─── Resources Mega Menu ─── */}
        {activeDropdown === 'resources' && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-[calc(100%+8px)] left-4 right-4 sm:left-6 sm:right-6 max-w-4xl mx-auto rounded-3xl bg-white dark:bg-[#121215] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.6)] p-8 z-50 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr_2fr] gap-8 items-start">
              <div className="flex flex-col">
                <span className="inline-block w-fit px-3 py-0.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] mb-4">
                  Documentation
                </span>
                <div className="space-y-3.5">
                  <a
                    href="#interactive-preview"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Quickstart Guide
                  </a>
                  <a
                    href="#pillars"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    AST Grammar Specification
                  </a>
                  <a
                    href="#metrics"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Benchmark Reports
                  </a>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="inline-block w-fit px-3 py-0.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] mb-4">
                  Security Lab
                </span>
                <div className="space-y-3.5">
                  <a
                    href="#interactive-preview"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    37 Red-Team Attack Presets
                  </a>
                  <a
                    href="#pillars"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Cartesian Join Guard
                  </a>
                  <a
                    href="#metrics"
                    onClick={() => setActiveDropdown(null)}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#F97316] transition-colors cursor-pointer block"
                  >
                    Dual-Role Kernel Proof
                  </a>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-gray-100 dark:bg-zinc-800 shadow-md group">
                <img
                  src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=650&q=80"
                  alt="Security and Compliance"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-4">
                  <span className="text-white font-medium text-sm tracking-tight drop-shadow-sm">
                    Verified Defense in Depth
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400 dark:text-zinc-500 pt-6 mt-6 border-t border-gray-100 dark:border-white/[0.06]">
              All tests automated &bull; Verified in PostgreSQL 16 &amp; SQLite 3
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
