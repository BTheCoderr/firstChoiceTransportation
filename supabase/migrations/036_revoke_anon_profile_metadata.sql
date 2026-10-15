-- 036: Never expose a SECURITY DEFINER profile metadata function to anonymous clients.
-- Authenticated app sessions use this RPC to read their own role/company.
-- Changes privileges only, never employee/payroll/location data.
REVOKE ALL ON FUNCTION public.get_my_profile_meta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_meta() TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon','public.get_my_profile_meta()','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.get_my_profile_meta()','EXECUTE') THEN
    RAISE EXCEPTION 'UNSAFE_PROFILE_META_GRANTS';
  END IF;
END $$;
