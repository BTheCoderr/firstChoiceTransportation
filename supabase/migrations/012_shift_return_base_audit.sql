-- Paid return-to-base audit (clock-out calculation). See completeShiftWithFinalDropoff.

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS estimated_return_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS return_base_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS return_base_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS return_base_type TEXT,
  ADD COLUMN IF NOT EXISTS return_base_address TEXT;

COMMENT ON COLUMN shifts.estimated_return_minutes IS
  'Minutes added to last_dropoff_at toward paid clock_out (straight-line ETA, capped in app).';
COMMENT ON COLUMN shifts.return_base_lat IS
  'Default base latitude used for return ETA.';
COMMENT ON COLUMN shifts.return_base_lng IS
  'Default base longitude used for return ETA.';
COMMENT ON COLUMN shifts.return_base_type IS
  'Semantic base: home | office.';
COMMENT ON COLUMN shifts.return_base_address IS
  'Saved base address snapshot if available (driver_bases.address).';

-- Backfill from 011 commute_* columns only when those columns exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shifts'
      AND column_name = 'commute_estimate_minutes'
  ) THEN
    UPDATE shifts
    SET
      estimated_return_minutes = commute_estimate_minutes,
      return_base_lat = commute_base_latitude,
      return_base_lng = commute_base_longitude,
      return_base_type = CASE
        WHEN LOWER(TRIM(COALESCE(commute_base_name, ''))) = 'office' THEN 'office'
        ELSE 'home'
      END,
      return_base_address = NULL
    WHERE estimated_return_minutes IS NULL
      AND commute_estimate_minutes IS NOT NULL;
  END IF;
END $$;
