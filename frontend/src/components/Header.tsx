import React, { useState, useRef, useEffect } from 'react'
import {
  LogOut,
  User as UserIcon,
  Shield,
  Database,
  ChevronDown,
  Search,
  Sun,
  Moon,
  Eye,
  Code2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

interface HeaderProps {
  onOpenCommandPalette: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette }) => {
  const { user, logout } = useAuth()
  const { theme, mode, toggleTheme, toggleMode } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const commandShortcut = navigator.userAgent.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl K'

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'role-tag role-admin'
      case 'analyst':
        return 'role-tag role-analyst'
      default:
        return 'role-tag role-viewer'
    }
  }

  return (
    <header className="app-header">
      {/* Left: Ctrl+K search trigger (no duplicate brand text) */}
      <div className="header-left">
        <button
          type="button"
          className="command-trigger"
          onClick={onOpenCommandPalette}
          aria-label="Open quick actions"
          title={`Quick actions & search (${commandShortcut})`}
        >
          <Search size={14} aria-hidden="true" />
          <span>Search & actions</span>
          <kbd>{commandShortcut}</kbd>
        </button>
      </div>

      {/* Right: One small Demo data pill + User Menu */}
      <div className="header-right">
        {/* Single small "Demo data" pill */}
        <div
          className="topbar-demo-pill"
          title="Synthetic educational data — no customer records or real network credentials"
        >
          <Database size={12} className="topbar-demo-icon" aria-hidden="true" />
          <span>Demo data</span>
        </div>

        {/* User Profile Menu with Theme & View Mode toggles inside */}
        <div className="user-profile-container" ref={menuRef}>
          <button
            type="button"
            className="user-profile-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="User settings and account menu"
          >
            <div className="user-avatar" aria-hidden="true">
              <UserIcon size={14} />
            </div>
            <div className="user-info-text">
              <span className="user-name">{user?.display_name || 'User'}</span>
              <span className={getRoleBadgeClass(user?.role)}>{user?.role?.toUpperCase()}</span>
            </div>
            <ChevronDown size={13} className="text-secondary" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="user-dropdown-menu" role="menu">
              <div className="dropdown-user-header">
                <p className="dropdown-name">{user?.display_name}</p>
                <p className="dropdown-email">{user?.email}</p>
                <div style={{ marginTop: '0.4rem' }}>
                  <span className={getRoleBadgeClass(user?.role)}>
                    {user?.role?.toUpperCase()} ACCESS
                  </span>
                </div>
              </div>

              <div className="dropdown-divider" />

              {/* View Mode switcher inside User Menu */}
              <div className="dropdown-menu-row">
                <div className="dropdown-menu-row-label">
                  <Eye size={13} aria-hidden="true" />
                  <span>View mode</span>
                </div>
                <div className="menu-segmented-toggle" role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={`menu-toggle-btn ${mode === 'simple' ? 'active' : ''}`}
                    onClick={() => {
                      if (mode !== 'simple') toggleMode()
                    }}
                    title="Simple view: friendly English, hides raw SQL"
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    className={`menu-toggle-btn ${mode === 'expert' ? 'active' : ''}`}
                    onClick={() => {
                      if (mode !== 'expert') toggleMode()
                    }}
                    title="Expert view: shows SQL AST and execution telemetry"
                  >
                    <Code2 size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                    Expert
                  </button>
                </div>
              </div>

              {/* Theme switcher inside User Menu */}
              <div className="dropdown-menu-row">
                <div className="dropdown-menu-row-label">
                  {theme === 'dark' ? <Moon size={13} aria-hidden="true" /> : <Sun size={13} aria-hidden="true" />}
                  <span>Theme</span>
                </div>
                <div className="menu-segmented-toggle" role="group" aria-label="Theme mode">
                  <button
                    type="button"
                    className={`menu-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => {
                      if (theme !== 'light') toggleTheme()
                    }}
                    title="Light theme"
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    className={`menu-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => {
                      if (theme !== 'dark') toggleTheme()
                    }}
                    title="Dark theme"
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-info-item">
                <Shield size={13} className="text-secondary" aria-hidden="true" />
                <span>Checked by server &bull; Read-only</span>
              </div>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="dropdown-logout-btn"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
              >
                <LogOut size={14} aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
