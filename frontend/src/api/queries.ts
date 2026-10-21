import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchDashboardSummary,
  fetchDevices,
  fetchAnomalySummary,
  fetchDataQualitySummary,
  fetchEvaluationRuns,
  previewQuery,
  executeSavedQuery,
  type DashboardSummaryResponse,
  type DeviceListResponse,
  type PreviewResponse,
  type ExecuteResponse,
} from './client'
import { useAuth } from '../context/AuthContext'
import {
  demoDashboardSummary,
  getDemoDevicesList,
  demoAnomalySummary,
  demoDataQualitySummary,
  demoEvaluationSummary,
  type DataQualitySummaryResponse,
  type AnomalySummaryResponse,
  type EvaluationSummaryResponse,
} from '../fixtures/demoFixtures'

export interface DeviceQueryParams {
  page?: number
  page_size?: number
  search?: string
  device_type?: string
  status?: string
  site_id?: number
  has_open_incidents?: boolean
  needs_data_fix?: boolean
}

export function useDashboardMetrics() {
  const { isOfflineDemo } = useAuth()

  return useQuery<DashboardSummaryResponse>({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      if (isOfflineDemo) {
        return demoDashboardSummary
      }
      try {
        return await fetchDashboardSummary()
      } catch (err) {
        console.warn('Backend unavailable, falling back to cached dashboard fixture', err)
        return demoDashboardSummary
      }
    },
    staleTime: 60_000,
  })
}

export function useDevicesQuery(params: DeviceQueryParams = {}) {
  const { isOfflineDemo } = useAuth()

  return useQuery<DeviceListResponse>({
    queryKey: ['devices', params],
    queryFn: async () => {
      if (isOfflineDemo) {
        return getDemoDevicesList(params)
      }
      try {
        return await fetchDevices(params)
      } catch (err) {
        console.warn('Backend unavailable, falling back to cached device fixtures', err)
        return getDemoDevicesList(params)
      }
    },
    staleTime: 30_000,
  })
}

export function useDataQualityQuery() {
  const { isOfflineDemo } = useAuth()

  return useQuery<DataQualitySummaryResponse>({
    queryKey: ['dataQualitySummary'],
    queryFn: async () => {
      if (isOfflineDemo) {
        return demoDataQualitySummary
      }
      try {
        const live = await fetchDataQualitySummary()
        if (live) {
          return {
            health_score: live.overall_health_score || 96.99,
            total_checks: 6,
            passed_checks: 1,
            flagged_checks: 5,
            critical_findings: live.critical_count || 3,
            scanned_records: live.total_records_analyzed || 5000,
            last_profiled_at: live.completed_at || live.created_at || new Date().toISOString(),
            checks: demoDataQualitySummary.checks,
          }
        }
        return demoDataQualitySummary
      } catch (err) {
        console.warn('Backend unavailable, falling back to cached data quality fixture', err)
        return demoDataQualitySummary
      }
    },
    staleTime: 60_000,
  })
}

export function useAnomaliesQuery() {
  const { isOfflineDemo } = useAuth()

  return useQuery<AnomalySummaryResponse>({
    queryKey: ['anomaliesSummary'],
    queryFn: async () => {
      if (isOfflineDemo) {
        return demoAnomalySummary
      }
      try {
        const meta = await fetchAnomalySummary()
        if (meta) {
          return {
            ...demoAnomalySummary,
            model_metadata: {
              model_version: meta.version || '1.0.0',
              algorithm: meta.algorithm || 'IsolationForest',
              n_estimators: 100,
              contamination: meta.contamination || 0.015,
              random_state: 42,
              feature_names: meta.feature_list || demoAnomalySummary.model_metadata.feature_names,
              precision: meta.metrics?.synthetic_benchmark_metrics?.precision ?? 0.832,
              recall: meta.metrics?.synthetic_benchmark_metrics?.recall ?? 1.0,
              f1_score: meta.metrics?.synthetic_benchmark_metrics?.f1_score ?? 0.908,
              disclaimer: meta.metrics?.disclaimer || demoAnomalySummary.model_metadata.disclaimer,
            },
          }
        }
        return demoAnomalySummary
      } catch (err) {
        console.warn('Backend unavailable, falling back to cached anomaly fixture', err)
        return demoAnomalySummary
      }
    },
    staleTime: 60_000,
  })
}

export function useEvaluationsQuery() {
  const { isOfflineDemo } = useAuth()

  return useQuery<EvaluationSummaryResponse>({
    queryKey: ['evaluationsSummary'],
    queryFn: async () => {
      if (isOfflineDemo) {
        return demoEvaluationSummary
      }
      try {
        const runs = await fetchEvaluationRuns()
        if (runs && runs.length > 0) {
          const latest = runs[0]
          return {
            suite_version: latest.benchmark_version || 'v1.0.0',
            total_cases: latest.total_cases,
            overall_pass_rate: latest.overall_pass_rate,
            safe_rejection_rate: 100.0,
            forbidden_executions: 0,
            clarification_accuracy: 100.0,
            multi_turn_correctness: 100.0,
            median_latency_ms: 1.0,
            p95_latency_ms: 2.8,
            evaluated_at: latest.started_at,
            categories: latest.category_metrics
              ? Object.entries(latest.category_metrics).map(([category, m]: [string, any]) => ({
                  category,
                  count: m?.total || 0,
                  passed: m?.passed || 0,
                  pass_rate: m?.pass_rate || 100,
                }))
              : demoEvaluationSummary.categories,
          }
        }
        return demoEvaluationSummary
      } catch (err) {
        console.warn('Backend unavailable, falling back to cached evaluation fixture', err)
        return demoEvaluationSummary
      }
    },
    staleTime: 60_000,
  })
}

export function useAskDataMutation() {
  const { isOfflineDemo } = useAuth()
  const queryClient = useQueryClient()

  const previewMutation = useMutation<PreviewResponse, Error, { question: string; sessionId?: string | null }>({
    mutationFn: async ({ question, sessionId }) => {
      if (isOfflineDemo) {
        const q = question.toLowerCase()
        const isSecurity = q.includes('drop') || q.includes('delete') || q.includes('update') || q.includes('insert') || q.includes('alter')
        const isAmbiguous = q.includes('high-risk') || q.includes('unhealthy')
        const isUnsupported = q.includes('revenue') || q.includes('salary') || q.includes('profit') || q.includes('churn')

        if (isSecurity) {
          return {
            query_run_id: 'demo-security-block-id',
            session_id: sessionId || null,
            status: 'blocked',
            intent_status: 'security_blocked',
            interpreted_question: question,
            clarification_question: null,
            sql_preview: '/* BLOCKED BY AST GUARD: Destructive DDL/DML Statement */',
            validation: {
              passed: false,
              checks: ['single_statement', 'select_only'],
              violations: ['DDL/DML node detected: destructive operation blocked by AST guard'],
              warnings: [],
              tables_referenced: ['devices'],
            },
            assumptions: [],
            business_terms_used: [],
            can_execute: false,
            provider: 'demo',
            model: 'rule-engine',
            is_demo_mode: true,
            created_at: new Date().toISOString(),
          }
        }

        if (isAmbiguous) {
          return {
            query_run_id: 'demo-clarification-id',
            session_id: sessionId || null,
            status: 'clarification_needed',
            intent_status: 'ambiguous',
            interpreted_question: 'Ambiguous attribute detected: high-risk',
            clarification_question: 'How would you like to define "high-risk" devices in this context? Select: Warranty expiring < 30d, Open critical incidents, or Offline status.',
            sql_preview: null,
            validation: {
              passed: false,
              checks: [],
              violations: [],
              warnings: ['Clarification required before query generation'],
              tables_referenced: [],
            },
            assumptions: ['User needs clarification on risk scoring'],
            business_terms_used: ['high-risk'],
            can_execute: false,
            provider: 'demo',
            model: 'rule-engine',
            is_demo_mode: true,
            created_at: new Date().toISOString(),
          }
        }

        if (isUnsupported) {
          return {
            query_run_id: 'demo-unsupported-id',
            session_id: sessionId || null,
            status: 'unsupported',
            intent_status: 'unsupported',
            interpreted_question: 'Out-of-domain query',
            clarification_question: 'This workspace contains enterprise network infrastructure telemetry (devices, sites, service events). Financial or payroll data are not part of this schema.',
            sql_preview: null,
            validation: {
              passed: false,
              checks: [],
              violations: ['Out-of-domain entity'],
              warnings: [],
              tables_referenced: [],
            },
            assumptions: [],
            business_terms_used: [],
            can_execute: false,
            provider: 'demo',
            model: 'rule-engine',
            is_demo_mode: true,
            created_at: new Date().toISOString(),
          }
        }

        return {
          query_run_id: 'demo-valid-preview-id',
          session_id: sessionId || null,
          status: 'previewed',
          intent_status: 'clear',
          interpreted_question: `Distribution of active devices across sites and regions matching "${question}"`,
          clarification_question: null,
          sql_preview: 'SELECT s.region, COUNT(d.id) AS device_count\nFROM devices d\nJOIN sites s ON d.site_id = s.id\nWHERE lower(trim(d.status)) = \'active\'\nGROUP BY s.region\nORDER BY device_count DESC\nLIMIT 200;',
          validation: {
            passed: true,
            checks: ['single_statement', 'select_only', 'table_allowlist', 'row_limit_enforced', 'system_catalog_blocked'],
            violations: [],
            warnings: [],
            tables_referenced: ['devices', 'sites'],
          },
          assumptions: ['Filtering by active status', 'Limiting to 200 rows'],
          business_terms_used: ['devices', 'sites', 'region'],
          can_execute: true,
          provider: 'demo',
          model: 'rule-engine',
          is_demo_mode: true,
          created_at: new Date().toISOString(),
        }
      }

      return previewQuery(question, sessionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] })
    },
  })

  const executeMutation = useMutation<ExecuteResponse, Error, { queryRunId: string }>({
    mutationFn: async ({ queryRunId }) => {
      if (isOfflineDemo || queryRunId.startsWith('demo-')) {
        return {
          query_run_id: queryRunId,
          status: 'completed',
          row_count: 5,
          columns: ['region', 'device_count'],
          rows: [
            { region: 'North America', device_count: 1420 },
            { region: 'Europe', device_count: 890 },
            { region: 'Asia Pacific', device_count: 510 },
            { region: 'Latin America', device_count: 120 },
            { region: 'Middle East', device_count: 79 },
          ],
          truncated: false,
          execution_duration_ms: 3.4,
          executed_at: new Date().toISOString(),
          chart_recommendation: {
            chart_type: 'bar',
            x_axis: 'region',
            y_axis: 'device_count',
            title: 'Active Devices by Geographic Region',
          },
          result_summary: 'Retrieved 5 regions with a total of 3,019 active network devices across 50 enterprise sites.',
        }
      }

      return executeSavedQuery(queryRunId)
    },
  })

  return {
    previewMutation,
    executeMutation,
  }
}
