import { CircleDollarSign } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";

export default async function FounderFinancePage() {
  await requireFounder("finance.read");

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Finance & governance</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Financial visibility</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        Financial reporting will distinguish marketplace GMV, platform revenue,
        vendor settlement liabilities, expenses, reserves, and distributable profit.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
        <CircleDollarSign size={24} className="text-[var(--text-muted)]" />
        <h2 className="mt-4 font-semibold">Financial data source review required</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          This page intentionally shows no fabricated balances or totals. Historical
          settlement/order discrepancies must be reconciled before financial figures are
          presented as authoritative. The existing Rs. 20 eligible-order fee and Rs. 5,999
          monthly subscription remain unchanged.
        </p>
      </div>
    </section>
  );
}
