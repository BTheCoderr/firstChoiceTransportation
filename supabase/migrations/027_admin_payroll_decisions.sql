-- 027: auditable administrator payroll decisions for existing closed shifts.
-- Additive and NON-DESTRUCTIVE. Does not rewrite shifts, verified minutes or old payroll.
-- Run only after review/backup and an explicit deployment decision.
CREATE TABLE IF NOT EXISTS public.shift_payroll_reviews (
  shift_id uuid PRIMARY KEY REFERENCES public.shifts(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  decision text NOT NULL CHECK (decision IN ('approved','rejected','test_excluded','needs_review')),
  payable_minutes integer,
  note text NOT NULL,
  reviewed_by uuid NOT NULL REFERENCES public.profiles(id),
  reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT payroll_review_amount_consistent CHECK (
    (decision = 'approved' AND payable_minutes BETWEEN 0 AND 1440)
    OR (decision <> 'approved' AND payable_minutes IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_shift_payroll_reviews_company_decision
  ON public.shift_payroll_reviews(company_id, decision);
ALTER TABLE public.shift_payroll_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_payroll_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.shift_payroll_reviews TO authenticated;
DROP POLICY IF EXISTS "Company administrators read payroll reviews" ON public.shift_payroll_reviews;
CREATE POLICY "Company administrators read payroll reviews"
  ON public.shift_payroll_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.get_my_profile_meta() m
    WHERE m.role = 'admin'::public.user_role AND m.company_id = shift_payroll_reviews.company_id));

CREATE TABLE IF NOT EXISTS public.shift_payroll_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  previous_decision text,
  new_decision text NOT NULL,
  previous_payable_minutes integer,
  new_payable_minutes integer,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_shift_payroll_review_events_shift
  ON public.shift_payroll_review_events(shift_id, created_at DESC);
ALTER TABLE public.shift_payroll_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_payroll_review_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.shift_payroll_review_events TO authenticated;
DROP POLICY IF EXISTS "Company administrators read payroll review events" ON public.shift_payroll_review_events;
CREATE POLICY "Company administrators read payroll review events"
  ON public.shift_payroll_review_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.get_my_profile_meta() m
    WHERE m.role = 'admin'::public.user_role AND m.company_id = shift_payroll_review_events.company_id));

-- Explicit decisions never mutate original shift rows; historic values remain audit evidence.
-- This prevents rejected/test records from being "fixed" by secretly altering payroll history.
CREATE OR REPLACE FUNCTION public.admin_decide_shift_payroll(
  p_shift_id uuid, p_decision text, p_payable_minutes integer, p_note text
) RETURNS public.shift_payroll_reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_company uuid;
  v_shift public.shifts%ROWTYPE;
  v_previous public.shift_payroll_reviews%ROWTYPE;
  v_decision text := trim(coalesce(p_decision,''));
  v_note text := trim(coalesce(p_note,''));
  v_span_minutes numeric;
  v_result public.shift_payroll_reviews%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  SELECT company_id INTO v_company FROM public.profiles
    WHERE id = v_actor AND role = 'admin'::public.user_role;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_shift_id IS NULL OR v_decision NOT IN ('approved','rejected','test_excluded','needs_review')
    OR length(v_note) < 20 OR length(v_note) > 1200 THEN
    RAISE EXCEPTION 'INVALID_REVIEW_INPUT' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_shift FROM public.shifts
    WHERE id = p_shift_id AND company_id = v_company FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIFT_NOT_FOUND' USING ERRCODE = '42501';
  END IF;
  IF v_shift.clock_out_at IS NULL THEN
    RAISE EXCEPTION 'SHIFT_STILL_OPEN' USING ERRCODE = '22023';
  END IF;
  -- Existing recovery flow retains its own mandatory second payroll-review step.
  IF v_shift.verified_hours_minutes IS NULL
    AND v_shift.suspicious_details ->> 'shift_recovery' = 'closed_pending_payroll_review'
    AND v_decision = 'approved' THEN
    RAISE EXCEPTION 'USE_RECOVERY_APPROVAL' USING ERRCODE = '22023';
  END IF;

  v_span_minutes := floor(extract(epoch FROM
    (v_shift.clock_out_at - v_shift.clock_in_at)) / 60);
  IF v_decision = 'approved' THEN
    -- Original span is evidence, NOT an automatic amount. Admin must enter amount.
    IF p_payable_minutes IS NULL OR p_payable_minutes < 1 OR p_payable_minutes > 1440
      OR v_span_minutes < 1 OR p_payable_minutes > v_span_minutes THEN
      RAISE EXCEPTION 'INVALID_APPROVED_MINUTES' USING ERRCODE = '22023';
    END IF;
  ELSIF p_payable_minutes IS NOT NULL THEN
    RAISE EXCEPTION 'NON_APPROVAL_HAS_MINUTES' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_previous FROM public.shift_payroll_reviews
    WHERE shift_id = p_shift_id FOR UPDATE;

  INSERT INTO public.shift_payroll_reviews
    (shift_id, company_id, decision, payable_minutes, note, reviewed_by, reviewed_at)
  VALUES (p_shift_id,v_company,v_decision,p_payable_minutes,v_note,v_actor,clock_timestamp())
  ON CONFLICT (shift_id) DO UPDATE SET
    decision = EXCLUDED.decision,
    payable_minutes = EXCLUDED.payable_minutes,
    note = EXCLUDED.note,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at
  WHERE public.shift_payroll_reviews.company_id = EXCLUDED.company_id
  RETURNING * INTO v_result;

  IF v_result.shift_id IS NULL THEN
    RAISE EXCEPTION 'SHIFT_COMPANY_MISMATCH' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.shift_payroll_review_events
    (shift_id,company_id,actor_id,previous_decision,new_decision,
     previous_payable_minutes,new_payable_minutes,note)
  VALUES (p_shift_id,v_company,v_actor,v_previous.decision,v_decision,
    v_previous.payable_minutes,p_payable_minutes,v_note);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_decide_shift_payroll(uuid,text,integer,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_shift_payroll(uuid,text,integer,text) TO authenticated;

-- Existing admin recovery approval is already an explicit, audited decision.
-- Mirror its audit event into the new ledger IN THE SAME TRANSACTION, never as a
-- separate client request that could fail after approval succeeds.
CREATE OR REPLACE FUNCTION public.record_recovered_payroll_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_before public.shift_payroll_reviews%ROWTYPE;
BEGIN
  IF NEW.action <> 'approve_paid_hours' THEN
    RETURN NEW;
  END IF;
  IF NEW.approved_minutes IS NULL OR NEW.approved_minutes < 0 OR NEW.approved_minutes > 1440 THEN
    RAISE EXCEPTION 'INVALID_RECOVERED_APPROVAL' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_before FROM public.shift_payroll_reviews
    WHERE shift_id = NEW.shift_id FOR UPDATE;
  INSERT INTO public.shift_payroll_reviews
    (shift_id,company_id,decision,payable_minutes,note,reviewed_by,reviewed_at)
  VALUES (NEW.shift_id,NEW.company_id,'approved',NEW.approved_minutes,
    NEW.note,NEW.actor_id,NEW.created_at)
  ON CONFLICT (shift_id) DO UPDATE SET
    decision = EXCLUDED.decision,
    payable_minutes = EXCLUDED.payable_minutes,
    note = EXCLUDED.note,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at
  WHERE public.shift_payroll_reviews.company_id = EXCLUDED.company_id;
  INSERT INTO public.shift_payroll_review_events
    (shift_id,company_id,actor_id,previous_decision,new_decision,
     previous_payable_minutes,new_payable_minutes,note)
  VALUES (NEW.shift_id,NEW.company_id,NEW.actor_id,v_before.decision,'approved',
    v_before.payable_minutes,NEW.approved_minutes,NEW.note);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_recovered_payroll_decision() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_record_recovered_payroll_decision ON public.shift_review_events;
CREATE TRIGGER trg_record_recovered_payroll_decision
AFTER INSERT ON public.shift_review_events
FOR EACH ROW EXECUTE FUNCTION public.record_recovered_payroll_decision();
