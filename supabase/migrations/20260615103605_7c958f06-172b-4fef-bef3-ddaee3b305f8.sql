
-- Operatorlar
create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  telegram_chat_id text,
  is_active boolean default true,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.operators to anon, authenticated;
grant all on public.operators to service_role;

insert into public.operators (full_name)
select x.name from (values ('Dilnoza'),('Taxmina'),('Ezoza')) as x(name)
where not exists (select 1 from public.operators);

-- Enum turlari
do $$ begin
  create type lead_status as enum (
    'yangi','boglanildi','qiziqdi','uchrashuvga_yozildi',
    'keldi','kelmadi','mijozga_aylandi','yoqotildi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_source as enum ('facebook','instagram','website','boshqa');
exception when duplicate_object then null; end $$;

-- Asosiy leads jadvali
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  full_name text not null,
  phone text,
  source lead_source not null default 'boshqa',
  source_detail text,
  service_interest text,
  status lead_status not null default 'yangi',
  assigned_to uuid references public.operators(id),
  notes text,
  next_followup_date date,
  last_contact_at timestamptz
);

grant select, insert, update, delete on public.leads to anon, authenticated;
grant all on public.leads to service_role;

create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_assigned on public.leads(assigned_to);
create index if not exists idx_leads_created on public.leads(created_at);

-- Status tarixi
create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  old_status lead_status,
  new_status lead_status not null,
  changed_by uuid references public.operators(id),
  changed_at timestamptz default now()
);

grant select, insert, update, delete on public.lead_status_history to anon, authenticated;
grant all on public.lead_status_history to service_role;

create or replace function public.log_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.lead_status_history (lead_id, old_status, new_status, changed_at)
    values (new.id, old.status, new.status, now());
  end if;
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_status_change on public.leads;
create trigger trg_status_change
before update on public.leads
for each row execute function public.log_status_change();

-- Hisobot view'lari
create or replace view public.v_funnel_summary as
select status, count(*) as total from public.leads group by status;

create or replace view public.v_source_summary as
select source, count(*) as total,
  count(*) filter (where status = 'mijozga_aylandi') as converted
from public.leads group by source;

create or replace view public.v_operator_summary as
select o.full_name,
  count(l.id) as total_leads,
  count(l.id) filter (where l.status = 'mijozga_aylandi') as converted,
  round(100.0 * count(l.id) filter (where l.status = 'mijozga_aylandi')
    / nullif(count(l.id),0), 1) as conversion_rate
from public.operators o left join public.leads l on l.assigned_to = o.id
group by o.full_name;

create or replace view public.v_daily_leads as
select date(created_at) as day, source, count(*) as total
from public.leads group by date(created_at), source order by day;

grant select on public.v_funnel_summary, public.v_source_summary, public.v_operator_summary, public.v_daily_leads to anon, authenticated;

-- Round-robin: eng kam lidi bor faol operator
create or replace function public.get_next_operator()
returns uuid
language plpgsql
set search_path = public
as $$
declare next_op uuid;
begin
  select o.id into next_op from public.operators o
  where o.is_active = true
  order by (select count(*) from public.leads l where l.assigned_to = o.id) asc, o.full_name
  limit 1;
  return next_op;
end; $$;

-- Hozircha login yo'q: RLS o'chirilgan (keyin yoqamiz)
alter table public.operators disable row level security;
alter table public.leads disable row level security;
alter table public.lead_status_history disable row level security;
