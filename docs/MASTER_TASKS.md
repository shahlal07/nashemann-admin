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
| BRAIN-011 | P1 | Deploy role-based Co-Founder / Owner Platform while preserving Super Admin; finish authenticated acceptance tests | nashemann-admin (initial release) | Product & Technology + Finance/Governance | In review |

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