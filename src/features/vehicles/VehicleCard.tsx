import React from 'react'
import { Car } from 'lucide-react'
import { vehicleUrgency, urgencyLevel, URGENCY, INSP_CONF } from './utils'

interface VehicleCardProps {
  vehicle: any
  inspections: any[]
  isSelected: boolean
  onClick: () => void
}

export function VehicleCard({ vehicle, inspections, isSelected, onClick }: VehicleCardProps) {
  const u = vehicleUrgency(inspections)
  const urg = URGENCY[u]
  const expiredCount = inspections.filter(i => i.status === 'overdue').length

  const knownTypes = inspections.map(i => ({
    type: i.inspection_type,
    u: urgencyLevel(i),
    color: URGENCY[urgencyLevel(i)].color,
    conf: INSP_CONF[i.inspection_type] ?? { color: 'var(--color-text-muted)', short: '?' },
  }))

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '14px 16px',
      borderBottom: '1px solid var(--color-border)',
      borderLeft: `3px solid ${isSelected ? urg.color : 'transparent'}`,
      background: isSelected ? `${urg.color}08` : 'transparent',
      cursor: 'pointer', transition: 'all 0.12s', position: 'relative',
    }}
    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)' }}
    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11,
          background: `${urg.color}12`, border: `1px solid ${urg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: isSelected && u !== 'ok' ? `0 0 12px ${urg.glow}` : 'none',
          transition: 'box-shadow 0.2s',
        }}>
          <Car style={{ width: 17, height: 17, color: urg.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--color-text-main)' : 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vehicle.name}
            </span>
            {expiredCount > 0 && (
              <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 9, background: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--color-text-main)', padding: '0 4px' }}>
                {expiredCount}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-faded)', margin: '0 0 8px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[vehicle.license_plate, vehicle.type, vehicle.make].filter(Boolean).join(' · ')}
          </p>
          {knownTypes.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {knownTypes.map((kt, idx) => (
                <div key={idx} title={kt.type} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 7px',
                  background: URGENCY[kt.u].bg, border: `1px solid ${URGENCY[kt.u].border}`, borderRadius: 20,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: kt.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: kt.color, fontFamily: 'monospace', fontWeight: 600 }}>
                    {kt.conf.short ?? kt.type.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
          {inspections.length === 0 && (
            <span style={{ fontSize: 10, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>Aucune inspection</span>
          )}
        </div>
      </div>
    </button>
  )
}
