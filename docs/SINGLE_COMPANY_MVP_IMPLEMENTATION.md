# Single-Company MVP Implementation

## Summary

The app is now a true single-company system. All users belong to the one seeded company (`a0000000-0000-0000-0000-000000000001`). No fallback logic, no multi-tenant behavior.

**Changes:**
- **Constant:** `SINGLE_COMPANY_ID` – the one company for the app
- **Removed:** `getEffectiveCompanyId` helper (no fallback)
- **Driver:** Start Shift uses `SINGLE_COMPANY_ID` directly
- **Admin:** Dashboard uses `SINGLE_COMPANY_ID` directly
- **Profile creation:** `ensure_profile` and `handle_new_user` assign the seeded company ID directly
- **Synthetic profile:** Uses `SINGLE_COMPANY_ID` when DB profile unavailable
- **Migration 007:** Fixes existing profiles with null `company_id`
- **Migration 008:** Updates profile creation functions to use the constant

---

## Changed Files

### `src/constants/company.ts`
```typescript
/**
 * Single-company MVP: the one company for this app.
 * Seeded in migration 001. All users belong to this company.
 */

export const SINGLE_COMPANY_ID =
  "a0000000-0000-0000-0000-000000000001" as const;
```

### `app/(driver)/index.tsx`
- Import `SINGLE_COMPANY_ID`
- `handleStartShift` calls `startShift(SINGLE_COMPANY_ID)` – no profile dependency for company
- Guard: `if (!driverId) return` only

### `app/(admin)/index.tsx`
- Import `SINGLE_COMPANY_ID`
- `useAdminDashboard(SINGLE_COMPANY_ID)` – no profile dependency
- Removed `useAuth` (not needed for dashboard)
- No "No company assigned" blank state

### `src/services/admin.ts`
- Import `SINGLE_COMPANY_ID`
- `getDriverDetail` weekly query: `.eq("company_id", SINGLE_COMPANY_ID)` – all drivers in one company

### `src/providers/AuthProvider.tsx`
- Synthetic profile: `company_id: SINGLE_COMPANY_ID`

### Deleted: `src/utils/company.ts`
- Removed `getEffectiveCompanyId` – no fallback logic

---

## SQL Migrations

### `supabase/migrations/007_single_company_fix_null_profiles.sql`
```sql
UPDATE public.profiles
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;
```

### `supabase/migrations/008_single_company_profile_creation.sql`
- `ensure_profile`: uses constant `v_company_id` instead of `SELECT FROM companies`
- `handle_new_user`: uses constant `v_company_id` instead of `SELECT FROM companies`

---

## Manual QA Checklist

- [ ] **Driver Start Shift** – Start shift works; creates shift with correct company_id
- [ ] **Admin Dashboard** – Shows Drivers and Recent shifts; no blank screen
- [ ] **Admin Driver Detail** – Weekly summary and recent shifts load for any driver
- [ ] **Admin Shift Detail** – Shift detail loads
- [ ] **New user signup** – Profile created with company_id set (run migration 008 first)
- [ ] **Existing null profiles** – After migration 007, profiles have company_id set
- [ ] **Synthetic profile** – If DB profile fails, synthetic profile has company_id; driver/admin flows work
