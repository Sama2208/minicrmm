-- ============================================================
-- CLINIC OS — FAZA 4: MOLIYA MODULI
-- services, invoices, invoice_items, payments, expenses
-- ============================================================
-- Idempotent: qayta ishga tushirsa xato bermaydi.
-- ============================================================

-- ============================================================
-- 1. SERVICES (xizmatlar katalogi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  name        text NOT NULL,
  code        text,
  category    text NOT NULL DEFAULT 'consultation'
              CHECK (category IN ('consultation','procedure','lab','imaging','pharmacy','surgery','other')),
  price       numeric(12,2) NOT NULL DEFAULT 0,
  duration_min int,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  UNIQUE (clinic_id, code)
);

CREATE INDEX IF NOT EXISTS idx_services_clinic ON public.services(clinic_id);

-- ============================================================
-- 2. INVOICES (hisob-fakturalar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id),
  invoice_number text NOT NULL,
  patient_id    uuid NOT NULL REFERENCES public.patients(id),
  doctor_id     uuid REFERENCES public.doctors(id),
  appointment_id uuid REFERENCES public.appointments(id),
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','pending','paid','partial','overdue','cancelled','voided')),
  subtotal      numeric(12,2) NOT NULL DEFAULT 0,
  discount      numeric(12,2) NOT NULL DEFAULT 0,
  tax           numeric(12,2) NOT NULL DEFAULT 0,
  total         numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount   numeric(12,2) NOT NULL DEFAULT 0,
  notes         text,
  due_date      date,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  UNIQUE (clinic_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic ON public.invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(clinic_id, status);

-- ============================================================
-- 3. INVOICE_ITEMS (faktura qatorlari)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_id  uuid REFERENCES public.services(id),
  description text NOT NULL,
  quantity    int NOT NULL DEFAULT 1,
  unit_price  numeric(12,2) NOT NULL DEFAULT 0,
  discount    numeric(12,2) NOT NULL DEFAULT 0,
  total       numeric(12,2) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ============================================================
-- 4. PAYMENTS (to'lovlar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id),
  invoice_id    uuid NOT NULL REFERENCES public.invoices(id),
  patient_id    uuid NOT NULL REFERENCES public.patients(id),
  amount        numeric(12,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash'
                CHECK (payment_method IN ('cash','card','transfer','insurance','other')),
  reference     text,
  notes         text,
  received_by   uuid REFERENCES public.users(id),
  paid_at       timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_clinic ON public.payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON public.payments(patient_id);

-- ============================================================
-- 5. EXPENSES (xarajatlar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  category    text NOT NULL DEFAULT 'other'
              CHECK (category IN ('rent','salary','equipment','supplies','utilities','marketing','maintenance','other')),
  description text NOT NULL,
  amount      numeric(12,2) NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor      text,
  receipt_url text,
  notes       text,
  created_by  uuid REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_expenses_clinic ON public.expenses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(clinic_id, expense_date);

-- ============================================================
-- 6. INVOICE NUMBER GENERATOR
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq int;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '') AS int)
  ), 0) + 1
  INTO v_seq
  FROM public.invoices
  WHERE clinic_id = p_clinic_id;

  RETURN 'INV-' || LPAD(v_seq::text, 5, '0');
END;
$$;

-- ============================================================
-- 7. UPDATE INVOICE TOTALS AFTER ITEM CHANGES
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  UPDATE public.invoices
  SET subtotal = sub.total,
      total = sub.total - invoices.discount + invoices.tax,
      updated_at = now()
  FROM (
    SELECT invoice_id, COALESCE(SUM(total), 0) AS total
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id
    GROUP BY invoice_id
  ) sub
  WHERE invoices.id = sub.invoice_id;

  RETURN NULL;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalc_invoice_totals'
  ) THEN
    CREATE TRIGGER trg_recalc_invoice_totals
      AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
      FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_totals();
  END IF;
END $$;

-- ============================================================
-- 8. UPDATE PAID AMOUNT AFTER PAYMENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id uuid;
  v_paid numeric;
  v_total numeric;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.payments
  WHERE invoice_id = v_invoice_id;

  SELECT total INTO v_total
  FROM public.invoices
  WHERE id = v_invoice_id;

  UPDATE public.invoices
  SET paid_amount = v_paid,
      status = CASE
        WHEN v_paid >= v_total THEN 'paid'
        WHEN v_paid > 0 THEN 'partial'
        ELSE status
      END,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_invoice_paid'
  ) THEN
    CREATE TRIGGER trg_update_invoice_paid
      AFTER INSERT OR UPDATE OR DELETE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.update_invoice_paid();
  END IF;
END $$;

-- ============================================================
-- 9. TRIGGERS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_services') THEN
    CREATE TRIGGER set_updated_at_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_invoices') THEN
    CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_expenses') THEN
    CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================================
-- 10. RLS POLICIES
-- ============================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'services_clinic_isolation') THEN
    CREATE POLICY services_clinic_isolation ON public.services USING (clinic_id = public.current_clinic_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoices_clinic_isolation') THEN
    CREATE POLICY invoices_clinic_isolation ON public.invoices USING (clinic_id = public.current_clinic_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoice_items_clinic_isolation') THEN
    CREATE POLICY invoice_items_clinic_isolation ON public.invoice_items
      USING (invoice_id IN (SELECT id FROM public.invoices WHERE clinic_id = public.current_clinic_id()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_clinic_isolation') THEN
    CREATE POLICY payments_clinic_isolation ON public.payments USING (clinic_id = public.current_clinic_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_clinic_isolation') THEN
    CREATE POLICY expenses_clinic_isolation ON public.expenses USING (clinic_id = public.current_clinic_id());
  END IF;
END $$;

-- ============================================================
-- 11. PERMISSIONS
-- ============================================================
INSERT INTO public.permissions (code, description) VALUES
  ('invoice.view',    'Fakturalarni ko''rish'),
  ('invoice.create',  'Faktura yaratish'),
  ('invoice.edit',    'Fakturani tahrirlash'),
  ('invoice.void',    'Fakturani bekor qilish'),
  ('payment.view',    'To''lovlarni ko''rish'),
  ('payment.create',  'To''lov qabul qilish'),
  ('expense.view',    'Xarajatlarni ko''rish'),
  ('expense.create',  'Xarajat kiritish'),
  ('expense.edit',    'Xarajatni tahrirlash'),
  ('service.view',    'Xizmatlar katalogini ko''rish'),
  ('service.manage',  'Xizmatlarni boshqarish')
ON CONFLICT (code) DO NOTHING;

-- Director — barcha moliya permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'director'
  AND p.code IN ('invoice.view','invoice.create','invoice.edit','invoice.void',
                 'payment.view','payment.create','expense.view','expense.create',
                 'expense.edit','service.view','service.manage')
ON CONFLICT DO NOTHING;

-- Accountant — invoice + payment + expense view/create
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'accountant'
  AND p.code IN ('invoice.view','invoice.create','invoice.edit',
                 'payment.view','payment.create','expense.view',
                 'expense.create','expense.edit','service.view')
ON CONFLICT DO NOTHING;

-- Reception — invoice view + payment create
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'reception'
  AND p.code IN ('invoice.view','payment.view','payment.create','service.view')
ON CONFLICT DO NOTHING;

-- Doctor — invoice view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'doctor'
  AND p.code IN ('invoice.view','service.view')
ON CONFLICT DO NOTHING;
