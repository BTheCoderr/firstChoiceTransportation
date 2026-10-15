/** Generated from live First Choice Supabase schema. */
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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      client_stops: {
        Row: {
          id: string
          latitude: number
          longitude: number
          notes: string | null
          recorded_at: string
          shift_id: string
          stop_type: Database["public"]["Enums"]["stop_type"]
        }
        Insert: {
          id?: string
          latitude: number
          longitude: number
          notes?: string | null
          recorded_at?: string
          shift_id: string
          stop_type: Database["public"]["Enums"]["stop_type"]
        }
        Update: {
          id?: string
          latitude?: number
          longitude?: number
          notes?: string | null
          recorded_at?: string
          shift_id?: string
          stop_type?: Database["public"]["Enums"]["stop_type"]
        }
        Relationships: [
          {
            foreignKeyName: "client_stops_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_bases: {
        Row: {
          address: string | null
          created_at: string
          driver_id: string
          id: string
          is_default: boolean
          latitude: number
          longitude: number
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          driver_id: string
          id?: string
          is_default?: boolean
          latitude: number
          longitude: number
          name?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          is_default?: boolean
          latitude?: number
          longitude?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_bases_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_provisioning_intents: {
        Row: {
          company_id: string
          consumed_at: string | null
          created_at: string
          created_by: string
          email: string
          id: string
          provisioning_key: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          consumed_at?: string | null
          created_at?: string
          created_by: string
          email: string
          id?: string
          provisioning_key: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          provisioning_key?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_provisioning_intents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_provisioning_intents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_clockout_settings: {
        Row: {
          departure_m: number
          dwell_seconds: number
          enabled: boolean
          id: boolean
          max_accuracy_m: number
          min_shift_minutes: number
          radius_m: number
          updated_at: string
        }
        Insert: {
          departure_m?: number
          dwell_seconds?: number
          enabled?: boolean
          id?: boolean
          max_accuracy_m?: number
          min_shift_minutes?: number
          radius_m?: number
          updated_at?: string
        }
        Update: {
          departure_m?: number
          dwell_seconds?: number
          enabled?: boolean
          id?: boolean
          max_accuracy_m?: number
          min_shift_minutes?: number
          radius_m?: number
          updated_at?: string
        }
        Relationships: []
      }
      shift_payroll_reviews: {
        Row: {
          shift_id: string
          company_id: string
          decision: string
          payable_minutes: number | null
          note: string
          reviewed_by: string
          reviewed_at: string
        }
        Insert: {
          shift_id: string
          company_id: string
          decision: string
          payable_minutes?: number | null
          note: string
          reviewed_by: string
          reviewed_at?: string
        }
        Update: {
          shift_id?: string
          company_id?: string
          decision?: string
          payable_minutes?: number | null
          note?: string
          reviewed_by?: string
          reviewed_at?: string
        }
        Relationships: []
      }
      shift_payroll_review_events: {
        Row: {
          id: string
          shift_id: string
          company_id: string
          actor_id: string
          previous_decision: string | null
          new_decision: string
          previous_payable_minutes: number | null
          new_payable_minutes: number | null
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          shift_id: string
          company_id: string
          actor_id: string
          previous_decision?: string | null
          new_decision: string
          previous_payable_minutes?: number | null
          new_payable_minutes?: number | null
          note: string
          created_at?: string
        }
        Update: {
          id?: string
          shift_id?: string
          company_id?: string
          actor_id?: string
          previous_decision?: string | null
          new_decision?: string
          previous_payable_minutes?: number | null
          new_payable_minutes?: number | null
          note?: string
          created_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          id: string
          company_id: string
          created_by: string
          subject: string
          category: string
          status: string
          priority: string
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          created_by: string
          subject: string
          category: string
          status?: string
          priority?: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          created_by?: string
          subject?: string
          category?: string
          status?: string
          priority?: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          company_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          company_id: string
          author_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          company_id?: string
          author_id?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      support_ticket_events: {
        Row: {
          id: string
          ticket_id: string
          company_id: string
          actor_id: string
          from_status: string | null
          to_status: string
          from_priority: string | null
          to_priority: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          company_id: string
          actor_id: string
          from_status: string | null
          to_status: string
          from_priority: string | null
          to_priority: string | null
          note: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          company_id?: string
          actor_id?: string
          from_status?: string | null
          to_status?: string
          from_priority?: string | null
          to_priority?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_id: string | null
          contact_phone: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          login_id: string | null
          login_type: string | null
          onboarding_completed_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_phone?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          login_id?: string | null
          login_type?: string | null
          onboarding_completed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          login_id?: string | null
          login_type?: string | null
          onboarding_completed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      route_points: {
        Row: {
          accuracy: number | null
          id: string
          is_moving: boolean | null
          latitude: number
          longitude: number
          received_at: string
          recorded_at: string
          shift_id: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          id?: string
          is_moving?: boolean | null
          latitude: number
          longitude: number
          received_at?: string
          recorded_at?: string
          shift_id: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          id?: string
          is_moving?: boolean | null
          latitude?: number
          longitude?: number
          received_at?: string
          recorded_at?: string
          shift_id?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_points_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_review_events: {
        Row: {
          action: string
          actor_id: string
          approved_minutes: number | null
          company_id: string
          created_at: string
          effective_end_at: string | null
          id: string
          note: string
          previous_end_at: string | null
          previous_verified_minutes: number | null
          reason: string
          shift_id: string
        }
        Insert: {
          action: string
          actor_id: string
          approved_minutes?: number | null
          company_id: string
          created_at?: string
          effective_end_at?: string | null
          id?: string
          note: string
          previous_end_at?: string | null
          previous_verified_minutes?: number | null
          reason: string
          shift_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          approved_minutes?: number | null
          company_id?: string
          created_at?: string
          effective_end_at?: string | null
          id?: string
          note?: string
          previous_end_at?: string | null
          previous_verified_minutes?: number | null
          reason?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_review_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_review_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_review_events_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          auto_end_at: string | null
          clock_in_at: string
          clock_out_at: string | null
          commute_base_latitude: number | null
          commute_base_longitude: number | null
          commute_base_name: string | null
          commute_estimate_minutes: number | null
          commute_estimate_raw_minutes: number | null
          company_id: string
          created_at: string
          driver_id: string
          estimated_return_minutes: number | null
          first_movement_at: string | null
          flagged_at: string | null
          id: string
          last_dropoff_at: string | null
          last_dropoff_lat: number | null
          last_dropoff_lng: number | null
          return_base_address: string | null
          return_base_lat: number | null
          return_base_lng: number | null
          return_base_type: string | null
          start_lat: number | null
          start_lng: number | null
          status: Database["public"]["Enums"]["shift_status"]
          suspicious_details: Json | null
          suspicious_reason: string | null
          updated_at: string
          verified_hours_minutes: number | null
        }
        Insert: {
          auto_end_at?: string | null
          clock_in_at: string
          clock_out_at?: string | null
          commute_base_latitude?: number | null
          commute_base_longitude?: number | null
          commute_base_name?: string | null
          commute_estimate_minutes?: number | null
          commute_estimate_raw_minutes?: number | null
          company_id: string
          created_at?: string
          driver_id: string
          estimated_return_minutes?: number | null
          first_movement_at?: string | null
          flagged_at?: string | null
          id?: string
          last_dropoff_at?: string | null
          last_dropoff_lat?: number | null
          last_dropoff_lng?: number | null
          return_base_address?: string | null
          return_base_lat?: number | null
          return_base_lng?: number | null
          return_base_type?: string | null
          start_lat?: number | null
          start_lng?: number | null
          status?: Database["public"]["Enums"]["shift_status"]
          suspicious_details?: Json | null
          suspicious_reason?: string | null
          updated_at?: string
          verified_hours_minutes?: number | null
        }
        Update: {
          auto_end_at?: string | null
          clock_in_at?: string
          clock_out_at?: string | null
          commute_base_latitude?: number | null
          commute_base_longitude?: number | null
          commute_base_name?: string | null
          commute_estimate_minutes?: number | null
          commute_estimate_raw_minutes?: number | null
          company_id?: string
          created_at?: string
          driver_id?: string
          estimated_return_minutes?: number | null
          first_movement_at?: string | null
          flagged_at?: string | null
          id?: string
          last_dropoff_at?: string | null
          last_dropoff_lat?: number | null
          last_dropoff_lng?: number | null
          return_base_address?: string | null
          return_base_lat?: number | null
          return_base_lng?: number | null
          return_base_type?: string | null
          start_lat?: number | null
          start_lng?: number | null
          status?: Database["public"]["Enums"]["shift_status"]
          suspicious_details?: Json | null
          suspicious_reason?: string | null
          updated_at?: string
          verified_hours_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_summaries: {
        Row: {
          company_id: string
          created_at: string
          driver_id: string
          flagged_count: number
          id: string
          shift_count: number
          total_minutes: number
          updated_at: string
          week_start: string
        }
        Insert: {
          company_id: string
          created_at?: string
          driver_id: string
          flagged_count?: number
          id?: string
          shift_count?: number
          total_minutes?: number
          updated_at?: string
          week_start: string
        }
        Update: {
          company_id?: string
          created_at?: string
          driver_id?: string
          flagged_count?: number
          id?: string
          shift_count?: number
          total_minutes?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_summaries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_review_driver_week: {
        Args: {
          p_driver_id: string
          p_week_start: string
          p_note?: string | null
          p_approve?: boolean
        }
        Returns: Json
      }
      _gps_distance_m: {
        Args: { lat_a: number; lat_b: number; lon_a: number; lon_b: number }
        Returns: number
      }
      submit_support_ticket: {
        Args: { p_subject: string; p_category: string; p_body: string }
        Returns: Database["public"]["Tables"]["support_tickets"]["Row"]
      }
      reply_support_ticket: {
        Args: { p_ticket_id: string; p_body: string }
        Returns: Database["public"]["Tables"]["support_tickets"]["Row"]
      }
      admin_update_support_ticket: {
        Args: { p_ticket_id: string; p_status: string; p_priority: string; p_note: string }
        Returns: Database["public"]["Tables"]["support_tickets"]["Row"]
      }
      admin_decide_shift_payroll: {
        Args: { p_shift_id: string; p_decision: string; p_payable_minutes: number | null; p_note: string }
        Returns: Database["public"]["Tables"]["shift_payroll_reviews"]["Row"]
        SetofOptions: { from: "*"; to: "shift_payroll_reviews"; isOneToOne: true; isSetofReturn: false }
      }
      admin_approve_recovered_shift_hours: {
        Args: { p_note: string; p_shift_id: string }
        Returns: {
          auto_end_at: string | null
          clock_in_at: string
          clock_out_at: string | null
          commute_base_latitude: number | null
          commute_base_longitude: number | null
          commute_base_name: string | null
          commute_estimate_minutes: number | null
          commute_estimate_raw_minutes: number | null
          company_id: string
          created_at: string
          driver_id: string
          estimated_return_minutes: number | null
          first_movement_at: string | null
          flagged_at: string | null
          id: string
          last_dropoff_at: string | null
          last_dropoff_lat: number | null
          last_dropoff_lng: number | null
          return_base_address: string | null
          return_base_lat: number | null
          return_base_lng: number | null
          return_base_type: string | null
          start_lat: number | null
          start_lng: number | null
          status: Database["public"]["Enums"]["shift_status"]
          suspicious_details: Json | null
          suspicious_reason: string | null
          updated_at: string
          verified_hours_minutes: number | null
        }
        SetofOptions: {
          from: "*"
          to: "shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_close_open_shift_for_review: {
        Args: {
          p_effective_end_at: string
          p_note: string
          p_reason: string
          p_shift_id: string
        }
        Returns: {
          auto_end_at: string | null
          clock_in_at: string
          clock_out_at: string | null
          commute_base_latitude: number | null
          commute_base_longitude: number | null
          commute_base_name: string | null
          commute_estimate_minutes: number | null
          commute_estimate_raw_minutes: number | null
          company_id: string
          created_at: string
          driver_id: string
          estimated_return_minutes: number | null
          first_movement_at: string | null
          flagged_at: string | null
          id: string
          last_dropoff_at: string | null
          last_dropoff_lat: number | null
          last_dropoff_lng: number | null
          return_base_address: string | null
          return_base_lat: number | null
          return_base_lng: number | null
          return_base_type: string | null
          start_lat: number | null
          start_lng: number | null
          status: Database["public"]["Enums"]["shift_status"]
          suspicious_details: Json | null
          suspicious_reason: string | null
          updated_at: string
          verified_hours_minutes: number | null
        }
        SetofOptions: {
          from: "*"
          to: "shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_driver_shift: {
        Args: {
          p_dropoff_lat: number
          p_dropoff_lng: number
          p_shift_id: string
        }
        Returns: {
          auto_end_at: string | null
          clock_in_at: string
          clock_out_at: string | null
          commute_base_latitude: number | null
          commute_base_longitude: number | null
          commute_base_name: string | null
          commute_estimate_minutes: number | null
          commute_estimate_raw_minutes: number | null
          company_id: string
          created_at: string
          driver_id: string
          estimated_return_minutes: number | null
          first_movement_at: string | null
          flagged_at: string | null
          id: string
          last_dropoff_at: string | null
          last_dropoff_lat: number | null
          last_dropoff_lng: number | null
          return_base_address: string | null
          return_base_lat: number | null
          return_base_lng: number | null
          return_base_type: string | null
          start_lat: number | null
          start_lng: number | null
          status: Database["public"]["Enums"]["shift_status"]
          suspicious_details: Json | null
          suspicious_reason: string | null
          updated_at: string
          verified_hours_minutes: number | null
        }
        SetofOptions: {
          from: "*"
          to: "shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_profile: { Args: never; Returns: Json }
      get_driver_weekly_hours: {
        Args: { p_driver_id: string; p_week_start: string }
        Returns: {
          flagged_count: number
          shift_count: number
          total_minutes: number
        }[]
      }
      get_my_profile_meta: {
        Args: never
        Returns: {
          company_id: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      start_driver_shift: {
        Args: { p_start_lat: number; p_start_lng: number }
        Returns: {
          auto_end_at: string | null
          clock_in_at: string
          clock_out_at: string | null
          commute_base_latitude: number | null
          commute_base_longitude: number | null
          commute_base_name: string | null
          commute_estimate_minutes: number | null
          commute_estimate_raw_minutes: number | null
          company_id: string
          created_at: string
          driver_id: string
          estimated_return_minutes: number | null
          first_movement_at: string | null
          flagged_at: string | null
          id: string
          last_dropoff_at: string | null
          last_dropoff_lat: number | null
          last_dropoff_lng: number | null
          return_base_address: string | null
          return_base_lat: number | null
          return_base_lng: number | null
          return_base_type: string | null
          start_lat: number | null
          start_lng: number | null
          status: Database["public"]["Enums"]["shift_status"]
          suspicious_details: Json | null
          suspicious_reason: string | null
          updated_at: string
          verified_hours_minutes: number | null
        }
        SetofOptions: {
          from: "*"
          to: "shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_orphan_profiles: { Args: never; Returns: undefined }
    }
    Enums: {
      shift_status: "started" | "moving" | "idle" | "completed" | "flagged"
      stop_type: "pickup" | "dropoff"
      user_role: "driver" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      shift_status: ["started", "moving", "idle", "completed", "flagged"],
      stop_type: ["pickup", "dropoff"],
      user_role: ["driver", "admin"],
    },
  },
} as const
