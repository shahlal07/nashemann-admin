import { CircleDollarSign, AlertTriangle, ReceiptText, Wallet } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Settlement = {
  id: string;
  vendor_id: string;
  month: string;
  orders_count: number;
  gross_revenue: number | string;
  platform_fee: number | string;
  amount_paid: number | string;
  adjustment_total: number | string;
  status: string;
  plan_snapshot: string | null;
  unit_fee: number | string | null;
  fee_rate_mixed: boolean;
  due_date: string | null;
  updated_at: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value);

export default async function FounderFinancePage() {
  const { supabase } = await requireFounder("finance.read");

  const [settlementResult, pricingResult] = await Promise.all([
    (supabase.from("settlements") as any)
      .select("id, vendor_id, month, orders_count, gross_revenue, platform_fee, amount_paid, adjustment_total, status, plan_snapshot, unit_fee, fee_rate_mixed, due_date, updated_at")
      .order("month", { ascending: false })
      .limit(200),
    (supabase.from("platform_pricing") as any)
      .select("per_order_fee, monthly_fee, monthly_break_even_orders")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (settlementResult.error || pricingResult.error) {
    return (
      <section className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Finance & governance</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Financial visibility</h1>
        <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <AlertTriangle size={22} />
          <h2 className="mt-3 font-semibold">Live finance data is unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">The owner finance RLS migration may not be deployed, or the connected schema is unavailable. No mock balances are substituted.</p>
        </div>
      </section>
    );
  }

  const settlements = (settlementResult.data ?? []) as Settlement[];
  const pricing = pricingResult.data as { per_order_fee: number | string; monthly_fee: number | string; monthly_break_even_orders: number } | null;
  const vendorIds = [...new Set(settlements.map((row) => row.vendor_id))];

  // This is a server-only, sanitized lookup after the caller has passed the
  // finance capability check. It returns vendor labels only, not contact data.
  const admin = createAdminClient();
  const { data: vendors } = vendorIds.length
    ? await admin.from("vendors").select("id, name, slug").in("id", vendorIds)
    : { data: [] as { id: string; name: string; slug: string }[] };
  const vendorNames = new Map((vendors ?? []).map((vendor: { id: string; name: string; slug: string }) => [vendor.id, vendor.name || vendor.slug]));

  const billedFees = settlements.reduce((sum, row) => sum + Number(row.platform_fee || 0) + Number(row.adjustment_total || 0), 0);
  const cashCollected = settlements.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0);
  const outstanding = settlements.reduce((sum, row) => sum + Math.max(0, Number(row.platform_fee || 0) + Number(row.adjustment_total || 0) - Number(row.amount_paid || 0)), 0);
  const billedGross = settlements.reduce((sum, row) => sum + Number(row.gross_revenue || 0), 0);
  const anomalyCount = settlements.filter((row) => !row.plan_snapshot || (row.status === "pending" && Number(row.orders_count) === 0)).length;

  return (
    <section className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Finance & governance</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Financial visibility</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Read-only reporting from the connected Supabase billing records. Settlement gross revenue is historical billing volume, not a substitute for a verified all-time marketplace GMV ledger.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ReceiptText size={18} />} label="Fees billed in settlement records" value={money(billedFees)} />
        <Metric icon={<Wallet size={18} />} label="Cash recorded as collected" value={money(cashCollected)} />
        <Metric icon={<CircleDollarSign size={18} />} label="Outstanding settlement balance" value={money(outstanding)} />
        <Metric icon={<ReceiptText size={18} />} label="Gross volume in settlement records" value={money(billedGross)} />
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="font-semibold">Current platform pricing configuration</h2>
        {pricing ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-[var(--text-muted)]">Eligible order fee</p><p className="mt-1 text-xl font-semibold">{money(Number(pricing.per_order_fee))}</p></div>
            <div><p className="text-xs text-[var(--text-muted)]">Monthly subscription</p><p className="mt-1 text-xl font-semibold">{money(Number(pricing.monthly_fee))}</p></div>
            <div><p className="text-xs text-[var(--text-muted)]">Monthly break-even orders</p><p className="mt-1 text-xl font-semibold">{Number(pricing.monthly_break_even_orders).toLocaleString("en-PK")}</p></div>
          </div>
        ) : <p className="mt-3 text-sm text-[var(--text-muted)]">No pricing configuration row is available.</p>}
      </section>

      {anomalyCount > 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold">Billing records need reconciliation</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {anomalyCount} settlement record(s) have a missing plan snapshot or are pending with zero orders. Historical records are displayed as stored; this page does not recalculate, collect, waive, or reverse any fee.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="font-semibold">Settlement ledger</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Latest {settlements.length} settlement record(s) visible to your finance domain.</p>
        </div>
        {settlements.length === 0 ? (
          <p className="p-8 text-sm text-[var(--text-muted)]">No settlement records are visible for this account.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[var(--surface-hover)] text-xs text-[var(--text-muted)]">
                <tr><th className="px-5 py-3 font-medium">Vendor</th><th className="px-5 py-3 font-medium">Billing month</th><th className="px-5 py-3 font-medium">Plan snapshot</th><th className="px-5 py-3 text-right font-medium">Orders</th><th className="px-5 py-3 text-right font-medium">Gross</th><th className="px-5 py-3 text-right font-medium">Fee</th><th className="px-5 py-3 text-right font-medium">Paid</th><th className="px-5 py-3 text-right font-medium">Balance</th><th className="px-5 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {settlements.map((row) => {
                  const fee = Number(row.platform_fee || 0) + Number(row.adjustment_total || 0);
                  const balance = Math.max(0, fee - Number(row.amount_paid || 0));
                  return (
                    <tr key={row.id}>
                      <td className="px-5 py-3 font-medium">{vendorNames.get(row.vendor_id) ?? "Vendor unavailable"}</td>
                      <td className="px-5 py-3">{new Date(row.month + "T00:00:00").toLocaleDateString("en-PK", { month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-3">{row.plan_snapshot ?? "Missing snapshot"}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{Number(row.orders_count).toLocaleString("en-PK")}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(Number(row.gross_revenue || 0))}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(fee)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(Number(row.amount_paid || 0))}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(balance)}</td>
                      <td className="px-5 py-3"><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs">{row.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-[var(--text-muted)]">
        This view does not claim company profit, expenses, reserves, or founder distributions: no verified expense/reserve ledger is currently connected to this page. Vendor settlement funds are liabilities until reconciled and must not be counted as company profit.
      </p>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <span className="text-[var(--accent-violet-deep)]">{icon}</span>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
