import type { Database } from './database'

export type Meeting = Database['public']['Tables']['meetings']['Row']
export type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
export type MeetingUpdate = Database['public']['Tables']['meetings']['Update']

export type ActionItem = Database['public']['Tables']['action_items']['Row']
export type ActionItemInsert = Database['public']['Tables']['action_items']['Insert']
export type ActionItemUpdate = Database['public']['Tables']['action_items']['Update']

export type AgendaItem = Database['public']['Tables']['agenda_items']['Row']
export type AgendaItemInsert = Database['public']['Tables']['agenda_items']['Insert']

export type Colleague = Database['public']['Tables']['colleagues']['Row']
export type ColleagueInsert = Database['public']['Tables']['colleagues']['Insert']

export type PreMeetingNote = Database['public']['Tables']['pre_meeting_notes']['Row']
export type PreMeetingNoteInsert = Database['public']['Tables']['pre_meeting_notes']['Insert']

export type ConsumableRequest = Database['public']['Tables']['consumable_requests']['Row']
export type ConsumableRequestInsert = Database['public']['Tables']['consumable_requests']['Insert']

export type TeamMood = Database['public']['Tables']['team_mood']['Row']
export type TeamMoodInsert = Database['public']['Tables']['team_mood']['Insert']

export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']

export type VehicleInspection = Database['public']['Tables']['vehicle_inspections']['Row']
export type VehicleInspectionInsert = Database['public']['Tables']['vehicle_inspections']['Insert']

export type WeeklySchedule = Database['public']['Tables']['weekly_schedules']['Row']
export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row']

export type InspectionStatus = 'pending' | 'completed' | 'overdue' | 'failed_reinspection'
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface MeetingWithColleagues extends Meeting {
  colleaguesList?: Colleague[]
  action_items?: ActionItem[]
  agenda_items?: AgendaItem[]
}

export interface DashboardStats {
  meetingsThisMonth: number
  meetingsLastMonth: number
  openActions: number
  lateActions: number
  completionRate: number
  upcomingInspections: number
  expiredInspections: number
  avgMoodScore: number | null
  pendingConsumables: number
}
