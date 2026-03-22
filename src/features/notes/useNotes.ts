import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import type { PreMeetingNoteInsert } from '../../types/app'
import { toast } from 'sonner'

export function useNotes() {
  return useQuery({
    queryKey: QK.NOTES,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_meeting_notes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PreMeetingNoteInsert) => {
      const { data, error } = await supabase.from('pre_meeting_notes').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.NOTES }); toast.success('Note créée') },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PreMeetingNoteInsert> & { id: string }) => {
      const { data, error } = await supabase.from('pre_meeting_notes').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.NOTES }); toast.success('Note mise à jour') },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pre_meeting_notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.NOTES }); toast.success('Note supprimée') },
    onError: (e: any) => toast.error(e.message),
  })
}
