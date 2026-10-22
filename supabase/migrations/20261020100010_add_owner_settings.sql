create table if not exists owner_settings (
  key text primary key,
  value boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table owner_settings enable row level security;

policy 'Owners can CRUD their settings'
on owner_settings for all to authenticated
using (
  exists (
    select 1 from public.owner_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

grant all on owner_settings to authenticated;
revoke all on owner_settings from anon;

insert into owner_settings (key, value) values 
  ('releaseAlerts', true), 
  ('weeklyDigest', true), 
  ('decisionReminders', true)
on conflict (key) do nothing;

create or replace function touch_owner_settings_updated_at()
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

create trigger owner_settings_touch_updated_at
before update on owner_settings
for each row execute function touch_owner_settings_updated_at();
