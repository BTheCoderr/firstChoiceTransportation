-- Block authenticated API clients from elevating their own role or moving companies.
-- RLS controls *which rows* an account can update, not *which columns*.
-- Existing "Users can update own profile" must not allow role/company_id edits.
CREATE OR REPLACE FUNCTION public.prevent_untrusted_profile_identity_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- PostgREST uses the authenticated/anon database role for user requests.
  -- Trusted management writes made as postgres/service_role retain their ability
  -- to update roles in the controlled back office.
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION
        'Changing profile identity, company or role requires administration'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_untrusted_profile_identity_changes ON public.profiles;

CREATE TRIGGER prevent_untrusted_profile_identity_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_untrusted_profile_identity_changes();
