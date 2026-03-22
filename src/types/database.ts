export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type InspectionStatus = 'pending' | 'completed' | 'overdue' | 'failed_reinspection'
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type AgendaItemStatus = 'pending' | 'in_progress' | 'discussed' | 'skipped'
export type LeaveType = 'conges_payes' | 'rtt' | 'maladie' | 'formation' | 'autre'

export interface Database {
  public: {
    Tables: {
      colleagues: {
        Row: {
          id: string
          created_at: string
          name: string
          post: string
        }
        Insert: Omit<Database['public']['Tables']['colleagues']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['colleagues']['Insert']>
      }
      meetings: {
        Row: {
          id: string
          created_at: string
          created_by_user_id: string | null
          title: string
          description: string | null
          date: string
          colleagues_ids: string[] | null
          successes: string[]
          failures: string[]
          sensitive_points: string[]
          relational_points: string[]
        }
        Insert: Omit<Database['public']['Tables']['meetings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['meetings']['Insert']>
      }
      action_items: {
        Row: {
          id: string
          created_at: string
          description: string
          assigned_to_colleague_id: string | null
          due_date: string | null
          status: ActionStatus
          meeting_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['action_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['action_items']['Insert']>
      }
      agenda_items: {
        Row: {
          id: string
          created_at: string
          meeting_id: string
          title: string
          description: string | null
          estimated_duration_minutes: number | null
          responsible_colleague_id: string | null
          order: number
          status: AgendaItemStatus
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['agenda_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['agenda_items']['Insert']>
      }
      consumable_requests: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          item_name: string
          details: string | null
          quantity: number
          requested_by_colleague_id: string | null
          status: string
        }
        Insert: Omit<Database['public']['Tables']['consumable_requests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['consumable_requests']['Insert']>
      }
      pre_meeting_notes: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          content: string | null
          for_meeting_date: string | null
          is_archived: boolean
        }
        Insert: Omit<Database['public']['Tables']['pre_meeting_notes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pre_meeting_notes']['Insert']>
      }
      team_mood: {
        Row: {
          id: string
          created_at: string
          user_id: string
          mood_score: number
          comment: string | null
        }
        Insert: Omit<Database['public']['Tables']['team_mood']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['team_mood']['Insert']>
      }
      vehicles: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          name: string
          type: string
          make: string | null
          model: string | null
          license_plate: string | null
          year: number | null
          current_mileage: number | null
        }
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>
      }
      vehicle_inspections: {
        Row: {
          id: string
          created_at: string
          vehicle_id: string
          inspection_type: string
          due_date: string
          last_inspection_date: string | null
          status: InspectionStatus
          notes: string | null
          recurrence_interval_value: number | null
          recurrence_interval_unit: 'years' | 'months' | 'days' | null
          reinspection_required: boolean
          reinspection_due_date: string | null
        }
        Insert: Omit<Database['public']['Tables']['vehicle_inspections']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['vehicle_inspections']['Insert']>
      }
      leave_requests: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          colleague_id: string | null
          leave_type: string
          start_date: string
          end_date: string
          start_time: string | null
          end_time: string | null
          duration_hours: number | null
          notes: string | null
          status: string
        }
        Insert: Omit<Database['public']['Tables']['leave_requests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['leave_requests']['Insert']>
      }
      weekly_schedules: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          week_start_date: string
          in_charge_colleague_id: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['weekly_schedules']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['weekly_schedules']['Insert']>
      }
    }
  }
}
