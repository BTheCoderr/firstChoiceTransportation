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
assert.equal(eas.cli.appVersionSource, "remote", "Versioning should be managed by EAS");
assert.equal(eas.build.production.autoIncrement, true, "Release builds must advance build number");
assert.doesNotMatch(config, /buildNumber:|versionCode:/, "Static build numbers must not conflict with remote versions");
for (const page of ["/support", "/privacy"]) {
  assert.ok(nav.includes(`href: "${page}"`), `Navigation must include ${page}`);
  assert.match(read(`web/src/app${page}/page.tsx`), /export default function/, `Missing ${page} page`);
}
console.log("Release/security regression checks passed");
