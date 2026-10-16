import React, { useLayoutEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  Server,
  MessageSquareText,
  ShieldCheck,
  Activity,
  History,
  FlaskConical,
  Users,
  Shield,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export type ActiveTab =
  | 'overview'
  | 'devices'
  | 'ask-data'
  | 'data-quality'
  | 'anomalies'
  | 'history'
  | 'evaluations'
  | 'admin'

interface SidebarProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const navRef = useRef<HTMLElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false })

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const nav = navRef.current
      const activeItem = activeItemRef.current
      if (!nav || !activeItem) return

      const navBounds = nav.getBoundingClientRect()
      const itemBounds = activeItem.getBoundingClientRect()
      setIndicator({
        top: itemBounds.top - navBounds.top,
        height: itemBounds.height,
        ready: true,
      })
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab, isAdmin])

  const activeItemProps = (tab: ActiveTab) => activeTab === tab ? { ref: activeItemRef } : {}

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand-section">
        <div className="brand-logo">QT</div>
        <div>
          <h2 className="brand-title">QueryTrust AI</h2>
          <span className="brand-badge">Governance Workbench</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="nav-menu" aria-label="Main Navigation" ref={navRef}>
        <span
          className="nav-active-indicator"
          aria-hidden="true"
          style={{
            height: indicator.height,
            opacity: indicator.ready ? 1 : 0,
            transform: `translateY(${indicator.top}px)`,
          }}
        />
        <div className="nav-section-title">ANALYTICS & INVENTORY</div>

        <button
          type="button"
          className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onSelectTab('overview')}
          {...activeItemProps('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => onSelectTab('devices')}
          {...activeItemProps('devices')}
        >
          <Server size={18} />
          <span>Device Explorer</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'ask-data' ? 'active' : ''}`}
          onClick={() => onSelectTab('ask-data')}
          {...activeItemProps('ask-data')}
        >
          <MessageSquareText size={18} />
          <span>Ask Data</span>
        </button>

        <div className="nav-section-title" style={{ marginTop: '1.25rem' }}>
          ASSURANCE & MONITORING
        </div>

        <button
          type="button"
          className={`nav-item ${activeTab === 'data-quality' ? 'active' : ''}`}
          onClick={() => onSelectTab('data-quality')}
          {...activeItemProps('data-quality')}
        >
          <ShieldCheck size={18} />
          <span>Data Quality</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => onSelectTab('anomalies')}
          {...activeItemProps('anomalies')}
        >
          <Activity size={18} />
          <span>Anomaly Monitor</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => onSelectTab('history')}
          {...activeItemProps('history')}
        >
          <History size={18} />
          <span>Query History</span>
        </button>

        {/* Admin Only Section */}
        {isAdmin && (
          <>
            <div className="nav-section-title" style={{ marginTop: '1.25rem' }}>
              GOVERNANCE (ADMIN)
            </div>

            <button
              type="button"
              className={`nav-item ${activeTab === 'evaluations' ? 'active' : ''}`}
              onClick={() => onSelectTab('evaluations')}
              {...activeItemProps('evaluations')}
            >
              <FlaskConical size={18} />
              <span>Evaluation Lab</span>
            </button>

            <button
              type="button"
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => onSelectTab('admin')}
              {...activeItemProps('admin')}
            >
              <Users size={18} />
              <span>User Administration</span>
            </button>
          </>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-security-badge">
          <Shield size={14} style={{ color: 'var(--qt-accent)' }} />
          <div>
            <div className="security-title">SELECT-Only Guard</div>
            <div className="security-subtitle">Role: {user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
