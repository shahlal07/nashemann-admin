## 2026-10-22 — WA-01 complete: zero-cost stock and idempotency validation applied to production

- **Checkout:** [vendor-storefronts PR #12](https://github.com/shahlal07/vendor-storefronts/pull/12) merged; per-checkout idempotency and server-only validated order creation are in production. The production build for the merged order engine is READY.
- **Security:** storefront PR #9 guest lookup, storefront PR #10 rate limit RPC, and vendor-admins PR #9 trusted server rate limiting are merged/deployed. Production privilege read-back confirmed anon/authenticated cannot execute the targeted lookup/rate-limit RPCs. Order INSERT privileges are also locked to the validated server path (anon/authenticated denied; service_role allowed).
- **Inventory:** [vendor-storefronts PR #13](https://github.com/shahlal07/vendor-storefronts/pull/13) merged. Stock migration recorded and applied as Supabase version `20261022180345` / `20261022_fail_closed_order_stock_races`. Read-back confirmed `adjust_stock_for_order_items` uses row locks and shortage/vendor/product guards; the existing order decrement and cancellation/refund restock triggers still reference their intended functions.
- **No-cost tests:** [GitHub Actions run #39828688758](https://github.com/shahlal07/vendor-storefronts/actions/runs/39828688758) passed app-quality and PostgreSQL integration. [PR #14](https://github.com/shahlal07/vendor-storefronts/pull/14) added duplicate-idempotency-key and refund-restock-once regression cases; its integration + app-quality run [#39828498738](https://github.com/shahlal07/vendor-storefronts/actions/runs/39828498738) passed. Tests run in a disposable PostgreSQL 16 service on public-repository GitHub Actions; no paid Supabase branch and no real customer/order/stock fixtures.
- **Migration history:** [PR #15](https://github.com/shahlal07/vendor-storefronts/pull/15) merged the migration file name matching the applied production version, updated the CI path, and finalized [docs/WA-01_ORDER_INTEGRITY.md](https://github.com/shahlal07/vendor-storefronts/blob/main/docs/WA-01_ORDER_INTEGRITY.md). Branch CI [#39828972072](https://github.com/shahlal07/vendor-storefronts/actions/runs/39828972072) and post-merge main CI [#39829162518](https://github.com/shahlal07/vendor-storefronts/actions/runs/39829162518) both passed; the latest Vercel production deployment is READY at commit `bb092f7b5bc42c35625a8754df191bf702e3ac3c`.
- **Fee boundary preserved:** no fee rates or settlement logic changed. Runtime stays Rs 20/order and Rs 7,000/month; pending-order eligibility remains existing behavior. Older Rs 5,999 notes are stale policy text and are not permission to alter live pricing.
- **Known limitation:** no authenticated production checkout E2E was run because it would create a real order and mutate inventory. Unit/build and synthetic database checks passed. Actual Meta webhook send/receive and verified WhatsApp identity conversion remain WA-02–WA-04 rollout work.
- **Tracker:** WA-01 marked Done; WA-02–WA-04 Ready; WA-05 remains blocked on the feature phases and controlled pilot prerequisites.

---

## 2026-10-22 — WA-01 stock-only migration isolated and app checks passed

- Closed the conflicted combined [PR #11](https://github.com/shahlal07/vendor-storefronts/pull/11) after separating the already merged checkout code from the inventory SQL.
- Created [Draft PR #13](https://github.com/shahlal07/vendor-storefronts/pull/13) from current main with only `20261022190000_fail_closed_order_stock.sql` and the WA-01 database acceptance contract. Current branch commit `aac979e33459437eeb0658f9566fa43584c8f716` passed GitHub Actions (Vitest, route types, TypeScript, ESLint, build); Vercel preview READY.
- Stock migration remains unapplied in production. Connected Supabase has only the main branch, no staging branch; a test branch costs USD $0.01344/hour and requires explicit user approval. SQL tests still needed for concurrent last-item, multi-line rollback, NULL/missing stock, item/vendor mismatch, and cancellation/refund replay.

---

## 2026-10-22 — WA-01 checkout idempotency deployed and direct order inserts locked down

- **Merged PR:** [vendor-storefronts #12](https://github.com/shahlal07/vendor-storefronts/pull/12), merge commit `ed79c82294cc77e454c558b268d7d056ee33e7c4`.
- **Production:** Vercel deployment `vendor-storefronts-6iv2yvjyo-kashif11.vercel.app` reports READY. Post-merge GitHub Actions run [#39825747870](https://github.com/shahlal07/vendor-storefronts/actions/runs/39825747870) passed unit tests, route-type generation, TypeScript, ESLint and production build.
- **App change:** checkout now submits an opaque UUIDv4 token scoped to current Supabase identity, writes it to the existing unique `orders.idempotency_key`, and returns the already-created order on duplicate/retried submissions without rerunning application-level coupon/email/address effects. Canonical insert uses the server-only client after current server-side validation.
- **Production migration:** `20261022_lock_down_direct_order_insert` applied only after the app deployment reported READY. Verified direct anon/authenticated order INSERT privilege false, the customer INSERT policy absent, service_role INSERT true, and the unique idempotency index present.
- **Security deployments:** storefront PR #9 guest lookup, storefront PR #10 generic rate limiter, and vendor-admins PR #9 server helper are merged and deployed. Two earlier production migrations deny anon/authenticated execution on order lookup/rate-limit RPCs; read-only privilege checks confirmed the intended grants.
- **Stock migration:** conflicted combined PR #11 closed as superseded. Replacement [Draft PR #13](https://github.com/shahlal07/vendor-storefronts/pull/13) contains the stock function migration only and a database acceptance matrix. It remains Draft until non-production PostgreSQL tests cover concurrent last-unit requests, multi-line rollback, NULL/missing stock, wrong vendor/product, and legacy cancellation/refund restock.
- **Cost gate:** a Supabase development branch costs USD $0.01344/hour according to the connected account. It has not been created; explicit user approval is required for that recurring charge. No production stock migration/inventory alteration has occurred.
- **Current WA-01 status:** incomplete for production acceptance until stock database test evidence is recorded. Finance price discrepancy remains Rs 7,000 live versus Rs 5,999 in old notes; no fee/pricing or settlement logic changed. WhatsApp identity mapping and durable Meta event-to-order uniqueness remain later-phase gates.

---

## 2026-10-22 — WA-01 security remediations deployed; order-integrity migration held for non-production test

- **Merged app PRs:** [vendor-storefronts #9](https://github.com/shahlal07/vendor-storefronts/pull/9), [vendor-storefronts #10](https://github.com/shahlal07/vendor-storefronts/pull/10), [vendor-admins #9](https://github.com/shahlal07/vendor-admins/pull/9).
- **Deployments:** storefront production deployments for merge commits `2a2bda10fc8070882633d1a6781a5bacf2a7d1a0` and `4fe09eeb240dcb030f9e2bf710acc5c316c39a72` report READY; vendor-admins production deployment for `c7311fb02b6ab3c72c5034bc256763c522aad688` reports READY. Storefront post-merge CI for rate-limit changes passed tests, route types, typecheck, lint and build. The vendor-admins repo did not run an independent Actions workflow for PR #9; its Vercel build/deployment is READY.
- **Production DB migrations applied:** `20261022_revoke_guest_order_lookup_browser_exec` and `20261022_restrict_generic_rate_limit_browser_exec` after the corresponding application deployments were READY. Read-only verification confirms target functions deny execute to `anon`/`authenticated` and allow `service_role`. Supabase security-advisor findings for those target RPCs have cleared; the overall advisor still shows unrelated remaining findings.
- **Order integrity PR:** [vendor-storefronts #11](https://github.com/shahlal07/vendor-storefronts/pull/11), Draft; branch `feature/wa-01-order-integrity`. Adds scoped checkout idempotency, server-only canonical order writes, a proposed orders INSERT permission lockdown and a fail-closed row-locked stock trigger. Includes [the WA-01 order/fee/identity acceptance contract](https://github.com/shahlal07/vendor-storefronts/blob/feature/wa-01-order-integrity/docs/WA-01_ORDER_INTEGRITY.md). CI passed commit `778218243c1967d32b516554dc2456a325ce8f9a` (tests, route-type generation, TypeScript, ESLint, production build); Vercel preview READY.
- **Explicit no-change boundary:** did not apply PR #11's migration to production. No live orders, stock quantities, fee settings, settlements or customer records were altered by it. A separate Supabase validation branch is needed to test the transactional inventory cases; the account quote is USD $0.01344/hour and requires the user's explicit approval before creation.
- **Outstanding gates:** database tests for concurrent last-unit orders, multi-line rollback, missing/NULL stock, legacy restock and cancellation/refund once-only semantics; written financial sign-off on the Rs 5,999 vs Rs 7,000 monthly price; WA-04 verified-phone/Auth identity; broader remaining advisor findings. Keep WA-01 In progress until these are addressed, then do not start live Meta webhook conversion before acceptance evidence.

---

## 2026-10-22 — WA-01 first implementation slice opened for review

- **Repository/branch:** `shahlal07/vendor-storefronts`, `feature/wa-01-order-integrity`.
- **Draft PR:** [#11 — Harden canonical order creation and inventory integrity](https://github.com/shahlal07/vendor-storefronts/pull/11).
- **Code added:** per-tab checkout idempotency token and user-scoped key; same-key replay returns the existing order; canonical order insert now uses the server-only service-role client after current action-level validation; helper unit tests; SQL migration to deny direct anon/authenticated writes to `public.orders` and fail stock decrements closed under row locks.
- **Current verification status:** at the last check GitHub Actions was in progress during locked dependency installation; Vitest, typecheck, ESLint and production build had not completed. Vercel preview was BUILDING. Do not infer a passing build from a deployment being created.
- **Safety:** no migration was applied to the production Supabase project; no live orders, inventory, or billing settings changed. PR is draft and not ready to merge until CI passes, the migration and all canonical order writers are reviewed, and concurrency/rollback cases are verified.
- **Still unresolved:** transaction-safe intent-to-order idempotency for webhooks needs a durable conversion boundary; live pending-order billing eligibility must be approved; monthly price mismatch (Rs 7,000 active DB vs Rs 5,999 project policy) must be reconciled; open guest-order lookup and rate-limit RPC PRs need coordinated deployment and grant-migration verification.

---

## 2026-10-22 — WhatsApp Commerce Phase 0 complete (WA-00)

- **Report:** [docs/WHATSAPP_COMMERCE_PHASE_0_AUDIT.md](WHATSAPP_COMMERCE_PHASE_0_AUDIT.md) — read-only trace across all four active repositories, active Supabase schema/RLS/RPC grants, Vercel deployment and environment metadata, order/settlement functions, and current Meta onboarding requirements.
- **Confirmed path:** product/order WhatsApp CTAs are plain link-outs. No Meta webhook processor, connected-number registry or order source/session tracking is present in the current app code/config.
- **Critical findings:** orders.idempotency_key is indexed but is not populated by checkout (live aggregate: 28/28 NULL); stock trigger can commit an oversold order because it clamps inventory to zero; billing currently counts pending orders as eligible; anonymous order lookup and generic rate-limit SECURITY DEFINER RPC fixes remain open and not yet applied to live DB.
- **Finance:** live platform_pricing row currently gives Rs 20/order and Rs 7,000/month, while the shared policy doc says Rs 5,999/month. No price or financial row was changed.
- **Infrastructure evidence:** active project eznxsosvsgkhexbjoolh has 86 RLS-enabled public tables; all four relevant Vercel projects have READY production deployments, which is deployment evidence only—not end-to-end acceptance. No Meta/WhatsApp env names were found. Meta OTP/account approval still gates a real send/receive test.
- **Changes in this commit:** documentation only—audit report, current-status summary and phased task tracker. No application code, database objects/grants/policies, secrets, production orders or billing records changed. Local test commands were not run through the repository connector; only already-recorded remote CI/Vercel evidence was reviewed.
- **Next:** WA-01—agree order-fee/identity semantics; fix idempotent order conversion and atomic stock; close and verify the two security remediations before adding live webhook processing.

---

## 2026-10-18 — Phase 1 security audit started

- Verified the active Nashemann Supabase project and confirmed RLS is enabled on all 36 public tables.
- Found guest order lookup returning full order rows based only on contact; [vendor-storefronts PR #9](https://github.com/shahlal07/vendor-storefronts/pull/9) now moves lookup behind a server-side rate-limited action, resolves tenant from the request host, returns an allowlist of fields, and adds a migration revoking direct browser execution on both lookup RPCs. CI passed for the expanded PR commit.
- Found the generic rate-limit SECURITY DEFINER RPC directly executable by anon/authenticated with caller-controlled keys and thresholds; opened [vendor-storefronts PR #10](https://github.com/shahlal07/vendor-storefronts/pull/10) and [vendor-admins PR #9](https://github.com/shahlal07/vendor-admins/pull/9). Storefronts CI passed after updating chat, newsletter, and bug-report call sites; the vendor-admins preview build is READY after updating both the admin-assistant and AI review-reply call sites. The coordinated database grant migration is not yet applied; wait until both application changes are deployed.
- Remaining: investigate the flagged SECURITY DEFINER view, review public RPCs individually, verify cross-vendor isolation with real identities, and enable leaked-password protection after checking current auth settings.
- Status: findings confirmed; fixes in review; no live database permissions changed during this audit.

# Shared Project Changelog

Record meaningful changes newest first: date, task, repos, summary, PR/commit, tests/evidence, risks and next action.

## 2026-10-17 — Co-Founder workspace production release (BRAIN-011)
- **Repository:** `shahlal07/nashemann-admin`; PR [#20](https://github.com/shahlal07/nashemann-admin/pull/20), merged to `master`.
- **Production commit:** `7fdb17d8ab36ad447ffb2974972fb7dd91d11feb`; Vercel deployment `dpl_9F2zRYxKio9ownym8pWHePBt8iSU` is READY and aliases `https://superadmin.nashemann.store`.
- **Change:** Added the separate owner sign-in, protected owner overview/shell, Super Admin-only founder access panel, duplicate-email handling for explicitly confirmed existing founder identities, existing owner credential edits, and actual login-email display from Supabase Auth. Existing staff/admin and vendor-linked identities are blocked by the provisioning flow.
- **Build evidence:** Vercel reports compiled successfully, TypeScript finished, static generation completed 31/31, and route listing includes `/owner-login`, `/owner-management`, `/owners`.
- **Runtime finding addressed:** Historical production error on `/owner-management`: “A user with this email address has already been registered.” The updated action now recognizes duplicate email, resolves it through the Auth Admin API after explicit confirmation, and handles existing founder membership instead of blindly returning the raw duplicate error.
- **Remaining verification:** Authenticated end-to-end owner login/provisioning/password-change/RLS/unauthorized-user tests have not been run through a real signed-in browser session. Live schema discovery reported zero owner memberships before provisioning; no founder account was created by this release. Confirm founder identities/responsibilities and test the flow before relying on it for all owners.
- **Remaining app scope:** BRAIN-001 through BRAIN-010 (whole marketplace, tenant isolation, fulfillment and finance integrity) remain to be audited; this release does not certify the whole platform production-ready.

## 2026-10-15 — Co-Founder Platform live schema discovery
- **Task:** BRAIN-011; issue #15; draft PR #16.
- **Repository / service:** `nashemann-admin` documentation branch and connected Supabase project `eznxsosvsgkhexbjoolh`.
- **Change:** Updated `docs/COFOUNDER_PLATFORM_INTEGRATION.md` with evidence from read-only database inspection.
- **Evidence:** A targeted `information_schema.tables` query across `public` and `private` found no base tables matching founder, owner, decision, approval, governance, company_task, or action_item. Catalog inspection confirmed existing `is_staff()`, `is_finance_staff()`, and `is_mutating_staff()` functions are SECURITY DEFINER. The existing `staff_profiles` policies and finance/settlement policies were reviewed for context.
- **Verification:** Read-only SQL only. No rows, roles, policies, schema, or production settings changed. No application tests run.
- **Risk:** This targeted search does not prove no suitable table exists under a different name. Full schema/RLS/grant review and migration-history comparison remain necessary before designing a migration.
- **Next:** Complete the authorization/schema inventory, confirm founder permission matrix, then integrate Kimi's actual code against the real app structure.

## 2026-10-15 — Co-Founder Platform integration plan
- **Task:** BRAIN-011.
- **Repositories:** Cross-repository planning; initial implementation target proposed as shahlal07/nashemann-admin.
- **Change:** Added `docs/COFOUNDER_PLATFORM_INTEGRATION.md` on branch `product/cofounder-platform-alignment`; documented repository boundaries, current authz clues, proposed owner authorization boundary, rollout, acceptance criteria, and open founder decisions. Opened [nashemann-admin #15](https://github.com/shahlal07/nashemann-admin/issues/15).
- **Evidence:** Inspected package manifests, `nashemann-admin/src/app/layout.tsx`, `src/components/AppChrome.tsx`, `src/lib/authz.ts`, `src/lib/roles.ts`, current architecture/task docs, and customer web layout. Repository directory checks confirmed the vendor apps have their own structure and should not be assumed to share identical paths.
- **Verification:** Documentation-only changes. No application code, schema, roles, RLS policies, or production settings changed. Lint/build/tests were not run because no application code was changed in this planning step.
- **Risks/open items:** Owner identity/responsibility matrix, approval rules, source-of-truth financial data, and exact database/deployment relationships remain to be verified.
- **Next:** Review Kimi's UI output against the actual admin code; audit schema/RLS and confirm founder permission matrix before implementation.

## 2026-10-15 — Project brain initialized
- **Repository:** shahlal07/nashemann-admin.
- **Change:** Added shared entry point, repository map, status ledger, master task backlog, architecture discovery, decisions, finance guardrails, release checklist and owner workflow.
- **Verification:** Documentation commits acknowledged by GitHub. Application code, integrations and deployment settings were not audited as part of creating this brain.
- **Next:** Audit all four active repositories and replace unknown status with evidence-backed findings.

## 2026-10-15 — Local development environment (all four repos)
- **Task:** Local production-parity setup.
- **Repos:** nashemann-web, nashemann-admin, vendor-storefronts, vendor-admins.
- **Summary:** All four apps verified running on localhost:3000–3003 against the production Supabase project `eznxsosvsgkhexbjoolh`; env files repaired (Vercel `sensitive` vars return `[SENSITIVE]` on pull — real values sourced from Supabase CLI and the previous local clone); local-only provisioning/cron secrets set; launcher scripts added; `docs/LOCAL_DEVELOPMENT.md` + `docs/LOCAL_ENVIRONMENT_VARIABLES.md` written; empty mistakenly-created Vercel projects `theaamghar-web`/`theaamghar-admin` removed.
- **Tests/evidence:** HTTP 200 ×4 locally; `npm run build` ×4 PASS; vitest 47/47 + 35/35 PASS; `tsc --noEmit` PASS (vendor-storefronts); lint ×4 (pre-existing issues only). No source code changed.
- **Risks:** Supabase localhost redirect URLs unconfirmed; email sending unverified; production values of sensitive Vercel vars still unknown to local setup (by design).
- **Next:** Owner confirms Supabase auth redirect URLs and performs a local sign-in.
