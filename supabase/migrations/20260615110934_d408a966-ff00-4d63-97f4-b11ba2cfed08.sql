-- 1. Rollar uchun jadval va enum
do $$ begin
  create type app_role as enum ('admin','operator');
exception when duplicate_object then null; end $$;

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

-- 2. Operator login'ini operator yozuviga bog'lash uchun ustun
alter table operators add column if not exists user_id uuid references auth.users(id);

-- 3. Yordamchi funksiyalar (security definer — RLS rekursiyasini oldini oladi)
create or replace function has_role(_role text)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists(
    select 1 from user_roles
    where user_id = auth.uid() and role = _role::app_role
  );
$$;

create or replace function current_operator_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select id from operators where user_id = auth.uid() limit 1;
$$;

-- 4. Status tarixini yozadigan funksiya RLS'ni chetlab o'tsin
create or replace function log_status_change()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into lead_status_history (lead_id, old_status, new_status, changed_at)
    values (new.id, old.status, new.status, now());
  end if;
  new.updated_at = now();
  return new;
end; $$;

-- 5. RLS'ni yoqamiz va qoidalarni o'rnatamiz
alter table leads enable row level security;
alter table operators enable row level security;
alter table user_roles enable row level security;
alter table lead_status_history enable row level security;

drop policy if exists leads_admin_all on leads;
create policy leads_admin_all on leads for all
  using (has_role('admin')) with check (has_role('admin'));

drop policy if exists leads_operator_select on leads;
create policy leads_operator_select on leads for select
  using (assigned_to = current_operator_id());

drop policy if exists leads_operator_update on leads;
create policy leads_operator_update on leads for update
  using (assigned_to = current_operator_id())
  with check (assigned_to = current_operator_id());

drop policy if exists operators_read on operators;
create policy operators_read on operators for select
  using (auth.uid() is not null);

drop policy if exists operators_admin_write on operators;
create policy operators_admin_write on operators for all
  using (has_role('admin')) with check (has_role('admin'));

drop policy if exists roles_self_read on user_roles;
create policy roles_self_read on user_roles for select
  using (user_id = auth.uid());

drop policy if exists roles_admin_all on user_roles;
create policy roles_admin_all on user_roles for all
  using (has_role('admin')) with check (has_role('admin'));

drop policy if exists history_admin on lead_status_history;
create policy history_admin on lead_status_history for select
  using (has_role('admin'));

drop policy if exists history_operator on lead_status_history;
create policy history_operator on lead_status_history for select
  using (lead_id in (select id from leads where assigned_to = current_operator_id()));
