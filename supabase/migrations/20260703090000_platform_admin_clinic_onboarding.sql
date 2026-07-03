-- =============================================================================
-- Platforma admini va klinika onboarding
-- =============================================================================
-- Yangi klinika (tenant) qo'shish — bu cross-tenant amal, hech qanday
-- clinic_id RLS siyosati bunga ruxsat bermaydi. Shuning uchun bu ishni faqat
-- "platforma egasi" (SaaS'ni boshqaruvchi shaxs) qila oladi, service_role
-- orqali serverda.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Jadval faqat service_role uchun — client to'g'ridan-to'g'ri o'qiy olmaydi,
-- tekshiruv faqat is_platform_admin() orqali amalga oshadi.
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_admins FROM anon, authenticated;
GRANT ALL ON public.platform_admins TO service_role;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- Loyihaning joriy egasini birinchi platforma admini sifatida belgilaymiz.
INSERT INTO public.platform_admins (user_id)
VALUES ('beafe6df-cf07-4b78-9e63-a4130c9a9311')
ON CONFLICT (user_id) DO NOTHING;
