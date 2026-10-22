create table if not exists owner_customer_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Feedback' check (type in ('Feedback','Delivery','Refund','Product quality')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  status text not null default 'Open' check (status in ('Open','In review','Resolved')),
  owner text not null default 'Unassigned',
  next text not null default 'Investigate and reply',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table owner_customer_issues enable row level security;

policy 'Owners can CRUD their customer issues'
on owner_customer_issues for all to authenticated
using (
  exists (
    select 1 from public.owner_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

grant all on owner_customer_issues to authenticated;
revoke all on owner_customer_issues from anon;

create or replace function touch_owner_customer_issues_updated_at()
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

create trigger owner_customer_issues_touch_updated_at
before update on owner_customer_issues
for each row execute function touch_owner_customer_issues_updated_at();
