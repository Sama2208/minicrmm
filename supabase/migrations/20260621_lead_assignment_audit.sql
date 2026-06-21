-- Audit log: assigned_to o'zgarishlarini kuzatish
-- Keyingi safar taqsimlash yo'qolsa, bu jadval orqali tiklash mumkin

CREATE TABLE IF NOT EXISTS public.lead_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_assigned_to uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  new_assigned_to uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asgn_hist_lead ON public.lead_assignment_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_asgn_hist_time ON public.lead_assignment_history(changed_at DESC);

ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assignment_history_public_all ON public.lead_assignment_history;
CREATE POLICY assignment_history_public_all ON public.lead_assignment_history FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_assignment_history TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_assignment_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.lead_assignment_history (lead_id, old_assigned_to, new_assigned_to)
    VALUES (NEW.id, OLD.assigned_to, NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_assignment_change ON public.leads;
CREATE TRIGGER trg_log_assignment_change
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_assignment_change();
