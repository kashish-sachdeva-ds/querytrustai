import React, { useState, useEffect } from 'react'
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserX,
  History,
} from 'lucide-react'
import {
  type UserPublic,
  type AuditLogItem,
  fetchAdminUsers,
  updateAdminUser,
  fetchAdminAuditLogs,
} from '../api/client'
import { useAuth } from '../context/AuthContext'

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
        message: err instanceof Error ? err.message : 'Failed to load administration data',
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
        message: `Updated role for user to '${newRole}'.`,
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

  if (currentUser?.role !== 'admin') {
    return (
      <div className="error-card" role="alert">
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
      <div className="page-action-row">
        <div>
          <h2 className="view-section-title">System &amp; User Administration</h2>
          <p className="view-section-desc">
            Manage user roles, authorization states, and inspect audit logs. Enforced via backend RBAC dependencies.
          </p>
        </div>

        <button
          type="button"
          className="refresh-btn"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`notification-banner ${
            notification.type === 'success' ? 'notification-success' : 'notification-error'
          }`}
          role="status"
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} style={{ color: '#15803D' }} />
          ) : (
            <AlertTriangle size={16} style={{ color: 'var(--qt-danger)' }} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Users Management Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="card-header-title">
            <Users size={18} style={{ color: 'var(--qt-accent)' }} />
            <h3>Authorized Accounts ({users.length})</h3>
          </div>
          <span className="badge-pill">Backend Enforced RBAC</span>
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
                    <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                      Retrieving user records...
                    </p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p className="text-muted">No user records were returned by the administration API.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="user-table-cell">
                          <span className="font-semibold text-primary cell-truncate" title={u.display_name}>{u.display_name}</span>
                          {isCurrent && <span className="badge-self">You</span>}
                        </div>
                      </td>
                      <td className="font-mono text-sm text-secondary"><span className="cell-truncate" title={u.email}>{u.email}</span></td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={updatingId === u.id || isCurrent}
                          className="role-dropdown-select"
                        >
                          <option value="admin">Admin</option>
                          <option value="analyst">Analyst</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`status-badge-pill ${
                            u.is_active ? 'badge-status-active' : 'badge-status-decom'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="status-toggle-btn"
                          disabled={updatingId === u.id || isCurrent}
                          onClick={() => handleStatusToggle(u.id, u.is_active)}
                        >
                          {u.is_active ? (
                            <>
                              <UserX size={13} />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={13} />
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

      {/* Audit Logs Card */}
      <div className="content-card full-width-card" style={{ marginTop: '1.5rem', padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="card-header-title">
            <History size={18} style={{ color: 'var(--qt-accent)' }} />
            <h3>Security &amp; Query Audit Trail</h3>
          </div>
          <span className="badge-pill">Governance Metadata Only</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Query Run</th>
                <th>Status</th>
                <th>Execution Time</th>
                <th>Returned Rows</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p className="text-muted">No natural-language query runs executed yet.</p>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-muted text-xs">{log.id.slice(0, 8)}...</td>
                    <td className="font-medium text-primary"><span className="cell-truncate" title={log.question || 'N/A'}>{log.question || 'N/A'}</span></td>
                    <td>
                      <span className="badge-status-subtle">{log.status}</span>
                    </td>
                    <td className="text-muted">{log.execution_duration_ms ? `${log.execution_duration_ms} ms` : '—'}</td>
                    <td className="text-muted">{log.row_count ?? '—'}</td>
                    <td className="text-muted text-xs">
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
