-- =============================================================================
-- Fix handle_new_user trigger for Dashboard user creation
-- Supabase Auth requires SET search_path on trigger functions that touch public
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get first company (NULL if none exists)
  SELECT id INTO v_company_id FROM public.companies LIMIT 1;

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
