-- =============================================================================
-- Run this in Supabase SQL Editor to set admin role for admin user
-- =============================================================================

UPDATE profiles
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid,
    role = 'admin'
WHERE email = 'admin@firstchoicetransport.com';
