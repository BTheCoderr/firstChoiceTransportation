import { supabase } from "@/lib/supabase";
import { getDefaultBaseForDriver } from "@/services/driverBases";
import { estimateTravelTimeMinutes } from "@/services/travelEstimate";
import { shouldFlagExtendedShift } from "@/services/suspicious";
import type { ShiftsRow } from "@/types/database";

export type EndShiftResult =
  | { success: true; shift: ShiftsRow }
  | { success: false; error: "NO_BASE" | "NO_SHIFT" | "UPDATE_FAILED" };

/**
 * Complete a shift with final dropoff.
 * 1. Validates shift exists and is active
 * 2. Loads driver's default base
 * 3. Estimates travel time from dropoff to base
 * 4. Computes end time = dropoff time + travel time
 * 5. Sets verified_hours_minutes from clock_in to end
 * 6. Updates shift to completed
 */
export async function completeShiftWithFinalDropoff(
  shiftId: string,
  driverId: string,
  dropoffLat: number,
  dropoffLng: number,
  dropoffAt: string
): Promise<EndShiftResult> {
  const base = await getDefaultBaseForDriver(driverId);
  if (!base) {
    return { success: false, error: "NO_BASE" };
  }

  const { data: shiftData, error: fetchError } = await supabase
    .from("shifts")
    .select("*")
    .eq("id", shiftId)
    .eq("driver_id", driverId)
    .in("status", ["started", "moving", "idle"])
    .is("clock_out_at", null)
    .single();

  const shift = shiftData as ShiftsRow | null;
  if (fetchError || !shift) {
    return { success: false, error: "NO_SHIFT" };
  }

  const travelMinutes = estimateTravelTimeMinutes(
    { lat: dropoffLat, lng: dropoffLng },
    { lat: base.latitude, lng: base.longitude }
  );

  const dropoffDate = new Date(dropoffAt);
  const endDate = new Date(dropoffDate.getTime() + travelMinutes * 60 * 1000);
  const clockOutAt = endDate.toISOString();

  const clockInAt = new Date(shift.clock_in_at as string);
  const verifiedMinutes = Math.floor(
    (endDate.getTime() - clockInAt.getTime()) / (60 * 1000)
  );

  const isExtended = shouldFlagExtendedShift(verifiedMinutes);
  const updatePayload = {
    last_dropoff_at: dropoffAt,
    last_dropoff_lat: dropoffLat,
    last_dropoff_lng: dropoffLng,
    clock_out_at: clockOutAt,
    auto_end_at: clockOutAt,
    verified_hours_minutes: verifiedMinutes,
    status: isExtended ? ("flagged" as const) : ("completed" as const),
    ...(isExtended && {
      suspicious_reason: "extended_shift" as const,
      suspicious_details: { verified_minutes: verifiedMinutes },
      flagged_at: new Date().toISOString(),
    }),
  };

  const { data: updated, error: updateError } = await supabase
    .from("shifts")
    .update(updatePayload as never)
    .eq("id", shiftId)
    .select()
    .single();

  if (updateError || !updated) {
    return { success: false, error: "UPDATE_FAILED" };
  }

  return { success: true, shift: updated as ShiftsRow };
}
