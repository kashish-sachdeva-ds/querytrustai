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

export interface DeviceCountsResponse {
  total: number
  active: number
  offline: number
  maintenance: number
  retired: number
  open_incidents: number
  needs_data_fix: number
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
const API_TIMEOUT_MS = 8_000
const inFlightRequests = new Map<string, Promise<unknown>>()

export class ApiRequestError extends Error {
  constructor(message: string, readonly status?: number, readonly retryable = false) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

function notifyRetryableApiFailure(message: string): void {
  window.dispatchEvent(new CustomEvent('querytrust:api-failure', { detail: { message } }))
}

async function requestWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (response.status >= 500) {
      notifyRetryableApiFailure('The service had a temporary problem. Reload this view and try again.')
    }
    return response
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const message = 'The request took longer than 8 seconds. Check the service and try again.'
      notifyRetryableApiFailure(message)
      throw new ApiRequestError(message, undefined, true)
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function singleFlight<T>(key: string, request: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined
  if (existing) return existing

  const pending = request().finally(() => inFlightRequests.delete(key))
  inFlightRequests.set(key, pending)
  return pending
}

function requireText(value: string, label: string, min: number, max: number): string {
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    throw new ApiRequestError(`${label} must be between ${min} and ${max} characters.`)
  }
  return normalized
}

function requireUuid(value: string, label: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiRequestError(`${label} is invalid. Refresh and try again.`)
  }
  return value
}

function requireFiniteNumber(value: number, label: string, min: number, max: number, integer = false): number {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new ApiRequestError(`${label} is invalid.`)
  }
  return value
}

export function getStoredToken(): string | null {
  // One-time cleanup for sessions created before the HttpOnly-cookie upgrade.
  localStorage.removeItem(TOKEN_KEY)
  return null
}

export function setStoredToken(token: string): void {
  // Intentionally a no-op. Browser sessions use an HttpOnly SameSite cookie.
  void token
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await requestWithTimeout(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  })

  if (response.status === 401) {
    // Token may have expired
    clearStoredToken()
  }

  return response
}

const API_BASE = '/api/v1'

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await requestWithTimeout('/health')
  if (!res.ok) {
    throw new Error(`Health probe failed: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchReady(): Promise<HealthResponse> {
  const res = await requestWithTimeout('/ready')
  if (!res.ok) {
    throw new Error(`Readiness probe failed: ${res.statusText}`)
  }
  return res.json()
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const cleanEmail = requireText(email, 'Email', 3, 255).toLowerCase()
  const cleanPassword = requireText(password, 'Password', 1, 255)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new ApiRequestError('Enter a valid work email address.')
  }

  return singleFlight(`login:${cleanEmail}`, async () => {
    const res = await requestWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      credentials: 'same-origin',
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new ApiRequestError(errorData.detail || 'Authentication failed. Please verify credentials.', res.status, res.status >= 500)
    }

    const data: LoginResponse = await res.json()
    return data
  })
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
    await requestWithTimeout(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin' })
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
  has_open_incidents?: boolean
  needs_data_fix?: boolean
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
  if (params.has_open_incidents !== undefined) query.set('has_open_incidents', params.has_open_incidents.toString())
  if (params.needs_data_fix !== undefined) query.set('needs_data_fix', params.needs_data_fix.toString())
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

export async function fetchDeviceCounts(): Promise<DeviceCountsResponse> {
  const res = await authFetch(`${API_BASE}/devices/counts`)
  if (!res.ok) {
    throw new Error(`Failed to fetch device counts: ${res.status}`)
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
  requireUuid(id, 'User ID')
  if (payload.role && !['admin', 'analyst', 'viewer'].includes(payload.role)) {
    throw new ApiRequestError('Role is invalid.')
  }
  if (payload.display_name !== undefined) requireText(payload.display_name, 'Display name', 1, 255)
  if (payload.is_active !== undefined && typeof payload.is_active !== 'boolean') {
    throw new ApiRequestError('Account status is invalid.')
  }
  return singleFlight(`admin-user:${id}`, async () => {
    const res = await authFetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new ApiRequestError(`Failed to update user: ${res.status}`, res.status, res.status >= 500)
    return res.json()
  })
}

export async function fetchAdminAuditLogs(): Promise<AuditLogItem[]> {
  const res = await authFetch(`${API_BASE}/admin/audit-logs`)
  if (!res.ok) {
    throw new Error(`Failed to fetch audit logs: ${res.status}`)
  }
  return res.json()
}

export async function previewQuery(question: string, sessionId?: string | null): Promise<PreviewResponse> {
  const cleanQuestion = requireText(question, 'Question', 2, 1000)
  if (sessionId) requireUuid(sessionId, 'Chat session ID')
  return singleFlight(`preview:${sessionId || 'new'}:${cleanQuestion}`, async () => {
    const res = await authFetch(`${API_BASE}/analytics/preview`, {
      method: 'POST',
      body: JSON.stringify({ question: cleanQuestion, session_id: sessionId || null }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiRequestError(err.detail || `Query preview failed: ${res.status}`, res.status, res.status >= 500)
    }
    return res.json()
  })
}

export async function fetchChatSessions(): Promise<ChatSessionSummary[]> {
  const res = await authFetch(`${API_BASE}/chat/sessions`)
  if (!res.ok) {
    throw new Error(`Failed to load chat sessions: ${res.status}`)
  }
  return res.json()
}

export async function createChatSession(title?: string, idempotencyKey: string = crypto.randomUUID()): Promise<ChatSessionSummary> {
  const cleanTitle = requireText(title || 'New Conversation', 'Session title', 1, 255)
  return singleFlight(`chat-create:${idempotencyKey}`, async () => {
    const res = await authFetch(`${API_BASE}/chat/sessions`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ title: cleanTitle }),
    })
    if (!res.ok) throw new ApiRequestError(`Failed to create chat session: ${res.status}`, res.status, res.status >= 500)
    return res.json()
  })
}

export async function fetchSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}/messages`)
  if (!res.ok) {
    throw new Error(`Failed to load messages: ${res.status}`)
  }
  return res.json()
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  requireUuid(sessionId, 'Chat session ID')
  return singleFlight(`chat-delete:${sessionId}`, async () => {
    const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new ApiRequestError(`Failed to delete session: ${res.status}`, res.status, res.status >= 500)
  })
}

export async function executeSavedQuery(queryRunId: string): Promise<ExecuteResponse> {
  requireUuid(queryRunId, 'Query preview ID')
  return singleFlight(`query-execute:${queryRunId}`, async () => {
    const res = await authFetch(`${API_BASE}/analytics/execute`, {
      method: 'POST',
      body: JSON.stringify({ query_run_id: queryRunId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiRequestError(err.detail || `Query execution failed: ${res.status}`, res.status, res.status >= 500)
    }
    return res.json()
  })
}

export async function submitQueryFeedback(
  queryRunId: string,
  isHelpful: boolean,
  explanation?: string
): Promise<FeedbackResponse> {
  requireUuid(queryRunId, 'Query preview ID')
  if (typeof isHelpful !== 'boolean') throw new ApiRequestError('Feedback selection is invalid.')
  const cleanExplanation = explanation ? requireText(explanation, 'Feedback explanation', 1, 1000) : null
  return singleFlight(`query-feedback:${queryRunId}`, async () => {
    const res = await authFetch(`${API_BASE}/analytics/feedback`, {
      method: 'POST',
      body: JSON.stringify({ query_run_id: queryRunId, is_helpful: isHelpful, explanation: cleanExplanation }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiRequestError(err.detail || `Feedback submission failed: ${res.status}`, res.status, res.status >= 500)
    }
    return res.json()
  })
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

// ==========================================
// DATA QUALITY API CLIENT
// ==========================================

export interface DataQualityFindingItem {
  id: string
  run_id: string
  table_name: string
  column_name?: string | null
  rule_id: string
  rule_name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  affected_rows: number
  total_rows: number
  affected_percentage: number
  example_identifiers: string[]
  suggested_action: string
  created_at: string
}

export interface DataQualityRunSummary {
  id: string
  triggered_by?: string | null
  status: string
  total_findings: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  total_records_analyzed: number
  overall_health_score: number
  created_at: string
  completed_at?: string | null
}

export interface DataQualityRunResponse {
  summary: DataQualityRunSummary
  findings: DataQualityFindingItem[]
}

export interface DataQualityFindingsResponse {
  total: number
  page: number
  limit: number
  findings: DataQualityFindingItem[]
}

export async function fetchDataQualitySummary(): Promise<DataQualityRunSummary> {
  const res = await authFetch(`${API_BASE}/data-quality/summary`)
  if (!res.ok) {
    throw new Error(`Failed to load data quality summary: ${res.status}`)
  }
  return res.json()
}

export async function runDataQualityProfile(): Promise<DataQualityRunResponse> {
  return singleFlight('data-quality-profile', async () => {
    const res = await authFetch(`${API_BASE}/data-quality/run`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiRequestError(err.detail || `Data quality profiling failed: ${res.status}`, res.status, res.status >= 500)
    }
    return res.json()
  })
}

export async function fetchDataQualityFindings(
  severity?: string,
  tableName?: string,
  page: number = 1,
  limit: number = 20
): Promise<DataQualityFindingsResponse> {
  const params = new URLSearchParams()
  if (severity) params.set('severity', severity)
  if (tableName) params.set('table_name', tableName)
  params.set('page', page.toString())
  params.set('limit', limit.toString())

  const res = await authFetch(`${API_BASE}/data-quality/findings?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to load data quality findings: ${res.status}`)
  }
  return res.json()
}

// ==========================================
// ANOMALY DETECTION API CLIENT
// ==========================================

export interface ModelMetadataResponse {
  id: string
  model_name: string
  version: string
  algorithm: string
  feature_list: string[]
  dataset_identifier: string
  contamination: number
  fit_time: string
  metrics: {
    training_samples?: number
    detected_outliers_count?: number
    known_injected_outliers_count?: number
    synthetic_benchmark_metrics?: {
      precision: number
      recall: number
      f1_score: number
      true_positives: number
      false_positives: number
      false_negatives: number
    }
    disclaimer?: string
  }
  is_active: boolean
  status: string
}

export interface TelemetryFeatureValues {
  cpu_percent: number
  memory_percent: number
  temperature_c: number
  packet_loss_percent: number
  latency_ms: number
}

export interface AnomalyItem {
  reading_id: number
  device_id: number
  asset_tag: string
  device_type: string
  vendor: string
  model: string
  site_name: string
  region: string
  recorded_at: string
  telemetry: TelemetryFeatureValues
  anomaly_score: number
  problem_signal_count: number
  is_outlier: boolean
  known_injected_outlier?: boolean | null
  rank: number
}

export interface AnomalyScanResponse {
  model_version: string
  algorithm: string
  total_telemetry_scanned: number
  anomalies_detected: number
  disclaimer: string
  scan_time_ms: number
  top_anomalies: AnomalyItem[]
}

export interface ModelTrainResponse {
  model_id: string
  version: string
  training_samples: number
  fit_duration_seconds: number
  metrics: Record<string, unknown>
  message: string
}

export async function fetchAnomalySummary(): Promise<ModelMetadataResponse> {
  const res = await authFetch(`${API_BASE}/anomalies/summary`)
  if (!res.ok) {
    throw new Error(`Failed to load anomaly model metadata: ${res.status}`)
  }
  return res.json()
}

export async function runAnomalyScan(
  limit: number = 50,
  threshold: number = 0.65
): Promise<AnomalyScanResponse> {
  requireFiniteNumber(limit, 'Scan limit', 1, 500, true)
  requireFiniteNumber(threshold, 'Score threshold', 0, 1)
  return singleFlight(`anomaly-scan:${limit}:${threshold}`, async () => {
    const res = await authFetch(`${API_BASE}/anomalies/scan`, {
      method: 'POST',
      body: JSON.stringify({ limit, threshold }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiRequestError(err.detail || `Anomaly scan failed: ${res.status}`, res.status, res.status >= 500)
    }
    return res.json()
  })
}

export async function fetchCurrentUnusualActivity(): Promise<AnomalyScanResponse> {
  const res = await authFetch(`${API_BASE}/anomalies/current`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiRequestError(err.detail || `Failed to load unusual activity: ${res.status}`, res.status, res.status >= 500)
  }
  return res.json()
}

export async function trainAnomalyModel(contamination: number = 0.015): Promise<ModelTrainResponse> {
  requireFiniteNumber(contamination, 'Contamination', 0.001, 0.1)
  return singleFlight(`anomaly-train:${contamination}`, async () => {
    const res = await authFetch(`${API_BASE}/anomalies/train?contamination=${contamination}`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiRequestError(err.detail || `Model training failed: ${res.status}`, res.status, res.status >= 500)
    }
    return res.json()
  })
}

// ==========================================
// EVALUATION LAB API CLIENT
// ==========================================

export interface EvalCategoryMetric {
  total: number
  passed: number
  failed: number
  pass_rate: number
}

export interface EvalCaseResult {
  case_id: string
  category: string
  question: string
  expected_behavior: string
  actual_behavior: string
  passed: boolean
  failure_reason?: string | null
  interpreted_question?: string | null
  generated_sql?: string | null
  validation: Record<string, any>
  latency_ms: number
}

export interface EvalFailureDetail {
  case_id: string
  category: string
  question: string
  expected_behavior: string
  actual_behavior: string
  failure_reason: string
}

export interface EvaluationRunResponse {
  evaluation_run_id: string
  benchmark_name: string
  benchmark_version: string
  dataset_version: string
  provider: string
  model: string
  mode: string
  is_demo_mode: boolean
  prompt_version: string
  status: string
  total_cases: number
  passed_cases: number
  failed_cases: number
  overall_pass_rate: number
  safe_rejection_rate: number
  forbidden_execution_count: number
  clarification_accuracy: number
  multi_turn_correctness: number
  median_latency_ms: number
  p95_latency_ms: number
  category_metrics: Record<string, EvalCategoryMetric>
  case_results: EvalCaseResult[]
  failures_detail: EvalFailureDetail[]
  started_at: string
  completed_at: string
}

export interface EvaluationRunListItem {
  id: string
  benchmark_name: string
  benchmark_version: string
  provider: string
  mode: string
  status: string
  total_cases: number
  passed_cases: number
  failed_cases: number
  overall_pass_rate: number
  category_metrics: Record<string, any>
  started_at: string
  completed_at?: string | null
}

export async function fetchEvaluationRuns(): Promise<EvaluationRunListItem[]> {
  const res = await authFetch(`${API_BASE}/evaluations`)
  if (!res.ok) {
    throw new Error(`Failed to load evaluation runs: ${res.status}`)
  }
  return res.json()
}

export async function runEvaluation(mode: string = 'guarded'): Promise<EvaluationRunResponse> {
  if (mode !== 'guarded' && mode !== 'baseline') throw new ApiRequestError('Evaluation mode is invalid.')
  return singleFlight(`evaluation:${mode}`, async () => {
    const res = await authFetch(`${API_BASE}/evaluations/run`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiRequestError(err.detail || `Evaluation run failed: ${res.status}`, res.status, res.status >= 500)
    }
    return res.json()
  })
}

export async function fetchEvaluationDetail(id: string): Promise<any> {
  const res = await authFetch(`${API_BASE}/evaluations/${id}`)
  if (!res.ok) {
    throw new Error(`Failed to load evaluation detail: ${res.status}`)
  }
  return res.json()
}

