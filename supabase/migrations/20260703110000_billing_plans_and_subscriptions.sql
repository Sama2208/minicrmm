-- =============================================================================
-- Tarif rejalari va obuna holati
-- =============================================================================
-- Narxlar va limitlar HOZIRCHA TAXMINIY — keyinchalik quyidagi kabi UPDATE
-- bilan har qanday vaqtda o'zgartirish mumkin:
--   UPDATE public.plans SET price_monthly = 350000 WHERE slug = 'basic';
--
-- To'lov provayder (Payme/Click/Uzum) webhook integratsiyasi ularning
-- merchant/biznes hisobi va API kalitlarini talab qiladi. Ular bo'lgunga
-- qadar obuna holati platforma admini tomonidan /admin/klinikalar sahifasida
-- qo'lda boshqariladi (mijoz to'lovni P2P/checkout orqali yuboradi, admin
-- shu yerda "Faol" qilib belgilaydi).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  max_operators int, -- NULL = cheksiz
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plans FROM anon;
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
DROP POLICY IF EXISTS plans_read ON public.plans;
CREATE POLICY plans_read ON public.plans FOR SELECT TO authenticated USING (true);

INSERT INTO public.plans (slug, name, price_monthly, max_operators, sort_order)
VALUES
  ('basic', 'Basic', 299000, 3, 1),
  ('pro', 'Pro', 599000, 10, 2),
  ('premium', 'Premium', 990000, NULL, 3)
ON CONFLICT (slug) DO NOTHING;

-- ─── Klinikaga obuna maydonlari ──────────────────────────────────────────────
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_notes text;

ALTER TABLE public.clinics
  ADD CONSTRAINT clinics_subscription_status_check
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled'));

-- Mavjud klinika(lar) — haqiqiy mijoz sifatida cheksiz Premium bilan.
UPDATE public.clinics
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'premium'),
    subscription_status = 'active',
    subscription_current_period_end = NULL,
    subscription_notes = 'Ilk mijoz — muddatsiz.'
WHERE plan_id IS NULL;

ALTER TABLE public.clinics ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE public.clinics ALTER COLUMN subscription_status SET NOT NULL;
ALTER TABLE public.clinics ALTER COLUMN subscription_status SET DEFAULT 'trialing';

-- ─── Klinika holatini ungate qilingan holda o'qish (UI uchun) ────────────────
-- current_clinic_id() faqat "ruxsat bor"da qaytaradi (pastda), shuning uchun
-- bloklangan foydalanuvchi SABABINI ko'rsatish uchun alohida, cheklanmagan
-- funksiya kerak.
CREATE OR REPLACE FUNCTION public.my_clinic_status()
RETURNS TABLE (
  clinic_id uuid,
  clinic_name text,
  is_active boolean,
  subscription_status text,
  subscription_current_period_end timestamptz,
  plan_name text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.is_active, c.subscription_status,
         c.subscription_current_period_end, p.name
  FROM public.user_roles ur
  JOIN public.clinics c ON c.id = ur.clinic_id
  LEFT JOIN public.plans p ON p.id = c.plan_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_clinic_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_clinic_status() TO authenticated, service_role;

-- ─── current_clinic_id(): obuna holatiga qarab kirishni cheklash ─────────────
-- Klinika is_active=false yoki obunasi tugagan bo'lsa, NULL qaytaradi — bu
-- barcha "clinic_id = current_clinic_id()" RLS siyosatlarini avtomatik
-- bloklaydi (butun klinika ma'lumotiga kirish yopiladi).
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.clinic_id
  FROM public.user_roles ur
  JOIN public.clinics c ON c.id = ur.clinic_id
  WHERE ur.user_id = auth.uid()
    AND c.is_active
    AND c.subscription_status IN ('trialing', 'active')
    AND (c.subscription_current_period_end IS NULL
         OR c.subscription_current_period_end > now())
  LIMIT 1;
$$;

-- ─── Tarifga qarab operator sonini cheklash ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_operator_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_ops int;
  current_count int;
BEGIN
  SELECT p.max_operators INTO max_ops
  FROM public.clinics c
  JOIN public.plans p ON p.id = c.plan_id
  WHERE c.id = NEW.clinic_id;

  IF max_ops IS NOT NULL THEN
    SELECT COUNT(*) INTO current_count
    FROM public.operators
    WHERE clinic_id = NEW.clinic_id AND is_active = true;

    IF current_count >= max_ops THEN
      RAISE EXCEPTION 'Operator limiti tugadi (max %). Tarifni yangilang.', max_ops;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_operator_limit ON public.operators;
CREATE TRIGGER trg_enforce_operator_limit
BEFORE INSERT ON public.operators
FOR EACH ROW EXECUTE FUNCTION public.enforce_operator_limit();
