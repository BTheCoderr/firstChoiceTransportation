-- Administrator shift recovery, explicitly separated from payroll approval.
-- Additive: no historical rows are changed or closed by this migration.
-- Only an authenticated admin in the shift's company may perform actions.
-- Immutable audit records can be read by same-company admins only.

CREATE TABLE IF NOT EXISTS public.shift_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL CHECK (action IN ('close_pending_review', 'approve_paid_hours')),
  reason text NOT NULL,
  note text NOT NULL,
  effective_end_at timestamptz,
  approved_minutes integer,
  previous_end_at timestamptz,
  previous_verified_minutes integer,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_shift_review_events_shift_time
  ON public.shift_review_events (shift_id, created_at DESC);
ALTER TABLE public.shift_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.shift_review_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.shift_review_events TO authenticated;
DROP POLICY IF EXISTS "Company admins can read shift review events"
  ON public.shift_review_events;
CREATE POLICY "Company admins can read shift review events"
  ON public.shift_review_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.get_my_profile_meta() m
      WHERE m.role = 'admin'::public.user_role
        AND m.company_id = shift_review_events.company_id
    )
  );

CREATE OR REPLACE FUNCTION public.admin_close_open_shift_for_review(
  p_shift_id uuid, p_effective_end_at timestamptz,
  p_reason text, p_note text
)
RETURNS public.shifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_company uuid;
  v_shift public.shifts%ROWTYPE;
  v_closed public.shifts%ROWTYPE;
  v_reason text := trim(coalesce(p_reason, ''));
  v_note text := trim(coalesce(p_note, ''));
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  SELECT company_id INTO v_company FROM public.profiles
    WHERE id = v_actor AND role = 'admin'::public.user_role;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_shift_id IS NULL OR p_effective_end_at IS NULL
    OR v_reason NOT IN ('gps_unavailable', 'device_failure',
      'missed_return_detection', 'admin_review', 'other')
    OR length(v_note) < 10 OR length(v_note) > 1200 THEN
    RAISE EXCEPTION 'INVALID_REVIEW_INPUT' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_shift FROM public.shifts
    WHERE id = p_shift_id AND company_id = v_company
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIFT_NOT_FOUND' USING ERRCODE = '42501';
  END IF;
  IF v_shift.clock_out_at IS NOT NULL THEN
    RAISE EXCEPTION 'SHIFT_ALREADY_CLOSED' USING ERRCODE = '22023';
  END IF;
  IF p_effective_end_at < v_shift.clock_in_at
    OR p_effective_end_at > v_now
    OR p_effective_end_at > v_shift.clock_in_at + interval '24 hours' THEN
    RAISE EXCEPTION 'INVALID_END_TIME' USING ERRCODE = '22023';
  END IF;

  -- Close the open shift to unblock future shifts. Do NOT approve or
  -- invent paid hours; verified_hours_minutes stays NULL until a second
  -- explicit administrator decision.
  UPDATE public.shifts SET
    clock_out_at = p_effective_end_at,
    auto_end_at = NULL,
    verified_hours_minutes = NULL,
    status = 'flagged'::public.shift_status,
    suspicious_reason = coalesce(suspicious_reason, 'admin_closed_pending_review'),
    flagged_at = coalesce(flagged_at, v_now),
    suspicious_details = coalesce(suspicious_details,'{}'::jsonb)
      || jsonb_build_object(
         'shift_recovery','closed_pending_payroll_review',
         'recovery_reason',v_reason,
         'recovery_at',v_now
      ),
    updated_at = v_now
  WHERE id = p_shift_id
  RETURNING * INTO v_closed;

  INSERT INTO public.shift_review_events (
    shift_id, company_id, actor_id, action, reason, note,
    effective_end_at, previous_end_at, previous_verified_minutes
  ) VALUES (
    p_shift_id,v_company,v_actor,'close_pending_review',v_reason,v_note,
    p_effective_end_at,v_shift.clock_out_at,v_shift.verified_hours_minutes
  );
  RETURN v_closed;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_close_open_shift_for_review(uuid,timestamptz,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_close_open_shift_for_review(uuid,timestamptz,text,text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_recovered_shift_hours(
  p_shift_id uuid, p_note text
)
RETURNS public.shifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_company uuid;
  v_shift public.shifts%ROWTYPE;
  v_approved public.shifts%ROWTYPE;
  v_note text := trim(coalesce(p_note, ''));
  v_minutes integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  SELECT company_id INTO v_company FROM public.profiles
    WHERE id = v_actor AND role = 'admin'::public.user_role;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_shift_id IS NULL OR length(v_note) < 10 OR length(v_note) > 1200 THEN
    RAISE EXCEPTION 'INVALID_REVIEW_INPUT' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_shift FROM public.shifts
    WHERE id = p_shift_id AND company_id = v_company
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIFT_NOT_FOUND' USING ERRCODE = '42501';
  END IF;
  IF v_shift.clock_out_at IS NULL OR v_shift.verified_hours_minutes IS NOT NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.shift_review_events e
      WHERE e.shift_id = p_shift_id AND e.company_id = v_company
        AND e.action = 'close_pending_review'
    )
  THEN
    RAISE EXCEPTION 'NOT_PENDING_REVIEW' USING ERRCODE = '22023';
  END IF;

  v_minutes := floor(extract(epoch from
    (v_shift.clock_out_at - v_shift.clock_in_at)) / 60)::integer;
  IF v_minutes < 0 OR v_minutes > 1440 THEN
    RAISE EXCEPTION 'INVALID_PAID_DURATION' USING ERRCODE = '22023';
  END IF;

  UPDATE public.shifts SET
    verified_hours_minutes = v_minutes,
    -- Preserve the flag and the original exception so admins can audit it.
    suspicious_details = coalesce(suspicious_details,'{}'::jsonb)
      || jsonb_build_object(
        'shift_recovery','payroll_approved_after_review',
        'reviewed_at',clock_timestamp()
      ),
    updated_at = clock_timestamp()
  WHERE id = p_shift_id
  RETURNING * INTO v_approved;

  INSERT INTO public.shift_review_events (
    shift_id,company_id,actor_id,action,reason,note,effective_end_at,
    approved_minutes,previous_end_at,previous_verified_minutes
  ) VALUES (
    p_shift_id,v_company,v_actor,'approve_paid_hours','admin_review',
    v_note,v_shift.clock_out_at,v_minutes,v_shift.clock_out_at,
    v_shift.verified_hours_minutes
  );
  RETURN v_approved;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_approve_recovered_shift_hours(uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_recovered_shift_hours(uuid,text)
  TO authenticated;
