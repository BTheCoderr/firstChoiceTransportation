-- Additive phase: deploy with existing mobile builds still supported.
-- DOES NOT revoke existing direct shift writes; migration 020 is the coordinated cutover.
-- Both entry points use server time, trusted profile/company, row locks and role checks.
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
  SELECT company_id INTO v_company
  FROM public.profiles WHERE id = v_user AND role = 'driver';
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'DRIVER_REQUIRED' USING ERRCODE = '42501';
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

CREATE OR REPLACE FUNCTION public.complete_driver_shift(
  p_shift_id uuid,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision
)
RETURNS public.shifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_shift public.shifts%ROWTYPE;
  v_out public.shifts%ROWTYPE;
  v_base public.driver_bases%ROWTYPE;
  v_dropoff_at timestamptz;
  v_distance double precision;
  v_return_minutes integer;
  v_clock_out timestamptz;
  v_minutes integer;
  v_point_count integer;
  v_flagged boolean;
  v_detail jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_shift_id IS NULL OR p_dropoff_lat IS NULL OR p_dropoff_lng IS NULL
     OR p_dropoff_lat::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_dropoff_lng::text IN ('NaN', 'Infinity', '-Infinity')
     OR abs(p_dropoff_lat) > 90 OR abs(p_dropoff_lng) > 180 THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = '22023';
  END IF;
  SELECT s.* INTO v_shift FROM public.shifts s
  JOIN public.profiles p ON p.id = s.driver_id
  WHERE s.id = p_shift_id AND s.driver_id = v_user
    AND p.role = 'driver' AND p.company_id = s.company_id
  FOR UPDATE OF s;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_SHIFT' USING ERRCODE = '42501';
  END IF;
  -- Idempotent repeat requests do not produce a second payroll calculation.
  IF v_shift.clock_out_at IS NOT NULL THEN
    RETURN v_shift;
  END IF;
  IF v_shift.status NOT IN ('started','moving','idle','flagged') THEN
    RAISE EXCEPTION 'NO_SHIFT' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_base FROM public.driver_bases
  WHERE driver_id = v_user AND is_default IS TRUE
  ORDER BY updated_at DESC, id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_BASE' USING ERRCODE = '22023';
  END IF;
  IF v_base.latitude IS NULL OR v_base.longitude IS NULL
     OR abs(v_base.latitude) > 90 OR abs(v_base.longitude) > 180 THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = '22023';
  END IF;
  v_dropoff_at := clock_timestamp();
  IF v_shift.clock_in_at > v_dropoff_at THEN
    RAISE EXCEPTION 'INVALID_CLOCK_IN' USING ERRCODE = '22023';
  END IF;
  -- Great-circle approximation, average 11.2m/s (~25mph), capped at 60 min.
  v_distance := 6371000.0 * 2.0 * asin(sqrt(least(1.0, greatest(0.0,
    power(sin(radians(p_dropoff_lat - v_base.latitude) / 2), 2)
    + cos(radians(v_base.latitude)) * cos(radians(p_dropoff_lat))
      * power(sin(radians(p_dropoff_lng - v_base.longitude) / 2), 2)))));
  v_return_minutes := least(60, ceil(v_distance / (11.2 * 60.0)))::integer;
  v_clock_out := v_dropoff_at + make_interval(mins => v_return_minutes);
  v_minutes := greatest(0, floor(extract(epoch from (v_clock_out - v_shift.clock_in_at)) / 60))::integer;
  -- We flag missing tracking evidence for administrator review instead of assuming
  -- that a GPS permission implies trustworthy background route history.
  SELECT count(*) INTO v_point_count
  FROM public.route_points WHERE shift_id = p_shift_id;
  v_flagged := v_shift.status = 'flagged' OR v_shift.flagged_at IS NOT NULL
    OR v_point_count = 0 OR v_minutes > 960;
  v_detail := coalesce(v_shift.suspicious_details, '{}'::jsonb)
    || jsonb_build_object('calculated_on_server',true,
                          'route_points_before_dropoff',v_point_count,
                          'return_estimate_method','straight_line_11_2_mps');
  IF v_point_count = 0 THEN
    v_detail := v_detail || '{"missing_route_history":true}'::jsonb;
  END IF;
  INSERT INTO public.route_points (shift_id,latitude,longitude,recorded_at,is_moving)
  VALUES (p_shift_id,p_dropoff_lat,p_dropoff_lng,v_dropoff_at,false);
  UPDATE public.shifts
  SET last_dropoff_at = v_dropoff_at,
      last_dropoff_lat = p_dropoff_lat,
      last_dropoff_lng = p_dropoff_lng,
      estimated_return_minutes = v_return_minutes,
      return_base_lat = v_base.latitude,
      return_base_lng = v_base.longitude,
      return_base_type = CASE WHEN lower(trim(v_base.name))='office' THEN 'office' ELSE 'home' END,
      return_base_address = v_base.address,
      clock_out_at = v_clock_out,
      auto_end_at = v_clock_out,
      verified_hours_minutes = v_minutes,
      status = CASE WHEN v_flagged THEN 'flagged'::public.shift_status ELSE 'completed'::public.shift_status END,
      suspicious_reason = CASE
        WHEN v_shift.suspicious_reason IS NOT NULL THEN v_shift.suspicious_reason
        WHEN v_point_count = 0 THEN 'missing_route_history'
        WHEN v_minutes > 960 THEN 'extended_shift'
        ELSE NULL END,
      flagged_at = CASE WHEN v_flagged THEN coalesce(v_shift.flagged_at, v_dropoff_at) ELSE NULL END,
      suspicious_details = v_detail
  WHERE id = p_shift_id
  RETURNING * INTO v_out;
  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_driver_shift(uuid,double precision,double precision)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_driver_shift(uuid,double precision,double precision)
  TO authenticated;
