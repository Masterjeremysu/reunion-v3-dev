export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AppRole = 'admin' | 'manager' | 'employee'
export type InspectionStatus = 'pending' | 'completed' | 'overdue' | 'failed_reinspection'
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type AgendaItemStatus = 'pending' | 'in_progress' | 'discussed' | 'skipped'
export type LeaveType = 'conges_payes' | 'rtt' | 'maladie' | 'formation' | 'autre'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {

          id: string
          name: string
          created_at: string
          owner_id: string | null
          settings: any | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          owner_id?: string | null
          settings?: any | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          owner_id?: string | null
          settings?: any | null
        }
      }
      user_roles: {
        Row: {

          id: string
          user_id: string
          organization_id: string
          role: AppRole
          created_at: string
        
        }
        Insert: {
          id?: string
          user_id?: string
          organization_id: string
          role: AppRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: AppRole
          created_at?: string
        }
      }
      colleagues: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          name: string
          post: string
          is_active: boolean
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          name: string
          post: string
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          name?: string
          post?: string
          is_active?: boolean
        }
      }
      meetings: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          created_by_user_id: string | null
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
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          created_by_user_id?: string | null
          title: string
          description?: string | null
          date: string
          colleagues_ids?: string[] | null
          successes: string[]
          failures: string[]
          sensitive_points: string[]
          relational_points: string[]
          sse: string[]
          improvements: string[]
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          created_by_user_id?: string | null
          title?: string
          description?: string | null
          date?: string
          colleagues_ids?: string[] | null
          successes?: string[]
          failures?: string[]
          sensitive_points?: string[]
          relational_points?: string[]
          sse?: string[]
          improvements?: string[]
        }
      }
      action_items: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          description: string
          assigned_to_colleague_id: string | null
          due_date: string | null
          status: ActionStatus
          meeting_id: string | null
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          description: string
          assigned_to_colleague_id?: string | null
          due_date?: string | null
          status?: ActionStatus
          meeting_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          description?: string
          assigned_to_colleague_id?: string | null
          due_date?: string | null
          status?: ActionStatus
          meeting_id?: string | null
        }
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
        Insert: {
          id?: string
          created_at?: string
          meeting_id: string
          title: string
          description?: string | null
          estimated_duration_minutes?: number | null
          responsible_colleague_id?: string | null
          order: number
          status: AgendaItemStatus
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          meeting_id?: string
          title?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          responsible_colleague_id?: string | null
          order?: number
          status?: AgendaItemStatus
          notes?: string | null
        }
      }
      consumable_requests: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          user_id: string | null
          item_name: string
          details: string | null
          quantity: number
          requested_by_colleague_id: string | null
          status: string
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          user_id?: string | null
          item_name: string
          details?: string | null
          quantity: number
          requested_by_colleague_id?: string | null
          status: string
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          user_id?: string | null
          item_name?: string
          details?: string | null
          quantity?: number
          requested_by_colleague_id?: string | null
          status?: string
        }
      }
      pre_meeting_notes: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          user_id: string
          title: string
          content: string | null
          for_meeting_date: string | null
          is_archived: boolean
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          user_id?: string
          title: string
          content?: string | null
          for_meeting_date?: string | null
          is_archived: boolean
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          user_id?: string
          title?: string
          content?: string | null
          for_meeting_date?: string | null
          is_archived?: boolean
        }
      }
      team_mood: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          user_id: string
          mood_score: number
          comment: string | null
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          user_id?: string
          mood_score: number
          comment?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          user_id?: string
          mood_score?: number
          comment?: string | null
        }
      }
      vehicles: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          user_id: string | null
          name: string
          type: string
          make: string | null
          model: string | null
          license_plate: string | null
          year: number | null
          current_mileage: number | null
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          user_id?: string | null
          name: string
          type: string
          make?: string | null
          model?: string | null
          license_plate?: string | null
          year?: number | null
          current_mileage?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          user_id?: string | null
          name?: string
          type?: string
          make?: string | null
          model?: string | null
          license_plate?: string | null
          year?: number | null
          current_mileage?: number | null
        }
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
        Insert: {
          id?: string
          created_at?: string
          vehicle_id: string
          inspection_type: string
          due_date: string
          last_inspection_date?: string | null
          status: InspectionStatus
          notes?: string | null
          recurrence_interval_value?: number | null
          recurrence_interval_unit?: 'years' | 'months' | 'days' | null
          reinspection_required: boolean
          reinspection_due_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          vehicle_id?: string
          inspection_type?: string
          due_date?: string
          last_inspection_date?: string | null
          status?: InspectionStatus
          notes?: string | null
          recurrence_interval_value?: number | null
          recurrence_interval_unit?: 'years' | 'months' | 'days' | null
          reinspection_required?: boolean
          reinspection_due_date?: string | null
        }
      }
      leave_requests: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          user_id: string | null
          colleague_id: string | null
          leave_type: string
          start_date: string
          end_date: string
          start_time: string | null
          end_time: string | null
          duration_hours: number | null
          duration_days: number | null
          notes: string | null
          reason: string | null
          status: string
          is_half_day: boolean
          half_day_period: string | null
          has_document: boolean
          rejection_reason: string | null
          approved_at: string | null
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          user_id?: string | null
          colleague_id?: string | null
          leave_type: string
          start_date: string
          end_date: string
          start_time?: string | null
          end_time?: string | null
          duration_hours?: number | null
          duration_days?: number | null
          notes?: string | null
          reason?: string | null
          status: string
          is_half_day?: boolean
          half_day_period?: string | null
          has_document?: boolean
          rejection_reason?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          user_id?: string | null
          colleague_id?: string | null
          leave_type?: string
          start_date?: string
          end_date?: string
          start_time?: string | null
          end_time?: string | null
          duration_hours?: number | null
          duration_days?: number | null
          notes?: string | null
          reason?: string | null
          status?: string
          is_half_day?: boolean
          half_day_period?: string | null
          has_document?: boolean
          rejection_reason?: string | null
          approved_at?: string | null
        }
      }
      weekly_schedules: {
        Row: {

          id: string
          created_at: string
          organization_id: string
          user_id: string | null
          week_start_date: string
          in_charge_colleague_id: string | null
          notes: string | null
        
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          user_id?: string | null
          week_start_date: string
          in_charge_colleague_id?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          user_id?: string | null
          week_start_date?: string
          in_charge_colleague_id?: string | null
          notes?: string | null
        }
      }
      leave_balances: {
        Row: {
          id: string
          created_at: string
          organization_id: string
          colleague_id: string
          year: number
          cp_total: number
          cp_taken: number
          cp_pending: number
          rtt_total: number
          rtt_taken: number
        }
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          colleague_id: string
          year: number
          cp_total?: number
          cp_taken?: number
          cp_pending?: number
          rtt_total?: number
          rtt_taken?: number
        }
        Update: {
          id?: string
          created_at?: string
          organization_id?: string
          colleague_id?: string
          year?: number
          cp_total?: number
          cp_taken?: number
          cp_pending?: number
          rtt_total?: number
          rtt_taken?: number
        }
      }
      cr_items: {
        Row: {
          id: string
          created_at: string
          meeting_id: string
          category: string
          content: string
          colleague_id: string | null
          order_index: number
        }
        Insert: {
          id?: string
          created_at?: string
          meeting_id: string
          category: string
          content: string
          colleague_id?: string | null
          order_index: number
        }
        Update: {
          id?: string
          created_at?: string
          meeting_id?: string
          category?: string
          content?: string
          colleague_id?: string | null
          order_index?: number
        }
      }
    }
  }
}
