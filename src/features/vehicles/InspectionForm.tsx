import React, { useState } from 'react'
import { X, Plus, Loader2, Save } from 'lucide-react'
import { format, addMonths } from 'date-fns'
import { INSPECTION_TYPES } from '../../constants'
import { useCreateInspection, useUpdateInspection } from './useVehicles'
import { isOverdue } from '../../utils'

interface InspectionFormProps {
  vehicleId: string
  onClose: () => void
  inspection?: any
}

export function InspectionForm({ vehicleId, onClose, inspection }: InspectionFormProps) {
  const createInspection = useCreateInspection()
  const updateInspection = useUpdateInspection()
  const isEditing = !!inspection

  const [type, setType] = useState(inspection?.inspection_type || INSPECTION_TYPES[0])
  const [dueDate, setDueDate] = useState(inspection?.due_date || format(addMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [lastDate, setLastDate] = useState(inspection?.last_inspection_date || '')
  const [notes, setNotes] = useState(inspection?.notes || '')
  const [recurrenceVal, setRecurrenceVal] = useState(inspection?.recurrence_interval_value?.toString() || '')
  const [recurrenceUnit, setRecurrenceUnit] = useState(inspection?.recurrence_interval_unit || 'years')
  const [reinspRequired, setReinspRequired] = useState(inspection?.reinspection_required || false)
  const [reinspDate, setReinspDate] = useState(inspection?.reinspection_due_date || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      vehicle_id: vehicleId,
      inspection_type: type,
      due_date: dueDate,
      last_inspection_date: lastDate || null,
      status: isEditing && inspection.status !== 'pending' && inspection.status !== 'overdue' 
        ? inspection.status 
        : (isOverdue(dueDate) ? 'overdue' : 'pending'),
      notes: notes || null,
      recurrence_interval_value: recurrenceVal ? parseInt(recurrenceVal) : null,
      recurrence_interval_unit: recurrenceVal ? (recurrenceUnit as any) : null,
      reinspection_required: reinspRequired,
      reinspection_due_date: reinspDate || null,
    }

    if (isEditing) {
      await updateInspection.mutateAsync({ id: inspection.id, ...payload })
    } else {
      await createInspection.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = createInspection.isPending || updateInspection.isPending

  const FL = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-faded)', marginBottom: 5, fontFamily: 'monospace' }}>{children}</label>
  )
  const fs = { width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)' }}>{isEditing ? 'Modifier l\'inspection' : 'Nouvelle inspection'}</span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faded)', padding: 4 }}><X style={{ width: 14, height: 14 }} /></button>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--color-text-main)', flexShrink: 0 }}>
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
        <button type="button" onClick={onClose} style={{ padding: '8px 14px', fontSize: 13, color: 'var(--color-text-muted)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
        <button type="submit" disabled={isPending} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--color-text-main)', background: '#1D9E75', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isPending ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : isEditing ? <Save style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
          {isEditing ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}
