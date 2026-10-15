-- 035: Server-owned movement/status refresh based on persisted GPS evidence.
-- Does not change existing records when installed. Compatible with 030-032,
-- and intended to replace direct driver UPDATE on shifts in the next iOS build.
-- Legacy clients retain limited status writes until migration 020 rollout.

CREATE OR REPLACE FUNCTION public.refresh_driver_shift_activity(p_shift_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_shift public.shifts%ROWTYPE;
  v_latest public.route_points%ROWTYPE;
  v_previous public.route_points%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_elapsed numeric;
  v_stationary_start timestamptz;
  v_moving boolean := false;
  v_flag text := NULL;
  v_status public.shift_status;
  v_first timestamptz;
BEGIN
  IF v_actor IS NULL OR p_shift_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  SELECT s.* INTO v_shift FROM public.shifts s
   WHERE s.id = p_shift_id AND s.driver_id = v_actor
     AND EXISTS (
       SELECT 1 FROM public.profiles p WHERE p.id = v_actor
         AND p.role = 'driver'::public.user_role
         AND p.company_id = s.company_id
     )
   FOR UPDATE OF s;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIFT_NOT_FOUND' USING ERRCODE='42501';
  END IF;
  IF v_shift.clock_out_at IS NOT NULL THEN RETURN v_shift.status::text; END IF;

  SELECT * INTO v_latest FROM public.route_points r
   WHERE r.shift_id = p_shift_id AND r.received_at IS NOT NULL
   ORDER BY r.received_at DESC, r.id DESC LIMIT 1;
  IF NOT FOUND OR v_latest.received_at < v_now - interval '10 minutes'
    OR v_latest.received_at > v_now + interval '1 minute' THEN
    RETURN v_shift.status::text;
  END IF;

  SELECT * INTO v_previous FROM public.route_points r
   WHERE r.shift_id = p_shift_id AND r.id <> v_latest.id
     AND r.received_at IS NOT NULL
   ORDER BY r.received_at DESC, r.id DESC LIMIT 1;

  -- Only persisted samples are considered. Client does not submit a status,
  -- flag or timestamp to this function. Low-accuracy GPS cannot prove motion.
  v_moving := (coalesce(v_latest.accuracy, 9999) <= 150)
    AND (
      (v_latest.speed IS NOT NULL AND v_latest.speed >= 0.9)
      OR (v_previous.id IS NOT NULL
        AND coalesce(v_previous.accuracy, 9999) <= 150
        AND public._gps_distance_m(
          v_previous.latitude, v_previous.longitude,
          v_latest.latitude, v_latest.longitude
        ) >= 50)
    );
  v_elapsed := extract(epoch FROM (v_now - v_shift.clock_in_at))/60;
  v_first := v_shift.first_movement_at;

  IF v_moving THEN
    IF v_first IS NULL THEN
      v_first := greatest(v_shift.clock_in_at, v_latest.received_at);
      IF v_elapsed >= 30 THEN v_flag := 'late_first_movement'; END IF;
    END IF;
    v_status := 'moving'::public.shift_status;
  ELSE
    IF v_first IS NULL THEN
      IF v_elapsed >= 30 THEN
        v_flag := 'no_movement_within_threshold';
      END IF;
      IF v_elapsed >= 15 THEN
        v_status := 'idle'::public.shift_status;
      ELSE
        v_status := 'started'::public.shift_status;
      END IF;
    ELSE
      -- Require a sustained sequence of nearby, low-speed samples before
      -- calling a moving driver idle. Avoid one inaccurate point toggling it.
      SELECT min(r.received_at) INTO v_stationary_start
      FROM public.route_points r
      WHERE r.shift_id=p_shift_id
        AND r.received_at BETWEEN v_latest.received_at - interval '45 minutes'
                              AND v_latest.received_at
        AND coalesce(r.accuracy,9999) <= 150
        AND coalesce(r.speed,0) < 0.9
        AND public._gps_distance_m(
          v_latest.latitude, v_latest.longitude,
          r.latitude, r.longitude) < 50;
      IF v_stationary_start IS NOT NULL AND
        v_latest.received_at-v_stationary_start >= interval '15 minutes' THEN
        v_status := 'idle'::public.shift_status;
        IF v_latest.received_at-v_stationary_start >= interval '45 minutes' THEN
          v_flag := 'long_idle_period';
        END IF;
      ELSE
        v_status := 'moving'::public.shift_status;
      END IF;
    END IF;
  END IF;

  IF v_shift.flagged_at IS NOT NULL OR v_flag IS NOT NULL THEN
    v_status := 'flagged'::public.shift_status;
  END IF;

  UPDATE public.shifts s SET
    first_movement_at = coalesce(s.first_movement_at,v_first),
    status = v_status,
    flagged_at = CASE WHEN v_flag IS NOT NULL
      THEN coalesce(s.flagged_at,v_now) ELSE s.flagged_at END,
    suspicious_reason = CASE WHEN v_flag IS NOT NULL
      THEN coalesce(s.suspicious_reason,v_flag) ELSE s.suspicious_reason END,
    suspicious_details = CASE WHEN v_flag IS NOT NULL AND s.suspicious_reason IS NULL
      THEN coalesce(s.suspicious_details,'{}'::jsonb) ||
        jsonb_build_object('movement_checked_at',v_now,
          'source','verified_server_route_points')
      ELSE s.suspicious_details END
  WHERE s.id = p_shift_id AND s.clock_out_at IS NULL;
  RETURN v_status::text;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_driver_shift_activity(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_driver_shift_activity(uuid)
  TO authenticated;
COMMENT ON FUNCTION public.refresh_driver_shift_activity(uuid) IS
 'Server evaluates persisted recent GPS route evidence and updates only the authenticated driver own open shift movement/flags; no client status or payroll input.';
