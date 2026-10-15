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
