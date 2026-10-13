import { supabase } from "@/lib/supabase";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import type {
  ProfilesRow,
  ShiftsRow,
  RoutePointsRow,
  ClientStopsRow,
} from "@/types/database";
import type { AdminDriverListItem, DriverBaseSettings } from "@/types/app";
import { getDriverBaseSettings } from "@/services/driverBases";
import type { ShiftReviewEvent } from "@/services/shiftRecovery";

/** UTC Monday boundary, shared by dashboard and driver detail. */
function getWeekStart(date: Date): string {
  const day = date.getUTCDay();
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - mondayOffset));
  return monday.toISOString().slice(0, 10);
}

/** Exclusive end at next Monday, not 23:59 on the current Monday. */
function getWeekEndExclusive(weekStart: string): string {
  const next = new Date(`${weekStart}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 7);
  return next.toISOString();
}

export interface DriverWithWeeklyStats extends AdminDriverListItem {}

export interface RecentShiftWithDriver {
  shift: ShiftsRow;
  driverName: string;
  driverEmail: string;
}

export interface DriverDetailResult {
  profile: ProfilesRow;
  baseSettings: DriverBaseSettings;
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
  reviewEvents: ShiftReviewEvent[];
}

/**
 * Get all drivers for a company with their weekly stats (current week).
 * Computes from shifts; does not rely on weekly_summaries table.
 */
export async function getCompanyDriversWithWeeklyStats(
  companyId: string
): Promise<DriverWithWeeklyStats[]> {
  const weekStart = getWeekStart(new Date());
  const weekEnd = getWeekEndExclusive(weekStart);

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
    .lt("clock_in_at", weekEnd);

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

/** Visible work queue: every open shift requires a GPS return or admin review. */
export async function getOpenCompanyShifts(
  companyId: string,
  limit = 50
): Promise<RecentShiftWithDriver[]> {
  const { data: rows, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("company_id", companyId)
    .is("clock_out_at", null)
    .order("clock_in_at", { ascending: true })
    .limit(limit);

  if (error || !rows?.length) return [];
  const shifts = rows as ShiftsRow[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", [...new Set(shifts.map((s) => s.driver_id))]);
  const names = new Map(
    (profiles ?? []).map((p) => [p.id, { name: p.full_name, email: p.email }])
  );
  return shifts.map((shift) => ({
    shift,
    driverName: names.get(shift.driver_id)?.name ?? "Unknown",
    driverEmail: names.get(shift.driver_id)?.email ?? "",
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
  const weekEnd = getWeekEndExclusive(weekStart);

  const [baseSettings, shiftsRes, weeklyRes] = await Promise.all([
    getDriverBaseSettings(driverId),
    supabase
      .from("shifts")
      .select("*")
      .eq("driver_id", driverId)
      .order("clock_in_at", { ascending: false })
      .limit(10),
    supabase
      .from("shifts")
      .select("verified_hours_minutes, flagged_at")
      .eq("driver_id", driverId)
      .eq("company_id", SINGLE_COMPANY_ID)
      .in("status", ["completed", "flagged"])
      .gte("clock_in_at", `${weekStart}T00:00:00`)
      .lt("clock_in_at", weekEnd),
  ]);
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
    baseSettings,
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

  const [routeRes, stopsRes, auditRes] = await Promise.all([
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
    supabase
      .from("shift_review_events")
      .select("*")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: false }),
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
    reviewEvents: (auditRes.data ?? []) as ShiftReviewEvent[],
  };
}
