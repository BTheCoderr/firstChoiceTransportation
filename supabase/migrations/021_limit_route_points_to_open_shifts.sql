-- Location samples belong to the signed-in driver's OPEN shift.
-- Prevent stale/malicious writes being appended to completed routes.
-- Background offline sync stays supported for up to 15 min before clock-in
-- (GPS may have been acquired just before the start transaction).
DROP POLICY IF EXISTS "Drivers can insert route_points for own shifts"
  ON public.route_points;
CREATE POLICY "Drivers can insert route_points for own shifts"
ON public.route_points
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.id = route_points.shift_id
      AND s.driver_id = (select auth.uid())
      AND s.clock_out_at IS NULL
      AND route_points.recorded_at >= s.clock_in_at - interval '15 minutes'
      AND route_points.recorded_at <= now() + interval '5 minutes'
  )
);
