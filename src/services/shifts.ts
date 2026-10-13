import { supabase } from "@/lib/supabase";
import type { ShiftsRow } from "@/types/database";

const ACTIVE_STATUSES = ["started", "moving", "idle", "flagged"] as const;

export interface StartShiftCoords {
  lat: number;
  lng: number;
}

export type ActiveShiftLookup =
  | { ok: true; shift: ShiftsRow | null }
  | { ok: false; shift: null };

/**
 * Distinguish a confirmed absence of an open shift from a network failure.
 * Never stop GPS monitoring merely because a Supabase request failed.
 */
export async function lookupActiveShiftForDriver(
  driverId: string
): Promise<ActiveShiftLookup> {
  try {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("driver_id", driverId)
      .in("status", ACTIVE_STATUSES)
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, shift: null };
    return { ok: true, shift: data ? (data as ShiftsRow) : null };
  } catch {
    return { ok: false, shift: null };
  }
}

/** Compatibility wrapper: use lookupActiveShiftForDriver when making decisions about GPS. */
export async function getActiveShiftForDriver(
  driverId: string
): Promise<ShiftsRow | null> {
  const result = await lookupActiveShiftForDriver(driverId);
  return result.ok ? result.shift : null;
}

export type StartShiftResult =
  | { success: true; shift: ShiftsRow }
  | { success: false; error: "ALREADY_ACTIVE" | "INSERT_FAILED" | "ONBOARDING_REQUIRED" | "APPROVED_GPS_BASE_REQUIRED" };

export async function startShift(
  driverId: string,
  companyId: string,
  coords?: StartShiftCoords
): Promise<StartShiftResult> {
  // Keep the old arguments for callers, but do not trust client identifiers or
  // client clocks; the RPC verifies auth.uid() and reads company from profiles.
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
    return { success: false, error: "INSERT_FAILED" };
  }
  const { data, error } = await supabase.rpc("start_driver_shift", {
    p_start_lat: coords.lat,
    p_start_lng: coords.lng,
  });
  if (error || !data) {
    if (isDuplicateActiveShiftError(error)) {
      return { success: false, error: "ALREADY_ACTIVE" };
    }
    if (error?.message?.includes("ONBOARDING_REQUIRED")) {
      return { success: false, error: "ONBOARDING_REQUIRED" };
    }
    if (error?.message?.includes("APPROVED_GPS_BASE_REQUIRED")) {
      return { success: false, error: "APPROVED_GPS_BASE_REQUIRED" };
    }
    return { success: false, error: "INSERT_FAILED" };
  }
  return { success: true, shift: data as ShiftsRow };
}

function isDuplicateActiveShiftError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  if (e.code === "23505") return true;
  if (typeof e.message === "string" && e.message.includes("ALREADY_ACTIVE")) return true;
  return (
    typeof e.message === "string" &&
    e.message.toLowerCase().includes("idx_one_active_shift_per_driver")
  );
}

export async function getRecentShiftsForDriver(
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

export async function getTodaysLastShiftForDriver(
  driverId: string
): Promise<ShiftsRow | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("driver_id", driverId)
    .in("status", ["completed", "flagged"])
    .gte("clock_in_at", `${today}T00:00:00`)
    .lte("clock_in_at", `${today}T23:59:59`)
    .order("clock_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ShiftsRow;
}
