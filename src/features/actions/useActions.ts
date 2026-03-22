import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import type { ActionItemInsert, ActionItemUpdate } from '../../types/app'
import { toast } from 'sonner'

export function useActions(meetingId?: string) {
  return useQuery({
    queryKey: meetingId ? QK.MEETING_ACTIONS(meetingId) : QK.ACTIONS,
    queryFn: async () => {
      let q = supabase
        .from('action_items')
        .select('*, colleagues(id, name, post)')
        .order('due_date', { ascending: true })
      if (meetingId) q = q.eq('meeting_id', meetingId)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useCreateAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ActionItemInsert) => {
      const { data, error } = await supabase.from('action_items').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.ACTIONS })
      if (data.meeting_id) qc.invalidateQueries({ queryKey: QK.MEETING_ACTIONS(data.meeting_id) })
      qc.invalidateQueries({ queryKey: QK.DASHBOARD })
      toast.success('Action créée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: ActionItemUpdate & { id: string }) => {
      const { data, error } = await supabase.from('action_items').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.ACTIONS })
      if (data.meeting_id) qc.invalidateQueries({ queryKey: QK.MEETING_ACTIONS(data.meeting_id) })
      qc.invalidateQueries({ queryKey: QK.DASHBOARD })
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useDeleteAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('action_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ACTIONS })
      qc.invalidateQueries({ queryKey: QK.DASHBOARD })
      toast.success('Action supprimée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}
