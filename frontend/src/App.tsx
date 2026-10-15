import React, { useState } from 'react'
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

const AppShell: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')

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

  const getPageInfo = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview':
        return {
          title: 'Fleet Operations Overview',
          subtitle: 'Live PostgreSQL counts and operational distributions',
        }
      case 'devices':
        return {
          title: 'Device Inventory Explorer',
          subtitle: 'Paginated, filterable networking assets and event telemetry',
        }
      case 'ask-data':
        return {
          title: 'Ask Data — Governed Natural Language Analytics',
          subtitle: 'Natural language queries to governed read-only SQL previews',
        }
      case 'data-quality':
        return {
          title: 'Data Quality Profiler',
          subtitle: 'Schema and value consistency checks on educational inventory',
        }
      case 'anomalies':
        return {
          title: 'Telemetry Anomaly Monitor',
          subtitle: 'scikit-learn IsolationForest outlier score demonstrations',
        }
      case 'history':
        return {
          title: 'Query History & Audit',
          subtitle: 'User session queries, executions, and feedback records',
        }
      case 'evaluations':
        return {
          title: 'Evaluation Lab',
          subtitle: 'Curated 30+ query safety and correctness benchmark runner',
        }
      case 'admin':
        return {
          title: 'System Administration',
          subtitle: 'User roles, authorization states, and governance trail',
        }
      default:
        return {
          title: 'QueryTrust AI',
          subtitle: 'Enterprise Analytics Workbench',
        }
    }
  }

  const pageInfo = getPageInfo(activeTab)

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />

        <main className="content-area">
          {activeTab === 'overview' && <OverviewView />}
          {activeTab === 'devices' && <DevicesView />}
          {activeTab === 'ask-data' && <AskDataView />}
          {activeTab === 'admin' && <AdminView />}

          {activeTab === 'data-quality' && <DataQualityView />}
          {activeTab === 'anomalies' && <AnomalyMonitorView />}

          {activeTab === 'history' && <QueryHistoryView />}
          {activeTab === 'evaluations' && <EvaluationLabView />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
