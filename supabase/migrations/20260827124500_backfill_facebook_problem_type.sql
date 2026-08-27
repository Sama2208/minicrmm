-- OA formadagi "Qaysi kasallik sizni bezovta qiladi?" javobini leads.problem_type ga chiqarish.
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
    max(field_value) FILTER (
      WHERE field_key LIKE '%kasallik%'
         OR field_key LIKE '%болезн%'
         OR field_key LIKE '%ogriq%'
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
SET problem_type = coalesce(leads.problem_type, mapped.problem_type)
FROM mapped
WHERE mapped.lead_id = leads.id
  AND leads.source = 'facebook'
  AND leads.problem_type IS NULL;
