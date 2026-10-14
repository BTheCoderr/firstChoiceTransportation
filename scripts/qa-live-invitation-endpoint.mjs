import assert from "node:assert/strict";

/**
 * Non-mutating production smoke test for First Choice's admin invitation API.
 * Never sends a valid admin session, creates a user, or requests an email.
 *
 * A live function that returns 503, falls back to a maintenance stub, or
 * unexpectedly permits unauthenticated requests MUST fail release CI.
 */
const url = "https://xxrxzpktxeaplsnatcvn.supabase.co/functions/v1/create-driver";

async function check(method, token, expectedStatus, expectedError) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify({ email: "nobody@example.invalid" }) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(
    response.status, expectedStatus,
    `${method} with ${token ? "invalid credentials" : "no credentials"} returned HTTP ${response.status} (expected ${expectedStatus})`
  );

  if (expectedError) {
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.error, expectedError);
  }
}

await check("GET", null, 405, "Method not allowed");
await check("POST", null, 401, "Sign in as an administrator first.");
await check("POST", "not-a-real-admin-session", 401,
  "Invalid or expired administrator session.");

console.log("Live admin-invitation endpoint rejected unauthenticated requests; no accounts or emails created.");
