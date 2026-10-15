-- Co-Founder workspace foundation.
-- Apply only after review in the normal migration/release process.
-- This file is NOT applied to the connected production database by this commit.

create table if not exists public.owner_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  responsibilities text[] not null default '{}'::text[],
  capabilities text[] not null default '{}'::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_memberships_responsibilities_allowed check (
    responsibilities <@ array[
      'shared_governance',
      'finance_governance',
      'product_technology',
      'business_strategy',
      'operations'
    ]::text[]
  ),
  constraint owner_memberships_capabilities_allowed check (
    capabilities <@ array[
      'workspace.read',
      'governance.read',
      'governance.manage',
      'approvals.read',
      'approvals.review',
      'finance.read',
      'finance.manage',
      'technology.read',
      'technology.manage',
      'strategy.read',
      'strategy.manage',
      'members.manage',
      'audit.read'
    ]::text[]
  )
);

comment on table public.owner_memberships is
  'Explicit Co-Founder workspace membership and capabilities. Separate from staff_profiles; does not grant Super Admin or vendor-staff access.';
comment on column public.owner_memberships.capabilities is
  'Server/database-enforced capability keys. Membership is inactive by default; only Super Admin may provision or change memberships.';
comment on column public.owner_memberships.status is
  'Pending by default. Only an authorized Super Admin can activate or suspend a membership.';

create index if not exists owner_memberships_status_idx
  on public.owner_memberships(status);

alter table public.owner_memberships enable row level security;

drop policy if exists owner_memberships_select_self_or_super_admin
  on public.owner_memberships;
create policy owner_memberships_select_self_or_super_admin
  on public.owner_memberships
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_super_admin());

drop policy if exists owner_memberships_insert_super_admin
  on public.owner_memberships;
create policy owner_memberships_insert_super_admin
  on public.owner_memberships
  for insert
  to authenticated
  with check (public.is_super_admin());

drop policy if exists owner_memberships_update_super_admin
  on public.owner_memberships;
create policy owner_memberships_update_super_admin
  on public.owner_memberships
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists owner_memberships_delete_super_admin
  on public.owner_memberships;
create policy owner_memberships_delete_super_admin
  on public.owner_memberships
  for delete
  to authenticated
  using (public.is_super_admin());

grant select, insert, update, delete on public.owner_memberships to authenticated;

-- Keep a durable history of founder access changes. The log is append-only for
-- application users; writes occur only through this SECURITY DEFINER trigger.
create table if not exists public.owner_membership_audit (
  id bigint generated always as identity primary key,
  target_user_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_record jsonb,
  new_record jsonb,
  created_at timestamptz not null default now()
);

comment on table public.owner_membership_audit is
  'Append-only audit trail for founder membership creation, permission changes, activation, suspension, and deletion.';

create index if not exists owner_membership_audit_target_created_idx
  on public.owner_membership_audit(target_user_id, created_at desc);

alter table public.owner_membership_audit enable row level security;

drop policy if exists owner_membership_audit_read_authorized
  on public.owner_membership_audit;
create policy owner_membership_audit_read_authorized
  on public.owner_membership_audit
  for select
  to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1
      from public.owner_memberships membership
      where membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.capabilities @> array['audit.read']::text[]
    )
  );

grant select on public.owner_membership_audit to authenticated;
revoke insert, update, delete on public.owner_membership_audit from anon, authenticated;

create or replace function public.log_owner_membership_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.owner_membership_audit (
      target_user_id, actor_user_id, action, old_record, new_record
    ) values (
      new.user_id, auth.uid(), tg_op, null, to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.owner_membership_audit (
      target_user_id, actor_user_id, action, old_record, new_record
    ) values (
      new.user_id, auth.uid(), tg_op, to_jsonb(old), to_jsonb(new)
    );
    return new;
  else
    insert into public.owner_membership_audit (
      target_user_id, actor_user_id, action, old_record, new_record
    ) values (
      old.user_id, auth.uid(), tg_op, to_jsonb(old), null
    );
    return old;
  end if;
end;
$$;

revoke all on function public.log_owner_membership_change() from public, anon, authenticated;

drop trigger if exists owner_membership_audit_trigger on public.owner_memberships;
create trigger owner_membership_audit_trigger
after insert or update or delete on public.owner_memberships
for each row execute function public.log_owner_membership_change();
