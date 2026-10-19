import React, { useState, useEffect } from 'react'
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Server,
  ShieldCheck,
  Zap,
  Radio,
} from 'lucide-react'
import {
  type DataSourcePublic,
  type ActiveDataSourceResponse,
  type DataSourceTestResponse,
  fetchActiveDataSource,
  fetchDataSources,
  testDataSourceConnection,
  createDataSource,
  activateDataSource,
  activateSandboxDataSource,
  syncDataSourceSchema,
  deleteDataSource,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from './PageHeader'
import { ExplainButton } from './ExplainButton'

export const DataSourcesView: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isAnalystOrAdmin = user?.role === 'admin' || user?.role === 'analyst'

  const [activeSource, setActiveSource] = useState<ActiveDataSourceResponse | null>(null)
  const [dataSources, setDataSources] = useState<DataSourcePublic[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // New connection form modal/drawer
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false)
  const [formName, setFormName] = useState<string>('')
  const [formHost, setFormHost] = useState<string>('localhost')
  const [formPort, setFormPort] = useState<number>(5432)
  const [formDbName, setFormDbName] = useState<string>('')
  const [formUser, setFormUser] = useState<string>('')
  const [formPassword, setFormPassword] = useState<string>('')
  const [formSslMode, setFormSslMode] = useState<'disable' | 'prefer' | 'require'>('prefer')
  const [formSetAsActive, setFormSetAsActive] = useState<boolean>(true)

  // Test connection state
  const [testingConnection, setTestingConnection] = useState<boolean>(false)
  const [testResult, setTestResult] = useState<DataSourceTestResponse | null>(null)

  const loadData = async () => {
    setLoading(true)
    setNotification(null)
    try {
      const [active, sources] = await Promise.all([
        fetchActiveDataSource(),
        isAnalystOrAdmin ? fetchDataSources().catch(() => []) : Promise.resolve([]),
      ])
      setActiveSource(active)
      setDataSources(sources)
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to retrieve workspace data sources.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestingConnection(true)
    setTestResult(null)
    try {
      const res = await testDataSourceConnection({
        db_type: 'postgresql',
        host: formHost.trim(),
        port: Number(formPort),
        database_name: formDbName.trim(),
        username: formUser.trim(),
        password: formPassword,
        ssl_mode: formSslMode,
      })
      setTestResult(res)
    } catch (err) {
      setTestResult({
        success: false,
        error_message: err instanceof Error ? err.message : 'Connection test failed.',
        tables_found: 0,
        tables: [],
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formHost.trim() || !formDbName.trim() || !formUser.trim() || !formPassword) {
      setNotification({ type: 'error', message: 'All connection parameters are required.' })
      return
    }
    setActionLoading(true)
    setNotification(null)
    try {
      await createDataSource({
        name: formName.trim(),
        db_type: 'postgresql',
        host: formHost.trim(),
        port: Number(formPort),
        database_name: formDbName.trim(),
        username: formUser.trim(),
        password: formPassword,
        ssl_mode: formSslMode,
        set_as_active: formSetAsActive,
      })
      setShowConnectModal(false)
      setFormPassword('')
      setTestResult(null)
      await loadData()
      setNotification({
        type: 'success',
        message: `Successfully connected and introspected '${formName}'. It is now ready for Natural-Language Analytics.`,
      })
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to register data source.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleActivateCustom = async (sourceId: string) => {
    setActionLoading(true)
    try {
      const updatedActive = await activateDataSource(sourceId)
      setActiveSource(updatedActive)
      await loadData()
      setNotification({
        type: 'success',
        message: `Activated database '${updatedActive.name}'. All Ask Data queries will now run against this schema.`,
      })
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to activate data source.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleActivateSandbox = async () => {
    setActionLoading(true)
    try {
      const updatedActive = await activateSandboxDataSource()
      setActiveSource(updatedActive)
      await loadData()
      setNotification({
        type: 'success',
        message: 'Switched back to the pre-loaded Networking Demo Sandbox (Synthetic Cisco Telemetry & Assets).',
      })
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to activate demo sandbox.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSyncSchema = async (sourceId: string) => {
    setActionLoading(true)
    try {
      const synced = await syncDataSourceSchema(sourceId)
      await loadData()
      setNotification({
        type: 'success',
        message: `Schema re-synchronized for '${synced.name}': discovered ${synced.table_count} tables and ${synced.column_count} columns.`,
      })
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to re-sync schema.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteSource = async (sourceId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}'? This will not affect the external database.`)) {
      return
    }
    setActionLoading(true)
    try {
      await deleteDataSource(sourceId)
      await loadData()
      setNotification({
        type: 'success',
        message: `Removed data source '${name}'.`,
      })
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to remove data source.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <PageHeader
        title="Data sources & connections"
        description="Connect your organization's live PostgreSQL databases or query the pre-configured Networking Demo Sandbox."
        helpText="QueryTrust AI connects with SELECT-only reader privileges. We introspect tables and foreign keys without copying or mutating your records."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadData}
              disabled={loading || actionLoading}
            >
              <RefreshCw size={13} className={loading ? 'spin-icon' : ''} style={{ marginRight: 4 }} />
              <span>Refresh</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setShowConnectModal(true)
                  setTestResult(null)
                }}
              >
                <Plus size={14} style={{ marginRight: 4 }} />
                <span>Connect Database</span>
              </button>
            )}
          </div>
        }
      />

      {/* Notifications */}
      {notification && (
        <div
          className={`notification-banner ${
            notification.type === 'success' ? 'notification-success' : 'notification-error'
          }`}
          role="status"
          style={{ marginBottom: '1.25rem' }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} style={{ color: 'var(--qt-success)' }} />
          ) : (
            <AlertTriangle size={16} style={{ color: 'var(--qt-danger)' }} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Active Target Mode Switcher Banner */}
      <div
        className="content-card full-width-card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.2rem 1.4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'linear-gradient(180deg, var(--qt-surface) 0%, var(--qt-surface-elevated) 100%)',
          border: '1px solid var(--qt-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: activeSource?.mode === 'connected' ? 'var(--qt-success)' : 'var(--qt-accent)',
                  boxShadow: `0 0 8px ${activeSource?.mode === 'connected' ? 'var(--qt-success)' : 'var(--qt-accent)'}`,
                }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--qt-ink-muted)' }}>
                Active Analytics Target
              </span>
              <span className={`badge ${activeSource?.mode === 'connected' ? 'badge-success' : 'badge-neutral'}`}>
                {activeSource?.mode === 'connected' ? 'Live Enterprise Database' : 'Evaluator Sandbox'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2px 0 6px 0', color: 'var(--qt-ink)' }}>
              {activeSource?.name || 'Loading data target…'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--qt-muted)', margin: 0 }}>
              {activeSource?.mode === 'connected'
                ? `Host: ${activeSource.host} · Database: ${activeSource.database_name} · ${activeSource.table_count} tables detected`
                : 'Synthetic Cisco networking inventory, warranty lifecycles, and device telemetry (Pre-seeded for instant evaluation).'}
            </p>
          </div>

          {/* Quick toggle between Sandbox & Connected */}
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeSource?.mode === 'connected' ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleActivateSandbox}
                  disabled={actionLoading}
                >
                  <Radio size={13} style={{ marginRight: 4 }} />
                  <span>Switch to Demo Sandbox</span>
                </button>
              ) : (
                dataSources.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleActivateCustom(dataSources[0].id)}
                    disabled={actionLoading}
                  >
                    <Zap size={13} style={{ marginRight: 4 }} />
                    <span>Activate {dataSources[0].name}</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Detected tables tag cloud */}
        <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--qt-border)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--qt-ink-muted)', marginBottom: 6 }}>
            Introspected Tables ({activeSource?.table_count || 0}) Available in Ask Data:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {activeSource?.tables && activeSource.tables.length > 0 ? (
              activeSource.tables.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.76rem',
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'var(--qt-surface)',
                    border: '1px solid var(--qt-border)',
                    color: 'var(--qt-ink)',
                  }}
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>No tables discovered yet.</span>
            )}
          </div>
        </div>
      </div>

      {/* Connected Databases List */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div
          className="card-header"
          style={{
            padding: '1rem 1.4rem',
            borderBottom: '1px solid var(--qt-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} style={{ color: 'var(--qt-accent)' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                {user?.workspace_name && user.workspace_name !== 'Default Workspace'
                  ? `${user.workspace_name} — Connected Databases (${dataSources.length})`
                  : `Configured Data Sources (${dataSources.length})`}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', margin: 0 }}>
                External PostgreSQL instances connected with SELECT-only privileges.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExplainButton
              title="Bring Your Own Database (BYOD)"
              explanation="QueryTrust AI connects directly to your read-only database user. Natural language queries are parsed by SQLGlot and strictly run as SELECT statements without copying your raw tables to external cloud servers."
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Connection Name</th>
                <th>Database & Host</th>
                <th>Status</th>
                <th>Discovered Schema</th>
                <th>Active Target</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div className="table-loading-spinner" />
                    <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      Retrieving registered data sources…
                    </p>
                  </td>
                </tr>
              ) : dataSources.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <Server size={32} style={{ color: 'var(--qt-muted)', margin: '0 auto 12px auto', opacity: 0.7 }} />
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>No External Databases Connected Yet</h4>
                    <p className="text-muted" style={{ fontSize: '0.82rem', maxWidth: 440, margin: '0 auto 1rem auto' }}>
                      Your workspace is currently querying the pre-loaded <strong>Networking Demo Sandbox</strong>.
                      Connect your PostgreSQL database to run plain-English analytics over your real business tables.
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowConnectModal(true)}
                      >
                        <Plus size={13} style={{ marginRight: 4 }} />
                        <span>Connect Your First Database</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                dataSources.map((ds) => {
                  const isActive = ds.is_active
                  return (
                    <tr key={ds.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--qt-ink)' }}>{ds.name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>
                            PostgreSQL · SSL: {ds.ssl_mode}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            {ds.database_name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--qt-muted)', fontFamily: 'var(--font-mono)' }}>
                            {ds.username}@{ds.host}:{ds.port}
                          </span>
                        </div>
                      </td>
                      <td>
                        {ds.status === 'connected' ? (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                            Connected
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem' }} title={ds.last_error || 'Error'}>
                            Error
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem' }}>
                          <strong>{ds.table_count}</strong> tables ({ds.column_count} columns)
                        </div>
                      </td>
                      <td>
                        {isActive ? (
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                            Active Target
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {isAdmin && !isActive && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleActivateCustom(ds.id)}
                              disabled={actionLoading}
                              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            >
                              <span>Set Active</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSyncSchema(ds.id)}
                              disabled={actionLoading}
                              title="Re-introspect remote schema"
                              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            >
                              <RefreshCw size={11} className={actionLoading ? 'spin-icon' : ''} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteSource(ds.id, ds.name)}
                              disabled={actionLoading}
                              title="Delete database connection"
                              style={{ fontSize: '0.72rem', padding: '3px 8px', color: 'var(--qt-danger)' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect Database Modal */}
      {showConnectModal && (
        <div className="modal-backdrop" onClick={() => setShowConnectModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 640, width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={20} style={{ color: 'var(--qt-accent)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Connect PostgreSQL Database</h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--qt-muted)' }}>
                    Extract tables and enable natural language analytics over your company data.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setShowConnectModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConnection}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ds-name">
                    Connection Name *
                  </label>
                  <input
                    id="ds-name"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Production Analytics Read-Replica"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ds-host">
                      Host Address *
                    </label>
                    <input
                      id="ds-host"
                      type="text"
                      className="form-control"
                      placeholder="e.g. db.mycompany.com or localhost"
                      value={formHost}
                      onChange={(e) => setFormHost(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ds-port">
                      Port *
                    </label>
                    <input
                      id="ds-port"
                      type="number"
                      className="form-control"
                      placeholder="5432"
                      value={formPort}
                      onChange={(e) => setFormPort(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ds-dbname">
                    Database Name *
                  </label>
                  <input
                    id="ds-dbname"
                    type="text"
                    className="form-control"
                    placeholder="e.g. enterprise_prod"
                    value={formDbName}
                    onChange={(e) => setFormDbName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ds-user">
                      Read-Only Username *
                    </label>
                    <input
                      id="ds-user"
                      type="text"
                      className="form-control"
                      placeholder="e.g. analytics_reader"
                      value={formUser}
                      onChange={(e) => setFormUser(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ds-password">
                      Password *
                    </label>
                    <input
                      id="ds-password"
                      type="password"
                      className="form-control"
                      placeholder="••••••••••••"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ds-ssl">
                      SSL Mode
                    </label>
                    <select
                      id="ds-ssl"
                      className="form-control"
                      value={formSslMode}
                      onChange={(e) => setFormSslMode(e.target.value as any)}
                    >
                      <option value="prefer">Prefer (Standard)</option>
                      <option value="require">Require (Encrypted)</option>
                      <option value="disable">Disable (Local development)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '1.6rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                      <input
                        type="checkbox"
                        checked={formSetAsActive}
                        onChange={(e) => setFormSetAsActive(e.target.checked)}
                      />
                      <span>Set as active analytics target</span>
                    </label>
                  </div>
                </div>

                {/* Test Connection Banner */}
                {testResult && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 6,
                      background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${testResult.success ? 'var(--qt-success)' : 'var(--qt-danger)'}`,
                      fontSize: '0.82rem',
                    }}
                  >
                    {testResult.success ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--qt-success)' }}>
                          <CheckCircle2 size={15} />
                          <span>Connection Successful ({testResult.latency_ms}ms)</span>
                        </div>
                        <div style={{ color: 'var(--qt-ink-muted)', marginTop: 4 }}>
                          {testResult.server_version} · Found <strong>{testResult.tables_found}</strong> public tables:{' '}
                          <span style={{ fontFamily: 'var(--font-mono)' }}>
                            {testResult.tables.slice(0, 8).join(', ')}
                            {testResult.tables.length > 8 ? '…' : ''}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--qt-danger)' }}>
                        <AlertTriangle size={15} />
                        <span>{testResult.error_message || 'Connection failed.'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !formHost || !formDbName || !formUser}
                >
                  <Zap size={13} className={testingConnection ? 'spin-icon' : ''} style={{ marginRight: 4 }} />
                  <span>{testingConnection ? 'Testing…' : 'Test Connection'}</span>
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowConnectModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={actionLoading || testingConnection}
                  >
                    <ShieldCheck size={13} style={{ marginRight: 4 }} />
                    <span>{actionLoading ? 'Connecting…' : 'Save & Extract Schema'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
