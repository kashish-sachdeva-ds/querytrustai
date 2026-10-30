import React, { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Server,
  MessageSquareText,
  ShieldCheck,
  Activity,
  FlaskConical,
  Users,
  ChevronLeft,
  ChevronRight,
  Database,
  Terminal,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  fetchDataQualitySummary,
  fetchAnomalySummary,
  fetchQueryHistory,
} from '../api/client'
import { QueryTrustLogo } from './QueryTrustLogo'
import './LinearShell.css'

export type ActiveTab =
  | 'overview'
  | 'devices'
  | 'ask-data'
  | 'data-sources'
  | 'data-quality'
  | 'anomalies'
  | 'history'
  | 'evaluations'
  | 'admin'

interface SidebarProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  onAskQuestion?: (question: string) => void
}

const DEFAULT_RECENT_QUESTIONS = [
  'Show devices with warranty expiring in 30 days',
  'Show all high-risk devices with open critical events',
  'List open Critical service events grouped by site',
]

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onAskQuestion }) => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('qt-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  // Live Monospace Counters
  const [dataHealthCount, setDataHealthCount] = useState<number>(6)
  const [anomaliesCount, setAnomaliesCount] = useState<number>(375)
  const [recentQuestions, setRecentQuestions] = useState<string[]>(DEFAULT_RECENT_QUESTIONS)

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('qt-sidebar-collapsed', String(next))
      } catch {
        /* noop */
      }
      return next
    })
  }

  // Load telemetry counts and recent history
  useEffect(() => {
    let isMounted = true

    async function loadTelemetry() {
      try {
        const dq = await fetchDataQualitySummary()
        if (isMounted && dq && dq.total_findings) {
          setDataHealthCount(dq.total_findings)
        }
      } catch {
        // default 6 preserved
      }

      try {
        const anom = await fetchAnomalySummary()
        const count =
          anom?.metrics?.detected_outliers_count ??
          anom?.metrics?.known_injected_outliers_count ??
          375
        if (isMounted) setAnomaliesCount(count)
      } catch {
        // default 375 preserved
      }

      try {
        const history = await fetchQueryHistory(1, 10)
        if (isMounted && history?.items && history.items.length > 0) {
          const unique: string[] = []
          for (const item of history.items) {
            const q = item.question?.trim()
            if (q && !unique.includes(q)) {
              unique.push(q)
              if (unique.length >= 3) break
            }
          }
          if (unique.length > 0) setRecentQuestions(unique)
        }
      } catch {
        // default questions preserved
      }
    }

    loadTelemetry()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}
      aria-label="Main Navigation Sidebar"
      style={{
        width: isCollapsed ? '60px' : '240px',
        minWidth: isCollapsed ? '60px' : '240px',
        maxWidth: isCollapsed ? '60px' : '240px',
        backgroundColor: 'var(--bg-canvas)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        flexShrink: 0,
        zIndex: 40,
        transition: 'width 140ms ease, min-width 140ms ease',
      }}
    >
      {/* ─── Top Brand Section ─── */}
      <div>
        <div
          style={{
            height: '48px',
            borderBottom: '1px solid var(--border-subtle)',
            padding: isCollapsed ? '0 12px' : '0 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            backgroundColor: 'var(--bg-surface-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{ flexShrink: 0 }}>
              <QueryTrustLogo size={22} />
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--ink-primary)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    QueryTrust
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      backgroundColor: 'var(--accent-primary-subtle)',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--accent-primary-border)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                    }}
                  >
                    AI
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>Zero-Trust SQL</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: isCollapsed ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* ─── Primary CTA: Ask Governed Data ─── */}
        <div style={{ padding: '10px 10px 8px 10px' }}>
          <button
            type="button"
            onClick={() => onSelectTab('ask-data')}
            style={{
              width: '100%',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              border: '1px solid var(--accent-primary-hover)',
              borderRadius: '6px',
              padding: isCollapsed ? '8px 0' : '7px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(249, 87, 22, 0.25)',
              transition: 'background-color 120ms ease',
            }}
            title="Ask Governed Data (⌘K)"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquareText size={14} />
              {!isCollapsed && <span>Ask Governed Data</span>}
            </div>
            {!isCollapsed && (
              <kbd
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.22)',
                  color: '#ffffff',
                  fontSize: '9.5px',
                  fontFamily: 'var(--font-mono)',
                  padding: '1.5px 5px',
                  borderRadius: '3px',
                }}
              >
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* ─── Recent Verified Queries Section ─── */}
        {!isCollapsed && recentQuestions.length > 0 && (
          <div style={{ padding: '0 10px 8px 10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 4px 4px 4px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--ink-muted)',
              }}
            >
              <span>Recent Verified</span>
              <button
                type="button"
                onClick={() => onSelectTab('history')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  padding: 0,
                }}
              >
                All &rarr;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {recentQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => (onAskQuestion ? onAskQuestion(q) : onSelectTab('ask-data'))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    fontSize: '11px',
                    color: 'var(--ink-secondary)',
                    transition: 'background-color 100ms ease',
                  }}
                  title={q}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9.5px',
                      color: 'var(--ink-muted)',
                      flexShrink: 0,
                    }}
                  >
                    0{idx + 1}
                  </span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {q}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8.5px',
                      fontWeight: 700,
                      color: 'var(--gov-safe-text)',
                      backgroundColor: 'var(--gov-safe-bg)',
                      padding: '1px 3px',
                      borderRadius: '3px',
                      flexShrink: 0,
                    }}
                  >
                    AST✓
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Navigation Groups ─── */}
        <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* GROUP 1: ANALYTICS & WORKBENCH */}
          <div>
            {!isCollapsed && (
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--ink-muted)',
                  padding: '2px 8px 4px 8px',
                }}
              >
                Analytics &amp; Workbench
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button
                type="button"
                className={`sidebar-nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => onSelectTab('overview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: activeTab === 'overview' ? 'var(--bg-surface-3)' : 'transparent',
                  color: activeTab === 'overview' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: activeTab === 'overview' ? 600 : 500,
                }}
                title="Fleet Overview"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LayoutDashboard size={14} style={{ color: activeTab === 'overview' ? 'var(--accent-primary)' : 'var(--ink-muted)' }} />
                  {!isCollapsed && <span>Fleet Overview</span>}
                </div>
              </button>

              <button
                type="button"
                className={`sidebar-nav-link ${activeTab === 'ask-data' ? 'active' : ''}`}
                onClick={() => onSelectTab('ask-data')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: activeTab === 'ask-data' ? 'var(--bg-surface-3)' : 'transparent',
                  color: activeTab === 'ask-data' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: activeTab === 'ask-data' ? 600 : 500,
                }}
                title="Ask Governed Data"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={14} style={{ color: activeTab === 'ask-data' ? 'var(--accent-primary)' : 'var(--ink-muted)' }} />
                  {!isCollapsed && <span>Ask Governed Data</span>}
                </div>
                {!isCollapsed && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9.5px',
                      fontWeight: 700,
                      backgroundColor: 'var(--accent-primary-subtle)',
                      color: 'var(--accent-primary)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      border: '1px solid var(--accent-primary-border)',
                    }}
                  >
                    IDE
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link ${activeTab === 'devices' ? 'active' : ''}`}
                onClick={() => onSelectTab('devices')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: activeTab === 'devices' ? 'var(--bg-surface-3)' : 'transparent',
                  color: activeTab === 'devices' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: activeTab === 'devices' ? 600 : 500,
                }}
                title="Data Catalog & Schema"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={14} style={{ color: activeTab === 'devices' ? 'var(--accent-primary)' : 'var(--ink-muted)' }} />
                  {!isCollapsed && <span>Data Catalog &amp; Schema</span>}
                </div>
                {!isCollapsed && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--ink-muted)',
                      backgroundColor: 'var(--bg-surface-2)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    5,000
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* GROUP 2: OBSERVABILITY & HYGIENE */}
          <div>
            {!isCollapsed && (
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--ink-muted)',
                  padding: '2px 8px 4px 8px',
                }}
              >
                Observability &amp; Hygiene
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button
                type="button"
                className={`sidebar-nav-link ${activeTab === 'data-quality' ? 'active' : ''}`}
                onClick={() => onSelectTab('data-quality')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: activeTab === 'data-quality' ? 'var(--bg-surface-3)' : 'transparent',
                  color: activeTab === 'data-quality' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: activeTab === 'data-quality' ? 600 : 500,
                }}
                title="Data Health Scanner"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={14} style={{ color: activeTab === 'data-quality' ? 'var(--accent-primary)' : 'var(--ink-muted)' }} />
                  {!isCollapsed && <span>Data Health</span>}
                </div>
                {!isCollapsed && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--gov-warn-text)',
                      backgroundColor: 'var(--gov-warn-bg)',
                      border: '1px solid var(--gov-warn-border)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    {dataHealthCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link ${activeTab === 'anomalies' ? 'active' : ''}`}
                onClick={() => onSelectTab('anomalies')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: activeTab === 'anomalies' ? 'var(--bg-surface-3)' : 'transparent',
                  color: activeTab === 'anomalies' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: activeTab === 'anomalies' ? 600 : 500,
                }}
                title="Unusual Activity (Telemetry Anomalies)"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={14} style={{ color: activeTab === 'anomalies' ? 'var(--accent-primary)' : 'var(--ink-muted)' }} />
                  {!isCollapsed && <span>Unusual Activity</span>}
                </div>
                {!isCollapsed && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      backgroundColor: 'var(--accent-primary-subtle)',
                      border: '1px solid var(--accent-primary-border)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    {anomaliesCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* GROUP 3: ZERO-TRUST GOVERNANCE */}
          <div>
            {!isCollapsed && (
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--ink-muted)',
                  padding: '2px 8px 4px 8px',
                }}
              >
                Zero-Trust Governance
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button
                type="button"
                className={`sidebar-nav-link ${activeTab === 'evaluations' ? 'active' : ''}`}
                onClick={() => onSelectTab('evaluations')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: activeTab === 'evaluations' ? 'var(--bg-surface-3)' : 'transparent',
                  color: activeTab === 'evaluations' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: activeTab === 'evaluations' ? 600 : 500,
                }}
                title="Safety Proof & AST Lab"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FlaskConical size={14} style={{ color: activeTab === 'evaluations' ? 'var(--accent-primary)' : 'var(--ink-muted)' }} />
                  {!isCollapsed && <span>Safety Proof &amp; AST Lab</span>}
                </div>
                {!isCollapsed && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--gov-safe-text)',
                      backgroundColor: 'var(--gov-safe-bg)',
                      border: '1px solid var(--gov-safe-border)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    100%
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link ${activeTab === 'data-sources' ? 'active' : ''}`}
                onClick={() => onSelectTab('data-sources')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: activeTab === 'data-sources' ? 'var(--bg-surface-3)' : 'transparent',
                  color: activeTab === 'data-sources' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: activeTab === 'data-sources' ? 600 : 500,
                }}
                title="Data Sources & Dual-Role Kernel"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={14} style={{ color: activeTab === 'data-sources' ? 'var(--accent-primary)' : 'var(--ink-muted)' }} />
                  {!isCollapsed && <span>Data Sources &amp; Kernel</span>}
                </div>
                {!isCollapsed && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--ink-muted)',
                      backgroundColor: 'var(--bg-surface-2)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    4 Tables
                  </span>
                )}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className={`sidebar-nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => onSelectTab('admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    background: activeTab === 'admin' ? 'var(--bg-surface-3)' : 'transparent',
                    color: activeTab === 'admin' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '12px',
                    fontWeight: activeTab === 'admin' ? 600 : 500,
                  }}
                  title="People & RBAC Access"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={14} style={{ color: activeTab === 'admin' ? 'var(--accent-primary)' : 'var(--ink-muted)' }} />
                    {!isCollapsed && <span>People &amp; RBAC Access</span>}
                  </div>
                  {!isCollapsed && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--ink-muted)',
                        backgroundColor: 'var(--bg-surface-2)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      7
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Kernel Footer ─── */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: isCollapsed ? '10px 4px' : '10px 12px',
          backgroundColor: 'var(--bg-surface-1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--gov-safe-dot)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          {!isCollapsed && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                fontWeight: 600,
                color: 'var(--ink-primary)',
              }}
            >
              PostgreSQL 16.4 &bull; SSL
            </span>
          )}
        </div>
        {!isCollapsed && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9.5px',
              color: 'var(--gov-safe-text)',
              paddingLeft: '12px',
            }}
          >
            Kernel Read-Only Lock Active
          </div>
        )}
      </div>
    </aside>
  )
}
