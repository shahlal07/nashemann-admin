# Architecture & Integration Map

## Confidence
The actual architecture is not yet fully verified by this brain. Treat this as a discovery checklist, not a claim that a particular integration is active.

## Initial code evidence — 2026-10-15\n- `nashemann-web/src/proxy.ts` states vendor storefronts are served by the `vendor-storefronts` deployment and intentionally returns 404 for vendor hostnames routed to the platform site. `nashemann-web/src/app/page.tsx` renders a platform marketing page. Do not treat this repository as the customer shopping app without further evidence.\n- `vendor-storefronts/src/app/checkout/actions.ts` creates orders from database-resolved product units. A draft fix in [vendor-storefronts PR #7](https://github.com/shahlal07/vendor-storefronts/pull/7) now checks resolved units against the request-host tenant as well as validating the submitted cart. This is not yet merged or test-verified.\n- The contract from platform marketing/domain links to storefront routes, and the authoritative customer order-history surface, remain unverified.\n\n## Boundaries to map
1. Customer browser → nashemann-web → catalog/cart/checkout/order services.
2. Vendor customer journey → vendor-storefronts → catalog and checkout/order handoff.
3. Vendor operator → vendor-admins → vendor-scoped products, inventory and orders.
4. Platform operator → nashemann-admin → platform controls, reports and financial audit trail.
5. Identify shared backend/data provider(s), authentication, payments, notifications, jobs, analytics and deployment platforms from code and provider settings.

## For each connection record
Producer/consumer, API/event contract, identity/authentication, authorization scope, authoritative data owner, retries/idempotency, failure handling, observability, evidence links and verification date.

## Security invariants to verify
- Vendors can only read/write their own authorized tenant data.
- Customer endpoints do not expose private vendor/customer data.
- Privileged admin access is checked server-side, not merely hidden in UI.
- Secrets are never committed or exposed to clients/logs.
- Database policies and server authorization agree; tests cover unauthorized access.
- Order, fee, subscription and settlement changes are auditable and protected against duplicate processing.
- Webhooks/retries are authenticated, idempotent and safe under concurrency.

Record consequential approved changes in DECISIONS.md. Never leave cross-repo contracts as undocumented assumptions.