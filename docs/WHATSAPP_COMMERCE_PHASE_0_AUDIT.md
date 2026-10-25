# WhatsApp Commerce Integration — Phase 0 Audit

**Audit date:** 2026-10-22  
**Scope:** Read-only review of the four active Nashemann application repositories, live Supabase schema and grants, current Vercel project/deployment/environment metadata, the open security pull requests relevant to order handling, and current official Meta WhatsApp Business Platform onboarding documentation.  
**Result:** **Phase 0 audit complete for the WhatsApp-commerce scope.** No application code, database schema, RLS policies, production secrets, live orders, financial records, or deployment settings were changed.

## 1. Executive conclusion

Nashemann already has the right canonical order and financial foundation. The real multi-tenant customer storefront is **vendor-storefronts**, the order-management panel is **vendor-admins**, and the platform/business onboarding and super-admin functions live in **nashemann-web** and **nashemann-admin**. The production storefront and its admin panel share the active Supabase backend, project **new nashemann** (reference **eznxsosvsgkhexbjoolh**).

WhatsApp is currently a **link-out channel**, not an integrated order channel. Product and support buttons build ordinary WhatsApp links. They do not create an order, persist a click/conversation/session, capture an incoming WhatsApp webhook, or attach a reliable source/channel value to a canonical order. No Meta webhook route, WhatsApp connection registry, or Meta/WhatsApp configuration variables were found in the reviewed production app environment names.

The implementation should not create a parallel WhatsApp orders table or an independent commission ledger. It should add a trackable conversation/order-intent layer, then create the actual sale through the existing **public.orders** order engine only after the customer submits a structured order confirmation. Existing database triggers should continue to own stock movements, fee snapshots, profit/cost snapshots, notices, and post-cancellation/refund billing adjustments.

Three implementation blockers need to be resolved early:
1. The existing billing function treats **pending** orders as chargeable. A WhatsApp click, inquiry, or abandoned draft must therefore never be written as a row in the canonical orders table.
2. The existing inventory trigger locks stock rows but clamps a decrement at zero instead of failing an order when stock is no longer available. Concurrent checkouts can therefore create more orders than available units.
3. Two security fixes remain in open pull requests: anonymous guest order lookup can return full order rows using only a contact + vendor ID, and the generic SECURITY DEFINER rate-limit RPC is still callable directly by browser roles. Resolve, deploy, and verify these items before exposing production WhatsApp endpoints.

The current database setting says **Rs 20 per-order fee** and **Rs 7,000 monthly fee**. The shared finance baseline documented in Project Brain says **Rs 20 per eligible order** and **Rs 5,999 monthly subscription**. The monthly discrepancy is real and must be reconciled by Finance/Product before the next billing change; this audit did not change it.

## 2. Audited system map

### Active application repositories

| Repository | Responsibility established from code/docs | Current production evidence |
|---|---|---|
| [nashemann-web](https://github.com/shahlal07/nashemann-web) | Platform website, marketplace directory, platform accounts, vendor applications and platform-level workflows. It is not the authoritative vendor checkout. | Vercel production deployment reported READY on branch master at commit d89b0b1; domain nashemann.store. |
| [nashemann-admin](https://github.com/shahlal07/nashemann-admin) | Super-admin, finance/settlements, shared Project Brain and governance tasks. | Vercel production deployment reported READY on master at commit 3010cfa; domain superadmin.nashemann.store. |
| [vendor-storefronts](https://github.com/shahlal07/vendor-storefronts) | Real host-resolved multi-tenant storefront, catalogue, cart, checkout, order tracking, and present-day WhatsApp link generation. | Vercel production deployment reported READY on main at commit 65e481d; vendor store subdomains are attached. |
| [vendor-admins](https://github.com/shahlal07/vendor-admins) | Vendor order management, fulfilment, inventory, vendor reports and billing pages. Shares the storefront backend. | Vercel production deployment reported READY on main at commit 5cb6a7c; vendor admin domains are attached. |

These Vercel states confirm that deployments exist and the provider reports them as READY; they do **not** constitute an end-to-end browser, tenant-isolation or live WhatsApp test. Current main/master application code and production database were inspected read-only through connected GitHub, Supabase and Vercel tools. I did not have a local checked-out workspace here in which to execute each repository's test/build scripts.

### Repository scope and stale documentation

- Project Brain (in nashemann-admin) identifies the four repositories above as the active delivery scope. The private **nashemann** repository is reference-only unless the founder changes that decision.
- The nashemann-web CLAUDE.md says its Supabase project is the old project **mztayodmvdpzzwzznsvu**. That is stale relative to the Vercel production environment metadata inspected for nashemann-web: its public Supabase URL maps to the active project **eznxsosvsgkhexbjoolh**. Update the developer notes so agents do not accidentally query or migrate the inactive project.
- Project Brain's security snapshot says 36 public tables. The live active Supabase project now exposes 86 public tables, with RLS reported enabled across that public schema. RLS being enabled does not prove that every policy or SECURITY DEFINER function is safe.
- The active production environment-variable names include Supabase URL/anon-key/service-role, app URL, and—in nashemann-admin—cron, provisioning, email and AI service configuration. No variable names matching META_* or WHATSAPP_* were found among the four Vercel projects' retrieved configuration metadata. Secret values were not recorded in this audit.
- vendor-storefronts and vendor-admins have current, separate application histories; do not copy routes/actions between them without respecting their different auth/RLS clients and Next.js configuration.

## 3. Existing WhatsApp implementation (verified)

### Relevant code

- **vendor-storefronts/src/app/product/[slug]/page.tsx** loads vendor/site settings and passes **settings.support_whatsapp** into the product purchase panel.
- **vendor-storefronts/src/components/product-purchase-panel.tsx** renders “Order Quickly via WhatsApp”.
- **vendor-storefronts/src/components/product-card.tsx** renders a WhatsApp action on product cards.
- **vendor-storefronts/src/components/whatsapp-button.tsx** is a generic support/contact link.
- **vendor-storefronts/src/lib/whatsapp.ts** builds pre-filled link URLs for general inquiry, product order, payment issue, payment proof and order tracking.

The current product detail link pre-fills product name and, for fruit, the selected box size. It does not carry the full authoritative variant selection, selected add-ons, quantity, a server-created session reference, a verified order intent, or a checkout/confirmation token. The product-card action likewise opens WhatsApp with a product name/default size. The utilities return a wa.me link; clicking it does not call Nashemann's backend.

The current schema contains the contact fields **vendors.whatsapp_number**, **business_settings.support_whatsapp** and **business_settings.whatsapp_order_message_template**. Those are contact/link configuration, not a connected Cloud API integration. The orders schema has no order-source/channel or WhatsApp-session attribution column. No Meta Cloud API inbound webhook or durable WhatsApp event processing path was found in the current storefront app tree.

**Consequence:** an order completed privately in the WhatsApp app is invisible to Nashemann unless the vendor/customer re-enters the sale into the existing order system or another integration makes the order record. Link analytics alone would only measure the click; it cannot prove a completed sale.

## 4. The canonical order engine and money flow

### Current web checkout

**vendor-storefronts/src/app/checkout/actions.ts** performs server-side resolution and validation before inserting into the existing orders table. It re-resolves submitted item/variant IDs, checks active/published status and stock, rejects mixed-vendor carts, derives selling prices from database rows, recalculates shipping and discounts, checks available COD/payment settings and selected payment-account/vendor ownership, and then inserts the order. It sends confirmation emails after the insert. It is the correct integration point for shared validation/price logic, not a reason to add a second order pipeline.

Orders currently contain the customer ID, vendor ID, item snapshots in JSONB, delivery details, subtotal, shipping, discount, total, fulfillment status, payment status, profit/cost snapshots, financial fee snapshots, and a nullable idempotency key.

**Identity constraint:** the current order schema requires customer_id (NOT NULL), and normal checkout is tied to an authenticated customer. WhatsApp messages may arrive from a number that has never signed into a Nashemann storefront. Phase 1 must deliberately solve this guest/verified-phone identity case and the RLS/customer order-history implications. Do not create fictitious Auth users or silently weaken RLS as a shortcut. If changing customer_id nullability is chosen, audit every consumer, RLS policy, order notification and tracking path first.

### Order operations

**vendor-admins/src/app/admin/orders/actions.ts** performs authenticated vendor-admin status/tracking updates and audit logging. The existing fulfillment statuses are pending, confirmed, packed, shipped, delivered, cancelled and refunded. The status and payment-status fields are distinct, so code must continue to account for both when determining revenue/refunds.

### Database side effects on a canonical order

The live orders table has triggers for:
- order-insert stock decrement;
- order profit/cost snapshot;
- per-order SaaS plan fee snapshot;
- transaction/platform fee calculation;
- order creation/status notifications;
- referral reward logic;
- post-cancel/refund stock restock; and
- cancellation/refund fee-credit adjustments for eligible per-order-plan settlements.

This is why the integration must commit exactly one validated order into the established orders table. A new WhatsApp-specific financial ledger would risk omitting or duplicating these effects.

### Two separate fee concepts must not be conflated

1. **Order-level platform/payment fee:** orders.platform_fee_amount / platform_fee_percent_snapshot are set by compute_order_platform_fee(), reading platform_settings and optional vendor overrides.
2. **Nashemann SaaS plan billing:** orders.vendor_plan_fee_amount is snapshotted by snapshot_vendor_plan_fee(). The active pricing row says per_order_fee = Rs 20 and monthly_fee = Rs 7,000. The settlement generator sums per-order snapshots for per_order-plan vendors or uses the monthly fee for monthly-plan vendors.

The second is the existing Rs 20 eligible-order commercial model. WhatsApp should use this same billing engine; it should not calculate a new fee in application UI or invent a third “WhatsApp commission”.

### Actual current billing eligibility rule

The live public.generate_monthly_settlements(date) definition was inspected. It includes orders created within the target month when:
- status is not cancelled or refunded; and
- payment_status is neither refunded nor failed.

It does **not** require status = confirmed/delivered, nor payment_status = paid. Therefore pending orders are currently eligible unless later cancelled/refunded or payment failed/refunded. Settlement generation is unique on (vendor_id, month), skips an existing monthly settlement on conflict, and captures the vendor plan/unit fee snapshot. Cancellation/refund after invoicing creates a negative settlement adjustment, deduplicated by source_order_id, instead of rewriting the historical invoice.

**Required product/finance decision:** keep existing eligibility unchanged for the WhatsApp launch or approve a deliberate commercial-rule change with migration, historical behaviour and tests. Under the current rule, a structured customer-confirmed order may become chargeable when it is inserted as pending; a click, general enquiry, incomplete draft or abandoned chat must not be inserted into orders at all. Keep such activity as non-chargeable order intents until the customer has actually submitted a valid order confirmation.

## 5. Data integrity and security findings

### P0 — Current checkout doesn't use database-supported idempotency

Live database evidence: the orders table has a unique index on idempotency_key, but the normal checkout insert does not supply the key. The live aggregate query returned 28 orders and 28 orders with a NULL idempotency key. A double click, retry after a lost response, or provider webhook retry could therefore create duplicate rows and repeat stock decrements, notices and fee snapshots unless the calling path adds a stable idempotency boundary.

**Phase 1 requirement:** implement a server-generated/request-bound idempotency key and a unique database-level conversion key for a WhatsApp intent; on retry, return the existing order result rather than inserting a new order. Do not trust a key generated only by untrusted browser input without scoping it to the verified customer/session and payload.

### P0 — Inventory trigger does not fail closed on a stock race

The live public.adjust_stock_for_order_items() function locks the stock row using FOR UPDATE, but computes the new stock as greatest(current stock + direction × quantity, 0). It records the actual adjustment in inventory_audit_log but clamps an insufficient balance to zero rather than aborting the order. Checkout checks stock in earlier SELECTs; those checks are not an atomic stock reservation with the later order insert.

**Failure mode:** two concurrent requests can each pass the earlier stock check. The subsequent trigger can serialize the row locks but still commit both orders, reducing inventory to zero rather than rejecting one order. The second order has no available item even though the row never goes negative.

**Phase 1 requirement:** move stock availability and decrement into an atomic transaction/conditional update that fails the whole order on any shortage, with tests for the last unit and multi-item rollback. Do this in the shared canonical engine so web and WhatsApp receive the same guarantee.

### P0 — Anonymous guest order lookup is still exposed in the live database

The live function public.find_orders_by_contact(text, uuid) is SECURITY DEFINER, executable by anon and authenticated, and returns SETOF orders for every order whose delivery phone/email matches a supplied contact and vendor ID. That response shape includes far more than safe order-tracking fields.

- [vendor-storefronts PR #9](https://github.com/shahlal07/vendor-storefronts/pull/9) is open, not merged. It moves guest lookup to a server action, requires order number plus contact, resolves vendor from request host and returns an allowlist; the accompanying DB grant migration is not applied.
- Until deployed and database grants are verified, treat guest order lookup as a live privacy/security risk. The presence of RLS does not protect a function that returns rows under SECURITY DEFINER.

### P0 — Arbitrary rate-limit mutation remains callable by browser roles

The live public.check_and_record_rate_limit(text, text, integer, integer, integer) is SECURITY DEFINER and executable by anon/authenticated. Its parameters let callers choose the bucket, identifier, limit, time window and lock duration while mutating shared private rate-limit state.

- [vendor-storefronts PR #10](https://github.com/shahlal07/vendor-storefronts/pull/10) is open, not merged. It switches the helper to server-only/service-role execution and contains a grant migration that revokes execution from PUBLIC/anon/authenticated.
- [vendor-admins PR #9](https://github.com/shahlal07/vendor-admins/pull/9) is open, not merged. It updates its helper/call sites to use the service-role client. Its PR description says Vercel preview is READY but the repository's independent Actions test workflow did not run for that PR branch.
- Deploy both compatible app changes first; then apply the grant migration and verify actual role privileges against the live project. Do not revoke the RPC while a deployed app still relies on the old browser-role path.

The live project exposes 71 SECURITY DEFINER functions in public; 19 are executable by anon and 52 by authenticated roles. That count is not a finding that every function is exploitable: functions such as a public vendor-host resolver or coupon validation can be intended, but each privileged function requires a documented authorization/call-site justification. The Supabase advisor/project notes also flag the SECURITY DEFINER public_business_settings view; retain a deliberate public-field allowlist and verify the view's security_invoker/RLS semantics. The wider BRAIN-002 audit remains separate work and must not be treated as closed by this WhatsApp audit.

### P1 — Pricing settings contradict the approved finance baseline

The live platform_pricing row returns per_order_fee = 20 and monthly_fee = 7000. The shared Project Brain finance baseline says Rs 5,999 monthly. Both may be deliberate due to a recent price change or a stale baseline, but the source-of-truth rule is unresolved. Do not modify active pricing or run an invoice/billing recalculation as part of Phase 0.

### P1 — Guest/WhatsApp orders require a vetted identity and tenant boundary

The orders table has RLS enabled; insert policy requires customer_id = auth.uid(), customer reads are limited to their own rows, and vendor staff reads/updates are scoped to their current vendor. A Meta webhook does not carry a Supabase auth user session and must never choose vendor_id based on browser payload or arbitrary text. The server should resolve the connection's registered phone_number_id to an active vendor, validate the opaque order-intent reference against that vendor, derive price/availability from DB rows, and insert using a tightly scoped server-side path.

### P1 — Duplicate-looking tables need use-site verification before any cleanup

The live schema includes tables such as storefront_orders, storefront_products and vendor_monthly_settlements as well as the documented orders/settlements/settlement_payments/settlement_adjustments model. The code paths inspected for current checkout and billing point to orders and settlements. Their existence alone does not prove whether the similarly named tables are unused. Do not place WhatsApp order records in them or delete them until all repositories, SQL functions, RLS policies, reports and cron jobs are searched for references.

## 6. Required WhatsApp architecture (Phase 1 implementation contract)

### Mode A — shared Nashemann-managed WhatsApp number

- The shared number is a centrally configured integration, not inferred from a vendor-controlled message.
- When a storefront opens WhatsApp, the server first creates a short-lived, high-entropy order-intent/session token and stores its hash plus vendor ID, origin URL, selected item/variant IDs, requested quantity/add-ons, creation/expiry, and state. Prefilled text may include an opaque reference, never an authoritative price/vendor ID. A customer can edit that text, so the server must validate that the reference exists, is unexpired and belongs to the routed vendor.
- The incoming message arrives on the shared phone number. The webhook validates Meta's signature, deduplicates and persists the event, parses the reference, and loads the intent from the database; an absent or invalid reference goes to general inquiry/agent handling, not automatic order creation.
- The buyer must submit an explicit structured final order confirmation. The server revalidates item status, inventory, choices, current prices and shipping at conversion time. Only the final conversion creates one canonical order.

### Mode B — vendor-owned WhatsApp Business numbers

- Maintain a first-class registry mapping each connected vendor to provider type, WhatsApp Business Account ID, phone-number ID, connection status, granted scopes, onboarding actor/time and credential reference. Store tokens in server-side encrypted secret storage, never in a browser-readable DB row or a NEXT_PUBLIC_* variable.
- Inbound routing uses the verified webhook phone_number_id → connected-number registry → active vendor. The browser must never supply a trusted vendor_id or connection ID.
- Vendors explicitly authorize connecting their business. Reauthorization, disconnect/revocation, phone-number replacement and failed onboarding need clear state and audit history.
- A multi-vendor SaaS onboarding flow should be designed around Meta Embedded Signup/Tech Provider requirements, not a request for vendors to paste long-lived access tokens into an ordinary form. Meta's current official Embedded Signup documentation says a released app requires App Review and Advanced Access to business_management and whatsapp_business_management permissions; the setup includes WABA/system-user/phone registration and template setup. See the sources below.

### Shared engineering components for both modes

1. **Canonical order conversion service:** the same item and vendor validation, price/shipping/discount logic, order insert and financial snapshots as web checkout, refactored into a shared server-side boundary rather than cloning rules.
2. **Non-order intent state:** WhatsApp clicks, inbound questions, incomplete carts, draft summaries and abandoned conversations are not rows in orders and never enter settlement calculations.
3. **Durable webhook intake:** GET verification endpoint, POST signature validation over the raw body using META_APP_SECRET and X-Hub-Signature-256, request-size/content validation, provider message/event unique keys, durable event insert before acknowledgement, and asynchronous processing with bounded retries/backoff/dead-letter visibility. Do not rely on process-local maps or in-memory work as a queue on Vercel/serverless.
4. **Idempotent conversion and outbox:** a unique intent→order conversion constraint; deduplication of provider message IDs/status callbacks; an outbox or durable task record for any outbound message so retries do not double-create an order or financial event.
5. **Explicit status and consent rules:** distinguish customer service replies from business-initiated notifications; use approved templates and consent/policy-compliant messaging where required. Track delivery/read/failure callbacks separately from order state.
6. **Tenant-aware UX and auditing:** platform super-admin view of connected accounts and failure state; vendor admin only sees its own connected number, WhatsApp sessions and derived orders; audit all connection changes, manual reconciliations, order confirmations, cancellations and fee adjustments.
7. **Privacy/retention:** minimize stored message content and redact logs; retain only the conversation data needed for an order, audit and support period; define deletion/export handling before large-scale rollout.

### Minimal data model concept (not migrations yet)

- **whatsapp_connections**: vendor mapping, shared/vendor-owned mode, WABA/phone-number IDs, connection state, encrypted secret reference, consent/onboarding metadata and audit fields.
- **whatsapp_webhook_events**: unique provider event/message identifier, connection reference, received/processed state, event type/timestamps, minimal/redacted payload, attempt count and error metadata.
- **whatsapp_order_intents**: opaque token hash, vendor and source, item/variant/add-on snapshot, requested quantity, customer contact reference, expiry/status, explicit customer-confirmed time and conversion idempotency key. It contains intents, not an alternate order ledger.
- **orders channel attribution**: a constrained source/channel (web, whatsapp_shared, whatsapp_vendor, and any approved manual source), plus optional intent/connection references. Store the canonical order and its channel audit together; don't make a second order table.
- **durable outbox/worker records**: only where needed for delivery retries and recoverability, with uniqueness keys for one intended outbound message.

Exact table design, customer identity linkage and whether channel attribution should be an order column or a unique child table should be agreed against all existing consumers before migration. Do not create these tables in Phase 0.

## 7. Meta account and production enablement gates

Current app/config inspection found no META/WHATSAPP environment variable names configured in the four Vercel projects. The user also reported that Meta's phone verification SMS was not arriving and attempts were rate-limited. This does not block the code/schema design, test harness or simulated webhook suite, but it blocks a fully authenticated live send/receive test.

Official resources reviewed:
- [Meta's WhatsApp Business Platform overview (official Postman workspace)](https://www.postman.com/meta/whatsapp-business-platform/overview): distinguishes the official Cloud API, Business Management API and Embedded Signup.
- [Meta's Embedded Signup documentation (official Postman workspace)](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup): documents the onboarding process and release requirements including App Review/Advanced Access; the required endpoints include WABA discovery, system-user assignment, number registration and template discovery.
- [Meta's WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api?action=share&creator=22794852): official Cloud API endpoints and prerequisites.
- [Meta's webhook documentation](https://www.postman.com/meta/whatsapp-business-platform/folder/lboq68h/webhooks): HTTPS webhook setup and subscription context.
- [Meta's phone registration documentation](https://www.postman.com/meta/whatsapp-business-platform/folder/zuoeksl/registration): phone ownership verification via SMS/voice and API registration.

Never commit populated tokens/app secrets or return them to the browser. The initial implementation can use test payloads and server-only blank environment placeholders, but do not declare the integration production-ready until Meta credentials, subscriptions, the right app permissions, an authorized test sender and a successful real inbound/outbound event cycle are verified.

## 8. Phase plan and acceptance requirements

### Phase 0 — audit and architecture decision — DONE

Evidence collected across four active repositories, the live production backend, schema, key function definitions, relevant RLS policies, open security PR states and Vercel production deployment metadata. This report is the durable audit record. No production writes were made.

### Phase 1 — harden and define the canonical order contract — next

- Agree the precise meaning of “eligible order” and resolve Rs 5,999 vs Rs 7,000 monthly pricing with Finance.
- Resolve the guest/verified-phone customer identity path without weakening tenant isolation.
- Implement shared conversion logic, channel attribution and robust idempotency.
- Make stock decrement atomic and fail the whole order on shortage.
- Close/deploy/verify the open guest lookup and generic rate-limit fixes with safe app-before-migration sequencing.
- Define audit logs and compensating adjustments for cancellation/refund.

**Acceptance tests:** repeated request returns one order; same webhook twice returns one order; last-unit concurrent checkout allows only one order; wrong-vendor token rejected; price comes from DB not payload; click/inquiry/abandoned intent makes no order and no fee; explicit final confirmation creates one order; later cancellation/refund restocks once and creates at most one appropriate fee credit; vendor sees only their own order; guest lookup exposes only intended fields after order-number + contact checks; anonymous direct RPC calls to revoked helpers fail.

### Phase 2 — number registry and dual-mode routing

- Implement shared-number routing and connected vendor-number registry/onboarding state.
- Build vendor/super-admin UX for connect, health, revoke/disconnect and error visibility.
- Keep every connection mapped to exactly one intended active vendor.
- Test one shared number against multiple vendor intents and at least two isolated vendor-owned numbers.

### Phase 3 — official Meta adapter + durable webhooks

- Implement GET challenge verification, raw-body signature verification, idempotent POST event intake, durable processing/retries/dead-letter/replay controls and message status handling.
- Implement the server-side Cloud API send adapter and policy/template-aware messaging.
- Use test fixtures first; real API testing is blocked until credentials/onboarding are authorized.

### Phase 4 — conversation-to-order customer/vendor workflow

- Send a structured item/order summary with a safe confirmation action.
- Capture the customer's explicit confirmation and verified contact details.
- Let vendor staff accept/reject/manage canonical orders in existing vendor-admins instead of building a duplicate dashboard.
- Preserve status/confirmation history and WhatsApp message references without treating delivery/read statuses as sales.

### Phase 5 — adversarial QA, pilot and production sign-off

- Run test/build/lint/type checks in every changed repository, review remote CI, test deployed preview against a non-production dataset, and exercise signed webhook replay and negative cases.
- Confirm the Meta app/number/permissions/templates, secret storage, webhook subscription, live inbound/outbound message delivery and disconnect recovery.
- Pilot with one shared number and one consenting vendor-owned number; reconcile canonical orders against vendor confirmations before expanding.
- Promote only after explicit acceptance from Product/Finance and verified no-double-order/no-double-stock/no-double-fee cases.

## 9. Outstanding items that are not Phase 0 omissions

These are intentionally subsequent build/enablement gates, not reasons to leave the audit incomplete: implementation of the new tables/routes/UI; applying migrations; merging and deploying security PRs; authenticated guest/tenant runtime tests; local build/test runs from a checked-out workspace; resolving the commercial monthly price discrepancy; Meta account verification/App Review/permissions; connecting phone numbers; and a real WhatsApp send/receive test.

The broader app-wide audit backlog (BRAIN-001 through BRAIN-010, including every public SECURITY DEFINER function, all tenant policies, settlements/reconciliation and all route-level checks) remains open where its own acceptance evidence is still missing. Completing the WhatsApp Phase 0 audit is not a blanket security certification for all of Nashemann.

---

**Phase 0 exit decision:** proceed to Phase 1 with this architecture, with production WhatsApp enablement blocked until the P0 order/inventory/idempotency and live RPC security risks above are addressed and verified.

**Source repository references:**
- [Product WhatsApp CTA](https://github.com/shahlal07/vendor-storefronts/blob/main/src/components/product-purchase-panel.tsx)
- [WhatsApp link builders](https://github.com/shahlal07/vendor-storefronts/blob/main/src/lib/whatsapp.ts)
- [Current checkout/order write](https://github.com/shahlal07/vendor-storefronts/blob/main/src/app/checkout/actions.ts)
- [Tenant resolution](https://github.com/shahlal07/vendor-storefronts/blob/main/src/lib/tenant.ts)
- [Vendor order status operations](https://github.com/shahlal07/vendor-admins/blob/main/src/app/admin/orders/actions.ts)
- [Settlement generation/finance actions](https://github.com/shahlal07/nashemann-admin/blob/master/src/app/settlements/actions.ts)
