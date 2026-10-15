-- 030. Immediate compatibility protection for production employee payroll rows.
-- Do not confuse with the later 020 coordinated RPC-only cutover.
-- Authenticated older mobile builds may start an OPEN shift and update
-- movement/flags, but may not forge completed shifts, paid minutes, clock
-- dates, ownership, or remove shifts. Keep GPS auto-clockout disabled.
-- This migration does not change any existing shift, profile or route point.
--
-- Important: SECURITY DEFINER admin/shift RPCs still run under the owner,
-- not the 'authenticated' role. Their validated/audited writes are untouched.

CREATE OR REPLACE FUNCTION public.guard_legacy_client_shift_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $guard$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_mutable text[] := ARRAY[
    'updated_at', 'status', 'first_movement_at',
    'suspicious_reason', 'suspicious_details', 'flagged_at'
  ];
BEGIN
  -- Trusted server-side RPCs/maintenance retain authority. PostgREST
  -- JWT role 'authenticated' is not allowed to touch payroll columns.
  IF current_user NOT IN ('authenticated','anon') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF current_user = 'anon' THEN
    RAISE EXCEPTION 'SHIFT_PROTECTED' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'SHIFT_PROTECTED' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NEW.driver_id IS DISTINCT FROM auth.uid()
      OR NEW.status IS DISTINCT FROM 'started'::public.shift_status
      OR NEW.clock_out_at IS NOT NULL
      OR NEW.auto_end_at IS NOT NULL
      OR NEW.verified_hours_minutes IS NOT NULL
      OR NEW.first_movement_at IS NOT NULL
      OR NEW.flagged_at IS NOT NULL
      OR NEW.suspicious_reason IS NOT NULL
      OR NEW.suspicious_details IS NOT NULL
      OR NEW.last_dropoff_at IS NOT NULL
      OR NEW.last_dropoff_lat IS NOT NULL
      OR NEW.last_dropoff_lng IS NOT NULL
      OR NEW.estimated_return_minutes IS NOT NULL
      OR NEW.return_base_lat IS NOT NULL
      OR NEW.return_base_lng IS NOT NULL
      OR NEW.return_base_type IS NOT NULL
      OR NEW.return_base_address IS NOT NULL
      OR NEW.commute_estimate_raw_minutes IS NOT NULL
      OR NEW.commute_estimate_minutes IS NOT NULL
      OR NEW.commute_base_latitude IS NOT NULL
      OR NEW.commute_base_longitude IS NOT NULL
      OR NEW.commute_base_name IS NOT NULL
    THEN
      RAISE EXCEPTION 'SHIFT_PROTECTED' USING ERRCODE = '42501';
    END IF;

    -- Never trust the handset clock for an employee's paid-start evidence.
    -- Existing onboarding/company/GPS-base prerequisite trigger still runs.
    NEW.clock_in_at := v_now;
    NEW.created_at := v_now;
    NEW.updated_at := v_now;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS NULL OR OLD.driver_id IS DISTINCT FROM auth.uid()
      OR OLD.clock_out_at IS NOT NULL
      OR (to_jsonb(NEW) - v_mutable) IS DISTINCT FROM
         (to_jsonb(OLD) - v_mutable)
      OR NEW.status NOT IN (
        'started'::public.shift_status,
        'moving'::public.shift_status,
        'idle'::public.shift_status,
        'flagged'::public.shift_status
      )
      OR (OLD.status = 'flagged'::public.shift_status
          AND NEW.status IS DISTINCT FROM OLD.status)
      OR (OLD.flagged_at IS NOT NULL AND
          NEW.flagged_at IS DISTINCT FROM OLD.flagged_at)
      OR (OLD.suspicious_reason IS NOT NULL AND
          NEW.suspicious_reason IS DISTINCT FROM OLD.suspicious_reason)
      OR (OLD.suspicious_details IS NOT NULL AND
          NEW.suspicious_details IS DISTINCT FROM OLD.suspicious_details)
      OR (OLD.first_movement_at IS NOT NULL AND
          NEW.first_movement_at IS DISTINCT FROM OLD.first_movement_at)
    THEN
      RAISE EXCEPTION 'SHIFT_PROTECTED' USING ERRCODE = '42501';
    END IF;

    IF NEW.first_movement_at IS NOT NULL AND (
      NEW.first_movement_at < OLD.clock_in_at - interval '15 minutes' OR
      NEW.first_movement_at > v_now + interval '5 minutes'
    ) THEN
      RAISE EXCEPTION 'SHIFT_PROTECTED' USING ERRCODE = '42501';
    END IF;

    IF NEW.flagged_at IS NOT NULL AND (
      NEW.flagged_at < OLD.clock_in_at - interval '15 minutes' OR
      NEW.flagged_at > v_now + interval '5 minutes'
    ) THEN
      RAISE EXCEPTION 'SHIFT_PROTECTED' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'SHIFT_PROTECTED' USING ERRCODE = '42501';
END;
$guard$;

DROP TRIGGER IF EXISTS guard_legacy_client_shift_mutations ON public.shifts;
CREATE TRIGGER guard_legacy_client_shift_mutations
BEFORE INSERT OR UPDATE OR DELETE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_client_shift_mutations();

REVOKE ALL ON FUNCTION public.guard_legacy_client_shift_mutations()
  FROM PUBLIC, anon, authenticated;

-- Do not grant anonymous writes; no client needs row deletion, table
-- truncation, trigger alterations or FK rights. Keep authenticated
-- INSERT/UPDATE only for pre-020 versions; this trigger restricts content.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.shifts FROM PUBLIC, anon;
REVOKE DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.shifts FROM authenticated;

COMMENT ON FUNCTION public.guard_legacy_client_shift_mutations() IS
  'Temporary pre-020 payroll integrity guard: legacy authenticated shift starts and movement are possible, but direct alteration of payroll fields and insertion of paid/closed shifts are denied. 020 remains a separate RPC-only cutover.';
