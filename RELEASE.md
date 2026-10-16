## October 16 stabilization handoff (original 1–9 scope)

- The latest Expo code includes the current role-gated driver/admin screens, administrator-created driver accounts, weekly payroll approval, and server-verified GPS activity. Do not merge the old `stabilization-pass-1` branch wholesale.
- Restored a protected **Diagnostics & build info** page accessible to a signed-in driver from Profile and to an admin from Dashboard. It displays native app/build version and sanitized runtime identifiers, never keys, employee GPS coordinates, shift data or JWTs.
- Restored a root-level JavaScript error boundary. The fallback offers a local retry and a local-only sign-out; it never displays raw exception messages to employees. This does **not** catch native iOS process crashes.
- Run `npm ci && npm run verify:app` before producing a release candidate. This includes TypeScript, pinned native navigation, timing, security, admin/GPS QA, website build, and Expo Doctor. `--skip-expo-doctor` is only a partial developer check and is **not** a release pass.
- GitHub Actions builds require `EXPO_TOKEN` in this repository's **Actions repository secrets**; no token belongs in the code or in a chat. An internal iOS preview still requires physical iPhone login, GPS/background, and weekly payroll testing, plus a separately approved release build. Build success is not App Store approval.
- Keep GPS geofence auto-clockout disabled. Migration 020 remains a separate coordinated permissions cutover after the compatible driver build is installed and validated. Do not alter payroll or location records to simulate QA.

---

# First Choice Transportation release checklist

## Before restoring production access

This app contains employee location and payroll-related records. Do not reopen production until the create-driver Edge Function has been redeployed with **server-verified access tokens** and migration 016 has removed user-metadata role assignment. Confirm any previously created administrator accounts are trusted.

1. Restore the existing Supabase project `xxrxzpktxeaplsnatcvn`, using the connected project and not a new database.
2. Compare applied database migrations to `supabase/migrations/`, especially **015** (abandoned shifts) and **016** (role-claim hardening), then apply only missing migrations in order. Back up operational data and review SQL before applying.
3. `create-driver` version 13 is deployed with independently verified tokens and company admin role checks. CI verifies live unauthenticated/invalid-session rejection without creating a driver. Before accepting real production invites, test a consenting employee email, activation delivery, first password setup, and profile completion on iPhone. Do not expose service-role keys in Expo/public builds.
4. Verify admin, driver, and database RLS permissions on a test account.
5. Verify Supabase Auth password-reset redirect URL includes `https://firstchoicetransportation.netlify.app/auth/reset-password`.

## Administrator-provisioned driver signup (2026-10-13)

- Only an authenticated company administrator creates a driver account; they enter the employee's email, never their password. The backend verifies the administrator's live Supabase Auth token and database company role.
- Migration 025 is already applied to the existing Supabase project. Public email signup and the old ensure_profile RPC cannot create driver profiles. A new driver requires a private, one-use, server-generated provisioning key in trusted auth app_metadata.
- Supabase create-driver Edge Function version 13 is ACTIVE with `verify_jwt=false` because the function independently calls `auth.getUser(token)` and checks the caller's trusted database role and company.
- The employee receives a recovery/activation email through Supabase Auth to set their own password. The existing HTTPS recovery bridge returns the employee to the app. The employee then enters their full name and optional contact phone before the driver workspace is unlocked.
- Older app builds sending administrator-selected passwords are rejected server-side. Build and deploy the new mobile app before asking administrators to invite employees.
- Approved Home/Office GPS bases can only be changed by same-company administrators under RLS. Drivers can see, but not alter, them.
- Synthetic transactional tests passed for uninvited user rejection, trusted admin provision, one-time token consumption, driver onboarding, self-promotion prevention and GPS-base write denial. No test accounts or original profiles were modified.
- The complete real invitation, email deliverability, deep-link, password setup, initial profile entry and physical iPhone flow still require device testing. No real employee invite was sent while testing.

## Activation and recovery regression checks (2026-10-13)

- Auth recovery is set **before** applying a token from email; this stops `SIGNED_IN` from routing past the "Set new password" screen.
- A failed/expired recovery link clears recovery mode, and password/email request failures show errors rather than leaving the spinner hung.
- Driver personal-information submission confirms that `profiles` returned a real updated row containing a server-stored onboarding timestamp. A 200 response without an updated row is not accepted as success.
- Invitation API rejects missing/malformed JSON and reports "activation email request accepted" rather than falsely claiming inbox delivery.
- Netlify reports the production password-reset bridge file (`auth/reset-password/index.html`) was present in the successful 2026-10-13 deployment. Still verify the actual link on iPhone; the previous web deployment is older than these mobile source changes.
- **Must run with a consenting test email/account:** administrator creates driver, employee receives reset link (including spam check), opens it on an actual iPhone, chooses password, signs in, enters name and phone, and sees onboarding completed. The Supabase Auth redirect URL allowlist must contain `https://firstchoicetransportation.netlify.app/auth/reset-password`. Do not create fake real-world employees for testing.
- New driver creation remains controlled by the administrator; email and device testing does not activate GPS auto-clock-out or migration 020.

## October 14 administrator shift-review rollout (database deployed; latest iPhone update pending)

- iPhone screenshots exposed legacy flagged shift spans of 895h 15m and 1162h 28m, plus a GPS point reverse-geocoded as Beijing. These historical records were later cleared from operational tables on explicit request, with a restricted recovery archive retained. This does not prove the underlying GPS-source issue was fixed.
- Migration **027_admin_payroll_decisions.sql** adds admin-only company-scoped decisions for closed records: documented payable-minute approval, reject, mark test/excluded, and return to review. Every change creates an append-only review event, and no historical shift values are rewritten.
- **October 14 deployment verified:** Migrations 027 and 028 are installed on the existing First Choice Supabase project `xxrxzpktxeaplsnatcvn`. A restricted 72-row pre-upgrade snapshot of companies, profiles, driver_bases, shifts, and route_points was created under `firstchoice_archive`. The checks confirmed 6 users, 7 driver bases, 1 open shift, 57 GPS readings, and automatic clock-out disabled. Payroll decisions and support tickets are empty until first use. RLS, table privileges, and RPC permissions were inspected; full two-account mobile integration tests remain outstanding. The verified live project was accessed directly for schema, privilege and preservation checks. These checks are not a substitute for actual admin-and-driver device testing.
- The new Shift Review Center is a 200-most-recent CLOSED-shift review tool; it is not a complete historical export. Legacy recorded values are evidence, not payable-hour authorizations. Only explicit ledger approvals count in the updated admin weekly totals. When the ledger is unavailable, the display fails closed to zero rather than reusing suspicious recorded hours. Do not interpret this zero as a definitive payroll balance until migration 027 is installed.
- The existing open-shift recovery workflow is separate: close with a supported, documented end time (within 24h of clock-in), then independently approve recovered minutes. The new decision RPC blocks approval of an unresolved recovered shift. Migration 027 also mirrors completed recovered-shift payroll approvals into the new ledger in the same transaction, including an immutable review event.
- Unusual GPS readings now display original coordinates, accuracy and advisory warning text. Outlier detection is NOT evidence of wrongdoing, is never used to auto-close a shift, and never changes payroll.
- Review iOS UI, local date/time validation including DST, administrator review/role authorization, driver tab help, support links and old-shift accuracy on a physical device.
- Do not automatically submit a production EAS build or enable geofence auto-clockout. Test administrator/driver permissions and the physical-device flow before release; never bulk-modify a production shift.

## GPS return-to-base and administrator recovery

- Both approved Home and Office locations may end a shift after credible GPS evidence of leaving and returning, with a sustained dwell. No employee End Shift button.
- Automatic GPS payroll closing is intentionally disabled in live Supabase `geofence_clockout_settings` until an actual iPhone field test passes.
- Migrations 019, 021, 022, 023 and 024 are already installed on the existing Supabase project. Migration 024 is additive and does not alter prior shift/payroll rows.
- Migrations 030, 031 and 032 are now deployed to the existing live project (October 15, 2026) as an immediate compatibility-safe payroll integrity guard. An enabled trigger rejects direct fabricated completed shifts or edits to payroll, dates, driver and company fields; authenticated direct UPDATE permissions for those fields and DELETE privileges were revoked. Legacy OPEN shift starts and movement/flag status writes remain possible. Migration 020 remains the separate coordinated RPC-only cutover and will revoke the legacy manual completion RPC. Do not apply 020 before validating driver compatibility.
- The admin dashboard has independent queues for open shifts and for shifts closed with payroll approval still pending. Verify these queues on real authenticated admin accounts.
- Admin recovery is intentionally TWO separate steps: (1) select a supported end time, reason and detailed note to close the stuck shift with `verified_hours_minutes = NULL`; (2) separately approve the server-derived payable minutes with another note. Both actions have immutable company-scoped audit events.
- Review evidence carefully before choosing an end time. The backend permits only end times between clock-in and the current time and within 24 hours of start. Existing historical open shifts must not be auto-closed or assigned invented hours.
- Run GPS tests: start at base without leaving, pass through base mid-route, return to either approved address, poor-accuracy and stale samples, moving device, disabled location, offline recovery, screen locked, app killed, relaunch, low battery, and shift ending while the app is backgrounded.
- Test administrator permissions: drivers cannot perform recovery; admins cannot alter another company's shifts; clients cannot insert/update audit rows; double closure or double approval is rejected; an interrupted request can be retried after refreshing status.

## Driver clock-in server authorization

- Migration 026 is installed on existing Supabase: the server-clocked start-shift RPC rejects incomplete onboarding and missing admin-approved Home/Office, regardless of what the mobile UI displays.
- The existing 026 onboarding/base BEFORE INSERT trigger remains. The additional 030 INSERT/UPDATE/DELETE guard and 031 column-level grants are verified live; no historical shifts, GPS route points, profiles or driver base records were changed during their installation. Migration 032 is also live: the legacy driver completion RPC now closes at server time for admin review, with verified_hours_minutes and estimated_return_minutes NULL; it creates no synthetic route point or approved payroll ledger entry. The RPC remains callable until the coordinated 020 cutover.
- Tested with rolled-back synthetic driver data: incomplete onboarding denied, direct clock-in denied, complete onboarding without GPS base denied, valid onboarded driver with admin-approved base succeeds, duplicate open shift rejected.
- Client messages guide drivers back to personal setup or to their administrator. Historical shifts were untouched.

## iOS releases

Production now uses `cli.appVersionSource: remote` and `production.autoIncrement: true` in `eas.json`. Apple confirmed TestFlight 1.0.1 build 26 was approved on 2026-10-14, before final GitHub changes landed. Before the FIRST build using remote versioning, inspect the current highest build number in App Store Connect/EAS, then run:

```bash
npm ci
npx eas build:version:set --platform ios
npm run build:ios
```

Set the EAS remote iOS build number to the current **highest accepted build** (at least 26 as of October 14). Each subsequent production build should automatically increment it. `npm run build:ios` no longer submits automatically: review the finished build and test it before using `npm run submit:ios`. Build 26 predates merged commits `9f07a6a` and `8a909b8`; the next production build must include the current `main` and use a higher number. For internal iPhone preview, run `npm run build:ios:preview`. `app.config.ts` keeps the public `version` string (currently 1.0.1); increment that separately for a new marketing release when necessary.

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
