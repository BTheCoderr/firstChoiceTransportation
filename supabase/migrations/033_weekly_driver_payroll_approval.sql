-- 033: One audited administrator payroll approval per completed employee week.
-- Standard driver End Shift never approves/payrolls itself; this function
-- inspects the full Monday–Sunday pay period in America/New_York.
-- Every accepted shift gets a separate immutable 027 audit event, but the
-- administrator has only one weekly confirmation.
--
-- Atypical/manual-recovered, preapproved-legacy, open and suspicious shifts
-- require separate evidence review; never blindly bulk-approve them.
CREATE OR REPLACE FUNCTION public.admin_review_driver_week(
  p_driver_id uuid, p_week_start date,
  p_note text DEFAULT NULL, p_approve boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_company uuid;
  v_from timestamptz;
  v_until timestamptz;
  v_now timestamptz := clock_timestamp();
  v_count int := 0;
  v_ready int := 0;
  v_ready_minutes int := 0;
  v_open int := 0;
  v_exceptions int := 0;
  v_excluded int := 0;
  v_approved int := 0;
  v_approved_minutes int := 0;
  v_newly_approved int := 0;
  v_note text := btrim(coalesce(p_note,''));
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_state text;
  v_reason text;
  v_minutes int;
  v_shift_ids uuid[] := ARRAY[]::uuid[];
  v_shift_id uuid;
  v_row record;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501';
  END IF;
  SELECT company_id INTO v_company FROM public.profiles
    WHERE id=v_actor AND role='admin'::public.user_role;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF p_driver_id IS NULL OR p_week_start IS NULL
    OR extract(isodow from p_week_start) <> 1
    OR p_week_start < date '2020-01-01'
    OR p_week_start > (v_now AT TIME ZONE 'America/New_York')::date
  THEN
    RAISE EXCEPTION 'INVALID_WEEK' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id=p_driver_id
    AND company_id=v_company AND role='driver'::public.user_role
  ) THEN
    RAISE EXCEPTION 'DRIVER_NOT_FOUND' USING ERRCODE='42501';
  END IF;
  v_from := p_week_start::timestamp AT TIME ZONE 'America/New_York';
  v_until := (p_week_start + 7)::timestamp AT TIME ZONE 'America/New_York';
  IF p_approve THEN
    IF v_now < v_until THEN
      RAISE EXCEPTION 'WEEK_STILL_IN_PROGRESS' USING ERRCODE='22023';
    END IF;
    IF length(v_note) < 20 OR length(v_note) > 1200 THEN
      RAISE EXCEPTION 'APPROVAL_NOTE_REQUIRED' USING ERRCODE='22023';
    END IF;
    -- Lock the exact week before computing approvals. Individual payroll
    -- decision RPCs also lock shifts, preventing a concurrent override.
    PERFORM 1 FROM public.shifts s
      WHERE s.driver_id=p_driver_id AND s.company_id=v_company
        AND s.clock_in_at >= v_from AND s.clock_in_at < v_until
      ORDER BY s.id FOR UPDATE;
  END IF;

  FOR v_row IN
    SELECT s.id, s.clock_in_at, s.clock_out_at, s.status, s.flagged_at,
      s.suspicious_reason, s.suspicious_details, s.verified_hours_minutes,
      r.decision, r.payable_minutes,
      EXISTS (
        SELECT 1 FROM public.shift_review_events e
        WHERE e.shift_id=s.id AND e.action='close_pending_review'
      ) AS manual_recovery
    FROM public.shifts s
    LEFT JOIN public.shift_payroll_reviews r ON r.shift_id=s.id
    WHERE s.driver_id=p_driver_id AND s.company_id=v_company
      AND s.clock_in_at >= v_from AND s.clock_in_at < v_until
    ORDER BY s.clock_in_at,s.id
  LOOP
    v_count := v_count+1;
    IF v_count > 100 THEN
      RAISE EXCEPTION 'WEEK_TOO_MANY_SHIFTS' USING ERRCODE='22023';
    END IF;
    v_state := 'eligible';
    v_reason := '';
    v_minutes := NULL;
    IF v_row.decision IN ('rejected','test_excluded') THEN
      v_state := 'excluded'; v_reason := v_row.decision;
      v_excluded := v_excluded+1;
    ELSIF v_row.decision='approved' THEN
      v_state := 'approved';
      v_minutes := v_row.payable_minutes;
      v_approved := v_approved+1;
      v_approved_minutes := v_approved_minutes+coalesce(v_minutes,0);
    ELSIF v_row.clock_out_at IS NULL THEN
      v_state := 'open'; v_reason := 'shift_still_open';
      v_open := v_open+1;
    ELSIF v_row.decision='needs_review' OR v_row.manual_recovery THEN
      v_state := 'exception'; v_reason := 'manual_review_required';
      v_exceptions := v_exceptions+1;
    ELSIF v_row.clock_out_at <= v_row.clock_in_at
      OR v_row.clock_out_at > v_row.clock_in_at+interval '24 hours' THEN
      v_state := 'exception'; v_reason := 'invalid_or_extended_duration';
      v_exceptions := v_exceptions+1;
    ELSIF v_row.verified_hours_minutes IS NOT NULL THEN
      v_state := 'exception'; v_reason := 'legacy_recorded_pay_requires_review';
      v_exceptions := v_exceptions+1;
    ELSIF (v_row.suspicious_reason IS NOT NULL AND
          v_row.suspicious_reason <> 'driver_end_pending_payroll_review')
       OR (v_row.flagged_at IS NOT NULL AND
           v_row.suspicious_reason IS DISTINCT FROM 'driver_end_pending_payroll_review')
       OR (v_row.status='flagged'::public.shift_status AND
           v_row.suspicious_reason IS DISTINCT FROM 'driver_end_pending_payroll_review')
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(coalesce(v_row.suspicious_details,'{}'::jsonb)) AS k(key)
         WHERE k.key NOT IN ('legacy_final_dropoff','server_closed_at',
           'return_minutes_awarded','route_point_inferred_from_dropoff')
       ) THEN
      v_state := 'exception'; v_reason := 'flagged_or_unverified_evidence';
      v_exceptions := v_exceptions+1;
    ELSE
      v_minutes := floor(extract(epoch from
        (v_row.clock_out_at-v_row.clock_in_at))/60)::integer;
      IF v_minutes < 1 OR v_minutes > 1440 THEN
        v_state := 'exception'; v_reason := 'invalid_payable_minutes';
        v_minutes := NULL;
        v_exceptions := v_exceptions+1;
      ELSE
        v_ready := v_ready+1;
        v_ready_minutes := v_ready_minutes+v_minutes;
        v_shift_ids := array_append(v_shift_ids,v_row.id);
      END IF;
    END IF;

    v_item := jsonb_build_object(
      'shiftId',v_row.id,'clockInAt',v_row.clock_in_at,
      'clockOutAt',v_row.clock_out_at,'status',v_state,
      'reason',v_reason,'minutes',v_minutes
    );
    v_items := v_items || jsonb_build_array(v_item);
  END LOOP;

  IF p_approve THEN
    IF v_open > 0 OR v_exceptions > 0 THEN
      RAISE EXCEPTION 'WEEK_HAS_UNRESOLVED_SHIFTS' USING ERRCODE='22023';
    END IF;
    IF v_ready = 0 THEN
      RAISE EXCEPTION 'NO_ELIGIBLE_SHIFTS' USING ERRCODE='22023';
    END IF;
    FOREACH v_shift_id IN ARRAY v_shift_ids LOOP
      -- Every selected shift was validated and locked in this transaction;
      -- do not reapprove, overwrite exclusions, or create duplicate pay.
      SELECT floor(extract(epoch from (s.clock_out_at-s.clock_in_at))/60)::integer
        INTO v_minutes FROM public.shifts s WHERE s.id=v_shift_id;
      INSERT INTO public.shift_payroll_reviews
        (shift_id, company_id, decision, payable_minutes, note,
         reviewed_by, reviewed_at)
      VALUES(v_shift_id,v_company,'approved',v_minutes,v_note,v_actor,v_now);
      INSERT INTO public.shift_payroll_review_events
        (shift_id, company_id, actor_id, previous_decision,new_decision,
         previous_payable_minutes,new_payable_minutes,note)
      VALUES(v_shift_id,v_company,v_actor,NULL,'approved',NULL,v_minutes,
        'Weekly approval '||p_week_start::text||': '||v_note);
      v_newly_approved := v_newly_approved+1;
    END LOOP;
  END IF;
  RETURN jsonb_build_object(
    'weekStart',p_week_start,'weekEndExclusive',(p_week_start+7),
    'driverId',p_driver_id,'isComplete',v_now>=v_until,
    'shiftCount',v_count,'eligibleCount',v_ready,
    'eligibleMinutes',v_ready_minutes,'openCount',v_open,
    'exceptionCount',v_exceptions,'excludedCount',v_excluded,
    'approvedCount',v_approved,'approvedMinutes',v_approved_minutes,
    'canApprove',(v_now>=v_until AND v_ready>0 AND
      v_open=0 AND v_exceptions=0),'newlyApproved',v_newly_approved,
    'items',v_items
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_driver_week(uuid,date,text,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_driver_week(uuid,date,text,boolean)
  TO authenticated;
COMMENT ON FUNCTION public.admin_review_driver_week(uuid,date,text,boolean) IS
  'Admin only: preview and atomically approve a completed Monday–Sunday driver payroll week; never auto-approve on shift close. All shifts receive immutable decision events. Blocks abnormal, recovered, legacy-paid, open or cross-company records.';
