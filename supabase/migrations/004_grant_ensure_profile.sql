-- Allow authenticated users to call ensure_profile (creates profile on first login)
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;
