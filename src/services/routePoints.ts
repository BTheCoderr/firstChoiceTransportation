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
