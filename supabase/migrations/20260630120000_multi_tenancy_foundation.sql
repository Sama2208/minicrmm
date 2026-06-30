-- =============================================================================
-- Multi-tenancy (ko'p klinikalik) asosi
-- =============================================================================
-- Maqsad: bitta CRM nusxasini ko'plab klinikalarga sotish uchun har bir
-- klinikaning ma'lumotlarini bir-biridan to'liq ajratish (tenant isolation).
--
-- DIQQAT: bu migratsiya jonli bazaga qo'llanishidan oldin albatta:
--   1) ma'lumotlar bazasi zaxirasi (backup) olinsin;
--   2) avval Supabase test branch'ida sinab ko'rilsin (docs/MULTITENANCY.md).
--
-- Migratsiya additiv va idempotent: avval ustunlar nullable qo'shiladi,
-- mavjud yozuvlar "default" klinikaga bog'lanadi, keyin NOT NULL qilinadi.
-- =============================================================================

-- ─── 1. Klinikalar (tenant) jadvali ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  -- ommaviy ariza havolasi uchun: /ariza?clinic=<slug>
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mavjud ma'lumotlar biriktiriladigan standart klinika.
INSERT INTO public.clinics (name, slug)
VALUES ('Asosiy klinika', 'default')
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Asosiy jadvallarga clinic_id qo'shish (avval nullable) ────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.lead_status_history
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.lead_assignment_history
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;

-- ─── 3. Mavjud yozuvlarni standart klinikaga biriktirish (backfill) ───────────
DO $$
DECLARE
  default_clinic uuid;
BEGIN
  SELECT id INTO default_clinic FROM public.clinics WHERE slug = 'default';

  UPDATE public.operators SET clinic_id = default_clinic WHERE clinic_id IS NULL;
  UPDATE public.user_roles SET clinic_id = default_clinic WHERE clinic_id IS NULL;
  UPDATE public.leads SET clinic_id = default_clinic WHERE clinic_id IS NULL;

  -- Tarix va qo'ng'iroq loglari ota-lid orqali to'g'ri klinikaga bog'lanadi.
  UPDATE public.lead_status_history h
    SET clinic_id = l.clinic_id FROM public.leads l
    WHERE h.lead_id = l.id AND h.clinic_id IS NULL;
  UPDATE public.lead_assignment_history h
    SET clinic_id = l.clinic_id FROM public.leads l
    WHERE h.lead_id = l.id AND h.clinic_id IS NULL;
  UPDATE public.call_logs c
    SET clinic_id = l.clinic_id FROM public.leads l
    WHERE c.lead_id = l.id AND c.clinic_id IS NULL;

  -- Egasiz qolgan tarix yozuvlari ham standart klinikaga.
  UPDATE public.lead_status_history SET clinic_id = default_clinic WHERE clinic_id IS NULL;
  UPDATE public.lead_assignment_history SET clinic_id = default_clinic WHERE clinic_id IS NULL;
  UPDATE public.call_logs SET clinic_id = default_clinic WHERE clinic_id IS NULL;
END $$;

-- ─── 4. clinic_id ni majburiy (NOT NULL) qilish ──────────────────────────────
ALTER TABLE public.leads ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.operators ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.lead_status_history ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.lead_assignment_history ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.call_logs ALTER COLUMN clinic_id SET NOT NULL;

-- Tezkor filtrlash uchun indekslar.
CREATE INDEX IF NOT EXISTS idx_leads_clinic ON public.leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_operators_clinic ON public.operators(clinic_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_clinic ON public.user_roles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_status_history_clinic ON public.lead_status_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_clinic ON public.lead_assignment_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_clinic ON public.call_logs(clinic_id);

-- ─── 5. Joriy foydalanuvchining klinikasi ────────────────────────────────────
-- SECURITY DEFINER: RLS rekursiyasiga tushmasdan user_roles dan o'qiydi.
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT clinic_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_clinic_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_clinic_id() TO authenticated, service_role;

-- ─── 6. Klinika bo'yicha izolyatsiyalovchi RLS ───────────────────────────────
-- Eski "hammaga ochiq" siyosatlar olib tashlanadi va har bir jadval o'z
-- klinikasi bilan cheklanadi. anon endi jadvallarga to'g'ridan-to'g'ri kira
-- olmaydi (ommaviy ariza service_role server funksiyasi orqali ishlaydi).

-- Yordamchi: bitta jadval uchun "faqat o'z klinikasi" siyosatini o'rnatadi.
-- (Quyida har biri aniq yozilgan, chunki policy nomlari turlicha.)

-- leads ----------------------------------------------------------------------
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_public_all ON public.leads;
DROP POLICY IF EXISTS "Admins manage all leads" ON public.leads;
DROP POLICY IF EXISTS "Operators view assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Operators update assigned leads" ON public.leads;
REVOKE ALL ON public.leads FROM anon;
CREATE POLICY clinic_isolation_leads ON public.leads FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- operators ------------------------------------------------------------------
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operators_public_all ON public.operators;
DROP POLICY IF EXISTS operators_read ON public.operators;
DROP POLICY IF EXISTS "Authenticated read operators" ON public.operators;
DROP POLICY IF EXISTS "Admins manage operators" ON public.operators;
REVOKE ALL ON public.operators FROM anon;
CREATE POLICY clinic_isolation_operators ON public.operators FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- user_roles -----------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_public_all ON public.user_roles;
DROP POLICY IF EXISTS user_roles_public_read ON public.user_roles;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
REVOKE ALL ON public.user_roles FROM anon;
-- Foydalanuvchi o'z rolini, admin esa o'z klinikasidagi barcha rollarni ko'radi.
CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR clinic_id = public.current_clinic_id());
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (clinic_id = public.current_clinic_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- lead_status_history --------------------------------------------------------
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS history_public_all ON public.lead_status_history;
DROP POLICY IF EXISTS status_history_public_all ON public.lead_status_history;
DROP POLICY IF EXISTS "Admins read status history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Operators read own lead history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Authenticated insert status history" ON public.lead_status_history;
REVOKE ALL ON public.lead_status_history FROM anon;
CREATE POLICY clinic_isolation_status_history ON public.lead_status_history FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- lead_assignment_history ----------------------------------------------------
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assignment_history_public_all ON public.lead_assignment_history;
DROP POLICY IF EXISTS "Admins read assignment history" ON public.lead_assignment_history;
DROP POLICY IF EXISTS "Authenticated insert assignment history" ON public.lead_assignment_history;
REVOKE ALL ON public.lead_assignment_history FROM anon;
CREATE POLICY clinic_isolation_assignment_history ON public.lead_assignment_history FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- call_logs ------------------------------------------------------------------
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage call logs" ON public.call_logs;
REVOKE ALL ON public.call_logs FROM anon;
CREATE POLICY clinic_isolation_call_logs ON public.call_logs FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- clinics --------------------------------------------------------------------
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinics FROM anon;
GRANT SELECT ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
-- Foydalanuvchi faqat o'z klinikasini ko'radi.
CREATE POLICY clinic_self_read ON public.clinics FOR SELECT TO authenticated
  USING (id = public.current_clinic_id());

-- ─── 7. Hisobot view'lari RLS ga bo'ysunsin ──────────────────────────────────
-- security_invoker=on: view so'rovni yuborgan foydalanuvchi huquqi bilan
-- ishlaydi, demak leads ustidagi klinika RLS avtomatik qo'llanadi.
ALTER VIEW IF EXISTS public.v_funnel_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_source_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_operator_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_daily_leads SET (security_invoker = on);
REVOKE ALL ON public.v_funnel_summary FROM anon;
REVOKE ALL ON public.v_source_summary FROM anon;
REVOKE ALL ON public.v_operator_summary FROM anon;
REVOKE ALL ON public.v_daily_leads FROM anon;

-- ─── 8. Klinika bo'yicha round-robin operator taqsimoti ───────────────────────
-- Har bir klinikaning o'z navbat hisoblagichi bo'ladi.
ALTER TABLE public.operator_rr_counter
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Eski yagona-qator cheklovini olib tashlab, klinika bo'yicha qatorga o'tamiz.
DO $$
DECLARE
  default_clinic uuid;
BEGIN
  SELECT id INTO default_clinic FROM public.clinics WHERE slug = 'default';
  ALTER TABLE public.operator_rr_counter DROP CONSTRAINT IF EXISTS single_row;
  UPDATE public.operator_rr_counter SET clinic_id = default_clinic WHERE clinic_id IS NULL;
END $$;

DELETE FROM public.operator_rr_counter WHERE clinic_id IS NULL;
ALTER TABLE public.operator_rr_counter ALTER COLUMN clinic_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rr_counter_clinic ON public.operator_rr_counter(clinic_id);

-- Klinika beriladigan yangi get_next_operator.
CREATE OR REPLACE FUNCTION public.get_next_operator(p_clinic_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_op uuid;
  op_count int;
  current_idx bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('assign_operator_' || p_clinic_id::text));

  SELECT COUNT(*) INTO op_count
  FROM operators WHERE is_active = true AND clinic_id = p_clinic_id;
  IF op_count = 0 THEN RETURN NULL; END IF;

  INSERT INTO operator_rr_counter (clinic_id, counter)
  VALUES (p_clinic_id, 0)
  ON CONFLICT (clinic_id) DO NOTHING;

  UPDATE operator_rr_counter
  SET counter = counter + 1
  WHERE clinic_id = p_clinic_id
  RETURNING counter - 1 INTO current_idx;

  SELECT id INTO next_op
  FROM operators
  WHERE is_active = true AND clinic_id = p_clinic_id
  ORDER BY created_at ASC, full_name ASC
  LIMIT 1
  OFFSET (current_idx % op_count);

  RETURN next_op;
END;
$$;

REVOKE ALL ON FUNCTION public.get_next_operator(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_operator(uuid) TO service_role;

-- Eski parametrsiz get_next_operator() — endi standart klinika uchun ishlaydi
-- (orqaga moslik; yangi kod p_clinic_id beruvchi variantni chaqirishi kerak).
CREATE OR REPLACE FUNCTION public.get_next_operator()
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  default_clinic uuid;
BEGIN
  SELECT id INTO default_clinic FROM clinics WHERE slug = 'default';
  RETURN public.get_next_operator(default_clinic);
END;
$$;

-- ─── 9. Takroriy telefon tekshiruvi klinika bo'yicha ──────────────────────────
-- Avval bu trigger raqamni butun bazada qidirardi; multi-tenant'da bu turli
-- klinikalarning bir xil raqamli lidlarini noto'g'ri birlashtirardi. Endi
-- takroriylik faqat bitta klinika ichida tekshiriladi.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_phone()
RETURNS TRIGGER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  IF NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO existing_id
  FROM leads
  WHERE phone = NEW.phone
    AND clinic_id = NEW.clinic_id
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE leads
    SET notes = COALESCE(notes, '') ||
                E'\n[Qayta murojaat: ' || to_char(NOW() AT TIME ZONE 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') || ']' ||
                CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != ''
                     THEN ' — ' || NEW.notes
                     ELSE ''
                END,
        updated_at = NOW()
    WHERE id = existing_id;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
