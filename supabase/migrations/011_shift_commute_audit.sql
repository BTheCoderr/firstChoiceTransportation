-- Audit trail for final dropoff paid return-to-base commute (see completeShiftWithFinalDropoff).

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS commute_estimate_raw_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS commute_estimate_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS commute_base_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS commute_base_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS commute_base_name TEXT;

COMMENT ON COLUMN shifts.commute_estimate_raw_minutes IS
  'Straight-line ETA minutes from last dropoff to default base before cap.';
COMMENT ON COLUMN shifts.commute_estimate_minutes IS
  'Minutes added to last_dropoff_at for paid clock-out (same as applied in app, possibly capped).';
COMMENT ON COLUMN shifts.commute_base_latitude IS
  'Latitude of driver default Home/Office base used for ETA.';
COMMENT ON COLUMN shifts.commute_base_longitude IS
  'Longitude of driver default Home/Office base used for ETA.';
COMMENT ON COLUMN shifts.commute_base_name IS
  'driver_bases.name for the base row used (e.g. Home, Office).';
