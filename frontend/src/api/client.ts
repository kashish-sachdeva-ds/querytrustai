export interface HealthResponse {
  status: string
  version: string
  environment: string
  llm_provider: string
  database: string
  details?: Record<string, unknown>
}

export interface MetricItem {
  name: string
  value: number
  percentage?: number
}

export interface RecentEventItem {
  id: number
  device_id: number
  asset_tag: string
  event_type: string
  severity: string
  status: string
  opened_at: string
}

export interface DashboardSummaryResponse {
  total_devices: number
  active_devices: number
  expiring_warranties_30d: number
  open_service_events: number
  total_sites: number
  devices_by_type: MetricItem[]
  devices_by_status: MetricItem[]
  events_by_severity: MetricItem[]
  recent_service_events: RecentEventItem[]
  warranties_by_bucket: MetricItem[]
  top_sites_by_expiring_warranties: MetricItem[]
  reference_date: string
}

export interface UserPublic {
  id: string
  email: string
  display_name: string
  role: 'admin' | 'analyst' | 'viewer'
  is_active: boolean
}

export interface UserMeResponse {
  id: string
  email: string
  display_name: string
  role: 'admin' | 'analyst' | 'viewer'
  is_active: boolean
  environment: string
  llm_provider: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: UserPublic
}

export interface DeviceSummary {
  id: number
  asset_tag: string
  device_type: string
  vendor: string
  model: string
  firmware_version: string
  site_id: number
  site_name?: string
  site_code?: string
  region?: string
  status: string
  installed_at: string
  warranty_expiry?: string | null
  serial_number?: string | null
}

export interface DeviceEventSummary {
  id: number
  event_type: string
  severity: string
  status: string
  opened_at: string
  closed_at?: string | null
  description?: string | null
}

export interface DeviceDetail extends DeviceSummary {
  recent_events: DeviceEventSummary[]
}

export interface DeviceListResponse {
  items: DeviceSummary[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface SiteSummary {
  id: number
  site_code: string
  site_name: string
  city: string
  region: string
  device_count?: number
}

export interface SiteListResponse {
  items: SiteSummary[]
  total: number
}

export interface AuditLogItem {
  id: string
  user_id?: string | null
  session_id?: string | null
  question?: string
  status: string
  error_category?: string | null
  row_count?: number
  execution_duration_ms?: number
  created_at?: string | null
}

export interface ValidationDetail {
  passed: boolean
  checks: string[]
  violations: string[]
  warnings: string[]
  tables_referenced: string[]
}

export interface PreviewResponse {
  query_run_id: string
  session_id?: string | null
  status: string
  intent_status: string
  interpreted_question: string
  clarification_question?: string | null
  sql_preview?: string | null
  validation: ValidationDetail
  assumptions: string[]
  business_terms_used: string[]
  can_execute: boolean
  provider: string
  model: string
  is_demo_mode: boolean
  created_at: string
}

export interface ChatSessionSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata_json?: Record<string, any> | null
  created_at: string
}

export interface ChartRecommendation {
  chart_type: 'bar' | 'pie' | 'line' | 'table' | 'metric'
  x_axis?: string | null
  y_axis?: string | null
  title: string
}

export interface ExecuteResponse {
  query_run_id: string
  status: string
  row_count: number
  columns: string[]
  rows: Record<string, any>[]
  truncated: boolean
  execution_duration_ms: number
  executed_at: string
  chart_recommendation: ChartRecommendation
  result_summary: string
}

export interface FeedbackResponse {
  id: string
  query_run_id: string
  is_helpful: boolean
  explanation?: string | null
  created_at: string
}

export interface QueryHistoryItem {
  id: string
  session_id?: string | null
  user_id: string
  question: string
  interpreted_question?: string | null
  generated_sql: string
  status: string
  row_count?: number | null
  execution_duration_ms?: number | null
  error_category?: string | null
  created_at: string
  executed_at?: string | null
  is_helpful?: boolean | null
  feedback_explanation?: string | null
}

export interface QueryHistoryResponse {
  items: QueryHistoryItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

const TOKEN_KEY = 'querytrust_jwt_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    // Token may have expired
    clearStoredToken()
  }

  return response
}

const API_BASE = '/api/v1'

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/health')
  if (!res.ok) {
    throw new Error(`Health probe failed: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchReady(): Promise<HealthResponse> {
  const res = await fetch('/ready')
  if (!res.ok) {
    throw new Error(`Readiness probe failed: ${res.statusText}`)
  }
  return res.json()
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Authentication failed. Please verify credentials.')
  }

  const data: LoginResponse = await res.json()
  setStoredToken(data.access_token)
  return data
}

export async function apiGetMe(): Promise<UserMeResponse> {
  const res = await authFetch(`${API_BASE}/auth/me`)
  if (!res.ok) {
    throw new Error(`Failed to authenticate user: ${res.status}`)
  }
  return res.json()
}

export async function apiLogout(): Promise<void> {
  clearStoredToken()
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' })
  } catch {
    // Ignore network errors on logout
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await authFetch(`${API_BASE}/dashboard/summary`)
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('401_UNAUTHORIZED')
    }
    throw new Error(`Failed to load dashboard summary: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function fetchDevices(params: {
  page?: number
  page_size?: number
  search?: string
  device_type?: string
  status?: string
  site_id?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}): Promise<DeviceListResponse> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page.toString())
  if (params.page_size) query.set('page_size', params.page_size.toString())
  if (params.search) query.set('search', params.search)
  if (params.device_type) query.set('device_type', params.device_type)
  if (params.status) query.set('status', params.status)
  if (params.site_id) query.set('site_id', params.site_id.toString())
  if (params.sort_by) query.set('sort_by', params.sort_by)
  if (params.sort_dir) query.set('sort_dir', params.sort_dir)

  const res = await authFetch(`${API_BASE}/devices?${query.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch devices: ${res.status}`)
  }
  return res.json()
}

export async function fetchDeviceDetail(id: number): Promise<DeviceDetail> {
  const res = await authFetch(`${API_BASE}/devices/${id}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch device detail: ${res.status}`)
  }
  return res.json()
}

export async function fetchSites(region?: string): Promise<SiteListResponse> {
  const query = new URLSearchParams()
  if (region) query.set('region', region)

  const res = await authFetch(`${API_BASE}/sites?${query.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch sites: ${res.status}`)
  }
  return res.json()
}

export async function fetchAdminUsers(): Promise<UserPublic[]> {
  const res = await authFetch(`${API_BASE}/admin/users`)
  if (!res.ok) {
    throw new Error(`Failed to fetch users: ${res.status}`)
  }
  return res.json()
}

export async function updateAdminUser(
  id: string,
  payload: { role?: string; is_active?: boolean; display_name?: string }
): Promise<UserPublic> {
  const res = await authFetch(`${API_BASE}/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to update user: ${res.status}`)
  }
  return res.json()
}

export async function fetchAdminAuditLogs(): Promise<AuditLogItem[]> {
  const res = await authFetch(`${API_BASE}/admin/audit-logs`)
  if (!res.ok) {
    throw new Error(`Failed to fetch audit logs: ${res.status}`)
  }
  return res.json()
}

export async function previewQuery(question: string, sessionId?: string | null): Promise<PreviewResponse> {
  const res = await authFetch(`${API_BASE}/analytics/preview`, {
    method: 'POST',
    body: JSON.stringify({ question, session_id: sessionId || null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Query preview failed: ${res.status}`)
  }
  return res.json()
}

export async function fetchChatSessions(): Promise<ChatSessionSummary[]> {
  const res = await authFetch(`${API_BASE}/chat/sessions`)
  if (!res.ok) {
    throw new Error(`Failed to load chat sessions: ${res.status}`)
  }
  return res.json()
}

export async function createChatSession(title?: string): Promise<ChatSessionSummary> {
  const res = await authFetch(`${API_BASE}/chat/sessions`, {
    method: 'POST',
    body: JSON.stringify({ title: title || 'New Conversation' }),
  })
  if (!res.ok) {
    throw new Error(`Failed to create chat session: ${res.status}`)
  }
  return res.json()
}

export async function fetchSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}/messages`)
  if (!res.ok) {
    throw new Error(`Failed to load messages: ${res.status}`)
  }
  return res.json()
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to delete session: ${res.status}`)
  }
}

export async function executeSavedQuery(queryRunId: string): Promise<ExecuteResponse> {
  const res = await authFetch(`${API_BASE}/analytics/execute`, {
    method: 'POST',
    body: JSON.stringify({ query_run_id: queryRunId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Query execution failed: ${res.status}`)
  }
  return res.json()
}

export async function submitQueryFeedback(
  queryRunId: string,
  isHelpful: boolean,
  explanation?: string
): Promise<FeedbackResponse> {
  const res = await authFetch(`${API_BASE}/analytics/feedback`, {
    method: 'POST',
    body: JSON.stringify({
      query_run_id: queryRunId,
      is_helpful: isHelpful,
      explanation: explanation || null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Feedback submission failed: ${res.status}`)
  }
  return res.json()
}

export async function fetchQueryHistory(
  page: number = 1,
  pageSize: number = 20,
  status?: string
): Promise<QueryHistoryResponse> {
  const query = new URLSearchParams()
  query.set('page', page.toString())
  query.set('page_size', pageSize.toString())
  if (status) query.set('status', status)

  const res = await authFetch(`${API_BASE}/analytics/history?${query.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to load query history: ${res.status}`)
  }
  return res.json()
}
