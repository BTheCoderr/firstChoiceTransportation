# First Choice Supabase migration and release notes

**Production project:** `xxrxzpktxeaplsnatcvn`. This project contains real driver, GPS and payroll data. Never run initial schema, historical seed data, a retired `FIX_*.sql`, or an old profile backfill against it.

## Safe workflow

1. Confirm connected project ID, current migration list, RLS policies, and the actual installed mobile build. Prepare a restricted backup and recovery plan.
2. Apply *only* reviewed, forward-only migrations not already present. Do not blindly replay a numbered file because a local filename is absent from migration history: previous migrations may have custom names.
3. Test with isolated role-scoped accounts and a disposable test environment. Never generate fictitious shifts or GPS samples in the live payroll database.
4. Audit resulting role grants and test negative permissions. Confirm employee accounts and historical payroll/route evidence remain intact.

## Critical coordinated cutover: migration 020

`020_lock_client_shift_writes_after_rollout.sql` is **not yet applied to production** (last directly checked October 15, 2026). Production still grants broad `INSERT`, `UPDATE`, and `DELETE` on `public.shifts` to `authenticated`, subject to RLS. This allows unsafe changes to owner shifts. Treat the live payroll report as not tamper-proof until the coordinated cutover completes.

Do **not** apply 020 merely to silence an audit warning. It revokes all client shift INSERT/DELETE and most UPDATE fields, and disables the legacy final-dropoff RPC. For old builds, this can cause broken shift start/end or GPS tracking.

Before cutover:
- Establish a supported iOS build newer than TestFlight 1.0.1 (26), run a physical iPhone pilot, and confirm all active drivers are updated.
- Validate `start_driver_shift` and the intended finish/exception workflow. Confirm that with GPS auto-clockout still disabled, employees can request safe administrator review of a stuck shift.
- Exercise foreground/background location upload, movement statuses, flags, reconnects, account recovery, and separate administrator payroll approvals.
- On a staging database apply 020, confirm drivers cannot INSERT closed shifts, UPDATE payroll dates/minutes, reopen shifts, clear flags or invoke the revoked completion function. Test that legitimate movement/route uploads still work. Migration 020 intentionally still grants certain status/flag fields; further server-authoritative movement hardening is necessary before those are trusted for payroll.
- Take a fresh controlled backup, schedule rollout, communicate with the drivers, apply migration, verify negative RLS and resulting grants, and monitor telemetry and support requests.

Do not revert 020 casually in production: reopening direct client writes would reintroduce the payroll integrity vulnerability.

## Other migrations

- 010 makes approved driver bases administrator-controlled.
- 016–018 protect profile roles, company membership and historical RPCs.
- 019 adds server-timed shift start/complete functions; legacy completion must be revoked by 020 at cutover.
- 021 restricts route point uploads to open shifts and reasonable timestamps.
- 022 adds disabled-by-default automatic return-to-base closure; keep it disabled pending field testing.
- 023–024 add trusted received-time and administrator shift recovery evidence.
- 025 adds administrator-created, key-bound driver accounts and read-only `ensure_profile`. **Do not replay its historical onboarding backfill.**
- 026 adds onboarding/base gates before clock-in; it does *not* fully prevent fabricated shifts or modified hours by itself.
- 027 adds audited explicit payroll decisions.
- 028 adds support tickets and audit events.
- 029 (separate unmerged work) proposes recovery for interrupted driver invitations. Review and test it before deploying.

Retired historical emergency scripts were removed from `supabase/`; consult `LEGACY_SQL_DO_NOT_RUN.md`. Never create or promote admin accounts by running old seed scripts. Administrators create driver identities through the secured Edge Function, and the driver chooses their own password.

**Release gates:** GitHub CI is not a replacement for live RLS tests, native iPhone background-location testing, App Store privacy review, and a verified staff distribution strategy.
