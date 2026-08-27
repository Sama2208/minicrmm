-- Facebook formadagi viloyat/manzil javobini leads.region maydoniga chiqarish.
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
      WHERE field_key LIKE '%viloyat%'
         OR field_key LIKE '%вилоят%'
         OR field_key LIKE '%istiqomat%'
         OR field_key LIKE '%истиқомат%'
         OR field_key LIKE '%manzil%'
         OR field_key LIKE '%манзил%'
         OR field_key LIKE '%address%'
         OR field_key LIKE '%область%'
         OR field_key LIKE '%город%'
    ) AS region
  FROM field_rows
  GROUP BY lead_id
)
UPDATE public.leads AS leads
SET region = coalesce(leads.region, mapped.region)
FROM mapped
WHERE mapped.lead_id = leads.id
  AND leads.source = 'facebook'
  AND leads.region IS NULL;
