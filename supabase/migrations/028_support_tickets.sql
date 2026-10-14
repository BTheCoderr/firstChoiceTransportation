-- 028: in-app support center with restricted company and author access.
-- Additive; no existing payroll/shift rows are modified.
CREATE TABLE IF NOT EXISTS public.support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES public.companies(id),
 created_by uuid NOT NULL REFERENCES public.profiles(id),
 subject text NOT NULL CHECK (char_length(subject) BETWEEN 5 AND 120),
 category text NOT NULL CHECK (category IN ('shift_hours','gps_location','account','other')),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','awaiting_driver','resolved','closed')),
 priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high')),
 assigned_to uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company_updated ON public.support_tickets(company_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_author_updated ON public.support_tickets(created_by,updated_at DESC);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_tickets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.support_tickets TO authenticated;
DROP POLICY IF EXISTS "Support tickets for requester or company admin" ON public.support_tickets;
CREATE POLICY "Support tickets for requester or company admin" ON public.support_tickets
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR EXISTS (
       SELECT 1 FROM public.get_my_profile_meta() meta
       WHERE meta.company_id = support_tickets.company_id
         AND meta.role = 'admin'::public.user_role
    )
  );

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL REFERENCES public.companies(id),
 author_id uuid NOT NULL REFERENCES public.profiles(id),
 body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 3000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created ON public.support_ticket_messages(ticket_id,created_at);
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_ticket_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.support_ticket_messages TO authenticated;
DROP POLICY IF EXISTS "Support messages for requester or company admin" ON public.support_ticket_messages;
CREATE POLICY "Support messages for requester or company admin" ON public.support_ticket_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.support_tickets ticket
      WHERE ticket.id = support_ticket_messages.ticket_id
        AND ticket.company_id = support_ticket_messages.company_id)
  );

CREATE TABLE IF NOT EXISTS public.support_ticket_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL REFERENCES public.companies(id),
 actor_id uuid NOT NULL REFERENCES public.profiles(id),
 from_status text,
 to_status text NOT NULL,
 from_priority text,
 to_priority text,
 note text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_support_events_ticket_created ON public.support_ticket_events(ticket_id,created_at);
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_ticket_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.support_ticket_events TO authenticated;
DROP POLICY IF EXISTS "Support events for company admins" ON public.support_ticket_events;
CREATE POLICY "Support events for company admins" ON public.support_ticket_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.get_my_profile_meta() meta
      WHERE meta.company_id = support_ticket_events.company_id
        AND meta.role = 'admin'::public.user_role)
  );

CREATE OR REPLACE FUNCTION public.submit_support_ticket(
 p_subject text, p_category text, p_body text
) RETURNS public.support_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_actor uuid := auth.uid();
 v_company uuid;
 v_ticket public.support_tickets%ROWTYPE;
 v_subject text := btrim(coalesce(p_subject,''));
 v_category text := btrim(coalesce(p_category,''));
 v_body text := btrim(coalesce(p_body,''));
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT company_id INTO v_company FROM public.profiles WHERE id=v_actor;
 IF v_company IS NULL THEN RAISE EXCEPTION 'COMPANY_REQUIRED' USING ERRCODE='42501'; END IF;
 IF length(v_subject) NOT BETWEEN 5 AND 120 OR length(v_body) NOT BETWEEN 10 AND 3000
   OR v_category NOT IN ('shift_hours','gps_location','account','other') THEN
   RAISE EXCEPTION 'INVALID_TICKET' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM public.support_tickets
     WHERE created_by=v_actor AND created_at > clock_timestamp() - interval '24 hours') >= 5 THEN
   RAISE EXCEPTION 'TICKET_RATE_LIMIT' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.support_tickets(company_id, created_by, subject, category)
   VALUES (v_company,v_actor,v_subject,v_category) RETURNING * INTO v_ticket;
 INSERT INTO public.support_ticket_messages(ticket_id,company_id,author_id,body)
   VALUES(v_ticket.id,v_company,v_actor,v_body);
 INSERT INTO public.support_ticket_events(ticket_id,company_id,actor_id,to_status,note)
   VALUES(v_ticket.id,v_company,v_actor,'open','Ticket opened');
 RETURN v_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION public.reply_support_ticket(
 p_ticket_id uuid, p_body text
) RETURNS public.support_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_actor uuid := auth.uid();
 v_company uuid;
 v_role public.user_role;
 v_ticket public.support_tickets%ROWTYPE;
 v_body text := btrim(coalesce(p_body,''));
 v_next text;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT company_id,role INTO v_company,v_role FROM public.profiles WHERE id=v_actor;
 IF v_company IS NULL THEN RAISE EXCEPTION 'COMPANY_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_ticket_id IS NULL OR length(v_body) NOT BETWEEN 2 AND 3000 THEN
   RAISE EXCEPTION 'INVALID_REPLY' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_ticket FROM public.support_tickets
  WHERE id=p_ticket_id AND company_id=v_company FOR UPDATE;
 IF NOT FOUND OR (v_role <> 'admin'::public.user_role AND v_ticket.created_by <> v_actor) THEN
   RAISE EXCEPTION 'TICKET_NOT_FOUND' USING ERRCODE='42501';
 END IF;
 IF v_ticket.status = 'closed' THEN
   RAISE EXCEPTION 'TICKET_CLOSED' USING ERRCODE='22023';
 END IF;
 -- Limit spam and oversized conversations without deleting any previous message.
 IF (SELECT count(*) FROM public.support_ticket_messages
   WHERE ticket_id=p_ticket_id) >= 200 THEN
   RAISE EXCEPTION 'TICKET_MESSAGE_LIMIT' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.support_ticket_messages(ticket_id,company_id,author_id,body)
  VALUES(p_ticket_id,v_company,v_actor,v_body);
 v_next := CASE WHEN v_role='admin'::public.user_role THEN 'awaiting_driver'
     ELSE 'open' END;
 UPDATE public.support_tickets SET status=v_next, updated_at=clock_timestamp()
   WHERE id=p_ticket_id RETURNING * INTO v_ticket;
 RETURN v_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_support_ticket(
 p_ticket_id uuid, p_status text, p_priority text, p_note text
) RETURNS public.support_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_actor uuid := auth.uid();
 v_company uuid;
 v_ticket public.support_tickets%ROWTYPE;
 v_old public.support_tickets%ROWTYPE;
 v_status text := btrim(coalesce(p_status,''));
 v_priority text := btrim(coalesce(p_priority,''));
 v_note text := btrim(coalesce(p_note,''));
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT company_id INTO v_company FROM public.profiles
   WHERE id=v_actor AND role='admin'::public.user_role;
 IF v_company IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_ticket_id IS NULL OR v_status NOT IN ('open','in_progress','awaiting_driver','resolved','closed')
  OR v_priority NOT IN ('normal','high') OR length(v_note) NOT BETWEEN 10 AND 500 THEN
  RAISE EXCEPTION 'INVALID_UPDATE' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_old FROM public.support_tickets
  WHERE id=p_ticket_id AND company_id=v_company FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'TICKET_NOT_FOUND' USING ERRCODE='42501'; END IF;
 UPDATE public.support_tickets SET
   status=v_status,priority=v_priority,updated_at=clock_timestamp()
   WHERE id=p_ticket_id RETURNING * INTO v_ticket;
 INSERT INTO public.support_ticket_events
   (ticket_id,company_id,actor_id,from_status,to_status,from_priority,to_priority,note)
 VALUES (p_ticket_id,v_company,v_actor,v_old.status,v_status,v_old.priority,v_priority,v_note);
 RETURN v_ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_support_ticket(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_support_ticket(text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.reply_support_ticket(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reply_support_ticket(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_update_support_ticket(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_support_ticket(uuid,text,text,text) TO authenticated;
