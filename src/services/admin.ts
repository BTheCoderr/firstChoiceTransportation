import { supabase } from "@/lib/supabase";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import type {
  ProfilesRow,
  ShiftsRow,
  DriverBasesRow,
  RoutePointsRow,
  ClientStopsRow,
} from "@/types/database";
import type { AdminDriverListItem } from "@/types/app";

/** Get Monday of the week for a given date (YYYY-MM-DD) */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export interface DriverWithWeeklyStats extends AdminDriverListItem {}

export interface RecentShiftWithDriver {
  shift: ShiftsRow;
  driverName: string;
  driverEmail: string;
}

export interface DriverDetailResult {
  profile: ProfilesRow;
  defaultBase: DriverBasesRow | null;
  recentShifts: ShiftsRow[];
  weeklyMinutes: number;
  weeklyShiftCount: number;
  weeklyFlaggedCount: number;
  weekStart: string;
}

export interface ShiftDetailResult {
  shift: ShiftsRow;
  driverName: string;
  driverEmail: string;
  routePoints: RoutePointsRow[];
  clientStops: ClientStopsRow[];
  routePointsCount: number;
  clientStopsCount: number;
}

/**
 * Get all drivers for a company with their weekly stats (current week).
 * Computes from shifts; does not rely on weekly_summaries table.
 */
export async function getCompanyDriversWithWeeklyStats(
  companyId: string
): Promise<DriverWithWeeklyStats[]> {
  const weekStart = getWeekStart(new Date());
  const weekEnd = `${weekStart}T23:59:59`;

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("company_id", companyId)
    .eq("role", "driver");

  if (profilesError || !profilesData) return [];

  const profiles = profilesData as Pick<ProfilesRow, "id" | "full_name" | "email" | "role">[];
  const { data: shiftsData, error: shiftsError } = await supabase
    .from("shifts")
    .select("driver_id, verified_hours_minutes, flagged_at")
    .eq("company_id", companyId)
    .in("status", ["completed", "flagged"])
    .gte("clock_in_at", `${weekStart}T00:00:00`)
    .lte("clock_in_at", weekEnd);

  if (shiftsError) return [];

  const shifts = (shiftsData ?? []) as Pick<ShiftsRow, "driver_id" | "verified_hours_minutes" | "flagged_at">[];

  const statsByDriver: Record<
    string,
    { minutes: number; shiftCount: number; flaggedCount: number }
  > = {};

  for (const p of profiles) {
    statsByDriver[p.id] = { minutes: 0, shiftCount: 0, flaggedCount: 0 };
  }

  for (const s of shifts) {
    const cur = statsByDriver[s.driver_id];
    if (!cur) continue;
    cur.minutes += s.verified_hours_minutes ?? 0;
    cur.shiftCount += 1;
    if (s.flagged_at != null) cur.flaggedCount += 1;
  }

  return profiles.map((p) => ({
    id: p.id,
    fullName: p.full_name ?? "Unknown",
    email: p.email ?? "",
    role: p.role as "driver",
    weeklyMinutes: statsByDriver[p.id]?.minutes ?? 0,
    shiftCount: statsByDriver[p.id]?.shiftCount ?? 0,
    flaggedCount: statsByDriver[p.id]?.flaggedCount ?? 0,
    weekStart,
  }));
}

/**
 * Get recent completed shifts for a company.
 */
export async function getRecentCompanyShifts(
  companyId: string,
  limit = 15
): Promise<RecentShiftWithDriver[]> {
  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["completed", "flagged"])
    .order("clock_in_at", { ascending: false })
    .limit(limit);

  if (shiftsError || !shifts) return [];

  const driverIds = [...new Set((shifts as ShiftsRow[]).map((s) => s.driver_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", driverIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name?: string; email?: string }) => [
      p.id,
      { fullName: p.full_name ?? "Unknown", email: p.email ?? "" },
    ])
  );

  return (shifts as ShiftsRow[]).map((shift) => {
    const p = profileMap.get(shift.driver_id);
    return {
      shift,
      driverName: p?.fullName ?? "Unknown",
      driverEmail: p?.email ?? "",
    };
  });
}

/**
 * Get driver detail: profile, default base, recent shifts, weekly stats.
 */
export async function getDriverDetail(
  driverId: string
): Promise<DriverDetailResult | null> {
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", driverId)
    .single();

  if (profileError || !profileData) return null;
  const profile = profileData as ProfilesRow;

  const weekStart = getWeekStart(new Date());
  const weekEnd = `${weekStart}T23:59:59`;

  const [baseRes, shiftsRes, weeklyRes] = await Promise.all([
    supabase
      .from("driver_bases")
      .select("*")
      .eq("driver_id", driverId)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("shifts")
      .select("*")
      .eq("driver_id", driverId)
      .in("status", ["completed", "flagged"])
      .order("clock_in_at", { ascending: false })
      .limit(10),
    supabase
      .from("shifts")
      .select("verified_hours_minutes, flagged_at")
      .eq("driver_id", driverId)
      .eq("company_id", SINGLE_COMPANY_ID)
      .in("status", ["completed", "flagged"])
      .gte("clock_in_at", `${weekStart}T00:00:00`)
      .lte("clock_in_at", weekEnd),
  ]);

  const defaultBase = baseRes.data as DriverBasesRow | null;
  const recentShifts = (shiftsRes.data ?? []) as ShiftsRow[];
  const weeklyShifts = weeklyRes.data ?? [];

  let weeklyMinutes = 0;
  let weeklyShiftCount = weeklyShifts.length;
  let weeklyFlaggedCount = 0;
  for (const s of weeklyShifts) {
    weeklyMinutes += (s as { verified_hours_minutes?: number }).verified_hours_minutes ?? 0;
    if ((s as { flagged_at?: string | null }).flagged_at) weeklyFlaggedCount += 1;
  }

  return {
    profile,
    defaultBase,
    recentShifts,
    weeklyMinutes,
    weeklyShiftCount,
    weeklyFlaggedCount,
    weekStart,
  };
}

/**
 * Get driver's recent shifts (for driver detail page).
 */
export async function getDriverRecentShifts(
  driverId: string,
  limit = 10
): Promise<ShiftsRow[]> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("driver_id", driverId)
    .in("status", ["completed", "flagged"])
    .order("clock_in_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as ShiftsRow[];
}

/**
 * Get full shift detail including route points and client stops.
 */
export async function getShiftDetail(
  shiftId: string
): Promise<ShiftDetailResult | null> {
  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .select("*")
    .eq("id", shiftId)
    .single();

  if (shiftError || !shift) return null;

  const shiftRow = shift as ShiftsRow;
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", shiftRow.driver_id)
    .single();

  const profile = profileData as { full_name?: string; email?: string } | null;
  const driverName = profile?.full_name ?? "Unknown";
  const driverEmail = profile?.email ?? "";

  const [routeRes, stopsRes] = await Promise.all([
    supabase
      .from("route_points")
      .select("*")
      .eq("shift_id", shiftId)
      .order("recorded_at", { ascending: true }),
    supabase
      .from("client_stops")
      .select("*")
      .eq("shift_id", shiftId)
      .order("recorded_at", { ascending: true }),
  ]);

  const routePoints = (routeRes.data ?? []) as RoutePointsRow[];
  const clientStops = (stopsRes.data ?? []) as ClientStopsRow[];

  return {
    shift: shiftRow,
    driverName,
    driverEmail,
    routePoints,
    clientStops,
    routePointsCount: routePoints.length,
    clientStopsCount: clientStops.length,
  };
}
