# Real Device Test Plan – Single-Company MVP

**App:** First Choice Transportation (Care1st)  
**Scope:** Driver flow, Admin flow, GPS/background tracking  
**Device:** Physical phone (iOS or Android) – required for location and background

---

## 1. Driver End-to-End Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Open app, tap Logout if already logged in | Login screen appears |
| 2 | Enter driver email + password, tap Sign In | Redirects to Driver Home (tabs: Home, Shift, Summary, Profile) |
| 3 | On Home, tap **Start Shift** | Shift starts; navigates to Shift tab; "Tracking active" or permission prompt appears |
| 4 | Grant location permissions if prompted (Foreground + Background) | Tracking starts; "Tracking active" shown |
| 5 | Wait 30–60 seconds, move 50+ meters (or drive) | Movement status updates (Started → Moving); route points recorded |
| 6 | On Profile tab, add default base (lat/lng or address) if not set | Base saved; "Add a base" warning on Shift tab disappears |
| 7 | On Shift tab, tap **Final Dropoff** | GPS captured; shift ends; redirects to Home |
| 8 | On Home | "Today's last shift" shows completed shift with verified hours |
| 9 | On Summary tab | Completed shift appears in list |
| 10 | Tap Logout | Returns to Login screen |

---

## 2. Admin End-to-End Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Open app, tap Logout if already logged in | Login screen appears |
| 2 | Enter admin email (e.g. admin@...) + password, tap Sign In | Redirects to Admin Dashboard |
| 3 | On Dashboard | "Drivers" section and "Recent shifts" section visible |
| 4 | Tap a driver (if any) | Driver detail: name, email, weekly summary, recent shifts |
| 5 | Tap a shift | Shift detail: times, first movement, final dropoff, route points count |
| 6 | For flagged shifts | Red "Flagged" badge and suspicious reason visible |
| 7 | Tap Logout | Returns to Login screen |

---

## 3. GPS / Background Tracking Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Start a shift as driver | Tracking starts; persistent notification (Android) or location indicator (iOS) |
| 2 | Put app in background (home button / app switcher) | Notification stays; tracking continues |
| 3 | Move 100+ meters (walk or drive) | Route points recorded in background |
| 4 | Return to app | Shift screen shows; movement status updated |
| 5 | End shift with Final Dropoff | Shift completes; tracking stops; notification disappears |
| 6 | Start shift, then force-close app | After reopen, if shift still active: tracking state restored or can be restarted |

---

## 4. Most Likely Runtime Bugs to Watch For

| Bug | Where | What to Check |
|-----|-------|---------------|
| **Logout does nothing** | LogoutButton | After tap, app should go to Login. If stuck, check network/Supabase. |
| **Start Shift does nothing** | Driver Home | No error shown; shift not created. Check profile/company setup. |
| **Tracking never starts** | Shift tab | Permission denied or background task not registered. Check Settings > App > Location. |
| **"Base location required" blocks Final Dropoff** | Shift tab | Add base in Profile tab first. |
| **GPS timeout on Final Dropoff** | Indoors / poor signal | "Could not get your location" – retry outdoors or with better signal. |
| **Movement stays "Started"** | Shift tab | Need to move 50+ m; wait for next location update (30s interval). |
| **Admin sees empty Drivers** | Admin Dashboard | No drivers with `company_id` set, or migrations not run. |
| **Profile Not Found** | After login | Profile not in DB; ensure_profile or migrations may need to run. |

---

## 5. Pass/Fail Checklist (Phone Testing)

### Driver Flow
- [ ] Login → Driver Home
- [ ] Start Shift → Shift tab
- [ ] Permissions granted → Tracking active
- [ ] Movement updates (Started → Moving)
- [ ] Add base in Profile
- [ ] Final Dropoff → Shift ends
- [ ] Home shows "Today's last shift"
- [ ] Summary shows completed shift
- [ ] Logout → Login screen

### Admin Flow
- [ ] Login → Admin Dashboard
- [ ] Drivers list visible (or "No drivers" if empty)
- [ ] Recent shifts visible (or "No completed shifts" if empty)
- [ ] Driver detail opens
- [ ] Shift detail opens
- [ ] Logout → Login screen

### GPS / Background
- [ ] Tracking persists in background
- [ ] Route points recorded
- [ ] Final Dropoff gets location
- [ ] Tracking stops after shift ends

### Auth
- [ ] Logout works from Driver
- [ ] Logout works from Admin
