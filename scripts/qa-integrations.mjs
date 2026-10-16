import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const appConfig = read("app.config.ts");
const nativeRecovery = read("src/auth/passwordRecovery.ts");
const trust = read("src/auth/trustedRecoveryCallback.ts");
const callback = read("src/auth/handleSupabaseAuthUrl.ts");
const bridge = read("web/src/app/auth/reset-password/page.tsx");
const netlify = read("netlify.toml");
const edge = read("supabase/functions/create-driver/index.ts");
const nativeDriver = read("src/services/adminDriverCreation.ts");
const eas = JSON.parse(read("eas.json"));
const packageConfig = JSON.parse(read("package.json"));
const iosWorkflow = read(".github/workflows/ios-preview.yml");
const siteWorkflow = read(".github/workflows/deploy-website.yml");
const ci = read(".github/workflows/ci.yml");
const redirect = "https://firstchoicetransportation.netlify.app/auth/reset-password";
assert.ok(nativeRecovery.includes(redirect), "App uses approved HTTPS recovery bridge");
assert.ok(edge.includes(redirect), "Server invitation link uses the same bridge");
assert.match(bridge, /const APP_DEEP_LINK = "firstchoice:\/\/update-password"/);
assert.match(bridge, /getRecoveryRedirect/);
assert.match(bridge, /const hasPkceCode/);
assert.match(bridge, /const hasVerification/);
assert.match(bridge, /const hasSession/);
assert.match(callback, /isTrustedRecoveryCallback/);
assert.match(trust, /firstchoicetransportation\.netlify\.app/);
assert.match(netlify, /from = "\/auth\/reset-password"/);
assert.match(netlify, /to = "\/auth\/reset-password\/index\.html"/);
assert.match(netlify, /status = 200/);
assert.match(netlify, /force = true/);
assert.match(nativeDriver, /functions\/v1\/create-driver/);
assert.match(nativeDriver, /Authorization: `Bearer \$\{accessToken\}`/);
assert.match(edge, /server\.auth\.getUser\(token\)/);
assert.match(edge, /finalize_driver_provisioning/);
assert.match(edge, /resetPasswordForEmail\(email/);
assert.match(appConfig, /owner: "bferrell514"/);
assert.match(appConfig, /projectId: "8c5af85c-7504-4425-8209-7d14ce0eedab"/);
assert.match(appConfig, /bundleIdentifier: "com\.firstchoicetransportation\.timesheet"/);
assert.match(appConfig, /supabaseAnonKey: process\.env\.EXPO_PUBLIC_SUPABASE_ANON_KEY/);
assert.equal(eas.cli.appVersionSource, "remote");
assert.equal(eas.build.preview.distribution, "internal");
assert.equal(eas.build.production.distribution, "store");
assert.match(iosWorkflow, /EXPO_TOKEN: \$\{\{ secrets\.EXPO_TOKEN \}\}/);
assert.match(siteWorkflow, /NETLIFY_AUTH_TOKEN/);
assert.match(siteWorkflow, /web\/out/);
assert.match(siteWorkflow, /exit 1/, "Missing deployment authorization must fail the job");
assert.doesNotMatch(siteWorkflow, /workflow_dispatch:/, "Unverified manual deploy may bypass required CI");
assert.match(siteWorkflow, /node scripts\/qa-live-website\.mjs/, "Verify actual public pages after a successful deploy");
assert.match(read("scripts/qa-live-website.mjs"), /\/auth\/reset-password/, "Production recovery callback needs post-deploy smoke");
assert.match(read("scripts/qa-live-website.mjs"), /HTTP 200/, "Public website verification needs real 200 responses");
assert.equal(packageConfig.scripts["eas-build-post-install"], "node scripts/validate-eas-env.cjs");
assert.match(ci, /npm run qa:integrations/);

// Validate without ever creating or exposing real Supabase secrets.
const projectUrl = "https://xxrxzpktxeaplsnatcvn.supabase.co";
const token = role => "eyJhbGciOiJIUzI1NiJ9." +
  Buffer.from(JSON.stringify({ role })).toString("base64url") + ".signature";
const cases = [
  ["legacy anon JWT", projectUrl, token("anon"), true],
  ["public publishable", projectUrl, "sb_publishable_example_test", true],
  ["wrong project", "https://unrelated.supabase.co", token("anon"), false],
  ["non-HTTPS", "http://xxrxzpktxeaplsnatcvn.supabase.co", token("anon"), false],
  ["no key", projectUrl, "", false],
  ["service_role token", projectUrl, token("service_role"), false],
  ["server secret", projectUrl, "sb_secret_do_not_bundle", false],
];
for (const [label,url,key,expected] of cases) {
  const p = spawnSync(process.execPath, ["scripts/validate-eas-env.cjs"], {
    cwd: new URL("../", import.meta.url), encoding:"utf8",
    env: { ...process.env, EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_ANON_KEY:key },
  });
  assert.equal(p.status===0, expected, label);
  assert.ok(!(p.stdout+p.stderr).includes(key) || key==="", "never echo client key: "+label);
}
console.log("First Choice Netlify/Supabase/EAS integration configuration checks passed.");
