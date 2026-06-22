
-- Revert leads policies
DROP POLICY IF EXISTS "Admins full access to leads" ON public.leads;
DROP POLICY IF EXISTS "Operators read assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Operators update assigned leads" ON public.leads;
DROP POLICY IF EXISTS "leads_public_all" ON public.leads;

CREATE POLICY "leads_public_all" ON public.leads FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;

-- Revert user_roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_public_read" ON public.user_roles;

CREATE POLICY "user_roles_public_read" ON public.user_roles FOR SELECT USING (true);
GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Revert lead_status_history
DROP POLICY IF EXISTS "Admins read status history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Operators read own status history" ON public.lead_status_history;
DROP POLICY IF EXISTS "status_history_public_all" ON public.lead_status_history;

CREATE POLICY "status_history_public_all" ON public.lead_status_history FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON public.lead_status_history TO anon, authenticated;
GRANT ALL ON public.lead_status_history TO service_role;

-- Revert lead_assignment_history
DROP POLICY IF EXISTS "Admins read assignment history" ON public.lead_assignment_history;
DROP POLICY IF EXISTS "assignment_history_public_all" ON public.lead_assignment_history;

CREATE POLICY "assignment_history_public_all" ON public.lead_assignment_history FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON public.lead_assignment_history TO anon, authenticated;
GRANT ALL ON public.lead_assignment_history TO service_role;

-- Revert operator_rr_counter
ALTER TABLE public.operator_rr_counter DISABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.operator_rr_counter TO anon, authenticated;
GRANT ALL ON public.operator_rr_counter TO service_role;
