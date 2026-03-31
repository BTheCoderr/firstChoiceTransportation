#!/usr/bin/env node
/**
 * Creates minimal placeholder PNG assets for Expo.
 * Run: node scripts/create-placeholder-assets.js
 */
const fs = require("fs");
const path = require("path");

// Minimal 1x1 transparent PNG (valid PNG file)
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const assetsDir = path.join(__dirname, "..", "assets");
const files = ["icon.png", "splash-icon.png", "adaptive-icon.png"];

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

for (const file of files) {
  fs.writeFileSync(path.join(assetsDir, file), MINIMAL_PNG);
  console.log(`Created ${file}`);
}

console.log("Placeholder assets created. Replace with proper icons before production.");
