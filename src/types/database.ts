/**
 * Supabase Database Types
 * Matches schema in supabase/migrations/001_initial_schema.sql and 002_profiles_login_identifier.sql
 */

export type UserRole = "driver" | "admin";
export type BaseType = "home" | "office";
export type ShiftStatus = "started" | "moving" | "idle" | "completed" | "flagged";
export type StopType = "pickup" | "dropoff";

// =============================================================================
// ROW TYPES (from DB)
// =============================================================================

export interface CompaniesRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProfilesRow {
  id: string;
  company_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  login_type?: string | null;
  login_id?: string | null;
}

export interface DriverBasesRow {
  id: string;
  driver_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftsRow {
  id: string;
  driver_id: string;
  company_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  auto_end_at: string | null;
  start_lat: number | null;
  start_lng: number | null;
  first_movement_at: string | null;
  last_dropoff_at: string | null;
  last_dropoff_lat: number | null;
  last_dropoff_lng: number | null;
  verified_hours_minutes: number | null;
  status: ShiftStatus;
  suspicious_reason: string | null;
  suspicious_details: Record<string, unknown> | null;
  flagged_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutePointsRow {
  id: string;
  shift_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  accuracy: number | null;
  speed: number | null;
  is_moving: boolean | null;
}

export interface ClientStopsRow {
  id: string;
  shift_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  stop_type: StopType;
  notes: string | null;
}

export interface WeeklySummariesRow {
  id: string;
  driver_id: string;
  company_id: string;
  week_start: string;
  total_minutes: number;
  shift_count: number;
  flagged_count: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// INSERT TYPES (omit auto-generated fields)
// =============================================================================

export interface CompaniesInsert {
  id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfilesInsert {
  id: string;
  company_id?: string | null;
  email: string;
  full_name: string;
  role?: UserRole;
  created_at?: string;
  updated_at?: string;
  login_type?: string | null;
  login_id?: string | null;
}

export interface DriverBasesInsert {
  id?: string;
  driver_id: string;
  name?: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftsInsert {
  id?: string;
  driver_id: string;
  company_id: string;
  clock_in_at: string;
  clock_out_at?: string | null;
  auto_end_at?: string | null;
  start_lat?: number | null;
  start_lng?: number | null;
  first_movement_at?: string | null;
  last_dropoff_at?: string | null;
  last_dropoff_lat?: number | null;
  last_dropoff_lng?: number | null;
  verified_hours_minutes?: number | null;
  status?: ShiftStatus;
  suspicious_reason?: string | null;
  suspicious_details?: Record<string, unknown> | null;
  flagged_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoutePointsInsert {
  id?: string;
  shift_id: string;
  latitude: number;
  longitude: number;
  recorded_at?: string;
  accuracy?: number | null;
  speed?: number | null;
  is_moving?: boolean | null;
}

export interface ClientStopsInsert {
  id?: string;
  shift_id: string;
  latitude: number;
  longitude: number;
  recorded_at?: string;
  stop_type: StopType;
  notes?: string | null;
}

export interface WeeklySummariesInsert {
  id?: string;
  driver_id: string;
  company_id: string;
  week_start: string;
  total_minutes?: number;
  shift_count?: number;
  flagged_count?: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// UPDATE TYPES (all fields optional)
// =============================================================================

export interface CompaniesUpdate {
  name?: string;
  updated_at?: string;
}

export interface ProfilesUpdate {
  company_id?: string | null;
  email?: string;
  full_name?: string;
  role?: UserRole;
  updated_at?: string;
  login_type?: string | null;
  login_id?: string | null;
}

export interface DriverBasesUpdate {
  name?: string;
  latitude?: number;
  longitude?: number;
  address?: string | null;
  is_default?: boolean;
  updated_at?: string;
}

export interface ShiftsUpdate {
  clock_out_at?: string | null;
  auto_end_at?: string | null;
  start_lat?: number | null;
  start_lng?: number | null;
  first_movement_at?: string | null;
  last_dropoff_at?: string | null;
  last_dropoff_lat?: number | null;
  last_dropoff_lng?: number | null;
  verified_hours_minutes?: number | null;
  status?: ShiftStatus;
  suspicious_reason?: string | null;
  suspicious_details?: Record<string, unknown> | null;
  flagged_at?: string | null;
  updated_at?: string;
}

export interface RoutePointsUpdate {
  latitude?: number;
  longitude?: number;
  recorded_at?: string;
  accuracy?: number | null;
  speed?: number | null;
  is_moving?: boolean | null;
}

export interface ClientStopsUpdate {
  latitude?: number;
  longitude?: number;
  recorded_at?: string;
  stop_type?: StopType;
  notes?: string | null;
}

export interface WeeklySummariesUpdate {
  total_minutes?: number;
  shift_count?: number;
  flagged_count?: number;
  updated_at?: string;
}

// =============================================================================
// SUPABASE DATABASE TYPE (for typed client)
// Supabase PostgREST expects Tables with Row, Insert, Update, and Relationships.
// =============================================================================

type TableDef<R, I, U> = {
  Row: R;
  Insert: I;
  Update: U;
  Relationships: unknown[];
};

export interface Database {
  public: {
    Tables: {
      companies: TableDef<CompaniesRow, CompaniesInsert, CompaniesUpdate>;
      profiles: TableDef<ProfilesRow, ProfilesInsert, ProfilesUpdate>;
      driver_bases: TableDef<DriverBasesRow, DriverBasesInsert, DriverBasesUpdate>;
      shifts: TableDef<ShiftsRow, ShiftsInsert, ShiftsUpdate>;
      route_points: TableDef<RoutePointsRow, RoutePointsInsert, RoutePointsUpdate>;
      client_stops: TableDef<ClientStopsRow, ClientStopsInsert, ClientStopsUpdate>;
      weekly_summaries: TableDef<
        WeeklySummariesRow,
        WeeklySummariesInsert,
        WeeklySummariesUpdate
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
