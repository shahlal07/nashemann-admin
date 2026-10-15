# Master Task Tracker

Use this shared view for cross-repository priorities. Detailed technical discussion stays in repo issues/PRs; link them here. Statuses: Backlog, Ready, In progress, Blocked, In review, Done. Do not mark Done without acceptance evidence and an updated changelog/status.

| ID | Priority | Task | Repo(s) | Accountable role | Status |
|---|---|---|---|---|---|
| BRAIN-001 | P0 | Audit code, issues/PRs and integrations across all four repos | All four | All owners, coordinated by Tech | Ready |
| BRAIN-002 | P0 | Verify auth, authorization and tenant isolation; add regression tests | Relevant repos | Product & Technology | Ready |
| BRAIN-003 | P0 | Trace order lifecycle and guard against duplicate/lost/unauthorized transitions | All relevant repos | Tech + Operations | Ready |
| BRAIN-004 | P1 | Validate vendor onboarding, product/inventory and fulfilment | vendor-admins | Marketplace & Operations | Ready |
| BRAIN-005 | P1 | Validate browsing, cart/checkout and order confirmation | nashemann-web | Product & Technology | Ready |
| BRAIN-006 | P1 | Validate storefront routing, catalog accuracy and checkout handoff | vendor-storefronts | Product & Technology | Ready |
| BRAIN-007 | P0 | Audit Rs.20 order fee, eligibility rule and Rs.5,999 subscription | Admin + relevant code | Finance + Tech | Ready |
| BRAIN-008 | P0 | Audit settlement/reconciliation idempotency, concurrency and auditability | Admin + relevant code | Finance + Tech | Ready |
| BRAIN-009 | P1 | Verify privileged admin actions are authorized and logged | nashemann-admin | Finance + Tech | Ready |
| BRAIN-010 | P1 | Verify CI/build/test/release/rollback evidence | All four | Product & Technology | Ready |
| BRAIN-011 | P1 | Design and integrate role-based Co-Founder / Owner Platform while preserving Super Admin | All four; initial target nashemann-admin | Product & Technology + Finance/Governance | In progress |

## BRAIN-011 — Co-Founder Platform
- Plan: [docs/COFOUNDER_PLATFORM_INTEGRATION.md](COFOUNDER_PLATFORM_INTEGRATION.md)
- Issue: [nashemann-admin #15](https://github.com/shahlal07/nashemann-admin/issues/15)
- Planning branch: `product/cofounder-platform-alignment`
- Current scope: architecture, permission boundaries, and integration readiness. No application code, schema, role, or production behavior has changed in this task yet.
- Acceptance includes confirmed founder responsibilities and approval rules, server-side owner authorization, unchanged Super Admin behavior, preserved tenant isolation, auditability, and actual test evidence.

## Previously reported repo issues — verify live status
- [nashemann-web #5](https://github.com/shahlal07/nashemann-web/issues/5) — customer order journey.
- [vendor-admins #6](https://github.com/shahlal07/vendor-admins/issues/6) — vendor operations/security/tenant isolation.
- [nashemann-admin #11](https://github.com/shahlal07/nashemann-admin/issues/11) — platform controls and financial audit trail.
- [vendor-storefronts #6](https://github.com/shahlal07/vendor-storefronts/issues/6) — storefront routing/catalog/isolation/checkout handoff.

These links come from prior project notes; check live status before relying on them.

## Required fields for new tasks
Task ID, priority, owner role, target repo(s), scope/non-goals, dependencies/risks, acceptance criteria, tests required, issue/branch/PR links, status, last update and next action.