import React, { useState } from 'react'
import { Car, Wrench, Edit2, Gauge, Check, ChevronDown, ChevronUp, RefreshCw, Trash2, Plus, Calendar, AlertCircle, Clock } from 'lucide-react'
import { fDate } from '../../utils'
import { INSPECTION_STATUS } from '../../constants'
import { URGENCY, INSP_CONF, daysUntil, urgencyLevel, vehicleUrgency, InspStatus } from './utils'
import { useUpdateVehicle, useDeleteVehicle, useUpdateInspection, useDeleteInspection } from './useVehicles'
import { InspectionForm } from './InspectionForm'
import { VehicleForm } from './VehicleForm'
import { Button, Avatar } from '../../components/ui'
import { toast } from 'sonner'

export function VehicleDetail({ vehicle, inspections, onClearSelection }: any) {
  const [showAddInspection, setShowAddInspection] = useState(false)
  const [isEditingVehicle, setIsEditingVehicle] = useState(false)
  const deleteVehicle = useDeleteVehicle()

  const sortedInspections = [...inspections].sort((a, b) => {
    const order = ['critical', 'warn', 'soon', 'ok']
    return order.indexOf(urgencyLevel(a)) - order.indexOf(urgencyLevel(b))
  })

  const vUrg = vehicleUrgency(inspections)
  const vUrgConf = URGENCY[vUrg]

  const handleDeleteVehicle = async () => {
    if (confirm('Voulez-vous vraiment supprimer ce véhicule et tout son historique ?')) {
      await deleteVehicle.mutateAsync(vehicle.id)
      onClearSelection()
    }
  }

  if (isEditingVehicle) {
    return (
      <div className="flex-1 p-6 md:p-12 bg-[var(--color-bg-app)]">
        <div className="max-w-xl mx-auto bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
          <VehicleForm vehicle={vehicle} onClose={() => setIsEditingVehicle(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-app)]">
      
      {/* Vehicle Hero Header */}
      <div className="relative px-6 py-8 md:px-10 md:py-12 border-b border-[var(--color-border)] overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 pointer-events-none">
           <Car className="w-full h-full scale-150 -rotate-12 translate-x-1/4" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex gap-6 items-center md:items-start">
               <div className={`
                 w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center border-4 shadow-2xl transition-transform hover:scale-105
               `} style={{ 
                 backgroundColor: `${vUrgConf.color}15`, 
                 borderColor: vUrgConf.color,
                 boxShadow: `0 20px 40px ${vUrgConf.color}20` 
               }}>
                 <Car className="w-10 h-10 md:w-12 md:h-12" style={{ color: vUrgConf.color }} />
               </div>

               <div>
                 <div className="flex flex-wrap items-center gap-3 mb-2">
                   <h2 className="text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tight">{vehicle.name}</h2>
                   <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border" style={{ backgroundColor: vUrgConf.bg, borderColor: vUrgConf.border, color: vUrgConf.color }}>
                     {vUrgConf.label}
                   </span>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--color-text-muted)]">
                   <span className="flex items-center gap-1.5 font-mono bg-[var(--color-bg-input)] px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-brand)] font-bold">
                     {vehicle.license_plate || 'SANS PLAQUE'}
                   </span>
                   <span>{vehicle.make} {vehicle.model}</span>
                   <span>·</span>
                   <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {vehicle.year || 'Année inconnue'}</span>
                 </div>

                 <div className="mt-6">
                    <MileageEditor vehicle={vehicle} />
                 </div>
               </div>
            </div>

            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={() => setIsEditingVehicle(true)}>
                <Edit2 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Modifier</span>
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteVehicle}>
                <Trash2 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Supprimer</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 md:p-10 space-y-10 custom-scrollbar overflow-y-auto pb-32">
        
        {/* Inspections Header */}
        <div>
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-[var(--color-brand)] rounded-full" />
               <h3 className="text-xl font-bold text-[var(--color-text-main)]">Plan d'entretien</h3>
               <span className="bg-[var(--color-bg-input)] text-[var(--color-text-faded)] text-xs font-mono px-2 py-0.5 rounded-full border border-[var(--color-border)]">
                 {inspections.length} total
               </span>
             </div>
             <Button variant="primary" onClick={() => setShowAddInspection(!showAddInspection)}>
               {showAddInspection ? 'Annuler' : <><Plus className="w-4 h-4 mr-2" /> Ajouter une inspection</>}
             </Button>
          </div>

          {showAddInspection && (
            <div className="mb-8 bg-[var(--color-bg-card)] border border-[var(--color-brand)]/30 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
               <InspectionForm vehicleId={vehicle.id} onClose={() => setShowAddInspection(false)} />
            </div>
          )}

          {sortedInspections.length === 0 ? (
            <div className="py-20 text-center bg-[var(--color-bg-sidebar)] rounded-3xl border-2 border-dashed border-[var(--color-border)]">
               <Wrench className="w-12 h-12 mx-auto mb-4 opacity-10" />
               <p className="text-[var(--color-text-faded)] italic">Aucune maintenance planifiée pour ce véhicule.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {sortedInspections.map(insp => (
                 <InspectionCard key={insp.id} insp={insp} />
               ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function MileageEditor({ vehicle }: any) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(vehicle.current_mileage?.toString() ?? '')
  const updateVehicle = useUpdateVehicle()

  const save = async () => {
    const n = parseInt(val)
    if (!isNaN(n) && n >= 0) {
      await updateVehicle.mutateAsync({ id: vehicle.id, current_mileage: n })
    }
    setEditing(false)
  }

  return (
    <div className={`flex items-center gap-3 p-3 px-4 bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] rounded-2xl shadow-inner w-fit`}>
      <Gauge className="w-5 h-5 text-[var(--color-brand)]" />
      {editing ? (
        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
          <input 
            type="number" value={val} onChange={e => setVal(e.target.value)}
            autoFocus onBlur={save}
            onKeyDown={(e: any) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            className="w-24 bg-[var(--color-bg-input)] border border-[var(--color-brand)] rounded-lg px-2 py-1 text-sm font-bold font-mono outline-none"
          />
          <span className="text-xs text-[var(--color-text-muted)] font-bold">KM</span>
        </div>
      ) : (
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setEditing(true)}>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-faded)] uppercase tracking-widest font-bold">Kilométrage</span>
            <span className="text-lg font-black font-mono leading-none">
              {vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString('fr')}` : '0'} 
              <span className="text-xs ml-1 opacity-50">km</span>
            </span>
          </div>
          <div className="p-2 bg-[var(--color-bg-input)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="w-3 h-3 text-[var(--color-brand)]" />
          </div>
        </div>
      )}
    </div>
  )
}

function InspectionCard({ insp }: { insp: any }) {
  const updateInspection = useUpdateInspection()
  const deleteInspection = useDeleteInspection()
  const u = urgencyLevel(insp)
  const urg = URGENCY[u]
  const days = daysUntil(insp.due_date)
  const conf = INSP_CONF[insp.inspection_type] ?? { color: 'var(--color-text-muted)', icon: Wrench, short: '?' }
  const Icon = conf.icon
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const handleStatusChange = (newStatus: InspStatus) => {
    updateInspection.mutate({ id: insp.id, status: newStatus })
    toast.success('Statut mis à jour')
  }

  if (isEditing) {
    return (
      <div className="md:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-brand)] rounded-2xl overflow-hidden shadow-2xl">
        <InspectionForm vehicleId={insp.vehicle_id} inspection={insp} onClose={() => setIsEditing(false)} />
      </div>
    )
  }

  return (
    <div className={`
      flex flex-col bg-[var(--color-bg-card)] border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl
      ${u === 'critical' ? 'border-red-500/40 ring-1 ring-red-500/10' : 'border-[var(--color-border)]'}
    `}>
      <div className="p-5 flex gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${conf.color}15`, border: `1px solid ${conf.color}30` }}>
          <Icon className="w-6 h-6" style={{ color: conf.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
             <h4 className="text-sm font-bold text-[var(--color-text-main)] truncate">{insp.inspection_type}</h4>
             <div className="flex gap-1">
               <button onClick={() => setIsEditing(true)} className="p-1.5 text-[var(--color-text-faded)] hover:text-[var(--color-brand)] rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
               <button onClick={() => confirm('Supprimer ?') && deleteInspection.mutate(insp.id)} className="p-1.5 text-[var(--color-text-faded)] hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
             <span className={`text-[11px] font-black font-mono flex items-center gap-1 ${days < 0 ? 'text-red-500' : 'text-[var(--color-brand)]'}`}>
               <Clock className="w-3.5 h-3.5" /> {days < 0 ? `${Math.abs(days)}J RETARD` : `${days}J RESTANTS`}
             </span>
             <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Échéance : {fDate(insp.due_date)}</span>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 w-full bg-[var(--color-bg-input)] rounded-full overflow-hidden border border-[var(--color-border)]">
             <div 
               className="h-full rounded-full transition-all duration-1000" 
               style={{ 
                 width: `${Math.max(5, Math.min(100, (days / 365) * 100))}%`, 
                 backgroundColor: urg.color,
                 boxShadow: days < 30 ? `0 0 10px ${urg.color}` : 'none'
               }} 
             />
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-[var(--color-bg-sidebar)] border-t border-[var(--color-border)]/50 flex items-center justify-between">
         <select 
           value={insp.status} 
           onChange={(e) => handleStatusChange(e.target.value as InspStatus)}
           className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border focus:outline-none transition-all cursor-pointer`}
           style={{ backgroundColor: urg.bg, borderColor: urg.border, color: urg.color }}
         >
           {Object.entries(INSPECTION_STATUS).map(([k, v]) => (
             <option key={k} value={k}>{v.label}</option>
           ))}
         </select>

         <button 
           onClick={() => setExpanded(!expanded)} 
           className="text-[10px] font-bold text-[var(--color-text-faded)] hover:text-[var(--color-text-main)] flex items-center gap-1"
         >
           {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
           {expanded ? 'MASQUER NOTES' : 'DÉTAILS'}
         </button>
      </div>

      {expanded && (
        <div className="p-5 pt-2 bg-[var(--color-bg-sidebar)] animate-in slide-in-from-top-2">
           {insp.notes ? (
             <p className="text-xs text-[var(--color-text-muted)] leading-relaxed bg-[var(--color-bg-card)] p-3 rounded-xl border border-[var(--color-border)]">{insp.notes}</p>
           ) : (
             <p className="text-xs text-[var(--color-text-faded)] italic">Aucune note pour cette inspection.</p>
           )}
           {insp.last_inspection_date && (
             <p className="text-[10px] text-[var(--color-text-faded)] mt-3">Dernier contrôle : {fDate(insp.last_inspection_date)}</p>
           )}
        </div>
      )}
    </div>
  )
}
