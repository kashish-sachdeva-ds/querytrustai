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
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const { theme, mode, toggleTheme, toggleMode } = useTheme()
  const [activeTab, setActiveTab] = useState<ActiveTab>(getTabFromUrl)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [pendingAskQuestion, setPendingAskQuestion] = useState<string | null>(null)
  const joinParam = readUrlParam('join') || readUrlParam('workspace')
  const [unauthView, setUnauthView] = useState<'landing' | 'login'>(() => {
    const tab = readUrlParam('tab')
    const join = readUrlParam('join') || readUrlParam('workspace')
    return tab === 'login' || Boolean(join) ? 'login' : 'landing'
  })
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      try {
        if (localStorage.getItem('qt_onboarded') !== 'true') {
          setIsOnboardingOpen(true)
        }
      } catch {
        /* noop */
      }
    }
  }, [isAuthenticated])

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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsCommandPaletteOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const commandActions = useMemo<CommandPaletteAction[]>(() => {
    const pageActions: CommandPaletteAction[] = [
      { id: 'overview', label: 'Open fleet overview', description: 'Live inventory and service summary', icon: LayoutDashboard, keywords: ['dashboard', 'home'], run: () => selectTab('overview') },
      { id: 'devices', label: 'Open device explorer', description: 'Search and inspect network assets', icon: Server, keywords: ['inventory', 'assets'], run: () => selectTab('devices') },
      { id: 'ask-data', label: 'Ask governed data', description: 'Create a read-only analytics preview', icon: MessageSquareText, keywords: ['query', 'analytics', 'sql'], run: () => selectTab('ask-data') },
      { id: 'data-sources', label: 'Open data sources & connections', description: 'Connect live databases or switch to demo sandbox', icon: Database, keywords: ['database', 'postgres', 'connection', 'byod', 'schema'], run: () => selectTab('data-sources') },
      { id: 'data-quality', label: 'Open data quality', description: 'Review read-only diagnostic findings', icon: ShieldCheck, keywords: ['diagnostics', 'findings'], run: () => selectTab('data-quality') },
      { id: 'anomalies', label: 'Open anomaly monitor', description: 'Review synthetic telemetry outliers', icon: Activity, keywords: ['telemetry', 'isolation forest'], run: () => selectTab('anomalies') },
      { id: 'history', label: 'Open query history', description: 'Review your governed query activity', icon: History, keywords: ['audit', 'queries'], run: () => selectTab('history') },
      { id: 'evaluations', label: 'Open safety proof', description: 'Review benchmark safety metrics and regression proof', icon: FlaskConical, keywords: ['benchmark', 'regression', 'safety', 'proof'], run: () => selectTab('evaluations') },
      { id: 'toggle-mode', label: `Switch to ${mode === 'simple' ? 'Expert' : 'Simple'} view`, description: mode === 'simple' ? 'Show SQL, AST inspector, and execution times' : 'Friendly plain English, hide raw SQL', icon: Sparkles, keywords: ['expert', 'simple', 'developer', 'viewer', 'mode'], run: toggleMode },
      { id: 'toggle-theme', label: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`, description: 'Toggle between clean light and deep obsidian dark themes', icon: Moon, keywords: ['theme', 'dark', 'light', 'mode'], run: toggleTheme },
      { id: 'onboarding-tour', label: 'Welcome & role tour', description: 'Explore roles, sample questions, and database preview', icon: Sparkles, keywords: ['onboarding', 'tour', 'guide', 'help', 'welcome'], run: () => setIsOnboardingOpen(true) },
      { id: 'refresh-overview', label: 'Refresh fleet overview', description: 'Fetch the latest live inventory snapshot', icon: RefreshCw, keywords: ['reload', 'live'], run: () => {
        selectTab('overview')
        window.requestAnimationFrame(() => window.dispatchEvent(new Event('querytrust:refresh-overview')))
      } },
    ]

    if (user?.role === 'admin') {
      pageActions.push(
        { id: 'admin', label: 'Open people & access', description: 'Manage roles and authorization states', icon: Users, keywords: ['users', 'governance', 'roles', 'people'], run: () => selectTab('admin') },
      )
    }

    return pageActions
  }, [user?.role, mode, theme, toggleMode, toggleTheme])

  // Non-blocking authentication: If not authenticated and not loading, show login/landing
  if (!isAuthenticated && !isLoading) {
    if (unauthView === 'login') {
      return (
        <>
          <ColdStartBanner />
          <LoginPage onBackToLanding={() => setUnauthView('landing')} />
        </>
      )
    }
    return (
      <>
        <ColdStartBanner />
        <LandingPage onGoToLogin={() => setUnauthView('login')} />
      </>
    )
  }

  // If loading without cached credentials, show shell skeleton with top cold-start banner
  if (isLoading && !user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <ColdStartBanner />
        <div style={{ flex: 1, padding: '24px' }}>
          <ViewShimmerSkeleton title="Initializing Workspace" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <ColdStartBanner />

      {/* Invite Workspace Awareness Banner if logged into another account */}
      {joinParam && user && user.workspace_name?.toLowerCase() !== joinParam.toLowerCase() && (
        <div style={{
          background: 'linear-gradient(90deg, #ff5a14 0%, #ea4800 100%)',
          color: '#ffffff',
          padding: '9px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          fontWeight: 500,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
                color: '#ea4800',
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

      <div className="app-container" style={{ flex: 1, minHeight: 0 }}>
        <Sidebar activeTab={activeTab} onSelectTab={selectTab} onAskQuestion={openAskQuestion} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
          <Header
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
          />

          <main className="content-area">
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

                {activeTab === 'data-quality' && <DataQualityView />}
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
    (!requestedTab || tabs.includes(requestedTab as ActiveTab) || requestedTab === 'login')

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
