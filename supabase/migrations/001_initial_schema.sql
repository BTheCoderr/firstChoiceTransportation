-- =============================================================================
-- First Choice Transportation - Initial Schema
-- Supabase / PostgreSQL
-- GPS-verified driver timesheet app
-- =============================================================================
--
-- Tables: companies, profiles, driver_bases, shifts, route_points,
--         client_stops, weekly_summaries
-- Suspicious activity: built into shifts (suspicious_reason, suspicious_details)
--
-- Business logic supported:
-- - Drivers log in and start shifts
-- - Shifts record start time and start GPS location
-- - Route points logged during shift
-- - Driver can mark final dropoff
-- - App calculates estimated return time to driver's base
-- - Shift auto-ends based on travel time
-- - Suspicious shifts can be flagged (in shifts table)
-- - Admins review weekly totals and shift details
--
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('driver', 'admin');

CREATE TYPE shift_status AS ENUM (
  'started',   -- Just clocked in
  'moving',    -- Has moved
  'idle',      -- Detected idle
  'completed', -- Finished normally
  'flagged'    -- Marked for review (suspicious)
);

CREATE TYPE stop_type AS ENUM ('pickup', 'dropoff');

-- =============================================================================
-- COMPANIES
-- =============================================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PROFILES (extends auth.users)
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'driver',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_email_format CHECK (char_length(email) > 0)
);

CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =============================================================================
-- DRIVER_BASES (home, office, etc.)
-- =============================================================================

CREATE TABLE driver_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Home',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT driver_bases_valid_coords CHECK (
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
  )
);

CREATE INDEX idx_driver_bases_driver_id ON driver_bases(driver_id);
CREATE UNIQUE INDEX idx_driver_bases_driver_name ON driver_bases(driver_id, name);

-- =============================================================================
-- SHIFTS (suspicious fields built in for MVP)
-- =============================================================================

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  auto_end_at TIMESTAMPTZ,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  first_movement_at TIMESTAMPTZ,
  last_dropoff_at TIMESTAMPTZ,
  last_dropoff_lat DOUBLE PRECISION,
  last_dropoff_lng DOUBLE PRECISION,
  verified_hours_minutes INTEGER,
  status shift_status NOT NULL DEFAULT 'started',
  suspicious_reason TEXT,
  suspicious_details JSONB,
  flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shifts_valid_verified CHECK (verified_hours_minutes IS NULL OR verified_hours_minutes >= 0)
);

CREATE INDEX idx_shifts_driver_id ON shifts(driver_id);
CREATE INDEX idx_shifts_company_id ON shifts(company_id);
CREATE INDEX idx_shifts_clock_in_at ON shifts(clock_in_at);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_driver_date ON shifts(driver_id, ((clock_in_at AT TIME ZONE 'UTC')::date));
CREATE INDEX idx_shifts_flagged ON shifts(company_id) WHERE flagged_at IS NOT NULL;

-- =============================================================================
-- ROUTE_POINTS (GPS during shift)
-- =============================================================================

CREATE TABLE route_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  is_moving BOOLEAN DEFAULT FALSE,
  CONSTRAINT route_points_valid_coords CHECK (
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
  )
);

CREATE INDEX idx_route_points_shift_id ON route_points(shift_id);
CREATE INDEX idx_route_points_recorded_at ON route_points(recorded_at);

-- =============================================================================
-- CLIENT_STOPS (pickups/dropoffs)
-- =============================================================================

CREATE TABLE client_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stop_type stop_type NOT NULL,
  notes TEXT
);

CREATE INDEX idx_client_stops_shift_id ON client_stops(shift_id);

-- =============================================================================
-- WEEKLY_SUMMARIES (pre-computed totals)
-- =============================================================================

CREATE TABLE weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  shift_count INTEGER NOT NULL DEFAULT 0,
  flagged_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, week_start),
  CONSTRAINT weekly_summaries_valid CHECK (total_minutes >= 0 AND shift_count >= 0 AND flagged_count >= 0)
);

CREATE INDEX idx_weekly_summaries_driver_id ON weekly_summaries(driver_id);
CREATE INDEX idx_weekly_summaries_company_id ON weekly_summaries(company_id);
CREATE INDEX idx_weekly_summaries_week_start ON weekly_summaries(week_start);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles in company"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
      AND p.company_id = profiles.company_id
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Drivers can read own bases"
  ON driver_bases FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can manage own bases"
  ON driver_bases FOR ALL
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins can read all driver_bases"
  ON driver_bases FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Admins can insert driver_bases"
  ON driver_bases FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Admins can update driver_bases"
  ON driver_bases FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Drivers can manage own shifts"
  ON shifts FOR ALL
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins can read all shifts"
  ON shifts FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Drivers can insert route_points for own shifts"
  ON route_points FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM shifts s WHERE s.id = shift_id AND s.driver_id = auth.uid())
  );

CREATE POLICY "Drivers can read route_points for own shifts"
  ON route_points FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shifts s WHERE s.id = shift_id AND s.driver_id = auth.uid())
  );

CREATE POLICY "Admins can read all route_points"
  ON route_points FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Drivers can insert client_stops for own shifts"
  ON client_stops FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM shifts s WHERE s.id = shift_id AND s.driver_id = auth.uid())
  );

CREATE POLICY "Drivers can read client_stops for own shifts"
  ON client_stops FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shifts s WHERE s.id = shift_id AND s.driver_id = auth.uid())
  );

CREATE POLICY "Admins can read all client_stops"
  ON client_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Drivers can read own weekly_summaries"
  ON weekly_summaries FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins can read all weekly_summaries"
  ON weekly_summaries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Admins can manage weekly_summaries"
  ON weekly_summaries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER driver_bases_updated_at
  BEFORE UPDATE ON driver_bases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER weekly_summaries_updated_at
  BEFORE UPDATE ON weekly_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM public.companies LIMIT 1;
  INSERT INTO public.profiles (id, company_id, email, full_name, role)
  VALUES (
    NEW.id,
    v_company_id,
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'driver')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- HELPER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_driver_weekly_hours(p_driver_id UUID, p_week_start DATE)
RETURNS TABLE (total_minutes BIGINT, shift_count BIGINT, flagged_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(s.verified_hours_minutes), 0)::BIGINT,
    COUNT(s.id)::BIGINT,
    (SELECT COUNT(*)::BIGINT FROM shifts s2
     WHERE s2.driver_id = p_driver_id
       AND s2.clock_in_at::date >= p_week_start
       AND s2.clock_in_at::date < p_week_start + INTERVAL '7 days'
       AND s2.flagged_at IS NOT NULL)
  FROM shifts s
  WHERE s.driver_id = p_driver_id
    AND s.clock_in_at::date >= p_week_start
    AND s.clock_in_at::date < p_week_start + INTERVAL '7 days'
    AND s.status IN ('completed', 'flagged');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- INITIAL COMPANY (required before first user signup)
-- =============================================================================

INSERT INTO companies (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 'First Choice Transportation');
