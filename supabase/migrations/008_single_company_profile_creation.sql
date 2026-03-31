-- =============================================================================
-- Single-company MVP: ensure profile creation always assigns the one company
-- =============================================================================

-- ensure_profile: use seeded company ID directly (single-company)
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
  v_company_id CONSTANT UUID := 'a0000000-0000-0000-0000-000000000001';
  v_profile RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Profile already exists - return it
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

  -- Insert or do nothing if profile was created by another request (race)
  INSERT INTO public.profiles (id, company_id, email, full_name, role)
  VALUES (
    v_user_id,
    v_company_id,
    v_email,
    v_full_name,
    'driver'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Always fetch and return (works whether we inserted or it already existed)
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF v_profile IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'profile', to_jsonb(v_profile));
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'insert_failed');
END;
$$;

-- handle_new_user: use seeded company ID directly (single-company)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id CONSTANT UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.profiles (id, company_id, email, full_name, role)
  VALUES (
    NEW.id,
    v_company_id,
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown')),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '')::user_role,
      'driver'
    )
  );
  RETURN NEW;
END;
$$;
