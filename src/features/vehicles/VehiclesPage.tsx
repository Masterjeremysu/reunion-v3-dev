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
  Shield, Zap, MoreHorizontal, Check, Flame,
  TrendingUp, Activity, ChevronDown, ChevronUp
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
  return inspections.map(urgencyLevel).sort((a, b) => levels.indexOf(a) - levels.indexOf(b))[0]
}

const URGENCY = {
  critical: { color: '#E24B4A', bg: '#E24B4A12', border: '#E24B4A30', label: 'Critique', glow: '#E24B4A40' },
  warn:     { color: '#EF9F27', bg: '#EF9F2712', border: '#EF9F2730', label: 'Urgent',   glow: '#EF9F2740' },
  soon:     { color: '#378ADD', bg: '#378ADD12', border: '#378ADD30', label: 'À venir',  glow: '#378ADD40' },
  ok:       { color: '#1D9E75', bg: '#1D9E7512', border: '#1D9E7530', label: 'OK',       glow: '#1D9E7540' },
}

const INSP_CONF: Record<string, { color: string; icon: typeof Shield; short: string }> = {
  'Contrôle technique': { color: '#378ADD', icon: Shield,    short: 'CT'  },
  'Contrôle pollution': { color: '#1D9E75', icon: Zap,       short: 'CP'  },
  'VGP':                { color: '#EF9F27', icon: Wrench,    short: 'VGP' },
  'Révision':           { color: '#7F77DD', icon: RefreshCw, short: 'RÉV' },
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
        style={{ width: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid #1D9E75', borderRadius: 7, padding: '4px 10px', fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'monospace' }}
      />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>km</span>
    </div>
  )

  return (
    <button onClick={() => setEditing(true)} title="Modifier le kilométrage"
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
      <Gauge style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.4)' }} />
      <span style={{ fontSize: 12, color: vehicle.current_mileage ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
        {vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString('fr')} km` : 'Ajouter km'}
      </span>
      <Edit2 style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.25)' }} />
    </button>
  )
}

// ─── Inspection timeline bar ──────────────────────────────────────────────────
function InspectionTimeline({ insp }: { insp: any }) {
  const u = urgencyLevel(insp)
  const urg = URGENCY[u]
  const days = daysUntil(insp.due_date)
  // Max window = 365 days ahead, already expired = 0
  const pct = days <= 0 ? 0 : Math.min(100, Math.round((days / 365) * 100))

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${urg.color}80, ${urg.color})`,
          borderRadius: 2, transition: 'width 0.6s ease',
          boxShadow: pct < 20 ? `0 0 6px ${urg.color}` : 'none',
        }} />
      </div>
    </div>
  )
}

// ─── Inspection card (new style) ─────────────────────────────────────────────
function InspectionCard({ insp, onUpdate }: { insp: any; onUpdate: (id: string, status: InspStatus) => void }) {
  const u = urgencyLevel(insp)
  const urg = URGENCY[u]
  const days = daysUntil(insp.due_date)
  const conf = INSP_CONF[insp.inspection_type] ?? { color: '#8b90a4', icon: Wrench, short: '?' }
  const Icon = conf.icon
  const [menuOpen, setMenuOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const daysLabel = () => {
    if (days < 0) return `${Math.abs(days)}j de retard`
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Demain'
    return `${days}j`
  }

  return (
    <div style={{
      background: u === 'critical' ? '#E24B4A08' : u === 'warn' ? '#EF9F2706' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${urg.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${conf.color}15`, border: `1px solid ${conf.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon style={{ width: 15, height: 15, color: conf.color }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>{insp.inspection_type}</span>
            {insp.reinspection_required && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#E24B4A15', border: '1px solid #E24B4A30', color: '#F09595', fontFamily: 'monospace' }}>
                Contre-visite
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: urg.color, fontFamily: 'monospace', fontWeight: 700 }}>{daysLabel()}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>·</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{fDate(insp.due_date)}</span>
            {insp.recurrence_interval_value && (
              <>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                  <RefreshCw style={{ width: 9, height: 9 }} />
                  {insp.recurrence_interval_value}{insp.recurrence_interval_unit === 'years' ? 'a' : insp.recurrence_interval_unit === 'months' ? 'm' : 'j'}
                </span>
              </>
            )}
          </div>
          <InspectionTimeline insp={insp} />
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Status dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{
                padding: '5px 10px', background: urg.bg,
                border: `1px solid ${urg.border}`, borderRadius: 8,
                fontSize: 11, color: urg.color, cursor: 'pointer',
                fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {INSPECTION_STATUS[insp.status]?.label ?? insp.status}
              <ChevronDown style={{ width: 10, height: 10, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#161b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', zIndex: 20, minWidth: 170, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
                {(['pending', 'completed', 'overdue', 'failed_reinspection'] as InspStatus[]).map(s => (
                  <button key={s} onClick={() => { onUpdate(insp.id, s); setMenuOpen(false) }}
                    style={{ width: '100%', padding: '9px 14px', fontSize: 12, textAlign: 'left', background: s === insp.status ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: s === insp.status ? '#e8eaf0' : 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s === insp.status && <Check style={{ width: 11, height: 11, color: '#1D9E75', flexShrink: 0 }} />}
                    <span style={{ marginLeft: s === insp.status ? 0 : 19 }}>{INSPECTION_STATUS[s]?.label ?? s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expand if notes/reinsp */}
          {(insp.notes || insp.last_inspection_date || insp.reinspection_due_date) && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {expanded ? <ChevronUp style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.4)' }} /> : <ChevronDown style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.4)' }} />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 16px 14px 66px', display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {insp.last_inspection_date && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
              Dernière inspection : {fDate(insp.last_inspection_date)}
            </span>
          )}
          {insp.reinspection_due_date && (
            <span style={{ fontSize: 11, color: '#F09595', fontFamily: 'monospace' }}>
              Contre-visite avant : {fDate(insp.reinspection_due_date)}
            </span>
          )}
          {insp.notes && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>{insp.notes}</span>
          )}
        </div>
      )}
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

  const FL = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 5, fontFamily: 'monospace' }}>{children}</label>
  )
  const fs = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#e8eaf0', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>Nouvelle inspection</span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}><X style={{ width: 14, height: 14 }} /></button>
      </div>
      <div>
        <FL>Type d'inspection</FL>
        <select value={type} onChange={e => setType(e.target.value)} style={fs}>
          {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <FL>Date d'échéance</FL>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required style={fs} />
        </div>
        <div>
          <FL>Dernière inspection</FL>
          <input type="date" value={lastDate} onChange={e => setLastDate(e.target.value)} style={fs} />
        </div>
      </div>
      <div>
        <FL>Récurrence</FL>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={recurrenceVal} onChange={e => setRecurrenceVal(e.target.value)} placeholder="Ex: 1" min="1" style={{ ...fs, width: 80, flex: 'none' }} />
          <select value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value)} style={{ ...fs, flex: 1 }}>
            <option value="years">An(s)</option>
            <option value="months">Mois</option>
            <option value="days">Jour(s)</option>
          </select>
        </div>
      </div>
      <div>
        <FL>Contre-visite</FL>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
            <input type="checkbox" checked={reinspRequired} onChange={e => setReinspRequired(e.target.checked)} style={{ accentColor: '#1D9E75' }} />
            Requise
          </label>
          {reinspRequired && (
            <input type="date" value={reinspDate} onChange={e => setReinspDate(e.target.value)} style={{ ...fs, flex: 1 }} />
          )}
        </div>
      </div>
      <div>
        <FL>Notes</FL>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observations, numéro de dossier..." style={{ ...fs, resize: 'none' }} />
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

  const FL = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 5, fontFamily: 'monospace' }}>{children}</label>
  )
  const fs = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#e8eaf0', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>Nouveau véhicule</span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}><X style={{ width: 14, height: 14 }} /></button>
      </div>
      <div>
        <FL>Nom du véhicule *</FL>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Renault Master utilitaire" required autoFocus style={fs} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <FL>Type</FL>
          <select value={type} onChange={e => setType(e.target.value)} style={fs}>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <FL>Immatriculation</FL>
          <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="AB-123-CD" style={{ ...fs, textTransform: 'uppercase', fontFamily: 'monospace' }} />
        </div>
        <div>
          <FL>Marque</FL>
          <input value={make} onChange={e => setMake(e.target.value)} placeholder="Renault" style={fs} />
        </div>
        <div>
          <FL>Modèle</FL>
          <input value={model} onChange={e => setModel(e.target.value)} placeholder="Master" style={fs} />
        </div>
        <div>
          <FL>Année</FL>
          <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2022" min="1990" max="2030" style={fs} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" onClick={onClose} style={{ padding: '8px 14px', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
        <button type="submit" disabled={!name.trim() || createVehicle.isPending} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: '#fff', background: '#1D9E75', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: name.trim() ? 1 : 0.5 }}>
          {createVehicle.isPending ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Plus style={{ width: 13, height: 13 }} />}
          Créer
        </button>
      </div>
    </form>
  )
}

// ─── Vehicle card (sidebar) ───────────────────────────────────────────────────
function VehicleCard({ vehicle, inspections, isSelected, onClick }: {
  vehicle: any; inspections: any[]; isSelected: boolean; onClick: () => void
}) {
  const u = vehicleUrgency(inspections)
  const urg = URGENCY[u]
  const expiredCount = inspections.filter(i => i.status === 'overdue').length
  const warnCount = inspections.filter(i => urgencyLevel(i) === 'warn').length
  const soonCount = inspections.filter(i => urgencyLevel(i) === 'soon').length
  const okCount = inspections.filter(i => urgencyLevel(i) === 'ok').length

  // Mini inspection dots for each inspection type known
  const knownTypes = inspections.map(i => ({
    type: i.inspection_type,
    u: urgencyLevel(i),
    color: URGENCY[urgencyLevel(i)].color,
    conf: INSP_CONF[i.inspection_type] ?? { color: '#8b90a4', short: '?' },
  }))

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '14px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      borderLeft: `3px solid ${isSelected ? urg.color : 'transparent'}`,
      background: isSelected ? `${urg.color}08` : 'transparent',
      cursor: 'pointer', transition: 'all 0.12s', position: 'relative',
    }}
    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)' }}
    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon with urgency glow */}
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
            <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#fff' : '#e8eaf0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vehicle.name}
            </span>
            {expiredCount > 0 && (
              <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 9, background: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', padding: '0 4px' }}>
                {expiredCount}
              </span>
            )}
          </div>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 8px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[vehicle.license_plate, vehicle.type, vehicle.make].filter(Boolean).join(' · ')}
          </p>

          {/* Inspection dots */}
          {knownTypes.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {knownTypes.map((kt, idx) => (
                <div key={idx} title={kt.type} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 7px',
                  background: URGENCY[kt.u].bg,
                  border: `1px solid ${URGENCY[kt.u].border}`,
                  borderRadius: 20,
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
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>Aucune inspection</span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── KPI badge ────────────────────────────────────────────────────────────────
function KpiBadge({ value, label, color, icon: Icon }: { value: number; label: string; color: string; icon: typeof Car }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 10 }}>
      <Icon style={{ width: 13, height: 13, color }} />
      <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</span>
      <span style={{ fontSize: 11, color: `${color}99` }}>{label}</span>
    </div>
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
  const [search, setSearch] = useState('')

  const selectedVehicle = vehicles?.find(v => v.id === selectedId) ?? vehicles?.[0] ?? null
  const getVehicleInspections = (vid: string) => (allInspections ?? []).filter((i: any) => i.vehicle_id === vid)
  const vehicleInspections = selectedVehicle ? getVehicleInspections(selectedVehicle.id) : []

  const sortedInspections = [...vehicleInspections].sort((a, b) => {
    const order = ['critical', 'warn', 'soon', 'ok']
    return order.indexOf(urgencyLevel(a)) - order.indexOf(urgencyLevel(b))
  })

  const globalStats = useMemo(() => {
    const all = allInspections ?? []
    const expired = all.filter((i: any) => i.status === 'overdue').length
    const warn = all.filter((i: any) => urgencyLevel(i) === 'warn').length
    const soon = all.filter((i: any) => urgencyLevel(i) === 'soon').length
    const ok = all.filter((i: any) => urgencyLevel(i) === 'ok').length
    return { total: vehicles?.length ?? 0, expired, warn, soon, ok, totalInsp: all.length }
  }, [vehicles, allInspections])

  // Vehicles sorted by urgency + search filter
  const filteredVehicles = useMemo(() => {
    const order = ['critical', 'warn', 'soon', 'ok']
    return [...(vehicles ?? [])]
      .filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.license_plate?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => order.indexOf(vehicleUrgency(getVehicleInspections(a.id))) - order.indexOf(vehicleUrgency(getVehicleInspections(b.id))))
  }, [vehicles, allInspections, search])

  const handleUpdateInspection = (id: string, status: InspStatus) => {
    updateInspection.mutate({ id, status })
  }

  const vUrg = selectedVehicle ? vehicleUrgency(vehicleInspections) : 'ok'
  const vUrgConf = URGENCY[vUrg]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0c12', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        select option { background: #161b26; color: #e8eaf0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>

      {/* ── Topbar ── */}
      <div style={{ flexShrink: 0, padding: '0 24px', height: 60, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(14,17,24,0.95)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car style={{ width: 15, height: 15, color: '#1D9E75' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Parc automobile</h1>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0, fontFamily: 'monospace' }}>{globalStats.total} véhicule{globalStats.total > 1 ? 's' : ''} · {globalStats.totalInsp} inspection{globalStats.totalInsp > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* KPI badges */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
          {globalStats.expired > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#E24B4A12', border: '1px solid #E24B4A30', borderRadius: 20 }}>
              <Flame style={{ width: 10, height: 10, color: '#F09595', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, color: '#F09595', fontFamily: 'monospace', fontWeight: 600 }}>{globalStats.expired} expirée{globalStats.expired > 1 ? 's' : ''}</span>
            </div>
          )}
          {globalStats.warn > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#EF9F2712', border: '1px solid #EF9F2730', borderRadius: 20 }}>
              <AlertTriangle style={{ width: 10, height: 10, color: '#FAC775' }} />
              <span style={{ fontSize: 11, color: '#FAC775', fontFamily: 'monospace' }}>{globalStats.warn} urgente{globalStats.warn > 1 ? 's' : ''}</span>
            </div>
          )}
          {globalStats.expired === 0 && globalStats.warn === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#1D9E7512', border: '1px solid #1D9E7530', borderRadius: 20 }}>
              <CheckCircle style={{ width: 10, height: 10, color: '#5DCAA5' }} />
              <span style={{ fontSize: 11, color: '#5DCAA5', fontFamily: 'monospace' }}>Parc conforme</span>
            </div>
          )}
        </div>

        <button onClick={() => setShowAddVehicle(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1D9E75', border: 'none', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <Plus style={{ width: 13, height: 13 }} /> Nouveau véhicule
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 290, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', background: '#0a0c12' }}>

          {/* Search */}
          <div style={{ padding: '12px 12px 8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un véhicule..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '8px 12px', fontSize: 12, color: '#e8eaf0', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2 }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          </div>

          {/* Add vehicle form */}
          {showAddVehicle && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', animation: 'slideIn 0.15s ease' }}>
              <AddVehicleForm onClose={() => setShowAddVehicle(false)} />
            </div>
          )}

          {/* Vehicle list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {vLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}
            {!vLoading && filteredVehicles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
                <Car style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.2, display: 'block' }} />
                {search ? 'Aucun résultat' : 'Aucun véhicule'}
              </div>
            )}
            {filteredVehicles.map(v => (
              <VehicleCard
                key={v.id} vehicle={v}
                inspections={getVehicleInspections(v.id)}
                isSelected={(selectedId ?? vehicles?.[0]?.id) === v.id}
                onClick={() => { setSelectedId(v.id); setShowAddInspection(false) }}
              />
            ))}
          </div>
        </div>

        {/* ── Main detail panel ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0c0f18', display: 'flex', flexDirection: 'column' }}>
          {!selectedVehicle ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'rgba(255,255,255,0.1)' }}>
              <Car style={{ width: 40, height: 40, opacity: 0.15 }} />
              <span style={{ fontSize: 13 }}>Sélectionnez un véhicule</span>
            </div>
          ) : (
            <>
              {/* ── Vehicle hero ── */}
              <div style={{
                padding: '28px 32px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: `linear-gradient(135deg, ${vUrgConf.color}06 0%, transparent 60%)`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Decorative glow */}
                {vUrg !== 'ok' && (
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: vUrgConf.color, opacity: 0.03, pointerEvents: 'none' }} />
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
                  {/* Big vehicle icon */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: `${vUrgConf.color}12`, border: `1px solid ${vUrgConf.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: vUrg !== 'ok' ? `0 0 20px ${vUrgConf.glow}` : 'none',
                  }}>
                    <Car style={{ width: 28, height: 28, color: vUrgConf.color }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>{selectedVehicle.name}</h2>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: vUrgConf.bg, border: `1px solid ${vUrgConf.border}`, color: vUrgConf.color, fontFamily: 'monospace', fontWeight: 600 }}>
                        {vUrgConf.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 10px', fontFamily: 'monospace' }}>
                      {[selectedVehicle.type, selectedVehicle.make, selectedVehicle.model, selectedVehicle.year, selectedVehicle.license_plate].filter(Boolean).join(' · ')}
                    </p>
                    <MileageEditor vehicle={selectedVehicle} />
                  </div>
                </div>

                {/* Inspection status pills */}
                {vehicleInspections.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {vehicleInspections.map(insp => {
                      const u = urgencyLevel(insp)
                      const urg = URGENCY[u]
                      const days = daysUntil(insp.due_date)
                      const conf = INSP_CONF[insp.inspection_type] ?? { color: '#8b90a4', icon: Wrench }
                      return (
                        <div key={insp.id} style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '6px 12px',
                          background: urg.bg, border: `1px solid ${urg.border}`, borderRadius: 10,
                          boxShadow: u === 'critical' ? `0 0 8px ${urg.glow}` : 'none',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: urg.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: urg.color }}>{insp.inspection_type}</span>
                          <span style={{ fontSize: 10, color: `${urg.color}80`, fontFamily: 'monospace' }}>
                            {days < 0 ? `${Math.abs(days)}j retard` : days === 0 ? 'auj.' : `${days}j`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Inspections section ── */}
              <div style={{ flex: 1, padding: '20px 32px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', margin: 0 }}>
                      Inspections
                    </p>
                    <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1px 8px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                      {vehicleInspections.length}
                    </span>
                  </div>
                  <button onClick={() => setShowAddInspection(!showAddInspection)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px',
                      background: showAddInspection ? 'rgba(29,158,117,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${showAddInspection ? '#1D9E7540' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 9, color: showAddInspection ? '#1D9E75' : 'rgba(255,255,255,0.4)',
                      fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500,
                    }}>
                    <Plus style={{ width: 12, height: 12 }} /> Ajouter
                  </button>
                </div>

                {showAddInspection && (
                  <div style={{ marginBottom: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', animation: 'slideIn 0.15s ease' }}>
                    <AddInspectionForm vehicleId={selectedVehicle.id} onClose={() => setShowAddInspection(false)} />
                  </div>
                )}

                {sortedInspections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 16px', color: 'rgba(255,255,255,0.15)' }}>
                    <Wrench style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.2, display: 'block' }} />
                    <p style={{ fontSize: 13, margin: 0 }}>Aucune inspection enregistrée</p>
                    <p style={{ fontSize: 11, margin: '6px 0 0', opacity: 0.6 }}>Cliquez sur "Ajouter" pour commencer</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sortedInspections.map(insp => (
                      <InspectionCard key={insp.id} insp={insp} onUpdate={handleUpdateInspection} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
