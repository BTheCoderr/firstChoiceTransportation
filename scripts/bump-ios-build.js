#!/usr/bin/env node
/**
 * Auto-increment iOS build number before EAS build.
 *
 * When a checked-in ios/ folder exists (bare workflow), updates Info.plist,
 * project.pbxproj, and app.config.ts.
 *
 * When ios/ is absent (managed workflow / EAS prebuild only), bumps only
 * app.config.ts (ios.buildNumber + android.versionCode kept in sync).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const INFO_PLIST = path.join(
  ROOT,
  "ios/FirstChoiceTransportation/Info.plist"
);
const PBXPROJ = path.join(
  ROOT,
  "ios/FirstChoiceTransportation.xcodeproj/project.pbxproj"
);
const APP_CONFIG = path.join(ROOT, "app.config.ts");

function plistExists() {
  try {
    fs.accessSync(INFO_PLIST, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function getCurrentBuildFromPlist() {
  const plist = fs.readFileSync(INFO_PLIST, "utf8");
  const m = plist.match(
    /<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/
  );
  return m ? parseInt(m[1], 10) : 1;
}

function getCurrentBuildFromAppConfig() {
  const config = fs.readFileSync(APP_CONFIG, "utf8");
  const m = config.match(/buildNumber:\s*"(\d+)"/);
  return m ? parseInt(m[1], 10) : 1;
}

function setBuildNumberNative(n) {
  const nStr = String(n);

  let plist = fs.readFileSync(INFO_PLIST, "utf8");
  plist = plist.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)\d+(<\/string>)/,
    `$1${nStr}$2`
  );
  fs.writeFileSync(INFO_PLIST, plist);

  let pbx = fs.readFileSync(PBXPROJ, "utf8");
  pbx = pbx.replace(
    /CURRENT_PROJECT_VERSION = \d+;/g,
    `CURRENT_PROJECT_VERSION = ${n};`
  );
  fs.writeFileSync(PBXPROJ, pbx);
}

function setAppConfigBuildAndVersionCode(n) {
  const nStr = String(n);
  let config = fs.readFileSync(APP_CONFIG, "utf8");
  config = config.replace(
    /buildNumber:\s*"\d+"/,
    `buildNumber: "${nStr}"`
  );
  config = config.replace(
    /versionCode:\s*\d+/,
    `versionCode: ${n}`
  );
  fs.writeFileSync(APP_CONFIG, config);
}

const hasNativeIos = plistExists();
const current = hasNativeIos
  ? getCurrentBuildFromPlist()
  : getCurrentBuildFromAppConfig();
const next = current + 1;

if (hasNativeIos) {
  setBuildNumberNative(next);
}
setAppConfigBuildAndVersionCode(next);

console.log(
  hasNativeIos
    ? `✓ iOS build number bumped to ${next} (native + app.config.ts)`
    : `✓ iOS buildNumber / android versionCode bumped to ${next} (app.config.ts only; no ios/ folder)`
);
