-- Har bir Facebook Lead Ads formasining savollarini CRM kartochkasi
-- maydonlariga bir marta bog'lash uchun sozlama.
-- Masalan: {"region":"qaysi_viloyatda_istiqomat_qilasiz?"}

ALTER TABLE public.facebook_lead_forms
  ADD COLUMN IF NOT EXISTS field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facebook_lead_forms_field_mapping_object'
      AND conrelid = 'public.facebook_lead_forms'::regclass
  ) THEN
    ALTER TABLE public.facebook_lead_forms
      ADD CONSTRAINT facebook_lead_forms_field_mapping_object
      CHECK (jsonb_typeof(field_mapping) = 'object');
  END IF;
END $$;

COMMENT ON COLUMN public.facebook_lead_forms.field_mapping IS
  'Forma savoli (Meta field_data.name) dan CRM lid maydoniga bog''lash qoidalari.';
