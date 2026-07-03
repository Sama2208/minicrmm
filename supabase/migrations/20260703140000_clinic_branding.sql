-- =============================================================================
-- Klinika brandingi (logo + rang)
-- =============================================================================
-- Har bir klinika o'z logotipi va asosiy rangini sozlashi mumkin (yon panel
-- va sarlavhada ko'rinadi). primary_color standart holatda joriy yashil
-- (#059669, Tailwind emerald-600) — mavjud klinikalarning ko'rinishi
-- o'zgarmaydi, faqat o'zi xohlasa keyin o'zgartiradi.
-- =============================================================================

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#059669';

-- my_clinic_status() logo_url/primary_color'ni ham qaytarishi kerak —
-- qaytish turi o'zgargani uchun avval DROP qilinadi.
DROP FUNCTION IF EXISTS public.my_clinic_status();

CREATE FUNCTION public.my_clinic_status()
RETURNS TABLE (
  clinic_id uuid,
  clinic_name text,
  is_active boolean,
  subscription_status text,
  subscription_current_period_end timestamptz,
  plan_name text,
  logo_url text,
  primary_color text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.is_active, c.subscription_status,
         c.subscription_current_period_end, p.name, c.logo_url, c.primary_color
  FROM public.user_roles ur
  JOIN public.clinics c ON c.id = ur.clinic_id
  LEFT JOIN public.plans p ON p.id = c.plan_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_clinic_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_clinic_status() TO authenticated, service_role;
