import React from 'react'
import { Car, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react'
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
    <button 
      onClick={onClick} 
      className={`
        w-full text-left p-5 transition-all outline-none relative group
        ${isSelected ? 'bg-[var(--color-brand)]/5' : 'hover:bg-[var(--color-bg-input)]'}
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-brand)] shadow-[0_0_10px_var(--color-brand)] z-10" />
      )}

      <div className="flex gap-4">
        {/* Icon with urgency border */}
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all border-2
          ${isSelected ? 'scale-105 shadow-xl' : ''}
        `} style={{ 
          backgroundColor: `${urg.color}15`, 
          borderColor: isSelected ? urg.color : `${urg.color}30`,
          boxShadow: isSelected ? `0 8px 16px ${urg.color}20` : 'none'
        }}>
          {u === 'critical' ? (
             <AlertCircle className="w-7 h-7 animate-pulse" style={{ color: urg.color }} />
          ) : (
             <Car className="w-7 h-7" style={{ color: urg.color }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-[var(--color-text-main)]' : 'text-[var(--color-text-main)]'}`}>
              {vehicle.name}
            </h3>
            <ChevronRight className={`w-4 h-4 text-[var(--color-text-faded)] transition-transform group-hover:translate-x-1 ${isSelected ? 'translate-x-1' : ''}`} />
          </div>

          <div className="flex items-center gap-2 mt-1 px-2 py-0.5 bg-[var(--color-bg-input)] rounded-md w-fit border border-[var(--color-border)]">
             <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--color-text-muted)] uppercase">
               {vehicle.license_plate || 'SANS PLAQUE'}
             </span>
          </div>

          <p className="text-[11px] text-[var(--color-text-faded)] mt-3 line-clamp-1 italic">
             {[vehicle.make, vehicle.model, vehicle.type].filter(Boolean).join(' · ')}
          </p>

          {knownTypes.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {knownTypes.map((kt, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-sm transition-transform hover:scale-105"
                  style={{ 
                    backgroundColor: URGENCY[kt.u].bg, 
                    borderColor: URGENCY[kt.u].border,
                    color: kt.color 
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: kt.color }} />
                  <span className="text-[9px] font-bold uppercase tracking-tight font-mono">
                    {kt.conf.short ?? kt.type.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
