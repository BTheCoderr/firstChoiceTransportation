# Fix #1: Single-Company Fallback – Implementation Summary

## What was done

Added a single-company fallback so the app works when `profile.company_id` is null (e.g. synthetic profile or profile created before company assignment).

**Changes:**
1. **Constant** – `src/constants/company.ts`: `DEFAULT_COMPANY_ID` = `a0000000-0000-0000-0000-000000000001` (seeded in migration 001).
2. **Helper** – `src/utils/company.ts`: `getEffectiveCompanyId(profile)` returns `profile.company_id ?? DEFAULT_COMPANY_ID`.
3. **Driver** – `app/(driver)/index.tsx`: `handleStartShift` uses `getEffectiveCompanyId(profile)` instead of `profile.company_id`.
4. **Admin** – `app/(admin)/index.tsx`: Dashboard uses `getEffectiveCompanyId(profile)` instead of `profile.company_id`. Removed "No company assigned" blank state (fallback always resolves).
5. **Admin service** – `src/services/admin.ts`: `getDriverDetail` uses `profile.company_id ?? DEFAULT_COMPANY_ID` for weekly shift query when driver has null.
6. **AuthProvider** – `src/providers/AuthProvider.tsx`: Synthetic profile sets `company_id: DEFAULT_COMPANY_ID` instead of `null`.

---

## Manual QA Checklist

- [ ] **Driver with synthetic profile**
  - Sign in as a driver whose profile is synthetic (profile not in DB).
  - Confirm Start Shift works and creates a shift.
  - Confirm no blank screen or "No company assigned".

- [ ] **Driver with profile.company_id null**
  - Sign in as a driver whose profile is in DB but `company_id` is null.
  - Confirm Start Shift works and creates a shift.

- [ ] **Driver with profile.company_id set**
  - Sign in as a driver whose profile has `company_id` set.
  - Confirm Start Shift works and uses the profile’s company_id.

- [ ] **Admin with synthetic profile**
  - Sign in as an admin whose profile is synthetic (e.g. `admin@...`).
  - Confirm dashboard shows Drivers and Recent shifts.
  - Confirm no "No company assigned" blank screen.

- [ ] **Admin with profile.company_id null**
  - Sign in as an admin whose profile has `company_id` null.
  - Confirm dashboard shows Drivers and Recent shifts.

- [ ] **Admin driver detail**
  - Open a driver whose profile has `company_id` null.
  - Confirm Weekly summary and Recent shifts load correctly.

- [ ] **End-to-end**
  - Driver: Start shift → tracking → final dropoff → completed.
  - Admin: Dashboard → driver detail → shift detail.
  - Confirm no errors related to company_id.
