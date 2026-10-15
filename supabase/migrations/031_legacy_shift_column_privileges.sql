-- 031. Complete immediate pre-020 column-level payroll protection.
-- Keep authenticated INSERT until coordinated migration 020 so prior
-- mobile clients can still create OPEN shifts through guarded 030.
-- Existing background location writes only the five columns below.
REVOKE UPDATE ON TABLE public.shifts FROM PUBLIC, anon, authenticated;

GRANT UPDATE (
  status, first_movement_at, suspicious_reason, suspicious_details, flagged_at
) ON TABLE public.shifts TO authenticated;

-- Assert payroll columns cannot be updated directly by a driver even if
-- RLS SELECT policy matches their own row. This migration edits no rows.
DO $validate$
BEGIN
  IF has_column_privilege('authenticated','public.shifts','verified_hours_minutes','UPDATE')
    OR has_column_privilege('authenticated','public.shifts','clock_in_at','UPDATE')
    OR has_column_privilege('authenticated','public.shifts','clock_out_at','UPDATE')
    OR has_column_privilege('authenticated','public.shifts','company_id','UPDATE')
    OR has_column_privilege('authenticated','public.shifts','driver_id','UPDATE')
    OR has_table_privilege('authenticated','public.shifts','DELETE')
    OR has_table_privilege('anon','public.shifts','INSERT')
    OR NOT has_column_privilege('authenticated','public.shifts','status','UPDATE')
    OR NOT has_column_privilege('authenticated','public.shifts','first_movement_at','UPDATE')
    OR NOT has_table_privilege('authenticated','public.shifts','INSERT')
    OR NOT has_table_privilege('service_role','public.shifts','UPDATE')
  THEN
    RAISE EXCEPTION 'SHIFT_GRANTS_UNSAFE: transaction rolled back';
  END IF;
END
$validate$;
