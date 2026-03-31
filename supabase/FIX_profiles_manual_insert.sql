-- =============================================================================
-- FIX: "Profile Not Found" - Manual insert (use if sync_orphan_profiles fails)
-- =============================================================================
-- Creates profiles for test users that don't have one.
-- =============================================================================

INSERT INTO public.profiles (id, company_id, email, full_name, role)
SELECT u.id, 'a0000000-0000-0000-0000-000000000001'::uuid, u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Unknown'),
  COALESCE((u.raw_user_meta_data->>'role')::user_role, 'driver')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.email IN ('admin@firstchoicetransport.com', 'driver1@firstchoicetransport.com', 'driver2@firstchoicetransport.com');
