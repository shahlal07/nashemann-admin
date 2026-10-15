# Master Task Tracker

Use this shared view for cross-repository priorities. Detailed technical discussion stays in repo issues/PRs; link them here. Statuses: Backlog, Ready, In progress, Blocked, In review, Done. Do not mark Done without acceptance evidence and an updated changelog/status.

| ID | Priority | Task | Repo(s) | Accountable role | Status |
|---|---|---|---|---|---|
| BRAIN-001 | P0 | Audit code, issues/PRs and integrations across all four repos | All four | All owners, coordinated by Tech | In progress |
| BRAIN-002 | P0 | Verify auth, authorization and tenant isolation; add regression tests | Relevant repos | Product & Technology | In progress |
| BRAIN-003 | P0 | Trace order lifecycle and guard against duplicate/lost/unauthorized transitions | All relevant repos | Tech + Operations | In progress |
| BRAIN-004 | P1 | Validate vendor onboarding, product/inventory and fulfilment | vendor-admins | Marketplace & Operations | Ready |
| BRAIN-005 | P1 | Map and validate platform-to-storefront handoff, customer checkout, confirmation and order history | nashemann-web + vendor-storefronts | Product & Technology | In progress |
| BRAIN-006 | P1 | Validate storefront routing, catalog accuracy and checkout handoff | vendor-storefronts | Product & Technology | In progress |
| BRAIN-007 | P0 | Audit Rs.20 order fee, eligibility rule and Rs.5,999 subscription | Admin + relevant code | Finance + Tech | Ready |
| BRAIN-008 | P0 | Audit settlement/reconciliation idempotency, concurrency and auditability | Admin + relevant code | Finance + Tech | Ready |
| BRAIN-009 | P1 | Verify privileged admin actions are authorized and logged | nashemann-admin | Finance + Tech | Ready |
| BRAIN-010 | P1 | Verify CI/build/test/release/rollback evidence | All four | Product & Technology | In progress |

## Previously reported repo issues — verify live status
- [nashemann-web #5](https://github.com/shahlal07/nashemann-web/issues/5) — customer order journey.
- [vendor-admins #6](https://github.com/shahlal07/vendor-admins/issues/6) — vendor operations/security/tenant isolation.
- [nashemann-admin #11](https://github.com/shahlal07/nashemann-admin/issues/11) — platform controls and financial audit trail.
- [vendor-storefronts #6](https://github.com/shahlal07/vendor-storefronts/issues/6) — storefront routing/catalog/isolation/checkout handoff.

These links come from prior project notes; check live status before relying on them.\n\n## Active Product & Technology work — 2026-10-15\n- [vendor-storefronts PR #7](https://github.com/shahlal07/vendor-storefronts/pull/7): checkout line validation and regression tests; draft, not merged.\n- [vendor-storefronts issue #6](https://github.com/shahlal07/vendor-storefronts/issues/6): storefront routing/isolation audit; finding and PR linked in issue comments.\n- [nashemann-web issue #5](https://github.com/shahlal07/nashemann-web/issues/5): customer journey audit; cross-repo checkout gap and next actions recorded in issue comments.

## Required fields for new tasks
Task ID, priority, owner role, target repo(s), scope/non-goals, dependencies/risks, acceptance criteria, tests required, issue/branch/PR links, status, last update and next action.