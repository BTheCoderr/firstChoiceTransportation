-- =============================================================================
-- Only admins can add/change driver home base. Drivers can only read.
-- Prevents drivers from gaming verified hours by setting fake base locations.
-- =============================================================================

DROP POLICY IF EXISTS "Drivers can manage own bases" ON driver_bases;

-- Drivers keep read-only access (already have "Drivers can read own bases")
-- Admins already have: insert, update, select
