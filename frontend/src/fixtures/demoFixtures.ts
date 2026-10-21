import type {
  DashboardSummaryResponse,
  DeviceListResponse,
  UserMeResponse,
  DeviceSummary,
  DeviceEventSummary,
} from '../api/client'

export interface DataQualityCheckItem {
  rule_id: string
  name: string
  category: string
  severity: string
  status: 'passed' | 'flagged'
  affected_count: number
  affected_pct: number
  description: string
  sample_ids: string[]
  remediation_guidance: string
}

export interface DataQualitySummaryResponse {
  health_score: number
  total_checks: number
  passed_checks: number
  flagged_checks: number
  critical_findings: number
  scanned_records: number
  last_profiled_at: string
  checks: DataQualityCheckItem[]
}

export interface AnomalyItemFixture {
  reading_id: number
  device_id: number
  asset_tag: string
  site_name: string
  recorded_at: string
  anomaly_score: number
  severity: string
  sensor_values: {
    cpu_utilization_pct: number
    memory_utilization_pct: number
    temperature_celsius: number
    packet_loss_pct: number
    latency_ms: number
  }
  story: string
}

export interface AnomalySummaryResponse {
  total_readings_scanned: number
  outliers_detected: number
  contamination_rate: number
  scan_duration_ms: number
  scanned_at: string
  model_metadata: {
    model_version: string
    algorithm: string
    n_estimators: number
    contamination: number
    random_state: number
    feature_names: string[]
    precision: number
    recall: number
    f1_score: number
    disclaimer: string
  }
  top_anomalies: AnomalyItemFixture[]
}

export interface EvaluationCategorySummary {
  category: string
  count: number
  passed: number
  pass_rate: number
}

export interface EvaluationSummaryResponse {
  suite_version: string
  total_cases: number
  overall_pass_rate: number
  safe_rejection_rate: number
  forbidden_executions: number
  clarification_accuracy: number
  multi_turn_correctness: number
  median_latency_ms: number
  p95_latency_ms: number
  evaluated_at: string
  categories: EvaluationCategorySummary[]
}

export interface DemoDeviceDetail extends DeviceSummary {
  recent_events: DeviceEventSummary[]
  recent_telemetry?: Array<{
    id: number
    device_id: number
    recorded_at: string
    cpu_utilization_pct: number
    memory_utilization_pct: number
    temperature_celsius: number
    packet_loss_pct: number
    latency_ms: number
  }>
}

export const demoUser: UserMeResponse = {
  id: 'demo-analyst-uuid',
  email: 'analyst@querytrust.local',
  display_name: 'Lead Analyst',
  role: 'analyst',
  workspace_name: 'Enterprise Demo Sandbox',
  is_active: true,
  environment: 'offline_demo',
  llm_provider: 'demo (deterministic rule engine)',
}

export const demoAdminUser: UserMeResponse = {
  id: 'demo-admin-uuid',
  email: 'admin@querytrust.local',
  display_name: 'System Admin',
  role: 'admin',
  workspace_name: 'Enterprise Demo Sandbox',
  is_active: true,
  environment: 'offline_demo',
  llm_provider: 'demo (deterministic rule engine)',
}

export const demoViewerUser: UserMeResponse = {
  id: 'demo-viewer-uuid',
  email: 'viewer@querytrust.local',
  display_name: 'Auditor Viewer',
  role: 'viewer',
  workspace_name: 'Enterprise Demo Sandbox',
  is_active: true,
  environment: 'offline_demo',
  llm_provider: 'demo (deterministic rule engine)',
}

export const demoDashboardSummary: DashboardSummaryResponse = {
  total_devices: 5000,
  active_devices: 3019,
  expiring_warranties_30d: 412,
  open_service_events: 184,
  total_sites: 50,
  reference_date: '2026-10-14',
  devices_by_type: [
    { name: 'Router', value: 1820, percentage: 36.4 },
    { name: 'Switch', value: 1640, percentage: 32.8 },
    { name: 'Firewall', value: 890, percentage: 17.8 },
    { name: 'Access Point', value: 650, percentage: 13.0 },
  ],
  devices_by_status: [
    { name: 'Active', value: 3019, percentage: 60.38 },
    { name: 'Maintenance', value: 657, percentage: 13.14 },
    { name: 'Retired', value: 648, percentage: 12.96 },
    { name: 'Offline', value: 609, percentage: 12.18 },
    { name: 'Pending Audit', value: 50, percentage: 1.0 },
    { name: 'Staged', value: 17, percentage: 0.34 },
  ],
  events_by_severity: [
    { name: 'Critical', value: 28, percentage: 15.2 },
    { name: 'High', value: 54, percentage: 29.3 },
    { name: 'Medium', value: 62, percentage: 33.7 },
    { name: 'Low', value: 40, percentage: 21.8 },
  ],
  recent_service_events: [
    {
      id: 101,
      device_id: 12,
      asset_tag: 'ASSET-00012',
      event_type: 'BGP Flapping',
      severity: 'critical',
      status: 'investigating',
      opened_at: '2026-10-14T08:22:10Z',
    },
    {
      id: 102,
      device_id: 84,
      asset_tag: 'ASSET-00084',
      event_type: 'High Thermal Drift',
      severity: 'high',
      status: 'assigned',
      opened_at: '2026-10-14T07:15:33Z',
    },
    {
      id: 103,
      device_id: 204,
      asset_tag: 'ASSET-00204',
      event_type: 'Optics Degradation',
      severity: 'medium',
      status: 'pending_vendor',
      opened_at: '2026-10-13T22:45:11Z',
    },
    {
      id: 104,
      device_id: 419,
      asset_tag: 'ASSET-00419',
      event_type: 'Power Redundancy Lost',
      severity: 'high',
      status: 'investigating',
      opened_at: '2026-10-13T19:10:04Z',
    },
    {
      id: 105,
      device_id: 591,
      asset_tag: 'ASSET-00591',
      event_type: 'Memory Leak Threshold',
      severity: 'medium',
      status: 'resolved',
      opened_at: '2026-10-13T14:02:50Z',
    },
  ],
  warranties_by_bucket: [
    { name: 'Expired', value: 416, percentage: 8.3 },
    { name: '<30 Days', value: 412, percentage: 8.2 },
    { name: '30-90 Days', value: 618, percentage: 12.4 },
    { name: '90-180 Days', value: 1120, percentage: 22.4 },
    { name: '>180 Days', value: 2434, percentage: 48.7 },
  ],
  top_sites_by_expiring_warranties: [
    { name: 'Dallas-DC-1', value: 58 },
    { name: 'Frankfurt-HQ', value: 49 },
    { name: 'Tokyo-DC-2', value: 41 },
    { name: 'Singapore-Edge', value: 37 },
    { name: 'Chicago-Branch', value: 32 },
  ],
}

export const demoDevices: DemoDeviceDetail[] = [
  {
    id: 1,
    asset_tag: 'ASSET-00001',
    device_type: 'Router',
    vendor: 'Enterprise Networks',
    model: 'CoreEdge-9500',
    serial_number: 'SN-9500-8812A',
    firmware_version: '17.06.01a',
    site_id: 1,
    site_name: 'Dallas-DC-1',
    site_code: 'DFW-01',
    region: 'North America',
    status: 'active',
    installed_at: '2022-03-15T09:00:00Z',
    warranty_expiry: '2026-11-20T00:00:00Z',
    recent_events: [],
    recent_telemetry: [
      { id: 1, device_id: 1, recorded_at: '2026-10-14T10:00:00Z', cpu_utilization_pct: 42.1, memory_utilization_pct: 61.2, temperature_celsius: 48.5, packet_loss_pct: 0.01, latency_ms: 12.4 },
      { id: 2, device_id: 1, recorded_at: '2026-10-14T09:00:00Z', cpu_utilization_pct: 44.5, memory_utilization_pct: 60.8, temperature_celsius: 47.9, packet_loss_pct: 0.0, latency_ms: 11.9 },
      { id: 3, device_id: 1, recorded_at: '2026-10-14T08:00:00Z', cpu_utilization_pct: 41.8, memory_utilization_pct: 60.5, temperature_celsius: 48.1, packet_loss_pct: 0.02, latency_ms: 12.1 },
    ],
  },
  {
    id: 7,
    asset_tag: 'ASSET-00007',
    device_type: 'Switch',
    vendor: 'Enterprise Networks',
    model: 'DistroSwitch-4800',
    serial_number: 'SN-4800-1192X',
    firmware_version: '15.02.04',
    site_id: 2,
    site_name: 'Frankfurt-HQ',
    site_code: 'FRA-01',
    region: 'Europe',
    status: 'active',
    installed_at: '2024-05-10T11:00:00Z',
    warranty_expiry: '2023-01-01T00:00:00Z', // DQ-002 defect
    recent_events: [
      { id: 201, event_type: 'Config Audit Flag', severity: 'low', status: 'resolved', opened_at: '2026-10-10T12:00:00Z' },
    ],
    recent_telemetry: [
      { id: 10, device_id: 7, recorded_at: '2026-10-14T10:00:00Z', cpu_utilization_pct: 88.4, memory_utilization_pct: 92.1, temperature_celsius: 78.4, packet_loss_pct: 4.8, latency_ms: 142.1 },
    ],
  },
  {
    id: 12,
    asset_tag: 'ASSET-00012',
    device_type: 'Router',
    vendor: 'Enterprise Networks',
    model: 'CoreEdge-9500',
    serial_number: 'SN-9500-9943B',
    firmware_version: '17.06.01a',
    site_id: 1,
    site_name: 'Dallas-DC-1',
    site_code: 'DFW-01',
    region: 'North America',
    status: 'active',
    installed_at: '2021-08-20T14:30:00Z',
    warranty_expiry: '2026-10-28T00:00:00Z',
    recent_events: [
      { id: 101, event_type: 'BGP Flapping', severity: 'critical', status: 'investigating', opened_at: '2026-10-14T08:22:10Z' },
    ],
    recent_telemetry: [
      { id: 21, device_id: 12, recorded_at: '2026-10-14T10:00:00Z', cpu_utilization_pct: 94.2, memory_utilization_pct: 89.6, temperature_celsius: 82.1, packet_loss_pct: 7.2, latency_ms: 195.0 },
    ],
  },
  {
    id: 25,
    asset_tag: 'ASSET-00025',
    device_type: 'Firewall',
    vendor: 'Enterprise Networks',
    model: 'SecureGateway-500',
    serial_number: 'SN-SG500-4321C',
    firmware_version: 'vv16.03.02', // DQ-004 glitch
    site_id: 3,
    site_name: 'Tokyo-DC-2',
    site_code: 'TYO-02',
    region: 'Asia Pacific',
    status: 'active',
    installed_at: '2023-01-18T10:15:00Z',
    warranty_expiry: '2026-12-15T00:00:00Z',
    recent_events: [],
    recent_telemetry: [
      { id: 35, device_id: 25, recorded_at: '2026-10-14T10:00:00Z', cpu_utilization_pct: 35.0, memory_utilization_pct: 54.0, temperature_celsius: 42.0, packet_loss_pct: 0.0, latency_ms: 8.5 },
    ],
  },
  {
    id: 84,
    asset_tag: 'ASSET-00084',
    device_type: 'Switch',
    vendor: 'Enterprise Networks',
    model: 'DistroSwitch-4800',
    serial_number: null, // DQ-001b defect
    firmware_version: '15.02.04',
    site_id: 4,
    site_name: 'Singapore-Edge',
    site_code: 'SIN-01',
    region: 'Asia Pacific',
    status: 'maintenance',
    installed_at: '2022-11-04T08:00:00Z',
    warranty_expiry: '2026-11-01T00:00:00Z',
    recent_events: [
      { id: 102, event_type: 'High Thermal Drift', severity: 'high', status: 'assigned', opened_at: '2026-10-14T07:15:33Z' },
    ],
    recent_telemetry: [
      { id: 45, device_id: 84, recorded_at: '2026-10-14T10:00:00Z', cpu_utilization_pct: 76.1, memory_utilization_pct: 82.5, temperature_celsius: 79.2, packet_loss_pct: 1.5, latency_ms: 68.4 },
    ],
  },
]

export function getDemoDevicesList(params: {
  page?: number
  page_size?: number
  search?: string
  device_type?: string
  status?: string
}): DeviceListResponse {
  let filtered = [...demoDevices]
  if (params.search) {
    const s = params.search.toLowerCase()
    filtered = filtered.filter(
      (d) =>
        d.asset_tag.toLowerCase().includes(s) ||
        d.model.toLowerCase().includes(s) ||
        (d.site_name && d.site_name.toLowerCase().includes(s)),
    )
  }
  if (params.device_type) {
    filtered = filtered.filter((d) => d.device_type.toLowerCase() === params.device_type?.toLowerCase())
  }
  if (params.status) {
    filtered = filtered.filter((d) => d.status.toLowerCase() === params.status?.toLowerCase())
  }

  const page = params.page || 1
  const pageSize = params.page_size || 25
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return {
    items,
    total: 5000,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(5000 / pageSize),
  }
}

export const demoDataQualitySummary: DataQualitySummaryResponse = {
  health_score: 96.99,
  total_checks: 6,
  passed_checks: 1,
  flagged_checks: 5,
  critical_findings: 3,
  scanned_records: 5000,
  last_profiled_at: '2026-10-14T09:30:00Z',
  checks: [
    {
      rule_id: 'DQ-001a',
      name: 'Missing Critical Attribute: Warranty Expiry',
      category: 'Completeness',
      severity: 'high',
      status: 'flagged',
      affected_count: 416,
      affected_pct: 8.32,
      description: 'Devices with null or unpopulated warranty expiration timestamp.',
      sample_ids: ['ASSET-00042', 'ASSET-00108', 'ASSET-00312'],
      remediation_guidance: 'Populate manufacturer contract expiry dates from purchasing ERP.',
    },
    {
      rule_id: 'DQ-001b',
      name: 'Missing Critical Attribute: Chassis Serial Number',
      category: 'Completeness',
      severity: 'critical',
      status: 'flagged',
      affected_count: 151,
      affected_pct: 3.02,
      description: 'Devices lacking physical chassis serial numbers needed for hardware support.',
      sample_ids: ['ASSET-00084', 'ASSET-00192', 'ASSET-00411'],
      remediation_guidance: 'Scan barcode tag during next maintenance window.',
    },
    {
      rule_id: 'DQ-002',
      name: 'Invalid Lifecycle Date Sequence',
      category: 'Validity',
      severity: 'critical',
      status: 'flagged',
      affected_count: 12,
      affected_pct: 0.24,
      description: 'Warranty expiry recorded prior to equipment installation date.',
      sample_ids: ['ASSET-00007', 'ASSET-00812'],
      remediation_guidance: 'Correct inverted installation vs warranty date entry.',
    },
    {
      rule_id: 'DQ-003',
      name: 'Duplicate Chassis Serial Numbers',
      category: 'Uniqueness',
      severity: 'critical',
      status: 'flagged',
      affected_count: 8,
      affected_pct: 0.16,
      description: 'Multiple asset tags registered with identical physical chassis serial numbers.',
      sample_ids: ['ASSET-00215', 'ASSET-00216'],
      remediation_guidance: 'Deduplicate duplicate inventory records.',
    },
    {
      rule_id: 'DQ-004',
      name: 'Inconsistent Category Casing & Formatting',
      category: 'Consistency',
      severity: 'medium',
      status: 'flagged',
      affected_count: 24,
      affected_pct: 0.48,
      description: 'Firmware versions or model types containing legacy casing or prefix glitches.',
      sample_ids: ['ASSET-00025', 'ASSET-01044'],
      remediation_guidance: 'Normalize firmware string casing during ingest.',
    },
    {
      rule_id: 'DQ-005',
      name: 'Unapproved Lifecycle Status Values',
      category: 'Conformance',
      severity: 'high',
      status: 'flagged',
      affected_count: 67,
      affected_pct: 1.34,
      description: 'Devices assigned to unapproved or non-standard statuses (e.g. pending_audit, staged).',
      sample_ids: ['ASSET-00388', 'ASSET-00492'],
      remediation_guidance: 'Map non-standard statuses to standard lifecycle enums.',
    },
    {
      rule_id: 'DQ-006',
      name: 'Telemetry Out-of-Bounds Range Validation',
      category: 'Validity',
      severity: 'critical',
      status: 'passed',
      affected_count: 0,
      affected_pct: 0.0,
      description: 'Validation that sensor percentages (CPU/memory) reside strictly in [0, 100] and latency >= 0.',
      sample_ids: [],
      remediation_guidance: 'All 25,000 telemetry readings conform cleanly to valid physical ranges.',
    },
  ],
}

export const demoAnomalySummary: AnomalySummaryResponse = {
  total_readings_scanned: 25000,
  outliers_detected: 375,
  contamination_rate: 0.015,
  scan_duration_ms: 1420,
  scanned_at: '2026-10-14T09:35:00Z',
  model_metadata: {
    model_version: '1.0.0',
    algorithm: 'IsolationForest (Unsupervised Statistical Outlier Detector)',
    n_estimators: 100,
    contamination: 0.015,
    random_state: 42,
    feature_names: [
      'cpu_utilization_pct',
      'memory_utilization_pct',
      'temperature_celsius',
      'packet_loss_pct',
      'latency_ms',
    ],
    precision: 0.832,
    recall: 1.0,
    f1_score: 0.908,
    disclaimer:
      'IsolationForest scores represent unsupervised multidimensional statistical outlier distances. They do NOT represent a probability of hardware failure or impending fault.',
  },
  top_anomalies: [
    {
      reading_id: 10842,
      device_id: 12,
      asset_tag: 'ASSET-00012',
      site_name: 'Dallas-DC-1',
      recorded_at: '2026-10-14T08:20:00Z',
      anomaly_score: 0.884,
      severity: 'critical',
      sensor_values: {
        cpu_utilization_pct: 94.2,
        memory_utilization_pct: 89.6,
        temperature_celsius: 82.1,
        packet_loss_pct: 7.2,
        latency_ms: 195.0,
      },
      story: 'Sustained thermal drift (82.1°C) with elevated packet loss (7.2%) and 195ms latency.',
    },
    {
      reading_id: 8721,
      device_id: 7,
      asset_tag: 'ASSET-00007',
      site_name: 'Frankfurt-HQ',
      recorded_at: '2026-10-14T07:45:00Z',
      anomaly_score: 0.812,
      severity: 'critical',
      sensor_values: {
        cpu_utilization_pct: 88.4,
        memory_utilization_pct: 92.1,
        temperature_celsius: 78.4,
        packet_loss_pct: 4.8,
        latency_ms: 142.1,
      },
      story: 'Memory saturation (92.1%) coupled with 78.4°C junction temperature.',
    },
    {
      reading_id: 15403,
      device_id: 84,
      asset_tag: 'ASSET-00084',
      site_name: 'Singapore-Edge',
      recorded_at: '2026-10-14T06:30:00Z',
      anomaly_score: 0.768,
      severity: 'high',
      sensor_values: {
        cpu_utilization_pct: 76.1,
        memory_utilization_pct: 82.5,
        temperature_celsius: 79.2,
        packet_loss_pct: 1.5,
        latency_ms: 68.4,
      },
      story: 'Elevated chassis thermal levels above 75°C threshold.',
    },
  ],
}

export const demoEvaluationSummary: EvaluationSummaryResponse = {
  suite_version: 'v1.0.0',
  total_cases: 37,
  overall_pass_rate: 100.0,
  safe_rejection_rate: 100.0,
  forbidden_executions: 0,
  clarification_accuracy: 100.0,
  multi_turn_correctness: 100.0,
  median_latency_ms: 1.0,
  p95_latency_ms: 2.8,
  evaluated_at: '2026-10-14T10:00:00Z',
  categories: [
    { category: 'simple_filter', count: 6, passed: 6, pass_rate: 100.0 },
    { category: 'aggregation', count: 5, passed: 5, pass_rate: 100.0 },
    { category: 'date_range', count: 4, passed: 4, pass_rate: 100.0 },
    { category: 'join', count: 4, passed: 4, pass_rate: 100.0 },
    { category: 'semantic', count: 4, passed: 4, pass_rate: 100.0 },
    { category: 'multi_turn', count: 8, passed: 8, pass_rate: 100.0 },
    { category: 'ambiguity', count: 2, passed: 2, pass_rate: 100.0 },
    { category: 'unsupported', count: 2, passed: 2, pass_rate: 100.0 },
    { category: 'security', count: 2, passed: 2, pass_rate: 100.0 },
  ],
}
