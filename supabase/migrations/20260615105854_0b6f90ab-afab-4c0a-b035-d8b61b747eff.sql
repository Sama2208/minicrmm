-- 1. Drop dependent views
drop view if exists v_funnel_summary;
drop view if exists v_source_summary;
drop view if exists v_operator_summary;
drop view if exists v_daily_leads;

-- 2. Clean old test data
truncate lead_status_history, leads restart identity cascade;

-- 3. Rename / add columns
alter table leads rename column service_interest to problem_type;
alter table leads add column if not exists region text;
alter table leads add column if not exists appointment_date date;

-- 4. Replace status enum
alter table leads alter column status drop default;
alter table leads alter column status type text;
alter table lead_status_history alter column old_status type text;
alter table lead_status_history alter column new_status type text;

drop type if exists lead_status;
create type lead_status as enum (
  'yangi',
  'kotarmadi',
  'konsultatsiyaga_yozildi',
  'konsultatsiyada_boldi',
  'yotishga_yozildi',
  'sifatsiz_lid'
);

alter table leads alter column status type lead_status using status::lead_status;
alter table leads alter column status set default 'yangi';
alter table lead_status_history
  alter column old_status type lead_status using nullif(old_status,'')::lead_status;
alter table lead_status_history
  alter column new_status type lead_status using new_status::lead_status;

-- 5. Auto round-robin assignment trigger
create or replace function assign_operator_if_null()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assigned_to is null then
    new.assigned_to := get_next_operator();
  end if;
  return new;
end; $$;

drop trigger if exists trg_assign_operator on leads;
create trigger trg_assign_operator
before insert on leads
for each row execute function assign_operator_if_null();

-- Re-create status history trigger (was dropped via cascade? ensure exists)
drop trigger if exists trg_log_status_change on leads;
create trigger trg_log_status_change
before update on leads
for each row execute function log_status_change();

-- 6. Recreate report views
create or replace view v_funnel_summary as
select status, count(*) as total from leads group by status;

create or replace view v_source_summary as
select source, count(*) as total,
  count(*) filter (where status = 'yotishga_yozildi') as converted
from leads group by source;

create or replace view v_operator_summary as
select o.full_name,
  count(l.id) as total_leads,
  count(l.id) filter (where l.status = 'yotishga_yozildi') as converted,
  round(100.0 * count(l.id) filter (where l.status = 'yotishga_yozildi')
    / nullif(count(l.id),0), 1) as conversion_rate
from operators o left join leads l on l.assigned_to = o.id
group by o.full_name;

create or replace view v_daily_leads as
select date(created_at) as day, source, count(*) as total
from leads group by date(created_at), source order by day;

-- 7. Seed realistic sample leads
insert into leads (full_name, phone, region, problem_type, source, status) values
('Akmal Tursunov', '+998901234567', 'Toshkent', 'Bolada nutq kechikishi', 'instagram', 'yangi'),
('Mavluda Rahimova', '+998935554433', 'Samarqand', 'Insultdan keyin reabilitatsiya', 'facebook', 'konsultatsiyaga_yozildi'),
('Sherzod Karimov', '+998971112233', 'Farg''ona', 'Bosh og''rig''i va migren', 'website', 'yotishga_yozildi');
