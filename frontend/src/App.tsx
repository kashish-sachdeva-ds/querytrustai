import React, { Suspense, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  FlaskConical,
  History,
  LayoutDashboard,
  MessageSquareText,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  User,
  Eye,
  Table,
  Moon,
  Sparkles,
  Database,
} from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import { LoginPage } from './components/LoginPage'
import { LandingPage } from './components/LandingPage'
import { OnboardingModal } from './components/OnboardingModal'
import { Sidebar, type ActiveTab } from './components/Sidebar'
import { Header } from './components/Header'
import { ColdStartBanner } from './components/ColdStartBanner'
import { ViewShimmerSkeleton } from './components/ViewShimmerSkeleton'
import { CommandPalette, type CommandPaletteAction } from './components/CommandPalette'
import { withLayoutTransition } from './motion'
import { pushUrlParams, readUrlParam } from './urlState'
import { NotFoundPage } from './components/NotFoundPage'
import { ApiFailureToast } from './components/ApiFailureToast'
import { NoiseOverlay } from './components/NoiseOverlay'
import './ProductExperience.css'

// Code-split all 8 primary workbench views
const OverviewView = React.lazy(() => import('./components/OverviewView').then((m) => ({ default: m.OverviewView })))
const DevicesView = React.lazy(() => import('./components/DevicesView').then((m) => ({ default: m.DevicesView })))
const AskDataView = React.lazy(() => import('./components/AskDataView').then((m) => ({ default: m.AskDataView })))
const DataSourcesView = React.lazy(() => import('./components/DataSourcesView').then((m) => ({ default: m.DataSourcesView })))
const AdminView = React.lazy(() => import('./components/AdminView').then((m) => ({ default: m.AdminView })))
const DataQualityView = React.lazy(() => import('./components/DataQualityView').then((m) => ({ default: m.DataQualityView })))
const AnomalyMonitorView = React.lazy(() => import('./components/AnomalyMonitorView').then((m) => ({ default: m.AnomalyMonitorView })))
const QueryHistoryView = React.lazy(() => import('./components/QueryHistoryView').then((m) => ({ default: m.QueryHistoryView })))
const EvaluationLabView = React.lazy(() => import('./components/EvaluationLabView'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const tabs: ActiveTab[] = [
  'overview',
  'devices',
  'ask-data',
  'data-sources',
  'data-quality',
  'anomalies',
  'history',
  'evaluations',
  'admin',
]

const getTabFromUrl = (): ActiveTab => {
  const value = readUrlParam('tab')
  return value && tabs.includes(value as ActiveTab) ? (value as ActiveTab) : 'overview'
}

const AppShell: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout, enterDemoMode } = useAuth()
  const { theme, mode, toggleTheme, toggleMode } = useTheme()
  const [activeTab, setActiveTab] = useState<ActiveTab>(getTabFromUrl)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [pendingAskQuestion, setPendingAskQuestion] = useState<string | null>(null)
  const joinParam = readUrlParam('join') || readUrlParam('workspace')
  const [unauthView, setUnauthView] = useState<'landing' | 'login'>(() => {
    const tab = readUrlParam('tab')
    return tab === 'login' ? 'login' : 'landing'
  })
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)


  const selectTab = (tab: ActiveTab, params?: Record<string, string | number>) => {
    if (params) {
      pushUrlParams({ tab, ...params })
    } else if (tab === 'overview') {
      window.history.pushState({}, '', `${window.location.pathname}${window.location.hash}`)
    } else {
      pushUrlParams({ tab })
    }
    if (tab !== 'ask-data') setPendingAskQuestion(null)
    withLayoutTransition(() => setActiveTab(tab))
  }

  const openAskQuestion = (question: string) => {
    setPendingAskQuestion(question)
    selectTab('ask-data')
  }

  const openDevice = (deviceId: number) => {
    pushUrlParams({ tab: 'devices', device: deviceId })
    withLayoutTransition(() => setActiveTab('devices'))
  }

  useEffect(() => {
    const syncTabFromBrowserHistory = () => withLayoutTransition(() => setActiveTab(getTabFromUrl()))
    window.addEventListener('popstate', syncTabFromBrowserHistory)
    return () => window.removeEventListener('popstate', syncTabFromBrowserHistory)
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsCommandPaletteOpen((open) => !open)
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('querytrust:toggle-sidebar'))
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n' && !isInput) {
        event.preventDefault()
        selectTab('ask-data')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('querytrust:new-session'))
        }, 50)
      } else if (event.key === '?' && !isInput) {
        event.preventDefault()
        setIsOnboardingOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const commandActions = useMemo<CommandPaletteAction[]>(() => {
    const pageActions: CommandPaletteAction[] = [
      // Primary Navigation
      { id: 'overview', label: 'Fleet Overview', description: 'Live inventory, site telemetry, and service summary', icon: LayoutDashboard, keywords: ['dashboard', 'home', 'fleet'], run: () => selectTab('overview') },
      { id: 'ask-data', label: 'Ask Governed Data (IDE)', description: '3-pane SQL workbench with live 6-gate AST verification', icon: MessageSquareText, keywords: ['query', 'analytics', 'sql', 'ast', 'workbench', 'prompt'], run: () => selectTab('ask-data') },
      { id: 'devices', label: 'Data Catalog & Schema ERD', description: '5,000 assets inventory, schema graph, and table inspector', icon: Server, keywords: ['inventory', 'assets', 'devices', 'schema', 'erd'], run: () => selectTab('devices') },
      { id: 'data-quality', label: 'Data Health & Diagnostic Scanner', description: 'Review 6 deterministic integrity rules across 30,000 records', icon: ShieldCheck, keywords: ['diagnostics', 'findings', 'health', 'scan'], run: () => selectTab('data-quality') },
      { id: 'anomalies', label: 'Unusual Activity & Telemetry Outliers', description: 'Z-score and IQR distribution across 25,000 readings', icon: Activity, keywords: ['telemetry', 'isolation forest', 'outliers', 'anomalies'], run: () => selectTab('anomalies') },
      { id: 'evaluations', label: 'Safety Proof & AST Benchmark Lab', description: '37/37 red-team attack tests, ROI metrics, compliance audit', icon: FlaskConical, keywords: ['benchmark', 'regression', 'safety', 'proof', 'roi', 'red-team'], run: () => selectTab('evaluations') },
      { id: 'data-sources', label: 'Data Sources & Dual-Role Kernel', description: 'PostgreSQL connection pools, role privileges, and topology', icon: Database, keywords: ['database', 'postgres', 'connection', 'kernel', 'role', 'readonly'], run: () => selectTab('data-sources') },
      { id: 'history', label: 'Query History & Verification Audit', description: 'Inspect previously validated SQL executions and logs', icon: History, keywords: ['audit', 'queries', 'history'], run: () => selectTab('history') },

      // Instant Role Switching
      { id: 'role-admin', label: 'Switch Role: System Administrator', description: 'Full SQL + AST Inspector + Benchmark Runner + RBAC', icon: Users, keywords: ['admin', 'role', 'permissions', 'auth'], run: () => enterDemoMode('admin') },
      { id: 'role-analyst', label: 'Switch Role: Lead Data Analyst', description: 'NL-to-SQL workbench + Schema Introspection + Read-Only Execution', icon: User, keywords: ['analyst', 'role', 'permissions'], run: () => enterDemoMode('analyst') },
      { id: 'role-viewer', label: 'Switch Role: Operations Viewer', description: 'Governed plain English answers only (raw SQL masked)', icon: Eye, keywords: ['viewer', 'role', 'safe', 'mask'], run: () => enterDemoMode('viewer') },

      // Preset Governed Queries
      { id: 'query-warranties', label: 'Query: Hardware with warranties expiring < 30 days', description: 'Filter devices by warranty_expiration <= CURRENT_DATE + 30 days', icon: Sparkles, keywords: ['query', 'preset', 'warranty', 'devices'], run: () => {
        setPendingAskQuestion('Show all active devices with warranty expiring within 30 days')
        selectTab('ask-data')
      } },
      { id: 'query-high-temp', label: 'Query: High temperature routers with packet drops', description: 'Join devices with telemetry_readings filter temperature > 65°C', icon: Sparkles, keywords: ['query', 'preset', 'temperature', 'telemetry', 'router'], run: () => {
        setPendingAskQuestion('Find core routers with temperature > 65°C and packet drop rate > 0.05%')
        selectTab('ask-data')
      } },
      { id: 'query-critical-repairs', label: 'Query: Open critical service repair events', description: 'Filter service_events by severity = Critical and open status', icon: Sparkles, keywords: ['query', 'preset', 'critical', 'service', 'incidents'], run: () => {
        setPendingAskQuestion('List open Critical service events with device model and site location')
        selectTab('ask-data')
      } },

      // Schema Inspection
      { id: 'inspect-devices', label: 'Inspect Table: public.devices', description: '5,000 hardware inventory records with 11 relational columns', icon: Table, keywords: ['table', 'schema', 'devices'], run: () => selectTab('devices') },
      { id: 'inspect-sites', label: 'Inspect Table: public.sites', description: '50 global operational sites across Americas, EMEA, and APAC', icon: Table, keywords: ['table', 'schema', 'sites'], run: () => selectTab('devices') },
      { id: 'inspect-service-events', label: 'Inspect Table: public.service_events', description: '1,500 maintenance and repair logs with severity classifications', icon: Table, keywords: ['table', 'schema', 'service_events'], run: () => selectTab('devices') },
      { id: 'inspect-telemetry', label: 'Inspect Table: public.telemetry_readings', description: '25,000 sensor observations (temperature, CPU, memory, packet drops)', icon: Table, keywords: ['table', 'schema', 'telemetry'], run: () => selectTab('devices') },

      // Diagnostics & Preferences
      { id: 'trigger-health-scan', label: 'Trigger Fleet Data Health Scan', description: 'Execute all 6 deterministic integrity rules across 30,000 rows', icon: RefreshCw, keywords: ['scan', 'health', 'quality'], run: () => selectTab('data-quality') },
      { id: 'toggle-mode', label: `Switch to ${mode === 'simple' ? 'Expert' : 'Simple'} view`, description: mode === 'simple' ? 'Show SQL, AST inspector, and execution times' : 'Friendly plain English, hide raw SQL', icon: Sparkles, keywords: ['expert', 'simple', 'developer', 'viewer', 'mode'], run: toggleMode },
      { id: 'toggle-theme', label: `Switch to ${theme === 'light' ? 'Obsidian Dark' : 'Warm Stone Light'} theme`, description: 'Toggle between warm stone (#FAF8F5) and obsidian (#0B0D10)', icon: Moon, keywords: ['theme', 'dark', 'light', 'mode'], run: toggleTheme },
      { id: 'onboarding-tour', label: 'Welcome & Role Tour', description: 'Explore roles, sample questions, and zero-trust safeguards', icon: Sparkles, keywords: ['onboarding', 'tour', 'guide', 'help', 'welcome'], run: () => setIsOnboardingOpen(true) },
      { id: 'refresh-overview', label: 'Refresh Fleet Overview', description: 'Fetch the latest live inventory snapshot', icon: RefreshCw, keywords: ['reload', 'live'], run: () => {
        selectTab('overview')
        window.requestAnimationFrame(() => window.dispatchEvent(new Event('querytrust:refresh-overview')))
      } },
    ]

    if (user?.role === 'admin') {
      pageActions.push(
        { id: 'admin', label: 'People & RBAC Access Management', description: 'Manage 7 team members, role assignments, and audit trails', icon: Users, keywords: ['users', 'governance', 'roles', 'people', 'rbac'], run: () => selectTab('admin') },
      )
    }

    return pageActions
  }, [user?.role, mode, theme, toggleMode, toggleTheme, enterDemoMode])

  // Non-blocking authentication: If not authenticated and not loading, show login/landing
  if (!isAuthenticated && !isLoading) {
    if (unauthView === 'login') {
      return (
        <>
          <NoiseOverlay />
          <ColdStartBanner />
          <LoginPage onBackToLanding={() => setUnauthView('landing')} />
        </>
      )
    }
    return (
      <>
        <NoiseOverlay />
        <LandingPage onGoToLogin={() => setUnauthView('login')} />
      </>
    )
  }

  // If loading without cached credentials, show shell skeleton with top cold-start banner
  if (isLoading && !user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <NoiseOverlay />
        <ColdStartBanner />
        <div style={{ flex: 1, padding: '24px' }}>
          <ViewShimmerSkeleton title="Initializing Workspace" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <NoiseOverlay />
      <ColdStartBanner />

      {/* Invite Workspace Awareness Banner if logged into another account */}
      {joinParam && user && user.workspace_name?.toLowerCase() !== joinParam.toLowerCase() && (
        <div style={{
          background: 'linear-gradient(90deg, #0284c7 0%, #0ea5e9 100%)',
          color: '#ffffff',
          padding: '9px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          fontWeight: 500,
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
          zIndex: 9999,
          flexShrink: 0,
        }}>
          <span>
            👋 You opened an invite link to join <strong>{joinParam}</strong>, but you are currently signed in as <strong>{user.display_name}</strong> ({user.workspace_name || 'Personal Account'}).
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={async () => {
                await logout()
                setUnauthView('login')
              }}
              style={{
                background: '#ffffff',
                color: '#0284c7',
                border: 'none',
                borderRadius: 4,
                padding: '4px 12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              Sign out &amp; Join {joinParam}
            </button>
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.delete('join')
                url.searchParams.delete('workspace')
                window.history.replaceState({}, '', url.toString())
                window.dispatchEvent(new Event('popstate'))
              }}
              style={{
                background: 'rgba(0,0,0,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="app-container" style={{ flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} onSelectTab={selectTab} onAskQuestion={openAskQuestion} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-canvas)' }}>
          <Header
            activeTab={activeTab}
            onNavigate={selectTab}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
          />

          <main className="content-area" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
            <div className="page-transition" key={activeTab}>
              <Suspense fallback={<ViewShimmerSkeleton title={`Loading ${activeTab.replace('-', ' ')}...`} />}>
                {activeTab === 'overview' && (
                  <OverviewView
                    onNavigate={selectTab}
                    onAskQuestion={openAskQuestion}
                    onOpenDevice={openDevice}
                  />
                )}
                {activeTab === 'devices' && <DevicesView onAskQuestion={openAskQuestion} />}
                {activeTab === 'ask-data' && <AskDataView initialQuestion={pendingAskQuestion} />}
                {activeTab === 'data-sources' && <DataSourcesView />}
                {activeTab === 'admin' && <AdminView />}

                {activeTab === 'data-quality' && <DataQualityView onAskQuestion={openAskQuestion} />}
                {activeTab === 'anomalies' && (
                  <AnomalyMonitorView
                    onOpenDevice={openDevice}
                  />
                )}

                {activeTab === 'history' && <QueryHistoryView onAskQuestion={openAskQuestion} />}
                {activeTab === 'evaluations' && <EvaluationLabView />}
              </Suspense>
            </div>
          </main>
        </div>
        {isCommandPaletteOpen && <CommandPalette actions={commandActions} onClose={() => setIsCommandPaletteOpen(false)} />}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onSelectQuestion={openAskQuestion}
        />
        <ApiFailureToast />
      </div>
    </div>
  )
}

export default function App() {
  const requestedTab = readUrlParam('tab')
  const isKnownRoute =
    window.location.pathname === '/' &&
    (!requestedTab || tabs.includes(requestedTab as ActiveTab) || requestedTab === 'login' || requestedTab === 'landing')

  if (!isKnownRoute) {
    return <NotFoundPage />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  )
}
