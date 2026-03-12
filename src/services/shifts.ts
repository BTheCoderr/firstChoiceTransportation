import { supabase } from "@/lib/supabase";
import type { ShiftsRow } from "@/types/database";

const ACTIVE_STATUSES = ["started", "moving", "idle"] as const;

export interface StartShiftCoords {
  lat: number;
  lng: number;
}

export async function getActiveShiftForDriver(
  driverId: string
): Promise<ShiftsRow | null> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("driver_id", driverId)
    .in("status", ACTIVE_STATUSES)
    .is("clock_out_at", null)
    .order("clock_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ShiftsRow;
}

export type StartShiftResult =
  | { success: true; shift: ShiftsRow }
  | { success: false; error: "ALREADY_ACTIVE" | "INSERT_FAILED" };

export async function startShift(
  driverId: string,
  companyId: string,
  coords?: StartShiftCoords
): Promise<StartShiftResult> {
  const existing = await getActiveShiftForDriver(driverId);
  if (existing) {
    return { success: false, error: "ALREADY_ACTIVE" };
  }

  const insert = {
    driver_id: driverId,
    company_id: companyId,
    clock_in_at: new Date().toISOString(),
    status: "started" as const,
    start_lat: coords?.lat ?? null,
    start_lng: coords?.lng ?? null,
  };

  const { data, error } = await supabase
    .from("shifts")
    .insert(insert as never)
    .select()
    .single();

  if (error || !data) return { success: false, error: "INSERT_FAILED" };
  return { success: true, shift: data as ShiftsRow };
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
