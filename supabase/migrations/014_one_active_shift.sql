-- =============================================================================
-- Prevent two active shifts for the same driver. Partial unique index lets the
-- database enforce the rule even when two devices race past the app's
-- "any open shift?" check at the same time.
-- App code maps duplicate-key (SQLSTATE 23505) to ALREADY_ACTIVE in startShift.
--
-- The cleanup step below is *required* before the index can be created on a
-- production database that already has orphan rows where `clock_out_at IS NULL`
-- on more than one shift per driver (e.g. drivers who lost the app mid-shift
-- before Option B / before this index existed). We keep the most recently
-- started open shift per driver and close the rest with audit metadata so admins
-- can still see them. clock_out_at is set to the row's own clock_in_at, which
-- yields 0 verified minutes for the orphaned attempt and never inflates payroll.
-- =============================================================================

WITH ranked AS (
  SELECT
    id,
    driver_id,
    clock_in_at,
    ROW_NUMBER() OVER (
      PARTITION BY driver_id
      ORDER BY clock_in_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM shifts
  WHERE clock_out_at IS NULL
)
UPDATE shifts s
SET
  clock_out_at = COALESCE(s.clock_in_at, now()),
  auto_end_at  = COALESCE(s.clock_in_at, now()),
  status       = 'completed',
  verified_hours_minutes = 0,
  suspicious_reason = COALESCE(s.suspicious_reason, 'orphan_active_shift_autoclose'),
  suspicious_details = COALESCE(s.suspicious_details, '{}'::jsonb)
    || jsonb_build_object(
      'orphan_autoclose', true,
      'closed_by_migration', '014_one_active_shift',
      'closed_at', now()
    ),
  flagged_at = COALESCE(s.flagged_at, now())
FROM ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- Now safe to enforce: at most one row per driver with clock_out_at IS NULL.
DROP INDEX IF EXISTS idx_one_active_shift_per_driver;

CREATE UNIQUE INDEX idx_one_active_shift_per_driver
  ON shifts(driver_id)
  WHERE clock_out_at IS NULL;
