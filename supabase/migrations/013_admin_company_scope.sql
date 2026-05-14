-- =============================================================================
-- Scope admin reads to their own company. Replaces broad "Admins can read all..."
-- policies from 001_initial_schema.sql that ignored company_id.
-- Uses public.get_my_profile_meta() helper (see 009_fix_profiles_rls_recursion.sql).
-- =============================================================================

-- ---------- shifts ----------

DROP POLICY IF EXISTS "Admins can read all shifts" ON shifts;

CREATE POLICY "Admins can read company shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.get_my_profile_meta() m
      WHERE m.role = 'admin' AND m.company_id = shifts.company_id
    )
  );

-- Tighten driver shift policy: separate SELECT / INSERT / UPDATE with WITH CHECK
-- so a driver can never claim another company's id on insert.

DROP POLICY IF EXISTS "Drivers can manage own shifts" ON shifts;

CREATE POLICY "Drivers can select own shifts"
  ON shifts FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert own shifts"
  ON shifts FOR INSERT
  WITH CHECK (
    auth.uid() = driver_id
    AND EXISTS (
      SELECT 1 FROM public.get_my_profile_meta() m
      WHERE m.company_id = shifts.company_id
    )
  );

CREATE POLICY "Drivers can update own shifts"
  ON shifts FOR UPDATE
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- ---------- route_points ----------

DROP POLICY IF EXISTS "Admins can read all route_points" ON route_points;

CREATE POLICY "Admins can read company route_points"
  ON route_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.get_my_profile_meta() m
      JOIN shifts s ON s.id = route_points.shift_id
      WHERE m.role = 'admin' AND m.company_id = s.company_id
    )
  );

-- ---------- client_stops ----------

DROP POLICY IF EXISTS "Admins can read all client_stops" ON client_stops;

CREATE POLICY "Admins can read company client_stops"
  ON client_stops FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.get_my_profile_meta() m
      JOIN shifts s ON s.id = client_stops.shift_id
      WHERE m.role = 'admin' AND m.company_id = s.company_id
    )
  );

-- ---------- driver_bases ----------

DROP POLICY IF EXISTS "Admins can read all driver_bases" ON driver_bases;
DROP POLICY IF EXISTS "Admins can insert driver_bases" ON driver_bases;
DROP POLICY IF EXISTS "Admins can update driver_bases" ON driver_bases;

CREATE POLICY "Admins can read company driver_bases"
  ON driver_bases FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.get_my_profile_meta() m
      JOIN profiles p ON p.id = driver_bases.driver_id
      WHERE m.role = 'admin' AND m.company_id = p.company_id
    )
  );

CREATE POLICY "Admins can insert company driver_bases"
  ON driver_bases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.get_my_profile_meta() m
      JOIN profiles p ON p.id = driver_bases.driver_id
      WHERE m.role = 'admin' AND m.company_id = p.company_id
    )
  );

CREATE POLICY "Admins can update company driver_bases"
  ON driver_bases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.get_my_profile_meta() m
      JOIN profiles p ON p.id = driver_bases.driver_id
      WHERE m.role = 'admin' AND m.company_id = p.company_id
    )
  );

-- ---------- weekly_summaries ----------

DROP POLICY IF EXISTS "Admins can read all weekly_summaries" ON weekly_summaries;
DROP POLICY IF EXISTS "Admins can manage weekly_summaries" ON weekly_summaries;

CREATE POLICY "Admins can read company weekly_summaries"
  ON weekly_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.get_my_profile_meta() m
      WHERE m.role = 'admin' AND m.company_id = weekly_summaries.company_id
    )
  );

CREATE POLICY "Admins can manage company weekly_summaries"
  ON weekly_summaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.get_my_profile_meta() m
      WHERE m.role = 'admin' AND m.company_id = weekly_summaries.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.get_my_profile_meta() m
      WHERE m.role = 'admin' AND m.company_id = weekly_summaries.company_id
    )
  );
