import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'

export function useMeetings() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: [QK.MEETINGS, organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organization!.id)
        .order('date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useMeeting(id: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: [QK.MEETING(id), organization?.id],
    enabled: !!id && !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organization!.id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateMeeting() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      title: string
      description: string | null
      date: string
      colleagues_ids: string[] | null
      successes: string[]
      failures: string[]
      sensitive_points: string[]
      relational_points: string[]
      sse: string[]
      improvements: string[]
      created_by_user_id: string | null
    }) => {
      if (!organization?.id) throw new Error("Organisation introuvable")
      const { data, error } = await supabase
        .from('meetings')
        .insert({ ...payload, organization_id: organization.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK.MEETINGS] })
      qc.invalidateQueries({ queryKey: [QK.DASHBOARD] })
      toast.success('Réunion créée avec succès')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await supabase
        .from('meetings')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QK.MEETINGS] })
      qc.invalidateQueries({ queryKey: [QK.MEETING(data.id), undefined] })
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
      qc.invalidateQueries({ queryKey: [QK.MEETINGS] })
      qc.invalidateQueries({ queryKey: [QK.DASHBOARD] })
      toast.success('Réunion supprimée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}
