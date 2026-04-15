import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import { useAuth } from '../auth/useAuth'

export interface Team {
  id: string
  created_at: string
  organization_id: string
  name: string
  color: string
  leader_id: string | null
  team_members?: TeamMember[]
}

export interface TeamMember {
  id: string
  team_id: string
  colleague_id: string
  colleagues?: {
    id: string
    name: string
    post: string
  }
}

export interface Mission {
  id: string
  created_at: string
  organization_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  team_id: string | null
  status: 'planned' | 'in_progress' | 'completed'
  color: string
}

export function useTeams() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['teams', organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(*, colleagues(id, name, post))')
        .eq('organization_id', organization!.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Team[]
    }
  })
}

export function useMissions(startDate: string, endDate: string) {
  const { organization } = useAuth()
  return useQuery({
    // We append the date range so it refetches smartly
    queryKey: ['missions', organization?.id, startDate, endDate],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('organization_id', organization!.id)
        .gte('end_date', startDate)
        .lte('start_date', endDate)
      if (error) throw error
      return data as Mission[]
    }
  })
}

// ==== MUTATIONS ====
export function useScheduleMutations() {
  const qc = useQueryClient()
  const { organization } = useAuth()

  const createTeam = useMutation({
    mutationFn: async (payload: { name: string; leader_id?: string; color: string; member_ids: string[] }) => {
      if (!organization) throw new Error("Org error")
      
      // 1. Create Team
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .insert({
          organization_id: organization.id,
          name: payload.name,
          color: payload.color,
          leader_id: payload.leader_id || null
        })
        .select()
        .single()
      if (teamErr) throw teamErr
      
      // 2. Add Members
      if (payload.member_ids.length > 0) {
        const membersData = payload.member_ids.map(colleague_id => ({
          team_id: team.id,
          colleague_id
        }))
        const { error: memErr } = await supabase.from('team_members').insert(membersData)
        if (memErr) throw memErr
      }
      return team
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  })

  const createMission = useMutation({
    mutationFn: async (payload: { title: string; start_date: string; end_date: string; team_id: string; status: string; color: string; description?: string }) => {
      if (!organization) throw new Error("Org error")
      const { error } = await supabase
        .from('missions')
        .insert({
          organization_id: organization.id,
          ...payload
        })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] })
  })

  const updateMission = useMutation({
    mutationFn: async (payload: { id: string, updates: Partial<Mission> }) => {
      const { error } = await supabase.from('missions').update(payload.updates).eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] })
  })

  const deleteMission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('missions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] })
  })

  return { createTeam, createMission, updateMission, deleteMission }
}
