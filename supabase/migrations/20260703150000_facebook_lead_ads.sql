-- =============================================================================
-- Facebook/Instagram Lead Ads integratsiyasi
-- =============================================================================
-- Klinika o'z Facebook akkauntini ulaydi, reklama lid formalarini tanlaydi,
-- va mijoz formani to'ldirganda Meta webhook orqali xabar beradi — lid
-- avtomatik `leads` jadvaliga tushadi.
--
-- Barcha jadvallar service_role-only: access token kabi maxfiy ma'lumot
-- saqlanadi, client to'g'ridan-to'g'ri o'qimaydi/yozmaydi — hammasi
-- src/lib/facebook.functions.ts orqali, admin ekanligi tekshirilib amalga
-- oshadi (createOperatorUser, updateClinicBranding kabi mavjud naqsh).
-- =============================================================================

-- OAuth oqimi vaqtinchalik holati (10 daqiqa amal qiladi, bir martalik).
CREATE TABLE IF NOT EXISTS public.facebook_oauth_sessions (
  state text PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pages jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.facebook_oauth_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facebook_oauth_sessions FROM anon, authenticated;
GRANT ALL ON public.facebook_oauth_sessions TO service_role;

-- Klinika bilan bog'langan Facebook Page (bitta klinika uchun hozircha
-- bitta faol ulanish — unique(clinic_id, page_id) kelajakda bir nechta
-- page qo'shishga ham tayyor).
CREATE TABLE IF NOT EXISTS public.facebook_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_access_token text NOT NULL,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (clinic_id, page_id)
);

ALTER TABLE public.facebook_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facebook_connections FROM anon, authenticated;
GRANT ALL ON public.facebook_connections TO service_role;
CREATE INDEX IF NOT EXISTS idx_facebook_connections_page ON public.facebook_connections(page_id);

-- Ulangan Page'dagi reklama lid formalari — admin qaysi birini
-- sinxronlashni tanlaydi (is_syncing).
CREATE TABLE IF NOT EXISTS public.facebook_lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.facebook_connections(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  form_name text NOT NULL,
  is_syncing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, form_id)
);

ALTER TABLE public.facebook_lead_forms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facebook_lead_forms FROM anon, authenticated;
GRANT ALL ON public.facebook_lead_forms TO service_role;
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_form ON public.facebook_lead_forms(form_id);

-- Qayta ishlangan webhook voqealari — Meta bir xil hodisani qayta yuborishi
-- mumkin (retry); leadgen_id UNIQUE orqali ikki marta lid yaratilmaydi.
CREATE TABLE IF NOT EXISTS public.facebook_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  leadgen_id text NOT NULL UNIQUE,
  form_id text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  raw_payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facebook_lead_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facebook_lead_events FROM anon, authenticated;
GRANT ALL ON public.facebook_lead_events TO service_role;
