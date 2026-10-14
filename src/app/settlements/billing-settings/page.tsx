import { requireSuperAdmin } from "@/lib/authz";
import { saveBillingGraceDaysAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("billing_grace_days")
    .eq("id", true)
    .single();
  if (error) throw new Error(error.message);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <a href="/settlements" className="text-sm text-[var(--text-muted)] hover:underline">← Back to settlements</a>
      <header>
        <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Billing policy</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Configure the number of calendar days after an invoice due date before automatic store suspension. This setting applies to future daily billing runs.</p>
      </header>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-sm text-[var(--text-muted)]">Current grace period</p>
        <p className="mt-1 text-3xl font-bold text-[var(--text)]">{data.billing_grace_days} days</p>
        <form action={saveBillingGraceDaysAction} className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-[var(--text)]">New grace period (0–30 days)
            <input required type="number" min="0" max="30" step="1" name="graceDays" defaultValue={data.billing_grace_days} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5" />
          </label>
          <button type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white">Save billing policy</button>
        </form>
        <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">Payment confirmations are handled separately by Superadmin. A store is only auto-reactivated when its billing suspension marker is present and no overdue unpaid invoices remain. Manual administrative suspensions are not automatically cleared.</p>
      </section>
    </main>
  );
}
