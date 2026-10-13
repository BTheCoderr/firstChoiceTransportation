import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const functionSource = read("supabase/functions/create-driver/index.ts");
const policySource = read("supabase/migrations/016_disallow_signup_admin_role.sql");
const protectedFieldsSource = read("supabase/migrations/017_protect_profile_privileges.sql");
const rpcHardeningSource = read("supabase/migrations/018_harden_legacy_rpcs.sql");
const shiftRpcSource = read("supabase/migrations/019_server_shift_rpcs.sql");
const cutoverSource = read("supabase/migrations/020_lock_client_shift_writes_after_rollout.sql");
const shiftServiceSource = read("src/services/shifts.ts");
const endShiftSource = read("src/services/endShift.ts");
const routePolicySource = read("supabase/migrations/021_limit_route_points_to_open_shifts.sql");
const adminServiceSource = read("src/services/admin.ts");
const geofenceSource = read("supabase/migrations/022_gps_auto_clockout_staged.sql");
const driverHomeSource = read("app/(driver)/index.tsx");
const shiftHookSource = read("src/hooks/useDriverShift.ts");
const shiftLookupSource = read("src/services/shifts.ts");
const driverShiftSource = read("app/(driver)/shift.tsx");
const backgroundTaskSource = read("src/tasks/backgroundLocationTask.ts");
const eas = JSON.parse(read("eas.json"));
const config = read("app.config.ts");
const nav = read("web/src/components/Nav.tsx");

assert.match(functionSource, /supabase\.auth\.getUser\(token\)/, "Create-driver must validate the caller token with Auth");
assert.doesNotMatch(functionSource, /getUserIdFromJwt|atob\(base64\)/, "Decoding a JWT payload is not authentication");
assert.match(functionSource, /profile\.role !== "admin"/, "Function must check trusted database role");
assert.match(policySource, /'driver'::public\.user_role/, "New accounts must default to driver");
assert.doesNotMatch(policySource, /raw_user_meta_data->>'role'/, "User metadata must not set an authorization role");
assert.match(protectedFieldsSource, /current_user IN \('authenticated', 'anon'\)/, "Only trusted operators can alter protected profile fields");
assert.match(protectedFieldsSource, /NEW.role IS DISTINCT FROM OLD.role/, "Block self-promotion by profile update");
assert.match(rpcHardeningSource, /get_driver_weekly_hours\(uuid, date\) SECURITY INVOKER/, "Weekly RPC must use caller RLS");
assert.match(rpcHardeningSource, /sync_orphan_profiles\(\) FROM PUBLIC, anon, authenticated/, "Orphan sync must not be accessible to users");
assert.match(shiftRpcSource, /auth.uid\(\)/, "Both shift RPCs require authenticated identity");
assert.match(shiftRpcSource, /FOR UPDATE OF s/, "Shift completion must lock the active shift row");
assert.match(shiftRpcSource, /clock_timestamp\(\)/, "Shift times must come from the server");
assert.match(shiftRpcSource, /REVOKE ALL ON FUNCTION public.complete_driver_shift/, "RPC calls must be restricted");
assert.match(cutoverSource, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.shifts/, "Cutover must revoke arbitrary driver payroll writes");
assert.match(shiftServiceSource, /supabase.rpc\("start_driver_shift"/, "Start must call server RPC");
assert.match(endShiftSource, /supabase.rpc\("complete_driver_shift"/, "Final dropoff must call server RPC");
assert.doesNotMatch(endShiftSource, /\.from\("shifts"\)\.update/, "Final dropoff must not write payroll fields from the device");
assert.match(routePolicySource, /s.clock_out_at IS NULL/, "GPS uploads must be limited to open shifts");
assert.match(adminServiceSource, /getWeekEndExclusive\(weekStart\)/, "Weekly report must end at next Monday");
assert.match(adminServiceSource, /\.lt\("clock_in_at", weekEnd\)/, "Weekly report must use exclusive full-week end");
assert.doesNotMatch(adminServiceSource, /T23:59:59/, "Do not end weekly report on its first day");
assert.match(geofenceSource, /enabled boolean NOT NULL DEFAULT false/, "Auto clock-out must remain disabled until native rollout");
assert.match(geofenceSource, /clock_out_method','gps_confirmed_base_arrival'/, "Arrival-based auto clock-out must retain audit method");
assert.match(geofenceSource, /dwell_seconds integer NOT NULL DEFAULT 180/, "GPS dwell requirement must be defined");
assert.match(geofenceSource, /lower\(trim\(b.name\)\) IN \('home', 'office'\)/, "Both registered bases can confirm return");
for (const [name, screen] of [["Home", driverHomeSource], ["Shift", driverShiftSource]]) {
  assert.match(screen, /AutoClockOutCard/, `${name} must present automatic clock-out`);
  assert.doesNotMatch(screen, /FinalDropoffCard|handleFinalDropoff/, `${name} must not offer manual clock-out`);
}
assert.match(backgroundTaskSource, /GEOFENCE_TASK_NAME/, "Background task must register return-base geofence");
assert.match(backgroundTaskSource, /shiftState\?\.clock_out_at/, "Background tracking must stop after server closes the shift");
assert.match(shiftLookupSource, /export async function lookupActiveShiftForDriver/, "Use distinguishable shift query status");
assert.match(shiftHookSource, /if \(!lookup.ok\) return/, "GPS poll must ignore network failures");
assert.match(driverHomeSource, /const permissionGranted = await requestPermissions\(\)/, "Clock-in requires always-on GPS authorization");
assert.match(driverHomeSource, /const hasReturnBase = bases.some/, "Clock-in requires an approved Home or Office");
assert.equal(eas.cli.appVersionSource, "remote", "Versioning should be managed by EAS");
assert.equal(eas.build.production.autoIncrement, true, "Release builds must advance build number");
assert.doesNotMatch(config, /buildNumber:|versionCode:/, "Static build numbers must not conflict with remote versions");
for (const page of ["/support", "/privacy"]) {
  assert.ok(nav.includes(`href: "${page}"`), `Navigation must include ${page}`);
  assert.match(read(`web/src/app${page}/page.tsx`), /export default function/, `Missing ${page} page`);
}
console.log("Release/security regression checks passed");
