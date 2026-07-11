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
          patient_id: string | null
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
          patient_id?: string | null
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
          patient_id?: string | null
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
      patients: {
        Row: {
          id: string
          clinic_id: string
          mrn: string
          full_name: string
          birth_date: string | null
          gender: string | null
          phone: string | null
          phone2: string | null
          email: string | null
          address: string | null
          region: string | null
          blood_type: string | null
          allergies: string | null
          notes: string | null
          source: string | null
          lead_id: string | null
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          mrn: string
          full_name: string
          birth_date?: string | null
          gender?: string | null
          phone?: string | null
          phone2?: string | null
          email?: string | null
          address?: string | null
          region?: string | null
          blood_type?: string | null
          allergies?: string | null
          notes?: string | null
          source?: string | null
          lead_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          mrn?: string
          full_name?: string
          birth_date?: string | null
          gender?: string | null
          phone?: string | null
          phone2?: string | null
          email?: string | null
          address?: string | null
          region?: string | null
          blood_type?: string | null
          allergies?: string | null
          notes?: string | null
          source?: string | null
          lead_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          doctor_id: string | null
          room_id: string | null
          scheduled_at: string
          duration_min: number
          end_at: string
          status: string
          visit_type: string
          reason: string | null
          notes: string | null
          source: string | null
          lead_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id?: string | null
          room_id?: string | null
          scheduled_at: string
          duration_min?: number
          status?: string
          visit_type?: string
          reason?: string | null
          notes?: string | null
          source?: string | null
          lead_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          doctor_id?: string | null
          room_id?: string | null
          scheduled_at?: string
          duration_min?: number
          status?: string
          visit_type?: string
          reason?: string | null
          notes?: string | null
          source?: string | null
          lead_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
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
      rooms: {
        Row: {
          id: string
          clinic_id: string
          name: string
          type: string
          floor: string | null
          capacity: number
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          type?: string
          floor?: string | null
          capacity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          type?: string
          floor?: string | null
          capacity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
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
      check_ins: {
        Row: {
          id: string
          clinic_id: string
          appointment_id: string | null
          patient_id: string
          checked_in_at: string
          checked_in_by: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          appointment_id?: string | null
          patient_id: string
          checked_in_at?: string
          checked_in_by?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          appointment_id?: string | null
          patient_id?: string
          checked_in_at?: string
          checked_in_by?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          id: string
          clinic_id: string
          user_id: string | null
          full_name: string
          specialty: string
          license_number: string | null
          phone: string | null
          email: string | null
          bio: string | null
          avatar_url: string | null
          consultation_duration_min: number
          consultation_fee: number
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          user_id?: string | null
          full_name: string
          specialty: string
          license_number?: string | null
          phone?: string | null
          email?: string | null
          bio?: string | null
          avatar_url?: string | null
          consultation_duration_min?: number
          consultation_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          user_id?: string | null
          full_name?: string
          specialty?: string
          license_number?: string | null
          phone?: string | null
          email?: string | null
          bio?: string | null
          avatar_url?: string | null
          consultation_duration_min?: number
          consultation_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
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
      doctor_schedules: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          room_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          room_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          room_id?: string | null
          is_active?: boolean
          created_at?: string
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
          {
            foreignKeyName: "doctor_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_time_off: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          start_date: string
          end_date: string
          reason: string
          notes: string | null
          approved_by: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          start_date: string
          end_date: string
          reason?: string
          notes?: string | null
          approved_by?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          start_date?: string
          end_date?: string
          reason?: string
          notes?: string | null
          approved_by?: string | null
          status?: string
          created_at?: string
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
          {
            foreignKeyName: "doctor_time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          doctor_id: string | null
          priority: number
          reason: string | null
          status: string
          added_at: string
          called_at: string | null
          seen_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id?: string | null
          priority?: number
          reason?: string | null
          status?: string
          added_at?: string
          called_at?: string | null
          seen_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          doctor_id?: string | null
          priority?: number
          reason?: string | null
          status?: string
          added_at?: string
          called_at?: string | null
          seen_at?: string | null
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
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          id: string
          clinic_id: string
          name: string
          code: string | null
          category: string
          price: number
          duration_min: number | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          code?: string | null
          category?: string
          price?: number
          duration_min?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          code?: string | null
          category?: string
          price?: number
          duration_min?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          clinic_id: string
          invoice_number: string
          patient_id: string
          doctor_id: string | null
          appointment_id: string | null
          status: string
          subtotal: number
          discount: number
          tax: number
          total: number
          paid_amount: number
          notes: string | null
          due_date: string | null
          issued_at: string
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          invoice_number: string
          patient_id: string
          doctor_id?: string | null
          appointment_id?: string | null
          status?: string
          subtotal?: number
          discount?: number
          tax?: number
          total?: number
          paid_amount?: number
          notes?: string | null
          due_date?: string | null
          issued_at?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          invoice_number?: string
          patient_id?: string
          doctor_id?: string | null
          appointment_id?: string | null
          status?: string
          subtotal?: number
          discount?: number
          tax?: number
          total?: number
          paid_amount?: number
          notes?: string | null
          due_date?: string | null
          issued_at?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
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
            foreignKeyName: "invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          service_id: string | null
          description: string
          quantity: number
          unit_price: number
          discount: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          service_id?: string | null
          description: string
          quantity?: number
          unit_price?: number
          discount?: number
          total?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          service_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
          discount?: number
          total?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id: string
          clinic_id: string
          invoice_id: string
          patient_id: string
          amount: number
          payment_method: string
          reference: string | null
          notes: string | null
          received_by: string | null
          paid_at: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          invoice_id: string
          patient_id: string
          amount: number
          payment_method?: string
          reference?: string | null
          notes?: string | null
          received_by?: string | null
          paid_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          invoice_id?: string
          patient_id?: string
          amount?: number
          payment_method?: string
          reference?: string | null
          notes?: string | null
          received_by?: string | null
          paid_at?: string
          created_at?: string
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
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          id: string
          clinic_id: string
          category: string
          description: string
          amount: number
          expense_date: string
          vendor: string | null
          receipt_url: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          category?: string
          description: string
          amount: number
          expense_date?: string
          vendor?: string | null
          receipt_url?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          category?: string
          description?: string
          amount?: number
          expense_date?: string
          vendor?: string | null
          receipt_url?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          id: string
          clinic_id: string
          name: string
          code: string | null
          category: string
          price: number
          turnaround_hours: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          code?: string | null
          category?: string
          price?: number
          turnaround_hours?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          code?: string | null
          category?: string
          price?: number
          turnaround_hours?: number | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          doctor_id: string | null
          appointment_id: string | null
          order_number: string
          status: string
          priority: string
          notes: string | null
          ordered_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id?: string | null
          appointment_id?: string | null
          order_number: string
          status?: string
          priority?: string
          notes?: string | null
          ordered_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          doctor_id?: string | null
          appointment_id?: string | null
          order_number?: string
          status?: string
          priority?: string
          notes?: string | null
          ordered_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          id: string
          order_id: string
          test_id: string | null
          test_name: string
          result_value: string | null
          unit: string | null
          ref_range: string | null
          is_abnormal: boolean | null
          notes: string | null
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          test_id?: string | null
          test_name: string
          result_value?: string | null
          unit?: string | null
          ref_range?: string | null
          is_abnormal?: boolean | null
          notes?: string | null
          performed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          test_id?: string | null
          test_name?: string
          result_value?: string | null
          unit?: string | null
          ref_range?: string | null
          is_abnormal?: boolean | null
          notes?: string | null
          performed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      radiology_orders: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          doctor_id: string | null
          order_number: string
          modality: string
          body_part: string
          status: string
          priority: string
          findings: string | null
          impression: string | null
          performed_by: string | null
          reported_by: string | null
          notes: string | null
          ordered_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id?: string | null
          order_number: string
          modality: string
          body_part: string
          status?: string
          priority?: string
          findings?: string | null
          impression?: string | null
          performed_by?: string | null
          reported_by?: string | null
          notes?: string | null
          ordered_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          doctor_id?: string | null
          order_number?: string
          modality?: string
          body_part?: string
          status?: string
          priority?: string
          findings?: string | null
          impression?: string | null
          performed_by?: string | null
          reported_by?: string | null
          notes?: string | null
          ordered_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radiology_orders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          id: string
          clinic_id: string
          name: string
          generic_name: string | null
          form: string
          strength: string | null
          unit: string | null
          price: number
          stock_qty: number
          min_stock: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          generic_name?: string | null
          form?: string
          strength?: string | null
          unit?: string | null
          price?: number
          stock_qty?: number
          min_stock?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          generic_name?: string | null
          form?: string
          strength?: string | null
          unit?: string | null
          price?: number
          stock_qty?: number
          min_stock?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          appointment_id: string | null
          status: string
          notes: string | null
          prescribed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          appointment_id?: string | null
          status?: string
          notes?: string | null
          prescribed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          doctor_id?: string
          appointment_id?: string | null
          status?: string
          notes?: string | null
          prescribed_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          id: string
          prescription_id: string
          medication_id: string | null
          medication_name: string
          dosage: string
          frequency: string
          duration: string | null
          quantity: number
          instructions: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prescription_id: string
          medication_id?: string | null
          medication_name: string
          dosage: string
          frequency: string
          duration?: string | null
          quantity?: number
          instructions?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prescription_id?: string
          medication_id?: string | null
          medication_name?: string
          dosage?: string
          frequency?: string
          duration?: string | null
          quantity?: number
          instructions?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          clinic_id: string | null
          actor_user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before_json: Json | null
          after_json: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id?: string | null
          actor_user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          before_json?: Json | null
          after_json?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string | null
          actor_user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          before_json?: Json | null
          after_json?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          id: string
          code: string
          module: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          module: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          module?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
        }
        Update: {
          id?: string
          role_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          clinic_id: string | null
          name: string
          is_system: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clinic_id?: string | null
          name: string
          is_system?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string | null
          name?: string
          is_system?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
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
      user_roles_v2: {
        Row: {
          id: string
          clinic_id: string
          user_id: string
          role_id: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          user_id: string
          role_id: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          user_id?: string
          role_id?: string
          created_at?: string
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
            foreignKeyName: "user_roles_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_v2_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          clinic_id: string
          email: string
          full_name: string
          avatar_url: string | null
          phone: string | null
          status: string
          last_login_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          clinic_id: string
          email: string
          full_name: string
          avatar_url?: string | null
          phone?: string | null
          status?: string
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          phone?: string | null
          status?: string
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
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
      current_clinic_id: { Args: never; Returns: string }
      current_operator_id: { Args: never; Returns: string }
      current_user_is_admin: { Args: never; Returns: boolean }
      has_permission: { Args: { p_code: string }; Returns: boolean }
      generate_mrn: { Args: { p_clinic_id: string }; Returns: string }
      book_appointment: {
        Args: {
          p_clinic_id: string
          p_patient_id: string
          p_doctor_id?: string
          p_room_id?: string
          p_scheduled_at?: string
          p_duration_min?: number
          p_visit_type?: string
          p_reason?: string
          p_source?: string
          p_lead_id?: string
        }
        Returns: string
      }
      do_check_in: { Args: { p_appointment_id: string }; Returns: undefined }
      generate_invoice_number: { Args: { p_clinic_id: string }; Returns: string }
      generate_lab_order_number: { Args: { p_clinic_id: string }; Returns: string }
      generate_rad_order_number: { Args: { p_clinic_id: string }; Returns: string }
      get_next_operator:
        | { Args: never; Returns: string }
        | { Args: { p_clinic_id: string }; Returns: string }
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
        | "no_answer"
        | "unqualified"
        | "converted"
        | "lost"
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
        "no_answer",
        "unqualified",
        "converted",
        "lost",
      ],
    },
  },
} as const
