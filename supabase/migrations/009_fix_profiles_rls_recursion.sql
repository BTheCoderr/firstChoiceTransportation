-- =============================================================================
-- Fix infinite recursion in profiles RLS
-- The "Admins can read all profiles in company" policy queried profiles inside
-- a policy ON profiles, causing recursion. Use a SECURITY DEFINER helper instead.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile_meta()
RETURNS TABLE(role user_role, company_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.role, p.company_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can read all profiles in company" ON profiles;

-- Recreate using the helper (no direct profiles read in policy)
CREATE POLICY "Admins can read all profiles in company"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.get_my_profile_meta() m
      WHERE m.role = 'admin' AND m.company_id = profiles.company_id
    )
  );
