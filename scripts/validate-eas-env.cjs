#!/usr/bin/env node
// EAS runs this after installing dependencies, before creating a signed mobile
// artifact. Never print keys or the full build environment in CI logs.
const ref = "xxrxzpktxeaplsnatcvn";
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
const key = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const failures = [];
try {
  const u = new URL(url);
  if (u.protocol !== "https:" || u.hostname !== ref + ".supabase.co" ||
      u.username || u.password || u.pathname !== "/" || u.search || u.hash) {
    failures.push("EXPO_PUBLIC_SUPABASE_URL must identify the existing First Choice Supabase project over HTTPS");
  }
} catch {
  failures.push("EXPO_PUBLIC_SUPABASE_URL is missing or invalid");
}
if (!key) {
  failures.push("EXPO_PUBLIC_SUPABASE_ANON_KEY is missing");
} else if (key.startsWith("sb_secret_")) {
  failures.push("A Supabase secret key must never be bundled into a mobile app");
} else if (key.startsWith("sb_publishable_")) {
  // Intended to be public in mobile applications, with database access controlled by RLS.
} else if (key.startsWith("eyJ")) {
  // Legacy public ANON JWT is allowed. Reject service_role or other privileged tokens.
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    if (payload.role !== "anon") {
      failures.push("EXPO_PUBLIC_SUPABASE_ANON_KEY must be the public anon JWT, not a privileged key");
    }
  } catch {
    failures.push("EXPO_PUBLIC_SUPABASE_ANON_KEY is not a valid anon JWT");
  }
} else {
  failures.push("EXPO_PUBLIC_SUPABASE_ANON_KEY must be a public publishable key or anon JWT");
}
if (failures.length) {
  for (const failure of failures) console.error("First Choice EAS integration: " + failure);
  console.error("Set the public EXPO_PUBLIC_* values in the matching EAS preview/production environment. Nothing is printed or uploaded.");
  process.exit(1);
}
console.log("First Choice EAS integration: correct Supabase host and public client key type confirmed.");
