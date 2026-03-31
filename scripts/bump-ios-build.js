#!/usr/bin/env node
/**
 * Auto-increment iOS build number before EAS build.
 * Updates: Info.plist, project.pbxproj, app.config.ts
 * Run before each build to avoid "bundle version must be higher" errors.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const INFO_PLIST = path.join(ROOT, "ios/FirstChoiceTransportation/Info.plist");
const PBXPROJ = path.join(ROOT, "ios/FirstChoiceTransportation.xcodeproj/project.pbxproj");
const APP_CONFIG = path.join(ROOT, "app.config.ts");

function getCurrentBuild() {
  const plist = fs.readFileSync(INFO_PLIST, "utf8");
  const m = plist.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
  return m ? parseInt(m[1], 10) : 1;
}

function setBuildNumber(n) {
  const nStr = String(n);

  // Info.plist
  let plist = fs.readFileSync(INFO_PLIST, "utf8");
  plist = plist.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)\d+(<\/string>)/,
    `$1${nStr}$2`
  );
  fs.writeFileSync(INFO_PLIST, plist);

  // project.pbxproj
  let pbx = fs.readFileSync(PBXPROJ, "utf8");
  pbx = pbx.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${n};`);
  fs.writeFileSync(PBXPROJ, pbx);

  // app.config.ts (for consistency)
  let config = fs.readFileSync(APP_CONFIG, "utf8");
  config = config.replace(/buildNumber: "\d+"/, `buildNumber: "${nStr}"`);
  fs.writeFileSync(APP_CONFIG, config);

  console.log(`✓ iOS build number bumped to ${nStr}`);
}

const current = getCurrentBuild();
const next = current + 1;
setBuildNumber(next);
