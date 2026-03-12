# Core-Flow Audit: Single-Company MVP

**Scope:** First Choice Transportation only. No multi-company, SaaS, billing, onboarding, invite, or expansion features.

---

## 1. Driver Basics

| Item | Status | Notes |
|------|--------|-------|
| **Login** | ✅ Done | Email/password via Supabase Auth. Redirects to driver home. Profile-not-found handled with retry/sign out. |
| **Start shift** | ⚠️ Fragile | Requires `profile?.company_id`. If null → silent no-op (button does nothing). No feedback. |
| **Tracking start** | ✅ Done | Auto-starts on shift screen via LocationTrackingCard. Restores on app launch if shift active. Foreground + background permissions. |
| **Movement / idle updates** | ✅ Done | `processMovementUpdate` on each route point. Sets `first_movement_at`, `status` (started→moving→idle). Flags: no movement, late first movement, long idle. |
| **Final dropoff** | ✅ Done | FinalDropoffCard gets GPS, calls endShift. Requires base. Blocks if no base. |
| **Completed shift summary** | ✅ Done | Summary tab shows recent completed/flagged shifts. ShiftSummaryCard with verified hours, status, flag badge. |

**Missing:**
- Feedback when `company_id` is null (Start Shift does nothing)
- "Go to Home" button when Shift tab has no active shift
- Retry for GPS failure on final dropoff

**Risky / fragile:**
- **`company_id` null** – Synthetic profile fallback or profile created when companies empty → `company_id: null`. Driver taps Start Shift, nothing happens. Admin sees "No company assigned."
- **Stop tracking** – Driver can stop route recording mid-shift. Incomplete route data.
- **Tracking fails after shift start** – If permissions denied after shift created, we still navigate to shift screen. Tracking inactive, no clear recovery path.

**Fix first:** Ensure `company_id` is never null for single-company MVP (see System basics).

---

## 2. Admin Basics

| Item | Status | Notes |
|------|--------|-------|
| **Login** | ✅ Done | Same auth flow. Redirects to admin dashboard. |
| **Drivers list** | ✅ Done | Admin dashboard shows drivers with weekly stats (minutes, shift count, flagged). Uses `company_id` from profile. |
| **Recent shifts** | ✅ Done | Recent completed/flagged shifts with driver name. Tap → shift detail. |
| **Shift detail** | ✅ Done | Full shift view: times, first movement, final dropoff, route points count, client stops count, suspicious/flagged section. |
| **Flagged shift visibility** | ✅ Done | Flag badge on list items and detail. Red styling. `suspicious_reason` and `suspicious_details` shown. |

**Missing:**
- Nothing critical for MVP

**Risky / fragile:**
- **`company_id` null** – Admin sees "No company assigned." and blank screen. Cannot see drivers or shifts. Same root cause as driver.

**Fix first:** Same as driver – ensure `company_id` is set (see System basics).

---

## 3. System Basics

| Item | Status | Notes |
|------|--------|-------|
| **Route point logging** | ✅ Done | Background task inserts to `route_points` on location update. 30s interval, 50m distance. Calls `processMovementUpdate` after insert. |
| **Shift status correctness** | ✅ Done | started → moving (on meaningful movement) → idle (thresholds). Flags: no_movement_within_threshold, late_first_movement, long_idle_period, extended_shift. |
| **End-of-shift calculation** | ✅ Done | `completeShiftWithFinalDropoff`: travel time from dropoff to base, `clock_out_at` = dropoff + travel, `verified_hours_minutes` = clock_in to clock_out. |
| **Duplicate shift prevention** | ✅ Done | `getActiveShiftForDriver` before insert. Returns ALREADY_ACTIVE if active shift exists. |
| **Default base requirement** | ✅ Done | End shift requires base. FinalDropoffCard blocks and shows alert. No base → NO_BASE error. |
| **Background tracking reliability** | ⚠️ Fragile | Task defined, registered. Depends on Expo background location (iOS/Android). No explicit queue/retry for failed inserts. |

**Missing:**
- Single-company fallback when `company_id` is null

**Risky / fragile:**
- **`company_id` null** – Root cause of "No company assigned." Profile can have null when: (1) synthetic fallback (DB/profile sync broken), (2) profile created when `companies` table empty, (3) manual user creation before migrations. Schema inserts one company at migration. `ensure_profile` and `handle_new_user` use `SELECT id FROM companies LIMIT 1`. If companies exists, it works. Synthetic fallback always sets `company_id: null`.
- **Background task** – Failed Supabase inserts are skipped (`continue`). No retry. Under poor network, points can be lost.

**Fix first:** Single-company fallback – when `profile?.company_id` is null, fetch the one company (or use hardcoded First Choice UUID from schema) and use it. Unblocks both driver and admin for MVP.

---

## Root Cause: `company_id` Null

**Why it happens:**
1. **Synthetic profile** – AuthProvider `fetchProfile` falls back to synthetic profile when DB select and `ensure_profile` RPC both fail. Synthetic sets `company_id: null`.
2. **Profile in DB with null** – Possible if profile was created when `companies` was empty, or manually edited.

**For single-company MVP fix:**
- **Option A (app-level):** When `profile?.company_id` is null, call a small helper that fetches `SELECT id FROM companies LIMIT 1` and use that. Or hardcode the First Choice UUID `a0000000-0000-0000-0000-000000000001` from migration 001. Show "No company assigned" only if that company doesn’t exist.
- **Option B (data fix):** Run a one-time update: `UPDATE profiles SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL`. Ensures existing profiles get company_id.
- **Option C (AuthProvider):** In synthetic profile fallback, fetch company and set `company_id` instead of null. Keeps synthetic profile but makes it usable.

**Recommendation:** Option A for MVP – add `getSingleCompanyId()` that returns the one company ID (or null if none). Use it in driver `handleStartShift` and admin dashboard when `profile?.company_id` is null. Fast, no migration, works for single-company.

---

## Summary: Fix Order

| # | Fix | Bucket | Impact |
|---|-----|--------|--------|
| 1 | **Single-company fallback for `company_id` null** | System | Unblocks driver Start Shift and admin dashboard. Fixes "No company assigned." |
| 2 | **Driver: feedback when company_id null** | Driver | If fallback fails, show "Contact administrator" and disable Start Shift instead of silent no-op. |
| 3 | **"Go to Home" on shift empty state** | Driver | Driver on Shift tab with no shift can navigate to Home to start one. |
| 4 | **Remove or gate "Stop tracking"** | Driver | Prevents accidental mid-shift stop and incomplete route data. |
| 5 | **Retry for final dropoff GPS** | Driver | Single GPS failure no longer blocks shift completion. |
