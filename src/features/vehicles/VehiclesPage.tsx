import { useState, useMemo } from 'react'
import {
  useVehicles, useCreateVehicle, useAllInspections,
  useCreateInspection, useUpdateInspection, useVehicleInspections
} from './useVehicles'
import { Spinner } from '../../components/ui'
import { fDate, isOverdue, isDueSoon } from '../../utils'
import { INSPECTION_STATUS, VEHICLE_TYPES, INSPECTION_TYPES } from '../../constants'
import {
  Car, Plus, AlertTriangle, CheckCircle, Clock,
  Wrench, ChevronRight, X, Loader2, Edit2,
  Gauge, CalendarDays, RefreshCw, ArrowRight,
  Shield, Zap, MoreHorizontal, Check, Flame
} from 'lucide-react'
import { format, addMonths, addYears, addDays, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { QK } from '../../constants'
import { toast } from 'sonner'

type InspStatus = 'pending' | 'completed' | 'overdue' | 'failed_reinspection'

function daysUntil(d: string) { return differenceInDays(new Date(d), new Date()) }
function urgencyLevel(insp: any): 'critical' | 'warn' | 'soon' | 'ok' {
  if (insp.status === 'overdue') return 'critical'
  if (insp.status === 'failed_reinspection') return 'critical'
  const days = daysUntil(insp.due_date)
  if (days < 0) return 'critical'
  if (days <= 15) return 'warn'
  if (days <= 45) return 'soon'
  return 'ok'
}
function vehicleUrgency(inspections: any[]): 'critical' | 'warn' | 'soon' | 'ok' {
  if (!inspections.length) return 'ok'
  const levels = ['critical', 'warn', 'soon', 'ok']
  const worst = inspections.map(urgencyLevel).sort((a, b) => levels.indexOf(a) - levels.indexOf(b))[0]
  return worst
}

const URGENCY = {
  critical: { color: '#E24B4A', bg: '#E24B4A12', border: '#E24B4A30', label: 'Critique' },
  warn:     { color: '#EF9F27', bg: '#EF9F2712', border: '#EF9F2730', label: 'Urgent'   },
  soon:     { color: '#378ADD', bg: '#378ADD12', border: '#378ADD30', label: 'À venir'  },
  ok:       { color: '#1D9E75', bg: '#1D9E7512', border: '#1D9E7530', label: 'OK'       },
}

const INSP_CONF: Record<string, { color: string; icon: typeof Shield }> = {
  'Contrôle technique':    { color: '#378ADD', icon: Shield    },
  'Contrôle pollution':    { color: '#1D9E75', icon: Zap       },
  'VGP':                   { color: '#EF9F27', icon: Wrench    },
  'Révision':              { color: '#7F77DD', icon: RefreshCw },
}

function useUpdateMileage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, mileage }: { id: string; mileage: number }) => {
      const { error } = await supabase.from('vehicles').update({ current_mileage: mileage }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.VEHICLES }); toast.success('Kilométrage mis à jour') },
    onError: (e: any) => toast.error(e.message),
  })
}

// ─── Mileage editor ───────────────────────────────────────────────────────────
function MileageEditor({ vehicle }: { vehicle: any }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(vehicle.current_mileage?.toString() ?? '')
  const updateMileage = useUpdateMileage()

  const save = async () => {
    const n = parseInt(val)
    if (!isNaN(n) && n >= 0) await updateMileage.mutateAsync({ id: vehicle.id, mileage: n })
    setEditing(false)
  }

  if (editing) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="number" value={val} onChange={e => setVal(e.target.value)}
        autoFocus onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width: 90, background: '#1e2535', border: '1px solid #1D9E75', borderRadius: 6, padding: '3px 8px', fontSize: 12, color: '#fff', outline: 'none', fontFamily: 'monospace' }}
      />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>km</span>
    </div>
  )

  return (
    <button onClick={() => setEditing(true)} title="Modifier le kilométrage"
      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <Gauge style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.3)' }} />
      <span style={{ fontSize: 12, color: vehicle.current_mileage ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
        {vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString('fr')} km` : '— km'}
      </span>
      <Edit2 style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.2)' }} />
    </button>
  )
}

// ─── Inspection row ───────────────────────────────────────────────────────────
function InspectionRow({ insp, onUpdate }: { insp: any; onUpdate: (id: string, status: InspStatus) => void }) {
  const u = urgencyLevel(insp)
  const urg = URGENCY[u]
  const days = daysUntil(insp.due_date)
  const conf = INSP_CONF[insp.inspection_type] ?? { color: '#8b90a4', icon: Wrench }
  const Icon = conf.icon
  const [menuOpen, setMenuOpen] = useState(false)

  const daysLabel = () => {
    if (days < 0) return `${Math.abs(days)}j de retard`
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Demain'
    return `dans ${days}j`
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      position: 'relative',
    }}>
      {/* Left accent */}
      <div style={{ width: 3, height: 36, borderRadius: 2, background: urg.color, flexShrink: 0 }} />

      {/* Icon */}
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${conf.color}15`, border: `1px solid ${conf.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 14, height: 14, color: conf.color }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#e8eaf0' }}>{insp.inspection_type}</span>
          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: urg.bg, border: `1px solid ${urg.border}`, color: urg.color, fontFamily: 'monospace' }}>
            {urg.label}
          </span>
          {insp.reinspection_required && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#E24B4A15', border: '1px solid #E24B4A30', color: '#F09595', fontFamily: 'monospace' }}>
              Contre-visite
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: urg.color, fontFamily: 'monospace', fontWeight: 600 }}>
            {daysLabel()}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
            Échéance : {fDate(insp.due_date)}
          </span>
          {insp.last_inspection_date && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
              Dernière : {fDate(insp.last_inspection_date)}
            </span>
          )}
        </div>
        {insp.reinspection_due_date && (
          <div style={{ marginTop: 3 }}>
            <span style={{ fontSize: 11, color: '#F09595', fontFamily: 'monospace' }}>
              Contre-visite avant le : {fDate(insp.reinspection_due_date)}
            </span>
          </div>
        )}
        {insp.notes && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0', fontStyle: 'italic' }}>{insp.notes}</p>
        )}
      </div>

      {/* Recurrence */}
      {insp.recurrence_interval_value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
          <RefreshCw style={{ width: 10, height: 10 }} />
          {insp.recurrence_interval_value} {insp.recurrence_interval_unit === 'years' ? 'an(s)' : insp.recurrence_interval_unit === 'months' ? 'mois' : 'jour(s)'}
        </div>
      )}

      {/* Status menu */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{ padding: '5px 10px', background: urg.bg, border: `1px solid ${urg.border}`, borderRadius: 8, fontSize: 11, color: urg.color, cursor: 'pointer', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 5 }}>
          {INSPECTION_STATUS[insp.status]?.label ?? insp.status}
          <ChevronRight style={{ width: 10, height: 10, transform: menuOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#161b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', zIndex: 10, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {(['pending', 'completed', 'overdue', 'failed_reinspection'] as InspStatus[]).map(s => (
              <button key={s} onClick={() => { onUpdate(insp.id, s); setMenuOpen(false) }}
                style={{ width: '100%', padding: '9px 14px', fontSize: 12, textAlign: 'left', background: s === insp.status ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: s === insp.status ? '#e8eaf0' : 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {s === insp.status && <Check style={{ width: 11, height: 11, color: '#1D9E75' }} />}
                <span style={{ marginLeft: s === insp.status ? 0 : 19 }}>{INSPECTION_STATUS[s]?.label ?? s}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add inspection form ──────────────────────────────────────────────────────
function AddInspectionForm({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const createInspection = useCreateInspection()
  const [type, setType] = useState(INSPECTION_TYPES[0])
  const [dueDate, setDueDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [lastDate, setLastDate] = useState('')
  const [notes, setNotes] = useState('')
  const [recurrenceVal, setRecurrenceVal] = useState('')
  const [recurrenceUnit, setRecurrenceUnit] = useState('years')
  const [reinspRequired, setReinspRequired] = useState(false)
  const [reinspDate, setReinspDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createInspection.mutateAsync({
      vehicle_id: vehicleId,
      inspection_type: type,
      due_date: dueDate,
      last_inspection_date: lastDate || null,
      status: isOverdue(dueDate) ? 'overdue' : 'pending',
      notes: notes || null,
      recurrence_interval_value: recurrenceVal ? parseInt(recurrenceVal) : null,
      recurrence_interval_unit: recurrenceVal ? (recurrenceUnit as any) : null,
      reinspection_required: reinspRequired,
      reinspection_due_date: reinspDate || null,
    })
    onClose()
  }

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 5, fontFamily: 'monospace' }}>{children}</label>
  )
  const fieldStyle = { width: '100%', background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#e8eaf0', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <FieldLabel>Type d'inspection</FieldLabel>
        <select value={type} onChange={e => setType(e.target.value)} style={fieldStyle}>
          {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <FieldLabel>Date d'échéance</FieldLabel>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required style={fieldStyle} />
        </div>
        <div>
          <FieldLabel>Dernière inspection</FieldLabel>
          <input type="date" value={lastDate} onChange={e => setLastDate(e.target.value)} style={fieldStyle} />
        </div>
      </div>
      <div>
        <FieldLabel>Récurrence</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={recurrenceVal} onChange={e => setRecurrenceVal(e.target.value)} placeholder="Ex: 1" min="1" style={{ ...fieldStyle, width: 80, flex: 'none' }} />
          <select value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
            <option value="years">An(s)</option>
            <option value="months">Mois</option>
            <option value="days">Jour(s)</option>
          </select>
        </div>
      </div>
      <div>
        <FieldLabel>Contre-visite requise</FieldLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <input type="checkbox" checked={reinspRequired} onChange={e => setReinspRequired(e.target.checked)} style={{ accentColor: '#1D9E75' }} />
            Contre-visite nécessaire
          </label>
          {reinspRequired && (
            <input type="date" value={reinspDate} onChange={e => setReinspDate(e.target.value)} placeholder="Date limite" style={{ ...fieldStyle, flex: 1 }} />
          )}
        </div>
      </div>
      <div>
        <FieldLabel>Notes</FieldLabel>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observations, numéro de dossier..." style={{ ...fieldStyle, resize: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" onClick={onClose} style={{ padding: '8px 14px', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
        <button type="submit" disabled={createInspection.isPending} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: '#fff', background: '#1D9E75', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {createInspection.isPending ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Plus style={{ width: 13, height: 13 }} />}
          Ajouter
        </button>
      </div>
    </form>
  )
}

// ─── Vehicle card (left list) ─────────────────────────────────────────────────
function VehicleCard({ vehicle, inspections, isSelected, onClick }: {
  vehicle: any; inspections: any[]; isSelected: boolean; onClick: () => void
}) {
  const u = vehicleUrgency(inspections)
  const urg = URGENCY[u]
  const expiredCount = inspections.filter(i => i.status === 'overdue').length
  const soonCount = inspections.filter(i => urgencyLevel(i) === 'warn' || urgencyLevel(i) === 'soon').length

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '14px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      borderLeft: `3px solid ${isSelected ? urg.color : 'transparent'}`,
      background: isSelected ? `${urg.color}08` : 'transparent',
      cursor: 'pointer', transition: 'all 0.12s',
    }}
    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Vehicle icon */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${urg.color}12`, border: `1px solid ${urg.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Car style={{ width: 16, height: 16, color: urg.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vehicle.name}</span>
            {expiredCount > 0 && (
              <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: '50%', background: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{expiredCount}</span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, fontFamily: 'monospace' }}>
            {vehicle.type}{vehicle.license_plate ? ` · ${vehicle.license_plate}` : ''}{vehicle.make ? ` · ${vehicle.make}` : ''}
          </p>
          {inspections.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {expiredCount > 0 && <span style={{ fontSize: 9, color: '#F09595', background: '#E24B4A12', border: '1px solid #E24B4A25', borderRadius: 20, padding: '1px 6px', fontFamily: 'monospace' }}>{expiredCount} expirée{expiredCount > 1 ? 's' : ''}</span>}
              {soonCount > 0 && <span style={{ fontSize: 9, color: '#FAC775', background: '#EF9F2712', border: '1px solid #EF9F2725', borderRadius: 20, padding: '1px 6px', fontFamily: 'monospace' }}>{soonCount} à venir</span>}
              {inspections.length - expiredCount - soonCount > 0 && <span style={{ fontSize: 9, color: '#5DCAA5', background: '#1D9E7512', border: '1px solid #1D9E7525', borderRadius: 20, padding: '1px 6px', fontFamily: 'monospace' }}>{inspections.length - expiredCount - soonCount} ok</span>}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Add vehicle form ─────────────────────────────────────────────────────────
function AddVehicleForm({ onClose }: { onClose: () => void }) {
  const createVehicle = useCreateVehicle()
  const [name, setName] = useState('')
  const [type, setType] = useState(VEHICLE_TYPES[0])
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [plate, setPlate] = useState('')
  const [year, setYear] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createVehicle.mutateAsync({ name: name.trim(), type, make: make || null, model: model || null, license_plate: plate || null, year: year ? parseInt(year) : null, user_id: null })
    onClose()
  }

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 5, fontFamily: 'monospace' }}>{children}</label>
  )
  const fieldStyle = { width: '100%', background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#e8eaf0', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <FieldLabel>Nom du véhicule *</FieldLabel>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Renault Master utilitaire" required autoFocus style={fieldStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <FieldLabel>Type</FieldLabel>
          <select value={type} onChange={e => setType(e.target.value)} style={fieldStyle}>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Immatriculation</FieldLabel>
          <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="AB-123-CD" style={fieldStyle} />
        </div>
        <div>
          <FieldLabel>Marque</FieldLabel>
          <input value={make} onChange={e => setMake(e.target.value)} placeholder="Renault" style={fieldStyle} />
        </div>
        <div>
          <FieldLabel>Modèle</FieldLabel>
          <input value={model} onChange={e => setModel(e.target.value)} placeholder="Master" style={fieldStyle} />
        </div>
        <div>
          <FieldLabel>Année</FieldLabel>
          <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2022" min="1990" max="2030" style={fieldStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" onClick={onClose} style={{ padding: '8px 14px', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
        <button type="submit" disabled={!name.trim() || createVehicle.isPending} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: '#fff', background: '#1D9E75', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: name.trim() ? 1 : 0.4 }}>
          {createVehicle.isPending ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Plus style={{ width: 13, height: 13 }} />}
          Créer
        </button>
      </div>
    </form>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function VehiclesPage() {
  const { data: vehicles, isLoading: vLoading } = useVehicles()
  const { data: allInspections } = useAllInspections()
  const updateInspection = useUpdateInspection()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showAddInspection, setShowAddInspection] = useState(false)

  const selectedVehicle = vehicles?.find(v => v.id === selectedId) ?? vehicles?.[0] ?? null
  const getVehicleInspections = (vid: string) => (allInspections ?? []).filter((i: any) => i.vehicle_id === vid)
  const vehicleInspections = selectedVehicle ? getVehicleInspections(selectedVehicle.id) : []

  const sortedInspections = [...vehicleInspections].sort((a, b) => {
    const order = ['critical', 'warn', 'soon', 'ok']
    return order.indexOf(urgencyLevel(a)) - order.indexOf(urgencyLevel(b))
  })

  const globalStats = useMemo(() => {
    const all = allInspections ?? []
    return {
      total: vehicles?.length ?? 0,
      expired: all.filter((i: any) => i.status === 'overdue').length,
      warn: all.filter((i: any) => urgencyLevel(i) === 'warn').length,
      soon: all.filter((i: any) => urgencyLevel(i) === 'soon').length,
    }
  }, [vehicles, allInspections])

  const handleUpdateInspection = (id: string, status: InspStatus) => {
    updateInspection.mutate({ id, status })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0c12', overflow: 'hidden' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>

      {/* Topbar */}
      <div style={{ flexShrink: 0, padding: '0 24px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0e1118', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Parc automobile</h1>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{globalStats.total} véhicule{globalStats.total > 1 ? 's' : ''}</span>
        </div>

        {/* Global alerts */}
        <div style={{ display: 'flex', gap: 6 }}>
          {globalStats.expired > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#E24B4A12', border: '1px solid #E24B4A30', borderRadius: 20 }}>
              <Flame style={{ width: 10, height: 10, color: '#F09595', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, color: '#F09595', fontFamily: 'monospace', fontWeight: 600 }}>{globalStats.expired} expirée{globalStats.expired > 1 ? 's' : ''}</span>
            </div>
          )}
          {globalStats.warn > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#EF9F2712', border: '1px solid #EF9F2730', borderRadius: 20 }}>
              <AlertTriangle style={{ width: 10, height: 10, color: '#FAC775' }} />
              <span style={{ fontSize: 11, color: '#FAC775', fontFamily: 'monospace' }}>{globalStats.warn} urgente{globalStats.warn > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <button onClick={() => setShowAddVehicle(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#1D9E75', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          <Plus style={{ width: 12, height: 12 }} /> Nouveau véhicule
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Vehicles list (left) ── */}
        <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', background: '#0a0c12', overflowY: 'auto' }}>
          {showAddVehicle && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0e1118' }}>
              <AddVehicleForm onClose={() => setShowAddVehicle(false)} />
            </div>
          )}
          {vLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}
          {!vLoading && (vehicles?.length ?? 0) === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              <Car style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.3 }} />
              Aucun véhicule
            </div>
          )}
          {[...(vehicles ?? [])].sort((a, b) => {
            const ua = vehicleUrgency(getVehicleInspections(a.id))
            const ub = vehicleUrgency(getVehicleInspections(b.id))
            const order = ['critical', 'warn', 'soon', 'ok']
            return order.indexOf(ua) - order.indexOf(ub)
          }).map(v => (
            <VehicleCard
              key={v.id} vehicle={v}
              inspections={getVehicleInspections(v.id)}
              isSelected={(selectedId ?? vehicles?.[0]?.id) === v.id}
              onClick={() => { setSelectedId(v.id); setShowAddInspection(false) }}
            />
          ))}
        </div>

        {/* ── Vehicle detail (right) ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0c0f18' }}>
          {!selectedVehicle ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
              Sélectionnez un véhicule
            </div>
          ) : (
            <div>
              {/* Vehicle hero */}
              <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${URGENCY[vehicleUrgency(vehicleInspections)].color}12`, border: `1px solid ${URGENCY[vehicleUrgency(vehicleInspections)].color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Car style={{ width: 22, height: 22, color: URGENCY[vehicleUrgency(vehicleInspections)].color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{selectedVehicle.name}</h2>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0', fontFamily: 'monospace' }}>
                      {[selectedVehicle.type, selectedVehicle.make, selectedVehicle.model, selectedVehicle.year, selectedVehicle.license_plate].filter(Boolean).join(' · ')}
                    </p>
                    <div style={{ marginTop: 8 }}>
                      <MileageEditor vehicle={selectedVehicle} />
                    </div>
                  </div>
                </div>

                {/* Inspection summary pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {INSPECTION_TYPES.map(type => {
                    const insp = vehicleInspections.find(i => i.inspection_type === type)
                    if (!insp) return null
                    const u = urgencyLevel(insp)
                    const urg = URGENCY[u]
                    const days = daysUntil(insp.due_date)
                    return (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: urg.bg, border: `1px solid ${urg.border}`, borderRadius: 20 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: urg.color }}>{type}</span>
                        <span style={{ fontSize: 10, color: urg.color, opacity: 0.7, fontFamily: 'monospace' }}>
                          {days < 0 ? `${Math.abs(days)}j retard` : days === 0 ? "auj." : `${days}j`}
                        </span>
                      </div>
                    )
                  })}
                  {vehicleInspections.filter(i => !INSPECTION_TYPES.includes(i.inspection_type)).map(i => {
                    const u = urgencyLevel(i)
                    const urg = URGENCY[u]
                    const days = daysUntil(i.due_date)
                    return (
                      <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: urg.bg, border: `1px solid ${urg.border}`, borderRadius: 20 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: urg.color }}>{i.inspection_type}</span>
                        <span style={{ fontSize: 10, color: urg.color, opacity: 0.7, fontFamily: 'monospace' }}>
                          {days < 0 ? `${Math.abs(days)}j retard` : `${days}j`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Inspections list */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px 10px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', margin: 0 }}>
                    Inspections · {vehicleInspections.length}
                  </p>
                  <button onClick={() => setShowAddInspection(!showAddInspection)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: showAddInspection ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#1D9E75')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                    <Plus style={{ width: 12, height: 12 }} /> Ajouter une inspection
                  </button>
                </div>

                {showAddInspection && (
                  <div style={{ margin: '0 16px 12px', background: '#0e1118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                    <AddInspectionForm vehicleId={selectedVehicle.id} onClose={() => setShowAddInspection(false)} />
                  </div>
                )}

                {sortedInspections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                    <Wrench style={{ width: 28, height: 28, margin: '0 auto 10px', opacity: 0.3 }} />
                    Aucune inspection enregistrée
                  </div>
                ) : (
                  <div style={{ background: '#0e1118', margin: '0 16px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    {sortedInspections.map(insp => (
                      <InspectionRow key={insp.id} insp={insp} onUpdate={handleUpdateInspection} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
