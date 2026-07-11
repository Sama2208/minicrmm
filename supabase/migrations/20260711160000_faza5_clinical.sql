-- ============================================================
-- CLINIC OS — FAZA 5: KLINIK MODUL
-- lab_orders, lab_results, radiology_orders, prescriptions
-- ============================================================
-- Idempotent: qayta ishga tushirsa xato bermaydi.
-- ============================================================

-- ============================================================
-- 1. LAB_TESTS (laboratoriya testlar katalogi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  name        text NOT NULL,
  code        text,
  category    text NOT NULL DEFAULT 'blood'
              CHECK (category IN ('blood','urine','stool','swab','biopsy','hormone','genetic','other')),
  price       numeric(12,2) NOT NULL DEFAULT 0,
  turnaround_hours int DEFAULT 24,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, code)
);

CREATE INDEX IF NOT EXISTS idx_lab_tests_clinic ON public.lab_tests(clinic_id);

-- ============================================================
-- 2. LAB_ORDERS (laboratoriya buyurtmalari)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id),
  patient_id    uuid NOT NULL REFERENCES public.patients(id),
  doctor_id     uuid REFERENCES public.doctors(id),
  appointment_id uuid REFERENCES public.appointments(id),
  order_number  text NOT NULL,
  status        text NOT NULL DEFAULT 'ordered'
                CHECK (status IN ('ordered','collected','in_progress','completed','cancelled')),
  priority      text NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('stat','urgent','normal')),
  notes         text,
  ordered_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_clinic ON public.lab_orders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON public.lab_orders(clinic_id, status);

-- ============================================================
-- 3. LAB_RESULTS (laboratoriya natijalari)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  test_id     uuid REFERENCES public.lab_tests(id),
  test_name   text NOT NULL,
  result_value text,
  unit        text,
  ref_range   text,
  is_abnormal boolean DEFAULT false,
  notes       text,
  performed_by uuid REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_order ON public.lab_results(order_id);

-- ============================================================
-- 4. RADIOLOGY_ORDERS (radiologiya buyurtmalari)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.radiology_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id),
  patient_id    uuid NOT NULL REFERENCES public.patients(id),
  doctor_id     uuid REFERENCES public.doctors(id),
  order_number  text NOT NULL,
  modality      text NOT NULL
                CHECK (modality IN ('xray','ultrasound','ct','mri','fluoroscopy','mammography','other')),
  body_part     text NOT NULL,
  status        text NOT NULL DEFAULT 'ordered'
                CHECK (status IN ('ordered','scheduled','in_progress','completed','cancelled')),
  priority      text NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('stat','urgent','normal')),
  findings      text,
  impression    text,
  performed_by  uuid REFERENCES public.users(id),
  reported_by   uuid REFERENCES public.users(id),
  notes         text,
  ordered_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_radiology_orders_clinic ON public.radiology_orders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_patient ON public.radiology_orders(patient_id);

-- ============================================================
-- 5. MEDICATIONS (dorilar katalogi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  name        text NOT NULL,
  generic_name text,
  form        text NOT NULL DEFAULT 'tablet'
              CHECK (form IN ('tablet','capsule','syrup','injection','cream','drops','inhaler','suppository','other')),
  strength    text,
  unit        text DEFAULT 'ta',
  price       numeric(12,2) NOT NULL DEFAULT 0,
  stock_qty   int NOT NULL DEFAULT 0,
  min_stock   int NOT NULL DEFAULT 10,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_clinic ON public.medications(clinic_id);

-- ============================================================
-- 6. PRESCRIPTIONS (retseptlar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id),
  patient_id    uuid NOT NULL REFERENCES public.patients(id),
  doctor_id     uuid NOT NULL REFERENCES public.doctors(id),
  appointment_id uuid REFERENCES public.appointments(id),
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','dispensed','cancelled','expired')),
  notes         text,
  prescribed_at timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic ON public.prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);

-- ============================================================
-- 7. PRESCRIPTION_ITEMS (retsept qatorlari)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_id   uuid REFERENCES public.medications(id),
  medication_name text NOT NULL,
  dosage          text NOT NULL,
  frequency       text NOT NULL,
  duration        text,
  quantity        int NOT NULL DEFAULT 1,
  instructions    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON public.prescription_items(prescription_id);

-- ============================================================
-- 8. LAB ORDER NUMBER GENERATOR
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_lab_order_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_seq int;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '') AS int)
  ), 0) + 1
  INTO v_seq FROM public.lab_orders WHERE clinic_id = p_clinic_id;
  RETURN 'LAB-' || LPAD(v_seq::text, 5, '0');
END;
$$;

-- ============================================================
-- 9. RADIOLOGY ORDER NUMBER GENERATOR
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_rad_order_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_seq int;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '') AS int)
  ), 0) + 1
  INTO v_seq FROM public.radiology_orders WHERE clinic_id = p_clinic_id;
  RETURN 'RAD-' || LPAD(v_seq::text, 5, '0');
END;
$$;

-- ============================================================
-- 10. TRIGGERS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_lab_orders') THEN
    CREATE TRIGGER set_updated_at_lab_orders BEFORE UPDATE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_radiology_orders') THEN
    CREATE TRIGGER set_updated_at_radiology_orders BEFORE UPDATE ON public.radiology_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_medications') THEN
    CREATE TRIGGER set_updated_at_medications BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================================
-- 11. RLS POLICIES
-- ============================================================
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lab_tests_clinic_isolation') THEN
    CREATE POLICY lab_tests_clinic_isolation ON public.lab_tests USING (clinic_id = public.current_clinic_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lab_orders_clinic_isolation') THEN
    CREATE POLICY lab_orders_clinic_isolation ON public.lab_orders USING (clinic_id = public.current_clinic_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lab_results_clinic_isolation') THEN
    CREATE POLICY lab_results_clinic_isolation ON public.lab_results
      USING (order_id IN (SELECT id FROM public.lab_orders WHERE clinic_id = public.current_clinic_id()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'radiology_orders_clinic_isolation') THEN
    CREATE POLICY radiology_orders_clinic_isolation ON public.radiology_orders USING (clinic_id = public.current_clinic_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'medications_clinic_isolation') THEN
    CREATE POLICY medications_clinic_isolation ON public.medications USING (clinic_id = public.current_clinic_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prescriptions_clinic_isolation') THEN
    CREATE POLICY prescriptions_clinic_isolation ON public.prescriptions USING (clinic_id = public.current_clinic_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prescription_items_clinic_isolation') THEN
    CREATE POLICY prescription_items_clinic_isolation ON public.prescription_items
      USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE clinic_id = public.current_clinic_id()));
  END IF;
END $$;

-- ============================================================
-- 12. PERMISSIONS
-- ============================================================
INSERT INTO public.permissions (code, description) VALUES
  ('lab.view',       'Laboratoriya buyurtmalarini ko''rish'),
  ('lab.order',      'Laboratoriya buyurtma berish'),
  ('lab.result',     'Laboratoriya natijalarini kiritish'),
  ('radiology.view', 'Radiologiya buyurtmalarini ko''rish'),
  ('radiology.order','Radiologiya buyurtma berish'),
  ('radiology.report','Radiologiya hisobotini kiritish'),
  ('pharmacy.view',  'Dorixona / retseptlarni ko''rish'),
  ('pharmacy.prescribe','Retsept yozish'),
  ('pharmacy.dispense','Dori berish'),
  ('medication.manage','Dorilar katalogini boshqarish')
ON CONFLICT (code) DO NOTHING;

-- Director — hamma
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.slug = 'director'
  AND p.code IN ('lab.view','lab.order','lab.result','radiology.view','radiology.order',
                 'radiology.report','pharmacy.view','pharmacy.prescribe','pharmacy.dispense','medication.manage')
ON CONFLICT DO NOTHING;

-- Doctor — lab/rad order + pharmacy prescribe + view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.slug = 'doctor'
  AND p.code IN ('lab.view','lab.order','radiology.view','radiology.order','pharmacy.view','pharmacy.prescribe')
ON CONFLICT DO NOTHING;

-- Lab tech — lab view + result
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.slug = 'lab_tech'
  AND p.code IN ('lab.view','lab.result')
ON CONFLICT DO NOTHING;

-- Reception — view only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.slug = 'reception'
  AND p.code IN ('lab.view','radiology.view','pharmacy.view')
ON CONFLICT DO NOTHING;
