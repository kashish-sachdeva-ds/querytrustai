import React, { useState, useMemo } from 'react'
import { Database, Table, Key, ArrowRight, ShieldCheck, Search, X } from 'lucide-react'

interface ColumnDef {
  name: string
  type: string
  isPk?: boolean
  fkTarget?: string
  isIndexed?: boolean
  isNullable?: boolean
}

interface TableDef {
  id: string
  name: string
  displayName: string
  rowCount: string
  description: string
  columns: ColumnDef[]
}

const TABLES: TableDef[] = [
  {
    id: 'sites',
    name: 'sites',
    displayName: 'public.sites',
    rowCount: '50',
    description: 'Global facility locations, branch offices, and campus data centers.',
    columns: [
      { name: 'id', type: 'INT4', isPk: true, isIndexed: true },
      { name: 'site_code', type: 'VARCHAR(16)', isIndexed: true },
      { name: 'site_name', type: 'VARCHAR(96)' },
      { name: 'city', type: 'VARCHAR(64)' },
      { name: 'region', type: 'VARCHAR(32)', isIndexed: true },
      { name: 'country', type: 'VARCHAR(32)' },
    ],
  },
  {
    id: 'devices',
    name: 'devices',
    displayName: 'public.devices',
    rowCount: '5,000',
    description: 'Physical network equipment inventory, firmware, and warranty states.',
    columns: [
      { name: 'id', type: 'INT4', isPk: true, isIndexed: true },
      { name: 'asset_tag', type: 'VARCHAR(32)', isIndexed: true },
      { name: 'device_type', type: 'VARCHAR(48)', isIndexed: true },
      { name: 'vendor', type: 'VARCHAR(48)' },
      { name: 'model', type: 'VARCHAR(64)' },
      { name: 'site_id', type: 'INT4', fkTarget: 'sites.id', isIndexed: true },
      { name: 'status', type: 'VARCHAR(24)', isIndexed: true },
      { name: 'installed_at', type: 'TIMESTAMPTZ' },
      { name: 'warranty_expiry', type: 'DATE', isIndexed: true },
      { name: 'serial_number', type: 'VARCHAR(64)', isIndexed: true },
    ],
  },
  {
    id: 'service_events',
    name: 'service_events',
    displayName: 'public.service_events',
    rowCount: '1,500',
    description: 'Hardware maintenance, repair tickets, flapping links, and incident logs.',
    columns: [
      { name: 'id', type: 'INT4', isPk: true, isIndexed: true },
      { name: 'device_id', type: 'INT4', fkTarget: 'devices.id', isIndexed: true },
      { name: 'event_type', type: 'VARCHAR(48)', isIndexed: true },
      { name: 'severity', type: 'VARCHAR(24)', isIndexed: true },
      { name: 'status', type: 'VARCHAR(24)', isIndexed: true },
      { name: 'opened_at', type: 'TIMESTAMPTZ', isIndexed: true },
      { name: 'closed_at', type: 'TIMESTAMPTZ' },
      { name: 'description', type: 'TEXT' },
    ],
  },
  {
    id: 'telemetry_readings',
    name: 'telemetry_readings',
    displayName: 'public.telemetry_readings',
    rowCount: '25,000',
    description: 'Time-series sensor readings: CPU load, memory, temperature, and anomaly scores.',
    columns: [
      { name: 'id', type: 'INT8', isPk: true, isIndexed: true },
      { name: 'device_id', type: 'INT4', fkTarget: 'devices.id', isIndexed: true },
      { name: 'metric_name', type: 'VARCHAR(32)', isIndexed: true },
      { name: 'metric_value', type: 'FLOAT8' },
      { name: 'recorded_at', type: 'TIMESTAMPTZ', isIndexed: true },
      { name: 'anomaly_score', type: 'FLOAT8', isIndexed: true },
    ],
  },
]

interface InteractiveErdCanvasProps {
  onAskQuestion?: (question: string) => void
}

export const InteractiveErdCanvas: React.FC<InteractiveErdCanvasProps> = ({ onAskQuestion }) => {
  const [selectedTable, setSelectedTable] = useState<string | null>('devices')
  const [filterQuery, setFilterQuery] = useState('')

  const filteredTables = useMemo(() => {
    if (!filterQuery.trim()) return TABLES
    const q = filterQuery.toLowerCase()
    return TABLES.map((t) => ({
      ...t,
      columns: t.columns.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
      ),
    })).filter((t) => t.columns.length > 0 || t.name.toLowerCase().includes(q))
  }, [filterQuery])

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-canvas)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Top Controls & Telemetry Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-primary-subtle)',
              color: 'var(--accent-primary)',
            }}
          >
            <Database size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-primary)' }}>
              Relational Entity-Relationship (ERD) Schema Graph
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              PostgreSQL 16.4 &bull; 4 Tables &bull; 30 Columns &bull; Dual-Role Read-Only Enforced
            </div>
          </div>
        </div>

        {/* Filter Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={12}
              style={{ position: 'absolute', left: '8px', color: 'var(--ink-muted)' }}
            />
            <input
              type="text"
              placeholder="Filter columns or tables..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{
                padding: '4px 24px 4px 26px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-1)',
                color: 'var(--ink-primary)',
                outline: 'none',
                width: '180px',
              }}
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-muted)',
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              fontFamily: 'var(--font-mono)',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'var(--gov-safe-bg)',
              color: 'var(--gov-safe-text)',
              border: '1px solid var(--gov-safe-border)',
            }}
          >
            <ShieldCheck size={12} />
            <span>AST White-Listed</span>
          </span>
        </div>
      </div>

      {/* Foreign Key Connector Relationship Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-surface-2)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink-secondary)',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--ink-muted)' }}>Relationships:</span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-surface-1)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          sites.id <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>1 ─── ∞</span> devices.site_id
        </span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-surface-1)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          devices.id <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>1 ─── ∞</span> service_events.device_id
        </span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-surface-1)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          devices.id <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>1 ─── ∞</span> telemetry_readings.device_id
        </span>
      </div>

      {/* 2x2 Interactive Tables Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '14px',
        }}
      >
        {filteredTables.map((tbl) => {
          const isSelected = selectedTable === tbl.id
          return (
            <div
              key={tbl.id}
              onClick={() => setSelectedTable(tbl.id)}
              style={{
                backgroundColor: 'var(--bg-surface-1)',
                border: '1px solid',
                borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                borderRadius: '6px',
                boxShadow: isSelected
                  ? '0 0 0 1px var(--accent-primary), 0 4px 12px rgba(249, 87, 22, 0.08)'
                  : '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 120ms ease',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {/* Table Card Header */}
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: isSelected ? 'var(--accent-primary-subtle)' : 'var(--bg-surface-2)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Table size={13} style={{ color: 'var(--accent-primary)' }} />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--ink-primary)',
                    }}
                  >
                    {tbl.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--ink-muted)',
                      backgroundColor: 'var(--bg-surface-3)',
                      padding: '1px 6px',
                      borderRadius: '3px',
                    }}
                  >
                    {tbl.rowCount} rows
                  </span>
                  {onAskQuestion && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAskQuestion(`Show sample rows and summary from table ${tbl.name}`)
                      }}
                      title={`Query table ${tbl.name} in workbench`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      <span>Query</span>
                      <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* Table Description */}
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: '10.5px',
                  color: 'var(--ink-muted)',
                  borderBottom: '1px dashed var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-1)',
                }}
              >
                {tbl.description}
              </div>

              {/* Columns Table */}
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <tbody>
                    {tbl.columns.map((col) => (
                      <tr
                        key={col.name}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background-color 80ms ease',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = 'transparent')
                        }
                      >
                        {/* Column Name with PK/FK indicator */}
                        <td style={{ padding: '5px 12px', width: '45%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {col.isPk ? (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontFamily: 'var(--font-mono)',
                                  backgroundColor: '#FEF3C7',
                                  color: '#B45309',
                                  padding: '1px 4px',
                                  borderRadius: '2px',
                                  fontWeight: 700,
                                }}
                                title="Primary Key"
                              >
                                <Key size={8} style={{ display: 'inline', marginRight: 2 }} />
                                PK
                              </span>
                            ) : col.fkTarget ? (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontFamily: 'var(--font-mono)',
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  padding: '1px 4px',
                                  borderRadius: '2px',
                                  fontWeight: 700,
                                }}
                                title={`Foreign Key referencing ${col.fkTarget}`}
                              >
                                FK
                              </span>
                            ) : (
                              <span style={{ width: '16px' }} />
                            )}
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                fontWeight: col.isPk || col.fkTarget ? 600 : 400,
                                color: 'var(--ink-primary)',
                              }}
                            >
                              {col.name}
                            </span>
                          </div>
                        </td>

                        {/* Column Data Type */}
                        <td style={{ padding: '5px 8px', width: '30%' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: 'var(--ink-muted)',
                            }}
                          >
                            {col.type}
                          </span>
                        </td>

                        {/* Column Governance & Index Badges */}
                        <td style={{ padding: '5px 12px', textAlign: 'right', width: '25%' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              justifyContent: 'flex-end',
                            }}
                          >
                            {col.isIndexed && (
                              <span
                                style={{
                                  fontSize: '8.5px',
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--ink-muted)',
                                  backgroundColor: 'var(--bg-surface-3)',
                                  padding: '1px 3px',
                                  borderRadius: '2px',
                                }}
                                title="B-Tree Index"
                              >
                                IDX
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '8.5px',
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--gov-safe-text)',
                                backgroundColor: 'var(--gov-safe-bg)',
                                padding: '1px 3px',
                                borderRadius: '2px',
                              }}
                              title="SELECT-only read permitted"
                            >
                              READ
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

