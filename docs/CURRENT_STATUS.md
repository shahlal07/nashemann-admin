## 2026-10-22 — WA-01 complete: order integrity and zero-cost database validation

- **Checkout/idempotency shipped:** [vendor-storefronts PR #12](https://github.com/shahlal07/vendor-storefronts/pull/12) merged; production deployment for main commit `6d7c85b737616a4739ce00c04b5982a33d860f51` reported READY. Checkout uses a scoped UUIDv4 idempotency key with the existing unique `orders.idempotency_key` index; canonical order creation runs through the validated server action and server-only client.
- **Production DB controls verified:** order-insert lockdown migration `20261022_lock_down_direct_order_insert` denies `anon`/`authenticated` INSERT and removes the customer INSERT policy; `service_role` retains INSERT. Live read-back verified.
- **Security fixes merged/deployed:** storefront PR #9 (guest lookup), storefront PR #10 (generic rate limiter), and vendor-admins PR #9 (trusted server rate-limit call sites). Production ACL reads confirm browser execution denied for the target order lookup/rate-limit RPCs and service-role access retained.
- **Stock concurrency fix applied:** [vendor-storefronts PR #13](https://github.com/shahlal07/vendor-storefronts/pull/13) merged; Supabase recorded version `20261022180345`, migration `20261022_fail_closed_order_stock_races`. A production read-back confirmed row locks, shortage/vendor/product checks, current decrement/restock triggers and restricted execute grants.
- **Zero-cost test evidence:** [GitHub Actions run #39828688758](https://github.com/shahlal07/vendor-storefronts/actions/runs/39828688758) passed both the app quality and PostgreSQL integration jobs. The disposable PostgreSQL service ran against synthetic schema/data on GitHub's standard public-repository runner; no paid Supabase branch was created and no production test order or stock fixture was used. Coverage includes simple/variant/box decrements, shortage rollback, multi-line rollback, malformed/NULL stock, vendor/product mismatch, legacy warnings, simultaneous last-unit orders, duplicate idempotency-key rejection without a second decrement, and cancellation/refund restock once.
- **Migration history aligned:** [PR #15](https://github.com/shahlal07/vendor-storefronts/pull/15) merged the migration filename matching the applied Supabase version, updated the CI path, and recorded acceptance results in [WA-01 acceptance doc](https://github.com/shahlal07/vendor-storefronts/blob/main/docs/WA-01_ORDER_INTEGRITY.md). Its branch CI run [#39828972072](https://github.com/shahlal07/vendor-storefronts/actions/runs/39828972072) passed the alignment changes.
- **Fee safety:** no fee, settlement or pricing behavior was modified. Runtime settings remain Rs 20/order and Rs 7,000/month; older Rs 5,999 notes are a stale policy reference, not an instruction to change live pricing. Pending-order settlement behavior remains unchanged. WhatsApp clicks/inquiries/drafts must not become canonical billable orders; only explicit confirmed orders may use the existing `public.orders` triggers.
- **Known unrun test:** no authenticated production checkout was submitted as a smoke test because that would create a real order and alter inventory. App unit/build checks and synthetic DB integration passed; full checkout smoke and Meta send/receive verification remain rollout gates for later phases.
- **Status:** WA-01 engineering acceptance complete. WA-02/WA-03/WA-04 are now Ready for implementation; WA-05 remains blocked until the integration phases and Meta/finance pilot gates are complete.

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
