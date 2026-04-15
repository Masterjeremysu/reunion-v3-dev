import React, { useState } from 'react'
import { Car, Wrench, Edit2, Gauge, Check, ChevronDown, ChevronUp, RefreshCw, Trash2, Plus } from 'lucide-react'
import { fDate } from '../../utils'
import { INSPECTION_STATUS } from '../../constants'
import { URGENCY, INSP_CONF, daysUntil, urgencyLevel, vehicleUrgency, InspStatus } from './utils'
import { useUpdateVehicle, useDeleteVehicle, useUpdateInspection, useDeleteInspection } from './useVehicles'
import { InspectionForm } from './InspectionForm'
import { VehicleForm } from './VehicleForm'

function MileageEditor({ vehicle }: { vehicle: any }) {
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

  if (editing) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="number" value={val} onChange={e => setVal(e.target.value)}
        autoFocus onBlur={save}
        onKeyDown={(e: any) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width: 100, background: 'var(--color-bg-input)', border: '1px solid #1D9E75', borderRadius: 7, padding: '4px 10px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none', fontFamily: 'monospace' }}
      />
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>km</span>
    </div>
  )

  return (
    <button onClick={() => setEditing(true)} title="Modifier le kilométrage"
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
      <Gauge style={{ width: 12, height: 12, color: 'var(--color-text-muted)' }} />
      <span style={{ fontSize: 12, color: vehicle.current_mileage ? 'var(--color-text-main)' : 'var(--color-text-faded)', fontFamily: 'monospace' }}>
        {vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString('fr')} km` : 'Ajouter km'}
      </span>
      <Edit2 style={{ width: 9, height: 9, color: 'var(--color-text-faded)' }} />
    </button>
  )
}

function InspectionTimeline({ insp }: { insp: any }) {
  const u = urgencyLevel(insp)
  const urg = URGENCY[u]
  const days = daysUntil(insp.due_date)
  const pct = days <= 0 ? 0 : Math.min(100, Math.round((days / 365) * 100))

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 3, background: 'var(--color-bg-input)', borderRadius: 2, overflow: 'hidden' }}>
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

function InspectionCard({ insp }: { insp: any }) {
  const updateInspection = useUpdateInspection()
  const deleteInspection = useDeleteInspection()
  const u = urgencyLevel(insp)
  const urg = URGENCY[u]
  const days = daysUntil(insp.due_date)
  const conf = INSP_CONF[insp.inspection_type] ?? { color: 'var(--color-text-muted)', icon: Wrench, short: '?' }
  const Icon = conf.icon
  const [menuOpen, setMenuOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const daysLabel = () => {
    if (days < 0) return `${Math.abs(days)}j de retard`
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Demain'
    return `${days}j`
  }

  const handleDelete = async () => {
    if (confirm('Voulez-vous vraiment supprimer cette inspection ?')) {
      await deleteInspection.mutateAsync(insp.id)
    }
  }

  if (isEditing) {
    return (
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        <InspectionForm vehicleId={insp.vehicle_id} inspection={insp} onClose={() => setIsEditing(false)} />
      </div>
    )
  }

  return (
    <div style={{
      background: u === 'critical' ? '#E24B4A08' : u === 'warn' ? '#EF9F2706' : 'var(--color-border)',
      border: `1px solid ${urg.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${conf.color}15`, border: `1px solid ${conf.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon style={{ width: 15, height: 15, color: conf.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)' }}>{insp.inspection_type}</span>
            {insp.reinspection_required && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#E24B4A15', border: '1px solid #E24B4A30', color: '#F09595', fontFamily: 'monospace' }}>
                Contre-visite
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faded)', padding: 4 }} title="Modifier">
                <Edit2 style={{ width: 12, height: 12 }} />
              </button>
              <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', padding: 4 }} title="Supprimer">
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: urg.color, fontFamily: 'monospace', fontWeight: 700 }}>{daysLabel()}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{fDate(insp.due_date)}</span>
            {insp.recurrence_interval_value && (
              <>
                <span style={{ fontSize: 11, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>
                  <RefreshCw style={{ width: 9, height: 9 }} />
                  {insp.recurrence_interval_value}{insp.recurrence_interval_unit === 'years' ? 'a' : insp.recurrence_interval_unit === 'months' ? 'm' : 'j'}
                </span>
              </>
            )}
          </div>
          <InspectionTimeline insp={insp} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{
                padding: '5px 10px', background: urg.bg,
                border: `1px solid ${urg.border}`, borderRadius: 8,
                fontSize: 11, color: urg.color, cursor: 'pointer',
                fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {INSPECTION_STATUS[insp.status as InspStatus]?.label ?? insp.status}
              <ChevronDown style={{ width: 10, height: 10, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--color-bg-card)', border: '1px solid var(--color-border2)', borderRadius: 10, overflow: 'hidden', zIndex: 20, minWidth: 170, boxShadow: '0 12px 32px var(--color-shadow)' }}>
                {(['pending', 'completed', 'overdue', 'failed_reinspection'] as InspStatus[]).map(s => (
                  <button key={s} onClick={() => { updateInspection.mutate({ id: insp.id, status: s }); setMenuOpen(false) }}
                    style={{ width: '100%', padding: '9px 14px', fontSize: 12, textAlign: 'left', background: s === insp.status ? 'var(--color-border)' : 'transparent', border: 'none', color: s === insp.status ? 'var(--color-text-main)' : 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s === insp.status && <Check style={{ width: 11, height: 11, color: '#1D9E75', flexShrink: 0 }} />}
                    <span style={{ marginLeft: s === insp.status ? 0 : 19 }}>{INSPECTION_STATUS[s]?.label ?? s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(insp.notes || insp.last_inspection_date || insp.reinspection_due_date) && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {expanded ? <ChevronUp style={{ width: 12, height: 12, color: 'var(--color-text-muted)' }} /> : <ChevronDown style={{ width: 12, height: 12, color: 'var(--color-text-muted)' }} />}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 14px 66px', display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--color-border)' }}>
          {insp.last_inspection_date && (
            <span style={{ fontSize: 11, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>
              Dernière inspection : {fDate(insp.last_inspection_date)}
            </span>
          )}
          {insp.reinspection_due_date && (
            <span style={{ fontSize: 11, color: '#F09595', fontFamily: 'monospace' }}>
              Contre-visite avant : {fDate(insp.reinspection_due_date)}
            </span>
          )}
          {insp.notes && (
            <span style={{ fontSize: 11, color: 'var(--color-text-faded)', fontStyle: 'italic' }}>{insp.notes}</span>
          )}
        </div>
      )}
    </div>
  )
}

interface VehicleDetailProps {
  vehicle: any
  inspections: any[]
  onClearSelection: () => void
}

export function VehicleDetail({ vehicle, inspections, onClearSelection }: VehicleDetailProps) {
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
      <div style={{ flex: 1, padding: 32 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <VehicleForm vehicle={vehicle} onClose={() => setIsEditingVehicle(false)} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg-app)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '28px 32px 24px',
        borderBottom: '1px solid var(--color-border)',
        background: `linear-gradient(135deg, ${vUrgConf.color}06 0%, transparent 60%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {vUrg !== 'ok' && (
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: vUrgConf.color, opacity: 0.03, pointerEvents: 'none' }} />
        )}

        <div style={{ position: 'absolute', top: 20, right: 32, display: 'flex', gap: 8 }}>
          <button onClick={() => setIsEditingVehicle(true)} style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '6px 12px', color: 'var(--color-text-main)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Edit2 style={{ width: 12, height: 12 }} /> Modifier
          </button>
          <button onClick={handleDeleteVehicle} style={{ background: 'rgba(226, 75, 74, 0.1)', border: '1px solid rgba(226, 75, 74, 0.2)', borderRadius: 8, padding: '6px 12px', color: '#E24B4A', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 style={{ width: 12, height: 12 }} /> Supprimer
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
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
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.03em' }}>{vehicle.name}</h2>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: vUrgConf.bg, border: `1px solid ${vUrgConf.border}`, color: vUrgConf.color, fontFamily: 'monospace', fontWeight: 600 }}>
                {vUrgConf.label}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-faded)', margin: '0 0 10px', fontFamily: 'monospace' }}>
              {[vehicle.type, vehicle.make, vehicle.model, vehicle.year, vehicle.license_plate].filter(Boolean).join(' · ')}
            </p>
            <MileageEditor vehicle={vehicle} />
          </div>
        </div>

        {inspections.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {inspections.map((insp: any) => {
              const u = urgencyLevel(insp)
              const urg = URGENCY[u]
              const days = daysUntil(insp.due_date)
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

      <div style={{ flex: 1, padding: '20px 32px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', margin: 0 }}>
              Inspections
            </p>
            <span style={{ fontSize: 10, background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 20, padding: '1px 8px', color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>
              {inspections.length}
            </span>
          </div>
          <button onClick={() => setShowAddInspection(!showAddInspection)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              background: showAddInspection ? 'rgba(29,158,117,0.1)' : 'var(--color-border)',
              border: `1px solid ${showAddInspection ? '#1D9E7540' : 'var(--color-border)'}`,
              borderRadius: 9, color: showAddInspection ? '#1D9E75' : 'var(--color-text-muted)',
              fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500,
            }}>
            <Plus style={{ width: 12, height: 12 }} /> Ajouter
          </button>
        </div>

        {showAddInspection && (
          <div style={{ marginBottom: 16, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', animation: 'slideIn 0.15s ease' }}>
            <InspectionForm vehicleId={vehicle.id} onClose={() => setShowAddInspection(false)} />
          </div>
        )}

        {sortedInspections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-faded)' }}>
            <Wrench style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.2, display: 'block' }} />
            <p style={{ fontSize: 13, margin: 0 }}>Aucune inspection enregistrée</p>
            <p style={{ fontSize: 11, margin: '6px 0 0', opacity: 0.6 }}>Cliquez sur "Ajouter" pour commencer</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedInspections.map((insp: any) => (
              <InspectionCard key={insp.id} insp={insp} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
