-- Owner domain isolation and auditable governance records.
-- Requires 2026-10-15_cofounder_workspace_foundation.sql to be applied first.
-- This migration is source only; it is not applied to production by this commit.

alter table public.owner_memberships
  drop constraint if exists owner_memberships_capabilities_allowed;

alter table public.owner_memberships
  add constraint owner_memberships_capabilities_allowed check (
    capabilities <@ array[
      'workspace.read',
      'governance.read',
      'governance.manage',
      'approvals.read',
      'approvals.request',
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
  );

-- SECURITY DEFINER helpers avoid recursive RLS checks on owner_memberships.
-- Both helpers are bound to auth.uid() and cannot inspect another user's scope.
create or replace function public.has_owner_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.owner_memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.capabilities @> array[p_capability]::text[]
  );
$$;

create or replace function public.has_owner_domain_access(p_domain text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_domain = any(array[
      'shared_governance',
      'finance_governance',
      'product_technology',
      'business_strategy',
      'operations'
    ]::text[])
    and exists (
      select 1
      from public.owner_memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.responsibilities @> array[p_domain]::text[]
    );
$$;

revoke all on function public.has_owner_capability(text) from public, anon;
revoke all on function public.has_owner_domain_access(text) from public, anon;
grant execute on function public.has_owner_capability(text) to authenticated;
grant execute on function public.has_owner_domain_access(text) to authenticated;

create table if not exists public.owner_decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 240),
  summary text,
  domain text not null check (domain in (
    'shared_governance', 'finance_governance', 'product_technology',
    'business_strategy', 'operations'
  )),
  status text not null default 'proposed' check (status in (
    'proposed', 'approved', 'rejected', 'archived'
  )),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.owner_decisions is
  'Company decision register, row-scoped by the owner membership domain and governance capabilities.';

alter table public.owner_decisions enable row level security;
drop policy if exists owner_decisions_select_domain on public.owner_decisions;
create policy owner_decisions_select_domain on public.owner_decisions
  for select to authenticated
  using (
    public.has_owner_capability('governance.read')
    and public.has_owner_domain_access(domain)
  );
drop policy if exists owner_decisions_insert_domain on public.owner_decisions;
create policy owner_decisions_insert_domain on public.owner_decisions
  for insert to authenticated
  with check (
    public.has_owner_capability('governance.manage')
    and public.has_owner_domain_access(domain)
    and created_by = auth.uid()
  );
drop policy if exists owner_decisions_update_domain on public.owner_decisions;
create policy owner_decisions_update_domain on public.owner_decisions
  for update to authenticated
  using (
    public.has_owner_capability('governance.manage')
    and public.has_owner_domain_access(domain)
  )
  with check (
    public.has_owner_capability('governance.manage')
    and public.has_owner_domain_access(domain)
  );
revoke all on public.owner_decisions from anon;
grant select, insert, update on public.owner_decisions to authenticated;

create table if not exists public.owner_approvals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 240),
  description text,
  domain text not null check (domain in (
    'shared_governance', 'finance_governance', 'product_technology',
    'business_strategy', 'operations'
  )),
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected'
  )),
  requested_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  decision_reason text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint owner_approvals_reviewer_not_requester check (
    reviewed_by is null or reviewed_by <> requested_by
  ),
  constraint owner_approvals_review_state check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

comment on table public.owner_approvals is
  'Founder approval queue, row-scoped by domain. Requesters cannot review their own requests.';

alter table public.owner_approvals enable row level security;
drop policy if exists owner_approvals_select_domain on public.owner_approvals;
create policy owner_approvals_select_domain on public.owner_approvals
  for select to authenticated
  using (
    public.has_owner_capability('approvals.read')
    and public.has_owner_domain_access(domain)
  );
drop policy if exists owner_approvals_insert_domain on public.owner_approvals;
create policy owner_approvals_insert_domain on public.owner_approvals
  for insert to authenticated
  with check (
    public.has_owner_capability('approvals.request')
    and public.has_owner_domain_access(domain)
    and requested_by = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );
drop policy if exists owner_approvals_review_domain on public.owner_approvals;
create policy owner_approvals_review_domain on public.owner_approvals
  for update to authenticated
  using (
    public.has_owner_capability('approvals.review')
    and public.has_owner_domain_access(domain)
    and requested_by <> auth.uid()
    and status = 'pending'
  )
  with check (
    public.has_owner_capability('approvals.review')
    and public.has_owner_domain_access(domain)
    and requested_by <> auth.uid()
    and reviewed_by = auth.uid()
    and status in ('approved', 'rejected')
  );
revoke all on public.owner_approvals from anon;
grant select, insert, update on public.owner_approvals to authenticated;

create or replace function public.guard_owner_approval_review()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending'
       or new.reviewed_by is not null
       or new.reviewed_at is not null then
      raise exception 'New approval requests must start pending';
    end if;
    return new;
  end if;

  if old.status <> 'pending'
     or new.status not in ('approved', 'rejected')
     or new.requested_by <> old.requested_by
     or new.title <> old.title
     or new.description is distinct from old.description
     or new.domain <> old.domain
     or new.requested_at <> old.requested_at
     or new.reviewed_by <> auth.uid()
     or new.reviewed_at is null
     or new.reviewed_by = new.requested_by then
    raise exception 'Approval reviews may only record a valid decision on a pending request';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.guard_owner_approval_review() from public, anon, authenticated;
drop trigger if exists owner_approvals_guard_trigger on public.owner_approvals;
create trigger owner_approvals_guard_trigger
before insert or update on public.owner_approvals
for each row execute function public.guard_owner_approval_review();

create table if not exists public.owner_governance_audit (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('decision', 'approval')),
  entity_id uuid not null,
  domain text not null check (domain in (
    'shared_governance', 'finance_governance', 'product_technology',
    'business_strategy', 'operations'
  )),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE')),
  old_record jsonb,
  new_record jsonb,
  created_at timestamptz not null default now()
);

alter table public.owner_governance_audit enable row level security;
drop policy if exists owner_governance_audit_read_authorized on public.owner_governance_audit;
create policy owner_governance_audit_read_authorized on public.owner_governance_audit
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.has_owner_capability('audit.read')
      and public.has_owner_domain_access(domain)
    )
  );
revoke all on public.owner_governance_audit from anon, authenticated;
grant select on public.owner_governance_audit to authenticated;

create or replace function public.log_owner_governance_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.owner_governance_audit(entity_type, entity_id, domain, actor_user_id, action, new_record)
    values (case when tg_table_name = 'owner_decisions' then 'decision' else 'approval' end, new.id, new.domain, auth.uid(), tg_op, to_jsonb(new));
    return new;
  end if;

  insert into public.owner_governance_audit(entity_type, entity_id, domain, actor_user_id, action, old_record, new_record)
  values (case when tg_table_name = 'owner_decisions' then 'decision' else 'approval' end, new.id, old.domain, auth.uid(), tg_op, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

revoke all on function public.log_owner_governance_change() from public, anon, authenticated;
drop trigger if exists owner_decisions_audit_trigger on public.owner_decisions;
create trigger owner_decisions_audit_trigger
after insert or update on public.owner_decisions
for each row execute function public.log_owner_governance_change();
drop trigger if exists owner_approvals_audit_trigger on public.owner_approvals;
create trigger owner_approvals_audit_trigger
after insert or update on public.owner_approvals
for each row execute function public.log_owner_governance_change();

create or replace function public.touch_owner_decision_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.domain <> old.domain then
    raise exception 'A decision domain cannot be changed after creation';
  end if;
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists owner_decisions_updated_at_trigger on public.owner_decisions;
create trigger owner_decisions_updated_at_trigger
before update on public.owner_decisions
for each row execute function public.touch_owner_decision_updated_at();


-- Existing platform finance data remains the source of truth. These policies
-- expose it only to active owners with both the finance capability and domain.
drop policy if exists owner_finance_read_settlements on public.settlements;
create policy owner_finance_read_settlements
  on public.settlements
  for select to authenticated
  using (
    public.has_owner_capability('finance.read')
    and public.has_owner_domain_access('finance_governance')
  );

drop policy if exists owner_finance_read_settlement_payments on public.settlement_payments;
create policy owner_finance_read_settlement_payments
  on public.settlement_payments
  for select to authenticated
  using (
    public.has_owner_capability('finance.read')
    and public.has_owner_domain_access('finance_governance')
    and exists (
      select 1 from public.settlements s
      where s.id = settlement_payments.settlement_id
    )
  );

drop policy if exists owner_finance_read_platform_pricing on public.platform_pricing;
create policy owner_finance_read_platform_pricing
  on public.platform_pricing
  for select to authenticated
  using (
    public.has_owner_capability('finance.read')
    and public.has_owner_domain_access('finance_governance')
  );
