-- Driver accounts are provisioned only through the authenticated admin Edge Function.
-- A public Auth signup is never a substitute for an administrator's driver invitation.
-- Existing trusted profiles remain valid and are treated as onboarded.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

UPDATE public.profiles
  SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at)
  WHERE onboarding_completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.driver_provisioning_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  provisioning_key uuid NOT NULL UNIQUE,
  user_id uuid UNIQUE REFERENCES auth.users(id),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT provisioning_email_normalized CHECK (email = lower(trim(email))),
  CONSTRAINT provisioning_consumption_consistent CHECK (
    (consumed_at IS NULL AND user_id IS NULL)
    OR (consumed_at IS NOT NULL AND user_id IS NOT NULL)
  )
);
ALTER TABLE public.driver_provisioning_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.driver_provisioning_intents FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.driver_provisioning_intents TO service_role;

-- Only a service-role Auth admin createUser that sets trusted app_metadata
-- and matches a pre-registered, one-time provision may create a driver profile.
-- Client-writable user_metadata is never used as an authorization signal.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent public.driver_provisioning_intents%ROWTYPE;
  v_key text;
BEGIN
  v_key := NEW.raw_app_meta_data->>'first_choice_provisioning_key';
  IF v_key IS NULL OR v_key = '' THEN
    -- Anonymous/self signups may create an auth identity if Auth signup is
    -- enabled, but never a valid company driver profile.
    RETURN NEW;
  END IF;

  SELECT * INTO v_intent
  FROM public.driver_provisioning_intents i
  WHERE i.email = lower(trim(NEW.email))
    AND i.provisioning_key::text = v_key
    AND i.consumed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN RETURN NEW; END IF;

  INSERT INTO public.profiles(id,company_id,email,full_name,role,onboarding_completed_at)
  VALUES (
    NEW.id,v_intent.company_id,NEW.email,
    'Pending driver setup','driver'::public.user_role,NULL
  );
  UPDATE public.driver_provisioning_intents
  SET user_id = NEW.id, consumed_at = clock_timestamp()
  WHERE id = v_intent.id;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- The old ensure_profile RPC previously created an unauthorized driver
-- record for ANY authenticated identity. Make it read-only.
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','not_authenticated');
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','admin_provisioning_required');
  END IF;
  RETURN jsonb_build_object('success',true,'profile',to_jsonb(v_profile));
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;

-- Drivers can fill in a display name and optional contact phone, but cannot
-- assign themselves company membership or change an already finalized
-- onboarding timestamp. Existing identity guard remains in force.
CREATE OR REPLACE FUNCTION public.guard_driver_onboarding_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user='authenticated' AND OLD.role='driver'::public.user_role THEN
    IF NEW.onboarding_completed_at IS DISTINCT FROM OLD.onboarding_completed_at THEN
      IF OLD.onboarding_completed_at IS NOT NULL
        OR NEW.onboarding_completed_at IS NULL
        OR length(trim(coalesce(NEW.full_name,''))) < 2
        OR length(trim(coalesce(NEW.full_name,''))) > 120
      THEN
        RAISE EXCEPTION 'INVALID_DRIVER_ONBOARDING' USING ERRCODE='42501';
      END IF;
      NEW.onboarding_completed_at := clock_timestamp();
    END IF;
    IF length(coalesce(NEW.contact_phone,'')) > 40 THEN
      RAISE EXCEPTION 'INVALID_PHONE' USING ERRCODE='22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driver_onboarding_fields ON public.profiles;
CREATE TRIGGER guard_driver_onboarding_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_driver_onboarding_fields();
REVOKE ALL ON FUNCTION public.guard_driver_onboarding_fields() FROM PUBLIC, anon, authenticated;
