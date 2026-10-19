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
  UserPlus,
  Check,
  X,
  Clock,
} from 'lucide-react'
import {
  type UserPublic,
  type AuditLogItem,
  type AccessRequestItem,
  fetchAdminUsers,
  updateAdminUser,
  fetchAdminAuditLogs,
  fetchAdminAccessRequests,
  reviewAdminAccessRequest,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ExplainButton } from './ExplainButton'
import { PageHeader } from './PageHeader'
import { HumanDate } from './HumanDate'

export const AdminView: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequestItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [assignedRoles, setAssignedRoles] = useState<Record<string, 'admin' | 'analyst' | 'viewer'>>({})

  const loadData = async () => {
    setLoading(true)
    setNotification(null)
    try {
      const [usersData, logsData, reqsData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminAuditLogs(),
        fetchAdminAccessRequests(),
      ])
      setUsers(usersData)
      setAuditLogs(logsData)
      setAccessRequests(reqsData)
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

  const handleReviewRequest = async (
    requestId: string,
    decision: 'approved' | 'rejected',
    roleToAssign?: 'admin' | 'analyst' | 'viewer'
  ) => {
    setUpdatingId(requestId)
    setNotification(null)
    try {
      const updated = await reviewAdminAccessRequest(requestId, decision, roleToAssign)
      setAccessRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)))
      if (decision === 'approved') {
        const usersData = await fetchAdminUsers()
        setUsers(usersData)
        const finalRole = roleToAssign || updated.role_requested
        setNotification({
          type: 'success',
          message: `Approved access for ${updated.full_name} (${updated.email}). Provisioned as ${finalRole} in workspace '${currentUser?.workspace_name || 'your workspace'}' (initial password: WelcomePass123!).`,
        })
      } else {
        setNotification({
          type: 'success',
          message: `Declined access request for ${updated.email}.`,
        })
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update access request.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const getAuditStatusPill = (log: AuditLogItem) => {
    const s = log.status.toLowerCase()
    if (s.includes('block')) {
      return (
        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ShieldAlert size={11} /> Blocked for safety
        </span>
      )
    }
    if (s.includes('exec') || s.includes('success')) {
      const parts: string[] = []
      if (log.execution_duration_ms) parts.push(`Ran in ${log.execution_duration_ms} ms`)
      if (log.row_count !== undefined && log.row_count !== null) parts.push(`${log.row_count} rows`)
      return (
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={11} /> {parts.length > 0 ? parts.join(', ') : 'Executed'}
        </span>
      )
    }
    if (s.includes('preview')) {
      return (
        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Checked, not run
        </span>
      )
    }
    if (s.includes('clarif')) {
      return <span className="badge badge-warning">Clarified</span>
    }
    return <span className="badge badge-neutral">{log.status}</span>
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
      <PageHeader
        title="People & access"
        description="Who can do what in QueryTrust AI. Permissions are enforced on every backend request."
        helpText="Viewer accounts see a simplified view without SQL. Analysts inspect diagnostics. Admins manage accounts and activity history."
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} style={{ marginRight: 4 }} />
            <span>Refresh</span>
          </button>
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

      {/* Users Management Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--qt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={{ color: 'var(--qt-accent)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Who can do what ({users.length})</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

      {/* Prospective Access Requests Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--qt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} style={{ color: 'var(--qt-accent)' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Access requests ({accessRequests.length})</h3>
                {accessRequests.filter((r) => r.status === 'pending').length > 0 && (
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                    {accessRequests.filter((r) => r.status === 'pending').length} pending review
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', margin: 0 }}>
                Requests submitted from the public sign-in portal. Approving instantly provisions their account.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExplainButton
              title="Access Request Provisioning"
              explanation="Approving an access request automatically creates the user account in PostgreSQL with their requested role and a salted bcrypt hashed password."
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requester Name / Company</th>
                <th>Work Email</th>
                <th>Role to Assign</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="table-loading-spinner" />
                    <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      Retrieving access requests…
                    </p>
                  </td>
                </tr>
              ) : accessRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p className="text-muted" style={{ margin: 0 }}>No prospective access requests received yet.</p>
                  </td>
                </tr>
              ) : (
                accessRequests.map((req) => {
                  const isPending = req.status === 'pending'
                  const isUpdating = updatingId === req.id
                  return (
                    <tr key={req.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{req.full_name}</span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--qt-muted)' }}>{req.company}</span>
                          {req.use_case && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--qt-ink-muted)', marginTop: 2, fontStyle: 'italic' }}>
                              &ldquo;{req.use_case}&rdquo;
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem' }}>
                        {req.email}
                      </td>
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <select
                              value={assignedRoles[req.id] || req.role_requested}
                              onChange={(e) =>
                                setAssignedRoles((prev) => ({
                                  ...prev,
                                  [req.id]: e.target.value as 'admin' | 'analyst' | 'viewer',
                                }))
                              }
                              className="role-dropdown-select"
                              style={{
                                padding: '3px 8px',
                                borderRadius: 'var(--qt-radius-control, 6px)',
                                border: '1px solid var(--qt-border)',
                                background: 'var(--qt-surface)',
                                fontSize: '0.78rem',
                                fontFamily: 'inherit',
                              }}
                              aria-label={`Select role to assign for ${req.full_name}`}
                            >
                              <option value="analyst">Analyst (Queries &amp; Diagnostics)</option>
                              <option value="viewer">Viewer (Read-only, No SQL)</option>
                              <option value="admin">Admin (Full Control)</option>
                            </select>
                            <span style={{ fontSize: '0.68rem', color: 'var(--qt-muted)' }}>
                              Requested: <strong style={{ textTransform: 'capitalize' }}>{req.role_requested}</strong>
                            </span>
                          </div>
                        ) : (
                          <span
                            className={`badge ${req.role_requested === 'analyst' ? 'badge-primary' : 'badge-neutral'}`}
                            style={{ textTransform: 'capitalize' }}
                          >
                            {req.role_requested}
                          </span>
                        )}
                      </td>
                      <td>
                        <HumanDate iso={req.created_at} />
                      </td>
                      <td>
                        {req.status === 'pending' ? (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> Pending
                          </span>
                        ) : req.status === 'approved' ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={11} /> Approved
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <X size={11} /> Declined
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isPending ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={isUpdating}
                              onClick={() =>
                                handleReviewRequest(
                                  req.id,
                                  'approved',
                                  assignedRoles[req.id] || (req.role_requested as 'admin' | 'analyst' | 'viewer')
                                )
                              }
                              style={{ fontSize: '0.72rem', padding: '3px 9px' }}
                              title="Approve request and provision user"
                            >
                              <Check size={12} style={{ marginRight: 3 }} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={isUpdating}
                              onClick={() => handleReviewRequest(req.id, 'rejected')}
                              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                              title="Decline request"
                            >
                              <X size={12} style={{ marginRight: 3 }} />
                              <span>Decline</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>
                            Reviewed {req.reviewed_by ? `by ${req.reviewed_by.split('@')[0]}` : ''}
                          </span>
                        )}
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
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Activity history</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', margin: 0 }}>
                All natural-language requests and safety blocks.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExplainButton
              title="Activity History"
              explanation="Every question asked is logged with its safety validation outcome and row count. Malicious queries like DROP TABLE are flagged as Blocked."
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Question asked</th>
                <th style={{ width: '220px' }}>Result</th>
                <th style={{ width: '140px' }}>When</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem' }}>
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
                    <td>{getAuditStatusPill(log)}</td>
                    <td>
                      <HumanDate iso={log.created_at} fallback="—" />
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
