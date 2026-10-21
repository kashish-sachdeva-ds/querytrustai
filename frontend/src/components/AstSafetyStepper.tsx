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
        background: 'var(--qt-surface, #ffffff)',
        border: '1px solid var(--qt-border, #E6E4E0)',
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
          borderBottom: '1px solid var(--qt-border, #E6E4E0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} style={{ color: isValid ? '#1F7A4C' : '#A7382C' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--qt-ink, #191817)' }}>
              Two-Layer SQLGlot AST Safety Pipeline
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--qt-muted, #766F68)' }}>
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
            background: isValid ? 'rgba(31, 122, 76, 0.12)' : 'rgba(167, 56, 44, 0.12)',
            color: isValid ? '#1F7A4C' : '#A7382C',
            border: `1px solid ${isValid ? 'rgba(31, 122, 76, 0.3)' : 'rgba(167, 56, 44, 0.3)'}`,
          }}
        >
          {isValid ? 'SAFE SELECT' : 'BLOCKED NODE'}
        </span>
      </div>

      {violations.length > 0 && (
        <div
          style={{
            background: 'rgba(167, 56, 44, 0.08)',
            border: '1px solid rgba(167, 56, 44, 0.25)',
            borderRadius: 6,
            padding: '10px 12px',
            marginBottom: '12px',
            fontSize: '0.78rem',
            color: '#A7382C',
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

          const statusColor = isFailed ? '#A7382C' : isPassed ? '#1F7A4C' : 'var(--qt-muted, #766F68)'
          const statusBg = isFailed
            ? 'rgba(167, 56, 44, 0.08)'
            : isPassed
            ? 'rgba(31, 122, 76, 0.06)'
            : 'var(--qt-surface-muted, #F5F2ED)'

          return (
            <div
              key={step.key}
              style={{
                background: statusBg,
                border: `1px solid ${statusColor}33`,
                borderRadius: 6,
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--qt-ink, #191817)' }}>
                  {step.title}
                </span>
                {isFailed ? (
                  <XCircle size={14} style={{ color: '#A7382C', flexShrink: 0 }} />
                ) : isPassed ? (
                  <CheckCircle2 size={14} style={{ color: '#1F7A4C', flexShrink: 0 }} />
                ) : (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--qt-muted, #766F68)',
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--qt-text, #4F4A45)' }}>
                {step.description}
              </span>
              <span style={{ fontSize: '0.67rem', color: 'var(--qt-muted, #766F68)', fontStyle: 'italic' }}>
                {step.subtext}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
