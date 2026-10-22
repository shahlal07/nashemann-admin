create table if not exists owner_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stage text not null default 'Planned' check (stage in ('Planned','In progress','Needs attention','Complete')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  owner text not null default 'Unassigned',
  next text not null default 'Define the next action',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table owner_vendors enable row level security;

policy 'Owners can CRUD their vendors'
on owner_vendors for all to authenticated
using (
  exists (
    select 1 from public.owner_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

grant all on owner_vendors to authenticated;
revoke all on owner_vendors from anon;

create or replace function touch_owner_vendors_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as \
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end;
;

create trigger owner_vendors_touch_updated_at
before update on owner_vendors
for each row execute function touch_owner_vendors_updated_at();
