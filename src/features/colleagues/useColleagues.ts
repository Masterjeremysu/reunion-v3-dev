import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import type { ColleagueInsert } from '../../types/app'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'

export function useColleagues() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: [QK.COLLEAGUES, organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('colleagues').select('*').eq('organization_id', organization!.id).order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateColleague() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async (payload: Omit<ColleagueInsert, 'organization_id'>) => {
      if (!organization?.id) throw new Error("Organisation introuvable")
      const { data, error } = await supabase.from('colleagues').insert({ ...payload, organization_id: organization.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK.COLLEAGUES] }); toast.success('Collègue ajouté') },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useDeleteColleague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('colleagues').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK.COLLEAGUES] }); toast.success('Collègue supprimé') },
    onError: (e: any) => toast.error(e.message),
  })
}
