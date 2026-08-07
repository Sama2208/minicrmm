-- Leads jadvaliga Facebook page ma'lumotlarini qo'shish
-- Bir klinikada bir nechta Facebook page dan lid olish uchun

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS facebook_page_id   TEXT,
  ADD COLUMN IF NOT EXISTS facebook_page_name TEXT;

COMMENT ON COLUMN public.leads.facebook_page_id   IS 'Facebook Page ID (qaysi page dan kelgan lid)';
COMMENT ON COLUMN public.leads.facebook_page_name IS 'Facebook Page nomi (qaysi page dan kelgan lid)';

CREATE INDEX IF NOT EXISTS idx_leads_facebook_page_id
  ON public.leads (facebook_page_id)
  WHERE facebook_page_id IS NOT NULL;
