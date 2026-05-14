-- Run against your Supabase project (SQL Editor) after linking migrations.
-- Confirms migration 012-style audit columns exist on shifts.

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'shifts'
  AND column_name IN (
    'estimated_return_minutes',
    'return_base_lat',
    'return_base_lng',
    'return_base_type',
    'return_base_address',
    'last_dropoff_at',
    'last_dropoff_lat',
    'last_dropoff_lng',
    'clock_out_at',
    'auto_end_at',
    'verified_hours_minutes'
  )
ORDER BY column_name;
