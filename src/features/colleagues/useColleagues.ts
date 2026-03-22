import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import type { ColleagueInsert } from '../../types/app'
import { toast } from 'sonner'

export function useColleagues() {
  return useQuery({
    queryKey: QK.COLLEAGUES,
    queryFn: async () => {
      const { data, error } = await supabase.from('colleagues').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateColleague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ColleagueInsert) => {
      const { data, error } = await supabase.from('colleagues').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.COLLEAGUES }); toast.success('Collègue ajouté') },
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.COLLEAGUES }); toast.success('Collègue supprimé') },
    onError: (e: any) => toast.error(e.message),
  })
}
