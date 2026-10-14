import { supabase } from "@/lib/supabase";
import type { ShiftsRow } from "@/types/database";

export type PayrollDecision = "approved" | "rejected" | "test_excluded" | "needs_review";
export interface PayrollReview {
  shift_id: string;
  company_id: string;
  decision: PayrollDecision;
  payable_minutes: number | null;
  note: string;
  reviewed_by: string;
  reviewed_at: string;
}
export interface PayrollReviewEvent {
  id: string;
  shift_id: string;
  actor_id: string;
  previous_decision: PayrollDecision | null;
  new_decision: PayrollDecision;
  previous_payable_minutes: number | null;
  new_payable_minutes: number | null;
  note: string;
  created_at: string;
}
export type ReviewableShift = {
  shift: ShiftsRow;
  driverName: string;
  review: PayrollReview | null;
};

export function displayApprovalStatus(shift: ShiftsRow, review: PayrollReview | null): string {
  if (shift.clock_out_at == null) return "Open: not approved";
  if (!review) return "Unreviewed: recorded time only";
  if (review.decision === "test_excluded") return "Test record: excluded";
  if (review.decision === "rejected") return "Rejected: excluded";
  if (review.decision === "needs_review") return "Awaiting administrator review";
  return "Approved: " + formatPayableMinutes(review.payable_minutes);
}

export function formatPayableMinutes(value: number | null): string {
  if (value == null) return "—";
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
}

/** Fail CLOSED if migration 027 isn't deployed. No fallback to legacy stored minutes. */
export async function getPayrollReviews(companyId: string): Promise<PayrollReview[]> {
  const { data, error } = await supabase
    .from("shift_payroll_reviews")
    .select("*")
    .eq("company_id", companyId);
  if (error) throw new Error("REVIEW_LEDGER_UNAVAILABLE");
  return (data ?? []) as PayrollReview[];
}
export async function getPayrollReview(shiftId: string): Promise<PayrollReview | null> {
  const { data, error } = await supabase
    .from("shift_payroll_reviews")
    .select("*")
    .eq("shift_id", shiftId)
    .maybeSingle();
  if (error) throw new Error("REVIEW_LEDGER_UNAVAILABLE");
  return data as PayrollReview | null;
}
export async function getPayrollReviewEvents(shiftId: string): Promise<PayrollReviewEvent[]> {
  const { data, error } = await supabase
    .from("shift_payroll_review_events")
    .select("*")
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("REVIEW_LEDGER_UNAVAILABLE");
  return (data ?? []) as PayrollReviewEvent[];
}
export async function getReviewableCompanyShifts(companyId: string): Promise<ReviewableShift[]> {
  const [shiftsRes, reviews] = await Promise.all([
    supabase.from("shifts").select("*").eq("company_id", companyId)
      .not("clock_out_at", "is", null).order("clock_in_at", { ascending: false }).limit(200),
    getPayrollReviews(companyId),
  ]);
  if (shiftsRes.error) throw new Error("SHIFT_REVIEW_LIST_UNAVAILABLE");
  const shifts = (shiftsRes.data ?? []) as ShiftsRow[];
  if (!shifts.length) return [];
  const profilesRes = await supabase.from("profiles").select("id, full_name")
    .in("id", [...new Set(shifts.map((s) => s.driver_id))]);
  if (profilesRes.error) throw new Error("SHIFT_REVIEW_DRIVERS_UNAVAILABLE");
  const names = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? "Unknown"]));
  const byShift = new Map(reviews.map((review) => [review.shift_id, review]));
  return shifts.map((shift) => ({
    shift, driverName: names.get(shift.driver_id) ?? "Unknown",
    review: byShift.get(shift.id) ?? null,
  }));
}
export async function decideShiftPayroll(input: {
  shiftId: string;
  decision: PayrollDecision;
  payableMinutes: number | null;
  note: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const note = input.note.trim();
  if (note.length < 20 || note.length > 1200)
    return { ok: false, message: "Explain your decision in 20–1,200 characters." };
  if (input.decision === "approved") {
    if (!Number.isInteger(input.payableMinutes) || input.payableMinutes == null
      || input.payableMinutes < 1 || input.payableMinutes > 1440)
      return { ok: false, message: "Enter 1 to 1,440 documented payable minutes." };
  } else if (input.payableMinutes !== null) {
    return { ok: false, message: "Only approval decisions can include payable minutes." };
  }
  const { error } = await supabase.rpc("admin_decide_shift_payroll", {
    p_shift_id: input.shiftId,
    p_decision: input.decision,
    p_payable_minutes: input.payableMinutes,
    p_note: note,
  });
  if (!error) return { ok: true };
  const msg = error.message ?? "";
  if (msg.includes("INVALID_APPROVED_MINUTES")) return {
    ok: false, message: "Payable minutes must not exceed 24 hours or the documented shift span.",
  };
  if (msg.includes("USE_RECOVERY_APPROVAL")) return {
    ok: false, message: "Finish the separate recovered-shift payroll approval first.",
  };
  if (msg.includes("SHIFT_STILL_OPEN")) return {
    ok: false, message: "Close the shift for review before making a payroll decision.",
  };
  return { ok: false, message: "Could not save the review. Check administrator access and migration 027, then retry." };
}
