#!/usr/bin/env node
/**
 * One-command First Choice release gate; never modifies production records,
 * runs EAS, uploads an artifact, or submits to Apple.
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const skipDoctor = process.argv.includes("--skip-expo-doctor");

const steps = [
  ["TypeScript", "npx", ["tsc", "--noEmit"]],
  ["Pinned navigation dependency", "npm", ["run", "deps:verify"]],
  ["Option B timing", "npm", ["run", "qa:option-b-timing"]],
  ["Release and security", "npm", ["run", "qa:release"]],
  ["Admin review and GPS", "npm", ["run", "qa:admin-review"]],
  ["Authentication and recovery", "npm", ["run", "qa:auth"]],
  ["Website production build", "npm", ["run", "build", "--prefix", "web"]],
];
if (!skipDoctor) {
  steps.push(["Expo Doctor", "npx", ["--yes", "expo-doctor"]]);
} else {
  console.warn("Expo Doctor skipped: this is a partial check, NOT a complete release verification.");
}

let failed = false;
for (const [label, command, args] of steps) {
  process.stdout.write("\n--- " + label + " ---\n");
  const result = spawnSync(command, args, {
    cwd: root, encoding: "utf8", stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, CI: "1" },
  });
  if (result.error || result.status !== 0) {
    console.error("FAILED: " + label + ". Resolve before requesting a native release.");
    failed = true;
    break;
  }
}
if (failed) process.exit(1);
console.log(skipDoctor ?
  "\nCore First Choice checks passed (Expo Doctor NOT run)." :
  "\nFirst Choice release checks passed; native iPhone device QA is still required.");
