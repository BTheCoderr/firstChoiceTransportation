import { supabase } from "@/lib/supabase";
import type { ShiftsRow } from "@/types/database";
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
 * Flag a shift as suspicious. Only updates if not already flagged (avoids duplicate writes).
 */
export async function flagShiftAsSuspicious(input: FlagShiftInput): Promise<void> {
  const { shiftId, reason, details } = input;

  const { data: existing } = await supabase
    .from("shifts")
    .select("flagged_at")
    .eq("id", shiftId)
    .single();

  const existingRow = existing as Pick<ShiftsRow, "flagged_at"> | null;
  if (existingRow?.flagged_at) return;

  const update = {
    suspicious_reason: reason,
    suspicious_details: details,
    flagged_at: new Date().toISOString(),
    status: "flagged",
  };
  await supabase.from("shifts").update(update as never).eq("id", shiftId);
}

/**
 * Rule 1: Clocked in but did not move within threshold.
 * Call when idle-at-start is detected.
 */
export function shouldFlagNoMovement(minsSinceClockIn: number): boolean {
  return minsSinceClockIn >= NO_MOVEMENT_FLAG_MINUTES;
}

/**
 * Rule 2: First meaningful movement happened much later than clock-in.
 * Call when first_movement_at is set.
 */
export function shouldFlagLateFirstMovement(
  clockInAt: string,
  firstMovementAt: string
): boolean {
  const mins = minutesBetween(clockInAt, firstMovementAt);
  return mins >= FIRST_MOVEMENT_DELAY_FLAG_MINUTES;
}

/**
 * Rule 3: Long idle period during the shift.
 * Call when idle-after-movement is detected.
 */
export function shouldFlagLongIdle(minsSinceLastMovement: number): boolean {
  return minsSinceLastMovement >= LONG_IDLE_FLAG_MINUTES;
}

/**
 * Rule 4: Shift time extended beyond reasonable max.
 * Call when completing shift.
 */
export function shouldFlagExtendedShift(verifiedMinutes: number): boolean {
  return verifiedMinutes > MAX_REASONABLE_VERIFIED_MINUTES;
}
