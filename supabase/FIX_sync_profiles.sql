-- =============================================================================
-- FIX: "Profile Not Found" - Create profiles for auth users that don't have one
-- =============================================================================
-- Run this in Supabase SQL Editor, then try signing in again.
-- =============================================================================

SELECT public.sync_orphan_profiles();
