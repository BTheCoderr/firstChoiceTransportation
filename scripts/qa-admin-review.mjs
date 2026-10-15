import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function read(path) { return readFileSync(new URL("../" + path, import.meta.url), "utf8"); }
function loadTypeScript(path) {
  const source = read(path);
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  }}).outputText;
  const module = { exports: {} };
  new Function("module", "exports", js)(module, module.exports);
  return module.exports;
}
const { assessRouteEvidence } = loadTypeScript("src/utils/gpsDiagnostics.ts");
const { parseLocalReviewTime, formatLocalReviewTime } = loadTypeScript("src/utils/shiftReviewTime.ts");

const base = { start_lat: 41.82, start_lng: -71.41,
  return_base_lat: 41.83, return_base_lng: -71.42,
  clock_in_at: "2026-10-13T14:00:00Z", clock_out_at: "2026-10-13T22:00:00Z" };
function point(latitude, longitude, accuracy = 20, recorded_at = "2026-10-13T15:00:00Z") {
  return { latitude, longitude, accuracy, recorded_at, speed: 2 };
}
assert.deepEqual(assessRouteEvidence(point(41.82, -71.41), base), []);
assert.match(assessRouteEvidence(point(39.9, 116.4), base).join(";"), /outside the expected US/);
assert.match(assessRouteEvidence(point(39.9, 116.4), base).join(";"), /250 km/);
assert.match(assessRouteEvidence(point(41.82, -71.41, 900), base).join(";"), /Low-confidence/);
assert.match(assessRouteEvidence(point(41.82, -71.41, 10, "2026-10-11T12:00:00Z"), base).join(";"), /outside the shift time/);
assert.equal(parseLocalReviewTime("2026-02-30", "12:00"), null);
assert.equal(parseLocalReviewTime("2026-10-14", "25:00"), null);
assert.equal(parseLocalReviewTime("2026-10-14", "15:45")?.getHours(), 15);
process.env.TZ = "America/New_York";
assert.equal(parseLocalReviewTime("2026-03-08", "02:30"), null); // spring DST gap
assert.equal(parseLocalReviewTime("2026-11-01", "01:30"), null); // repeated fall clock hour
assert.deepEqual(formatLocalReviewTime("2026-10-14T15:45:00Z").date.length, 10);
const migration = read("supabase/migrations/027_admin_payroll_decisions.sql");
assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
assert.match(migration, /REVOKE ALL ON public.shift_payroll_reviews/);
assert.match(migration, /admin_decide_shift_payroll/);
assert.match(migration, /ON CONFLICT \(shift_id\)/);
assert.match(migration, /SHIFT_STILL_OPEN/);
assert.match(migration, /USE_RECOVERY_APPROVAL/);
assert.match(migration, /trg_record_recovered_payroll_decision/);
assert.match(migration, /record_recovered_payroll_decision/);
assert.match(migration, /INSERT INTO public.shift_payroll_review_events/);
assert.doesNotMatch(migration, /UPDATE public\.shifts/);
assert.doesNotMatch(migration, /DELETE FROM public\.shifts/);
const service = read("src/services/admin.ts");
assert.match(service, /if \(payable == null\) continue/);
assert.match(service, /cur\.minutes \+= payable/);
assert.doesNotMatch(service, /cur\.minutes \+= approved\.get\(s\.id\) \?\? 0/);
assert.doesNotMatch(service, /cur\.minutes \+= s\.verified_hours_minutes/);

assert.match(service, /getPayrollReview\(shiftId\),/);
assert.match(service, /getPayrollReviewEvents\(shiftId\),/);
assert.doesNotMatch(service, /getPayrollReview\(shiftId\)\.catch\(/);
assert.doesNotMatch(service, /getPayrollReviewEvents\(shiftId\)\.catch\(/);
assert.match(service, /if \(routeRes\.error \|\| stopsRes\.error \|\| auditRes\.error\)/);
const detailScreen = read("app/(admin)/shift/[id].tsx");
assert.match(detailScreen, /Retry loading shift/);
assert.match(detailScreen, /setLoadError\("Unable to load shift evidence/);
assert.match(detailScreen, /setData\(null\)/);
const shiftHook = read("src/hooks/useDriverShift.ts");
assert.doesNotMatch(shiftHook, /dropoffLat,\s*dropoffLng,\s*\n\s*\}\)/);
assert.match(shiftHook, /if \(__DEV__\) console\.info\("\[FinalDropoff\] completion requested"\)/);
assert.match(read("src/components/admin/AdminShiftDecisionPanel.tsx"), /Confirm decision and save audit/);
assert.match(read("app/(admin)/reviews.tsx"), /Shift Review Center/);
assert.match(read("src/components/help/HelpGuide.tsx"), /Administrator Guide/);
const supportSql = read("supabase/migrations/028_support_tickets.sql");
assert.match(supportSql, /CREATE TABLE IF NOT EXISTS public.support_tickets/);
assert.match(supportSql, /CREATE TABLE IF NOT EXISTS public.support_ticket_messages/);
assert.match(supportSql, /ENABLE ROW LEVEL SECURITY/g);
assert.match(supportSql, /REVOKE ALL ON public.support_tickets FROM PUBLIC, anon, authenticated/);
assert.match(supportSql, /created_by = auth.uid\(\)/);
assert.match(supportSql, /role = 'admin'/);
assert.match(supportSql, /TICKET_RATE_LIMIT/);
assert.match(supportSql, /TICKET_NOT_FOUND/);
assert.match(supportSql, /admin_update_support_ticket/);
assert.doesNotMatch(supportSql, /DELETE FROM public.support_tickets/);
const supportCode = read("src/components/help/SupportCenter.tsx");
assert.match(supportCode, /Send message/);
assert.match(supportCode, /Save audited decision/);
const nativePicker = read("src/components/admin/ReviewedEndTimePicker.tsx");
assert.match(nativePicker, /@react-native-community\/datetimepicker/);
assert.match(nativePicker, /DateTimePicker/);
const dep = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
assert.equal(dep.dependencies["@react-native-community/datetimepicker"], "8.4.4");
// Production App Store submission must be an explicit human-reviewed step.
assert.doesNotMatch(dep.scripts["build:ios"], /--auto-submit/);
assert.match(dep.scripts["build:ios:preview"], /--profile preview/);
assert.match(dep.scripts["submit:ios"], /eas submit --platform ios/);
assert.equal(lock.packages["node_modules/@react-native-community/datetimepicker"].version, "8.4.4");
// Additional release audit guardrails: account deletion entry and reset-link safety.
const profileScreen = read("app/(driver)/profile.tsx");
assert.match(profileScreen, /Request account deletion/);
const deletion = read("app/(driver)/delete-account.tsx");
assert.match(deletion, /createTicket/);
assert.match(deletion, /Account deletion request/);
assert.doesNotMatch(deletion, /auth\.admin\.deleteUser/);
const bridge = read("web/src/app/auth/reset-password/page.tsx");
assert.match(bridge, /getRecoveryRedirect/);
assert.match(bridge, /if \(!target\)/);
assert.match(bridge, /"recovery"/);
assert.doesNotMatch(bridge, /window\.location\.replace\(\x60\$\{APP_DEEP_LINK\}/);
const mainApp = read("app.config.ts");
assert.match(mainApp, /userInterfaceStyle: "light"/);
assert.match(mainApp, /During an active shift/);
const baseFiles = ["FIX_admin_role.sql", "FIX_auth_users_null_tokens.sql",
  "FIX_ensure_profile_manual.sql", "FIX_profiles_direct.sql",
  "FIX_profiles_manual_insert.sql", "FIX_sync_profiles.sql"];
for (const name of baseFiles) {
  assert.throws(() => read("supabase/" + name), /ENOENT/, "retired legacy SQL: " + name);
}

// Immediate pre-020 production payroll hardening must deny direct changes to
// payable minutes, employee identity, week assignment, and completed-shift inserts.
const compatSql = read("supabase/migrations/030_legacy_shift_payroll_guard.sql");
assert.match(compatSql, /CREATE TRIGGER guard_legacy_client_shift_mutations/);
assert.match(compatSql, /BEFORE INSERT OR UPDATE OR DELETE ON public.shifts/);
assert.match(compatSql, /NEW.clock_in_at := v_now/);
assert.match(compatSql, /NEW.verified_hours_minutes IS NOT NULL/);
assert.match(compatSql, /NEW.clock_out_at IS NOT NULL/);
assert.match(compatSql, /current_user NOT IN \('authenticated','anon'\)/);
assert.match(compatSql, /to_jsonb\(NEW\) - v_mutable/);
assert.match(compatSql, /REVOKE DELETE, TRUNCATE, TRIGGER, REFERENCES/);
assert.doesNotMatch(compatSql, /DELETE FROM public.shifts/);
assert.doesNotMatch(compatSql, /UPDATE public.shifts SET/);
const compatGrantSql = read("supabase/migrations/031_legacy_shift_column_privileges.sql");
assert.match(compatGrantSql, /REVOKE UPDATE ON TABLE public.shifts FROM PUBLIC, anon, authenticated/);
assert.match(compatGrantSql, /GRANT UPDATE \(/);
assert.match(compatGrantSql, /has_column_privilege\('authenticated','public.shifts','verified_hours_minutes','UPDATE'\)/);
assert.doesNotMatch(compatGrantSql, /UPDATE public\.shifts SET/);
// Legacy final-dropoff must not mint client-chosen commute pay or auto-approve a shift.
const compatEndSql = read("supabase/migrations/032_safe_legacy_shift_completion.sql");
assert.match(compatEndSql, /CREATE OR REPLACE FUNCTION public.complete_driver_shift/);
assert.match(compatEndSql, /clock_out_at = v_now/);
assert.match(compatEndSql, /verified_hours_minutes = NULL/);
assert.match(compatEndSql, /estimated_return_minutes = NULL/);
assert.match(compatEndSql, /'driver_end_pending_payroll_review'/);
assert.match(compatEndSql, /p.company_id = s.company_id/);
assert.doesNotMatch(compatEndSql, /return_minutes :=|v_return_minutes :=/);
assert.doesNotMatch(compatEndSql, /INSERT INTO public\.route_points/);
assert.doesNotMatch(compatEndSql, /INSERT INTO public\.shift_payroll_reviews/);
// Weekly approval is a one-tap-per-driver/pay-period transaction, not daily approval.
const weekly = read("supabase/migrations/033_weekly_driver_payroll_approval.sql");
assert.match(weekly, /CREATE OR REPLACE FUNCTION public.admin_review_driver_week/);
assert.match(weekly, /America\/New_York/g);
assert.match(weekly, /WEEK_STILL_IN_PROGRESS/);
assert.match(weekly, /WEEK_HAS_UNRESOLVED_SHIFTS/);
assert.match(weekly, /crosses_pay_period_boundary/);
assert.match(weekly, /legacy_recorded_pay_requires_review/);
assert.match(weekly, /v_row\.manual_recovery/);
assert.match(weekly, /FOR UPDATE/);
assert.match(weekly, /INSERT INTO public.shift_payroll_reviews/);
assert.match(weekly, /INSERT INTO public.shift_payroll_review_events/);
assert.doesNotMatch(weekly, /UPDATE public\.shifts SET/);
assert.doesNotMatch(weekly, /DELETE FROM public\.shifts/);
assert.match(weekly, /v_now < v_until/);
assert.match(weekly, /GRANT EXECUTE ON FUNCTION public.admin_review_driver_week\(uuid,date,text,boolean\)/);
const weeklyScreen = read("app/(admin)/weekly.tsx");
assert.match(weeklyScreen, /Weekly payroll approval/);
assert.match(weeklyScreen, /Approve completed payroll week/);
assert.match(weeklyScreen, /reviewDriverPayrollWeek/);
assert.match(weeklyScreen, /preview\.exceptionCount/);
assert.match(weeklyScreen, /preview\.canApprove/);
const { easternPayrollWeekStart } = loadTypeScript("src/utils/payrollWeek.ts");
assert.equal(easternPayrollWeekStart(new Date("2026-10-15T16:00:00Z")), "2026-10-05");
assert.equal(easternPayrollWeekStart(new Date("2026-10-15T16:00:00Z"), 0), "2026-10-12");
assert.equal(easternPayrollWeekStart(new Date("2026-03-09T01:00:00Z"), 0), "2026-03-02"); // still Sunday night in NY
assert.equal(easternPayrollWeekStart(new Date("2026-03-09T05:00:00Z"), 0), "2026-03-09");

// Interrupted invitation repair must be bound to a trusted provisioning key
// and cannot delete/reassign existing Auth identities.
const inviteRecoverySql = read("supabase/migrations/029_finish_driver_provisioning.sql");
assert.match(inviteRecoverySql, /CREATE OR REPLACE FUNCTION public\.finalize_driver_provisioning/);
assert.match(inviteRecoverySql, /v_user\.raw_app_meta_data->>'first_choice_provisioning_key'/);
assert.match(inviteRecoverySql, /v_intent\.provisioning_key::text/);
assert.match(inviteRecoverySql, /v_intent\.created_by/);
assert.match(inviteRecoverySql, /company_id = p_company_id/);
assert.match(inviteRecoverySql, /v_intent\.created_at|created_at > clock_timestamp\(\)/);
assert.match(inviteRecoverySql, /REVOKE ALL ON FUNCTION public\.finalize_driver_provisioning\(text,uuid\)/);
assert.match(inviteRecoverySql, /TO service_role/);
assert.doesNotMatch(inviteRecoverySql, /DELETE FROM (public\.profiles|auth\.users)/);
const createDriverFunction = read("supabase/functions/create-driver/index.ts");
assert.match(createDriverFunction, /finalize_driver_provisioning/);
assert.match(createDriverFunction, /existingState === "recovered"/);
assert.match(createDriverFunction, /existingState === "pending_activation"/);
assert.match(createDriverFunction, /existingState !== "not_found"/);
assert.match(createDriverFunction, /getUser\(token\)/);
assert.match(createDriverFunction, /admin\.role !== "admin"/);
assert.match(read("app/(admin)/create-driver.tsx"), /result\.message/);
console.log("Admin review, secure support, GPS evidence, native picker and payroll QA passed.");
