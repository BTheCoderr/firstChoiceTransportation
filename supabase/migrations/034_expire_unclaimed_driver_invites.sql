-- 034: Permit authorized admins to retry a genuinely abandoned invite.
-- No data changes occur when this migration is applied.
-- Cleanup is service-role-only and can only remove a 7+-day pending
-- intent when NO matching auth.users identity exists. Never delete Auth
-- users, real driver profiles, consumed intents, GPS, or payroll.
CREATE OR REPLACE FUNCTION public.clear_expired_unclaimed_driver_intent(
  p_email text, p_company_id uuid
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_count integer := 0;
BEGIN
  IF p_company_id IS NULL OR length(v_email) < 5 OR length(v_email) > 254 THEN
    RETURN 0;
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email) THEN
    RETURN 0;
  END IF;
  DELETE FROM public.driver_provisioning_intents i
  WHERE i.email = v_email AND i.company_id = p_company_id
    AND i.user_id IS NULL AND i.consumed_at IS NULL
    AND i.created_at < clock_timestamp() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_expired_unclaimed_driver_intent(text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clear_expired_unclaimed_driver_intent(text,uuid)
  TO service_role;
COMMENT ON FUNCTION public.clear_expired_unclaimed_driver_intent(text,uuid) IS
 'Service-role only cleanup of abandoned 7-day-old invitation intents. Never removes actual Auth accounts or active/consumed invitations.';
