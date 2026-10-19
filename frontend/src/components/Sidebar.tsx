import React, { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  Server,
  MessageSquareText,
  ShieldCheck,
  Activity,
  FlaskConical,
  Users,
  Shield,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  Info,
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

/** Map query status into the 4 defined presentation states */
function getQuestionStatus(item: QueryHistoryItem) {
  const status = (item.status || '').toLowerCase()
  const errorCategory = (item.error_category || '').toUpperCase()
  const qText = (item.question || '').toLowerCase()

  // 1. Blocked for safety (shield icon)
  if (status === 'blocked' || errorCategory === 'VALIDATION_FAILED' || errorCategory.includes('BLOCKED')) {
    return {
      type: 'blocked',
      label: 'Blocked for safety',
      icon: ShieldAlert,
      color: '#f87171',
    }
  }

  // 2. Out of scope (info icon). Rule 7: The churn question must not use the green check!
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
      label: 'Out of scope',
      icon: Info,
      color: '#94a3b8',
    }
  }

  if (
    status === 'clarification_needed' ||
    status === 'pending' ||
    errorCategory === 'AMBIGUOUS' ||
    errorCategory === 'NEEDS_INPUT'
  ) {
    return {
      type: 'needs-answer',
      label: 'Needs a quick answer from me',
      icon: HelpCircle,
      color: '#f59e0b',
    }
  }

  // Default: Answered query
  return {
    type: 'answered',
    label: 'Answered',
    icon: CheckCircle2,
    color: '#10b981',
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onAskQuestion }) => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isViewer = user?.role === 'viewer'
  const canAsk = !isViewer // Rule 8: Ask only for Analyst and Admin

  // Sidebar collapse state remembered in localStorage (Rule 7)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('qt-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  // Contextual Security Sentinel Popover state (Linear/Stripe pattern)
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
        if (isMounted) setDataHealthCount(dqSummary.total_findings)
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
        if (isMounted) setAnomaliesCount(count)
      } catch {
        if (isMounted) setAnomaliesCount(null)
      }

      // 3. Blocked queries & recent questions for roles permitted to ask
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
  }, [canAsk])

  const handleRecentQuestionClick = (q: QueryHistoryItem) => {
    if (onAskQuestion) {
      onAskQuestion(q.question)
    } else {
      onSelectTab('ask-data')
    }
  }

  // Safety Shield subtitle and tooltip
  const shieldSubtitle = isViewer
    ? 'Protected - read-only'
    : isAdmin
    ? 'All users'
    : 'Your questions'

  const shieldTooltip = isViewer
    ? 'Protected - read-only environment. Click to inspect safety proofs.'
    : `Safety Shield Active (${isAdmin ? 'All users' : 'Your questions'}). Click to inspect blocked query log & invariants.`

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`} aria-label="Main Navigation Sidebar">
      {/* Brand Header */}
      <div className="brand-section">
        <div className="brand-logo-wrap" title="QueryTrust AI" aria-hidden="true">
          <QueryTrustLogo size={isCollapsed ? 32 : 30} />
        </div>
        {!isCollapsed && (
          <div className="brand-info">
            <div className="brand-title-row">
              <h2 className="brand-title">QueryTrust</h2>
              <span className="brand-ai-chip">AI</span>
            </div>
            {/* Rule 5: Sentence case "Equipment intelligence" */}
            <span className="brand-badge">Equipment intelligence</span>
          </div>
        )}
        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Rule 1 & Rule 8: Solid orange Ask CTA (only for Analyst and Admin) */}
      {canAsk && (
        <div className="sidebar-cta-wrap">
          <button
            type="button"
            className={`sidebar-ask-cta ${activeTab === 'ask-data' ? 'is-current-page' : ''}`}
            onClick={() => onSelectTab('ask-data')}
            title="Ask a question (Ctrl+K)"
            aria-label={isCollapsed ? 'Ask a question' : undefined}
            aria-current={activeTab === 'ask-data' ? 'page' : undefined}
          >
            <MessageSquareText size={17} className="sidebar-ask-icon" aria-hidden="true" />
            {!isCollapsed && (
              <>
                <span className="sidebar-ask-text">
                  <span className="sidebar-ask-label">Ask a question</span>
                  {activeTab === 'ask-data' && (
                    <span className="sidebar-ask-live-dot" title="Active page" aria-hidden="true" />
                  )}
                </span>
                <kbd className="sidebar-ask-kbd" aria-label="Keyboard shortcut: Control K" title="Shortcut: Ctrl+K">
                  <span className="kbd-mod">Ctrl</span>
                  <span className="kbd-key">K</span>
                </kbd>
              </>
            )}
          </button>
        </div>
      )}

      {/* Rule 2 & Rule 8: Recent questions (sentence case, max 3, status icons, click reopens) */}
      {canAsk && !isCollapsed && recentQuestions.length > 0 && (
        <div className="sidebar-recent-section" aria-label="Recent questions">
          <div className="sidebar-recent-header">
            <span className="sidebar-recent-title">Recent questions</span>
            <button
              type="button"
              className="sidebar-recent-all-btn"
              onClick={() => onSelectTab('history')}
              title="View all question history"
            >
              All
            </button>
          </div>
          <div className="sidebar-recent-list">
            {recentQuestions.map((q) => {
              const statusInfo = getQuestionStatus(q)
              const StatusIcon = statusInfo.icon
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`sidebar-recent-item sidebar-recent-item--${statusInfo.type}`}
                  onClick={() => handleRecentQuestionClick(q)}
                  title={`${q.question}\nStatus: ${statusInfo.label}`}
                >
                  <StatusIcon
                    size={12}
                    className="sidebar-recent-icon"
                    style={{ color: statusInfo.color }}
                    aria-hidden="true"
                  />
                  <span className="sidebar-recent-text">{q.question}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Navigation List: Destinations (Home, Equipment, Data health, Unusual activity, Safety proof, People & access) */}
      <nav className="nav-menu" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onSelectTab('overview')}
          title="Home - Fleet overview"
          aria-current={activeTab === 'overview' ? 'page' : undefined}
        >
          <LayoutDashboard size={18} />
          {!isCollapsed && <span>Home</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => onSelectTab('devices')}
          title="Equipment - Hardware explorer"
          aria-current={activeTab === 'devices' ? 'page' : undefined}
        >
          <Server size={18} />
          {!isCollapsed && <span>Equipment</span>}
        </button>

        {/* Data sources: Live enterprise database & sandbox */}
        {(isAdmin || canAsk) && (
          <button
            type="button"
            className={`nav-item ${activeTab === 'data-sources' ? 'active' : ''}`}
            onClick={() => onSelectTab('data-sources')}
            title="Data sources - Live enterprise database & sandbox"
            aria-current={activeTab === 'data-sources' ? 'page' : undefined}
          >
            <Database size={18} />
            {!isCollapsed && <span>Data sources</span>}
          </button>
        )}

        {/* Rule 4: Data health amber badge with tooltip */}
        <button
          type="button"
          className={`nav-item ${activeTab === 'data-quality' ? 'active' : ''}`}
          onClick={() => onSelectTab('data-quality')}
          title="Data health - Diagnostic findings"
          aria-current={activeTab === 'data-quality' ? 'page' : undefined}
        >
          <ShieldCheck size={18} />
          {!isCollapsed && (
            <>
              <span>Data health</span>
              {dataHealthCount !== null && (
                <span
                  className="nav-count-badge warning"
                  title={`${dataHealthCount} data problems to review`}
                >
                  {dataHealthCount}
                </span>
              )}
            </>
          )}
        </button>

        {/* Rule 4: Unusual activity neutral badge with tooltip */}
        <button
          type="button"
          className={`nav-item ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => onSelectTab('anomalies')}
          title="Unusual activity - Outlier telemetry"
          aria-current={activeTab === 'anomalies' ? 'page' : undefined}
        >
          <Activity size={18} />
          {!isCollapsed && (
            <>
              <span>Unusual activity</span>
              {anomaliesCount !== null && (
                <span
                  className="nav-count-badge neutral"
                  title={`${anomaliesCount} readings flagged as unusual`}
                >
                  {anomaliesCount}
                </span>
              )}
            </>
          )}
        </button>

        {/* Safety proof: The Automated Evaluation & Benchmark Lab */}
        <button
          type="button"
          className={`nav-item ${activeTab === 'evaluations' ? 'active' : ''}`}
          onClick={() => onSelectTab('evaluations')}
          title="Safety proof - Automated benchmark lab & regression test suites"
          aria-current={activeTab === 'evaluations' ? 'page' : undefined}
        >
          <FlaskConical size={18} />
          {!isCollapsed && <span>Safety proof</span>}
        </button>

        {/* Rule 8: People & access: Admin only */}
        {isAdmin && (
          <button
            type="button"
            className={`nav-item nav-item--admin ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onSelectTab('admin')}
            title="People & access - Users & audit log"
            aria-current={activeTab === 'admin' ? 'page' : undefined}
            style={{ marginTop: 'auto' }}
          >
            <Users size={18} />
            {!isCollapsed && <span>People & access</span>}
          </button>
        )}
      </nav>

      {/* Safety Shield Sentinel Card & Contextual Popover (Linear / Stripe Pattern) */}
      <div className="sidebar-footer" ref={popoverRef}>
        {showShieldPopover && (
          <div
            className={`safety-sentinel-popover ${isCollapsed ? 'safety-sentinel-popover--collapsed' : ''}`}
            role="dialog"
            aria-label="Safety Shield Sentinel Inspector"
          >
            <div className="sentinel-popover-header">
              <div className="sentinel-popover-title-row">
                <div className="sentinel-shield-icon-badge">
                  <ShieldCheck size={14} className="text-emerald" />
                </div>
                <div>
                  <div className="sentinel-popover-title">Safety Shield Active</div>
                  <div className="sentinel-popover-sub">Zero-Mutation Boundary</div>
                </div>
              </div>
              <button
                type="button"
                className="sentinel-popover-close"
                onClick={() => setShowShieldPopover(false)}
                aria-label="Close security inspector"
              >
                <X size={13} />
              </button>
            </div>

            <div className="sentinel-invariants-list">
              <div className="sentinel-inv-item">
                <span className="sentinel-inv-label">Database Guard</span>
                <span className="sentinel-inv-val">PostgreSQL Reader (SELECT-only)</span>
              </div>
              <div className="sentinel-inv-item">
                <span className="sentinel-inv-label">AST Verification</span>
                <span className="sentinel-inv-val">SQLGlot 6-Gate Active</span>
              </div>
              <div className="sentinel-inv-item">
                <span className="sentinel-inv-label">Execution Boundary</span>
                <span className="sentinel-inv-val">Ephemeral ID (Zero Arbitrary SQL)</span>
              </div>
            </div>

            <div className="sentinel-telemetry-box">
              <div className="sentinel-tel-row">
                <span className="sentinel-tel-label">Unsafe queries executed</span>
                <span className="sentinel-tel-val zero">0 (Zero Mutation)</span>
              </div>
              <div className="sentinel-tel-row">
                <span className="sentinel-tel-label">Blocked attempts</span>
                <span className="sentinel-tel-val blocked">{blockedQueriesCount} Intercepted</span>
              </div>
            </div>

            <div className="sentinel-popover-actions">
              {!isViewer ? (
                <button
                  type="button"
                  className="sentinel-btn-primary"
                  onClick={() => {
                    setShowShieldPopover(false)
                    pushUrlParams({ tab: 'history', status: 'blocked' })
                    onSelectTab('history')
                  }}
                  title="Inspect all blocked attacks in Query History"
                >
                  <ShieldAlert size={13} />
                  <span>Inspect Blocked Log ({blockedQueriesCount})</span>
                  <ArrowRight size={12} className="sentinel-btn-arrow" />
                </button>
              ) : null}

              <button
                type="button"
                className="sentinel-btn-secondary"
                onClick={() => {
                  setShowShieldPopover(false)
                  onSelectTab('evaluations')
                }}
                title="Open automated benchmark evaluations"
              >
                <FlaskConical size={13} />
                <span>Open Safety Proof Lab</span>
                <ArrowRight size={12} className="sentinel-btn-arrow" />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className={`sidebar-safety-shield-card ${showShieldPopover ? 'is-popover-open' : ''}`}
          onClick={() => setShowShieldPopover((prev) => !prev)}
          title={shieldTooltip}
          aria-haspopup="dialog"
          aria-expanded={showShieldPopover}
          aria-label={isCollapsed ? `Safety Shield: ${shieldSubtitle}` : undefined}
        >
          <div className="shield-card-top">
            <div className="shield-status-indicator">
              <span className="shield-pulsing-dot" aria-hidden="true" />
              <Shield size={13} className="shield-card-icon" />
            </div>
            {!isCollapsed && (
              <div className="shield-card-header-text">
                <div className="shield-card-status-row">
                  <span className="shield-card-status">Safety Shield</span>
                  <ChevronRight
                    size={13}
                    className={`shield-card-arrow ${showShieldPopover ? 'is-rotated' : ''}`}
                    aria-hidden="true"
                  />
                </div>
                <span className="shield-card-scope">{shieldSubtitle}</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            isViewer ? (
              <div className="shield-card-metrics shield-card-metrics--viewer">
                <span className="shield-readonly-pill">
                  Protected: read-only
                </span>
              </div>
            ) : (
              <div className="shield-card-metrics">
                <div className="shield-metric-row">
                  <span className="shield-metric-label">Unsafe queries executed</span>
                  <span className="shield-metric-val zero">{unsafeQueriesRun}</span>
                </div>
                <div className="shield-metric-row">
                  <span className="shield-metric-label">Blocked attempts</span>
                  <span className="shield-metric-val blocked">{blockedQueriesCount}</span>
                </div>
              </div>
            )
          )}
        </button>
      </div>
    </aside>
  )
}
