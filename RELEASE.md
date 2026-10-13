# First Choice Transportation release checklist

## Before restoring production access

This app contains employee location and payroll-related records. Do not reopen production until the create-driver Edge Function has been redeployed with **server-verified access tokens** and migration 016 has removed user-metadata role assignment. Confirm any previously created administrator accounts are trusted.

1. Restore the existing Supabase project `xxrxzpktxeaplsnatcvn`, using the connected project and not a new database.
2. Compare applied database migrations to `supabase/migrations/`, especially **015** (abandoned shifts) and **016** (role-claim hardening), then apply only missing migrations in order. Back up operational data and review SQL before applying.
3. Redeploy `supabase/functions/create-driver/index.ts` with `verify_jwt=false` only because the function now validates user tokens via `supabase.auth.getUser(token)`. Confirm forged and expired tokens cannot create a driver. Do not expose service-role keys in Expo/public builds.
4. Verify admin, driver, and database RLS permissions on a test account.
5. Verify Supabase Auth password-reset redirect URL includes `https://firstchoicetransportation.netlify.app/auth/reset-password`.

## iOS releases

Production now uses `cli.appVersionSource: remote` and `production.autoIncrement: true` in `eas.json`. The previous local buildNumber 24 predates the TestFlight 1.0.1 build 25 already processed in May 2026. Before the FIRST build using remote versioning, inspect the current highest build number in App Store Connect/EAS, then run:

```bash
npm ci
npx eas build:version:set --platform ios
npm run build:ios
```

Set the EAS remote iOS build number to the current **highest accepted build**, not 24 or 1. Each subsequent production build should automatically increment it. `app.config.ts` keeps the public `version` string (currently 1.0.1); increment that separately for a new marketing release when necessary.

## Run release QA

```bash
npm ci
npx tsc --noEmit
npm run qa:option-b-timing
npm run qa:release
npm ci --prefix web
npm run build --prefix web
```

The GitHub Actions CI workflow runs these checks. On a real iPhone, also test login, admin driver creation, location denial/retry, start shift, background route capture, final dropoff/return to base, weekly hours, flagged shifts, password recovery, relaunch/resume, and sign-out.

## Website and privacy

Static website support and privacy information are now in `web/src/app/support` and `web/src/app/privacy`. Before an App Store launch, the organization must approve the final legal privacy disclosures, retention/contact details, and App Store privacy answers. The website still needs to be deployed from the updated GitHub branch to go live.

Do not describe passing CI as proof of a live backend or a completed TestFlight submission.
