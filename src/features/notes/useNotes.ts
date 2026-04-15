import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'

export function useNotes() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: [QK.NOTES, organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_meeting_notes')
        .select('*')
        .eq('organization_id', organization!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      user_id: string
      title: string
      content: string | null
      for_meeting_date: string | null
      is_archived: boolean
      tags?: string[]
    }) => {
      if (!organization?.id) throw new Error("Organisation introuvable")
      const { tags, ...base } = payload
      try {
        const { data, error } = await supabase
          .from('pre_meeting_notes')
          .insert({ ...base, organization_id: organization.id, tags: tags ?? [] })
          .select()
          .single()
        if (error) throw error
        return data
      } catch {
        const { data, error } = await supabase
          .from('pre_meeting_notes')
          .insert({ ...base, organization_id: organization.id })
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK.NOTES] })
      toast.success('Note créée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { tags, ...base } = payload
      try {
        const { data, error } = await supabase
          .from('pre_meeting_notes')
          .update({ ...base, tags: tags ?? [] })
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data
      } catch {
        const { data, error } = await supabase
          .from('pre_meeting_notes')
          .update(base)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK.NOTES] })
      toast.success('Note mise à jour')
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK.NOTES] })
      toast.success('Note supprimée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}
