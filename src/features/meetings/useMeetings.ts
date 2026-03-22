import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import type { MeetingInsert, MeetingUpdate } from '../../types/app'
import { toast } from 'sonner'

export function useMeetings() {
  return useQuery({
    queryKey: QK.MEETINGS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: QK.MEETING(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: MeetingInsert) => {
      const { data, error } = await supabase.from('meetings').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.MEETINGS })
      qc.invalidateQueries({ queryKey: QK.DASHBOARD })
      toast.success('Réunion créée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: MeetingUpdate & { id: string }) => {
      const { data, error } = await supabase.from('meetings').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.MEETINGS })
      qc.invalidateQueries({ queryKey: QK.MEETING(data.id) })
      toast.success('Réunion mise à jour')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useDeleteMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.MEETINGS })
      qc.invalidateQueries({ queryKey: QK.DASHBOARD })
      toast.success('Réunion supprimée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}
