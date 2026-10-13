-- Refuse client-supplied role claims when an Auth account is created.
-- A user can edit raw_user_meta_data, including a forged "admin" value.
-- Existing trusted administrators retain their existing database profile roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, company_id, email, full_name, role)
  VALUES (
    NEW.id,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
             NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'Unknown'),
    'driver'::public.user_role
  );
  RETURN NEW;
END;
$$;

-- Authorization is controlled by trusted database administration, never
-- by user-supplied metadata at signup. Inspect existing admins separately.
