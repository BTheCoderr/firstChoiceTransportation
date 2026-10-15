-- 029: Finish interrupted administrator-created driver accounts without deleting Auth users.
-- The Auth trigger may not see its provisioning metadata at INSERT time.
-- Only a service-role RPC can reconcile a pending account; never public clients.
CREATE OR REPLACE FUNCTION public.finalize_driver_provisioning(
  p_email text, p_company_id uuid
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_user auth.users%ROWTYPE;
  v_intent public.driver_provisioning_intents%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF length(v_email) < 5 OR length(v_email) > 254 OR p_company_id IS NULL THEN
    RETURN 'invalid_input';
  END IF;

  SELECT * INTO v_user FROM auth.users
   WHERE lower(email) = v_email LIMIT 1;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user.id;
  IF FOUND THEN
    IF v_profile.role = 'driver'::public.user_role
      AND v_profile.company_id = p_company_id THEN
      IF v_profile.onboarding_completed_at IS NULL THEN
        RETURN 'pending_activation';
      END IF;
      RETURN 'already_active';
    END IF;
    RETURN 'conflicting_profile';
  END IF;

  -- The pending intent, its company, original admin and unpredictable key must
  -- all match the actual server-created Auth user's immutable ID/metadata.
  -- Never attach an arbitrary existing Auth account or trust client user_metadata.
  SELECT * INTO v_intent FROM public.driver_provisioning_intents
   WHERE email = v_email AND company_id = p_company_id
     AND consumed_at IS NULL AND user_id IS NULL
     AND created_at > clock_timestamp() - interval '7 days'
   FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_pending'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_intent.created_by
      AND p.company_id = p_company_id AND p.role = 'admin'::public.user_role
  ) THEN RETURN 'invalid_creator'; END IF;

  IF coalesce(v_user.raw_app_meta_data->>'first_choice_provisioning_key','')
      <> v_intent.provisioning_key::text THEN
    RETURN 'provisioning_key_mismatch';
  END IF;

  INSERT INTO public.profiles (
    id, company_id, email, full_name, role, onboarding_completed_at
  ) VALUES (
    v_user.id, v_intent.company_id, v_email,
    'Pending driver setup', 'driver'::public.user_role, NULL
  );

  UPDATE public.driver_provisioning_intents SET
    user_id = v_user.id, consumed_at = clock_timestamp()
  WHERE id = v_intent.id;

  RETURN 'recovered';
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_driver_provisioning(text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_driver_provisioning(text,uuid)
  TO service_role;
COMMENT ON FUNCTION public.finalize_driver_provisioning(text,uuid) IS
  'Service-role only: reconcile a trusted, unconsumed driver invitation with its original Auth user. Does not reset passwords or modify existing profiles.';
