-- ============================================================
-- CLINIC OS — FAZA 1: FUNDAMENT (Identity + RBAC + Audit)
-- ============================================================
-- Mavjud CRM sxemasini BUZMAYDI. Yangi jadvallar qo'shadi.
-- Eski operators/user_roles/has_role ishlashda davom etadi.
-- Idempotent: qayta ishga tushirsa xato bermaydi.
-- ============================================================

-- ---------- 0. Extensions ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. CLINICS jadvaliga yangi ustunlar (mavjud jadval evolyutsiyasi)
-- ============================================================
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS timezone    text NOT NULL DEFAULT 'Asia/Tashkent',
  ADD COLUMN IF NOT EXISTS currency    text NOT NULL DEFAULT 'UZS',
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- ============================================================
-- 2. USERS jadvali (yangi — auth.users bilan bog'langan)
-- operators jadvali eski CRM uchun saqlanadi; users — yangi ERP uchun.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id),
  email         text NOT NULL,
  full_name     text NOT NULL,
  avatar_url    text,
  phone         text,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('invited','active','disabled')),
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  UNIQUE (clinic_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_clinic ON public.users(clinic_id);

-- ============================================================
-- 3. ROLES jadvali (yangi RBAC — eski app_role enum bilan parallel)
-- clinic_id NULL = system default rol (hamma klinikada ko'rinadi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  uuid REFERENCES public.clinics(id),
  name       text NOT NULL,
  is_system  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- 4. PERMISSIONS katalogi (kod asosida: 'invoice.void', 'patient.read')
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  module      text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. ROLE_PERMISSIONS (rol -> ruxsat bog'lanishi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

-- ============================================================
-- 6. USER_ROLES_V2 — yangi RBAC tizimi uchun (eski user_roles saqlanadi)
-- Eski user_roles: (user_id, role: app_role enum, clinic_id)
-- Yangi: (user_id, role_id -> roles.id, clinic_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles_v2 (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  uuid NOT NULL REFERENCES public.clinics(id),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_v2_user ON public.user_roles_v2(user_id);

-- ============================================================
-- 7. AUDIT_LOG jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid,
  actor_user_id uuid,
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     uuid,
  before_json   jsonb,
  after_json    jsonb,
  ip_address    inet,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity      ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_clinic_date  ON public.audit_log(clinic_id, created_at);

-- ============================================================
-- 8. FUNKSIYALAR
-- ============================================================

-- has_permission: yangi RBAC tizimi orqali ruxsat tekshiradi
-- '*' = hamma ruxsat (admin/director)
CREATE OR REPLACE FUNCTION public.has_permission(p_code text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles_v2 ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions pm ON pm.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND (pm.code = p_code OR pm.code = '*')
  );
$$;

REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated, service_role;

-- current_user_is_admin: '*' ruxsatga ega foydalanuvchi
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_permission('*');
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, service_role;

-- set_updated_at: har UPDATE'da updated_at yangilanadi
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- write_audit: muhim jadvallar uchun audit trigger
CREATE OR REPLACE FUNCTION public.write_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clinic uuid;
  v_entity uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_clinic := (to_jsonb(OLD)->>'clinic_id')::uuid;
    v_entity := (to_jsonb(OLD)->>'id')::uuid;
  ELSE
    v_clinic := (to_jsonb(NEW)->>'clinic_id')::uuid;
    v_entity := (to_jsonb(NEW)->>'id')::uuid;
  END IF;

  INSERT INTO public.audit_log(clinic_id, actor_user_id, action, entity_type,
                               entity_id, before_json, after_json)
  VALUES (
    v_clinic,
    auth.uid(),
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    v_entity,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );

  IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- handle_new_user: yangi auth foydalanuvchi -> public.users + Director roli
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clinic   uuid;
  v_count    int;
  v_director uuid;
BEGIN
  -- Birinchi faol klinikani ol (single-tenant uchun)
  SELECT id INTO v_clinic FROM public.clinics
    WHERE deleted_at IS NULL AND is_active = true
    ORDER BY created_at LIMIT 1;

  IF v_clinic IS NULL THEN
    RETURN NEW;
  END IF;

  -- public.users ga qo'sh
  INSERT INTO public.users (id, clinic_id, email, full_name, status)
  VALUES (
    NEW.id,
    v_clinic,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Birinchi foydalanuvchiga Director roli ber
  SELECT count(*) INTO v_count
    FROM public.users WHERE clinic_id = v_clinic AND deleted_at IS NULL;

  IF v_count = 1 THEN
    SELECT id INTO v_director FROM public.roles
      WHERE name = 'Director' AND is_system = true LIMIT 1;
    IF v_director IS NOT NULL THEN
      INSERT INTO public.user_roles_v2 (clinic_id, user_id, role_id)
      VALUES (v_clinic, NEW.id, v_director)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;

  -- Eski user_roles ga ham qo'sh (backward compat)
  INSERT INTO public.user_roles (clinic_id, user_id, role)
  VALUES (v_clinic, NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 9. TRIGGERLAR
-- ============================================================

-- clinics updated_at
DROP TRIGGER IF EXISTS trg_clinics_updated ON public.clinics;
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- users updated_at
DROP TRIGGER IF EXISTS trg_users_updated ON public.users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- roles updated_at
DROP TRIGGER IF EXISTS trg_roles_updated ON public.roles;
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit triggerlar (yangi jadvallar)
DROP TRIGGER IF EXISTS trg_users_audit ON public.users;
CREATE TRIGGER trg_users_audit AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();

DROP TRIGGER IF EXISTS trg_user_roles_v2_audit ON public.user_roles_v2;
CREATE TRIGGER trg_user_roles_v2_audit AFTER INSERT OR UPDATE OR DELETE ON public.user_roles_v2
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();

DROP TRIGGER IF EXISTS trg_roles_audit ON public.roles;
CREATE TRIGGER trg_roles_audit AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();

-- Yangi auth user -> public.users (eski trigger ham saqlanadi)
DROP TRIGGER IF EXISTS trg_on_auth_user_created_v2 ON auth.users;
CREATE TRIGGER trg_on_auth_user_created_v2 AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 10. RLS (Row Level Security) — YANGI jadvallar uchun
-- Eski jadvallar (leads, operators...) o'z RLS'larini saqlaydi.
-- ============================================================

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users FROM anon;

DROP POLICY IF EXISTS p_users_select ON public.users;
CREATE POLICY p_users_select ON public.users FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_users_update ON public.users;
CREATE POLICY p_users_update ON public.users FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id()
         AND (id = auth.uid() OR public.current_user_is_admin()));

DROP POLICY IF EXISTS p_users_insert ON public.users;
CREATE POLICY p_users_insert ON public.users FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id() AND public.current_user_is_admin());

-- roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_roles_select ON public.roles;
CREATE POLICY p_roles_select ON public.roles FOR SELECT TO authenticated
  USING ((clinic_id = public.current_clinic_id() OR clinic_id IS NULL)
         AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_roles_admin_write ON public.roles;
CREATE POLICY p_roles_admin_write ON public.roles FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id() AND public.current_user_is_admin())
  WITH CHECK (clinic_id = public.current_clinic_id() AND public.current_user_is_admin());

-- permissions (katalog — hamma o'qiydi)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_perms_select ON public.permissions;
CREATE POLICY p_perms_select ON public.permissions FOR SELECT TO authenticated USING (true);

-- role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_role_perms_select ON public.role_permissions;
CREATE POLICY p_role_perms_select ON public.role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_role_perms_admin_write ON public.role_permissions;
CREATE POLICY p_role_perms_admin_write ON public.role_permissions FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- user_roles_v2
ALTER TABLE public.user_roles_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_user_roles_v2_select ON public.user_roles_v2;
CREATE POLICY p_user_roles_v2_select ON public.user_roles_v2 FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS p_user_roles_v2_admin_write ON public.user_roles_v2;
CREATE POLICY p_user_roles_v2_admin_write ON public.user_roles_v2 FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id() AND public.current_user_is_admin())
  WITH CHECK (clinic_id = public.current_clinic_id() AND public.current_user_is_admin());

-- audit_log (faqat admin o'qiydi; yozish trigger orqali)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_audit_select ON public.audit_log;
CREATE POLICY p_audit_select ON public.audit_log FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() AND public.current_user_is_admin());

-- ============================================================
-- 11. SEED — boshlang'ich ma'lumot
-- ============================================================

-- Permission katalogi
INSERT INTO public.permissions (code, module, description) VALUES
  ('*',                 'system',       'Hamma ruxsat (admin/director)'),
  ('user.manage',       'system',       'Foydalanuvchi/rol boshqarish'),
  ('patient.read',      'patients',     'Bemorni korish'),
  ('patient.write',     'patients',     'Bemorni tahrirlash'),
  ('patient.merge',     'patients',     'Bemorlarni birlashtirish'),
  ('appointment.manage','appointments', 'Qabullarni boshqarish'),
  ('invoice.read',      'finance',      'Invoice korish'),
  ('invoice.write',     'finance',      'Invoice yaratish'),
  ('invoice.void',      'finance',      'Invoice bekor qilish'),
  ('payment.record',    'finance',      'Tolov qabul qilish'),
  ('lab.manage',        'lab',          'Laboratoriya boshqarish'),
  ('pharmacy.dispense', 'pharmacy',     'Dori berish'),
  ('inventory.manage',  'inventory',    'Ombor boshqarish'),
  ('payroll.run',       'hr',           'Oylik hisoblash'),
  ('report.view',       'reports',      'Hisobotlarni korish'),
  ('lead.manage',       'growth',       'Lidlarni boshqarish')
ON CONFLICT (code) DO NOTHING;

-- System default rollar (clinic_id = NULL)
INSERT INTO public.roles (clinic_id, name, is_system) VALUES
  (NULL, 'Director',   true),
  (NULL, 'Doctor',     true),
  (NULL, 'Reception',  true),
  (NULL, 'Lab Tech',   true),
  (NULL, 'Accountant', true)
ON CONFLICT DO NOTHING;

-- Director -> '*' (hamma ruxsat)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Director' AND r.is_system = true AND p.code = '*'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Reception -> operatsion ruxsatlar
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Reception' AND r.is_system = true
  AND p.code IN ('patient.read','patient.write','appointment.manage','lead.manage')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Doctor -> klinik ruxsatlar
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Doctor' AND r.is_system = true
  AND p.code IN ('patient.read','patient.write','lab.manage','pharmacy.dispense')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Accountant -> moliya ruxsatlari
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Accountant' AND r.is_system = true
  AND p.code IN ('invoice.read','invoice.write','invoice.void','payment.record','report.view')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Lab Tech -> laboratoriya ruxsatlari
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Lab Tech' AND r.is_system = true
  AND p.code IN ('patient.read','lab.manage')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ============================================================
-- 12. MAVJUD FOYDALANUVCHILARNI YANGI TIZIMGA KO'CHIRISH
-- ============================================================
-- Eski user_roles dagi admin foydalanuvchini yangi users + user_roles_v2 ga
-- qo'shish (agar hali yo'q bo'lsa).
-- Bu faqat mavjud auth.users + user_roles qatorlari uchun ishlaydi.

DO $$
DECLARE
  r RECORD;
  v_email text;
  v_full_name text;
  v_director_role uuid;
  v_reception_role uuid;
BEGIN
  -- Director va Reception rol ID'larini ol
  SELECT id INTO v_director_role FROM public.roles WHERE name = 'Director' AND is_system = true LIMIT 1;
  SELECT id INTO v_reception_role FROM public.roles WHERE name = 'Reception' AND is_system = true LIMIT 1;

  -- Har bir eski user_roles qatori uchun
  FOR r IN
    SELECT ur.user_id, ur.clinic_id, ur.role
    FROM public.user_roles ur
    WHERE ur.user_id IS NOT NULL
  LOOP
    -- auth.users dan email va ismni ol
    SELECT email, COALESCE(raw_user_meta_data->>'full_name', email)
    INTO v_email, v_full_name
    FROM auth.users WHERE id = r.user_id;

    IF v_email IS NOT NULL THEN
      -- public.users ga qo'sh
      INSERT INTO public.users (id, clinic_id, email, full_name, status)
      VALUES (r.user_id, r.clinic_id, v_email, v_full_name, 'active')
      ON CONFLICT (id) DO NOTHING;

      -- Yangi RBAC ga ham qo'sh
      IF r.role = 'admin' AND v_director_role IS NOT NULL THEN
        INSERT INTO public.user_roles_v2 (clinic_id, user_id, role_id)
        VALUES (r.clinic_id, r.user_id, v_director_role)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      ELSIF r.role = 'operator' AND v_reception_role IS NOT NULL THEN
        INSERT INTO public.user_roles_v2 (clinic_id, user_id, role_id)
        VALUES (r.clinic_id, r.user_id, v_reception_role)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- GRANT'lar (service_role uchun to'liq, authenticated uchun RLS orqali)
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;

GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

GRANT SELECT, INSERT ON public.user_roles_v2 TO authenticated;
GRANT ALL ON public.user_roles_v2 TO service_role;

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

-- ============================================================
-- TAYYOR. Keyingi qadam: Supabase SQL Editor'ga nusxalang.
-- Test: 1) Admin kirib has_permission('*') = true tekshiring
--       2) Operator kirib has_permission('invoice.void') = false
--       3) audit_log ga yozuvlar tushganini tekshiring
-- ============================================================
