-- IMPORTANT: This is a coordinated MOBILE RELEASE cutover.
-- Do not apply while old Expo builds are in use: those call raw table INSERT/UPDATE.
-- Only apply after start_driver_shift/complete_driver_shift RPCs have been deployed
-- and new iOS/Android builds are validated and installed by all active drivers.
--
-- Existing RLS stays in place for reading and admin reports.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.shifts
  FROM PUBLIC, anon, authenticated;
-- Movement tracking still updates the status of an active shift and may flag
-- suspicious activity. Never grant fields that determine paid time.
-- Prevent older clients from invoking the manual final-dropoff RPC after
-- GPS auto-clock-out is activated. The function remains for historical audit
-- compatibility, but not executable by the app's authenticated role.
REVOKE EXECUTE ON FUNCTION public.complete_driver_shift(uuid,double precision,double precision)
  FROM PUBLIC, anon, authenticated;

GRANT UPDATE (status, first_movement_at, suspicious_reason, suspicious_details, flagged_at)
  ON TABLE public.shifts TO authenticated;

-- Driver-side status updates must not reopen completed shifts or clear flags.
CREATE OR REPLACE FUNCTION public.guard_driver_shift_status_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF OLD.clock_out_at IS NOT NULL
      OR NEW.clock_out_at IS DISTINCT FROM OLD.clock_out_at
      OR NEW.auto_end_at IS DISTINCT FROM OLD.auto_end_at
      OR NEW.clock_in_at IS DISTINCT FROM OLD.clock_in_at
      OR NEW.verified_hours_minutes IS DISTINCT FROM OLD.verified_hours_minutes
      OR NEW.driver_id IS DISTINCT FROM OLD.driver_id
      OR NEW.company_id IS DISTINCT FROM OLD.company_id
      OR NEW.start_lat IS DISTINCT FROM OLD.start_lat
      OR NEW.start_lng IS DISTINCT FROM OLD.start_lng
      OR NEW.status NOT IN ('started','moving','idle','flagged')
      OR (OLD.status = 'flagged' AND NEW.status <> 'flagged')
      OR (OLD.flagged_at IS NOT NULL AND NEW.flagged_at IS NULL)
      OR (OLD.suspicious_reason IS NOT NULL AND NEW.suspicious_reason IS DISTINCT FROM OLD.suspicious_reason)
    THEN
      RAISE EXCEPTION 'SHIFT_PROTECTED' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driver_shift_status_updates ON public.shifts;
CREATE TRIGGER guard_driver_shift_status_updates
BEFORE UPDATE ON public.shifts FOR EACH ROW
EXECUTE FUNCTION public.guard_driver_shift_status_updates();
REVOKE ALL ON FUNCTION public.guard_driver_shift_status_updates()
  FROM PUBLIC, anon, authenticated;
