# Current Status

## 2026-10-22 — WA-01 security fixes deployed; canonical stock guard awaiting database validation

- **Merged security PRs:** [vendor-storefronts #9](https://github.com/shahlal07/vendor-storefronts/pull/9) (guest order lookup hardening), [vendor-storefronts #10](https://github.com/shahlal07/vendor-storefronts/pull/10) (server-only rate limiting), and [vendor-admins #9](https://github.com/shahlal07/vendor-admins/pull/9) (admin rate-limit call sites). Storefront post-merge CI passed; both storefront production deployments and the vendor-admins production deployment report READY.
- **Production DB permission migrations applied:** `20261022_revoke_guest_order_lookup_browser_exec` and `20261022_restrict_generic_rate_limit_browser_exec` on Supabase project `eznxsosvsgkhexbjoolh`. A read-only privilege check confirmed `anon` and `authenticated` cannot execute `find_orders_by_contact`, `find_order_by_number_and_contact`, or `check_and_record_rate_limit`; `service_role` retains execution. The three target functions no longer appear in the matching Supabase security-advisor findings. Other unrelated SECURITY DEFINER/view findings remain.
- **WA-01 implementation PR:** [vendor-storefronts #11](https://github.com/shahlal07/vendor-storefronts/pull/11), branch `feature/wa-01-order-integrity`, remains Draft. Current branch commit `778218243c1967d32b516554dc2456a325ce8f9a` passed Vitest, Next.js route-type generation, TypeScript, ESLint and production build. Its Vercel preview is READY.
- **Not yet deployed / not applied:** PR #11's checkout idempotency and service-role order insert changes, its migration denying direct order INSERTs, and the fail-closed stock function. They remain staged together in Draft while database transaction/concurrency behavior is tested away from production. No order/inventory/fee data was changed by these changes.
- **Staging gate:** there is no active staging Supabase project in the connected account. Supabase quoted a development database branch at USD $0.01344/hour. Do not create it until the user explicitly approves this recurring cost; do not test stock concurrency on real production inventory.
- **Fee/identity contract:** [WA-01 acceptance contract](https://github.com/shahlal07/vendor-storefronts/blob/feature/wa-01-order-integrity/docs/WA-01_ORDER_INTEGRITY.md) records that clicks/intents/drafts are never orders, confirmed channel orders use the canonical row/triggers, current pending-order settlement behavior is preserved, current runtime fees remain Rs 20/order and Rs 7,000/month, and the stale Rs 5,999/month baseline still requires Finance sign-off. Safe WhatsApp guest identity remains a WA-04 gate.
- **Current status:** WA-01 engineering implementation in review; not complete for production sign-off. Do not unblock WA-02/WA-03/WA-04 until the stock migration has a successful non-production concurrency/rollback test and fee/identity decisions are recorded.


## 2026-10-22 — WA-01 implementation started

- **Work branch:** [vendor-storefronts feature/wa-01-order-integrity](https://github.com/shahlal07/vendor-storefronts/tree/feature/wa-01-order-integrity).
- **Draft PR:** [#11 — Harden canonical order creation and inventory integrity](https://github.com/shahlal07/vendor-storefronts/pull/11). Changes so far: checkout retry token/idempotency handling; validated service-role order writes; proposed migration to deny direct browser-role order insertion and fail closed on inventory shortage.
- **Verification:** GitHub Actions storefront-quality run started; at the last check dependency installation was in progress and tests/typecheck/lint/build had not run yet. Vercel preview deployment was also BUILDING. Do not mark the slice verified until these return terminal statuses and the SQL migration is reviewed/tested.
- **Safety:** no production database migration was applied and no order/stock/billing data was changed. The database migration is coupled to the server action and must be reviewed before merge.
- **Open gates:** verify every canonical order insertion path, test same-token races and stock rollback/concurrency, coordinate existing open security PRs/migrations, decide Rs 5,999 vs Rs 7,000 monthly fee and document pending-order billing eligibility before WhatsApp activation.


## 2026-10-22 — WhatsApp commerce Phase 0 audit complete (WA-00)

- **Audit report:** [docs/WHATSAPP_COMMERCE_PHASE_0_AUDIT.md](WHATSAPP_COMMERCE_PHASE_0_AUDIT.md). Read-only audit of the four active repos, active Supabase schema/RLS/RPC grants, Vercel production deployment/environment metadata, and pending security PRs.
- **Verified architecture:** vendor-storefronts is the canonical storefront/checkout; vendor-admins owns vendor order operations; nashemann-web and nashemann-admin are platform and super-admin/finance layers. Do not build a WhatsApp-specific order ledger.
- **Current WhatsApp state:** product/support actions are plain WhatsApp link-outs. No Meta webhook/order attribution/session layer or META_/WHATSAPP_ variables were found in the four Vercel app configs.
- **P0 build blockers:** current settlement generation treats pending orders as eligible; checkout does not populate the unique orders.idempotency_key (live query 28/28 null); stock trigger clamps stock to zero rather than aborting an oversold order; two relevant security remediations remain open (vendor-storefronts #9/#10 and vendor-admins #9).
- **Finance mismatch:** active platform_pricing row says Rs 20/order and Rs 7,000/month; Project Brain baseline says Rs 20/order and Rs 5,999/month. Reconcile before changing or relying on recurring billing. No financial settings were changed.
- **Phase 0 status:** complete for WhatsApp architecture/readiness; Phase 1 build, security deployments, tests and Meta live onboarding remain future execution gates. This does not close the broader all-app BRAIN-001–010 audit.


Last updated: 2026-10-17

**Verified** means supported by direct evidence. **In progress** means actively being worked. **Blocked** requires a documented blocker. **Unknown / not yet audited** means insufficient evidence; it does not mean broken or complete.

## Coordination
- [x] Shared brain structure and read-first workflow committed to this repository.
- [ ] Audit all four repositories and record evidence.
- [ ] Reconcile live issues, branches and PRs into the master tracker.
- [ ] Verify actual app/API/database/auth/deployment relationships.
- [ ] Confirm all owners follow the read-first/update-after-work protocol.
- [x] Draft cross-repository Co-Founder Platform integration plan; issue #15 opened.
- [x] Broader read-only live Supabase discovery confirmed owner membership/decision/approval/audit tables and owner capability/domain helper functions. Earlier targeted name search was incomplete.
- [x] Created initial owner-workspace implementation branch with separate owner login, server-side membership guard, RLS-backed live overview, and Super Admin-only owner provisioning.
- [x] Merged the co-founder workspace into `master` via PR #20; production deployment for commit `7fdb17d8ab36ad447ffb2974972fb7dd91d11feb` is READY on Vercel.
- [x] Production build completed TypeScript checks and static generation (31/31 pages); Vercel route table includes `/owner-login`, `/owner-management`, and `/owners`.
- [ ] Run authenticated smoke tests for owner sign-in, provisioning, password updates, RLS, and unauthorized identities; browser access could not be independently verified through the web inspection tool.
- [ ] Provision and verify the three founder memberships. Live schema discovery recorded zero memberships before provisioning; no founder account has been created by this work.

## Application readiness — not yet verified

| Area | Status | Next step |
|---|---|---|
| Customer browsing/cart/checkout | Unknown | Audit nashemann-web and record tests |
| Storefront routing/catalog isolation | Unknown | Audit vendor-storefronts and cross-vendor tests |
| Vendor onboarding and fulfilment | Unknown | Audit vendor-admins end-to-end |
| Admin authorization and audit trail | Unknown | Audit nashemann-admin privileged actions |
| Tenant isolation / row-level security | RLS enabled on all 86 public tables (verified 2026-10-22); policy correctness and cross-vendor isolation still unverified | Review RPCs/views and test separate vendor identities |
| Security-definer RPCs | Two confirmed high-priority exposures have remediation PRs open; broader RPC/view review remains | Review each function's grants, call sites, and authorization guards |
| Rs.20 eligible-order fee and subscription | Unknown | Trace implementation against approved policy |
| Settlement and reconciliation | Unknown | Test idempotency, concurrency and audit history |
| CI, build, releases and rollback | Unknown | Inspect workflow files and recent runs |
| Domains and production deployments | Unknown | Verify provider dashboards and smoke tests |
| Co-Founder / Owner Platform | Deployed to production; end-to-end auth not yet verified | Run authenticated tests for duplicate email, create/edit credentials, active membership, least-privilege access and RLS; provision founders after identities/responsibilities are confirmed |

## Immediate priorities
1. Audit existing code and open work before rebuilding anything.
2. Resolve P0 security/data-integrity findings with regression tests.
3. Map the customer → vendor → platform-finance order lifecycle.
4. Verify commercial rules before enabling real-money operations.
5. Define owner permissions without changing Super Admin behavior.
6. Replace unknowns with dated findings, evidence and next actions.

## 2026-10-15 — Local production-parity dev environment configured
- **Repos:** all four (nashemann-web, nashemann-admin, vendor-storefronts, vendor-admins).
- **Finding/change:** All four apps run locally on ports 3000–3003 with real Supabase credentials; `.env.local` populated (Vercel pull + Supabase CLI + old local clone); local-only provision/cron secrets wired for the admin↔vendor handshake; launcher scripts `dev-all.bat` / `dev-stop.bat` / `dev-check.bat`; docs `docs/LOCAL_DEVELOPMENT.md` and `docs/LOCAL_ENVIRONMENT_VARIABLES.md` added. Correct Vercel projects confirmed: nashemann-web, nashemann-admin, vendor-storefronts, vendor-admins (team kashif11); two mistakenly created empty projects `theaamghar-web`/`theaamghar-admin` deleted.
- **Test evidence:** HTTP 200 on all four local ports (nashemann-admin `/` 307→`/login` 200 as designed); `npm run build` PASS ×4; vitest PASS 47/47 (vendor-storefronts) and 35/35 (vendor-admins); `tsc --noEmit` PASS (vendor-storefronts); lint run ×4 — only pre-existing issues (web 1 err, admin 16 errs, vendor-admins 4 errs, vendor-storefronts 0 errs).
- **Remaining risk:** localhost redirect URLs not yet confirmed in Supabase Auth config (OAuth/email links/reset); email delivery not verified; Vercel `sensitive` var values unavailable via API (documented workaround); local provision/cron secrets intentionally differ from production.
- **Responsible role:** Product & Technology.
- **Next action:** Owner adds localhost redirect URLs in Supabase Dashboard → Authentication → URL Configuration, then signs in locally with a real account to confirm session flow.

## Update format
Date, repo(s), task/issue/PR, finding/change, test evidence, remaining risk, responsible role, next action.
