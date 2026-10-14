import React from 'react'
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
      <nav className="nav-menu" aria-label="Main Navigation">
        <div className="nav-section-title">ANALYTICS & INVENTORY</div>

        <button
          type="button"
          className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onSelectTab('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => onSelectTab('devices')}
        >
          <Server size={18} />
          <span>Device Explorer</span>
          <span className="nav-badge">5,000</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'ask-data' ? 'active' : ''}`}
          onClick={() => onSelectTab('ask-data')}
        >
          <MessageSquareText size={18} />
          <span>Ask Data</span>
          <span className="nav-badge-pill">M3</span>
        </button>

        <div className="nav-section-title" style={{ marginTop: '1.25rem' }}>
          ASSURANCE & MONITORING
        </div>

        <button
          type="button"
          className={`nav-item ${activeTab === 'data-quality' ? 'active' : ''}`}
          onClick={() => onSelectTab('data-quality')}
        >
          <ShieldCheck size={18} />
          <span>Data Quality</span>
          <span className="nav-badge-pill">M5</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => onSelectTab('anomalies')}
        >
          <Activity size={18} />
          <span>Anomaly Monitor</span>
          <span className="nav-badge-pill">M5</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => onSelectTab('history')}
        >
          <History size={18} />
          <span>Query History</span>
          <span className="nav-badge-pill">M4</span>
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
            >
              <FlaskConical size={18} />
              <span>Evaluation Lab</span>
              <span className="nav-badge-pill">M6</span>
            </button>

            <button
              type="button"
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => onSelectTab('admin')}
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
          <Shield size={14} className="text-cyan" />
          <div>
            <div className="security-title">SELECT-Only Guard</div>
            <div className="security-subtitle">Role: {user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
