# Master Task Tracker

Use this shared view for cross-repository priorities. Detailed technical discussion stays in repo issues/PRs; link them here. Statuses: Backlog, Ready, In progress, Blocked, In review, Done. Do not mark Done without acceptance evidence and an updated changelog/status.

| ID | Priority | Task | Repo(s) | Accountable role | Status |
|---|---|---|---|---|---|
| BRAIN-001 | P0 | Audit code, issues/PRs and integrations across all four repos | All four | All owners, coordinated by Tech | Ready |
| BRAIN-002 | P0 | Verify auth, authorization and tenant isolation; add regression tests | Relevant repos | Product & Technology | In progress |
| BRAIN-003 | P0 | Trace order lifecycle and guard against duplicate/lost/unauthorized transitions | All relevant repos | Tech + Operations | Ready |
| BRAIN-004 | P1 | Validate vendor onboarding, product/inventory and fulfilment | vendor-admins | Marketplace & Operations | Ready |
| BRAIN-005 | P1 | Validate browsing, cart/checkout and order confirmation | nashemann-web | Product & Technology | Ready |
| BRAIN-006 | P1 | Validate storefront routing, catalog accuracy and checkout handoff | vendor-storefronts | Product & Technology | Ready |
| BRAIN-007 | P0 | Audit Rs.20 order fee, eligibility rule and Rs.5,999 subscription | Admin + relevant code | Finance + Tech | Ready |
| BRAIN-008 | P0 | Audit settlement/reconciliation idempotency, concurrency and auditability | Admin + relevant code | Finance + Tech | Ready |
| BRAIN-009 | P1 | Verify privileged admin actions are authorized and logged | nashemann-admin | Finance + Tech | Ready |
| BRAIN-010 | P1 | Verify CI/build/test/release/rollback evidence | All four | Product & Technology | Ready |
| BRAIN-011 | P1 | Deploy role-based Co-Founder / Owner Platform while preserving Super Admin; finish authenticated acceptance tests | nashemann-admin (initial release) | Product & Technology + Finance/Governance | In review |
| WA-00 | P0 | WhatsApp Commerce Phase 0 audit and architecture contract | All four active repos + live Supabase/Vercel | Product & Technology | Done |
| WA-01 | P0 | Harden canonical order conversion, idempotency, stock concurrency, guest identity and fee-eligibility contract before adding WhatsApp orders | vendor-storefronts, vendor-admins, nashemann-admin | Product & Technology + Finance | Done |
| WA-02 | P1 | Implement shared-number and vendor-owned-number registry/routing plus connection lifecycle | vendor-storefronts, vendor-admins, nashemann-admin | Product & Technology | Ready |
| WA-03 | P1 | Implement official Meta Cloud API adapter, signature-verified durable webhooks and idempotent event processing | vendor-storefronts + shared backend | Product & Technology | Ready |
| WA-04 | P1 | Implement conversation-to-order confirmation and channel attribution through canonical orders | vendor-storefronts, vendor-admins | Product & Technology + Operations | Ready |
| WA-05 | P1 | Adversarial QA, controlled live pilot, vendor settlement reconciliation and production acceptance | All relevant repos + Meta | Product & Technology + Finance | Blocked on WA-01 through WA-04 |


## WA-01 execution update — 2026-10-22 (complete)

- **Code/release:** [vendor-storefronts PR #12](https://github.com/shahlal07/vendor-storefronts/pull/12) merged; checkout idempotency and validated server-only order creation are in production. Direct browser `orders` INSERT is denied by production migration `20261022_lock_down_direct_order_insert`.
- **Security:** storefront PR #9 guest lookup and PR #10 rate-limit hardening, plus vendor-admins PR #9 rate-limit call sites, are merged/deployed. Production grants are read back and verified.
- **Stock migration:** [vendor-storefronts PR #13](https://github.com/shahlal07/vendor-storefronts/pull/13) merged and applied to active Supabase under migration version `20261022180345` (`20261022_fail_closed_order_stock_races`). Production read-back confirms row locks, shortage/vendor/product checks, expected order decrement/restock triggers and restricted execute grants.
- **Zero-cost CI:** post-merge GitHub Actions [#39828688758](https://github.com/shahlal07/vendor-storefronts/actions/runs/39828688758) passed the app-quality and PostgreSQL integration jobs. The synthetic PostgreSQL 16 service tested order rollback, last-unit concurrency, NULL/missing stock, vendor/product mismatch, duplicate idempotency key without a second stock decrement, cancellation/refund restock once and legacy warning handling. No paid Supabase branch was created.
- **Versioned migration/acceptance doc:** [PR #15](https://github.com/shahlal07/vendor-storefronts/pull/15) aligns the repository migration filename to the applied version, updates the workflow path and records acceptance in [WA-01_ORDER_INTEGRITY.md](https://github.com/shahlal07/vendor-storefronts/blob/main/docs/WA-01_ORDER_INTEGRITY.md). Branch CI [#39828972072](https://github.com/shahlal07/vendor-storefronts/actions/runs/39828972072) passed.
- **Boundaries:** fees and settlement behavior are unchanged (active runtime price Rs 20/order and Rs 7,000/month; old Rs 5,999 note is stale and is not authorization to change pricing). Full authenticated production checkout E2E was not run, to avoid creating a real order and mutating stock; later WhatsApp live acceptance must include a controlled test. No signed Meta webhook/verified-phone conversion exists yet.
- **Next phase readiness:** WA-02, WA-03 and WA-04 are Ready; WA-05 stays blocked until WA-02–WA-04 and controlled pilot gates are complete.


## WhatsApp Commerce Phase 0 — 2026-10-22

- **Audit:** [docs/WHATSAPP_COMMERCE_PHASE_0_AUDIT.md](docs/WHATSAPP_COMMERCE_PHASE_0_AUDIT.md). WA-00 is complete; scope is architecture/readiness, not a whole-app security certification.
- **Canonical data path:** every confirmed WhatsApp sale must land in public.orders and reuse existing inventory, fee-snapshot, notification, refund-credit and settlement mechanisms. WhatsApp intents/events are not orders and must not be billed.
- **WA-01 order-engine gate:** complete. Checkout idempotency, direct-order-write lockdown, guest-order lookup/rate-limit security remediations, and fail-closed stock decrement are merged/deployed. Free GitHub Actions PostgreSQL integration tests passed for rollback, last-unit concurrency, duplicate idempotency keys, and cancel/refund restock. No paid Supabase branch was created. Current runtime fees remain Rs 20/order and Rs 7,000/month; stale Rs 5,999 documentation must be reconciled before any price change. Verified WhatsApp identity mapping and signed event-to-order conversion remain WA-04 work.
- **Provider gate:** use official Meta Cloud API. Vendor-owned numbers require an authorized onboarding model (Embedded Signup/Tech Provider approval where applicable) and vendor consent. Do not declare live readiness without authorized Meta credentials, webhook subscriptions and an actual send/receive verification.
- **Non-goals during the audit:** no code/schema/production changes and no real charges/refunds/payouts.

## BRAIN-002 — Phase 1 security audit (2026-10-18)

- **Live project verified:** Supabase project `new nashemann` (`eznxsosvsgkhexbjoolh`), ACTIVE_HEALTHY.
- **RLS baseline:** Supabase reports RLS enabled on all 36 tables in the `public` schema. This is a positive baseline, not proof that policies are correct.
- **Confirmed high-priority finding:** `public.find_orders_by_contact(text, uuid)` is a SECURITY DEFINER RPC executable by `anon` and `authenticated`; it returns `SETOF orders` when given only a contact (email/phone) and vendor ID. The vendor storefront used it for guest order history, exposing order rows with delivery/payment data to anyone who knew a contact value.
- **Remediation in progress:** [vendor-storefronts PR #9](https://github.com/shahlal07/vendor-storefronts/pull/9) now moves guest lookup behind a server action, rate-limits requests, resolves the vendor from the request host, returns only an explicit field allowlist, removes both direct client RPC wrappers, and adds a migration revoking browser-role execution on both lookup RPCs. **CI passed** for the expanded PR commit. The migration is not applied; wait until the new UI is deployed.
- **Second high-priority finding:** `public.check_and_record_rate_limit(text, text, integer, integer, integer)` is SECURITY DEFINER, executable by anon/authenticated, and accepts caller-controlled bucket, identifier, attempt threshold, window and lock duration while mutating private rate-limit state. Active buckets include `chat`, `checkout`, `newsletter`, `storefront_api` and `admin_groq`.
- **Remediation in progress:** [vendor-storefronts PR #10](https://github.com/shahlal07/vendor-storefronts/pull/10) and [vendor-admins PR #9](https://github.com/shahlal07/vendor-admins/pull/9) move all confirmed app call sites to a server-only service-role helper; PR #10 adds a migration granting the RPC only to `service_role`. Apply that migration only after both app changes are deployed.
- **Other findings to investigate, not blanket-fix:** Supabase security advisors flag `public.public_business_settings` as a SECURITY DEFINER view (ERROR); 19 SECURITY DEFINER RPCs executable by anon; 52 executable by authenticated users; and five RLS-enabled tables with no policies (three private rate-limit tables and two public-schema platform-email tables). I inspected the view projection: it exposes business/support contact, social, shipping, welcome-discount, and COD settings, with no obvious secret columns; however, the view still bypasses underlying RLS and needs a deliberate invoker-safe/public-data design or a documented exception. Some RPCs are intentionally public or role-gated, so inspect authorization and call sites individually.
- **Auth hardening:** Supabase reports leaked-password protection disabled. Confirm impact and change via the supported Auth configuration before closing the task.
- **Verification still required:** authenticated/anonymous role tests, cross-vendor isolation, view access review, per-RPC authorization review, and post-deployment verification. No production database permissions have been changed by this audit yet.

## BRAIN-011 — Co-Founder Platform
- Plan: [docs/COFOUNDER_PLATFORM_INTEGRATION.md](COFOUNDER_PLATFORM_INTEGRATION.md)
- PR: [#20 — Fix founder access and deploy cofounder workspace](https://github.com/shahlal07/nashemann-admin/pull/20) (merged).
- Production: `master` commit `7fdb17d8ab36ad447ffb2974972fb7dd91d11feb`; Vercel deployment is READY and aliases `https://superadmin.nashemann.store`.
- Included: separate owner login/shell, server-side active-membership guard, live overview backed by Supabase RLS, Super Admin-only founder provisioning, explicit duplicate-email confirmation, owner credential editing, and login-email display.
- Build verification: Vercel build succeeded; TypeScript completed; static generation passed 31/31; route table includes `/owner-login`, `/owner-management`, and `/owners`.
- Not yet accepted as end-to-end complete: test authenticated owner login, create/update credentials, duplicate-email path, inactive membership, direct unauthorized route/API attempts, and RLS with real sessions. No owner accounts were created during this release; previously observed owner membership count was zero.
- Safety note: provision only the intended founder identities and confirm responsibilities/capabilities. Existing staff/admin and vendor-linked identities are rejected. Do not treat this one release as evidence that the other marketplace/security/finance tasks are complete.
- Remaining approval-rule decisions: owner responsibility assignments, approval quorum/self-approval rules, account suspension/revocation lifecycle, and whole-platform tests.

## Previously reported repo issues — verify live status
- [nashemann-web #5](https://github.com/shahlal07/nashemann-web/issues/5) — customer order journey.
- [vendor-admins #6](https://github.com/shahlal07/vendor-admins/issues/6) — vendor operations/security/tenant isolation.
- [nashemann-admin #11](https://github.com/shahlal07/nashemann-admin/issues/11) — platform controls and financial audit trail.
- [vendor-storefronts #6](https://github.com/shahlal07/vendor-storefronts/issues/6) — storefront routing/catalog/isolation/checkout handoff.

These links come from prior project notes; check live status before relying on them.

## Required fields for new tasks
Task ID, priority, owner role, target repo(s), scope/non-goals, dependencies/risks, acceptance criteria, tests required, issue/branch/PR links, status, last update and next action.