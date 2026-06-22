
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

ALTER TABLE public.operator_rr_counter ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operator_rr_counter FROM anon, authenticated;

DROP POLICY IF EXISTS leads_public_all ON public.leads;
REVOKE ALL ON public.leads FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

CREATE POLICY "Admins manage all leads" ON public.leads FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Operators view assigned leads" ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'operator'::public.app_role)
  AND assigned_to IN (SELECT id FROM public.operators WHERE user_id = auth.uid()));

CREATE POLICY "Operators update assigned leads" ON public.leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'operator'::public.app_role)
  AND assigned_to IN (SELECT id FROM public.operators WHERE user_id = auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'operator'::public.app_role)
  AND assigned_to IN (SELECT id FROM public.operators WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS operators_public_all ON public.operators;
REVOKE ALL ON public.operators FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operators TO authenticated;

CREATE POLICY "Authenticated read operators" ON public.operators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage operators" ON public.operators FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_roles_public_all ON public.user_roles;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS history_public_all ON public.lead_status_history;
REVOKE ALL ON public.lead_status_history FROM anon;
GRANT SELECT, INSERT ON public.lead_status_history TO authenticated;

CREATE POLICY "Admins read status history" ON public.lead_status_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Operators read own lead history" ON public.lead_status_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'operator'::public.app_role)
  AND lead_id IN (SELECT l.id FROM public.leads l JOIN public.operators o ON o.id = l.assigned_to WHERE o.user_id = auth.uid()));
CREATE POLICY "Authenticated insert status history" ON public.lead_status_history FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS assignment_history_public_all ON public.lead_assignment_history;
REVOKE ALL ON public.lead_assignment_history FROM anon;
GRANT SELECT, INSERT ON public.lead_assignment_history TO authenticated;

CREATE POLICY "Admins read assignment history" ON public.lead_assignment_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Authenticated insert assignment history" ON public.lead_assignment_history FOR INSERT TO authenticated WITH CHECK (true);
