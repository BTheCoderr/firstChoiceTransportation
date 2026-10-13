import { supabase } from "@/lib/supabase";
import type { ShiftsRow } from "@/types/database";

export type EndShiftResult =
  | { success: true; shift: ShiftsRow }
  | { success: false; error: "NO_BASE" | "NO_SHIFT" | "UPDATE_FAILED" | "INVALID_INPUT" | "INVALID_DROP_OFF_TIME" };

/**
 * Server-authoritative end-of-shift computation.
 * The mobile app only sends the GPS fix and shift ID; the database verifies
 * auth.uid(), locked shift ownership, start time, base and return-time cap.
 * Client-supplied timestamps or payroll totals are never written directly.
 */
export async function completeShiftWithFinalDropoff(
  shiftId: string,
  _driverId: string,
  dropoffLat: number,
  dropoffLng: number,
  _dropoffAt: string
): Promise<EndShiftResult> {
  if (!Number.isFinite(dropoffLat) || !Number.isFinite(dropoffLng) ||
      Math.abs(dropoffLat) > 90 || Math.abs(dropoffLng) > 180) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { data, error } = await supabase.rpc("complete_driver_shift", {
    p_shift_id: shiftId,
    p_dropoff_lat: dropoffLat,
    p_dropoff_lng: dropoffLng,
  });

  if (error || !data) {
    const message = error?.message ?? "";
    if (message.includes("NO_BASE")) return { success: false, error: "NO_BASE" };
    if (message.includes("NO_SHIFT") || message.includes("DRIVER_REQUIRED")) {
      return { success: false, error: "NO_SHIFT" };
    }
    if (message.includes("INVALID_INPUT") || message.includes("INVALID_CLOCK_IN")) {
      return { success: false, error: "INVALID_INPUT" };
    }
    if (__DEV__) console.warn("[FinalDropoff] secure completion failed", error?.code, message);
    return { success: false, error: "UPDATE_FAILED" };
  }

  return { success: true, shift: data as ShiftsRow };
}
