import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import type { ConsumableRequestInsert, TeamMoodInsert } from '../../types/app'
import { toast } from 'sonner'

// ── Consumables ──────────────────────────────────────────────────────────────

export function useConsumables() {
  return useQuery({
    queryKey: QK.CONSUMABLES,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consumable_requests')
        .select('*, colleagues(id, name, post)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateConsumable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ConsumableRequestInsert) => {
      const { data, error } = await supabase.from('consumable_requests').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.CONSUMABLES }); toast.success('Demande créée') },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateConsumableStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.from('consumable_requests').update({ status }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.CONSUMABLES }); toast.success('Statut mis à jour') },
    onError: (e: any) => toast.error(e.message),
  })
}

// ── Team Mood ─────────────────────────────────────────────────────────────────

export function useMood() {
  return useQuery({
    queryKey: QK.MOOD,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_mood')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })
}

export function useAddMood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TeamMoodInsert) => {
      const { data, error } = await supabase.from('team_mood').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.MOOD }); qc.invalidateQueries({ queryKey: QK.DASHBOARD }); toast.success('Humeur enregistrée') },
    onError: (e: any) => toast.error(e.message),
  })
}
