-- =============================================================================
-- Flag abandoned open shifts for admin review without changing paid time.
--
-- Safety choice:
--   * This migration NEVER writes clock_out_at, auto_end_at, or
--     verified_hours_minutes.
--   * Shifts open longer than 16 hours are marked flagged so an admin can review
--     them instead of the system inventing a payroll clock-out.
--   * If pg_cron is already enabled on the Supabase project, the check is
--     scheduled every 15 minutes. If pg_cron is not enabled, the function is
--     still installed and can be scheduled later from the Supabase Dashboard.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.flag_abandoned_open_shifts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  UPDATE public.shifts
  SET
    status = 'flagged',
    suspicious_reason = COALESCE(suspicious_reason, 'abandoned_shift'),
    suspicious_details = COALESCE(suspicious_details, '{}'::jsonb)
      || jsonb_build_object(
        'abandoned_shift', true,
        'abandoned_shift_threshold_hours', 16,
        'abandoned_shift_detected_at', now()
      ),
    flagged_at = COALESCE(flagged_at, now())
  WHERE clock_out_at IS NULL
    AND clock_in_at < now() - interval '16 hours'
    AND COALESCE(suspicious_details ->> 'abandoned_shift', 'false') <> 'true';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.flag_abandoned_open_shifts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.flag_abandoned_open_shifts() FROM anon;
REVOKE ALL ON FUNCTION public.flag_abandoned_open_shifts() FROM authenticated;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid
      INTO existing_job_id
      FROM cron.job
      WHERE jobname = 'flag-abandoned-open-shifts'
      LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;

    PERFORM cron.schedule(
      'flag-abandoned-open-shifts',
      '*/15 * * * *',
      'SELECT public.flag_abandoned_open_shifts();'
    );
  END IF;
END
$$;
