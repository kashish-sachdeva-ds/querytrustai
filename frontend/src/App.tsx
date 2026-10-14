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
import { PlaceholderView } from './components/PlaceholderView'

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

          {activeTab === 'data-quality' && (
            <PlaceholderView
              title="Data Quality Diagnostics Subsystem"
              milestone="Milestone 5"
              description="Automated profiling rules scanning for missing warranty dates, invalid installation date sequences, repeated serial numbers, and inconsistent casing across the 5,000 synthetic devices."
              features={[
                'Rule 1: Missing values in warranty expiry and firmware version',
                'Rule 2: Warranty date prior to installation date anomalies',
                'Rule 3: Duplicate serial number normalization and detection',
                'Rule 4: Inconsistent device category formatting and casing variants',
              ]}
              icon="data-quality"
            />
          )}

          {activeTab === 'anomalies' && (
            <PlaceholderView
              title="Telemetry Outlier Anomaly Detection"
              milestone="Milestone 5"
              description="Unsupervised machine learning model fitted on device CPU, memory, temperature, packet loss, and latency metrics to flag abnormal operating conditions."
              features={[
                'scikit-learn IsolationForest fitted on multi-metric telemetry readings',
                'Demonstrates outlier ranking across 25,000 telemetry observations',
                'Explicit governance notice: outlier scores are not failure probabilities',
                'Inspect anomalous devices with direct cross-link into Inventory Explorer',
              ]}
              icon="anomalies"
            />
          )}

          {activeTab === 'history' && <QueryHistoryView />}

          {activeTab === 'evaluations' && (
            <PlaceholderView
              title="Evaluation Lab & Benchmarking"
              milestone="Milestone 6"
              description="Automated benchmark runner executing 30+ standardized natural-language questions across aggregations, filters, joins, ambiguities, and security rejections."
              features={[
                '30+ manually reviewed benchmark cases with expected SQL outcomes',
                'Deterministic offline mock runner for CI and regression testing',
                'Live model scoring comparing baseline vs guarded safety pipeline',
                'Category-level pass/fail breakdown and latency profiling',
              ]}
              icon="evaluations"
            />
          )}
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
