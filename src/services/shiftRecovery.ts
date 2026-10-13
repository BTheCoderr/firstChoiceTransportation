import { supabase } from "@/lib/supabase";
import type { ShiftsRow } from "@/types/database";

export type ShiftRecoveryReason =
  | "gps_unavailable"
  | "device_failure"
  | "missed_return_detection"
  | "admin_review"
  | "other";

export interface ShiftReviewEvent {
  id: string;
  shift_id: string;
  action: "close_pending_review" | "approve_paid_hours";
  reason: string;
  note: string;
  effective_end_at: string | null;
  approved_minutes: number | null;
  actor_id: string;
  created_at: string;
}

type Result =
  | { ok: true; shift: ShiftsRow }
  | { ok: false; error: string };

function errorMessage(message: string): string {
  if (message.includes("ADMIN_REQUIRED") || message.includes("AUTH_REQUIRED") ||
      message.includes("SHIFT_NOT_FOUND")) {
    return "Administrator access to this company's shift could not be verified.";
  }
  if (message.includes("INVALID_END_TIME")) {
    return "The reviewed end time must be after clock-in, no later than now, and within 24 hours of shift start.";
  }
  if (message.includes("INVALID_REVIEW_INPUT")) {
    return "Select a reason and provide a detailed review note (10 to 1,200 characters).";
  }
  if (message.includes("SHIFT_ALREADY_CLOSED")) {
    return "This shift was already closed. Refresh the screen.";
  }
  if (message.includes("NOT_PENDING_REVIEW")) {
    return "This shift is not waiting for payroll approval. Refresh the screen.";
  }
  return "Could not update this shift. Check your connection and try again.";
}

/** Closing a stuck shift does NOT approve paid minutes. */
export async function closeOpenShiftForReview(input: {
  shiftId: string;
  effectiveEndAt: string;
  reason: ShiftRecoveryReason;
  note: string;
}): Promise<Result> {
  const date = new Date(input.effectiveEndAt);
  if (Number.isNaN(date.getTime()) || input.note.trim().length < 10) {
    return { ok: false, error: "Enter a valid date/time and a detailed reason." };
  }
  const { data, error } = await supabase.rpc("admin_close_open_shift_for_review", {
    p_shift_id: input.shiftId,
    p_effective_end_at: date.toISOString(),
    p_reason: input.reason,
    p_note: input.note.trim(),
  });
  if (error || !data) return { ok: false, error: errorMessage(error?.message ?? "") };
  return { ok: true, shift: data as ShiftsRow };
}

/** Separate, explicit admin decision; server computes minutes from selected end time. */
export async function approveRecoveredShiftHours(
  shiftId: string,
  note: string
): Promise<Result> {
  if (note.trim().length < 10) {
    return { ok: false, error: "Explain the payroll approval in at least 10 characters." };
  }
  const { data, error } = await supabase.rpc("admin_approve_recovered_shift_hours", {
    p_shift_id: shiftId,
    p_note: note.trim(),
  });
  if (error || !data) return { ok: false, error: errorMessage(error?.message ?? "") };
  return { ok: true, shift: data as ShiftsRow };
}
