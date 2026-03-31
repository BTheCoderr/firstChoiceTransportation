-- =============================================================================
-- ensure_profile: Create profile for auth users who don't have one
-- Used when users are added via Supabase Dashboard (Add user) - the
-- handle_new_user trigger only runs on sign-up, not manual user creation.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_full_name TEXT;
  v_company_id UUID;
  v_profile RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Profile already exists
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF v_profile IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'profile', to_jsonb(v_profile));
  END IF;

  -- Get user from auth.users (SECURITY DEFINER can read auth schema)
  SELECT u.email, COALESCE(u.raw_user_meta_data->>'full_name', 'Unknown')
  INTO v_email, v_full_name
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  SELECT id INTO v_company_id FROM public.companies LIMIT 1;

  INSERT INTO public.profiles (id, company_id, email, full_name, role)
  VALUES (
    v_user_id,
    v_company_id,
    v_email,
    v_full_name,
    'driver'
  );

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  RETURN jsonb_build_object('success', true, 'profile', to_jsonb(v_profile));
END;
$$;

-- One-time sync: create profiles for auth.users that don't have one
-- (e.g. users added via Dashboard before handle_new_user existed)
CREATE OR REPLACE FUNCTION public.sync_orphan_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      r.id,
      v_company_id,
      COALESCE(r.raw_user_meta_data->>'email', r.email),
      COALESCE(r.raw_user_meta_data->>'full_name', 'Unknown'),
      COALESCE((r.raw_user_meta_data->>'role')::user_role, 'driver')
    );
  END LOOP;
END;
$$;

SELECT public.sync_orphan_profiles();
