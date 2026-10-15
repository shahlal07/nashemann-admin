# Current Status

Last updated: 2026-10-15

**Verified** means supported by direct evidence. **In progress** means actively being worked. **Blocked** requires a documented blocker. **Unknown / not yet audited** means insufficient evidence; it does not mean broken or complete.

## Coordination
- [x] Shared brain structure and read-first workflow committed to this repository.
- [ ] Audit all four repositories and record evidence.
- [ ] Reconcile live issues, branches and PRs into the master tracker.
- [ ] Verify actual app/API/database/auth/deployment relationships.
- [ ] Confirm all owners follow the read-first/update-after-work protocol.

## Application readiness

| Area | Status | Next step |
|---|---|---|
| Customer browsing/cart/checkout | Unknown | Audit nashemann-web and record tests |
| Storefront routing/catalog isolation | Unknown | Audit vendor-storefronts and cross-vendor tests |
| Vendor onboarding and fulfilment | Unknown | Audit vendor-admins end-to-end |
| Admin authorization and audit trail | Partially reviewed in code; database and production verification pending | Review RLS, database audit mechanisms, privileged action transitions and production evidence |
| Tenant isolation / row-level security | Unknown | Inspect policies and test separate vendor identities |
| Rs.20 eligible-order fee and subscription | Billing config verified in Supabase; live SQL safeguards inspected; legacy invoice exceptions require review | Locate RPC/trigger definitions and reconcile source records |
| Settlement and reconciliation | Live payment concurrency trigger and constraints confirmed; source-ledger/bank reconciliation and invalid settlement transition tests remain open | Add safe database-backed tests and reproducible reconciliation |
| CI, build, releases and rollback | Unknown | Inspect workflow files and recent runs |
| Domains and production deployments | Unknown | Verify provider dashboards and smoke tests |

## Finance & Governance audit — 2026-10-15

- Read the documented vendor billing workflow and reviewed the cron endpoint, settlement actions/page, payment-submission review page, billing settings, role helpers and audit-log page.
- Added [Finance Audit](FINANCE_AUDIT_2026-10-15.md) with evidence-backed observations and prioritized follow-up.
- Live Supabase read-only checks confirmed configured pricing at Rs. 20 per order and Rs. 5,999 monthly, plus a 10-day grace period.
- Five settlement rows were observed: a July Per Order invoice of Rs. 615 with Rs. 300 recorded paid (nominal Rs. 315 remaining); a July Monthly invoice of Rs. 7,000 recorded paid; and three August pending zero-fee invoices (one current Per Order, two current Monthly) with null plan snapshots and no orders. These are legacy exceptions requiring source-evidence review, not confirmed collectible balances.
- Live DB definitions confirm per-settlement advisory locking and balance checks for payments, unique vendor/month invoices and unique payment-submission linkage. Database RPC review also confirms Super Admin checks for submission review.
- Remaining code-level risk: waiver/reversal server actions do not explicitly validate reason/state/affected-row count, and the direct payment action does not check audit-log insert errors.
- Supabase security advisor reports one security-definer view error, 19 anon-executable and 52 authenticated-executable security-definer functions, and several RLS/no-policy or permissive-policy notices. These require function-by-function review; findings are not automatically proof of exploitability.
- Read-only aggregate/schema/policy/function queries were run against the connected Supabase project; no rows were changed and no charges/refunds/payouts were executed. Lint/build/tests and production HTTP smoke tests were not run.

## Immediate priorities
1. Audit existing code and open work before rebuilding anything.
2. Resolve P0 security/data-integrity findings with regression tests.
3. Map the customer → vendor → platform-finance order lifecycle.
4. Verify commercial rules before enabling real-money operations.
5. Replace unknowns with dated findings, evidence and next actions.

## Update format
Date, repo(s), task/issue/PR, finding/change, test evidence, remaining risk, responsible role, next action.