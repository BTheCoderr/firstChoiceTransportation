-- =============================================================================
-- FIX: Profile Not Found - DIRECT INSERT using your exact user IDs
-- =============================================================================
-- Copy-paste this ENTIRE block into Supabase SQL Editor and RUN IT.
-- Then: Sign out in app, sign in again.
-- =============================================================================

-- 0. Ensure company exists (required for profiles)
INSERT INTO public.companies (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 'First Choice Transportation')
ON CONFLICT (id) DO NOTHING;

-- 1. Create profiles for your 3 users (exact UIDs from your Auth dashboard)
INSERT INTO public.profiles (id, company_id, email, full_name, role)
VALUES 
  ('1667d0ac-6e0f-43c8-8a88-1af21a706036'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'admin@firstchoicetransport.com', 'Admin User', 'admin'),
  ('b2c9c2bf-bb64-407d-8253-68d10cf0a750'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'driver1@firstchoicetransport.com', 'Driver One', 'driver'),
  ('803cdb33-decf-462f-a60b-db81558c5148'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'driver2@firstchoicetransport.com', 'Driver Two', 'driver')
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = NOW();
