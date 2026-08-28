-- `digest` is provided by pgcrypto in Supabase's `extensions` schema.
-- The CAPI status trigger is SECURITY DEFINER and deliberately uses a fixed
-- search_path, so the extension schema must be included explicitly.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF to_regprocedure('public.trigger_capi_on_lead_status_change()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.trigger_capi_on_lead_status_change() SET search_path TO public, extensions, pg_temp';
  END IF;
END;
$$;
