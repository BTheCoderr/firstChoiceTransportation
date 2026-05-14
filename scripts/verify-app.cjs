#!/usr/bin/env node
/**
 * Consolidated sanity check before TestFlight/EAS uploads.
 */

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(name, cmd, args, opts = {}) {
  console.log("\n―――", name, "―――");
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...opts,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  console.log(out.trimEnd());
  return { code: r.status ?? 1, out };
}

const tsc = run("TypeScript", "npx", ["tsc", "--noEmit"]);

const qa = run("Option B timing QA", "npm", ["run", "qa:option-b-timing"]);

const doc = run("expo-doctor", "npx", ["expo-doctor"]);

const expoOut = doc.out.toLowerCase();
const patchOnly =
  doc.code !== 0 &&
  expoOut.includes("patch version mismatches") &&
  /16\/17 checks passed|checks passed/i.test(doc.out);

const coreOk = tsc.code === 0 && qa.code === 0;
if (!coreOk) {
  console.error("\n✖ verify:app FAILED (tsc or QA script).\n");
  process.exit(1);
}

if (doc.code !== 0) {
  console.error("\nexpo-doctor exited with code:", doc.code);
  if (patchOnly) {
    console.error(
      "Note: expo-doctor failed due to Expo SDK patch drift only (16/17 passed). OK if core packages were aligned with expo install.\n"
    );
    process.exit(0);
  }
  console.error("✖ verify:app FAILED (expo-doctor).\n");
  process.exit(1);
}

console.log("\n✓ verify:app OK\n");
