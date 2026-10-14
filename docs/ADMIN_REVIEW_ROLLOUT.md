# First Choice administrator review / support rollout

The old iPhone preview (1.0.1 build 20) DOES NOT contain these screens.
Pull request #10 stages the iOS app code. **Database migrations 027 and 028 were applied on 2026-10-14 to the confirmed firstchoice project `xxrxzpktxeaplsnatcvn`.**

## Current scope
- Existing administrator recovery: close stuck OPEN shift for review; independently approve payable minutes.
- New migration 027: approve/payroll-correct, reject, return to review or remove identified test records from operational reports. Decisions and revised minutes live in an auditable ledger, not a destructive update to the shift.
- "Delete test record" is an **audited archive**, not a hard database DELETE. Archive decision is reversible by a recorded "needs_review" action.
- New migration 028: secure driver/admin support ticket conversation and administrator case management (status, priority, messages and audit events).
- Native platform date/time picker requires @react-native-community/datetimepicker 8.4.4 (Expo SDK 54) and **a new EAS binary**, not an Expo Go scan.
- Admin and driver help flows link to in-app support.

## Why the China/large-hour records are not auto-cleaned
Screenshots are insufficient to label an individual's historical shift as fake or test data.
Before action, inspect the original shift UUID, driver, clock-in/out timestamps, raw route coordinates, accuracy, GPS timestamp, last dropoff, any prior payroll, driver statement and dispatch records. Save reasoning on each record. No bulk approvals or automatic deletion.

## Deployment checklist (requires access to the exact First Choice project)
1. Confirm Supabase project **xxrxzpktxeaplsnatcvn**, account ownership, and authoritative source of current payroll exports. Do not connect a different available project.
2. Back up existing public shifts, route_points, profiles and payment/history tables (encrypted, access-restricted, with restore procedure). Decide retention and export rules before marking records excluded. Confirm migrations already installed; migration 020 is a separate, coordinated old-client cutover and must not be blindly applied.
3. Stage both migrations on a separate disposable database or Supabase staging branch. Test SQL execution with administrator and driver test accounts from the SAME company, and a driver/admin from another company. The production project is NOT a test sandbox.
4. Verify the RLS/SECURITY DEFINER boundary: anonymous access denied; driver cannot read another person's ticket or payroll review; company admin cannot read another company's data; driver cannot invoke administrator RPCs; no direct authenticated DELETE/UPDATE on ledgers and ticket messages.
5. Test approval and audited correction: a previously approved payable-minute value changes in the review ledger only; original shift values and the prior review event remain. Reject/test archive must exclude a shift from operational approved hours and counts. Revert by reopening review, with audit.
6. Test recovered-shift flow: close shift as pending first, then approve. Migration 027's trigger must atomically mirror recovery approval into the new ledger.
7. Test support: driver creates and replies to own case, admin sees company cases and replies, admin moves case between open/in-progress/awaiting driver/resolved/closed. Driver cannot change status or read ticket audit.
8. Confirm all app screens handle database errors without exposing other employee data; confirm real driver GPS flow and background permissions on registered physical iPhone.
9. Apply reviewed migrations **027 and 028 only after backup and explicit production decision**. Neither script purges historical shifts. Confirm sample row totals and business reporting.
10. Merge PR after CI and staging validation, create new EAS preview build registered for current iPhone. If Apple/TestFlight is next, EAS remote build number must first be reconciled against App Store Connect's highest build 25; production build should start at 26 with no automatic submission.

## Driver and admin operations
Driver activation: administrator creates account; driver completes name/phone; administrator sets Home/Office; driver grants location. Auto GPS closing remains disabled until field testing. Help and Support screens explain each step.

Admin operations: **Shift Review Center** groups open, flagged, payroll pending, approved, rejected, archived. Before reviewing, inspect raw GPS and shift audit; record decision and evidence. **Support Cases** includes messages and administrative case status.

## Residual release gates
- Native picker and support screens have not yet been validated on a physical iPhone.
- Both migrations were deployed successfully to the existing firstchoice project; RLS and function ACLs were verified read-only. No first-use ticket or payroll decision has been recorded yet. The `firstchoice_archive.pre_review_support_rollout_snapshot` private table contains 72 rows. Test actual role isolation from admin and driver accounts before inviting additional staff.
- Company policy on employee data retention, payroll audit, and deletion must be confirmed.
- Existing dependency advisories need separate remediation; never run `npm audit fix --force` on Expo SDK54.
- Support tickets do not yet send email/push notifications or accept file attachments. These require additional privacy and infrastructure review.
