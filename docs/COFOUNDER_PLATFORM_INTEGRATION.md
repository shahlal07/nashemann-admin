# Co-Founder Platform — Cross-Repository Integration Plan

**Status:** Proposed implementation plan; not yet production implementation  
**Prepared:** 2026-10-15  
**Product owner request:** Add a dedicated co-founder/owner workspace integrated with Nashemann; preserve the existing Super Admin role and behavior.  
**Scope:** `nashemann-web`, `nashemann-admin`, `vendor-storefronts`, `vendor-admins`. The separate `nashemann` repository remains excluded from active implementation.

## 1. Product decision and non-negotiable boundaries

- Add a Co-Founder / Owner workspace for authenticated, explicitly authorized founders.
- Keep the existing Super Admin role, sign-in behavior, capabilities, and admin workflows unchanged unless a separately approved change explicitly requires otherwise.
- Founder ownership does **not** imply unrestricted access or Super Admin privileges.
- Assign permissions by explicit capabilities and founder responsibility; a job title or UI label is not authorization.
- Treat Finance & Governance, Product & Technology, Business & Strategy, and Shared Founder Governance as proposed workspace areas. Specific founder-to-area assignments and approval thresholds remain to be confirmed.
- Build on the current application and backend where verified; do not introduce a new standalone app, auth provider, or second source of truth by default.
- No production schema changes, role assignments, payouts, billing changes, or destructive actions are part of this plan.

## 2. Repository responsibilities

| Repository | Co-Founder Platform impact | Explicit non-goals |
|---|---|---|
| `nashemann-admin` | Proposed home for owner workspace, founder dashboard, decision/approval UX, finance and governance views, owner-specific route guards, and shared project documentation. Reuse the existing Next.js/Supabase patterns after code review. | Do not replace `AdminShell` or rewrite existing admin pages blindly. Do not weaken Super Admin or staff permissions. |
| `nashemann-web` | Keep customer-facing marketplace separate. Only add a link or data integration later if a verified product requirement calls for it. | No owner console in the public customer journey; no exposure of internal financial or company data. |
| `vendor-admins` | Keep vendor operations and vendor staff authorization tenant-scoped. Verify no owner role is accidentally treated as vendor staff. | Do not grant founders broad vendor account access through the vendor portal. |
| `vendor-storefronts` | Keep storefront rendering and vendor/customer flows unchanged. Any future platform-level aggregates must be served through a trusted, permission-checked boundary. | No founder controls or privileged owner data in public storefront routes. |

The first implementation target should be the existing `nashemann-admin` application, because it already owns platform administration and finance-related workflows. This is a proposed placement to validate, not a claim that the feature exists.

## 3. Verified infrastructure clues to respect

The current `nashemann-admin` code inspected for this plan includes:

- Next.js App Router-style routes under `src/app`.
- A root layout that wraps pages in `AppChrome`.
- `AppChrome` currently wraps non-login routes in `AdminShell`.
- `src/lib/roles.ts` currently defines staff roles: `super_admin`, `admin`, `finance`, `support`, `read_only`, and legacy `platform_staff`.
- `src/lib/authz.ts` provides `requireStaff()`, `requireMutatingStaff()`, `requireFinanceStaff()`, and `requireSuperAdmin()`. `requireStaff()` relies on the database `is_staff` RPC and a `staff_profiles` record.
- The admin and customer web repositories use Next.js 16 / React 19 / TypeScript and Supabase SSR client dependencies, but exact versions and app structures differ in the other active repos.

Implication: do not simply add `cofounder` to `StaffRole` and assume that the existing `requireStaff()` flow will work. The current authorization path is explicitly staff-oriented. Design and test a distinct owner-membership authorization boundary, or prove an existing supported model is appropriate before choosing a schema.

## 4. Recommended access architecture

### Authentication

- Reuse the existing Supabase Auth session flow in the target app if the current session and deployment configuration support it.
- Do not create a second password/login system.
- Do not assume every founder is already in `staff_profiles`.
- Resolve the authenticated user server-side, then resolve their explicit founder membership and capabilities from an authoritative data source.

### Authorization

- Preserve existing `requireStaff` and Super Admin checks for current staff/admin workflows.
- Introduce a separate server-side founder guard (suggested name: `requireFounder`) only after the authoritative membership/schema contract is agreed.
- Use explicit capabilities for read/write/approve actions rather than broad checks such as `isOwner` for everything.
- Enforce authorization in server actions/API handlers and Supabase RLS; UI navigation gating is only presentation.
- Default deny when membership or permission lookup fails.
- Do not accept a user ID, role, owner flag, or permission list from client input as proof of authorization.
- Record actor, action, target, timestamp, reason, and outcome for consequential founder decisions and approval changes where the schema supports it.
- Ensure founder capabilities do not automatically grant staff management, account impersonation, credential access, or unrestricted vendor/customer data.

### Data model

Do not create a migration until the existing schema, auth model, and RLS policies have been inspected end-to-end. Evaluate the smallest safe model that supports:

- Founder membership keyed to the authenticated user.
- Active/suspended membership state.
- Responsibility area(s).
- Explicit capabilities or a reviewed role-to-capability mapping.
- Approval requirements and approval records.
- Decision/action history.
- Auditable membership/permission changes.

Avoid embedding permissions only in React constants. Avoid relying on a client-side role label as the database security boundary.

### Route and shell integration

- Keep existing staff/admin routes and shell behavior working.
- Consider a separate owner route namespace (for example, `/owners`) and an owner-specific shell within the same application, subject to the existing route/layout structure.
- Ensure staff-only pages cannot be accessed merely by guessing URLs, and founder-only pages cannot be accessed by arbitrary staff.
- Handle unauthenticated, unauthorized, suspended, loading, and failed permission-resolution states.
- Do not create dead navigation links for pages that are not implemented.

## 5. Workspace modules and data contracts

Build the UI in slices; do not build every module as an unconnected mock dashboard.

### Shared foundation
- Founder overview, profile, task list, notifications, and role-aware navigation.
- Company decision register, action register, and approval center.
- A reliable audit history for high-impact actions.

### Finance & Governance
- Platform revenue and marketplace GMV shown as separate measures.
- Vendor settlement liabilities kept separate from platform revenue and profit.
- Existing policy baseline displayed without silently changing it: Rs. 20 per eligible order; Rs. 5,999 monthly subscription; initial 50% reinvestment target; equal founder distributions only after obligations, agreed reserves, and distributable profit are established.
- Settlement/reconciliation details must be marked as unresolved or requiring review when source records do not support a definitive amount.
- No real payment, payout, billing collection, or historical recalculation from UI-only work.

### Product & Technology
- Roadmap, tasks, release status, security findings, risks, and decisions.
- Any repository/deployment status must come from a verified integration, not hard-coded “live” indicators.

### Business & Strategy
- Company objectives, initiative ownership, milestones, risks, and approved decisions.
- Avoid invented company KPIs.

### Approval rules
- Approval quorum, thresholds, who may approve their own requests, and conflict-of-interest rules are not yet specified. Keep these configurable or explicitly blocked until founders confirm them.
- A browser success toast must not precede a server-confirmed outcome.
- Retries for non-idempotent actions must not create duplicate approvals, payments, or records.

## 6. Design integration contract for Kimi-generated UI

When Kimi's output arrives:

1. Compare its file tree against the real `nashemann-admin` structure before copying anything.
2. Reuse existing fonts, global styles, `AppChrome`, `AdminShell`, sidebar/topbar components, icons, and theme utilities where suitable.
3. Preserve existing routes and behavior; do not replace global styles or the root layout without a justified diff.
4. Keep presentational components separate from server data access and authorization.
5. Put mock data behind explicit fixture/adaptor boundaries; make mock state visibly non-production.
6. Do not invent imports, database tables, RPCs, API routes, or permissions.
7. Add the minimum changes needed to introduce the owner shell and routes.
8. Check responsive states, keyboard accessibility, loading/empty/error states, and unauthorized access.
9. Record exact lint/build/test commands and results; do not claim checks that were not run.

## 7. Rollout sequence

1. **Contract and access audit:** inspect current layouts, staff auth, Supabase schema, RLS, deployments, and existing issues/PRs.
2. **Permission matrix approval:** confirm founder identities, responsibility assignments, view/edit/approve powers, approval quorum, and Super Admin boundaries.
3. **UI shell:** integrate the approved Kimi design into `nashemann-admin` on a feature branch.
4. **Read-only owner experience:** add safe, permission-checked overview and decision visibility before enabling mutations.
5. **Governance workflows:** implement decisions, actions, and approvals with server-side checks and audit records.
6. **Finance views:** use authoritative sources; reconcile source discrepancies before showing historical figures as final or enabling collections.
7. **Cross-repo checks:** prove owner access cannot cross into public customer routes or vendor tenant boundaries.
8. **Verification and release:** run typecheck/lint/build/tests, auth matrix tests, RLS tests, and preview smoke tests; deploy only after review.

## 8. Acceptance criteria

- Existing Super Admin login, navigation, and privileged workflows remain behaviorally unchanged.
- Non-founder users cannot access owner routes or owner data by direct URL or direct server/API invocation.
- Founder users receive only explicitly assigned capabilities.
- Vendor and customer identities cannot obtain founder access by changing client payloads.
- Founder access does not broaden vendor tenant access.
- High-impact actions have server-side authorization, validation, idempotency where applicable, and an auditable result.
- Financial metrics preserve GMV/revenue/liability/profit distinctions.
- Mock data cannot be mistaken for production data.
- No schema, role, pricing, settlement, or production change occurs without the required review/approval.
- CI and test evidence is recorded honestly.

## 9. Open decisions / blockers

- Which founders will have accounts, and which responsibilities belong to each?
- Are founder permissions role-based, capability-based, or a combination?
- Which decisions require one approval, multiple approvals, or unanimous approval?
- Can a founder approve their own request?
- Which data may every founder view, and which is restricted by responsibility?
- Should the owner workspace live under `nashemann-admin` at launch, or is there a concrete reason for a separate deployment?
- What is the authoritative source for company cash position, expenses, founder capital, and distributable profit?
- Which existing database tables/policies can safely support founder membership and governance records?

Until these are confirmed, implement only reversible UI foundations and read-only work that does not widen permissions.

## 10. Verification status

This document records a plan based on source files inspected in GitHub. It does not mean that any owner route, database schema, permission, deployment, or production behavior has been changed. The code changes and security tests described above remain pending.
