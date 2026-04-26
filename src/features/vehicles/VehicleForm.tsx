import React, { useState } from 'react'
import { X, Plus, Loader2, Save } from 'lucide-react'
import { VEHICLE_TYPES } from '../../constants'
import { useCreateVehicle, useUpdateVehicle } from './useVehicles'

interface VehicleFormProps {
  onClose: () => void
  vehicle?: any // if provided, we are in Edit mode
}

export function VehicleForm({ onClose, vehicle }: VehicleFormProps) {
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  
  const isEditing = !!vehicle
  const [name, setName] = useState(vehicle?.name || '')
  const [type, setType] = useState(vehicle?.type || VEHICLE_TYPES[0])
  const [make, setMake] = useState(vehicle?.make || '')
  const [model, setModel] = useState(vehicle?.model || '')
  const [plate, setPlate] = useState(vehicle?.license_plate || '')
  const [year, setYear] = useState(vehicle?.year?.toString() || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: name.trim(),
      type,
      make: make || null,
      model: model || null,
      license_plate: plate || null,
      year: year ? parseInt(year) : null,
    }

    if (isEditing) {
      await updateVehicle.mutateAsync({ id: vehicle.id, ...payload })
    } else {
      await createVehicle.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = createVehicle.isPending || updateVehicle.isPending
  const FL = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-faded)', marginBottom: 5, fontFamily: 'monospace' }}>{children}</label>
  )
  const fs = { width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)' }}>{isEditing ? 'Modifier le véhicule' : 'Nouveau véhicule'}</span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faded)', padding: 4 }}><X style={{ width: 14, height: 14 }} /></button>
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
        <button type="button" onClick={onClose} style={{ padding: '8px 14px', fontSize: 13, color: 'var(--color-text-muted)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
        <button type="submit" disabled={!name.trim() || isPending} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--color-text-main)', background: '#1D9E75', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: name.trim() ? 1 : 0.5 }}>
          {isPending ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : isEditing ? <Save style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
          {isEditing ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  )
}
