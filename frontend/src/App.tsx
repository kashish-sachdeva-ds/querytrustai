import React, { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './components/LoginPage'
import { Sidebar, type ActiveTab } from './components/Sidebar'
import { Header } from './components/Header'
import { OverviewView } from './components/OverviewView'
import { DevicesView } from './components/DevicesView'
import { AdminView } from './components/AdminView'
import { AskDataView } from './components/AskDataView'
import { QueryHistoryView } from './components/QueryHistoryView'
import { DataQualityView } from './components/DataQualityView'
import { AnomalyMonitorView } from './components/AnomalyMonitorView'
import EvaluationLabView from './components/EvaluationLabView'
import { CommandPalette, type CommandPaletteAction } from './components/CommandPalette'
import { withLayoutTransition } from './motion'
import { pushUrlParams, readUrlParam } from './urlState'
import { NotFoundPage } from './components/NotFoundPage'
import { ApiFailureToast } from './components/ApiFailureToast'

const tabs: ActiveTab[] = [
  'overview',
  'devices',
  'ask-data',
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
  const { isAuthenticated, isLoading, user } = useAuth()
  const [activeTab, setActiveTab] = useState<ActiveTab>(getTabFromUrl)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const selectTab = (tab: ActiveTab) => {
    pushUrlParams({ tab })
    withLayoutTransition(() => setActiveTab(tab))
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
      { id: 'data-quality', label: 'Open data quality', description: 'Review read-only diagnostic findings', icon: ShieldCheck, keywords: ['diagnostics', 'findings'], run: () => selectTab('data-quality') },
      { id: 'anomalies', label: 'Open anomaly monitor', description: 'Review synthetic telemetry outliers', icon: Activity, keywords: ['telemetry', 'isolation forest'], run: () => selectTab('anomalies') },
      { id: 'history', label: 'Open query history', description: 'Review your governed query activity', icon: History, keywords: ['audit', 'queries'], run: () => selectTab('history') },
      { id: 'refresh-overview', label: 'Refresh fleet overview', description: 'Fetch the latest live inventory snapshot', icon: RefreshCw, keywords: ['reload', 'live'], run: () => {
        selectTab('overview')
        window.requestAnimationFrame(() => window.dispatchEvent(new Event('querytrust:refresh-overview')))
      } },
    ]

    if (user?.role === 'admin') {
      pageActions.push(
        { id: 'evaluations', label: 'Open evaluation lab', description: 'Run the governed benchmark suite', icon: FlaskConical, keywords: ['benchmark', 'regression'], run: () => selectTab('evaluations') },
        { id: 'admin', label: 'Open administration', description: 'Manage roles and authorization states', icon: Users, keywords: ['users', 'governance'], run: () => selectTab('admin') },
      )
    }

    return pageActions
  }, [user?.role])

  if (isLoading) {
    return (
      <div className="login-wrapper">
        <div style={{ textAlign: 'center' }}>
          <div className="brand-logo" style={{ width: 48, height: 48, margin: '0 auto 1rem auto' }}>
            QT
          </div>
          <div className="table-loading-spinner" />
          <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            Verifying cryptographic session...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onSelectTab={selectTab} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        <Header onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

        <main className="content-area">
          <div className="page-transition" key={activeTab}>
            {activeTab === 'overview' && <OverviewView />}
            {activeTab === 'devices' && <DevicesView />}
            {activeTab === 'ask-data' && <AskDataView />}
            {activeTab === 'admin' && <AdminView />}

            {activeTab === 'data-quality' && <DataQualityView />}
            {activeTab === 'anomalies' && <AnomalyMonitorView />}

            {activeTab === 'history' && <QueryHistoryView />}
            {activeTab === 'evaluations' && <EvaluationLabView />}
          </div>
        </main>
      </div>
      {isCommandPaletteOpen && <CommandPalette actions={commandActions} onClose={() => setIsCommandPaletteOpen(false)} />}
      <ApiFailureToast />
    </div>
  )
}

export default function App() {
  const requestedTab = readUrlParam('tab')
  const isKnownRoute = window.location.pathname === '/' && (!requestedTab || tabs.includes(requestedTab as ActiveTab))

  if (!isKnownRoute) {
    return <NotFoundPage />
  }

  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
