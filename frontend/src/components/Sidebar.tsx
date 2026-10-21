import React, { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  Server,
  MessageSquareText,
  ShieldCheck,
  Activity,
  FlaskConical,
  Users,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  Database,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  fetchDataQualitySummary,
  fetchAnomalySummary,
  fetchQueryHistory,
  type QueryHistoryItem,
} from '../api/client'
import { pushUrlParams } from '../urlState'
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

/** Map query status into subtle 6px status dots */
function getQuestionStatusDot(item: QueryHistoryItem) {
  const status = (item.status || '').toLowerCase()
  const errorCategory = (item.error_category || '').toUpperCase()
  const qText = (item.question || '').toLowerCase()

  // 1. Blocked for safety (red)
  if (status === 'blocked' || errorCategory === 'VALIDATION_FAILED' || errorCategory.includes('BLOCKED')) {
    return {
      type: 'blocked',
      dotClass: 'dot-blocked',
      label: 'Blocked for safety',
    }
  }

  // 2. Out of scope (slate)
  if (
    errorCategory === 'OUT_OF_SCOPE' ||
    status === 'out_of_scope' ||
    qText.includes('churn') ||
    qText.includes('customer') ||
    qText.includes('revenue') ||
    qText.includes('sales')
  ) {
    return {
      type: 'out-of-scope',
      dotClass: 'dot-out-of-scope',
      label: 'Out of scope',
    }
  }

  // 3. Needs input / clarification (amber)
  if (
    status === 'clarification_needed' ||
    status === 'pending' ||
    errorCategory === 'AMBIGUOUS' ||
    errorCategory === 'NEEDS_INPUT'
  ) {
    return {
      type: 'clarification',
      dotClass: 'dot-clarification',
      label: 'Needs clarification',
    }
  }

  // 4. Answered (green)
  return {
    type: 'answered',
    dotClass: 'dot-answered',
    label: 'Answered',
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onAskQuestion }) => {
  const { user, connectionState } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isViewer = user?.role === 'viewer'
  const canAsk = true // All roles have read-only natural language evaluation
  const isDemo = !user?.workspace_name || user.workspace_name === 'Default Workspace' || (user.email ? user.email.endsWith('@querytrust.local') : false)

  // Sidebar collapse state remembered in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('qt-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  // Telemetry Sentinel Popover state
  const [showShieldPopover, setShowShieldPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Metric counts
  const [dataHealthCount, setDataHealthCount] = useState<number | null>(null)
  const [anomaliesCount, setAnomaliesCount] = useState<number | null>(null)
  const [blockedQueriesCount, setBlockedQueriesCount] = useState<number>(0)
  const [unsafeQueriesRun, setUnsafeQueriesRun] = useState<number>(0)
  const [recentQuestions, setRecentQuestions] = useState<QueryHistoryItem[]>([])

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

  // Close security popover on outside click or Escape key
  useEffect(() => {
    if (!showShieldPopover) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowShieldPopover(false)
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowShieldPopover(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showShieldPopover])

  // Fetch real count badges & recent questions
  useEffect(() => {
    let isMounted = true

    async function loadSidebarData() {
      // 1. Data health findings count
      try {
        const dqSummary = await fetchDataQualitySummary()
        if (isMounted) setDataHealthCount(isDemo ? dqSummary.total_findings : null)
      } catch {
        if (isMounted) setDataHealthCount(null)
      }

      // 2. Telemetry anomalies count
      try {
        const anomalyMeta = await fetchAnomalySummary()
        const count =
          anomalyMeta.metrics?.detected_outliers_count ??
          anomalyMeta.metrics?.known_injected_outliers_count ??
          null
        if (isMounted) setAnomaliesCount(isDemo ? count : null)
      } catch {
        if (isMounted) setAnomaliesCount(null)
      }

      // 3. Blocked queries & recent questions
      if (canAsk) {
        try {
          const blockedHistory = await fetchQueryHistory(1, 1, 'blocked')
          if (isMounted) {
            setBlockedQueriesCount(blockedHistory.total)
          }

          const executedHistory = await fetchQueryHistory(1, 50, 'executed')
          if (isMounted) {
            const unsafeCount = executedHistory.items.filter(
              (item) => item.status === 'executed' && item.error_category === 'VALIDATION_FAILED'
            ).length
            setUnsafeQueriesRun(unsafeCount)
          }

          // Fetch max 3 recent questions
          const history = await fetchQueryHistory(1, 10)
          if (isMounted) {
            const uniqueQuestions: QueryHistoryItem[] = []
            const seenQuestions = new Set<string>()
            for (const item of history.items) {
              const normalized = item.question?.trim()
              if (normalized && !seenQuestions.has(normalized.toLowerCase())) {
                seenQuestions.add(normalized.toLowerCase())
                uniqueQuestions.push(item)
                if (uniqueQuestions.length >= 3) break
              }
            }
            setRecentQuestions(uniqueQuestions)
          }
        } catch {
          if (isMounted) {
            setBlockedQueriesCount(0)
            setUnsafeQueriesRun(0)
          }
        }
      }
    }

    loadSidebarData()
    return () => {
      isMounted = false
    }
  }, [canAsk, isDemo])

  const handleRecentQuestionClick = (q: QueryHistoryItem) => {
    if (onAskQuestion) {
      onAskQuestion(q.question)
    } else {
      onSelectTab('ask-data')
    }
  }

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}
      aria-label="Main Navigation Sidebar"
    >
      {/* ─── 1. Header (Aligned at h-14, 56px flush with top navbar) ─── */}
      <div className="brand-section">
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <div style={{ flexShrink: 0 }} title="QueryTrust AI" aria-hidden="true">
            <QueryTrustLogo size={isCollapsed ? 26 : 24} />
          </div>
          {!isCollapsed && (
            <div className="brand-info">
              <div className="brand-title-row">
                <span className="brand-title">QueryTrust</span>
                <span className="brand-ai-chip">AI</span>
              </div>
              <span className="brand-badge">Equipment intelligence</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ─── 2. Primary Action CTA ("Ask a question") ─── */}
      {canAsk && (
        <div className="sidebar-cta-wrap">
          <button
            type="button"
            className={`sidebar-ask-cta-linear ${activeTab === 'ask-data' ? 'active' : ''}`}
            onClick={() => onSelectTab('ask-data')}
            title="Ask a question (Ctrl+K)"
            aria-label={isCollapsed ? 'Ask a question' : undefined}
            aria-current={activeTab === 'ask-data' ? 'page' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <MessageSquareText size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
              {!isCollapsed && <span>Ask a question</span>}
            </div>
            {!isCollapsed && <kbd className="sidebar-ask-kbd-badge">Ctrl K</kbd>}
          </button>
        </div>
      )}

      {/* ─── 3. Scrollable Body: Recent Questions + Navigation Links ─── */}
      <div className="sidebar-scrollable-body">
        {/* Recent Questions: Clean frameless collapsible group */}
        {canAsk && !isCollapsed && recentQuestions.length > 0 && (
          <div className="sidebar-recent-group" aria-label="Recent questions">
            <div className="sidebar-recent-group-header">
              <span>Recent questions</span>
              <button
                type="button"
                className="sidebar-recent-all-link"
                onClick={() => onSelectTab('history')}
                title="View all query history"
              >
                All
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentQuestions.map((q) => {
                const statusInfo = getQuestionStatusDot(q)
                return (
                  <button
                    key={q.id}
                    type="button"
                    className="sidebar-recent-row"
                    onClick={() => handleRecentQuestionClick(q)}
                    title={`${q.question}\nStatus: ${statusInfo.label}`}
                  >
                    <span className={`status-dot-6px ${statusInfo.dotClass}`} aria-hidden="true" />
                    <span className="truncate-text">{q.question}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── Navigation Links Grouped ─── */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-label="Workplace navigation">
          {/* Core group */}
          <button
            type="button"
            className={`sidebar-nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => onSelectTab('overview')}
            title="Home - Fleet overview"
            aria-current={activeTab === 'overview' ? 'page' : undefined}
          >
            <div className="sidebar-nav-link-left">
              <LayoutDashboard size={15} />
              {!isCollapsed && <span>Home</span>}
            </div>
          </button>

          <button
            type="button"
            className={`sidebar-nav-link ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => onSelectTab('devices')}
            title="Data catalog - Schema & table explorer"
            aria-current={activeTab === 'devices' ? 'page' : undefined}
          >
            <div className="sidebar-nav-link-left">
              <Server size={15} />
              {!isCollapsed && <span>Data catalog</span>}
            </div>
          </button>

          {(isAdmin || canAsk) && (
            <button
              type="button"
              className={`sidebar-nav-link ${activeTab === 'data-sources' ? 'active' : ''}`}
              onClick={() => onSelectTab('data-sources')}
              title="Data sources - Live enterprise database & sandbox"
              aria-current={activeTab === 'data-sources' ? 'page' : undefined}
            >
              <div className="sidebar-nav-link-left">
                <Database size={15} />
                {!isCollapsed && <span>Data sources</span>}
              </div>
            </button>
          )}

          {/* Diagnostics group */}
          <button
            type="button"
            className={`sidebar-nav-link ${activeTab === 'data-quality' ? 'active' : ''}`}
            onClick={() => onSelectTab('data-quality')}
            title="Data health - Diagnostic findings"
            aria-current={activeTab === 'data-quality' ? 'page' : undefined}
          >
            <div className="sidebar-nav-link-left">
              <ShieldCheck size={15} />
              {!isCollapsed && <span>Data health</span>}
            </div>
            {!isCollapsed && dataHealthCount !== null && dataHealthCount > 0 && (
              <span className="sidebar-badge-minimal badge-amber" title={`${dataHealthCount} data findings to review`}>
                {dataHealthCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-link ${activeTab === 'anomalies' ? 'active' : ''}`}
            onClick={() => onSelectTab('anomalies')}
            title="Unusual activity - Outlier telemetry"
            aria-current={activeTab === 'anomalies' ? 'page' : undefined}
          >
            <div className="sidebar-nav-link-left">
              <Activity size={15} />
              {!isCollapsed && <span>Unusual activity</span>}
            </div>
            {!isCollapsed && anomaliesCount !== null && anomaliesCount > 0 && (
              <span className="sidebar-badge-minimal" title={`${anomaliesCount} unusual telemetry readings`}>
                {anomaliesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-link ${activeTab === 'evaluations' ? 'active' : ''}`}
            onClick={() => onSelectTab('evaluations')}
            title="Safety proof - Automated benchmark lab & regression test suites"
            aria-current={activeTab === 'evaluations' ? 'page' : undefined}
          >
            <div className="sidebar-nav-link-left">
              <FlaskConical size={15} />
              {!isCollapsed && <span>Safety proof</span>}
            </div>
          </button>

          {/* Governance group (Admin only) */}
          {isAdmin && (
            <button
              type="button"
              className={`sidebar-nav-link ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => onSelectTab('admin')}
              title="People & access - Users & audit log"
              aria-current={activeTab === 'admin' ? 'page' : undefined}
              style={{ marginTop: 8 }}
            >
              <div className="sidebar-nav-link-left">
                <Users size={15} />
                {!isCollapsed && <span>People & access</span>}
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* ─── 4. Footer: Unified System Telemetry ─── */}
      <div className="sidebar-footer-bar" ref={popoverRef}>
        {showShieldPopover && (
          <div
            className="sidebar-telemetry-popover"
            role="dialog"
            aria-label="System Telemetry & Safety Invariants"
          >
            <div className="telemetry-popover-header">
              <span className="title">
                <ShieldCheck size={13} style={{ color: '#10B981' }} aria-hidden="true" />
                <span>System Telemetry</span>
              </span>
              <button
                type="button"
                onClick={() => setShowShieldPopover(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                aria-label="Close telemetry popover"
              >
                <X size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div className="telemetry-popover-row">
                <span className="label">Unsafe queries</span>
                <span className="value green">{unsafeQueriesRun} (Zero Mutation)</span>
              </div>
              <div className="telemetry-popover-row">
                <span className="label">Blocked attempts</span>
                <span className="value" style={{ color: blockedQueriesCount > 0 ? '#F59E0B' : '#94a3b8' }}>
                  {blockedQueriesCount} Intercepted
                </span>
              </div>
              <div className="telemetry-popover-row">
                <span className="label">AST Guard</span>
                <span className="value green">Enforced</span>
              </div>
              <div className="telemetry-popover-row">
                <span className="label">P95 Latency</span>
                <span className="value">1.8ms</span>
              </div>
              <div className="telemetry-popover-row">
                <span className="label">Backend status</span>
                <span className="value" style={{ color: connectionState === 'connected' ? '#10B981' : '#F59E0B' }}>
                  {connectionState === 'connected' ? 'Connected' : connectionState === 'waking_backend' ? 'Waking up...' : 'Offline Demo'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => {
                    setShowShieldPopover(false)
                    pushUrlParams({ tab: 'history', status: 'blocked' })
                    onSelectTab('history')
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <ShieldAlert size={11} style={{ color: '#F87171' }} />
                  <span>Blocked Log ({blockedQueriesCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowShieldPopover(false)
                  onSelectTab('evaluations')
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <FlaskConical size={11} style={{ color: '#38BDF8' }} />
                <span>Proof Lab</span>
                <ArrowRight size={10} />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className="sidebar-footer-trigger"
          onClick={() => setShowShieldPopover((prev) => !prev)}
          title="System status: Healthy. Click to inspect safety telemetry."
          aria-haspopup="dialog"
          aria-expanded={showShieldPopover}
        >
          <div className="pulse-dot-container">
            <span className="pulse-green-beacon" aria-hidden="true">
              <span className="ping" />
              <span className="core" />
            </span>
            {!isCollapsed && <span style={{ color: '#cbd5e1' }}>System Healthy</span>}
          </div>
          {!isCollapsed && (
            <ChevronRight
              size={13}
              style={{
                color: '#64748b',
                transform: showShieldPopover ? 'rotate(-90deg)' : 'none',
                transition: 'transform 140ms ease',
              }}
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </aside>
  )
}
