# First Choice Transportation – QA Checklist & Test Plan

Use this while testing on your phone. Check off items as you complete them.

---

## 1. Driver flows – manual test checklist

### Login
- [ ] Open app → lands on login screen
- [ ] Enter invalid email/password → shows error message
- [ ] Enter valid driver credentials → redirects to driver home
- [ ] Logout → returns to login screen

### Driver home
- [ ] Greeting shows driver’s first name
- [ ] With no active shift: “Start Shift” button is visible
- [ ] With active shift: “Shift in progress” card shows, “View Shift” works
- [ ] Today’s last completed shift appears when no active shift
- [ ] Pull-to-refresh updates the screen

### Start shift
- [ ] Tap “Start Shift” → navigates to shift screen
- [ ] Shift screen shows status (Started/Moving/Idle)
- [ ] Location tracking card shows (permissions granted)
- [ ] First movement updates status to “Moving” (after driving)
- [ ] Idle at start updates status to “Idle” (after ~15 min no movement)

### Shift screen (active)
- [ ] Movement status card reflects current state
- [ ] Location tracking card shows current position or “Tracking…”
- [ ] “Final Dropoff” button is visible and tappable

### Final dropoff
- [ ] Tap “Final Dropoff” with GPS enabled → shift completes
- [ ] After completion → returns to driver home
- [ ] No active shift shown; today’s last shift shows completed shift
- [ ] Verified hours shown on completed shift card

### Final dropoff – failure cases
- [ ] No default base configured → shows “add a default base” message
- [ ] Location disabled → shows “enable location” message

### Driver summary
- [ ] Navigate to Summary tab
- [ ] Recent completed shifts listed
- [ ] Each shift shows clock-in/out, verified hours, status
- [ ] Flagged shifts show “Flagged” badge and reason

---

## 2. Admin flows – manual test checklist

### Login
- [ ] Enter valid admin credentials → redirects to admin dashboard

### Admin dashboard
- [ ] Drivers section lists company drivers
- [ ] Each driver shows name, role, weekly minutes, shift count
- [ ] Flagged count shown when > 0
- [ ] Recent shifts section lists completed shifts
- [ ] Pull-to-refresh updates data
- [ ] Tap driver → navigates to driver detail
- [ ] Tap shift → navigates to shift detail

### Driver detail
- [ ] Driver name, email, role displayed
- [ ] Default base shown when configured
- [ ] Weekly summary shows verified minutes, shift count, flagged count
- [ ] Recent shifts listed
- [ ] Tap shift → navigates to shift detail

### Shift detail
- [ ] Status, driver name, email shown
- [ ] Clock-in and clock-out times shown
- [ ] Verified hours shown
- [ ] First movement time shown when present
- [ ] Final dropoff section when present
- [ ] Route points count and client stops count shown
- [ ] Route points preview (first 10) when available
- [ ] Suspicious/flagged section when shift is flagged
- [ ] Pull-to-refresh reloads data

---

## 3. Suspicious activity rule validation

### Rule 1: No movement within threshold (30 min)
- [ ] Start shift, stay still for 30+ min
- [ ] Shift status becomes “Idle”
- [ ] Shift is flagged with reason “No movement within threshold”
- [ ] Admin shift detail shows suspicious section
- [ ] Driver summary shows “Flagged” and “No movement at start”

### Rule 2: Late first movement (30+ min after clock-in)
- [ ] Start shift, stay still 15+ min, then move
- [ ] First movement recorded 30+ min after clock-in
- [ ] Shift is flagged with “First movement much later than clock-in”
- [ ] Admin and driver views show flag

### Rule 3: Long idle period (45+ min)
- [ ] Start shift, move, then stay still 45+ min
- [ ] Shift is flagged with “Long idle period during shift”
- [ ] Admin and driver views show flag

### Rule 4: Extended shift (> 10 hours)
- [ ] Complete a shift with verified minutes > 600 (10 hours)
- [ ] Shift status is “Flagged” instead of “Completed”
- [ ] Admin shift detail shows “Shift time exceeds reasonable max”
- [ ] Driver summary shows “Extended shift”

### Duplicate flagging
- [ ] Once flagged, no duplicate flag writes (check DB or behavior)

---

## 4. Edge cases and failure cases

### Auth
- [ ] Invalid credentials → clear error message
- [ ] Network off during login → error or retry
- [ ] Session persists after app restart

### Location
- [ ] Location permission denied → appropriate message
- [ ] Location off → Final Dropoff shows “enable location”
- [ ] Background tracking: use dev build on Android (Expo Go does not support it)

### Shifts
- [ ] Start shift with no network → graceful failure
- [ ] Final dropoff with no base → clear “add base” message
- [ ] Navigate away during Final Dropoff → no crash
- [ ] Refresh during active shift → data still correct

### Admin
- [ ] No drivers in company → “No drivers” message
- [ ] No completed shifts → “No completed shifts” message
- [ ] Driver with no base → base section not shown
- [ ] Shift not found (bad ID) → “Shift not found” message

### Data
- [ ] Empty or null fields handled (e.g. no first_movement_at)
- [ ] Flagged shift with no suspicious_reason → UI does not break

---

## 5. Bug bash – end-to-end in one sitting (~30 min)

**Setup:** Driver account + Admin account, both in same company. Dev build on device for background GPS.

### Phase 1: Driver flow (≈15 min)
1. Log in as driver.
2. Start shift.
3. Drive or walk for 2–3 min (trigger movement).
4. Stay still 2–3 min (trigger idle).
5. Tap Final Dropoff.
6. Confirm return to home and completed shift.
7. Open Summary and confirm shift appears.

### Phase 2: Admin flow (≈5 min)
8. Log out, log in as admin.
9. Open dashboard.
10. Confirm driver and shift appear.
11. Open driver detail.
12. Open shift detail.
13. Confirm times, verified hours, route points count.

### Phase 3: Suspicious rule (≈10 min)
14. Log in as driver.
15. Start shift.
16. Leave phone still for 30+ min (or adjust device time for testing).
17. Confirm shift is flagged.
18. Log in as admin.
19. Open shift detail and confirm suspicious section.

### Phase 4: Failure cases (≈5 min)
20. Start shift, turn off location, tap Final Dropoff → expect error message.
21. (If possible) Remove driver base → Final Dropoff shows “add base” message.

**Done.** Note any crashes, wrong data, or confusing messages.
