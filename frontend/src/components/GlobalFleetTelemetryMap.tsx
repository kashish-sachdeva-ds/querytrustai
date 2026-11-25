import React, { useState } from 'react'

interface SiteCoordinate {
  id: string
  name: string
  region: 'Americas' | 'EMEA' | 'APAC'
  x: number // SVG viewbox percentage (0 to 1000)
  y: number // SVG viewbox percentage (0 to 500)
  devices: number
  health: number
  openTickets: number
  status: 'active' | 'maintenance' | 'offline'
}

// 50 Sites mapped with realistic geographical distribution
const SITES: SiteCoordinate[] = [
  // Americas (18 sites)
  { id: 'SITE-001', name: 'New York (US-East)', region: 'Americas', x: 265, y: 165, devices: 142, health: 99.1, openTickets: 2, status: 'active' },
  { id: 'SITE-002', name: 'Dallas (DFW-DC1)', region: 'Americas', x: 215, y: 200, devices: 156, health: 98.4, openTickets: 5, status: 'active' },
  { id: 'SITE-003', name: 'San Jose (SV-Edge)', region: 'Americas', x: 155, y: 185, devices: 130, health: 99.5, openTickets: 1, status: 'active' },
  { id: 'SITE-004', name: 'Chicago (ORD-Core)', region: 'Americas', x: 230, y: 165, devices: 118, health: 97.2, openTickets: 4, status: 'maintenance' },
  { id: 'SITE-005', name: 'Atlanta (ATL-DC)', region: 'Americas', x: 245, y: 195, devices: 98, health: 98.8, openTickets: 2, status: 'active' },
  { id: 'SITE-006', name: 'Seattle (SEA-Edge)', region: 'Americas', x: 160, y: 140, devices: 104, health: 99.2, openTickets: 0, status: 'active' },
  { id: 'SITE-007', name: 'Toronto (YYZ-Core)', region: 'Americas', x: 260, y: 145, devices: 88, health: 99.0, openTickets: 1, status: 'active' },
  { id: 'SITE-008', name: 'Montreal (YUL-Lab)', region: 'Americas', x: 275, y: 140, devices: 76, health: 98.5, openTickets: 2, status: 'active' },
  { id: 'SITE-009', name: 'Miami (MIA-Gateway)', region: 'Americas', x: 250, y: 220, devices: 92, health: 97.8, openTickets: 3, status: 'active' },
  { id: 'SITE-010', name: 'Sao Paulo (GRU-Core)', region: 'Americas', x: 345, y: 360, devices: 110, health: 96.5, openTickets: 6, status: 'maintenance' },
  { id: 'SITE-011', name: 'Buenos Aires (EZE)', region: 'Americas', x: 330, y: 410, devices: 64, health: 98.1, openTickets: 2, status: 'active' },
  { id: 'SITE-012', name: 'Santiago (SCL-Edge)', region: 'Americas', x: 295, y: 395, devices: 58, health: 99.0, openTickets: 0, status: 'active' },
  { id: 'SITE-013', name: 'Mexico City (MEX-Hub)', region: 'Americas', x: 200, y: 225, devices: 84, health: 97.9, openTickets: 3, status: 'active' },
  { id: 'SITE-014', name: 'Denver (DEN-DC)', region: 'Americas', x: 195, y: 175, devices: 72, health: 99.4, openTickets: 1, status: 'active' },
  { id: 'SITE-015', name: 'Phoenix (PHX-Edge)', region: 'Americas', x: 180, y: 195, devices: 68, health: 98.6, openTickets: 2, status: 'active' },
  { id: 'SITE-016', name: 'Bogota (BOG-Edge)', region: 'Americas', x: 275, y: 270, devices: 52, health: 98.2, openTickets: 1, status: 'active' },
  { id: 'SITE-017', name: 'Lima (LIM-Branch)', region: 'Americas', x: 270, y: 320, devices: 48, health: 97.5, openTickets: 2, status: 'active' },
  { id: 'SITE-018', name: 'Vancouver (YVR-Hub)', region: 'Americas', x: 155, y: 130, devices: 65, health: 99.1, openTickets: 0, status: 'active' },

  // EMEA (17 sites)
  { id: 'SITE-019', name: 'Frankfurt (FRA-DC1)', region: 'EMEA', x: 505, y: 145, devices: 168, health: 99.6, openTickets: 1, status: 'active' },
  { id: 'SITE-020', name: 'London (LHR-Core)', region: 'EMEA', x: 475, y: 135, devices: 152, health: 98.9, openTickets: 3, status: 'active' },
  { id: 'SITE-021', name: 'Amsterdam (AMS-IX)', region: 'EMEA', x: 490, y: 130, devices: 140, health: 99.4, openTickets: 2, status: 'active' },
  { id: 'SITE-022', name: 'Paris (CDG-Edge)', region: 'EMEA', x: 485, y: 150, devices: 115, health: 98.2, openTickets: 4, status: 'active' },
  { id: 'SITE-023', name: 'Dublin (DUB-Cloud)', region: 'EMEA', x: 455, y: 130, devices: 124, health: 99.5, openTickets: 1, status: 'active' },
  { id: 'SITE-024', name: 'Stockholm (ARN-Hub)', region: 'EMEA', x: 525, y: 105, devices: 95, health: 99.2, openTickets: 0, status: 'active' },
  { id: 'SITE-025', name: 'Madrid (MAD-Gateway)', region: 'EMEA', x: 465, y: 175, devices: 88, health: 97.4, openTickets: 5, status: 'maintenance' },
  { id: 'SITE-026', name: 'Milan (MXP-Edge)', region: 'EMEA', x: 505, y: 160, devices: 82, health: 98.7, openTickets: 2, status: 'active' },
  { id: 'SITE-027', name: 'Warsaw (WAW-Core)', region: 'EMEA', x: 540, y: 135, devices: 78, health: 98.5, openTickets: 2, status: 'active' },
  { id: 'SITE-028', name: 'Zurich (ZRH-Fin)', region: 'EMEA', x: 500, y: 152, devices: 94, health: 99.7, openTickets: 0, status: 'active' },
  { id: 'SITE-029', name: 'Dubai (DXB-Hub)', region: 'EMEA', x: 625, y: 220, devices: 110, health: 98.8, openTickets: 3, status: 'active' },
  { id: 'SITE-030', name: 'Riyadh (RUH-DC)', region: 'EMEA', x: 610, y: 230, devices: 85, health: 98.1, openTickets: 2, status: 'active' },
  { id: 'SITE-031', name: 'Johannesburg (JNB)', region: 'EMEA', x: 555, y: 380, devices: 90, health: 97.1, openTickets: 4, status: 'maintenance' },
  { id: 'SITE-032', name: 'Cape Town (CPT-Edge)', region: 'EMEA', x: 540, y: 405, devices: 62, health: 98.6, openTickets: 1, status: 'active' },
  { id: 'SITE-033', name: 'Nairobi (NBO-Edge)', region: 'EMEA', x: 590, y: 285, devices: 58, health: 97.8, openTickets: 2, status: 'active' },
  { id: 'SITE-034', name: 'Cairo (CAI-Gateway)', region: 'EMEA', x: 555, y: 205, devices: 70, health: 98.0, openTickets: 3, status: 'active' },
  { id: 'SITE-035', name: 'Helsinki (HEL-Branch)', region: 'EMEA', x: 545, y: 98, devices: 64, health: 99.4, openTickets: 0, status: 'active' },

  // APAC (15 sites)
  { id: 'SITE-036', name: 'Tokyo (NRT-Core1)', region: 'APAC', x: 865, y: 180, devices: 175, health: 99.8, openTickets: 1, status: 'active' },
  { id: 'SITE-037', name: 'Singapore (SIN-IX)', region: 'APAC', x: 745, y: 280, devices: 160, health: 99.4, openTickets: 2, status: 'active' },
  { id: 'SITE-038', name: 'Sydney (SYD-Core)', region: 'APAC', x: 885, y: 395, devices: 135, health: 98.9, openTickets: 3, status: 'active' },
  { id: 'SITE-039', name: 'Melbourne (MEL-DC)', region: 'APAC', x: 865, y: 415, devices: 105, health: 99.1, openTickets: 1, status: 'active' },
  { id: 'SITE-040', name: 'Hong Kong (HKG-Hub)', region: 'APAC', x: 785, y: 225, devices: 145, health: 99.2, openTickets: 2, status: 'active' },
  { id: 'SITE-041', name: 'Seoul (ICN-Edge)', region: 'APAC', x: 835, y: 175, devices: 120, health: 99.5, openTickets: 1, status: 'active' },
  { id: 'SITE-042', name: 'Mumbai (BOM-Core)', region: 'APAC', x: 675, y: 235, devices: 130, health: 97.6, openTickets: 6, status: 'maintenance' },
  { id: 'SITE-043', name: 'Bengaluru (BLR-Lab)', region: 'APAC', x: 685, y: 255, devices: 115, health: 98.7, openTickets: 3, status: 'active' },
  { id: 'SITE-044', name: 'Taipei (TPE-Edge)', region: 'APAC', x: 815, y: 220, devices: 95, health: 99.3, openTickets: 1, status: 'active' },
  { id: 'SITE-045', name: 'Auckland (AKL-Edge)', region: 'APAC', x: 945, y: 430, devices: 65, health: 99.2, openTickets: 0, status: 'active' },
  { id: 'SITE-046', name: 'Bangkok (BKK-Hub)', region: 'APAC', x: 745, y: 245, devices: 85, health: 98.1, openTickets: 3, status: 'active' },
  { id: 'SITE-047', name: 'Jakarta (CGK-DC)', region: 'APAC', x: 760, y: 305, devices: 90, health: 97.3, openTickets: 4, status: 'maintenance' },
  { id: 'SITE-048', name: 'Manila (MNL-Gateway)', region: 'APAC', x: 805, y: 250, devices: 75, health: 98.0, openTickets: 2, status: 'active' },
  { id: 'SITE-049', name: 'Kuala Lumpur (KUL)', region: 'APAC', x: 740, y: 275, devices: 88, health: 98.6, openTickets: 2, status: 'active' },
  { id: 'SITE-050', name: 'Brisbane (BNE-Branch)', region: 'APAC', x: 895, y: 365, devices: 60, health: 99.0, openTickets: 1, status: 'active' },
]

export const GlobalFleetTelemetryMap: React.FC<{
  onSelectSite?: (siteId: string) => void
}> = ({ onSelectSite }) => {
  const [hoveredSite, setHoveredSite] = useState<SiteCoordinate | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Americas' | 'EMEA' | 'APAC'>('All')

  const filteredSites = SITES.filter((s) => selectedRegion === 'All' || s.region === selectedRegion)

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              display: 'inline-block',
              boxShadow: '0 0 0 2px var(--accent-primary-subtle)',
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--ink-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Global Fleet Telemetry &amp; Edge Topology
          </h3>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              backgroundColor: 'var(--bg-surface-3)',
              color: 'var(--ink-muted)',
              padding: '1.5px 6px',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            50 SITES &bull; 3 REGIONS
          </span>
        </div>

        {/* Region Filter Buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['All', 'Americas', 'EMEA', 'APAC'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRegion(r)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: selectedRegion === r ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                backgroundColor: selectedRegion === r ? 'var(--accent-primary-subtle)' : 'var(--bg-surface-1)',
                color: selectedRegion === r ? 'var(--accent-primary)' : 'var(--ink-muted)',
                transition: 'all 100ms ease',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Vector World Map Canvas */}
      <div style={{ position: 'relative', width: '100%', height: '320px', backgroundColor: 'var(--bg-canvas)' }}>
        <svg
          viewBox="0 0 1000 500"
          style={{ width: '100%', height: '100%', display: 'block' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle Grid Lat/Long Hairlines */}
          <line x1="0" y1="125" x2="1000" y2="125" stroke="var(--border-subtle)" strokeDasharray="3 4" strokeWidth="0.8" />
          <line x1="0" y1="250" x2="1000" y2="250" stroke="var(--border-subtle)" strokeDasharray="3 4" strokeWidth="0.8" />
          <line x1="0" y1="375" x2="1000" y2="375" stroke="var(--border-subtle)" strokeDasharray="3 4" strokeWidth="0.8" />
          <line x1="250" y1="0" x2="250" y2="500" stroke="var(--border-subtle)" strokeDasharray="3 4" strokeWidth="0.8" />
          <line x1="500" y1="0" x2="500" y2="500" stroke="var(--border-subtle)" strokeDasharray="3 4" strokeWidth="0.8" />
          <line x1="750" y1="0" x2="750" y2="500" stroke="var(--border-subtle)" strokeDasharray="3 4" strokeWidth="0.8" />

          {/* Stylized Continent Silhouettes (Vector Land Masses) */}
          {/* North America */}
          <path
            d="M 120 70 Q 180 50 250 80 Q 290 110 270 180 Q 230 220 180 230 Q 140 190 120 130 Z"
            fill="var(--bg-surface-2)"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
          {/* South America */}
          <path
            d="M 260 250 Q 320 260 360 310 Q 350 400 310 450 Q 280 430 260 350 Q 245 290 260 250 Z"
            fill="var(--bg-surface-2)"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
          {/* Europe */}
          <path
            d="M 440 90 Q 520 80 570 120 Q 550 170 490 180 Q 450 160 440 90 Z"
            fill="var(--bg-surface-2)"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
          {/* Africa */}
          <path
            d="M 470 190 Q 560 180 600 240 Q 590 350 540 420 Q 490 370 470 270 Z"
            fill="var(--bg-surface-2)"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
          {/* Asia */}
          <path
            d="M 580 90 Q 750 70 880 120 Q 900 230 820 270 Q 720 270 650 220 Q 590 160 580 90 Z"
            fill="var(--bg-surface-2)"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
          {/* Australia */}
          <path
            d="M 830 330 Q 910 320 930 380 Q 890 440 830 420 Q 810 370 830 330 Z"
            fill="var(--bg-surface-2)"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />

          {/* Telemetry Backbone Arcs */}
          <path
            d="M 215 200 Q 345 130 505 145"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.45"
          />
          <path
            d="M 505 145 Q 685 140 865 180"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.45"
          />
          <path
            d="M 155 185 Q 510 340 865 180"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1"
            strokeDasharray="3 5"
            opacity="0.25"
          />

          {/* Plotted Site Nodes */}
          {filteredSites.map((site) => {
            const isHovered = hoveredSite?.id === site.id
            const isMaintenance = site.status === 'maintenance'
            const nodeColor = isMaintenance ? 'var(--color-status-warning-dot)' : 'var(--accent-primary)'

            return (
              <g
                key={site.id}
                transform={`translate(${site.x}, ${site.y})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSite(site)}
                onMouseLeave={() => setHoveredSite(null)}
                onClick={() => onSelectSite?.(site.id)}
              >
                {/* Pulse Ring for Active Nodes */}
                <circle
                  r={isHovered ? 12 : 7}
                  fill={nodeColor}
                  opacity={isHovered ? 0.35 : 0.18}
                  style={{ transition: 'all 140ms ease' }}
                />
                {/* Core Dot */}
                <circle
                  r={isHovered ? 4.5 : 3}
                  fill={nodeColor}
                  stroke="var(--color-surface)"
                  strokeWidth={1}
                />
              </g>
            )
          })}
        </svg>

        {/* Live Hover Tooltip (Monospace Telemetry Inspector) */}
        {hoveredSite && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              backgroundColor: 'var(--bg-surface-1)',
              border: '1px solid var(--border-strong)',
              borderRadius: '6px',
              padding: '6px 10px',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.2)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--ink-primary)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor:
                    hoveredSite.status === 'maintenance' ? 'var(--color-status-warning-dot)' : 'var(--gov-safe-dot)',
                }}
              />
              <span style={{ fontWeight: 700 }}>
                {hoveredSite.id}: {hoveredSite.name}
              </span>
              <span style={{ color: 'var(--ink-muted)', fontSize: '10px' }}>
                ({hoveredSite.region})
              </span>
            </div>
            <div style={{ color: 'var(--ink-secondary)', fontSize: '10.5px' }}>
              <span>{hoveredSite.devices} Devices</span> &bull;{' '}
              <span style={{ color: 'var(--gov-safe-text)', fontWeight: 600 }}>
                {hoveredSite.health}% Health
              </span>{' '}
              &bull;{' '}
              <span
                style={{
                  color: hoveredSite.openTickets > 0 ? 'var(--color-status-error-text)' : 'var(--ink-muted)',
                  fontWeight: hoveredSite.openTickets > 0 ? 600 : 400,
                }}
              >
                {hoveredSite.openTickets} Open Tickets
              </span>
            </div>
          </div>
        )}

        {/* Bottom Status Ticker */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--ink-muted)',
            backgroundColor: 'var(--bg-surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '2px 8px',
          }}
        >
          POSTGRESQL REPLICA: LATENCY 1.42ms &bull; 0 NETWORK PARTITIONS
        </div>
      </div>
    </div>
  )
}

