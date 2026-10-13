-- Tighten older RPCs found in the live First Choice database.
-- Keep trusted user-profile initialization available to authenticated users.
-- Do not make security-definer functions callable to all roles by default.

-- Weekly totals must obey RLS. A caller may only see shifts that their
-- account can SELECT (themselves, or same-company shifts for admins).
ALTER FUNCTION public.get_driver_weekly_hours(uuid, date) SECURITY INVOKER;
ALTER FUNCTION public.get_driver_weekly_hours(uuid, date) SET search_path = public;
REVOKE ALL ON FUNCTION public.get_driver_weekly_hours(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_weekly_hours(uuid, date) TO authenticated;

-- Dashboard maintenance function, not a client RPC. It also must not trust
-- user_metadata.role even if called by a privileged administrator.
CREATE OR REPLACE FUNCTION public.sync_orphan_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r RECORD;
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM public.companies LIMIT 1;
  FOR r IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.profiles (id, company_id, email, full_name, role)
    VALUES (
      r.id, v_company_id, r.email,
      COALESCE(NULLIF(TRIM(r.raw_user_meta_data->>'full_name'), ''), 'Unknown'),
      'driver'::public.user_role
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_orphan_profiles() FROM PUBLIC, anon, authenticated;

-- New-user trigger is fired by the database, not a callable REST endpoint.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ensure_profile checks auth.uid() and only creates/returns the caller's
-- own record. Keep it callable by signed-in clients, not anonymous clients.
REVOKE ALL ON FUNCTION public.ensure_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;

-- The profile-meta helper is deliberately used in RLS; changing its
-- invoker privileges can break these policies. Review separately.
ALTER FUNCTION public.update_updated_at() SET search_path = public;
