# Driver-Side Final Audit

**Flow reviewed:** Login → Home → Start Shift → Shift Screen (tracking, movement, final dropoff) → End Shift → Home

---

## 1. UX Gaps

| Gap | Location | Impact |
|-----|----------|--------|
| **Start Shift does nothing when `company_id` is null** | `app/(driver)/index.tsx` | Synthetic profile fallback sets `company_id: null`. `handleStartShift` returns early with no feedback. Driver taps "Start Shift" and nothing happens. |
| **No navigation from "No active shift" state** | `app/(driver)/shift.tsx` | When driver lands on Shift tab with no active shift, they see text only. No button to go to Home. |
| **"Stop tracking" allows accidental mid-shift stop** | `LocationTrackingCard.tsx` | Driver can stop route recording while shift is still active. Creates incomplete route data. |
| **Tracking fails silently on start** | `app/(driver)/index.tsx` | If `requestPermissions()` or `startTracking()` fails, we still navigate. Driver sees shift screen with tracking inactive. |
| **No "Use current location" for base** | `DriverBaseForm.tsx` | Driver must manually enter lat/lng. Poor UX for non-technical users. |
| **Final dropoff has no retry** | `FinalDropoffCard.tsx` | If `getCurrentPositionAsync` fails (timeout, poor GPS), user sees one error. No retry button. |

---

## 2. Runtime Failure Points

| Failure | Location | Likelihood |
|---------|----------|------------|
| **`company_id` null → startShift never called** | `handleStartShift` | High when using synthetic profile |
| **`getCurrentPositionAsync` timeout** | `FinalDropoffCard` | Medium indoors / poor GPS |
| **Supabase insert/update network error** | `shifts.ts`, `endShift.ts` | Medium on weak network |
| **`profile?.id` undefined during initial load** | Multiple screens | Low (loading state handled) |
| **Race: LocationTrackingCard unmount during auto-start** | `LocationTrackingCard` useEffect | Low (async cleanup) |

---

## 3. Naming Mismatches with Schema

| Code | Schema | Status |
|------|--------|--------|
| `verified_hours_minutes` | Stores minutes (name misleading) | Consistent usage; name is legacy |
| `driver_bases.name` | TEXT | We use "Home" \| "Office" ✓ |
| `driver_bases.is_default` | BOOLEAN | ✓ |
| `shifts` fields | All match schema | ✓ |

No critical mismatches found.

---

## 4. Pre–TestFlight / Production Improvements

- Handle `company_id` null with clear user feedback
- Add "Use current location" for base setup
- Remove or gate "Stop tracking" for active shifts
- Add retry for final dropoff location fetch
- Add navigation from shift empty state to Home
- Improve network error messages (e.g. "Check your connection")
- Add link/button from FinalDropoffCard to Profile when no base

---

## Top 5 Fixes (Priority Order)

### 1. **Handle `company_id` null – show feedback and block Start Shift**
**Impact:** Driver cannot start shift when profile has no company_id (e.g. synthetic profile). UX: silent failure.
**Fix:** In `StartShiftCard` or `handleStartShift`, when `!profile?.company_id`, show a message like "Your account is not linked to a company. Contact your administrator." and disable the Start Shift button.

### 2. **Add navigation from "No active shift" to Home**
**Impact:** Driver on Shift tab with no active shift has no way to start one without manually switching tabs.
**Fix:** Add a "Go to Home" button on the shift screen empty state.

### 3. **Remove or hide "Stop tracking" during active shift**
**Impact:** Driver can stop route recording mid-shift, leading to incomplete route data.
**Fix:** Remove the Stop tracking button, or change it to a warning-only action (e.g. "Pause tracking" with confirmation). For MVP, removing is simplest.

### 4. **Add "Use current location" for base setup**
**Impact:** Manual lat/lng entry is error-prone and inconvenient.
**Fix:** Add a "Use current location" button in `DriverBaseForm` that calls `Location.getCurrentPositionAsync` and fills lat/lng.

### 5. **Add retry for final dropoff location fetch**
**Impact:** Single GPS failure blocks shift completion with no retry.
**Fix:** In `FinalDropoffCard`, on catch or failure, show an Alert with a "Retry" option that calls `handleFinalDropoff` again.
