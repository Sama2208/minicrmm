export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_status_history: {
        Row: {
          appointment_id: string
          changed_at: string
          changed_by: string | null
          clinic_id: string
          id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          appointment_id: string
          changed_at?: string
          changed_by?: string | null
          clinic_id: string
          id?: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          appointment_id?: string
          changed_at?: string
          changed_by?: string | null
          clinic_id?: string
          id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          clinic_id: string
          created_at: string
          deleted_at: string | null
          doctor_id: string | null
          ends_at: string
          id: string
          lead_id: string | null
          notes: string | null
          patient_id: string
          reason: string | null
          room_id: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          deleted_at?: string | null
          doctor_id?: string | null
          ends_at: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_id: string
          reason?: string | null
          room_id?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          deleted_at?: string | null
          doctor_id?: string | null
          ends_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_id?: string
          reason?: string | null
          room_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_json: Json | null
          before_json: Json | null
          clinic_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          clinic_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          clinic_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          called_at: string
          clinic_id: string
          id: string
          lead_id: string
          notes: string | null
          operator_name: string
          result: string
        }
        Insert: {
          called_at?: string
          clinic_id: string
          id?: string
          lead_id: string
          notes?: string | null
          operator_name: string
          result: string
        }
        Update: {
          called_at?: string
          clinic_id?: string
          id?: string
          lead_id?: string
          notes?: string | null
          operator_name?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          appointment_id: string
          checked_in_at: string
          checked_in_by: string | null
          clinic_id: string
          id: string
        }
        Insert: {
          appointment_id: string
          checked_in_at?: string
          checked_in_by?: string | null
          clinic_id: string
          id?: string
        }
        Update: {
          appointment_id?: string
          checked_in_at?: string
          checked_in_by?: string | null
          clinic_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          plan_id: string
          primary_color: string
          slug: string
          subscription_current_period_end: string | null
          subscription_notes: string | null
          subscription_status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          plan_id: string
          primary_color?: string
          slug: string
          subscription_current_period_end?: string | null
          subscription_notes?: string | null
          subscription_status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          plan_id?: string
          primary_color?: string
          slug?: string
          subscription_current_period_end?: string | null
          subscription_notes?: string | null
          subscription_status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinics_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_performance_snapshots: {
        Row: {
          appointments_count: number
          clinic_id: string
          completed_count: number
          created_at: string
          doctor_id: string
          id: string
          no_show_count: number
          snapshot_date: string
        }
        Insert: {
          appointments_count?: number
          clinic_id: string
          completed_count?: number
          created_at?: string
          doctor_id: string
          id?: string
          no_show_count?: number
          snapshot_date: string
        }
        Update: {
          appointments_count?: number
          clinic_id?: string
          completed_count?: number
          created_at?: string
          doctor_id?: string
          id?: string
          no_show_count?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_performance_snapshots_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_performance_snapshots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_schedules: {
        Row: {
          clinic_id: string
          created_at: string
          doctor_id: string
          ends_time: string
          id: string
          starts_time: string
          weekday: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          doctor_id: string
          ends_time: string
          id?: string
          starts_time: string
          weekday: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          ends_time?: string
          id?: string
          starts_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_time_off: {
        Row: {
          clinic_id: string
          created_at: string
          doctor_id: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          doctor_id: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_time_off_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_time_off_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          clinic_id: string
          color_tag: string | null
          created_at: string
          deleted_at: string | null
          full_name: string
          id: string
          is_active: boolean
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          clinic_id: string
          color_tag?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          clinic_id?: string
          color_tag?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          recorded_by: string | null
          spent_at: string
        }
        Insert: {
          amount: number
          category: string
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          recorded_by?: string | null
          spent_at?: string
        }
        Update: {
          amount?: number
          category?: string
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          recorded_by?: string | null
          spent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_connections: {
        Row: {
          clinic_id: string
          connected_at: string
          connected_by: string | null
          id: string
          is_active: boolean
          page_access_token: string
          page_id: string
          page_name: string
        }
        Insert: {
          clinic_id: string
          connected_at?: string
          connected_by?: string | null
          id?: string
          is_active?: boolean
          page_access_token: string
          page_id: string
          page_name: string
        }
        Update: {
          clinic_id?: string
          connected_at?: string
          connected_by?: string | null
          id?: string
          is_active?: boolean
          page_access_token?: string
          page_id?: string
          page_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_connections_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_lead_events: {
        Row: {
          clinic_id: string
          form_id: string | null
          id: string
          lead_id: string | null
          leadgen_id: string
          processed_at: string
          raw_payload: Json | null
        }
        Insert: {
          clinic_id: string
          form_id?: string | null
          id?: string
          lead_id?: string | null
          leadgen_id: string
          processed_at?: string
          raw_payload?: Json | null
        }
        Update: {
          clinic_id?: string
          form_id?: string | null
          id?: string
          lead_id?: string | null
          leadgen_id?: string
          processed_at?: string
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_lead_events_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_lead_forms: {
        Row: {
          clinic_id: string
          connection_id: string
          created_at: string
          form_id: string
          form_name: string
          id: string
          is_syncing: boolean
        }
        Insert: {
          clinic_id: string
          connection_id: string
          created_at?: string
          form_id: string
          form_name: string
          id?: string
          is_syncing?: boolean
        }
        Update: {
          clinic_id?: string
          connection_id?: string
          created_at?: string
          form_id?: string
          form_name?: string
          id?: string
          is_syncing?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "facebook_lead_forms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_lead_forms_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "facebook_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_oauth_sessions: {
        Row: {
          clinic_id: string
          created_at: string
          expires_at: string
          pages: Json | null
          state: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          expires_at?: string
          pages?: Json | null
          state: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          expires_at?: string
          pages?: Json | null
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_oauth_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          approved_amount: number | null
          claimed_amount: number
          clinic_id: string
          id: string
          insurer_name: string
          invoice_id: string
          status: string
          submitted_at: string
        }
        Insert: {
          approved_amount?: number | null
          claimed_amount: number
          clinic_id: string
          id?: string
          insurer_name: string
          invoice_id: string
          status?: string
          submitted_at?: string
        }
        Update: {
          approved_amount?: number | null
          claimed_amount?: number
          clinic_id?: string
          id?: string
          insurer_name?: string
          invoice_id?: string
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          amount: number
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          created_at: string
          currency: string
          discount: number
          id: string
          invoice_number: string
          issued_at: string
          issued_by: string | null
          patient_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          clinic_id: string
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          invoice_number: string
          issued_at?: string
          issued_by?: string | null
          patient_id: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          issued_by?: string | null
          patient_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_history: {
        Row: {
          changed_at: string
          clinic_id: string
          id: string
          lead_id: string
          new_assigned_to: string | null
          old_assigned_to: string | null
        }
        Insert: {
          changed_at?: string
          clinic_id: string
          id?: string
          lead_id: string
          new_assigned_to?: string | null
          old_assigned_to?: string | null
        }
        Update: {
          changed_at?: string
          clinic_id?: string
          id?: string
          lead_id?: string
          new_assigned_to?: string | null
          old_assigned_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_new_assigned_to_fkey"
            columns: ["new_assigned_to"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_old_assigned_to_fkey"
            columns: ["old_assigned_to"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          clinic_id: string
          id: string
          lead_id: string | null
          new_status: Database["public"]["Enums"]["lead_status"]
          old_status: Database["public"]["Enums"]["lead_status"] | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          clinic_id: string
          id?: string
          lead_id?: string | null
          new_status: Database["public"]["Enums"]["lead_status"]
          old_status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          clinic_id?: string
          id?: string
          lead_id?: string | null
          new_status?: Database["public"]["Enums"]["lead_status"]
          old_status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          assigned_to: string | null
          campaign_name: string | null
          can_visit_clinic: Database["public"]["Enums"]["clinic_visit"] | null
          clinic_id: string
          created_at: string | null
          full_name: string
          id: string
          last_contact_at: string | null
          next_followup_date: string | null
          nomer_asosiy: string | null
          notes: string | null
          phone: string | null
          problem_type: string | null
          region: string | null
          source: Database["public"]["Enums"]["lead_source"]
          source_detail: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          assigned_to?: string | null
          campaign_name?: string | null
          can_visit_clinic?: Database["public"]["Enums"]["clinic_visit"] | null
          clinic_id: string
          created_at?: string | null
          full_name: string
          id?: string
          last_contact_at?: string | null
          next_followup_date?: string | null
          nomer_asosiy?: string | null
          notes?: string | null
          phone?: string | null
          problem_type?: string | null
          region?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          assigned_to?: string | null
          campaign_name?: string | null
          can_visit_clinic?: Database["public"]["Enums"]["clinic_visit"] | null
          clinic_id?: string
          created_at?: string | null
          full_name?: string
          id?: string
          last_contact_at?: string | null
          next_followup_date?: string | null
          nomer_asosiy?: string | null
          notes?: string | null
          phone?: string | null
          problem_type?: string | null
          region?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          direction: string
          entry_type: string
          id: string
          reference_id: string
        }
        Insert: {
          amount: number
          clinic_id: string
          created_at?: string
          direction: string
          entry_type: string
          id?: string
          reference_id: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          direction?: string
          entry_type?: string
          id?: string
          reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_rr_counter: {
        Row: {
          clinic_id: string
          counter: number
          id: number
        }
        Insert: {
          clinic_id: string
          counter?: number
          id?: number
        }
        Update: {
          clinic_id?: string
          counter?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "operator_rr_counter_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          clinic_id: string
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          telegram_chat_id: string | null
          user_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          telegram_chat_id?: string | null
          user_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          telegram_chat_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          clinic_id: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          patient_id: string
          uploaded_by: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          patient_id: string
          uploaded_by?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          patient_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_merges: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          kept_patient_id: string
          merged_by: string | null
          merged_patient_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          kept_patient_id: string
          merged_by?: string | null
          merged_patient_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          kept_patient_id?: string
          merged_by?: string | null
          merged_patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_merges_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_merges_kept_patient_id_fkey"
            columns: ["kept_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_merges_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_merges_merged_patient_id_fkey"
            columns: ["merged_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notes: {
        Row: {
          author_id: string | null
          clinic_id: string
          created_at: string
          id: string
          note: string
          patient_id: string
        }
        Insert: {
          author_id?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          note: string
          patient_id: string
        }
        Update: {
          author_id?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          note?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string | null
          clinic_id: string
          created_at: string
          deleted_at: string | null
          full_name: string
          gender: string | null
          id: string
          mrn: string
          notes: string | null
          phone: string | null
          region: string | null
          source_lead_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          clinic_id: string
          created_at?: string
          deleted_at?: string | null
          full_name: string
          gender?: string | null
          id?: string
          mrn: string
          notes?: string | null
          phone?: string | null
          region?: string | null
          source_lead_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          clinic_id?: string
          created_at?: string
          deleted_at?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          mrn?: string
          notes?: string | null
          phone?: string | null
          region?: string | null
          source_lead_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          clinic_id: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          paid_at: string
          recorded_by: string | null
          voided: boolean
        }
        Insert: {
          amount: number
          clinic_id: string
          id?: string
          invoice_id: string
          method: string
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          voided?: boolean
        }
        Update: {
          amount?: number
          clinic_id?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_operators: number | null
          name: string
          price_monthly: number
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_operators?: number | null
          name: string
          price_monthly?: number
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_operators?: number | null
          name?: string
          price_monthly?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          clinic_id: string
          id: string
          payment_id: string
          reason: string | null
          refunded_at: string
          refunded_by: string | null
        }
        Insert: {
          amount: number
          clinic_id: string
          id?: string
          payment_id: string
          reason?: string | null
          refunded_at?: string
          refunded_by?: string | null
        }
        Update: {
          amount?: number
          clinic_id?: string
          id?: string
          payment_id?: string
          reason?: string | null
          refunded_at?: string
          refunded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          clinic_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          clinic_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string | null
        }
        Insert: {
          clinic_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Update: {
          clinic_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_v2: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_v2_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_v2_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          clinic_id: string
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clinic_id: string
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          last_login_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clinic_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          lead_id: string | null
          patient_id: string | null
          reason: string | null
          requested_date: string | null
          status: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          lead_id?: string | null
          patient_id?: string | null
          reason?: string | null
          requested_date?: string | null
          status?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          patient_id?: string | null
          reason?: string | null
          requested_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_daily_leads: {
        Row: {
          day: string | null
          source: Database["public"]["Enums"]["lead_source"] | null
          total: number | null
        }
        Relationships: []
      }
      v_funnel_summary: {
        Row: {
          status: Database["public"]["Enums"]["lead_status"] | null
          total: number | null
        }
        Relationships: []
      }
      v_operator_summary: {
        Row: {
          conversion_rate: number | null
          converted: number | null
          full_name: string | null
          total_leads: number | null
        }
        Relationships: []
      }
      v_source_summary: {
        Row: {
          converted: number | null
          source: Database["public"]["Enums"]["lead_source"] | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      book_appointment: {
        Args: {
          p_doctor_id: string
          p_ends_at: string
          p_patient_id: string
          p_reason?: string
          p_room_id: string
          p_starts_at: string
        }
        Returns: string
      }
      check_in: { Args: { p_appointment_id: string }; Returns: undefined }
      convert_lead: { Args: { p_lead_id: string }; Returns: string }
      current_clinic_id: { Args: never; Returns: string }
      current_operator_id: { Args: never; Returns: string }
      current_user_is_admin: { Args: never; Returns: boolean }
      doctor_busy_slots: {
        Args: { p_date: string; p_doctor_id: string }
        Returns: {
          ends_at: string
          source: string
          starts_at: string
        }[]
      }
      generate_invoice_number: {
        Args: { p_clinic_id: string }
        Returns: string
      }
      generate_mrn: { Args: { p_clinic_id: string }; Returns: string }
      get_next_operator:
        | { Args: never; Returns: string }
        | { Args: { p_clinic_id: string }; Returns: string }
      has_permission: { Args: { p_code: string }; Returns: boolean }
      has_role:
        | { Args: { _role: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_platform_admin: { Args: never; Returns: boolean }
      issue_invoice: {
        Args: {
          p_appointment_id: string
          p_discount?: number
          p_items: Json
          p_patient_id: string
        }
        Returns: string
      }
      my_clinic_status: {
        Args: never
        Returns: {
          clinic_id: string
          clinic_name: string
          is_active: boolean
          logo_url: string
          plan_name: string
          primary_color: string
          subscription_current_period_end: string
          subscription_status: string
        }[]
      }
      record_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_method: string
          p_notes?: string
        }
        Returns: string
      }
      refund_payment: {
        Args: { p_amount: number; p_payment_id: string; p_reason: string }
        Returns: string
      }
      void_invoice: {
        Args: { p_invoice_id: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "operator"
      clinic_visit: "ha" | "yoq" | "bilmayman"
      lead_source:
        | "facebook"
        | "instagram"
        | "website"
        | "boshqa"
        | "telegram"
        | "friends"
      lead_status:
        | "yangi"
        | "kotarmadi"
        | "qayta_qongiroq"
        | "konsultatsiyaga_yozildi"
        | "konsultatsiyada_boldi"
        | "yotishga_yozildi"
        | "sifatsiz_lid"
        | "qatnovchi"
        | "maslahat"
        | "qatnashga_yozildi"
        | "yotdi"
        | "qatnadi"
        | "new"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operator"],
      clinic_visit: ["ha", "yoq", "bilmayman"],
      lead_source: [
        "facebook",
        "instagram",
        "website",
        "boshqa",
        "telegram",
        "friends",
      ],
      lead_status: [
        "yangi",
        "kotarmadi",
        "qayta_qongiroq",
        "konsultatsiyaga_yozildi",
        "konsultatsiyada_boldi",
        "yotishga_yozildi",
        "sifatsiz_lid",
        "qatnovchi",
        "maslahat",
        "qatnashga_yozildi",
        "yotdi",
        "qatnadi",
        "new",
      ],
    },
  },
} as const
