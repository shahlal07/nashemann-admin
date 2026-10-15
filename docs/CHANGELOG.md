# Shared Project Changelog

Record meaningful changes newest first: date, task, repos, summary, PR/commit, tests/evidence, risks and next action.

## 2026-10-15 — Finance audit started (BRAIN-007/008/009)
- **Repository:** shahlal07/nashemann-admin.
- **Branch:** `finance/BRAIN-007-009-admin-finance-audit`.
- **Change:** Added `docs/FINANCE_AUDIT_2026-10-15.md`; documented code-level findings for billing cron, settlement actions, payment review, role gates, audit log and billing policy. Updated current status and master task tracker to reflect active audit work.
- **Evidence:** Read `docs/vendor-billing.md`, `src/app/api/cron/vendor-billing/route.ts`, `src/app/settlements/actions.ts`, `src/app/settlements/page.tsx`, `src/app/settlements/submissions/page.tsx`, `src/app/settlements/billing-settings/page.tsx`, `src/app/audit-log/page.tsx`, `src/lib/authz.ts`, `src/lib/auth.ts`, `src/lib/roles.ts`, and `package.json`.
- **Findings:** Server actions for waiver/reversal lack explicit reason/state/affected-row validation in the reviewed code; payment audit-log insert errors are not checked. Described billing RPC/trigger definitions are not present in the reviewed `_migrations/` listing, so database-level safeguards remain unverified.
- **Verification:** Read-only Supabase schema/function/trigger/RLS queries and aggregate settlement checks were performed against the connected project. No rows were changed and no live financial operation was executed. Lint/build/tests and HTTP smoke tests were not run.
- **Live configuration:** Rs. 20 per-order fee; Rs. 5,999 monthly fee; 10-day grace period.
- **Legacy exceptions:** three August zero-fee invoices with null plan snapshots and no orders; July Monthly invoice Rs. 7,000 marked paid; July Per Order invoice Rs. 615 with Rs. 300 recorded paid. These require source-evidence review before collection or correction.
- **Database controls observed:** payment advisory lock/balance trigger; unique vendor/month settlement; unique payment-submission linkage; Super Admin check in submission-review RPC.
- **Critical reconciliation exception:** connected orders table has 25 rows total (24 cancelled; one currently eligible), which does not substantiate July settlement snapshots of 41 orders/Rs.121,000 and 58 orders/Rs.274,000. Historical source ledger/environment is unknown; hold collection and bulk rewrites until reconciled.
- **Security follow-up:** Supabase advisor flagged a security-definer view error and broader function/RLS notices; audit by function and access intent.
- **Next:** trace original order/invoice/payment evidence, add guarded state-transition tests, reconcile SQL migration source with live migration history, and keep BRAIN tasks open until evidence is complete.

## 2026-10-15 — Project brain initialized
- **Repository:** shahlal07/nashemann-admin.
- **Change:** Added shared entry point, repository map, status ledger, master task backlog, architecture discovery, decisions, finance guardrails, release checklist and owner workflow.
- **Verification:** Documentation commits acknowledged by GitHub. Application code, integrations and deployment settings were not audited as part of creating this brain.
- **Next:** Audit all four active repositories and replace unknown status with evidence-backed findings.