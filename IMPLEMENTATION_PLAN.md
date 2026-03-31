# Implementation Plan: Business Rules Update

## 1. GPS Required for Driver Shifts

**Current state:** Start shift blocks without location; tracking shows warning banner; final dropoff requires GPS.

**Changes:**
- Add `LocationStatusCard` on driver home: shows Location Enabled/Disabled, Tracking Active/Inactive
- Add blocking gate: if location denied, show full blocking UI with "Enable Location" and "Retry" before Start Shift
- Ensure driver cannot proceed without location permission
- Shift screen: already has tracking status; add location status at top

**Files:**
- `src/components/driver/LocationStatusCard.tsx` (new)
- `app/(driver)/index.tsx` – add LocationStatusCard, gate Start Shift on location
- `app/(driver)/shift.tsx` – add location status banner when denied

---

## 2. Admin Creates Driver Credentials

**Current state:** No admin UI for creating drivers; profiles created via trigger on auth.users INSERT.

**Changes:**
- Supabase Edge Function `create-driver` that uses admin API to create user with email, password, full_name, role
- Admin screen `app/(admin)/create-driver.tsx` with form: full name, email, temporary password
- Service `src/services/adminDriverCreation.ts` to call Edge Function
- Ensure handle_new_user trigger receives full_name and role from user_metadata

**Files:**
- `supabase/functions/create-driver/index.ts` (new)
- `app/(admin)/create-driver.tsx` (new)
- `app/(admin)/_layout.tsx` – add Create Driver screen, link from dashboard
- `app/(admin)/index.tsx` – add "Create Driver" button
- `src/services/adminDriverCreation.ts` (new)

**Supabase:** Edge Function deploy; Auth settings: disable public signup if desired.

---

## 3. Weekly Hours View (Admin Only)

**Current state:** `getCompanyDriversWithWeeklyStats` exists; dashboard shows per-driver cards with weekly stats.

**Changes:**
- New screen `app/(admin)/weekly.tsx` – dedicated "Weekly Hours" view
- Lists all drivers with: name, total verified hours, shift count, flagged count
- Add navigation from dashboard

**Files:**
- `app/(admin)/weekly.tsx` (new)
- `app/(admin)/_layout.tsx` – add Weekly screen
- `app/(admin)/index.tsx` – add "Weekly Hours" button

---

## 4. Driver Sees Only Own Data

**Current state:** RLS enforces driver isolation; all driver queries filter by profile.id.

**Verification:**
- RLS policies: drivers SELECT/UPDATE own profile; manage own shifts; read own weekly_summaries
- No driver routes expose other drivers' data
- No changes needed; document in QA checklist

---

## SQL / RLS

- No new migrations required for 1–4
- handle_new_user already uses raw_user_meta_data for full_name and role
- RLS already enforces driver isolation

---

## Manual QA Checklist

1. **GPS**
   - [ ] Deny location → see blocking message, cannot start shift
   - [ ] Grant location → can start shift
   - [ ] Location status shows Enabled/Disabled
   - [ ] Tracking status shows Active/Inactive on shift screen
   - [ ] Final dropoff requires location; shows error if denied

2. **Admin driver creation**
   - [ ] Admin can open Create Driver screen
   - [ ] Form: full name, email, temp password
   - [ ] Submit creates driver; admin can share credentials
   - [ ] Driver can log in with those credentials
   - [ ] No signup link on login screen

3. **Weekly hours**
   - [ ] Admin sees Weekly Hours link
   - [ ] Weekly view shows all drivers with hours, shift count, flagged count
   - [ ] Driver cannot access weekly view

4. **Driver isolation**
   - [ ] Driver sees only own shifts on Summary
   - [ ] Driver sees only own active shift
   - [ ] Driver cannot access admin routes (redirect if they try)

---

## Edge Function Deployment

Deploy the `create-driver` Edge Function:

```bash
supabase functions deploy create-driver
```

Ensure `SUPABASE_SERVICE_ROLE_KEY` is available (it is set automatically in Supabase-hosted Edge Functions).

---

## Supabase Auth Settings (Recommended)

In Supabase Dashboard → Authentication → Providers → Email:
- **Disable "Confirm email"** if you want drivers to sign in immediately with admin-created credentials.
- **Disable "Enable sign ups"** to prevent public self-signup (admin creates drivers only).
