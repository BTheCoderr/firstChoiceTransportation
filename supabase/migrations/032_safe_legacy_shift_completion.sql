-- 032. Preserve legacy End Shift while removing client-location-based
-- automatic payroll credits. Prior 019 accepted a client-reported final
-- dropoff coordinate and added up to 60 paid return minutes. Until the
-- coordinated migration 020 revokes this RPC, it must close ONLY for review.
-- This function updates only the driver's currently open shift on request.
-- The approved payroll ledger (027) is never written here.

CREATE OR REPLACE FUNCTION public.complete_driver_shift(
  p_shift_id uuid, p_dropoff_lat double precision, p_dropoff_lng double precision
)
RETURNS public.shifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_shift public.shifts%ROWTYPE;
  v_closed public.shifts%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_shift_id IS NULL OR p_dropoff_lat IS NULL OR p_dropoff_lng IS NULL
    OR p_dropoff_lat::text IN ('NaN','Infinity','-Infinity')
    OR p_dropoff_lng::text IN ('NaN','Infinity','-Infinity')
    OR abs(p_dropoff_lat) > 90 OR abs(p_dropoff_lng) > 180 THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = '22023';
  END IF;

  SELECT s.* INTO v_shift FROM public.shifts s
  WHERE s.id = p_shift_id AND s.driver_id = v_actor
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_actor AND p.role = 'driver'::public.user_role
        AND p.company_id = s.company_id
    )
  FOR UPDATE OF s;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_SHIFT' USING ERRCODE = '42501';
  END IF;
  IF v_shift.clock_out_at IS NOT NULL THEN
    RETURN v_shift;
  END IF;
  IF v_shift.clock_in_at > v_now
    OR v_shift.status NOT IN (
      'started'::public.shift_status, 'moving'::public.shift_status,
      'idle'::public.shift_status, 'flagged'::public.shift_status
    ) THEN
    RAISE EXCEPTION 'INVALID_CLOCK_IN' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.driver_bases b
    WHERE b.driver_id = v_actor
      AND lower(trim(b.name)) IN ('home','office')
      AND b.latitude BETWEEN -90 AND 90
      AND b.longitude BETWEEN -180 AND 180
  ) THEN
    RAISE EXCEPTION 'NO_BASE' USING ERRCODE = '22023';
  END IF;

  -- No client-supplied timestamp, assumed travel interval or automatic
  -- approved hours. Reported final coordinates are NOT GPS route evidence.
  UPDATE public.shifts SET
    last_dropoff_at = v_now,
    last_dropoff_lat = p_dropoff_lat,
    last_dropoff_lng = p_dropoff_lng,
    clock_out_at = v_now,
    auto_end_at = NULL,
    estimated_return_minutes = NULL,
    verified_hours_minutes = NULL,
    status = 'flagged'::public.shift_status,
    flagged_at = COALESCE(flagged_at, v_now),
    suspicious_reason = COALESCE(suspicious_reason,'driver_end_pending_payroll_review'),
    suspicious_details = COALESCE(suspicious_details,'{}'::jsonb)
      || jsonb_build_object(
        'legacy_final_dropoff', 'driver_reported_pending_review',
        'server_closed_at', v_now,
        'return_minutes_awarded', 0,
        'route_point_inferred_from_dropoff', false
      ),
    updated_at = v_now
  WHERE id = v_shift.id AND clock_out_at IS NULL
  RETURNING * INTO v_closed;

  IF v_closed.id IS NULL THEN
    RAISE EXCEPTION 'SHIFT_CLOSE_CONFLICT' USING ERRCODE = '40001';
  END IF;
  RETURN v_closed;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_driver_shift(uuid,double precision,double precision)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_driver_shift(uuid,double precision,double precision)
  TO authenticated;

COMMENT ON FUNCTION public.complete_driver_shift(uuid,double precision,double precision) IS
  'Legacy iOS End Shift compatibility until cutover 020. Closes at trusted server time, never credits travel minutes or automatically approves payroll. Requires explicit admin ledger decision.';
