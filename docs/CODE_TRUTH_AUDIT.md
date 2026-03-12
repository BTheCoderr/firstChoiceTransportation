# Code-Truth Audit

## 1. Driver login actually routes to the driver home screen

**IMPLEMENTED**

- `app/(auth)/index.tsx` lines 25–34: `useEffect` checks `user && profile && role`, then `router.replace(role === "admin" ? "/(admin)" : "/(driver)")`.
- `app/index.tsx` lines 19–20: when `role === "driver"`, `router.replace("/(driver)")`.
- AuthProvider sets `role` from `profile.role` (or synthetic profile from `email.includes("admin@")`).

---

## 2. Admin login actually routes to the admin dashboard

**IMPLEMENTED**

- Same `useEffect` in `app/(auth)/index.tsx` and `app/index.tsx`; when `role === "admin"`, `router.replace("/(admin)")`.
- Admin dashboard is `app/(admin)/index.tsx`.

---

## 3. Start Shift actually creates a shift row in Supabase

**IMPLEMENTED**

- `app/(driver)/index.tsx` line 63: `startShift(SINGLE_COMPANY_ID)`.
- `src/hooks/useDriverShift.ts` lines 58–59: `startShiftAction` calls `startShift(driverId, companyId, coords)`.
- `src/services/shifts.ts` lines 36–54: `getActiveShiftForDriver` check, then `supabase.from("shifts").insert(insert).select().single()`.

---

## 4. Start Shift actually auto-starts tracking

**IMPLEMENTED**

- `app/(driver)/index.tsx` lines 65–68: after shift created, `requestPermissions()` then `startTracking(shift.id)`, then `router.push("/(driver)/shift")`.
- `src/hooks/useShiftLocationTracking.ts`: `startTracking` calls `startBackgroundLocationTracking(shiftId)`.
- `src/services/location.ts` lines 29–61: `startBackgroundLocationTracking` sets SecureStore, requests permissions, calls `Location.startLocationUpdatesAsync`.

---

## 5. Background tracking actually writes route_points rows

**IMPLEMENTED**

- `app/_layout.tsx` line 4: `import "@/tasks/backgroundLocationTask"`.
- `src/tasks/backgroundLocationTask.ts` lines 26–37: for each location, `supabase.from("route_points").insert({ shift_id, latitude, longitude, recorded_at, accuracy, speed })`.

---

## 6. Movement detection actually updates shift status to moving

**IMPLEMENTED**

- `src/tasks/backgroundLocationTask.ts` line 43: after insert, `processMovementUpdate(shiftId, {...})`.
- `src/services/movement.ts` lines 63–73: `isMeaningfulMovement(current, prior)`; if true, `supabase.from("shifts").update({ status: "moving", first_movement_at })`.

---

## 7. Idle detection actually updates shift status to idle

**IMPLEMENTED**

- `src/services/movement.ts` lines 99–117: if no first movement and `minsSinceClockIn >= IDLE_AT_START_THRESHOLD_MINUTES`, `update({ status: "idle" })` with `.eq("status", "started")`.
- Lines 128–134: if has first movement and `minsSinceMovement >= IDLE_AFTER_MOVEMENT_THRESHOLD_MINUTES`, `update({ status: "idle" })` with `.eq("status", "moving")`.

---

## 8. Profile tab actually saves a default base

**IMPLEMENTED**

- `app/(driver)/profile.tsx` lines 34–53: `handleSave` calls `upsertDefaultBase({ driverId, name, latitude, longitude, address })`.
- `src/components/driver/DriverBaseForm.tsx` lines 49–69: `handleSave` calls `onSave({ name, latitude, longitude, address })`.
- `src/services/driverBases.ts` lines 40–89: `upsertDefaultBase` does `supabase.from("driver_bases").update(...)` or `.insert(...)`.

---

## 9. Final Dropoff actually uses current GPS

**IMPLEMENTED**

- `src/components/driver/FinalDropoffCard.tsx` lines 47–53: `Location.getCurrentPositionAsync({ accuracy: Balanced })`, then `onFinalDropoff(loc.coords.latitude, loc.coords.longitude)`.

---

## 10. Final Dropoff actually completes the shift in Supabase

**IMPLEMENTED**

- `app/(driver)/shift.tsx` lines 88–98: `handleFinalDropoff` calls `endShift(activeShift.id, lat, lng)`.
- `src/hooks/useDriverShift.ts` lines 82–88: `endShift` calls `completeShiftWithFinalDropoff(shiftId, driverId, dropoffLat, dropoffLng, dropoffAt)`.
- `src/services/endShift.ts` lines 75–79: `supabase.from("shifts").update(updatePayload).eq("id", shiftId)`.

---

## 11. Final Dropoff actually stops tracking

**IMPLEMENTED**

- `src/hooks/useDriverShift.ts` lines 90–93: on `result.success`, `await stopBackgroundLocationTracking()`.
- `src/services/location.ts` lines 64–70: `stopBackgroundLocationTracking` calls `Location.stopLocationUpdatesAsync` and `SecureStore.deleteItemAsync`.

---

## 12. Completed shifts actually show in driver Summary

**IMPLEMENTED**

- `app/(driver)/summary.tsx` lines 22–25: `loadShifts` calls `getRecentShiftsForDriver(driverId)`.
- `src/services/shifts.ts` lines 60–74: `getRecentShiftsForDriver` selects from `shifts` with `.in("status", ["completed", "flagged"])`.

---

## 13. Admin dashboard actually loads drivers

**IMPLEMENTED**

- `app/(admin)/index.tsx` line 18: `useAdminDashboard(SINGLE_COMPANY_ID)`.
- `src/hooks/useAdminDashboard.ts` lines 24–26: calls `getCompanyDriversWithWeeklyStats(companyId)`.
- `src/services/admin.ts` lines 52–104: `getCompanyDriversWithWeeklyStats` selects profiles with `eq("company_id", companyId).eq("role", "driver")`.

---

## 14. Admin dashboard actually loads recent shifts

**IMPLEMENTED**

- `src/hooks/useAdminDashboard.ts` line 26: `getRecentCompanyShifts(companyId)`.
- `src/services/admin.ts` lines 109–144: `getRecentCompanyShifts` selects shifts with `eq("company_id", companyId).in("status", ["completed", "flagged"])`.

---

## 15. Admin shift detail actually loads route points

**IMPLEMENTED**

- `app/(admin)/shift/[id].tsx` lines 76–79: `load` calls `getShiftDetail(id)`.
- `src/services/admin.ts` lines 258–271: `getShiftDetail` fetches `route_points` with `eq("shift_id", shiftId)` and returns `routePoints`, `routePointsCount`.

---

## 16. Suspicious rules actually flag shifts

**IMPLEMENTED**

- `src/services/movement.ts` lines 80–91, 108–116, 134–143: calls `flagShiftAsSuspicious` for late_first_movement, no_movement_within_threshold, long_idle_period.
- `src/services/endShift.ts` lines 59–72: `shouldFlagExtendedShift(verifiedMinutes)`; if true, adds `suspicious_reason`, `flagged_at`, `status: "flagged"` to update.
- `src/services/suspicious.ts`: `flagShiftAsSuspicious` updates `shifts` with `suspicious_reason`, `suspicious_details`, `flagged_at`, `status: "flagged"`.

---

## 17. Duplicate shift prevention actually blocks a second active shift

**IMPLEMENTED**

- `src/services/shifts.ts` lines 36–39: `startShift` calls `getActiveShiftForDriver(driverId)`; if `existing`, returns `{ success: false, error: "ALREADY_ACTIVE" }`.

---

## 18. Tracking state actually restores on app reopen

**IMPLEMENTED**

- `src/components/driver/LocationTrackingCard.tsx` lines 31–39: `useEffect` runs `startTracking(shiftId)` when `!isTracking && !isStarting && !isRequestingPermissions && !hasAutoStarted.current`.
- `src/hooks/useShiftLocationTracking.ts` lines 58–66: `useEffect` with `AppState.addEventListener("change", ...)` calls `refreshState()` when app becomes active.
- `src/services/location.ts` lines 73–82: `isLocationTrackingActive` checks SecureStore + `hasStartedLocationUpdatesAsync`.
- When user reopens app with active shift and navigates to Shift tab, `LocationTrackingCard` mounts; if tracking inactive, it auto-starts.

---

## 19. Active shift polling actually refreshes shift state

**IMPLEMENTED**

- `src/hooks/useDriverShift.ts` lines 36–53: `useEffect` sets `setInterval` every `ACTIVE_SHIFT_POLL_INTERVAL_MS` (20_000) to call `getActiveShiftForDriver(driverId)` and `setActiveShift(shift)`.

---

## 20. Logout actually signs the user out and returns to auth

**IMPLEMENTED**

- `src/components/LogoutButton.tsx` lines 9–14: `handleLogout` calls `await signOut()`, then `router.replace("/(auth)")` in `finally`.
- `src/providers/AuthProvider.tsx` lines 79–86: `signOut` calls `supabase.auth.signOut()`, then sets `session`, `user`, `profile`, `role` to null.

---

## Summary

| # | Item | Status |
|---|------|--------|
| 1 | Driver login routes to driver home | IMPLEMENTED |
| 2 | Admin login routes to admin dashboard | IMPLEMENTED |
| 3 | Start Shift creates shift row | IMPLEMENTED |
| 4 | Start Shift auto-starts tracking | IMPLEMENTED |
| 5 | Background tracking writes route_points | IMPLEMENTED |
| 6 | Movement detection updates status to moving | IMPLEMENTED |
| 7 | Idle detection updates status to idle | IMPLEMENTED |
| 8 | Profile tab saves default base | IMPLEMENTED |
| 9 | Final Dropoff uses current GPS | IMPLEMENTED |
| 10 | Final Dropoff completes shift in Supabase | IMPLEMENTED |
| 11 | Final Dropoff stops tracking | IMPLEMENTED |
| 12 | Completed shifts show in driver Summary | IMPLEMENTED |
| 13 | Admin dashboard loads drivers | IMPLEMENTED |
| 14 | Admin dashboard loads recent shifts | IMPLEMENTED |
| 15 | Admin shift detail loads route points | IMPLEMENTED |
| 16 | Suspicious rules flag shifts | IMPLEMENTED |
| 17 | Duplicate shift prevention blocks second active | IMPLEMENTED |
| 18 | Tracking state restores on app reopen | IMPLEMENTED |
| 19 | Active shift polling refreshes state | IMPLEMENTED |
| 20 | Logout signs out and returns to auth | IMPLEMENTED |

---

## Safe to test now

- Driver login → Home
- Admin login → Dashboard
- Start Shift → shift creation + tracking start
- Background route_points logging
- Movement / idle status updates
- Profile base save
- Final Dropoff (GPS, shift completion, tracking stop)
- Driver Summary (completed shifts)
- Admin drivers + recent shifts
- Admin shift detail (route points)
- Suspicious flagging
- Duplicate shift prevention
- Tracking restore on reopen
- Active shift polling
- Logout

---

## Must fix before testing

- **Profiles RLS recursion** – Migration 009 must be applied. Until then, profile load can fail with "infinite recursion detected in policy for relation profiles", blocking login and routing.
- **Metro cache** – If syntax errors persist, run `npx expo start --clear`.
