# MVP Driver Polish – Implementation Summary

## 1. Automatic tracking start on shift start
- **Driver home** (`app/(driver)/index.tsx`): After successful `startShift`, calls `requestPermissions()` then `startTracking(shift.id)` before navigating.
- **`useShiftLocationTracking`**: New hook for permissions, tracking state, start/stop.
- **`LocationTrackingCard`**: Auto-starts tracking when mounted with `shiftId` and tracking inactive.

## 2. Restore tracking state on app launch
- **`useShiftLocationTracking`**: `refreshState()` on mount and when `AppState` becomes `"active"`.
- **`LocationTrackingCard`**: Auto-starts when it mounts with an active shift and tracking is not running.

## 3. Driver base setup screen
- **`app/(driver)/profile.tsx`**: New Profile tab for default base.
- **`DriverBaseForm`**: Form for base type (Home/Office), address, lat/lng.
- **`driverBases.ts`**: Added `getBasesForDriver`, `upsertDefaultBase`.
- **Driver layout**: Added Profile tab.

## 4. Active shift polling
- **`useDriverShift`**: Polls every 20 seconds when there is an active shift; stops when there is none.

## 5. Live shift duration
- **`src/utils/time.ts`**: `formatDurationMinutes`, `getShiftElapsedMinutes`.
- **`ShiftStatusCard`**: Shows "Shift running: Xh Ym" and updates every minute.
- **`app/(driver)/shift.tsx`**: Shows live duration on the shift screen.

## 6. Prevent duplicate shift creation
- **`shifts.ts`**: `startShift` checks for existing active shift before insert; returns `StartShiftResult`.
- **`useDriverShift`**: Returns `{ shift, error }` instead of `shift | null`.
- **Driver home**: Displays error banner when "already have an active shift".

## 7. Location tracking UX
- **`LocationTrackingCard`**: Active banner, error banner with retry hint, permission hint, clearer button states.

## 8. MVP readiness pass
- **`FinalDropoffCard`**: Updated copy to mention "Profile tab".
- **`AuthProvider`**: Type fix for `user_metadata`.

---

## Manual QA checks for these upgrades

### 1. Auto-start tracking
- [ ] Start a shift from Home → tracking should start automatically.
- [ ] If permissions are missing, prompt should appear and permissions requested.
- [ ] After granting permissions, tracking should start.
- [ ] On the shift screen, tracking card should show "Tracking active".

### 2. Restore tracking state
- [ ] Start a shift and tracking; go to background (e.g. home button).
- [ ] Return to app → tracking card should still show "Tracking active".
- [ ] Force kill app, reopen, go to shift screen → tracking should auto-restart or show correct state.

### 3. Driver base setup
- [ ] Open Profile tab → form loads.
- [ ] Select Home or Office, enter address, lat, lng. Save.
- [ ] End shift flow should work with a base set.
- [ ] Edit existing base → form pre-fills; save updates.

### 4. Active shift polling
- [ ] Start a shift; keep app open.
- [ ] After ~20 seconds, change shift status (e.g. via admin) → status should update without pull-to-refresh.
- [ ] End shift → polling should stop.

### 5. Live shift duration
- [ ] Start a shift → "Shift running: 0m" or "1m" appears.
- [ ] Wait ~1 minute → duration should update.
- [ ] On home, ShiftStatusCard shows "Shift running: Xh Ym".
- [ ] After ending shift, verified duration shows correctly.

### 6. Duplicate shift prevention
- [ ] Start a shift.
- [ ] Try to start another from Home → error banner: "You already have an active shift."
- [ ] Refresh or pull-to-refresh → error clears; View Shift shows active shift.

### 7. Location tracking UX
- [ ] Deny permissions → clear error message and retry path.
- [ ] When tracking is active → green banner "Tracking active".
- [ ] When tracking fails → error banner with "Retry" button.
- [ ] When permissions missing → permission hint shown.

### 8. General
- [ ] No TypeScript errors.
- [ ] No console errors during normal operation.
- [ ] End shift and Final Dropoff still work with base set.
- [ ] Profile tab accessible from driver tabs.
