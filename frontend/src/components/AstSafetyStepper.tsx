import React from 'react'
import { CheckCircle2, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react'

export interface AstCheckResult {
  single_statement?: boolean
  select_only?: boolean
  table_allowlist?: boolean
  system_catalog_blocked?: boolean
  row_limit_enforced?: boolean
}

export interface AstSafetyStepperProps {
  checksPerformed?: AstCheckResult
  isValid?: boolean
  violations?: string[]
  isExecuting?: boolean
  executed?: boolean
}

interface StepDefinition {
  key: keyof AstCheckResult | 'analytics_reader_role'
  title: string
  description: string
  subtext: string
}

const SAFETY_STEPS: StepDefinition[] = [
  {
    key: 'single_statement',
    title: '1. Single Statement AST',
    description: 'Enforces exactly 1 SQL root statement',
    subtext: 'Rejects multi-statement injections (; DROP TABLE)',
  },
  {
    key: 'select_only',
    title: '2. Read-Only SELECT Check',
    description: 'Restricts root AST to SELECT / UNION',
    subtext: 'Prohibits INSERT, UPDATE, DELETE, ALTER, DROP, CREATE',
  },
  {
    key: 'system_catalog_blocked',
    title: '3. System Catalog Block',
    description: 'Intercepts metadata introspection',
    subtext: 'Blocks pg_catalog, information_schema, pg_sleep()',
  },
  {
    key: 'row_limit_enforced',
    title: '4. Row Limit Clamping',
    description: 'Enforces server row count boundaries',
    subtext: 'Clamps excessive limits to 200–500 rows',
  },
  {
    key: 'analytics_reader_role',
    title: '5. analytics_reader Socket',
    description: 'Dual-layer SELECT-only PostgreSQL role',
    subtext: 'Kernel-level read-only transaction execution',
  },
]

export const AstSafetyStepper: React.FC<AstSafetyStepperProps> = ({
  checksPerformed = {
    single_statement: true,
    select_only: true,
    system_catalog_blocked: true,
    row_limit_enforced: true,
  },
  isValid = true,
  violations = [],
  isExecuting = false,
  executed = false,
}) => {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 8,
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} style={{ color: isValid ? 'var(--color-status-success-dot)' : 'var(--color-status-error-dot)' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Two-Layer SQLGlot AST Safety Pipeline
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Non-negotiable server-side lexical &amp; syntax security guard
            </span>
          </div>
        </div>

        <span
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            background: isValid ? 'var(--color-status-success-bg)' : 'var(--color-status-error-bg)',
            color: isValid ? 'var(--color-status-success-text)' : 'var(--color-status-error-text)',
            border: `1px solid ${isValid ? 'var(--color-status-success-dot)' : 'var(--color-status-error-dot)'}`,
          }}
        >
          {isValid ? 'SAFE SELECT' : 'BLOCKED NODE'}
        </span>
      </div>

      {violations.length > 0 && (
        <div
          style={{
            background: 'var(--color-status-error-bg)',
            border: '1px solid var(--color-status-error-dot)',
            borderRadius: 6,
            padding: '10px 12px',
            marginBottom: '12px',
            fontSize: '0.78rem',
            color: 'var(--color-status-error-text)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
            <AlertTriangle size={14} />
            AST Security Violations Detected:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {violations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5-step grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
        }}
      >
        {SAFETY_STEPS.map((step) => {
          let isPassed = false
          let isFailed = false

          if (step.key === 'analytics_reader_role') {
            isPassed = isValid && (executed || isExecuting)
          } else {
            const checkVal = checksPerformed[step.key as keyof AstCheckResult]
            if (checkVal === true) isPassed = true
            else if (checkVal === false) isFailed = true
            else isPassed = isValid
          }

          if (!isValid && step.key === 'select_only') {
            isFailed = true
          }

          const statusBorder = isFailed
            ? 'var(--color-status-error-dot)'
            : isPassed
            ? 'var(--color-status-success-dot)'
            : 'var(--color-border-subtle)'
          const statusBg = isFailed
            ? 'var(--color-status-error-bg)'
            : isPassed
            ? 'var(--color-status-success-bg)'
            : 'var(--color-raised)'

          return (
            <div
              key={step.key}
              style={{
                background: statusBg,
                border: `1px solid color-mix(in srgb, ${statusBorder} 35%, transparent)`,
                borderRadius: 6,
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {step.title}
                </span>
                {isFailed ? (
                  <XCircle size={14} style={{ color: 'var(--color-status-error-dot)', flexShrink: 0 }} />
                ) : isPassed ? (
                  <CheckCircle2 size={14} style={{ color: 'var(--color-status-success-dot)', flexShrink: 0 }} />
                ) : (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--color-text-muted)',
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                {step.description}
              </span>
              <span style={{ fontSize: '0.67rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {step.subtext}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
