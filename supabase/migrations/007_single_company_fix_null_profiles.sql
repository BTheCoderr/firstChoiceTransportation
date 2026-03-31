-- =============================================================================
-- Single-company MVP: fix existing profiles with null company_id
-- All users belong to the one seeded company.
-- =============================================================================

UPDATE public.profiles
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;
