import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import { startOfMonth, endOfMonth, subMonths, isAfter, isBefore, addDays } from 'date-fns'
import type { DashboardStats } from '../../types/app'

export function useDashboardStats() {
  return useQuery({
    queryKey: QK.DASHBOARD,
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date()
      const monthStart = startOfMonth(now).toISOString()
      const monthEnd = endOfMonth(now).toISOString()
      const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
      const prevMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

      const [meetings, prevMeetings, actions, inspections, mood, consumables] = await Promise.all([
        supabase.from('meetings').select('id', { count: 'exact' }).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('meetings').select('id', { count: 'exact' }).gte('date', prevMonthStart).lte('date', prevMonthEnd),
        supabase.from('action_items').select('id, status, due_date'),
        supabase.from('vehicle_inspections').select('id, due_date, status'),
        supabase.from('team_mood').select('mood_score').order('created_at', { ascending: false }).limit(10),
        supabase.from('consumable_requests').select('id, status').eq('status', 'pending'),
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
