-- Harden owner helper functions: keep SECURITY DEFINER routines out of the exposed public API schema.
-- This migration is additive and does not modify business data.

create or replace function private.has_owner_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.owner_memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.capabilities @> array[p_capability]::text[]
  );
$$;

create or replace function private.has_owner_domain_access(p_domain text)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
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

revoke all on function private.has_owner_capability(text) from public, anon;
revoke all on function private.has_owner_domain_access(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_owner_capability(text) to authenticated;
grant execute on function private.has_owner_domain_access(text) to authenticated;

drop policy if exists owner_decisions_select_domain on public.owner_decisions;
create policy owner_decisions_select_domain on public.owner_decisions
  for select to authenticated
  using (
    private.has_owner_domain_access(domain)
    and (
      private.has_owner_capability('governance.read')
      or (domain = 'product_technology' and private.has_owner_capability('technology.read'))
      or (domain = 'business_strategy' and private.has_owner_capability('strategy.read'))
    )
  );

drop policy if exists owner_decisions_insert_domain on public.owner_decisions;
create policy owner_decisions_insert_domain on public.owner_decisions
  for insert to authenticated
  with check (
    private.has_owner_domain_access(domain)
    and (
      private.has_owner_capability('governance.manage')
      or (domain = 'product_technology' and private.has_owner_capability('technology.manage'))
      or (domain = 'business_strategy' and private.has_owner_capability('strategy.manage'))
    )
    and created_by = (select auth.uid())
  );

drop policy if exists owner_decisions_update_domain on public.owner_decisions;
create policy owner_decisions_update_domain on public.owner_decisions
  for update to authenticated
  using (
    private.has_owner_domain_access(domain)
    and (
      private.has_owner_capability('governance.manage')
      or (domain = 'product_technology' and private.has_owner_capability('technology.manage'))
      or (domain = 'business_strategy' and private.has_owner_capability('strategy.manage'))
    )
  )
  with check (
    private.has_owner_domain_access(domain)
    and (
      private.has_owner_capability('governance.manage')
      or (domain = 'product_technology' and private.has_owner_capability('technology.manage'))
      or (domain = 'business_strategy' and private.has_owner_capability('strategy.manage'))
    )
  );

drop policy if exists owner_approvals_select_domain on public.owner_approvals;
create policy owner_approvals_select_domain on public.owner_approvals
  for select to authenticated
  using (
    private.has_owner_capability('approvals.read')
    and private.has_owner_domain_access(domain)
  );

drop policy if exists owner_approvals_insert_domain on public.owner_approvals;
create policy owner_approvals_insert_domain on public.owner_approvals
  for insert to authenticated
  with check (
    private.has_owner_capability('approvals.request')
    and private.has_owner_domain_access(domain)
    and requested_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

drop policy if exists owner_approvals_review_domain on public.owner_approvals;
create policy owner_approvals_review_domain on public.owner_approvals
  for update to authenticated
  using (
    private.has_owner_capability('approvals.review')
    and private.has_owner_domain_access(domain)
    and requested_by <> (select auth.uid())
    and status = 'pending'
  )
  with check (
    private.has_owner_capability('approvals.review')
    and private.has_owner_domain_access(domain)
    and requested_by <> (select auth.uid())
    and reviewed_by = (select auth.uid())
    and status in ('approved', 'rejected')
  );

drop policy if exists owner_governance_audit_read_authorized on public.owner_governance_audit;
create policy owner_governance_audit_read_authorized on public.owner_governance_audit
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      private.has_owner_capability('audit.read')
      and private.has_owner_domain_access(domain)
    )
  );

drop policy if exists owner_finance_read_settlements on public.settlements;
create policy owner_finance_read_settlements
  on public.settlements for select to authenticated
  using (
    private.has_owner_capability('finance.read')
    and private.has_owner_domain_access('finance_governance')
  );

drop policy if exists owner_finance_read_settlement_payments on public.settlement_payments;
create policy owner_finance_read_settlement_payments
  on public.settlement_payments for select to authenticated
  using (
    private.has_owner_capability('finance.read')
    and private.has_owner_domain_access('finance_governance')
    and exists (
      select 1 from public.settlements s
      where s.id = settlement_payments.settlement_id
    )
  );

drop policy if exists owner_finance_read_platform_pricing on public.platform_pricing;
create policy owner_finance_read_platform_pricing
  on public.platform_pricing for select to authenticated
  using (
    private.has_owner_capability('finance.read')
    and private.has_owner_domain_access('finance_governance')
  );

drop policy if exists owner_memberships_select_self_or_super_admin on public.owner_memberships;
create policy owner_memberships_select_self_or_super_admin
  on public.owner_memberships for select to authenticated
  using ((select auth.uid()) = user_id or public.is_super_admin());

create index if not exists owner_memberships_created_by_idx on public.owner_memberships(created_by);
create index if not exists owner_decisions_created_by_idx on public.owner_decisions(created_by);
create index if not exists owner_decisions_updated_by_idx on public.owner_decisions(updated_by);
create index if not exists owner_approvals_requested_by_idx on public.owner_approvals(requested_by);
create index if not exists owner_approvals_reviewed_by_idx on public.owner_approvals(reviewed_by);
create index if not exists owner_governance_audit_actor_idx on public.owner_governance_audit(actor_user_id);
create index if not exists owner_membership_audit_actor_idx on public.owner_membership_audit(actor_user_id);

drop function if exists public.has_owner_capability(text);
drop function if exists public.has_owner_domain_access(text);
