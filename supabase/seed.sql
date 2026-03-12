-- =============================================================================
-- First Choice Transportation - Seed Data
-- Creates test users with passwords + profiles, driver_bases, shifts, etc.
-- =============================================================================
--
-- TEST USERS (password for all: Test123!)
--   admin@firstchoicetransport.com  (role: admin)
--   driver1@firstchoicetransport.com (role: driver)
--   driver2@firstchoicetransport.com (role: driver)
--
-- Run in Supabase SQL Editor or: npx supabase db reset (local)
-- =============================================================================

-- Enable password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create auth users (handle_new_user trigger creates profiles automatically)
--    Skips if user already exists (idempotent)
DO $$
DECLARE
  v_id UUID;
  v_pw TEXT := crypt('Test123!', gen_salt('bf'));
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('admin@firstchoicetransport.com'::text, 'Admin User'::text, 'admin'::text),
    ('driver1@firstchoicetransport.com', 'Driver One', 'driver'),
    ('driver2@firstchoicetransport.com', 'Driver Two', 'driver')
  ) AS t(email, full_name, role)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = r.email) THEN
      v_id := gen_random_uuid();
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      VALUES (v_id, v_instance_id, 'authenticated', 'authenticated', r.email, v_pw, NOW(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', r.full_name, 'role', r.role), NOW(), NOW());

      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (v_id, v_id, format('{"sub":"%s","email":"%s"}', v_id, r.email)::jsonb, 'email', v_id::text, NOW(), NOW(), NOW());
    END IF;
  END LOOP;
END $$;

-- 2. Sync profiles for any auth users without profiles (handle_new_user creates them; this catches edge cases)
SELECT public.sync_orphan_profiles();

-- 3. Update profiles: set company_id and role
UPDATE profiles
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid,
    role = 'admin'
WHERE email = 'admin@firstchoicetransport.com';

UPDATE profiles
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid,
    role = 'driver'
WHERE email = 'driver1@firstchoicetransport.com';

UPDATE profiles
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid,
    role = 'driver'
WHERE email = 'driver2@firstchoicetransport.com';

-- 4. Driver bases (sample locations - Los Angeles area)
INSERT INTO driver_bases (driver_id, name, latitude, longitude, address, is_default)
SELECT id, 'Home', 34.0522, -118.2437, 'Los Angeles, CA', TRUE
FROM profiles WHERE email = 'driver1@firstchoicetransport.com'
ON CONFLICT (driver_id, name) DO NOTHING;

INSERT INTO driver_bases (driver_id, name, latitude, longitude, address, is_default)
SELECT id, 'Office', 34.0195, -118.4912, 'Santa Monica, CA', TRUE
FROM profiles WHERE email = 'driver2@firstchoicetransport.com'
ON CONFLICT (driver_id, name) DO NOTHING;

-- 5. Sample shifts (yesterday - completed)
INSERT INTO shifts (
  driver_id,
  company_id,
  clock_in_at,
  clock_out_at,
  auto_end_at,
  start_lat,
  start_lng,
  first_movement_at,
  last_dropoff_at,
  last_dropoff_lat,
  last_dropoff_lng,
  verified_hours_minutes,
  status
)
SELECT
  p.id,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  (CURRENT_DATE - INTERVAL '1 day') + TIME '07:00',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '16:30',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '16:30',
  34.0522,
  -118.2437,
  (CURRENT_DATE - INTERVAL '1 day') + TIME '07:15',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '16:00',
  34.0522,
  -118.2437,
  555,
  'completed'
FROM profiles p
WHERE p.email = 'driver1@firstchoicetransport.com'
LIMIT 1;

INSERT INTO shifts (
  driver_id,
  company_id,
  clock_in_at,
  clock_out_at,
  auto_end_at,
  start_lat,
  start_lng,
  first_movement_at,
  last_dropoff_at,
  last_dropoff_lat,
  last_dropoff_lng,
  verified_hours_minutes,
  status
)
SELECT
  p.id,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  (CURRENT_DATE - INTERVAL '1 day') + TIME '08:00',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '17:00',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '17:00',
  34.0195,
  -118.4912,
  (CURRENT_DATE - INTERVAL '1 day') + TIME '08:10',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '16:45',
  34.0195,
  -118.4912,
  530,
  'completed'
FROM profiles p
WHERE p.email = 'driver2@firstchoicetransport.com'
LIMIT 1;

-- 6. Sample route points for driver1's shift
INSERT INTO route_points (shift_id, latitude, longitude, recorded_at, is_moving)
SELECT
  ds.shift_id,
  34.0522 + (n * 0.001),
  -118.2437 + (n * 0.001),
  (CURRENT_DATE - INTERVAL '1 day') + TIME '07:00' + (n * INTERVAL '5 minutes'),
  n > 0
FROM generate_series(0, 10) AS n
CROSS JOIN (
  SELECT s.id AS shift_id
  FROM shifts s
  JOIN profiles p ON p.id = s.driver_id AND p.email = 'driver1@firstchoicetransport.com'
  WHERE s.clock_in_at >= (CURRENT_DATE - INTERVAL '1 day')::date
    AND s.clock_in_at < (CURRENT_DATE - INTERVAL '1 day')::date + INTERVAL '1 day'
  ORDER BY s.clock_in_at DESC
  LIMIT 1
) ds
WHERE ds.shift_id IS NOT NULL;

-- 7. Weekly summaries (current week)
INSERT INTO weekly_summaries (driver_id, company_id, week_start, total_minutes, shift_count, flagged_count)
SELECT
  p.id,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  date_trunc('week', CURRENT_DATE)::date,
  555,
  1,
  0
FROM profiles p
WHERE p.email = 'driver1@firstchoicetransport.com'
ON CONFLICT (driver_id, week_start) DO UPDATE SET
  total_minutes = weekly_summaries.total_minutes + EXCLUDED.total_minutes,
  shift_count = weekly_summaries.shift_count + EXCLUDED.shift_count,
  updated_at = NOW();

INSERT INTO weekly_summaries (driver_id, company_id, week_start, total_minutes, shift_count, flagged_count)
SELECT
  p.id,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  date_trunc('week', CURRENT_DATE)::date,
  530,
  1,
  0
FROM profiles p
WHERE p.email = 'driver2@firstchoicetransport.com'
ON CONFLICT (driver_id, week_start) DO UPDATE SET
  total_minutes = weekly_summaries.total_minutes + EXCLUDED.total_minutes,
  shift_count = weekly_summaries.shift_count + EXCLUDED.shift_count,
  updated_at = NOW();
