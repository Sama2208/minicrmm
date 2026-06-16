
-- Drop restrictive policies and open access to anon (no auth)
DROP POLICY IF EXISTS leads_admin_all ON public.leads;
DROP POLICY IF EXISTS leads_operator_select ON public.leads;
DROP POLICY IF EXISTS leads_operator_update ON public.leads;
DROP POLICY IF EXISTS operators_admin_write ON public.operators;
DROP POLICY IF EXISTS operators_read ON public.operators;
DROP POLICY IF EXISTS roles_admin_all ON public.user_roles;
DROP POLICY IF EXISTS roles_self_read ON public.user_roles;
DROP POLICY IF EXISTS history_admin ON public.lead_status_history;
DROP POLICY IF EXISTS history_operator ON public.lead_status_history;

CREATE POLICY leads_public_all ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY operators_public_all ON public.operators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY user_roles_public_all ON public.user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY history_public_all ON public.lead_status_history FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operators TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_status_history TO anon, authenticated;
