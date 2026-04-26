import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'

export function useVehicles() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: [QK.VEHICLES, organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').eq('organization_id', organization!.id).order('name')
      if (error) throw error
      return (data ?? []) as any[]
    },
  })
}

export function useAllInspections() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: [QK.INSPECTIONS, organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      // In a real app with RLS, the DB filters inspections automatically.
      // Here we fetch all and let vehicle relation filter if needed, 
      // but without RLS we filter the relation using inner join logic if possible,
      // or rely on the RLS we will activate next.
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select('*, vehicles!inner(id, name, license_plate, type, organization_id)')
        .eq('vehicles.organization_id', organization!.id)
        .order('due_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as any[]
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
      return (data ?? []) as any[]
    },
  })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async (payload: any) => {
      if (!organization?.id) throw new Error("Organisation introuvable")
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('vehicles')
        .insert({ ...payload, user_id: user?.id ?? null, organization_id: organization.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK.VEHICLES] })
      toast.success('Véhicule ajouté')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useCreateInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase.from('vehicle_inspections') as any)
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [QK.INSPECTIONS] })
      qc.invalidateQueries({ queryKey: QK.VEHICLE_INSPECTIONS(data.vehicle_id) })
      toast.success('Inspection ajoutée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await (supabase.from('vehicle_inspections') as any)
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [QK.INSPECTIONS] })
      qc.invalidateQueries({ queryKey: QK.VEHICLE_INSPECTIONS(data.vehicle_id) })
      toast.success('Inspection mise à jour')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await (supabase.from('vehicles') as any)
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK.VEHICLES] })
      toast.success('Véhicule mis à jour')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK.VEHICLES] })
      qc.invalidateQueries({ queryKey: [QK.INSPECTIONS] })
      toast.success('Véhicule supprimé')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useDeleteInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase.from('vehicle_inspections') as any)
        .delete()
        .eq('id', id)
        .select('vehicle_id')
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [QK.INSPECTIONS] })
      if (data) qc.invalidateQueries({ queryKey: QK.VEHICLE_INSPECTIONS(data.vehicle_id) })
      toast.success('Inspection supprimée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}
