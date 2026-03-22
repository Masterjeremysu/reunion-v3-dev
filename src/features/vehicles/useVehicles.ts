import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import type { VehicleInsert, VehicleInspectionInsert } from '../../types/app'
import { toast } from 'sonner'

export function useVehicles() {
  return useQuery({
    queryKey: QK.VEHICLES,
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useAllInspections() {
  return useQuery({
    queryKey: QK.INSPECTIONS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select('*, vehicles(id, name, license_plate, type)')
        .order('due_date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useVehicleInspections(vehicleId: string) {
  return useQuery({
    queryKey: QK.VEHICLE_INSPECTIONS(vehicleId),
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('due_date')
      if (error) throw error
      return data
    },
  })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VehicleInsert) => {
      const { data, error } = await supabase.from('vehicles').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.VEHICLES }); toast.success('Véhicule ajouté') },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useCreateInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VehicleInspectionInsert) => {
      const { data, error } = await supabase.from('vehicle_inspections').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.INSPECTIONS })
      qc.invalidateQueries({ queryKey: QK.VEHICLE_INSPECTIONS(data.vehicle_id) })
      qc.invalidateQueries({ queryKey: QK.DASHBOARD })
      toast.success('Inspection ajoutée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<VehicleInspectionInsert> & { id: string }) => {
      const { data, error } = await supabase.from('vehicle_inspections').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.INSPECTIONS })
      qc.invalidateQueries({ queryKey: QK.VEHICLE_INSPECTIONS(data.vehicle_id) })
      qc.invalidateQueries({ queryKey: QK.DASHBOARD })
      toast.success('Inspection mise à jour')
    },
    onError: (e: any) => toast.error(e.message),
  })
}
