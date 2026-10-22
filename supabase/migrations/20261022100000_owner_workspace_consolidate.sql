-- Owner workspace: consolidate on the real governance tables.
--
-- 1. `owner_platform_features` and `owner_decision_votes` were scaffolding tables
--    created while wiring the embedded founder workspace. The product already has
--    `owner_feature_requests` (governed by /owners/features) and arbitrary
--    key-value workspace state, so the duplicate tables are removed rather than
--    kept as a second source of truth.
-- 2. Founders must be able to see each other. `owner_memberships` previously only
--    allowed self-read (plus super admin), so the roster could never be rendered.
--    Any active founder holding `governance.read` may now read the roster.

drop table if exists public.owner_platform_features cascade;
drop table if exists public.owner_decision_votes cascade;

drop policy if exists "owner_memberships_select_active_owners" on public.owner_memberships;
create policy "owner_memberships_select_active_owners"
  on public.owner_memberships
  for select
  to authenticated
  using (private.has_owner_capability('governance.read'));
