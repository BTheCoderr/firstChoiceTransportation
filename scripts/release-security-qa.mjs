import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const functionSource = read("supabase/functions/create-driver/index.ts");
const policySource = read("supabase/migrations/016_disallow_signup_admin_role.sql");
const protectedFieldsSource = read("supabase/migrations/017_protect_profile_privileges.sql");
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
assert.equal(eas.cli.appVersionSource, "remote", "Versioning should be managed by EAS");
assert.equal(eas.build.production.autoIncrement, true, "Release builds must advance build number");
assert.doesNotMatch(config, /buildNumber:|versionCode:/, "Static build numbers must not conflict with remote versions");
for (const page of ["/support", "/privacy"]) {
  assert.ok(nav.includes(`href: "${page}"`), `Navigation must include ${page}`);
  assert.match(read(`web/src/app${page}/page.tsx`), /export default function/, `Missing ${page} page`);
}
console.log("Release/security regression checks passed");
