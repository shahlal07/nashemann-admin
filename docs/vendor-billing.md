# Nashemann vendor billing workflow

## Billing rules

- The billing period is a closed calendar month.
- A vendor on the **Per Order** plan is charged: the sum of each eligible order’s vendor-plan fee snapshot, recorded when the order is created. This preserves the price in effect for each order.
- A vendor on the **Monthly** plan is charged the configured monthly fee.
- The generated invoice snapshots the plan, unit fee, and whether order rates varied during the period. Existing invoices are immutable; repeated generation is idempotent and does not rewrite an issued invoice. A refund/cancellation after a per-order invoice is issued creates an audited credit adjustment rather than rewriting the original charge.
- Invoices are due on the last calendar day of the following month.
- The Superadmin-configurable grace period is 0–30 days (default 10). A billing suspension is applied only to an active vendor with an unpaid invoice beyond the configured grace period.
- Automatic reactivation only applies to a vendor carrying the billing-suspension marker and only when no overdue unpaid invoice remains. Manual suspensions are not automatically removed.

## Production flow

1. Vercel Cron calls /api/cron/vendor-billing daily at 02:15 UTC.
2. The endpoint checks the Authorization bearer secret, creates a billing_job_runs record, and invokes process_vendor_billing with the previous month.
3. Supabase generates any missing settlement for that closed month, applies overdue suspension rules, and records audit events.
4. The job sends reminders for invoices due within 7 days, on the due date, 3 days overdue, 7 days overdue, and a suspension notice after automatic billing suspension. A unique settlement/stage key prevents repeat sends after success.
5. Vendors can open /billing in the vendor-admin app—even while their store is suspended—to view balances, print/save invoices as PDF, submit a payment reference, and upload private proof (JPG/PNG/PDF, up to 5 MB).
6. A Superadmin reviews submissions at /settlements/submissions. Confirmation inserts a payment and updates the settlement balance/status in one database transaction. Overpayments are blocked by a database trigger.
7. A confirmed payment that clears all overdue invoices automatically releases only a billing suspension. The action is audited.
8. Superadmin can adjust the grace period at /settlements/billing-settings.

## Required production configuration

- CRON_SECRET is configured for the production nashemann-admin project.
- NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured in the admin project. The service-role key must never be exposed to browser code.
- **Email delivery still requires a valid RESEND_API_KEY in Vercel production and a verified sender domain** (notifications@nashemann.store, staff@nashemann.store, and security@nashemann.store are used by the existing mail helper). Without that key, reminders and failure alerts are logged as failed and will not be delivered.
- The daily job result is recorded in billing_job_runs; reminder attempts are recorded in billing_reminder_log.

## Safe verification checklist

- Verify the Vercel production deployment is READY and the /api/cron/vendor-billing route returns 401 without the bearer secret.
- Check billing_job_runs after the first scheduled run and confirm status = succeeded.
- Compare the first generated invoice to the configured plan price and eligible order count before asking vendors to pay. Test a refund after invoice generation and verify that it creates one credit adjustment only.
- Test a partial payment, exact remaining payment, overpayment attempt, rejected proof, and duplicate review.
- Confirm only a vendor with billing_suspended_at set by the billing job can be automatically reactivated.
- Add RESEND_API_KEY before relying on email reminders.

## Existing legacy records

Existing order rows without a vendor-plan fee snapshot were backfilled using the current configured per-order price; that cannot reconstruct any older historical price changes. Existing settlement rows are deliberately not rewritten when the new plan-based calculation is enabled. Review legacy balances—especially old per-order invoices that were calculated under the previous fee logic—before collecting those historical amounts. New invoices use the plan and unit-rate snapshot described above.
