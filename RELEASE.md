# Release Guide – First Choice Transportation

## What changed (fix for delivery failures)

The native `ios/` folder was overriding EAS remote versioning. It's now removed. EAS runs **prebuild** and applies the **remote build number** automatically. No more duplicate build errors.

---

## Quick reference

| Scenario | Command |
|----------|---------|
| **Same version, new build** | `npm run build:ios` |
| **New version** (1.0.0 → 1.0.1) | `npm run bump:version` then `npm run build:ios` |

---

## Same version, new build

EAS fetches the latest build number from App Store Connect and auto-increments. No manual changes.

```bash
npm run build:ios
```

---

## New version (e.g. 1.0.0 → 1.0.1)

1. Bump version:
   ```bash
   npm run bump:version        # 1.0.0 → 1.0.1 (patch)
   npm run bump:version:minor  # 1.0.0 → 1.1.0
   npm run bump:version:major  # 1.0.0 → 2.0.0
   ```

2. Build and submit:
   ```bash
   npm run build:ios
   ```

---

## First-time setup: sync remote version

If you had builds on App Store Connect before this change, sync once:

```bash
eas build:version:set
```

When prompted, enter the **highest build number** already on App Store Connect (e.g. 9).

---

## Local iOS development

Run prebuild to generate the ios folder:

```bash
npx expo prebuild --platform ios
```
