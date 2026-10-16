import React, { useState, useEffect } from 'react'
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserX,
  History,
  ShieldAlert,
} from 'lucide-react'
import {
  type UserPublic,
  type AuditLogItem,
  fetchAdminUsers,
  updateAdminUser,
  fetchAdminAuditLogs,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ExplainButton } from './ExplainButton'

export const AdminView: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = async () => {
    setLoading(true)
    setNotification(null)
    try {
      const [usersData, logsData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminAuditLogs(),
      ])
      setUsers(usersData)
      setAuditLogs(logsData)
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load administration records.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    const previousUsers = users
    setUpdatingId(userId)
    setNotification(null)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserPublic['role'] } : u)))
    try {
      const updated = await updateAdminUser(userId, { role: newRole })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      )
      setNotification({
        type: 'success',
        message: `Updated role to '${newRole}'. Permissions updated immediately.`,
      })
    } catch (err) {
      setUsers(previousUsers)
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Role change failed.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    const previousUsers = users
    const nextStatus = !currentStatus
    setUpdatingId(userId)
    setNotification(null)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: nextStatus } : u)))
    try {
      const updated = await updateAdminUser(userId, { is_active: nextStatus })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: updated.is_active } : u))
      )
      setNotification({
        type: 'success',
        message: `Account status updated to ${!currentStatus ? 'Active' : 'Deactivated'}.`,
      })
    } catch (err) {
      setUsers(previousUsers)
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Status update failed.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const getAuditStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('block')) {
      return (
        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ShieldAlert size={11} /> Blocked
        </span>
      )
    }
    if (s.includes('exec') || s.includes('success') || s.includes('preview')) {
      return (
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={11} /> Safe
        </span>
      )
    }
    if (s.includes('clarif')) {
      return <span className="badge badge-warning">Clarified</span>
    }
    return <span className="badge badge-neutral">{status}</span>
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="error-card" role="alert" style={{ maxWidth: 640, margin: '2rem auto' }}>
        <AlertTriangle size={24} style={{ color: 'var(--qt-danger)' }} />
        <div className="error-content">
          <h3>Access Restricted: Administrator Privileges Required</h3>
          <p>
            Your account ({currentUser?.email}) has role <strong>{currentUser?.role}</strong>.
            User governance and security audit tools require <strong>admin</strong> role.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="page-action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div className="overview-eyebrow">
            <span style={{ color: 'var(--qt-accent)' }}>●</span>
            GOVERNANCE &amp; SECURITY SETTINGS
          </div>
          <h2 className="view-section-title" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>
            People &amp; Access Control
          </h2>
          <p className="view-section-desc" style={{ fontSize: '0.84rem', color: 'var(--qt-muted)', margin: 0 }}>
            Who can do what in QueryTrust AI. Server-enforced roles and tamper-evident activity history.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} style={{ marginRight: 4 }} />
            <span>Refresh</span>
          </button>
          <ExplainButton
            title="People & Access Security"
            explanation="Role-based permissions are validated on every backend API request. Viewer accounts see a simplified view without SQL; Analysts inspect diagnostics; Admins manage accounts and audit history."
          />
        </div>
      </div>

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

      {/* Users Management Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--qt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={{ color: 'var(--qt-accent)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Authorized People ({users.length})</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-success">Backend Enforced RBAC</span>
            <ExplainButton
              title="User Roles"
              explanation="Admin: Access to benchmarks, user permissions, and audit logs. Analyst: Query asking, model refitting, and diagnostics. Viewer: Simplified plain-English asking with SQL hidden."
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Display Name</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div className="table-loading-spinner" />
                    <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      Retrieving authorized user accounts…
                    </p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p className="text-muted">No user records returned.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="user-table-cell" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, color: 'var(--qt-ink)' }} className="cell-truncate" title={u.display_name}>
                            {u.display_name}
                          </span>
                          {isCurrent && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>You</span>}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--qt-text)' }}>
                        <span className="cell-truncate" title={u.email}>{u.email}</span>
                      </td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={updatingId === u.id || isCurrent}
                          className="role-dropdown-select"
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--qt-radius-control)',
                            border: '1px solid var(--qt-border)',
                            background: 'var(--qt-surface)',
                            fontSize: '0.78rem',
                            fontFamily: 'inherit',
                          }}
                          aria-label={`Change role for ${u.display_name}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="analyst">Analyst</option>
                          <option value="viewer">Viewer (No SQL)</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.is_active ? 'badge-success' : 'badge-neutral'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={updatingId === u.id || isCurrent}
                          onClick={() => handleStatusToggle(u.id, u.is_active)}
                          style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                          title={isCurrent ? 'Cannot deactivate your own logged-in account' : undefined}
                        >
                          {u.is_active ? (
                            <>
                              <UserX size={12} style={{ marginRight: 3 }} />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} style={{ marginRight: 3 }} />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity History & Audit Logs Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--qt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} style={{ color: 'var(--qt-accent)' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Activity History &amp; Audit Trail</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', margin: 0 }}>
                Includes all natural-language requests and security blocks.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-neutral">Tamper-evident logs</span>
            <ExplainButton
              title="Activity History Audit"
              explanation="Every question asked is logged with its AST safety validation outcome and row count. When malicious queries like DROP TABLE are attempted, they are flagged as Blocked."
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Audit ID</th>
                <th>Question Asked</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '120px' }}>Execution Time</th>
                <th style={{ width: '110px' }}>Returned Rows</th>
                <th style={{ width: '140px' }}>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p className="text-muted">No natural-language questions executed yet.</p>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-muted" style={{ fontSize: '0.72rem' }}>
                      {log.id.slice(0, 8)}…
                    </td>
                    <td>
                      <span className="cell-truncate font-medium" style={{ color: 'var(--qt-ink)' }} title={log.question || 'N/A'}>
                        {log.question || 'N/A'}
                      </span>
                    </td>
                    <td>{getAuditStatusBadge(log.status)}</td>
                    <td style={{ color: 'var(--qt-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {log.execution_duration_ms ? `${log.execution_duration_ms} ms` : '—'}
                    </td>
                    <td style={{ color: 'var(--qt-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {log.row_count ?? '—'}
                    </td>
                    <td style={{ color: 'var(--qt-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
