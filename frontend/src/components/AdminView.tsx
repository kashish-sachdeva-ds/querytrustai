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
  Copy,
  Search,
  ChevronLeft,
  ChevronRight,
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
  apiInviteMember,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ExplainButton } from './ExplainButton'
import { PageHeader } from './PageHeader'
import { HumanDate } from './HumanDate'
import { WebhookSettingsCard } from './WebhookSettingsCard'
import './AdminView.css'

export const AdminView: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequestItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [assignedRoles, setAssignedRoles] = useState<Record<string, 'admin' | 'analyst' | 'viewer'>>({})
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteValues, setInviteValues] = useState({
    fullName: '',
    email: '',
    role: 'analyst' as 'analyst' | 'viewer',
    temporaryPassword: 'WelcomePass123!',
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Team Members Filter & Pagination
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'analyst' | 'viewer'>('all')
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all')
  const [userPage, setUserPage] = useState(1)
  const USER_PAGE_SIZE = 6

  // Access Requests Filter & Pagination
  const [requestTab, setRequestTab] = useState<'pending' | 'resolved' | 'all'>('pending')
  const [requestSearch, setRequestSearch] = useState('')
  const [requestPage, setRequestPage] = useState(1)
  const REQUEST_PAGE_SIZE = 5

  // Activity History Filter & Pagination
  const [auditSearch, setAuditSearch] = useState('')
  const [auditStatusFilter, setAuditStatusFilter] = useState<'all' | 'executed' | 'blocked'>('all')
  const [auditPage, setAuditPage] = useState(1)
  const AUDIT_PAGE_SIZE = 8

  const copyJoinLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
    const wsName = currentUser?.workspace_name || 'Default Workspace'
    const link = `${origin}/?join=${encodeURIComponent(wsName)}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteValues.email || !inviteValues.fullName) return
    setInviteLoading(true)
    try {
      await apiInviteMember({
        full_name: inviteValues.fullName.trim(),
        email: inviteValues.email.trim(),
        role: inviteValues.role,
        temporary_password: inviteValues.temporaryPassword,
      })
      setNotification({
        type: 'success',
        message: `Successfully invited ${inviteValues.fullName} (${inviteValues.email}) as ${inviteValues.role} to '${currentUser?.workspace_name || 'your workspace'}'.`,
      })
      setShowInviteModal(false)
      setInviteValues({
        fullName: '',
        email: '',
        role: 'analyst',
        temporaryPassword: 'WelcomePass123!',
      })
      await loadData()
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to invite team member.',
      })
    } finally {
      setInviteLoading(false)
    }
  }

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
          message: `Approved access for ${updated.full_name} (${updated.email}). Provisioned as ${finalRole} in workspace '${currentUser?.workspace_name || 'your workspace'}' (initial password: WelcomePass123!). Moved from Pending queue to Team Members.`,
        })
      } else {
        setNotification({
          type: 'success',
          message: `Declined access request for ${updated.email}. Moved from Pending queue to Resolved.`,
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

  // --- Derived Calculations: Team Members ---
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false
    if (userStatusFilter === 'active' && !u.is_active) return false
    if (userStatusFilter === 'deactivated' && u.is_active) return false
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase()
      const matchName = (u.display_name || '').toLowerCase().includes(q)
      const matchEmail = (u.email || '').toLowerCase().includes(q)
      if (!matchName && !matchEmail) return false
    }
    return true
  })
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE))
  const paginatedUsers = filteredUsers.slice((userPage - 1) * USER_PAGE_SIZE, userPage * USER_PAGE_SIZE)

  // --- Derived Calculations: Access Requests ---
  const pendingRequestsCount = accessRequests.filter((r) => r.status === 'pending').length
  const resolvedRequestsCount = accessRequests.filter((r) => r.status !== 'pending').length

  const filteredRequests = accessRequests.filter((r) => {
    if (requestTab === 'pending' && r.status !== 'pending') return false
    if (requestTab === 'resolved' && r.status === 'pending') return false
    if (requestSearch.trim()) {
      const q = requestSearch.toLowerCase()
      const matchName = (r.full_name || '').toLowerCase().includes(q)
      const matchEmail = (r.email || '').toLowerCase().includes(q)
      const matchCompany = (r.company || '').toLowerCase().includes(q)
      const matchUseCase = (r.use_case || '').toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchCompany && !matchUseCase) return false
    }
    return true
  })
  const totalRequestPages = Math.max(1, Math.ceil(filteredRequests.length / REQUEST_PAGE_SIZE))
  const paginatedRequests = filteredRequests.slice((requestPage - 1) * REQUEST_PAGE_SIZE, requestPage * REQUEST_PAGE_SIZE)

  // --- Derived Calculations: Audit Logs ---
  const executedAuditCount = auditLogs.filter(
    (l) => l.status.toLowerCase().includes('exec') || l.status.toLowerCase().includes('success')
  ).length
  const blockedAuditCount = auditLogs.filter((l) => l.status.toLowerCase().includes('block')).length

  const filteredAuditLogs = auditLogs.filter((l) => {
    if (auditStatusFilter === 'executed') {
      const s = l.status.toLowerCase()
      if (!s.includes('exec') && !s.includes('success')) return false
    }
    if (auditStatusFilter === 'blocked') {
      const s = l.status.toLowerCase()
      if (!s.includes('block')) return false
    }
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase()
      const matchQ = (l.question || '').toLowerCase().includes(q)
      const matchId = (l.id || '').toLowerCase().includes(q)
      if (!matchQ && !matchId) return false
    }
    return true
  })
  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / AUDIT_PAGE_SIZE))
  const paginatedAuditLogs = filteredAuditLogs.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE)

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
        helpText="Viewer accounts see a simplified view without SQL. Analysts inspect diagnostics. Admins manage accounts, webhooks, and activity history."
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

      {/* 1. Users Management Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--qt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={{ color: 'var(--qt-accent)' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                {currentUser?.workspace_name && currentUser.workspace_name !== 'Default Workspace'
                  ? `${currentUser.workspace_name} — Team Members (${users.length})`
                  : `Who can do what (${users.length})`}
              </h3>
              {currentUser?.workspace_name && currentUser.workspace_name !== 'Default Workspace' && (
                <p style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', margin: 0 }}>
                  Workspace isolated: Only teammates provisioned under {currentUser.workspace_name} appear here.
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowInviteModal(true)}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              <UserPlus size={13} style={{ marginRight: 6 }} />
              <span>+ Invite Team Member</span>
            </button>
            <ExplainButton
              title="User Roles"
              explanation="Admin: Access to benchmarks, user permissions, and audit logs. Analyst: Query asking, model refitting, and diagnostics. Viewer: Simplified plain-English asking with SQL hidden."
            />
          </div>
        </div>

        {/* Toolbar: Search & Role Filter */}
        <div className="admin-toolbar-row">
          <div className="admin-toolbar-left">
            <div className="admin-search-wrapper">
              <Search size={13} />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search teammates by name or email…"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setUserPage(1)
                }}
              />
              {userSearch && (
                <button
                  type="button"
                  className="admin-clear-btn"
                  onClick={() => {
                    setUserSearch('')
                    setUserPage(1)
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="admin-toolbar-right">
            <select
              className="admin-filter-select"
              value={userRoleFilter}
              onChange={(e) => {
                setUserRoleFilter(e.target.value as any)
                setUserPage(1)
              }}
              aria-label="Filter teammates by role"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins only</option>
              <option value="analyst">Analysts only</option>
              <option value="viewer">Viewers only</option>
            </select>
            <select
              className="admin-filter-select"
              value={userStatusFilter}
              onChange={(e) => {
                setUserStatusFilter(e.target.value as any)
                setUserPage(1)
              }}
              aria-label="Filter teammates by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active only</option>
              <option value="deactivated">Deactivated only</option>
            </select>
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p className="text-muted" style={{ margin: 0 }}>
                      {userSearch || userRoleFilter !== 'all' || userStatusFilter !== 'all'
                        ? 'No team members match your filter criteria.'
                        : 'No user records returned.'}
                    </p>
                    {(userSearch || userRoleFilter !== 'all' || userStatusFilter !== 'all') && (
                      <button
                        type="button"
                        className="admin-empty-state-action"
                        onClick={() => {
                          setUserSearch('')
                          setUserRoleFilter('all')
                          setUserStatusFilter('all')
                          setUserPage(1)
                        }}
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
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

        {/* Users Pagination */}
        {filteredUsers.length > USER_PAGE_SIZE && (
          <div className="pagination-bar">
            <span>
              Showing {Math.min((userPage - 1) * USER_PAGE_SIZE + 1, filteredUsers.length)}–
              {Math.min(userPage * USER_PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} teammates
            </span>
            <div className="pagination-controls">
              <span className="page-current">
                Page {userPage} of {totalUserPages}
              </span>
              <div className="page-buttons">
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page of teammates"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={userPage >= totalUserPages}
                  onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                  aria-label="Next page of teammates"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Prospective Access Requests Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--qt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} style={{ color: 'var(--qt-accent)' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                  {currentUser?.workspace_name && currentUser.workspace_name !== 'Default Workspace'
                    ? `${currentUser.workspace_name} — Access Requests`
                    : 'Access Requests'}
                </h3>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', margin: 0 }}>
                {currentUser?.workspace_name && currentUser.workspace_name !== 'Default Workspace'
                  ? `Prospective requests submitted for ${currentUser.workspace_name}. Approving provisions their account.`
                  : 'Requests submitted from the public sign-in portal. Approving instantly provisions their account.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Segmented Queue Filter Tabs */}
            <div className="admin-segmented-tabs" role="tablist" aria-label="Access request queues">
              <button
                type="button"
                role="tab"
                aria-selected={requestTab === 'pending'}
                className={`admin-tab-btn ${requestTab === 'pending' ? 'active' : ''}`}
                onClick={() => {
                  setRequestTab('pending')
                  setRequestPage(1)
                }}
              >
                <span>Pending</span>
                <span className="admin-tab-badge">{pendingRequestsCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={requestTab === 'resolved'}
                className={`admin-tab-btn ${requestTab === 'resolved' ? 'active' : ''}`}
                onClick={() => {
                  setRequestTab('resolved')
                  setRequestPage(1)
                }}
              >
                <span>Resolved</span>
                <span className="admin-tab-badge">{resolvedRequestsCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={requestTab === 'all'}
                className={`admin-tab-btn ${requestTab === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setRequestTab('all')
                  setRequestPage(1)
                }}
              >
                <span>All</span>
                <span className="admin-tab-badge">{accessRequests.length}</span>
              </button>
            </div>

            <ExplainButton
              title="Access Request Provisioning"
              explanation="Approving an access request automatically creates the user account in PostgreSQL with their requested role and a salted bcrypt hashed password. Once approved, they move out of Pending into Team Members."
            />
          </div>
        </div>

        {/* Search bar if multiple requests exist */}
        {accessRequests.length > 3 && (
          <div className="admin-toolbar-row">
            <div className="admin-toolbar-left">
              <div className="admin-search-wrapper">
                <Search size={13} />
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Filter requests by name, email, or company…"
                  value={requestSearch}
                  onChange={(e) => {
                    setRequestSearch(e.target.value)
                    setRequestPage(1)
                  }}
                />
                {requestSearch && (
                  <button
                    type="button"
                    className="admin-clear-btn"
                    onClick={() => {
                      setRequestSearch('')
                      setRequestPage(1)
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="admin-toolbar-right" style={{ fontSize: '0.74rem', color: 'var(--qt-muted)' }}>
              Showing {filteredRequests.length} of {accessRequests.length} requests
            </div>
          </div>
        )}

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
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    {requestTab === 'pending' ? (
                      <div className="admin-empty-state-box">
                        <div className="admin-empty-state-icon">
                          <CheckCircle2 size={22} />
                        </div>
                        <h4 className="admin-empty-state-title">
                          All caught up! No pending access requests.
                        </h4>
                        <p className="admin-empty-state-desc">
                          {currentUser?.workspace_name && currentUser.workspace_name !== 'Default Workspace'
                            ? `Prospective requests submitted for ${currentUser.workspace_name} will appear here for review and provisioning.`
                            : 'Prospective sign-ups submitted from the public portal will appear here.'}
                        </p>
                        {resolvedRequestsCount > 0 && (
                          <button
                            type="button"
                            className="admin-empty-state-action"
                            onClick={() => {
                              setRequestTab('resolved')
                              setRequestPage(1)
                            }}
                          >
                            View {resolvedRequestsCount} resolved request{resolvedRequestsCount > 1 ? 's' : ''} history →
                          </button>
                        )}
                      </div>
                    ) : requestTab === 'resolved' ? (
                      <div className="admin-empty-state-box">
                        <div className="admin-empty-state-icon" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--qt-muted)' }}>
                          <Clock size={22} />
                        </div>
                        <h4 className="admin-empty-state-title">No resolved requests yet</h4>
                        <p className="admin-empty-state-desc">
                          Requests you approve or decline will appear in this audit log.
                        </p>
                      </div>
                    ) : (
                      <div className="admin-empty-state-box">
                        <p className="text-muted" style={{ margin: 0 }}>
                          {requestSearch ? `No requests matching "${requestSearch}".` : 'No access requests received yet.'}
                        </p>
                        {requestSearch && (
                          <button
                            type="button"
                            className="admin-empty-state-action"
                            onClick={() => {
                              setRequestSearch('')
                              setRequestPage(1)
                            }}
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => {
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

        {/* Requests Pagination */}
        {filteredRequests.length > REQUEST_PAGE_SIZE && (
          <div className="pagination-bar">
            <span>
              Showing {Math.min((requestPage - 1) * REQUEST_PAGE_SIZE + 1, filteredRequests.length)}–
              {Math.min(requestPage * REQUEST_PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length} requests
            </span>
            <div className="pagination-controls">
              <span className="page-current">
                Page {requestPage} of {totalRequestPages}
              </span>
              <div className="page-buttons">
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={requestPage <= 1}
                  onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page of access requests"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={requestPage >= totalRequestPages}
                  onClick={() => setRequestPage((p) => Math.min(totalRequestPages, p + 1))}
                  aria-label="Next page of access requests"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Alert Webhooks & Dispatcher Card */}
      <WebhookSettingsCard onNotify={setNotification} />

      {/* 4. Activity History & Audit Logs Card */}
      <div className="content-card full-width-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1rem 1.4rem', borderBottom: '1px solid var(--qt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} style={{ color: 'var(--qt-accent)' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Activity history ({auditLogs.length})
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--qt-muted)', margin: 0 }}>
                All natural-language requests and safety blocks across the workspace.
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

        {/* Toolbar: Search & Segmented Filter */}
        <div className="admin-toolbar-row">
          <div className="admin-toolbar-left">
            <div className="admin-search-wrapper">
              <Search size={13} />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search queries, questions, or query IDs…"
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value)
                  setAuditPage(1)
                }}
              />
              {auditSearch && (
                <button
                  type="button"
                  className="admin-clear-btn"
                  onClick={() => {
                    setAuditSearch('')
                    setAuditPage(1)
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="admin-toolbar-right">
            <div className="admin-segmented-tabs" role="tablist" aria-label="Filter activity status">
              <button
                type="button"
                role="tab"
                aria-selected={auditStatusFilter === 'all'}
                className={`admin-tab-btn ${auditStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setAuditStatusFilter('all')
                  setAuditPage(1)
                }}
              >
                <span>All</span>
                <span className="admin-tab-badge">{auditLogs.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={auditStatusFilter === 'executed'}
                className={`admin-tab-btn ${auditStatusFilter === 'executed' ? 'active' : ''}`}
                onClick={() => {
                  setAuditStatusFilter('executed')
                  setAuditPage(1)
                }}
              >
                <span>Executed</span>
                <span className="admin-tab-badge">{executedAuditCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={auditStatusFilter === 'blocked'}
                className={`admin-tab-btn ${auditStatusFilter === 'blocked' ? 'active' : ''}`}
                onClick={() => {
                  setAuditStatusFilter('blocked')
                  setAuditPage(1)
                }}
              >
                <span>Blocked</span>
                <span className="admin-tab-badge">{blockedAuditCount}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>ID</th>
                <th>Question asked</th>
                <th style={{ width: '220px' }}>Result</th>
                <th style={{ width: '140px' }}>When</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p className="text-muted" style={{ margin: 0 }}>No natural-language questions executed yet.</p>
                  </td>
                </tr>
              ) : filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p className="text-muted" style={{ margin: 0 }}>
                      No queries match the selected filter or search term.
                    </p>
                    <button
                      type="button"
                      className="admin-empty-state-action"
                      onClick={() => {
                        setAuditSearch('')
                        setAuditStatusFilter('all')
                        setAuditPage(1)
                      }}
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedAuditLogs.map((log) => (
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

        {/* Audit Logs Pagination */}
        {filteredAuditLogs.length > AUDIT_PAGE_SIZE && (
          <div className="pagination-bar">
            <span>
              Showing {Math.min((auditPage - 1) * AUDIT_PAGE_SIZE + 1, filteredAuditLogs.length)}–
              {Math.min(auditPage * AUDIT_PAGE_SIZE, filteredAuditLogs.length)} of {filteredAuditLogs.length} queries
            </span>
            <div className="pagination-controls">
              <span className="page-current">
                Page {auditPage} of {totalAuditPages}
              </span>
              <div className="page-buttons">
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page of audit queries"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={auditPage >= totalAuditPages}
                  onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                  aria-label="Next page of audit queries"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Team Member Modal */}
      {showInviteModal && (
        <div className="modal-backdrop-centered" onClick={() => setShowInviteModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 560, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'rgba(255, 92, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--qt-accent)',
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--qt-ink)' }}>
                    Invite Team Member
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--qt-muted)' }}>
                    Add coworkers to <strong>{currentUser?.workspace_name || 'your workspace'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setShowInviteModal(false)}
                aria-label="Close"
                style={{ fontSize: '1.1rem', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Shareable Invite Link Box */}
              <div
                style={{
                  background: 'var(--qt-canvas, #151821)',
                  border: '1px solid var(--qt-border)',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--qt-ink)', marginBottom: 4 }}>
                  Shareable Workspace Join Link
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '0.74rem', color: 'var(--qt-muted)' }}>
                  Send this link to teammates. They will enter their name and password to join directly.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}/?join=${encodeURIComponent(currentUser?.workspace_name || 'Default Workspace')}`}
                    className="form-control font-mono"
                    style={{ fontSize: '0.76rem', padding: '6px 10px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={copyJoinLink}
                    style={{ flexShrink: 0, fontSize: '0.78rem' }}
                  >
                    {copiedLink ? <Check size={13} style={{ color: 'var(--qt-success)' }} /> : <Copy size={13} />}
                    <span style={{ marginLeft: 4 }}>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Direct Provision Form */}
              <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--qt-ink)', borderTop: '1px solid var(--qt-border)', paddingTop: 12 }}>
                  Or Directly Add Team Member
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Full name *</label>
                  <input
                    type="text"
                    required
                    value={inviteValues.fullName}
                    onChange={(e) => setInviteValues((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="e.g. Alex Morgan"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Work email *</label>
                  <input
                    type="email"
                    required
                    value={inviteValues.email}
                    onChange={(e) => setInviteValues((p) => ({ ...p, email: e.target.value }))}
                    placeholder="colleague@yourcompany.com"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Role assignment</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${inviteValues.role === 'analyst' ? 'var(--qt-accent)' : 'var(--qt-border)'}`,
                        background: inviteValues.role === 'analyst' ? 'rgba(255, 92, 0, 0.08)' : 'var(--qt-canvas)',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="invite-role"
                        checked={inviteValues.role === 'analyst'}
                        onChange={() => setInviteValues((p) => ({ ...p, role: 'analyst' }))}
                      />
                      <span><strong>Analyst</strong></span>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${inviteValues.role === 'viewer' ? 'var(--qt-accent)' : 'var(--qt-border)'}`,
                        background: inviteValues.role === 'viewer' ? 'rgba(255, 92, 0, 0.08)' : 'var(--qt-canvas)',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="invite-role"
                        checked={inviteValues.role === 'viewer'}
                        onChange={() => setInviteValues((p) => ({ ...p, role: 'viewer' }))}
                      />
                      <span><strong>Viewer</strong></span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={inviteLoading || !inviteValues.fullName || !inviteValues.email}
                  >
                    {inviteLoading ? 'Adding teammate…' : 'Add Teammate →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
