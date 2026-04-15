import React, { useState, useMemo, useEffect } from 'react'
import { Car, Plus, AlertTriangle, CheckCircle, X, Flame, Search, ChevronRight, ChevronLeft, Info, Calendar } from 'lucide-react'
import { useVehicles, useAllInspections } from './useVehicles'
import { vehicleUrgency, urgencyLevel } from './utils'
import { VehicleCard } from './VehicleCard'
import { VehicleDetail } from './VehicleDetail'
import { VehicleForm } from './VehicleForm'
import { Spinner, Button } from '../../components/ui'

export function VehiclesPage() {
  const { data: vehicles, isLoading: vLoading } = useVehicles()
  const { data: allInspections } = useAllInspections()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [search, setSearch] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const selectedVehicle = vehicles?.find(v => v.id === (selectedId ?? vehicles?.[0]?.id)) || null
  
  const getVehicleInspections = (vid: string) => (allInspections ?? []).filter((i: any) => i.vehicle_id === vid)
  const selectedInspections = selectedVehicle ? getVehicleInspections(selectedVehicle.id) : []

  const globalStats = useMemo(() => {
    const all = allInspections ?? []
    const expired = all.filter((i: any) => i.status === 'overdue').length
    const warn = all.filter((i: any) => urgencyLevel(i) === 'warn').length
    return { total: vehicles?.length ?? 0, expired, warn }
  }, [vehicles, allInspections])

  const filteredVehicles = useMemo(() => {
    const order = ['critical', 'warn', 'soon', 'ok']
    return [...(vehicles ?? [])]
      .filter((v: any) => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.license_plate?.toLowerCase().includes(search.toLowerCase()))
      .sort((a: any, b: any) => order.indexOf(vehicleUrgency(getVehicleInspections(a.id))) - order.indexOf(vehicleUrgency(getVehicleInspections(b.id))))
  }, [vehicles, allInspections, search])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    if (isMobile) setMobileView('detail')
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] overflow-hidden">
      
      {/* Main Container */}
      <div className="flex flex-1 min-h-0 relative">
        
        {/* Sidebar: List */}
        <aside className={`
          flex-col transition-all duration-300 border-r border-[var(--color-border)] bg-[var(--color-bg-sidebar)]
          ${isMobile ? (mobileView === 'list' ? 'flex w-full' : 'hidden') : 'flex w-72 md:w-80 lg:w-96'}
        `}>
          {/* Header */}
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)]/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-main)]">Véhicules</h1>
                <p className="text-[10px] text-[var(--color-text-faded)] font-mono uppercase tracking-wider">{filteredVehicles.length} véhicules actifs</p>
              </div>
              <Button size="sm" variant="primary" onClick={() => setShowAddVehicle(true)} className="rounded-full w-10 h-10 p-0 shadow-lg shadow-green-500/20">
                <Plus className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex gap-2 mb-4">
               {globalStats.expired > 0 && (
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-bold text-red-500 animate-pulse">
                    <Flame className="w-3 h-3" /> {globalStats.expired} expirés
                 </div>
               )}
               {globalStats.warn > 0 && (
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-bold text-amber-500">
                    <AlertTriangle className="w-3 h-3" /> {globalStats.warn} urgences
                 </div>
               )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faded)]" />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Immat, Marque, Nom..."
                className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-brand)] transition-all"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {vLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : showAddVehicle ? (
              <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] animate-in slide-in-from-top-4">
                <VehicleForm onClose={() => setShowAddVehicle(false)} />
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="py-20 text-center px-6 grayscale">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm text-[var(--color-text-faded)]">Aucun véhicule trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]/50">
                {filteredVehicles.map((v: any) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    inspections={getVehicleInspections(v.id)}
                    isSelected={selectedVehicle?.id === v.id}
                    onClick={() => handleSelect(v.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Detail Panel */}
        <main className={`
          flex-1 flex flex-col bg-[var(--color-bg-app)] overflow-hidden
          ${isMobile && mobileView === 'list' ? 'hidden' : 'flex'}
        `}>
          {!selectedVehicle ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-xs grayscale opacity-30">
                <Car className="w-20 h-20 mx-auto mb-6" />
                <h2 className="text-lg font-bold">Sélectionnez un véhicule</h2>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
               {isMobile && (
                 <div className="p-4 bg-[var(--color-bg-sidebar)] border-b border-[var(--color-border)] text-[var(--color-brand)] font-bold flex items-center gap-2" onClick={() => setMobileView('list')}>
                   <ChevronLeft className="w-5 h-5" /> Retour à la liste
                 </div>
               )}
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <VehicleDetail 
                   vehicle={selectedVehicle} 
                   inspections={selectedInspections} 
                   onClearSelection={() => isMobile ? setMobileView('list') : setSelectedId(null)} 
                 />
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
