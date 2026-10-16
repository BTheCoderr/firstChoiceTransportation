import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

function loadPureTypeScript(path) {
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", compiled)(module, module.exports);
  return module.exports;
}

const { isTrustedRecoveryCallback } =
  loadPureTypeScript("src/auth/trustedRecoveryCallback.ts");

// Real links support both ?code= and implicit #access_token= variants.
for (const url of [
  "firstchoice://update-password?code=one-use-auth-code",
  "firstchoice:///update-password#access_token=abc&refresh_token=def&type=recovery",
  "https://firstchoicetransportation.netlify.app/auth/reset-password?code=one-use",
]) {
  assert.equal(isTrustedRecoveryCallback(url), true, url);
}
// Never apply login/recovery tokens from a different site or app screen.
for (const url of [
  "",
  "https://evil.example/auth/reset-password?access_token=stolen",
  "http://firstchoicetransportation.netlify.app/auth/reset-password?code=abc",
  "https://firstchoicetransportation.netlify.app.evil.example/auth/reset-password",
  "https://firstchoicetransportation.netlify.app/?code=abc",
  "firstchoice://index?access_token=abc",
  "firstchoice://update-password.evil.example?code=abc",
  "firstchoice://update-password/other?code=abc",
  "not-a-url",
]) {
  assert.equal(isTrustedRecoveryCallback(url), false, url);
}

const authProvider = read("src/providers/AuthProvider.tsx");
const login = read("app/(auth)/index.tsx");
const reset = read("app/(auth)/update-password.tsx");
const profile = read("src/services/profile.ts");
const logout = read("src/components/LogoutButton.tsx");
const deepLink = read("src/auth/handleSupabaseAuthUrl.ts");
const recovery = read("src/auth/passwordRecovery.ts");
const bridge = read("web/src/app/auth/reset-password/page.tsx");
const rootGate = read("app/index.tsx");

assert.match(login, /try\s*\{[\s\S]*?signInWithPassword/);
assert.match(login, /finally\s*\{\s*setIsSubmitting\(false\)/);
assert.match(login, /Could not reach the sign-in service/);
assert.ok(login.includes('setPassword("")'));
assert.match(logout, /scope: "local"|await signOut\(\)/);
assert.match(logout, /catch\s*\{[\s\S]*?Sign out failed/);
assert.match(authProvider, /signOut\(\{ scope: "local" \}\)/);
assert.match(authProvider, /profileErrorMessage\("NETWORK_ERROR"\)/);
assert.match(authProvider, /Could not process the link/);
assert.match(profile, /error: "NETWORK_ERROR"/);
assert.match(profile, /Check your connection and tap Retry/);
assert.match(reset, /!user \|\| !recoveryInProgress/);
assert.match(reset, /session\.user\.id !== user\.id/);
assert.match(reset, /Request a new link/);
assert.match(reset, /scope: "local"/);
assert.match(deepLink, /if \(!isTrustedRecoveryCallback\(url\)\) return false/);
assert.match(recovery, /!isTrustedRecoveryCallback\(url\)/);
assert.match(bridge, /Password reset link unavailable/);
assert.match(rootGate, /pathnameMatchesRecoveryUpdatePassword/);
console.log("Authentication, device logout, recovery-link and retry regression QA passed.");
