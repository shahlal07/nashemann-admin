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


## Live Supabase read-only verification — 2026-10-15

The connected Supabase project named **new nashemann** was inspected using read-only schema/function/policy queries and Supabase advisors. No rows were changed and no billing function was executed.

### Commercial configuration

- Live `platform_pricing` reports `per_order_fee = Rs. 20` and `monthly_fee = Rs. 5,999`, matching the standing commercial baseline.
- Live `platform_settings` reports a 10-day billing grace period, matching the documented default.
- This verifies configured values only; it does not prove every invoice was calculated correctly or that funds were collected.

### Settlement aggregates observed

These are live database aggregates at the audit time, not a complete bank reconciliation:

| Invoice month | Current vendor plan | Status | Count | Orders recorded | Gross revenue | Platform fee | Amount paid | Nominal balance |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 2026-08 | Per Order | Pending | 1 | 0 | Rs. 0 | Rs. 0 | Rs. 0 | Rs. 0 |
| 2026-08 | Monthly | Pending | 2 | 0 | Rs. 0 | Rs. 0 | Rs. 0 | Rs. 0 |
| 2026-07 | Per Order | Partially paid | 1 | 41 | Rs. 121,000 | Rs. 615 | Rs. 300 | Rs. 315 |
| 2026-07 | Monthly | Paid | 1 | 58 | Rs. 274,000 | Rs. 7,000 | Rs. 7,000 | Rs. 0 |

- The three August settlements have null plan snapshots, zero orders/gross revenue and zero fees, including two vendors whose current plan is Monthly. This is a **legacy invoice review exception**, not a confirmed amount due. The current billing function inserts missing invoices and does not rewrite existing vendor/month rows, so these records need investigation before collection or correction.
- The July Monthly invoice is Rs. 7,000 while the current configured monthly rate is Rs. 5,999. It is marked paid in the settlement table, but this is not proof of the bank receipt or proof that the legacy invoice used the correct historical rate. Review its invoice/payment evidence and preserve the immutable history; do not silently rewrite or reclaim funds.
- The July Per Order invoice has a recorded nominal remaining balance of Rs. 315. Reconcile its 41 eligible-order records and fee snapshots against the payment evidence before treating the amount as collectible.
- The aggregate query found no settlement rows where recorded payments exceed fee plus adjustments, and no rows marked paid with a nominal outstanding balance. This is a limited consistency check, not a concurrency proof.

### Live database safeguards confirmed

- `settlements` has a unique constraint on `(vendor_id, month)`.
- `settlement_payments.vendor_payment_submission_id` is unique, preventing one vendor submission from being applied twice.
- `enforce_settlement_payment_limit()` takes a transaction-scoped advisory lock keyed by settlement ID, locks the settlement row, rejects non-positive payments, prevents moving an existing payment between settlements, and blocks payments that exceed fee plus adjustments or apply to waived/reversed settlements.
- `review_vendor_payment_submission()` locks the submission, requires Super Admin, rejects repeat review, locks the matching vendor settlement, checks payable status/balance, inserts the payment, marks the submission reviewed, and writes an audit row in the same database transaction.
- The settlement/payment RLS policies inspected require finance/super-admin checks for financial reads/writes and scope vendor reads to the vendor's own records. These policy expressions still require role-based integration tests.
- `generate_monthly_settlements()` is executable by authenticated users but checks `is_finance_staff()` in its function body; `review_vendor_payment_submission()` checks `is_super_admin()`. These checks should remain covered by unauthorized-role regression tests.

### Additional security-advisor findings

The live Supabase security advisor reports:
- One **ERROR**: `public.public_business_settings` is a security-definer view. Review whether it can be changed to `security_invoker` or otherwise restricted without breaking the public storefront contract.
- **19** security-definer functions executable by `anon` and **52** executable by `authenticated` were flagged by the advisor. This is a review queue, not proof that every function is exploitable; inspect each function's authorization checks and intended public use, then revoke unnecessary execute grants.
- Five tables with RLS enabled but no policies were flagged, including `platform_email_log` and `platform_email_settings`. Those two may be intentionally service-role-only; verify grants and server-only access rather than adding broad policies.
- The advisor also reports multiple permissive policies for some tables. Review the relevant finance/security policies for unintended union-of-policy access.

### Updated priority

1. Create a legacy-invoice exception register for the three zero-fee August invoices and the Rs. 7,000 July Monthly invoice; trace original invoice/payment evidence and document a founder-approved disposition before any collection or rewrite.
2. Reconcile July Per Order's Rs. 615 invoice against order-level fee snapshots and Rs. 300 recorded payments.
3. Keep the confirmed database concurrency controls, but add safe-environment tests for parallel payments, duplicate submission review, and invalid settlement transitions.
4. Review the Supabase security-advisor findings with Product & Technology; prioritize any authorization bypass or exposed private data.
5. Reconcile the SQL migration source in GitHub with the live Supabase migration history so future changes are reproducible.


### Critical source-record mismatch — hold historical collection pending reconciliation

A separate read-only aggregate of the connected project's current `public.orders` table returned **25 order rows total**, of which **24 currently have status cancelled** and only **1 currently matches the billing function's present eligibility filter**. The table's oldest order timestamp is 2026-07-23 and newest is 2026-10-08.

The July settlement rows, however, snapshot 41 orders / Rs. 121,000 gross for the Per Order vendor and 58 orders / Rs. 274,000 gross for the Monthly vendor. A month/vendor join against the current `public.orders` rows did not reproduce those counts or gross totals. The current table therefore cannot presently substantiate the historical settlement snapshots.

This does **not** establish whether orders were deleted, whether the settlement snapshots came from another source/environment, or whether historical data was deliberately cleaned. It does establish that the source evidence available in the connected project is insufficient to validate these invoices.

**Control decision:** Do not bulk-recalculate, rewrite, or automatically collect the July/August historical amounts until the team identifies the authoritative order ledger/snapshot, explains the count/GMV discrepancy, and records a founder-approved disposition. Preserve existing invoices/payments while investigating. Confirm the connected Supabase project's intended environment before calling these rows production records.
