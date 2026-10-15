# Architecture & Integration Map

## Confidence
The actual architecture is not yet fully verified by this brain. Treat this as a discovery checklist, not a claim that a particular integration is active.

## Boundaries to map
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