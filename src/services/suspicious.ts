import { supabase } from "@/lib/supabase";
import { minutesBetween } from "@/utils/movement";
import {
  NO_MOVEMENT_FLAG_MINUTES,
  FIRST_MOVEMENT_DELAY_FLAG_MINUTES,
  LONG_IDLE_FLAG_MINUTES,
  MAX_REASONABLE_VERIFIED_MINUTES,
} from "@/constants/suspicious";

export type SuspiciousReason =
  | "no_movement_within_threshold"
  | "late_first_movement"
  | "long_idle_period"
  | "extended_shift";

export interface FlagShiftInput {
  shiftId: string;
  reason: SuspiciousReason;
  details: Record<string, unknown>;
}

/**
 * Compatibility helper: asks the server to recompute flags from GPS evidence.
 * The caller's reason, timestamps and details are never written to shifts.
 */
export async function flagShiftAsSuspicious(input: FlagShiftInput): Promise<void> {
  const { error } = await supabase.rpc("refresh_driver_shift_activity", {
    p_shift_id: input.shiftId,
  });
  if (error) throw new Error("SERVER_MOVEMENT_REFRESH_UNAVAILABLE");
}

export function shouldFlagNoMovement(minsSinceClockIn: number): boolean {
  return minsSinceClockIn >= NO_MOVEMENT_FLAG_MINUTES;
}
export function shouldFlagLateFirstMovement(clockInAt: string, firstMovementAt: string): boolean {
  return minutesBetween(clockInAt, firstMovementAt) >= FIRST_MOVEMENT_DELAY_FLAG_MINUTES;
}
export function shouldFlagLongIdle(minsSinceLastMovement: number): boolean {
  return minsSinceLastMovement >= LONG_IDLE_FLAG_MINUTES;
}
export function shouldFlagExtendedShift(verifiedMinutes: number): boolean {
  return verifiedMinutes > MAX_REASONABLE_VERIFIED_MINUTES;
}
