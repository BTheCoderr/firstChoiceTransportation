# Retired legacy SQL — DO NOT RUN

The six root-level `supabase/FIX_*.sql` emergency-repair scripts were removed from the active repository during the October 15, 2026 release audit.

They predate the administrator-provisioned onboarding and profile authorization migrations (016–026). Executing them against the current project could recreate profile/role-escalation vulnerabilities, hard-code historical identities, or overwrite trusted onboarding data.

**Never run any historical `FIX_*.sql` script against production.** Source history remains available in Git if it is needed for incident investigation, but restoring a migration requires a security review and a scoped forward-only migration.

Current migration runbooks must use the numbered, reviewed `supabase/migrations/` files. The coordinated payroll hardening cutover in 020 has **not** been confirmed deployed and must not be applied until client compatibility and rollback have been tested. Migration 025 is also not safe to reapply without a review of its historical-profile backfill.
