-- =============================================================================
-- Prevent two active shifts for the same driver. Partial unique index lets the
-- database enforce the rule even when two devices race past the app's
-- "any open shift?" check at the same time.
-- App code maps duplicate-key (SQLSTATE 23505) to ALREADY_ACTIVE in startShift.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_shift_per_driver
  ON shifts(driver_id)
  WHERE clock_out_at IS NULL;
