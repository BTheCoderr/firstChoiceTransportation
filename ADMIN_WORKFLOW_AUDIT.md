# Admin Workflow Audit & Changes

**Date:** March 2026  
**App:** First Choice Transportation (Expo + Supabase)

---

## 1. Audit Summary

### Already present

- **Create Driver button** – Existed in `app/(admin)/index.tsx` (lines 58–65) but may not have been visible on some devices. Enhanced with a "Quick actions" section header and better styling.
- **Weekly Hours button** – Same as above; both were already wired to their routes.
- **create-driver.tsx** – Existed and worked; upgraded with home base fields.
- **weekly.tsx** – Existed and worked; no changes needed.
- **_layout.tsx** – Already defines routes for `create-driver` and `weekly`.
- **create-driver Edge Function** – Existed; extended to create `driver_bases` when home base coordinates are provided.
- **RLS** – Migration 010 already restricts driver_bases writes to admins. No SQL changes required.

### Changes made

1. **Admin dashboard (`app/(admin)/index.tsx`)** – Added a "Quick actions" section header for Create Driver and Weekly Hours so they are more prominent.
2. **Create Driver form (`app/(admin)/create-driver.tsx`)** – Added optional home base fields: address, latitude, longitude. If both lat and lng are provided, the driver’s home base is created during account creation.
3. **Edge Function (`supabase/functions/create-driver/index.ts`)** – Accepts `home_base_address`, `home_base_latitude`, `home_base_longitude`. After creating the auth user, inserts into `driver_bases` with `name = 'Home'`, `is_default = true` when valid coordinates are provided.
4. **Client service (`src/services/adminDriverCreation.ts`)** – Updated `CreateDriverInput` and `createDriver()` to pass home base fields to the Edge Function.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `app/(admin)/index.tsx` | Added "Quick actions" section header; adjusted styles for action buttons |
| `app/(admin)/create-driver.tsx` | Added home base form fields (address, lat, lng); validation; success message includes base status |
| `src/services/adminDriverCreation.ts` | Extended `CreateDriverInput` with optional home base fields; pass-through to Edge Function |
| `supabase/functions/create-driver/index.ts` | Accept home base params; insert into `driver_bases` after user creation when valid coords provided |

**No changes to:**

- `app/(admin)/weekly.tsx`
- `app/(admin)/_layout.tsx`
- SQL migrations
- RLS policies

---

## 3. Data Flow

**Create Driver + home base:**

1. Admin submits form with full name, email, password, and optionally home base (address, lat, lng).
2. Client calls `createDriver()` → `supabase.functions.invoke("create-driver", { body })`.
3. Edge Function:
   - Verifies admin role
   - Creates auth user via `supabase.auth.admin.createUser`
   - Triggers `handle_new_user` → creates profile
   - If valid lat/lng: inserts row into `driver_bases` (driver_id, name='Home', lat, lng, address, is_default=true)
4. Returns success; admin sees confirmation and can go back.

**Why base creation is in the Edge Function (MVP):**

- Single request and atomic flow (user + base in one server call).
- Edge Function uses service role; can insert into `driver_bases` without RLS concerns.
- Keeps client simpler and avoids extra API calls.
- If base insert fails, the driver still exists; admin can add base later from driver detail.

---

## 4. Manual QA Checklist

### Create Driver

- [ ] Admin dashboard shows "Quick actions" with Create Driver and Weekly Hours buttons.
- [ ] Tapping Create Driver navigates to the Create Driver screen.
- [ ] Submitting with only required fields (name, email, password) creates the driver and returns to dashboard.
- [ ] Submitting with home base (address + lat + lng) creates the driver and home base.
- [ ] Success alert mentions "Home base was set" when base was created.
- [ ] Validation: requires both lat and lng if one is provided.
- [ ] Validation: lat must be -90 to 90, lng -180 to 180.
- [ ] New driver appears on dashboard and can sign in with the provided credentials.

### Weekly Hours

- [ ] Tapping Weekly Hours navigates to the Weekly Hours screen.
- [ ] Screen shows current week’s drivers with total hours, shift count, and flagged count.
- [ ] Tapping a driver opens their driver detail screen.
- [ ] Pull-to-refresh works.

### Driver base created successfully

- [ ] Create a driver with home base (e.g. address "123 Main St", lat 40.7128, lng -74.0060).
- [ ] Open driver detail for that driver.
- [ ] Confirm the home base appears (or that the admin "Set base" / base display shows it).
- [ ] Driver profile (as driver) shows the correct home base (read-only).

---

## 5. Deploying the Edge Function

Redeploy the `create-driver` Edge Function to apply the changes:

```bash
supabase functions deploy create-driver
```

Or with your project ref:

```bash
supabase functions deploy create-driver --project-ref YOUR_PROJECT_REF
```
