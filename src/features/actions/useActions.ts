import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import type { ActionItemInsert, ActionItemUpdate } from '../../types/app'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'

export function useActions(meetingId?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: meetingId ? [QK.MEETING_ACTIONS(meetingId), organization?.id] : [QK.ACTIONS, organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      let q = supabase
        .from('action_items')
        .select('*, colleagues(id, name, post)')
        .eq('organization_id', organization!.id)
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
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async (payload: ActionItemInsert) => {
      if (!organization?.id) throw new Error("Organisation introuvable")
      const { data, error } = await supabase.from('action_items').insert({ ...payload, organization_id: organization.id }).select().single()
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
