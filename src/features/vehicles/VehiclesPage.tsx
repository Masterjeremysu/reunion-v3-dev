import React, { useState, useMemo } from 'react'
import { Car, Plus, AlertTriangle, CheckCircle, X, Flame } from 'lucide-react'
import { useVehicles, useAllInspections } from './useVehicles'
import { vehicleUrgency, urgencyLevel } from './utils'
import { VehicleCard } from './VehicleCard'
import { VehicleDetail } from './VehicleDetail'
import { VehicleForm } from './VehicleForm'
import { Spinner } from '../../components/ui'

export function VehiclesPage() {
  const { data: vehicles, isLoading: vLoading } = useVehicles()
  const { data: allInspections } = useAllInspections()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [search, setSearch] = useState('')

  const selectedVehicle = vehicles?.find(v => v.id === selectedId) ?? vehicles?.[0] ?? null
  const getVehicleInspections = (vid: string) => (allInspections ?? []).filter((i: any) => i.vehicle_id === vid)
  const vehicleInspections = selectedVehicle ? getVehicleInspections(selectedVehicle.id) : []

  const globalStats = useMemo(() => {
    const all = allInspections ?? []
    const expired = all.filter((i: any) => i.status === 'overdue').length
    const warn = all.filter((i: any) => urgencyLevel(i) === 'warn').length
    const soon = all.filter((i: any) => urgencyLevel(i) === 'soon').length
    const ok = all.filter((i: any) => urgencyLevel(i) === 'ok').length
    return { total: vehicles?.length ?? 0, expired, warn, soon, ok, totalInsp: all.length }
  }, [vehicles, allInspections])

  const filteredVehicles = useMemo(() => {
    const order = ['critical', 'warn', 'soon', 'ok']
    return [...(vehicles ?? [])]
      .filter((v: any) => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.license_plate?.toLowerCase().includes(search.toLowerCase()))
      .sort((a: any, b: any) => order.indexOf(vehicleUrgency(getVehicleInspections(a.id))) - order.indexOf(vehicleUrgency(getVehicleInspections(b.id))))
  }, [vehicles, allInspections, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg-app)', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        select option { background: var(--color-bg-card); color: var(--color-text-main); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 2px; }
      `}</style>

      {/* Topbar */}
      <div style={{ flexShrink: 0, padding: '0 24px', height: 60, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-sidebar)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car style={{ width: 15, height: 15, color: '#1D9E75' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>Parc automobile</h1>
            <p style={{ fontSize: 10, color: 'var(--color-text-faded)', margin: 0, fontFamily: 'monospace' }}>{globalStats.total} véhicule{globalStats.total > 1 ? 's' : ''} · {globalStats.totalInsp} inspection{globalStats.totalInsp > 1 ? 's' : ''}</p>
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

        <button onClick={() => setShowAddVehicle(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1D9E75', border: 'none', borderRadius: 9, color: 'var(--color-text-main)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <Plus style={{ width: 13, height: 13 }} /> Nouveau véhicule
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 290, flexShrink: 0, borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-app)' }}>
          <div style={{ padding: '12px 12px 8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un véhicule..."
                style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 9, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-main)', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          </div>

          {showAddVehicle && (
            <div style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card)', animation: 'slideIn 0.15s ease' }}>
              <VehicleForm onClose={() => setShowAddVehicle(false)} />
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {vLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}
            {!vLoading && filteredVehicles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-faded)', fontSize: 13 }}>
                <Car style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.2, display: 'block' }} />
                {search ? 'Aucun résultat' : 'Aucun véhicule'}
              </div>
            )}
            {filteredVehicles.map((v: any) => (
              <VehicleCard
                key={v.id} vehicle={v}
                inspections={getVehicleInspections(v.id)}
                isSelected={(selectedId ?? vehicles?.[0]?.id) === v.id}
                onClick={() => setSelectedId(v.id)}
              />
            ))}
          </div>
        </div>

        {/* Main detail panel */}
        {!selectedVehicle ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--color-text-faded)' }}>
            <Car style={{ width: 40, height: 40, opacity: 0.15 }} />
            <span style={{ fontSize: 13 }}>Sélectionnez un véhicule</span>
          </div>
        ) : (
          <VehicleDetail 
            vehicle={selectedVehicle} 
            inspections={vehicleInspections} 
            onClearSelection={() => setSelectedId(null)} 
          />
        )}
      </div>
    </div>
  )
}
