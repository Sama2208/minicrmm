-- 1) Fix mutable search_path on project functions
ALTER FUNCTION public.auto_move_leads() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_next_operator(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_google_sheets_on_lead() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_capi_on_lead_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_capi_on_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.working_minutes(timestamptz, timestamptz) SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_operator_limit() SET search_path = public, pg_temp;

-- 2) Revoke anon/public EXECUTE on SECURITY DEFINER functions in public schema
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- Trigger-only functions do not need to be callable by API roles
REVOKE ALL ON FUNCTION public.auto_move_leads() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_operator_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_appointment_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_assignment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_capi_on_lead_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_capi_on_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_google_sheets_on_lead() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3) Security definer views -> security invoker, no anon access
ALTER VIEW public.v_operator_control SET (security_invoker = on);
ALTER VIEW public.v_waiting_leads SET (security_invoker = on);
ALTER VIEW public.v_daily_sla SET (security_invoker = on);
ALTER VIEW public.v_campaign_attribution SET (security_invoker = on);
ALTER VIEW public.v_won_daily SET (security_invoker = on);
ALTER VIEW public.v_funnel_summary SET (security_invoker = on);
ALTER VIEW public.v_operator_summary SET (security_invoker = on);
ALTER VIEW public.v_source_summary SET (security_invoker = on);

REVOKE ALL ON public.v_operator_control, public.v_waiting_leads, public.v_daily_sla,
  public.v_campaign_attribution, public.v_won_daily, public.v_funnel_summary,
  public.v_operator_summary, public.v_source_summary FROM PUBLIC, anon;
GRANT SELECT ON public.v_operator_control, public.v_waiting_leads, public.v_daily_sla,
  public.v_campaign_attribution, public.v_won_daily, public.v_funnel_summary,
  public.v_operator_summary, public.v_source_summary TO authenticated;
GRANT ALL ON public.v_operator_control, public.v_waiting_leads, public.v_daily_sla,
  public.v_campaign_attribution, public.v_won_daily, public.v_funnel_summary,
  public.v_operator_summary, public.v_source_summary TO service_role;

-- 4) operator_rr_counter: service-role only, no public/anon access
DROP POLICY IF EXISTS rr_counter_clinic ON public.operator_rr_counter;
ALTER TABLE public.operator_rr_counter ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operator_rr_counter FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.operator_rr_counter TO service_role;
CREATE POLICY rr_counter_service_role ON public.operator_rr_counter
  FOR ALL TO service_role USING (true) WITH CHECK (true);