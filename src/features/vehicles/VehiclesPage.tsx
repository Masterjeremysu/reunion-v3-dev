import { useState } from 'react'
import { useVehicles, useCreateVehicle, useAllInspections, useCreateInspection, useUpdateInspection } from './useVehicles'
import { Card, Badge, Spinner, PageHeader, Button, EmptyState, Input } from '../../components/ui'
import { fDate, isOverdue, isDueSoon } from '../../utils'
import { INSPECTION_STATUS, VEHICLE_TYPES, INSPECTION_TYPES } from '../../constants'
import { Car, Plus, AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react'

export function VehiclesPage() {
  const { data: vehicles, isLoading: vLoading } = useVehicles()
  const { data: inspections, isLoading: iLoading } = useAllInspections()
  const createVehicle = useCreateVehicle()
  const createInspection = useCreateInspection()
  const updateInspection = useUpdateInspection()

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showInspForm, setShowInspForm] = useState(false)
  const [vName, setVName] = useState('')
  const [vType, setVType] = useState(VEHICLE_TYPES[0])
  const [vPlate, setVPlate] = useState('')
  const [vMake, setVMake] = useState('')
  const [vModel, setVModel] = useState('')
  const [iType, setIType] = useState(INSPECTION_TYPES[0])
  const [iDue, setIDue] = useState('')
  const [iNotes, setINotes] = useState('')

  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId) ?? vehicles?.[0] ?? null
  const vehicleInspections = inspections?.filter((i: any) => i.vehicle_id === selectedVehicle?.id) ?? []

  const criticalCount = inspections?.filter((i: any) => i.status === 'overdue').length ?? 0
  const upcomingCount = inspections?.filter((i: any) => isDueSoon(i.due_date, 60) && i.status !== 'overdue').length ?? 0

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    await createVehicle.mutateAsync({ name: vName, type: vType, license_plate: vPlate || null, make: vMake || null, model: vModel || null, user_id: null })
    setVName(''); setVPlate(''); setVMake(''); setVModel(''); setShowVehicleForm(false)
  }

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle) return
    await createInspection.mutateAsync({
      vehicle_id: selectedVehicle.id,
      inspection_type: iType,
      due_date: iDue,
      status: 'pending',
      notes: iNotes || null,
      reinspection_required: false,
    })
    setIType(INSPECTION_TYPES[0]); setIDue(''); setINotes(''); setShowInspForm(false)
  }

  const getStatusIcon = (status: string) => {
    if (status === 'overdue') return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
    if (status === 'completed') return <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
    return <Clock className="w-3.5 h-3.5 text-amber-400" />
  }

  return (
    <div className="flex flex-col min-h-full bg-[#0f1117]">
      <PageHeader
        title="Parc automobile"
        subtitle={`${vehicles?.length ?? 0} véhicule(s) · ${criticalCount} inspection(s) expirée(s)`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowVehicleForm(!showVehicleForm)}>
            <Plus className="w-3.5 h-3.5" /> Ajouter un véhicule
          </Button>
        }
      />

      {/* Alert banner */}
      {criticalCount > 0 && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-medium">{criticalCount} inspection(s) expirée(s)</span> nécessitent une action immédiate.
          </p>
        </div>
      )}

      <div className="flex flex-1 min-h-0 mt-4">
        {/* Vehicles list */}
        <div className="w-[260px] flex-shrink-0 border-r border-white/[0.07] flex flex-col">
          {showVehicleForm && (
            <form onSubmit={handleCreateVehicle} className="p-3 border-b border-white/[0.07] flex flex-col gap-2">
              <Input value={vName} onChange={e => setVName(e.target.value)} placeholder="Nom du véhicule" required />
              <select value={vType} onChange={e => setVType(e.target.value)} className="bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Input value={vPlate} onChange={e => setVPlate(e.target.value)} placeholder="Immatriculation" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={vMake} onChange={e => setVMake(e.target.value)} placeholder="Marque" />
                <Input value={vModel} onChange={e => setVModel(e.target.value)} placeholder="Modèle" />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" type="submit" className="flex-1">Créer</Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowVehicleForm(false)}>✕</Button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto">
            {vLoading && <div className="flex justify-center py-8"><Spinner /></div>}
            {!vLoading && (vehicles?.length ?? 0) === 0 && (
              <EmptyState icon={Car} title="Aucun véhicule" description="Ajoutez votre premier véhicule" />
            )}
            {vehicles?.map(v => {
              const vInsp = inspections?.filter((i: any) => i.vehicle_id === v.id) ?? []
              const hasExpired = vInsp.some((i: any) => i.status === 'overdue')
              const hasSoon = vInsp.some((i: any) => isDueSoon(i.due_date, 60) && i.status !== 'overdue')
              const isSelected = (selectedVehicleId ?? vehicles[0]?.id) === v.id

              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`w-full text-left p-3 border-b border-white/[0.05] transition-colors hover:bg-[#1c2030] ${isSelected ? 'bg-[#1e2333] border-l-2 border-l-teal-500' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-[#252b3d] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Car className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-slate-200 truncate">{v.name}</p>
                        {hasExpired && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                        {!hasExpired && hasSoon && <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{v.type}{v.license_plate ? ` · ${v.license_plate}` : ''}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Inspections detail */}
        <div className="flex-1 p-6 overflow-y-auto">
          {!selectedVehicle ? (
            <EmptyState icon={Car} title="Sélectionnez un véhicule" description="Cliquez sur un véhicule pour voir ses inspections" />
          ) : (
            <div className="max-w-2xl flex flex-col gap-5">
              {/* Vehicle info */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#252b3d] rounded-xl flex items-center justify-center">
                      <Car className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{selectedVehicle.name}</p>
                      <p className="text-xs text-slate-400">
                        {selectedVehicle.type}
                        {selectedVehicle.make && ` · ${selectedVehicle.make}`}
                        {selectedVehicle.model && ` ${selectedVehicle.model}`}
                        {selectedVehicle.license_plate && ` · ${selectedVehicle.license_plate}`}
                      </p>
                    </div>
                  </div>
                  {selectedVehicle.current_mileage && (
                    <div className="text-right">
                      <p className="text-lg font-medium text-white">{selectedVehicle.current_mileage.toLocaleString()} km</p>
                      <p className="text-xs text-slate-500">Kilométrage actuel</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Add inspection */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase">Inspections ({vehicleInspections.length})</p>
                <Button variant="default" size="sm" onClick={() => setShowInspForm(!showInspForm)}>
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </Button>
              </div>

              {showInspForm && (
                <Card className="p-4">
                  <form onSubmit={handleCreateInspection} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select value={iType} onChange={e => setIType(e.target.value)} className="bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500">
                        {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="date" value={iDue} onChange={e => setIDue(e.target.value)} required className="bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500" />
                    </div>
                    <Input value={iNotes} onChange={e => setINotes(e.target.value)} placeholder="Notes optionnelles..." />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" type="button" onClick={() => setShowInspForm(false)}>Annuler</Button>
                      <Button variant="primary" size="sm" type="submit">Ajouter</Button>
                    </div>
                  </form>
                </Card>
              )}

              {iLoading && <Spinner />}
              {!iLoading && vehicleInspections.length === 0 && (
                <EmptyState icon={Wrench} title="Aucune inspection" description="Ajoutez la première inspection de ce véhicule" />
              )}

              {vehicleInspections.length > 0 && (
                <Card>
                  <div className="divide-y divide-white/[0.05]">
                    {vehicleInspections.map((insp: any) => {
                      const st = INSPECTION_STATUS[insp.status]
                      return (
                        <div key={insp.id} className="flex items-center gap-3 p-4">
                          {getStatusIcon(insp.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 font-medium">{insp.inspection_type}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                              <span>Échéance : <span className={insp.status === 'overdue' ? 'text-red-400' : ''}>{fDate(insp.due_date)}</span></span>
                              {insp.last_inspection_date && <span>Dernière : {fDate(insp.last_inspection_date)}</span>}
                            </div>
                            {insp.notes && <p className="text-xs text-slate-500 mt-1">{insp.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={st?.color as any ?? 'gray'}>{st?.label ?? insp.status}</Badge>
                            <select
                              value={insp.status}
                              onChange={e => updateInspection.mutate({ id: insp.id, status: e.target.value as any })}
                              className="bg-transparent border-none text-xs outline-none cursor-pointer text-slate-500 hover:text-slate-300"
                            >
                              <option value="pending">À planifier</option>
                              <option value="completed">Réalisée</option>
                              <option value="overdue">En retard</option>
                              <option value="failed_reinspection">Contre-visite</option>
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
