#!/usr/bin/env node
/**
 * Non-mutating post-deploy integration smoke for First Choice's public website.
 * Do not put live recovery tokens, employee emails or payroll data into URLs.
 */
import assert from "node:assert/strict";

const origin = "https://firstchoicetransportation.netlify.app";
const pages = [
  { path: "/", marker: "First Choice Transportation" },
  { path: "/auth/reset-password", marker: "Password reset link unavailable", noRedirect: true },
  { path: "/support/", marker: "App support" },
  { path: "/privacy/", marker: "Privacy information" },
];

async function assertLivePage({path,marker,noRedirect}) {
  let last = "unknown error";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(origin + path, {
        redirect: noRedirect ? "manual" : "follow",
        signal: AbortSignal.timeout(12000),
        headers: { Accept: "text/html", "User-Agent": "FirstChoiceReleaseSmoke/1" },
      });
      if (res.status !== 200) throw new Error("HTTP " + res.status);
      if (!String(res.headers.get("content-type")).includes("text/html")) {
        throw new Error("Response was not HTML");
      }
      const body = await res.text();
      assert.ok(body.includes(marker), "Page marker not found: " + marker);
      console.log("OK", path, "(HTTP 200, expected content)");
      return;
    } catch (error) {
      last = error instanceof Error ? error.message : "request failed";
      if (attempt < 4) await new Promise(resolve=>setTimeout(resolve,1000*attempt));
    }
  }
  throw new Error("First Choice public website smoke failed at " + path + ": " + last);
}
for (const page of pages) await assertLivePage(page);
console.log("Published First Choice website, support, privacy and password recovery bridge verified.");
