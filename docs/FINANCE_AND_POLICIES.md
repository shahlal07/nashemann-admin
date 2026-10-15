# Finance & Policy Guardrails

This file records implementation constraints; it does not replace founder approvals or accounting advice.

## Baseline to preserve
- Marketplace fee: **Rs. 20 per eligible order**.
- Vendor subscription: **Rs. 5,999 per month**.
- Initial reinvestment target: **50%**.
- Equal founder distributions only after obligations, agreed reserves and distributable profit are established.

Do not change these terms in code, pricing copy, invoices or vendor communications without explicit founder approval and an updated decision record.

## Required audit
- Find the authoritative order state and approved eligible-order definition.
- Verify fee calculation, rounding, currency, retries, idempotency and immutable fee snapshots.
- Verify subscription period, renewal, cancellation, failed payment handling and audit history.
- Trace totals, fees, vendor amounts, refunds, adjustments and settlements end-to-end.
- Reconcile balances to ledger/transaction records; do not silently overwrite history.
- Test duplicate webhooks, retries, concurrency and partial failure with synthetic data.
- Log privileged financial actions with actor, timestamp, reason and affected record.
- Never place secrets or real customer/payment data in docs or test fixtures.

## Safety
No live charges, refunds, payouts or billing experiments without explicit authorization. If code and policy disagree, document the discrepancy and escalate rather than inventing a rule. Policy changes require approver, rationale, effective date and migration/implementation plan.