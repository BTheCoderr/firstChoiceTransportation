-- Do not let a mobile client choose when a GPS upload reached the server.
-- The geofence dwell/arrival calculation uses received_at as its authority.
CREATE OR REPLACE FUNCTION public.set_route_point_received_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.received_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_route_point_received_at ON public.route_points;
CREATE TRIGGER trg_set_route_point_received_at
BEFORE INSERT ON public.route_points
FOR EACH ROW
EXECUTE FUNCTION public.set_route_point_received_at();
REVOKE ALL ON FUNCTION public.set_route_point_received_at()
FROM PUBLIC, anon, authenticated;
