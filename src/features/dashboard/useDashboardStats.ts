import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import { startOfMonth, endOfMonth, subMonths, isAfter, isBefore, addDays } from 'date-fns'
import type { DashboardStats } from '../../types/app'
import { useAuth } from '../auth/useAuth'

export function useDashboardStats() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: [QK.DASHBOARD, organization?.id],
    enabled: !!organization?.id,
    queryFn: async (): Promise<DashboardStats> => {
      const orgId = organization!.id
      const now = new Date()
      const monthStart = startOfMonth(now).toISOString()
      const monthEnd = endOfMonth(now).toISOString()
      const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
      const prevMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

      const [meetings, prevMeetings, actions, inspections, mood, consumables] = await Promise.all([
        supabase.from('meetings').select('id', { count: 'exact' }).gte('date', monthStart).lte('date', monthEnd).eq('organization_id', orgId),
        supabase.from('meetings').select('id', { count: 'exact' }).gte('date', prevMonthStart).lte('date', prevMonthEnd).eq('organization_id', orgId),
        supabase.from('action_items').select('id, status, due_date').eq('organization_id', orgId),
        supabase.from('vehicle_inspections').select('id, due_date, status, vehicles!inner(organization_id)').eq('vehicles.organization_id', orgId),
        supabase.from('team_mood').select('mood_score').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(10),
        supabase.from('consumable_requests').select('id, status').eq('organization_id', orgId).eq('status', 'pending'),
      ])

      const allActions = actions.data ?? []
      const openActions = allActions.filter(a => a.status !== 'completed' && a.status !== 'cancelled')
      const lateActions = openActions.filter(a => a.due_date && isBefore(new Date(a.due_date), now))
      const completedActions = allActions.filter(a => a.status === 'completed')
      const completionRate = allActions.length > 0 ? Math.round((completedActions.length / allActions.length) * 100) : 0

      const allInspections = inspections.data ?? []
      const upcomingInspections = allInspections.filter(i =>
        i.status !== 'overdue' && i.due_date && isAfter(new Date(i.due_date), now) && isBefore(new Date(i.due_date), addDays(now, 60))
      )
      const expiredInspections = allInspections.filter(i => i.status === 'overdue')

      const moodScores = mood.data?.map(m => m.mood_score) ?? []
      const avgMoodScore = moodScores.length > 0
        ? Math.round((moodScores.reduce((a, b) => a + b, 0) / moodScores.length) * 10) / 10
        : null

      return {
        meetingsThisMonth: meetings.count ?? 0,
        meetingsLastMonth: prevMeetings.count ?? 0,
        openActions: openActions.length,
        lateActions: lateActions.length,
        completionRate,
        upcomingInspections: upcomingInspections.length,
        expiredInspections: expiredInspections.length,
        avgMoodScore,
        pendingConsumables: consumables.data?.length ?? 0,
      }
    },
    staleTime: 1000 * 60 * 2,
  })
}
