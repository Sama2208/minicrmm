-- Facebook Instant Form savollariga berilgan javoblarni lid bilan birga saqlash.
-- Bu ma'lumotlar leads jadvalidagi clinic-scoped RLS orqali himoyalanadi.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS facebook_field_data jsonb;

COMMENT ON COLUMN public.leads.facebook_field_data IS
  'Facebook Instant Form savol-javoblari: [{question, answer}]';

-- Oldin kelgan leadlar uchun webhook eventlarida saqlangan javoblarni tiklash.
UPDATE public.leads AS leads
SET facebook_field_data = events.raw_payload -> 'field_data'
FROM public.facebook_lead_events AS events
WHERE events.lead_id = leads.id
  AND leads.facebook_field_data IS NULL
  AND jsonb_typeof(events.raw_payload -> 'field_data') = 'array';

-- Old parser `Facebook lid` deb qo'ygan lidlarning asosiy maydonlarini ham
-- avvalgi webhook javoblaridan tiklash.
WITH field_rows AS (
  SELECT
    events.lead_id,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(field->>'name', '')), '[!?():,.;_-]+', ' ', 'g'),
      '[[:space:]]+', ' ', 'g'
    )) AS field_key,
    nullif(trim(field->'values'->>0), '') AS field_value
  FROM public.facebook_lead_events AS events
  CROSS JOIN LATERAL jsonb_array_elements(
    coalesce(events.raw_payload -> 'field_data', '[]'::jsonb)
  ) AS fields(field)
  WHERE events.lead_id IS NOT NULL
), mapped AS (
  SELECT
    lead_id,
    coalesce(
      max(field_value) FILTER (WHERE field_key IN ('full name', 'полное имя')),
      max(field_value) FILTER (
        WHERE field_key LIKE 'ism%'
           OR field_key LIKE 'исм%'
           OR field_key LIKE '% имя'
           OR field_key LIKE 'имя%'
      )
    ) AS full_name,
    coalesce(
      max(field_value) FILTER (
        WHERE field_key LIKE '%ishlaydigan%'
           OR field_key LIKE '%ишлайдиган%'
           OR field_key LIKE '%working phone%'
           OR field_key LIKE '%telefon raqam%'
           OR field_key LIKE '%телефон рақам%'
      ),
      max(field_value) FILTER (
        WHERE field_key IN ('номер телефона', 'phone number')
           OR field_key LIKE '%tekshir%'
           OR field_key LIKE '%текшир%'
           OR field_key LIKE '%contact information%'
           OR field_key LIKE '%контактная информация%'
      ),
      max(field_value) FILTER (
        WHERE field_key LIKE '%telefon%'
           OR field_key LIKE '%телефон%'
           OR field_key LIKE '%raqam%'
           OR field_key LIKE '%рақам%'
           OR field_key LIKE '%phone%'
           OR field_key LIKE '%номер%'
      )
    ) AS phone,
    max(field_value) FILTER (
      WHERE field_key IN ('номер телефона', 'phone number')
         OR field_key LIKE '%tekshir%'
         OR field_key LIKE '%текшир%'
         OR field_key LIKE '%contact information%'
         OR field_key LIKE '%контактная информация%'
    ) AS secondary_phone,
    max(field_value) FILTER (
      WHERE field_key LIKE '%ogriq%'
         OR field_key LIKE '%оғриқ%'
         OR field_key LIKE '%qismi%'
         OR field_key LIKE '%қисми%'
         OR field_key LIKE '%tanangiz%'
         OR field_key LIKE '%танангиз%'
         OR field_key LIKE '%pain%'
         OR field_key LIKE '%боль%'
    ) AS problem_type
  FROM field_rows
  GROUP BY lead_id
)
UPDATE public.leads AS leads
SET
  full_name = CASE
    WHEN leads.full_name IS NULL OR leads.full_name = 'Facebook lid'
      THEN coalesce(mapped.full_name, leads.full_name)
    ELSE leads.full_name
  END,
  phone = coalesce(leads.phone, mapped.phone),
  nomer_asosiy = coalesce(leads.nomer_asosiy, mapped.secondary_phone),
  problem_type = coalesce(leads.problem_type, mapped.problem_type)
FROM mapped
WHERE mapped.lead_id = leads.id
  AND leads.source = 'facebook';
