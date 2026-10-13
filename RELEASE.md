# First Choice Transportation release checklist

## Before restoring production access

This app contains employee location and payroll-related records. Do not reopen production until the create-driver Edge Function has been redeployed with **server-verified access tokens** and migration 016 has removed user-metadata role assignment. Confirm any previously created administrator accounts are trusted.

1. Restore the existing Supabase project `xxrxzpktxeaplsnatcvn`, using the connected project and not a new database.
2. Compare applied database migrations to `supabase/migrations/`, especially **015** (abandoned shifts) and **016** (role-claim hardening), then apply only missing migrations in order. Back up operational data and review SQL before applying.
3. `create-driver` version 12 is deployed with independently verified tokens and company admin role checks. Before accepting production invites, test forged and expired sessions, invitation email delivery, first password setup and employee profile completion. Do not expose service-role keys in Expo/public builds.
4. Verify admin, driver, and database RLS permissions on a test account.
5. Verify Supabase Auth password-reset redirect URL includes `https://firstchoicetransportation.netlify.app/auth/reset-password`.

## Administrator-provisioned driver signup (2026-10-13)

- Only an authenticated company administrator creates a driver account; they enter the employee's email, never their password. The backend verifies the administrator's live Supabase Auth token and database company role.
- Migration 025 is already applied to the existing Supabase project. Public email signup and the old ensure_profile RPC cannot create driver profiles. A new driver requires a private, one-use, server-generated provisioning key in trusted auth app_metadata.
- Supabase create-driver Edge Function version 12 is ACTIVE with `verify_jwt=false` because the function independently calls `auth.getUser(token)` and checks the caller's trusted database role and company.
- The employee receives a recovery/activation email through Supabase Auth to set their own password. The existing HTTPS recovery bridge returns the employee to the app. The employee then enters their full name and optional contact phone before the driver workspace is unlocked.
- Older app builds sending administrator-selected passwords are rejected server-side. Build and deploy the new mobile app before asking administrators to invite employees.
- Approved Home/Office GPS bases can only be changed by same-company administrators under RLS. Drivers can see, but not alter, them.
- Synthetic transactional tests passed for uninvited user rejection, trusted admin provision, one-time token consumption, driver onboarding, self-promotion prevention and GPS-base write denial. No test accounts or original profiles were modified.
- The complete real invitation, email deliverability, deep-link, password setup, initial profile entry and physical iPhone flow still require device testing. No real employee invite was sent while testing.

## GPS return-to-base and administrator recovery

- Both approved Home and Office locations may end a shift after credible GPS evidence of leaving and returning, with a sustained dwell. No employee End Shift button.
- Automatic GPS payroll closing is intentionally disabled in live Supabase `geofence_clockout_settings` until an actual iPhone field test passes.
- Migrations 019, 021, 022, 023 and 024 are already installed on the existing Supabase project. Migration 024 is additive and does not alter prior shift/payroll rows.
- Migration 020 must be applied only in a coordinated mobile rollout; it removes direct client payroll writes and disables the legacy manual completion RPC. Never apply it before upgrading active drivers.
- The admin dashboard has independent queues for open shifts and for shifts closed with payroll approval still pending. Verify these queues on real authenticated admin accounts.
- Admin recovery is intentionally TWO separate steps: (1) select a supported end time, reason and detailed note to close the stuck shift with `verified_hours_minutes = NULL`; (2) separately approve the server-derived payable minutes with another note. Both actions have immutable company-scoped audit events.
- Review evidence carefully before choosing an end time. The backend permits only end times between clock-in and the current time and within 24 hours of start. Existing historical open shifts must not be auto-closed or assigned invented hours.
- Run GPS tests: start at base without leaving, pass through base mid-route, return to either approved address, poor-accuracy and stale samples, moving device, disabled location, offline recovery, screen locked, app killed, relaunch, low battery, and shift ending while the app is backgrounded.
- Test administrator permissions: drivers cannot perform recovery; admins cannot alter another company's shifts; clients cannot insert/update audit rows; double closure or double approval is rejected; an interrupted request can be retried after refreshing status.

## Driver clock-in server authorization

- Migration 026 is installed on existing Supabase: the server-clocked start-shift RPC rejects incomplete onboarding and missing admin-approved Home/Office, regardless of what the mobile UI displays.
- A separate authenticated-only BEFORE INSERT trigger protects legacy direct shift writes pending the migration 020 coordinated cutover. The trigger does not rewrite historical shifts or auto-close active shifts.
- Tested with rolled-back synthetic driver data: incomplete onboarding denied, direct clock-in denied, complete onboarding without GPS base denied, valid onboarded driver with admin-approved base succeeds, duplicate open shift rejected.
- Client messages guide drivers back to personal setup or to their administrator. Historical shifts were untouched.

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

The GitHub Actions CI workflow runs these checks. On a real iPhone, also test login, admin driver creation, location denial/retry, start shift, background route capture, GPS-confirmed Home/Office return, administrator recovery and separate payroll approval, weekly hours, flagged shifts, password recovery, relaunch/resume, and sign-out.

## Website and privacy

Static website support and privacy information are now in `web/src/app/support` and `web/src/app/privacy`. Before an App Store launch, the organization must approve the final legal privacy disclosures, retention/contact details, and App Store privacy answers. The public website has been deployed on Netlify; recheck the current production commit and legal copy before launch.

Do not describe passing CI as proof of a live backend or a completed TestFlight submission.
