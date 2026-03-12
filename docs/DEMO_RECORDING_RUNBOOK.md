# Demo Recording Runbook – Care1st Single-Company MVP

---

## Demo Prep

- [ ] Run migrations: `npx supabase db push` (or migrations 007 + 008)
- [ ] Create test users in Supabase Auth (Dashboard → Authentication → Users) if not seeded
- [ ] Ensure profiles exist for demo accounts (run seed or FIX_profiles_direct.sql if needed)
- [ ] Build and install on a physical device (Expo Go or dev build)
- [ ] Enable Location: Settings → App → Location → While Using / Always
- [ ] Record outdoors or near a window for reliable GPS
- [ ] Close other apps; enable Do Not Disturb
- [ ] Charge device; disable low-power mode

---

## Test Accounts

| Role  | Email                             | Password   | Notes                    |
|-------|-----------------------------------|------------|--------------------------|
| Admin | admin@firstchoicetransport.com    | (your set) | Role from email "admin@" |
| Driver| driver1@firstchoicetransport.com  | (your set) | Add base before demo     |

Create these in Supabase Auth if missing. Use a simple shared password (e.g. `Demo123!`) for demos.

---

## Seed Data Needed

- Company: First Choice Transportation (migration 001)
- Profiles: admin + driver(s) with `company_id` set
- Driver base: at least one driver with a default base (Profile tab) so Final Dropoff works
- Optional: 1–2 completed shifts so admin dashboard has data

---

## Screen Order to Record

1. **Login** – Sign in as driver
2. **Driver Home** – Show greeting, Start Shift
3. **Shift tab** – Start shift, show tracking, movement status
4. **Profile** – Show/add base (if needed)
5. **Shift tab** – Final Dropoff, shift ends
6. **Home** – "Today's last shift"
7. **Summary** – Completed shift list
8. **Logout** – Back to Login
9. **Login** – Sign in as admin
10. **Admin Dashboard** – Drivers, Recent shifts
11. **Driver detail** – Tap a driver
12. **Shift detail** – Tap a shift
13. **Logout** – Back to Login

---

## What to Say

- **Login:** "Drivers sign in with email and password."
- **Start Shift:** "Tap Start Shift to begin. The app records GPS and route in the background."
- **Tracking:** "Tracking runs in the background. Movement status updates when the driver moves."
- **Base:** "Drivers set a home or office base. The app uses it to estimate travel time when ending a shift."
- **Final Dropoff:** "Final Dropoff records the last stop. The shift ends after estimated travel time back to base."
- **Admin:** "Admins see drivers and shifts. They can drill into driver details and shift details, including route points and any flags."

---

## What to Avoid Tapping

- **Stop tracking** – Do not tap; it stops route recording mid-shift
- **Retry** on permission errors – Only if you intentionally demo the permission flow
- **Refresh** – Only if needed; can look like a glitch
- **Back** during Final Dropoff – Wait for completion

---

## Fallback if GPS/Tracking Acts Up

| Issue | Fallback |
|-------|----------|
| Tracking never starts | Say: "Tracking requires location permission. In production, drivers grant this at first use." Continue; show Final Dropoff (uses foreground GPS). |
| Movement stays "Started" | Say: "Movement updates every 30 seconds when the driver moves. For the demo we'll proceed." Tap Final Dropoff. |
| GPS timeout on Final Dropoff | Go outdoors or near a window. If it still fails: "GPS can time out indoors. Drivers typically end shifts at their last stop." Skip to admin flow. |
| Background tracking stops | Say: "Background tracking depends on device settings. The shift still completes; route may have gaps." Proceed with Final Dropoff. |
| Permission denied | Say: "Location permission is required. I'll show the admin view instead." Logout, sign in as admin, record admin flow only. |

---

## Quick Checklist

- [ ] Prep: migrations, users, base, device settings
- [ ] Record: Driver flow → Admin flow
- [ ] Avoid: Stop tracking, unnecessary refreshes
- [ ] Fallback: Narrate around GPS issues; switch to admin if needed
