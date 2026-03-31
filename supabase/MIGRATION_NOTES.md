# Supabase Migration Notes

## How to Run This Migration

### Option A: Supabase Dashboard (SQL Editor)

1. Go to [supabase.com](https://supabase.com) → your project
2. Open **SQL Editor**
3. Run migrations in order:
   - **001_initial_schema.sql** – full schema (companies, profiles, driver_bases, shifts, route_points, client_stops, weekly_summaries)
   - **002_profiles_login_identifier.sql** – adds login_type, login_id for DL/username auth
4. Copy each file’s contents and execute

### Option B: Supabase CLI

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or run a single file:

```bash
supabase db execute -f supabase/migrations/001_initial_schema.sql
supabase db execute -f supabase/migrations/002_profiles_login_identifier.sql
```

---

## Seed Data (After Migration)

**Prerequisite:** Create 3 users in Supabase Auth first:

1. **Auth** → **Users** → **Add user**
2. Create:
   - `admin@firstchoicetransport.com` (set password)
   - `driver1@firstchoicetransport.com` (set password)
   - `driver2@firstchoicetransport.com` (set password)

Then run **seed.sql** in the SQL Editor.

---

## Schema Summary

| Table | Purpose |
|-------|---------|
| `companies` | Company (First Choice Transportation) |
| `profiles` | User profile, role, company (references auth.users) |
| `driver_bases` | Base locations (home/office) per driver |
| `shifts` | Clock in/out, GPS, verified hours, status, suspicious fields |
| `route_points` | GPS points during shift |
| `client_stops` | Pickups/dropoffs during shift |
| `weekly_summaries` | Pre-computed weekly totals |

**Shift statuses:** `started`, `moving`, `idle`, `completed`, `flagged`  
**Suspicious:** `suspicious_reason`, `suspicious_details`, `flagged_at` on shifts (no separate alerts table)

---

## Roles

- **driver**: Manage own shifts, route_points, client_stops, driver_bases
- **admin**: Read all data, manage weekly_summaries, driver_bases

---

## Test Credentials (after seed)

| Email | Role |
|-------|------|
| admin@firstchoicetransport.com | Admin |
| driver1@firstchoicetransport.com | Driver |
| driver2@firstchoicetransport.com | Driver |
