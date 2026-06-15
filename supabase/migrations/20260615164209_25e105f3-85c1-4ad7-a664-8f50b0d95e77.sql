
-- 1. Tighten operators_read: only self or admin
DROP POLICY IF EXISTS operators_read ON public.operators;
CREATE POLICY operators_read ON public.operators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role('admin'));

-- 2. Recreate views with security_invoker so RLS of caller applies
DROP VIEW IF EXISTS public.v_daily_leads;
DROP VIEW IF EXISTS public.v_funnel_summary;
DROP VIEW IF EXISTS public.v_source_summary;
DROP VIEW IF EXISTS public.v_operator_summary;

CREATE VIEW public.v_daily_leads WITH (security_invoker=true) AS
  SELECT date(created_at) AS day, source, count(*) AS total
  FROM public.leads GROUP BY date(created_at), source ORDER BY date(created_at);

CREATE VIEW public.v_funnel_summary WITH (security_invoker=true) AS
  SELECT status, count(*) AS total FROM public.leads GROUP BY status;

CREATE VIEW public.v_source_summary WITH (security_invoker=true) AS
  SELECT source, count(*) AS total,
         count(*) FILTER (WHERE status = 'yotishga_yozildi'::lead_status) AS converted
  FROM public.leads GROUP BY source;

CREATE VIEW public.v_operator_summary WITH (security_invoker=true) AS
  SELECT o.full_name,
         count(l.id) AS total_leads,
         count(l.id) FILTER (WHERE l.status = 'yotishga_yozildi'::lead_status) AS converted,
         round((100.0 * count(l.id) FILTER (WHERE l.status = 'yotishga_yozildi'::lead_status))::numeric
               / NULLIF(count(l.id),0)::numeric, 1) AS conversion_rate
  FROM public.operators o LEFT JOIN public.leads l ON l.assigned_to = o.id
  GROUP BY o.full_name;

-- 3. Revoke EXECUTE on SECURITY DEFINER functions from anon/public; keep authenticated where needed
REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_operator_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_operator_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.log_status_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_status_change() TO service_role;

REVOKE ALL ON FUNCTION public.assign_operator_if_null() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_operator_if_null() TO service_role;

REVOKE ALL ON FUNCTION public.get_next_operator() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_operator() TO service_role;
