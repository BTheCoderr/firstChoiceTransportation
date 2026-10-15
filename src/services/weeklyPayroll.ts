import { supabase } from "@/lib/supabase";

export type WeeklyPayrollShift = {
  shiftId: string;
  clockInAt: string;
  clockOutAt: string | null;
  status: "eligible" | "open" | "exception" | "excluded" | "approved";
  reason: string;
  minutes: number | null;
};

export type WeeklyPayrollPreview = {
  weekStart: string;
  weekEndExclusive: string;
  driverId: string;
  isComplete: boolean;
  shiftCount: number;
  eligibleCount: number;
  eligibleMinutes: number;
  openCount: number;
  exceptionCount: number;
  excludedCount: number;
  approvedCount: number;
  approvedMinutes: number;
  canApprove: boolean;
  newlyApproved: number;
  items: WeeklyPayrollShift[];
};

export type PayrollDriver = { id: string; fullName: string };

export async function loadPayrollDrivers(companyId: string): Promise<PayrollDriver[]> {
  const { data, error } = await supabase.from("profiles")
    .select("id, full_name").eq("company_id", companyId).eq("role", "driver")
    .order("full_name", { ascending: true });
  if (error) throw new Error("Could not load drivers for weekly payroll.");
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name ?? "Driver" }));
}

/** The database determines eligibility, timestamps, and payable minutes. */
export async function reviewDriverPayrollWeek(
  driverId: string, weekStart: string,
  options: { approve?: boolean; note?: string } = {}
): Promise<WeeklyPayrollPreview> {
  const { data, error } = await supabase.rpc("admin_review_driver_week", {
    p_driver_id: driverId,
    p_week_start: weekStart,
    p_note: options.note ?? null,
    p_approve: options.approve ?? false,
  });
  if (error || !data) {
    const reason = error?.message ?? "";
    if (reason.includes("WEEK_STILL_IN_PROGRESS"))
      throw new Error("The week must finish before payroll can be approved.");
    if (reason.includes("WEEK_HAS_UNRESOLVED_SHIFTS"))
      throw new Error("Review open or exceptional shifts before approving this driver’s week.");
    if (reason.includes("NO_ELIGIBLE_SHIFTS"))
      throw new Error("There are no unapproved eligible shifts for this week.");
    if (reason.includes("APPROVAL_NOTE_REQUIRED"))
      throw new Error("Explain the weekly approval in at least 20 characters.");
    throw new Error("Secure weekly payroll review is unavailable. No payroll decision was made.");
  }
  return data as unknown as WeeklyPayrollPreview;
}
