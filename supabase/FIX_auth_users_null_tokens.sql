-- =============================================================================
-- FIX: "Database error querying schema" when signing in
-- =============================================================================
-- Users created via SQL seed have NULL in auth.users token columns.
-- Supabase Auth fails when signing in because it can't convert NULL to string.
-- This sets those columns to empty strings for affected users.
-- =============================================================================

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE email IN (
  'admin@firstchoicetransport.com',
  'driver1@firstchoicetransport.com',
  'driver2@firstchoicetransport.com'
);
