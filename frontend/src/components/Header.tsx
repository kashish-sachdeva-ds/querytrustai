import React, { useState } from 'react'
import { LogOut, User as UserIcon, Shield, Database, ChevronDown, Command } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  title?: string
  subtitle?: string
  onOpenCommandPalette: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette }) => {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const commandShortcut = navigator.userAgent.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl K'

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
      <div className="header-left">
        <div className="header-system-tag" title="QueryTrust AI equipment insights workspace">
          <span className="environment-dot" style={{ width: 6, height: 6 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--qt-ink)' }}>
            QUERYTRUST AI
          </span>
          <span style={{ color: 'var(--qt-border-strong)', fontSize: '12px' }}>/</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--qt-muted)', letterSpacing: '0.04em' }}>
            EQUIPMENT INSIGHTS
          </span>
        </div>
      </div>

      <div className="header-right">
        <button type="button" className="command-trigger" onClick={onOpenCommandPalette} aria-label="Open quick actions">
          <Command size={15} aria-hidden="true" />
          <span>Search & actions</span>
          <kbd>{commandShortcut}</kbd>
        </button>
        {/* Synthetic Data Badge */}
        <div className="badge-synthetic" title="Synthetic educational data - no customer or real device records">
          <Database size={13} style={{ color: 'var(--qt-muted)' }} />
          <span>SYNTHETIC PRACTICE DATA</span>
        </div>

        {/* LLM Environment Badge */}
        <div className="badge-environment" title={`LLM Provider: ${user?.llm_provider || 'demo'}`}>
          <span className="environment-dot"></span>
          <span>
            {user?.llm_provider === 'demo' ? 'GUIDED DEMO MODE' : `AI PROVIDER: ${user?.llm_provider?.toUpperCase()}`}
          </span>
        </div>

        {/* User Profile Menu */}
        <div className="user-profile-container">
          <button
            type="button"
            className="user-profile-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
          >
            <div className="user-avatar">
              <UserIcon size={16} />
            </div>
            <div className="user-info-text">
              <span className="user-name">{user?.display_name || 'User'}</span>
              <span className={getRoleBadgeClass(user?.role)}>
                {user?.role?.toUpperCase()}
              </span>
            </div>
            <ChevronDown size={14} className="text-secondary" />
          </button>

          {menuOpen && (
            <div className="user-dropdown-menu">
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

              <div className="dropdown-info-item">
                <Shield size={14} className="text-secondary" />
                <span>Your access is checked by the server</span>
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
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
