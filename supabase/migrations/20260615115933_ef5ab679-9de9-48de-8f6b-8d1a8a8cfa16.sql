-- 1. Yangi status qiymati
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'qayta_qongiroq' BEFORE 'konsultatsiyaga_yozildi';

-- 2. Yangi kolonkalar
DO $$ BEGIN
  CREATE TYPE clinic_visit AS ENUM ('ha','yoq','bilmayman');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS can_visit_clinic clinic_visit,
  ADD COLUMN IF NOT EXISTS campaign_name text;

-- 3. Triggerlarni yaratamiz (funksiyalar bor, lekin triggerlar yo'q edi)
DROP TRIGGER IF EXISTS trg_assign_operator ON public.leads;
CREATE TRIGGER trg_assign_operator
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.assign_operator_if_null();

DROP TRIGGER IF EXISTS trg_log_status ON public.leads;
CREATE TRIGGER trg_log_status
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change();