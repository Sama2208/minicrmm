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
        }
        Insert: {
          created_at?: string
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
        }
        Update: {
          created_at?: string
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
