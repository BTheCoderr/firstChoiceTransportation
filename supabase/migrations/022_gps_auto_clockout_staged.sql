-- Automated end-of-shift detection from GPS return to an approved Home/Office.
-- This migration is SAFE TO STAGE: automation is disabled by default. Activate only
-- after a real-device geofence test and rollout of the new mobile build + migration 020.
-- An automatic clock-out is recorded at the FIRST verified arrival sample rather
-- than the later dwell-confirmation sample (no artificial paid dwell time).
ALTER TABLE public.route_points
  ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_route_points_shift_received
  ON public.route_points (shift_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.geofence_clockout_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  radius_m integer NOT NULL DEFAULT 150 CHECK (radius_m BETWEEN 75 AND 300),
  dwell_seconds integer NOT NULL DEFAULT 180 CHECK (dwell_seconds BETWEEN 120 AND 900),
  departure_m integer NOT NULL DEFAULT 450 CHECK (departure_m BETWEEN 250 AND 2000),
  min_shift_minutes integer NOT NULL DEFAULT 20 CHECK (min_shift_minutes BETWEEN 10 AND 120),
  max_accuracy_m integer NOT NULL DEFAULT 75 CHECK (max_accuracy_m BETWEEN 25 AND 150),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.geofence_clockout_settings(id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.geofence_clockout_settings ENABLE ROW LEVEL SECURITY;
-- Only database operators/service_role can enable automatic payroll actions.
REVOKE ALL ON TABLE public.geofence_clockout_settings FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._gps_distance_m(
  lat_a double precision, lon_a double precision,
  lat_b double precision, lon_b double precision
)
RETURNS double precision
LANGUAGE sql IMMUTABLE STRICT
SET search_path = ''
AS $$
  SELECT 6371000.0 * 2.0 * asin(sqrt(least(1.0, greatest(0.0,
    power(sin(radians(lat_b - lat_a) / 2), 2)
    + cos(radians(lat_a)) * cos(radians(lat_b))
      * power(sin(radians(lon_b - lon_a) / 2), 2)))));
$$;
REVOKE ALL ON FUNCTION public._gps_distance_m(double precision,double precision,double precision,double precision)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.auto_clock_out_on_base_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cfg public.geofence_clockout_settings%ROWTYPE;
  v_shift public.shifts%ROWTYPE;
  v_base public.driver_bases%ROWTYPE;
  v_distance double precision;
  v_last_far timestamptz;
  v_first_arrival timestamptz;
  v_last_arrival timestamptz;
  v_valid_samples integer;
  v_minutes integer;
  v_away boolean;
  v_flagged boolean;
BEGIN
  SELECT * INTO v_cfg FROM public.geofence_clockout_settings WHERE id = true;
  IF NOT FOUND OR NOT v_cfg.enabled THEN RETURN NEW; END IF;

  -- Ignore stale uploads, poor accuracy, rapid motion and implausible GPS.
  -- Device-provided accuracy/timestamps are signals, not proof against spoofing.
  IF NEW.accuracy IS NULL OR NEW.accuracy < 0 OR NEW.accuracy > v_cfg.max_accuracy_m
     OR (NEW.speed IS NOT NULL AND NEW.speed > 2.0)
     OR NEW.recorded_at < NEW.received_at - interval '2 minutes'
     OR NEW.recorded_at > NEW.received_at + interval '1 minute'
     OR NOT (NEW.latitude BETWEEN -90 AND 90)
     OR NOT (NEW.longitude BETWEEN -180 AND 180)
  THEN RETURN NEW; END IF;

  SELECT * INTO v_shift FROM public.shifts
    WHERE id = NEW.shift_id AND clock_out_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NEW.received_at < v_shift.clock_in_at
    + make_interval(mins => v_cfg.min_shift_minutes)
  THEN RETURN NEW; END IF;

  -- Both approved Home and Office can end a shift; never trust a client-
  -- submitted destination or edit coordinates from the mobile app.
  SELECT b.* INTO v_base
  FROM public.driver_bases b
  WHERE b.driver_id = v_shift.driver_id
    AND lower(trim(b.name)) IN ('home', 'office')
    AND b.latitude BETWEEN -90 AND 90
    AND b.longitude BETWEEN -180 AND 180
    AND public._gps_distance_m(
      NEW.latitude,NEW.longitude,b.latitude,b.longitude
    ) <= v_cfg.radius_m
  ORDER BY public._gps_distance_m(
    NEW.latitude,NEW.longitude,b.latitude,b.longitude
  ) ASC, b.id LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_distance := public._gps_distance_m(
    NEW.latitude,NEW.longitude,v_base.latitude,v_base.longitude
  );

  -- A driver starting at home cannot clock out by staying there. Require
  -- credible samples documenting a genuine trip away from the ARRIVAL base.
  SELECT EXISTS(
    SELECT 1 FROM public.route_points rp
    WHERE rp.shift_id = NEW.shift_id
      AND rp.received_at > v_shift.clock_in_at
      AND rp.received_at < NEW.received_at - interval '3 minutes'
      AND rp.accuracy BETWEEN 0 AND v_cfg.max_accuracy_m
      AND rp.recorded_at >= rp.received_at - interval '2 minutes'
      AND public._gps_distance_m(
        rp.latitude,rp.longitude,v_base.latitude,v_base.longitude
      ) >= v_cfg.departure_m
  ) INTO v_away;
  IF NOT v_away THEN RETURN NEW; END IF;

  -- Reset the dwell window when any recent point is outside or unreliable.
  SELECT max(rp.received_at) INTO v_last_far
  FROM public.route_points rp
  WHERE rp.shift_id = NEW.shift_id
    AND rp.received_at > NEW.received_at - interval '15 minutes'
    AND (
      rp.accuracy IS NULL OR rp.accuracy > v_cfg.max_accuracy_m
      OR public._gps_distance_m(
        rp.latitude,rp.longitude,v_base.latitude,v_base.longitude
      ) > v_cfg.radius_m
    );

  SELECT count(*), min(rp.received_at), max(rp.received_at)
    INTO v_valid_samples, v_first_arrival, v_last_arrival
  FROM public.route_points rp
  WHERE rp.shift_id = NEW.shift_id
    AND rp.received_at > greatest(
      coalesce(v_last_far, NEW.received_at - interval '15 minutes'),
      NEW.received_at - interval '15 minutes'
    )
    AND rp.received_at <= NEW.received_at
    AND rp.accuracy BETWEEN 0 AND v_cfg.max_accuracy_m
    AND (rp.speed IS NULL OR rp.speed <= 2.0)
    AND rp.recorded_at >= rp.received_at - interval '2 minutes'
    AND rp.recorded_at <= rp.received_at + interval '1 minute'
    AND public._gps_distance_m(
      rp.latitude,rp.longitude,v_base.latitude,v_base.longitude
    ) <= v_cfg.radius_m;

  IF v_valid_samples < 2
    OR v_last_arrival - v_first_arrival < make_interval(secs => v_cfg.dwell_seconds)
    OR v_first_arrival < v_shift.clock_in_at THEN
    RETURN NEW;
  END IF;

  -- The server's FIRST received arrival time is the paid stop, not a phone
  -- timestamp or straight-line estimate. The dwell time merely confirms it.
  v_minutes := greatest(0, floor(
    extract(epoch from (v_first_arrival-v_shift.clock_in_at))/60
  ))::integer;
  v_flagged := v_shift.flagged_at IS NOT NULL OR v_shift.status = 'flagged'
    OR v_minutes > 600;

  UPDATE public.shifts SET
    clock_out_at = v_first_arrival,
    auto_end_at = v_first_arrival,
    verified_hours_minutes = v_minutes,
    estimated_return_minutes = NULL,
    return_base_lat = v_base.latitude,
    return_base_lng = v_base.longitude,
    return_base_type = lower(trim(v_base.name)),
    return_base_address = v_base.address,
    status = CASE WHEN v_flagged THEN 'flagged'::public.shift_status
      ELSE 'completed'::public.shift_status END,
    suspicious_reason = CASE
      WHEN v_shift.suspicious_reason IS NOT NULL THEN v_shift.suspicious_reason
      WHEN v_minutes > 600 THEN 'extended_shift'
      ELSE NULL END,
    flagged_at = CASE WHEN v_flagged THEN coalesce(v_shift.flagged_at,clock_timestamp())
      ELSE NULL END,
    suspicious_details = coalesce(v_shift.suspicious_details,'{}'::jsonb)
      || jsonb_build_object(
        'clock_out_method','gps_confirmed_base_arrival',
        'clock_out_base_name',v_base.name,
        'clock_out_base_id',v_base.id,
        'first_arrival_received_at',v_first_arrival,
        'dwell_confirmed_at',v_last_arrival,
        'confirmation_samples',v_valid_samples,
        'arrival_radius_m',v_cfg.radius_m,
        'last_sample_accuracy_m',NEW.accuracy,
        'last_sample_distance_to_base_m',round(v_distance::numeric,1)
      )
  WHERE id = NEW.shift_id AND clock_out_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_clock_out_on_base_return ON public.route_points;
CREATE TRIGGER trg_auto_clock_out_on_base_return
AFTER INSERT ON public.route_points
FOR EACH ROW EXECUTE FUNCTION public.auto_clock_out_on_base_return();
REVOKE ALL ON FUNCTION public.auto_clock_out_on_base_return()
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.geofence_clockout_settings IS
  'Activate only after real iOS/Android confirmation and migration 020. Leave disabled while legacy apps are in use.';
