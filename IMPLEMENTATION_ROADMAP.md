# Care1st Driver Timesheet - Implementation Roadmap v1

Step-by-step build order. Each step produces working, testable code before moving on.

---

## Step 1: Project Setup & Folder Structure

**Goal:** Bootstrapped Expo app with Supabase, ready for development.

**Actions:**
1. Create Expo app: `npx create-expo-app@latest . --template tabs`
2. Install deps: `@supabase/supabase-js`, `expo-location`, `expo-task-manager`, `expo-notifications`
3. Restructure to match `PROJECT_STRUCTURE.md` (Expo Router with `app/` dir)
4. Create empty folders: `src/lib`, `src/hooks`, `src/services`, `src/types`, `src/components`, `src/utils`
5. Add `.env.example` with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
6. Create Supabase project at supabase.com, run migration `001_initial_schema.sql`

**Deliverables:** App runs, Supabase connected, schema deployed.

---

## Step 2: Database Schema Deployment

**Goal:** Schema live in Supabase with RLS.

**Actions:**
1. Link Supabase CLI: `supabase link --project-ref <ref>`
2. Run `supabase db push` or apply `001_initial_schema.sql` via Supabase SQL Editor
3. Create first admin user manually in Supabase Auth (or via SQL) and set `role = 'admin'` in `profiles`
4. Create a test driver with `driver_profiles` row (base lat/lng)

**Deliverables:** Tables exist, RLS enabled, at least one admin and one driver for testing.

---

## Step 3: TypeScript Types

**Goal:** Shared types for app and Supabase.

**Actions:**
1. Create `src/types/index.ts` with:
   - `UserRole`, `ShiftStatus`, `SuspiciousReason` (match DB enums)
   - `Profile`, `DriverProfile`, `Shift`, `GpsPoint`, `SuspiciousActivity`
   - `Database` type for Supabase client (optional, for typed client)
2. Export all from single file

**Deliverables:** `src/types/index.ts` with no `any` types for domain objects.

---

## Step 4: Authentication Flow

**Goal:** Driver and admin can log in; app routes by role.

**Actions:**
1. Create `src/lib/supabase.ts` – Supabase client with AsyncStorage for session
2. Create `src/lib/auth.ts` – `signIn`, `signOut`, `getSession`, `getProfile`
3. Create `src/hooks/useAuth.ts` – auth state, loading, user, profile, role
4. Create `app/(auth)/login.tsx` – email/password form, role-aware redirect
5. Create `app/(auth)/_layout.tsx` – stack navigator, no tabs
6. Create `app/_layout.tsx` – session listener, redirect unauthenticated to login
7. Create `app/index.tsx` – redirect: driver → `/(driver)`, admin → `/(admin)`
8. Create `app/(driver)/_layout.tsx` and `app/(admin)/_layout.tsx` – placeholder tabs/stacks

**Deliverables:** Login works, role-based redirect, protected routes.

---

## Step 5: Driver Screens (UI Shell)

**Goal:** Driver can see home, shift, and summary screens.

**Actions:**
1. `app/(driver)/index.tsx` – "Start Shift" button, show active shift if any
2. `app/(driver)/shift.tsx` – active shift view (timer, "Mark Final Dropoff" button)
3. `app/(driver)/summary.tsx` – daily summary (hours, status)
4. Create `src/services/shift.ts` – `createShift`, `getActiveShift`, `updateShift` (stubs at first)
5. Wire Start Shift → create shift, navigate to shift screen

**Deliverables:** Driver can tap Start Shift, see shift screen, navigate between screens.

---

## Step 6: GPS Tracking Logic

**Goal:** Location logged in background during active shift.

**Actions:**
1. Create `src/utils/geo.ts` – `haversineDistance`, `isMeaningfulMovement` (e.g. >50m)
2. Create `src/services/gps.ts` – `startTracking`, `stopTracking`, `logGpsPoint` (insert to Supabase)
3. Create `src/hooks/useLocation.ts` – request permissions, watch position, call `logGpsPoint`
4. Use `expo-location` with `Location.startLocationUpdatesAsync` or `watchPositionAsync`
5. For background: `expo-task-manager` + `Location.startLocationUpdatesAsync` with task name
6. In shift screen, start tracking when shift is active; stop when shift ends
7. Batch inserts (e.g. every 30s or 100m) to reduce writes

**Deliverables:** GPS points saved to `gps_points` during active shift.

---

## Step 7: Movement & Idle Detection

**Goal:** Detect first movement and idle periods.

**Actions:**
1. In `src/services/gps.ts` or new `src/services/movement.ts`:
   - Compare consecutive points: if distance > threshold (e.g. 50m), mark as moving
   - On first movement: set `shifts.first_movement_at`
2. Idle detection: if no movement for N minutes (e.g. 15), flag
3. Create `suspicious_activity` row with reason `long_idle_period` or `idle_at_start`
4. `idle_at_start`: clock_in to first_movement > threshold (e.g. 30 min)

**Deliverables:** `first_movement_at` set, idle periods flagged in `suspicious_activity`.

---

## Step 8: End-of-Shift Logic

**Goal:** Final dropoff → travel time to base → auto end shift.

**Actions:**
1. Create `src/services/travelTime.ts`:
   - Use Google Directions API (or similar) to get duration from last_dropoff to base
   - Fallback: straight-line distance / assumed speed (e.g. 30 mph) if no API
2. In shift service: `markFinalDropoff(shiftId, lat, lng)`:
   - Update `shifts.last_dropoff_at`, `last_dropoff_lat`, `last_dropoff_lng`
   - Call travel time service → get duration
   - Set `auto_end_at = last_dropoff_at + duration`
   - Set `clock_out_at = auto_end_at`, `status = 'locked'`
   - Set `verified_hours_minutes` = minutes from `first_movement_at` to `auto_end_at`
3. "Mark Final Dropoff" button in shift screen calls this
4. Lock shift so driver cannot edit

**Deliverables:** Driver marks final dropoff → shift auto-ends at base ETA, locked.

---

## Step 9: Admin Dashboard

**Goal:** Admins see drivers and weekly totals.

**Actions:**
1. `app/(admin)/index.tsx` – list all drivers (from `profiles` where role=driver)
2. For each driver: show weekly total minutes (use `get_driver_weekly_hours` or simple query)
3. Show flagged count per driver
4. `app/(admin)/driver/[id].tsx` – driver detail: shifts list, weekly breakdown
5. `app/(admin)/shift/[id].tsx` – shift detail: times, GPS route summary, suspicious flags

**Deliverables:** Admin dashboard with driver list, weekly hours, shift detail.

---

## Step 10: Suspicious Activity Rules

**Goal:** All four flag types implemented.

**Actions:**
1. `idle_at_start`: On first movement, if (first_movement_at - clock_in_at) > 30 min → insert flag
2. `early_clock_in`: If clock_in > 60 min before first_movement → insert flag
3. `long_idle_period`: During shift, if gap between movements > 15 min → insert flag
4. `extended_beyond_route`: If driver manually extended shift past auto_end_at → insert flag (requires manual end flow; for MVP may skip if we always auto-end)
5. Create `src/services/suspiciousActivity.ts` – `flagShift(reason, details)`
6. Call from movement detection and shift end logic

**Deliverables:** Suspicious shifts flagged; visible in admin shift detail.

---

## Step 11: Local Setup & Deployment

**Goal:** Documented setup and deploy steps.

**Actions:**
1. Write `README.md` with:
   - Prerequisites (Node, Expo CLI, Supabase account)
   - `npm install`, `cp .env.example .env`, fill keys
   - `npx expo start` for local
   - Supabase migration steps
   - EAS Build for production (optional)
2. Add `app.config.js` or `app.json` for EAS if deploying

**Deliverables:** README with setup and deploy instructions.

---

## Dependency Order (DAG)

```
1 (Setup) → 2 (Schema) → 3 (Types)
     ↓
4 (Auth) → 5 (Driver UI) → 6 (GPS) → 7 (Movement) → 8 (End Shift)
     ↓
9 (Admin) ← 10 (Suspicious) ← 8
     ↓
11 (Deploy)
```

---

## MVP Scope Boundaries

| In Scope | Out of Scope (v1) |
|----------|-------------------|
| Email/password auth | OAuth, magic link |
| Single base per driver | Multiple bases, dynamic base |
| Google Directions for travel time | Custom routing |
| Batch GPS inserts | Real-time streaming |
| Basic admin list/detail | Export, reports, charts |
| Four suspicious rules | ML, anomaly detection |

---

## Estimated Effort (Rough)

| Step | Effort |
|------|--------|
| 1–3 | 1–2 hours |
| 4 | 2–3 hours |
| 5 | 1–2 hours |
| 6 | 2–3 hours |
| 7 | 1–2 hours |
| 8 | 2–3 hours |
| 9 | 2–3 hours |
| 10 | 1–2 hours |
| 11 | 0.5 hour |
| **Total** | ~15–20 hours |
