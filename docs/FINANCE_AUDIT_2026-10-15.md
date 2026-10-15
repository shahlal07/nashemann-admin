# Finance & Governance Audit — 2026-10-15

**Owner:** Finance, Strategy & Governance  
**Repository reviewed:** `shahlal07/nashemann-admin` (default branch `master`)  
**Scope:** Read-only code/documentation audit for BRAIN-007, BRAIN-008 and BRAIN-009. No production data was accessed, no financial action was executed, and no live deployment was changed.

## Executive summary

The admin repository contains a meaningful vendor billing and settlement workflow: a daily cron endpoint, settlement review UI, payment submissions, role gates, an audit-log page, and documented billing policy. This is not yet proof that the end-to-end financial system is production-correct. Critical database functions/triggers, production configuration, transaction behavior under concurrency, and source-ledger reconciliation still require evidence.

Preserve the documented commercial baseline: Rs. 20 per eligible order and Rs. 5,999 monthly subscription. Do not automatically collect legacy balances until the historical calculation has been reviewed.

## Verified code/documentation observations

### 1. Billing job and email reminders

- `src/app/api/cron/vendor-billing/route.ts` rejects requests unless the Authorization header exactly matches `Bearer ${CRON_SECRET}`; missing Supabase URL/service-role configuration returns a 500.
- The handler records a `billing_job_runs` row and calls the Supabase RPC `process_vendor_billing` for the previous UTC calendar month.
- It pages pending/partially-paid settlements, computes reminder stages, and uses `billing_reminder_log` to avoid repeating already-sent stages. A unique-key conflict is treated as a skip.
- `docs/vendor-billing.md` says the cron runs daily at 02:15 UTC and documents the required production email configuration. These deployment settings and actual successful scheduled runs have **not** been independently verified in this audit.

### 2. Settlement and payment access

- `src/app/settlements/page.tsx` requires a signed-in user and a positive result from the database RPC `is_finance_staff` before reading settlement rows.
- `src/lib/authz.ts` defines finance access for `super_admin`, `admin`, and `finance`; settlement payment recording, waivers, reversals and billing-policy settings use Super Admin checks in the reviewed code paths.
- `src/app/settlements/submissions/page.tsx` uses `requireSuperAdmin` and creates short-lived signed URLs for private payment proofs.
- These are useful application-layer gates. The underlying database grants, RLS policies, RPC definitions, triggers and storage policies still need to be inspected in the connected Supabase project to establish the full security boundary.

### 3. High-priority settlement action gap to fix and test

In `src/app/settlements/actions.ts`:

- `recordPaymentAction` performs a server-side balance pre-check and inserts a `settlement_payments` row. It then attempts to insert an audit-log row, but the audit insert's error is not checked. If the payment write succeeds and the audit write fails, the action can succeed without the expected application audit event unless another database-level audit mechanism covers it.
- `waiveSettlementAction` and `reverseSettlementAction` require Super Admin, but the reviewed actions do not validate a non-empty reason server-side, do not constrain allowed prior settlement states, and do not verify that an update affected exactly one eligible row. The UI may impose constraints, but server actions must enforce financial invariants independently. A paid/closed settlement may therefore be exposed to an invalid state transition unless database constraints/triggers reject it.
- The payment balance check is a read-then-write sequence. The code comments and `docs/vendor-billing.md` describe a database trigger that blocks overpayments; the trigger definition was not present in the reviewed repository migrations. Its correctness under concurrent requests remains **unverified**.

**Required remediation:** inspect the authoritative Supabase function/trigger definitions; add server-side reason and state-transition validation; ensure audit evidence cannot silently be omitted; and add database-backed tests for concurrent payments, duplicate review, partial/exact payment, overpayment, and invalid waiver/reversal of paid or reversed settlements. Do not deploy until tested against a safe non-production environment.

### 4. Billing policy and historical balances

- `docs/vendor-billing.md` documents closed-calendar-month billing, order-level vendor-plan fee snapshots, immutable issued invoices, audited credit adjustments after post-invoice refunds/cancellations, and a configurable 0–30 day grace period.
- The same document explicitly warns that legacy order fee snapshots were backfilled using the current configured rate and cannot reconstruct older historical rate changes; existing settlement rows are not rewritten. Review legacy invoices before collecting historical amounts.
- The repository's `_migrations/` directory currently lists four SQL files, none of which visibly contains the described `process_vendor_billing` or `generate_monthly_settlements` definitions. The SQL implementation may live in another controlled location; its authoritative source and migration history must be located before claiming billing correctness.

### 5. Audit log

- `src/app/audit-log/page.tsx` checks the authenticated user and `is_staff`, then requests the latest 200 rows from `audit_log`.
- Settlement actions attempt to write audit events, but the action code does not consistently check audit insert errors. Confirm whether database triggers provide additional immutable audit records and whether the table has appropriate write restrictions.
- Verify that audit events capture stable actor IDs, timestamps, entity IDs, reason, before/after state, and correlation/source references. Avoid depending on display names or user-supplied labels as the only identity evidence.

### 6. Build/test readiness

- `package.json` exposes `lint` and `build` scripts but no dedicated `test` script.
- No lint, build, automated billing test, production smoke test, or database reconciliation was run as part of this remote source review. No passing result is claimed.

## Prioritized action plan

| Priority | Action | Accountable | Acceptance evidence |
|---|---|---|---|
| P0 | Locate and review authoritative SQL for billing RPCs, settlement/payment triggers, RLS and storage policies | Finance + Product & Technology | Versioned SQL/source, policy review, safe-environment test results |
| P0 | Guard waiver/reversal state transitions and require a meaningful reason server-side | Product & Technology; Finance defines policy | Regression tests reject paid/closed/invalid transitions and blank reasons |
| P0 | Prove payment + balance updates are atomic and concurrency-safe | Product & Technology | Database tests for simultaneous payment attempts and overpayment |
| P0 | Make audit-write failures observable and guarantee a durable financial audit trail | Product & Technology | Failure-injection test and actor/reason/state evidence |
| P0 | Reconcile eligible orders → fee snapshots → invoices/credits → payments → outstanding balance | Finance + Product & Technology | Reproducible report with source IDs and explicit exceptions |
| P1 | Verify cron authentication, successful job runs, reminders, and sender configuration in production | Finance + Product & Technology | Authenticated/unauthenticated smoke-test evidence and job logs |
| P1 | Establish legacy invoice review before collection; document approved treatment per discrepancy | Finance + founders | Reviewed exception register and decision records |
| P1 | Add repeatable finance regression-test command to CI | Product & Technology | CI run covering the financial acceptance cases |

## Next checkpoint

Do not mark BRAIN-007, BRAIN-008, or BRAIN-009 Done until the source SQL, source-ledger reconciliation, authorization boundaries, and regression tests are verified. No pricing or eligibility rule is changed by this audit.
