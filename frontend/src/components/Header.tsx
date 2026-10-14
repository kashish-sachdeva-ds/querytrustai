import React, { useState } from 'react'
import { LogOut, User as UserIcon, Shield, Database, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  title: string
  subtitle?: string
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

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
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
      </div>

      <div className="header-right">
        {/* Synthetic Data Badge */}
        <div className="badge-synthetic" title="Synthetic educational data - no customer or real device records">
          <Database size={13} className="text-cyan" />
          <span>SYNTHETIC DEMO DATA</span>
        </div>

        {/* LLM Environment Badge */}
        <div className="badge-environment" title={`LLM Provider: ${user?.llm_provider || 'demo'}`}>
          <span className="environment-dot"></span>
          <span>
            {user?.llm_provider === 'demo' ? 'MODE: DETERMINISTIC DEMO' : `LLM: ${user?.llm_provider?.toUpperCase()}`}
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
                <span>Backend Role Guard Active</span>
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
