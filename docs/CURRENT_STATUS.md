# Current Status

Last updated: 2026-10-15

**Verified** means supported by direct evidence. **In progress** means actively being worked. **Blocked** requires a documented blocker. **Unknown / not yet audited** means insufficient evidence; it does not mean broken or complete.

## Coordination
- [x] Shared brain structure and read-first workflow committed to this repository.
- [ ] Audit all four repositories and record evidence.
- [ ] Reconcile live issues, branches and PRs into the master tracker.
- [ ] Verify actual app/API/database/auth/deployment relationships.
- [ ] Confirm all owners follow the read-first/update-after-work protocol.
- [x] Draft cross-repository Co-Founder Platform integration plan on feature branch; issue #15 opened. This is planning work only, not an implemented feature.
- [x] Run targeted read-only Supabase discovery for founder/governance tables and existing staff authorization functions; no matching tables found in the name search. Full schema/RLS audit remains open.

## Application readiness — not yet verified

| Area | Status | Next step |
|---|---|---|
| Customer browsing/cart/checkout | Unknown | Audit nashemann-web and record tests |
| Storefront routing/catalog isolation | Unknown | Audit vendor-storefronts and cross-vendor tests |
| Vendor onboarding and fulfilment | Unknown | Audit vendor-admins end-to-end |
| Admin authorization and audit trail | Unknown | Audit nashemann-admin privileged actions |
| Tenant isolation / row-level security | Unknown | Inspect policies and test separate vendor identities |
| Rs.20 eligible-order fee and subscription | Unknown | Trace implementation against approved policy |
| Settlement and reconciliation | Unknown | Test idempotency, concurrency and audit history |
| CI, build, releases and rollback | Unknown | Inspect workflow files and recent runs |
| Domains and production deployments | Unknown | Verify provider dashboards and smoke tests |
| Co-Founder / Owner Platform | Implementation scaffold in feature branch; not deployed | Review source and migration, run CI, confirm founder identities/responsibilities and approval rules; do not apply migration until approved |

## Immediate priorities
1. Audit existing code and open work before rebuilding anything.
2. Resolve P0 security/data-integrity findings with regression tests.
3. Map the customer → vendor → platform-finance order lifecycle.
4. Verify commercial rules before enabling real-money operations.
5. Define owner permissions without changing Super Admin behavior.
6. Replace unknowns with dated findings, evidence and next actions.

## Update format
Date, repo(s), task/issue/PR, finding/change, test evidence, remaining risk, responsible role, next action.

## Co-Founder Platform implementation update — 2026-10-15

- **Branch:** `feature/cofounder-workspace-foundation`
- **Implemented in source:** separate founder capability types; fail-closed server-side membership guard; owner route group and shell; read-only module placeholders; safe access/forbidden pages; proposed membership/RLS/audit migration.
- **Safety:** existing `StaffRole`, `requireStaff()`, `requireSuperAdmin()`, and existing admin pages were not changed. The Supabase migration was committed as source only and has not been applied.
- **Data:** owner pages do not show invented metrics; finance and technology integrations are explicitly pending.
- **Tests:** not run. Container network could not resolve GitHub, and package.json has no test script. Lint/build/typecheck and SQL migration validation are required before merge.
- **Next:** review code, establish CI evidence, confirm founder permission matrix, and integrate the Kimi dashboard output when available.


## Owner login and domain-isolation follow-up — 2026-10-15

- **Dedicated login:** `/owners/login` uses the existing Supabase Auth credentials and then independently checks the signed-in user's active owner membership. The staff login remains unchanged.
- **Domain security:** proposed SQL migration `_migrations/2026-10-15_owner_domain_isolation.sql` adds domain-scoped RLS for decisions and approvals, prohibits self-review of approval requests, and scopes governance audit records to the relevant domain. Membership audit visibility is Super Admin-only.
- **Owner pages:** decision and approval pages query the proposed tables through RLS and show an unavailable state rather than fallback data if the migration/schema is missing.
- **Other active repositories:** draft boundary PRs: `nashemann-web` PR #7, `vendor-storefronts` PR #8, and `vendor-admins` PR #8. The vendor-admin DAL already requires a vendor `admin/staff` profile, `vendor_id`, and active vendor; owner membership does not satisfy it.
- **Database:** the membership, domain-isolation, and security-hardening migrations are now applied to the connected Supabase project. They were first tested together inside a transaction that was rolled back. Read-only verification confirms the three owner tables exist and contain no memberships, decisions, or approvals yet. No existing billing records were changed.
- **Super Admin provisioning:** added `/owner-accounts` and its server actions for three owner accounts, username aliases, contact/recovery email, password create/reset, status, domain and capability assignment, audit logging, and session revocation on suspension/password reset. Passwords are never stored in the database.
- **Real data:** finance reads current settlement/pricing records under owner-domain RLS; strategy/operations/technology decision records use the live owner tables; technology repository health reads GitHub API when a server-side GitHub token is configured. Without that token, the page reports the integration as unavailable.
- **Kimi UI:** the uploaded file was the revised blueprint text, not the actual Kimi dashboard source, so the Kimi UI is not yet integrated.
- **Verification:** SQL migration syntax was tested transactionally and Supabase security/performance advisors were reviewed. Owner helper functions were moved to the non-exposed `private` schema after advisor review. A GitHub Actions workflow now runs lint and TypeScript checks, but no workflow run has been returned for the latest head commit; the Vercel status is blocked by the provider build-rate limit. App lint/build/typecheck and end-to-end authorization tests therefore remain unverified. No owner account has been provisioned.
