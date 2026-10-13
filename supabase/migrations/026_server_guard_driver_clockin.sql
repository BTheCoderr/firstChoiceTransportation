-- Strengthen server-authoritative clock-in after administrator-created driver
-- onboarding was introduced by migration 025.
-- Prevent a newly provisioned but incomplete driver from bypassing the onboarding
-- screen via RPC, and require an administrator-maintained Home or Office GPS base.
-- Does not modify any existing shift or payroll records.

CREATE OR REPLACE FUNCTION public.start_driver_shift(
  p_start_lat double precision,
  p_start_lng double precision
)
RETURNS public.shifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_onboarded_at timestamptz;
  v_shift public.shifts%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_start_lat IS NULL OR p_start_lng IS NULL
     OR p_start_lat::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_start_lng::text IN ('NaN', 'Infinity', '-Infinity')
     OR abs(p_start_lat) > 90 OR abs(p_start_lng) > 180 THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = '22023';
  END IF;
  SELECT company_id, onboarding_completed_at INTO v_company, v_onboarded_at
  FROM public.profiles WHERE id = v_user AND role = 'driver';
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'DRIVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF v_onboarded_at IS NULL THEN
    RAISE EXCEPTION 'ONBOARDING_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.driver_bases b
    WHERE b.driver_id = v_user
      AND lower(trim(b.name)) IN ('home', 'office')
      AND b.latitude BETWEEN -90 AND 90
      AND b.longitude BETWEEN -180 AND 180
  ) THEN
    RAISE EXCEPTION 'APPROVED_GPS_BASE_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.shifts WHERE driver_id = v_user AND clock_out_at IS NULL) THEN
    RAISE EXCEPTION 'ALREADY_ACTIVE' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.shifts (driver_id,company_id,clock_in_at,status,start_lat,start_lng)
  VALUES (v_user,v_company,clock_timestamp(),'started',p_start_lat,p_start_lng)
  RETURNING * INTO v_shift;
  RETURN v_shift;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'ALREADY_ACTIVE' USING ERRCODE = '23505';
END;
$$;
REVOKE ALL ON FUNCTION public.start_driver_shift(double precision,double precision)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_driver_shift(double precision,double precision)
  TO authenticated;


-- Legacy mobile versions can still insert directly until the coordinated
-- payroll-write cutover in migration 020. Guard those direct authenticated
-- inserts as well, without modifying trusted service-role maintenance actions.
CREATE OR REPLACE FUNCTION public.enforce_driver_clockin_prerequisites()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
  v_company uuid;
  v_onboarded_at timestamptz;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NEW.driver_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'DRIVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  SELECT role,company_id,onboarding_completed_at
    INTO v_role,v_company,v_onboarded_at
  FROM public.profiles WHERE id=NEW.driver_id;
  IF v_role IS DISTINCT FROM 'driver'::public.user_role
    OR v_company IS NULL OR NEW.company_id IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'DRIVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF v_onboarded_at IS NULL THEN
    RAISE EXCEPTION 'ONBOARDING_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.driver_bases b
    WHERE b.driver_id=NEW.driver_id
      AND lower(trim(b.name)) IN ('home','office')
      AND b.latitude BETWEEN -90 AND 90
      AND b.longitude BETWEEN -180 AND 180
  ) THEN
    RAISE EXCEPTION 'APPROVED_GPS_BASE_REQUIRED' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_driver_clockin_prerequisites ON public.shifts;
CREATE TRIGGER enforce_driver_clockin_prerequisites
BEFORE INSERT ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_driver_clockin_prerequisites();
REVOKE ALL ON FUNCTION public.enforce_driver_clockin_prerequisites()
  FROM PUBLIC,anon,authenticated;
