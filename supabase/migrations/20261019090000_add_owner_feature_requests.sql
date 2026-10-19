create table if not exists public.owner_feature_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 160),
  description text not null default '' check (length(description) <= 4000),
  target_platform text not null check (target_platform in ('whole_panel', 'technology', 'finance', 'marketing')),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'in_progress', 'shipped', 'declined')),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.owner_feature_requests enable row level security;

create policy "Active owners read feature requests"
on public.owner_feature_requests for select to authenticated
using (
  exists (
    select 1 from public.owner_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and 'governance.read' = any(m.capabilities)
  )
);

create policy "Technology owner creates feature requests"
on public.owner_feature_requests for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.owner_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and 'technology.manage' = any(m.capabilities)
  )
);

create policy "Technology owner updates feature requests"
on public.owner_feature_requests for update to authenticated
using (
  exists (
    select 1 from public.owner_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and 'technology.manage' = any(m.capabilities)
  )
)
with check (
  exists (
    select 1 from public.owner_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and 'technology.manage' = any(m.capabilities)
  )
);

create policy "No owner feature request deletes"
on public.owner_feature_requests for delete to authenticated
using (false);

grant select, insert, update on public.owner_feature_requests to authenticated;
revoke all on public.owner_feature_requests from anon;

create or replace function public.touch_owner_feature_request_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end;
$$;

create trigger owner_feature_requests_touch_updated_at
before update on public.owner_feature_requests
for each row execute function public.touch_owner_feature_request_updated_at();
