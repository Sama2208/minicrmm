
CREATE OR REPLACE FUNCTION public.get_next_operator()
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  next_op uuid;
begin
  -- Serialize concurrent assignments so simultaneous inserts can't pick the same operator
  perform pg_advisory_xact_lock(hashtext('assign_operator'));

  select o.id into next_op
  from public.operators o
  where o.is_active = true
  order by
    (select count(*) from public.leads l where l.assigned_to = o.id) asc,
    o.created_at asc,
    o.full_name asc
  limit 1;

  return next_op;
end;
$function$;
