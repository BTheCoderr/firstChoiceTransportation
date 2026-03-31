import { supabase } from "@/lib/supabase";

export interface RoutePointInput {
  shift_id: string;
  latitude: number;
  longitude: number;
  recorded_at?: string;
  accuracy?: number | null;
  speed?: number | null;
}

export async function insertRoutePoint(
  point: RoutePointInput
): Promise<boolean> {
  const insert = {
    shift_id: point.shift_id,
    latitude: point.latitude,
    longitude: point.longitude,
    recorded_at: point.recorded_at ?? new Date().toISOString(),
    accuracy: point.accuracy ?? null,
    speed: point.speed ?? null,
  };
  const { error } = await supabase
    .from("route_points")
    .insert(insert as never);

  return !error;
}

const INSERT_RETRY_DELAY_MS = 400;
const INSERT_MAX_RETRIES = 3;

/**
 * Insert a route point with simple retries. Returns true if inserted, false after all retries fail.
 */
export async function insertRoutePointWithRetry(
  point: RoutePointInput
): Promise<boolean> {
  for (let attempt = 1; attempt <= INSERT_MAX_RETRIES; attempt++) {
    const ok = await insertRoutePoint(point);
    if (ok) return true;
    if (attempt < INSERT_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, INSERT_RETRY_DELAY_MS));
    }
  }
  return false;
}

/**
 * Get the recorded_at time of the most recent route point for a shift, or null if none.
 */
export async function getLastRoutePointRecordedAt(
  shiftId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("route_points")
    .select("recorded_at")
    .eq("shift_id", shiftId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { recorded_at?: string };
  return row.recorded_at ?? null;
}
