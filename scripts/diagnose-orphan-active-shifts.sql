-- =============================================================================
-- Read-only diagnostic. Run BEFORE applying migration 014 to confirm which open
-- shifts will be auto-closed. Drivers with rn > 1 are the orphans that 014 will
-- close (keeps the most recent `clock_in_at` open and closes older ones).
-- =============================================================================
SELECT
  s.id,
  s.driver_id,
  p.name AS driver_name,
  s.clock_in_at,
  s.clock_out_at,
  s.status,
  ROW_NUMBER() OVER (
    PARTITION BY s.driver_id
    ORDER BY s.clock_in_at DESC NULLS LAST, s.id DESC
  ) AS rn,
  COUNT(*) OVER (PARTITION BY s.driver_id) AS open_shift_count_for_driver
FROM shifts s
LEFT JOIN profiles p ON p.id = s.driver_id
WHERE s.clock_out_at IS NULL
ORDER BY s.driver_id, rn;
