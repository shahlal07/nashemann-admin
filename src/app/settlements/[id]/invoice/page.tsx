import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPKR } from "@/lib/utils";
import { PrintInvoiceButton } from "./PrintInvoiceButton";

export const dynamic = "force-dynamic";

function monthLabel(month: string) {
  return new Date(`${month}T00:00:00.000Z`).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function SettlementInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isFinance } = await supabase.rpc("is_finance_staff");
  if (!isFinance) redirect("/");

  const { data: settlement, error } = await supabase
    .from("settlements")
    .select("id, vendor_id, month, orders_count, gross_revenue, platform_fee, adjustment_total, status, amount_paid, due_date, plan_snapshot, unit_fee, vendors(name, contact_email, currency, plan)")
    .eq("id", id)
    .maybeSingle();

  if (error || !settlement) notFound();
  const vendor = settlement.vendors as unknown as { name: string; contact_email: string | null; currency: string | null; plan: string | null } | null;
  const plan = settlement.plan_snapshot ?? vendor?.plan ?? "per_order";
  const unitFee = settlement.unit_fee == null
    ? (plan === "monthly" ? Number(settlement.platform_fee) : (Number(settlement.orders_count) > 0 ? Number(settlement.platform_fee) / Number(settlement.orders_count) : 0))
    : Number(settlement.unit_fee);
  const quantity = plan === "monthly" ? 1 : Number(settlement.orders_count);
  const description = plan === "monthly" ? "Monthly Nashemann platform subscription" : "Nashemann per-order plan fee";
  const baseFee = Number(settlement.platform_fee);
  const adjustmentTotal = Number(settlement.adjustment_total ?? 0);
  const totalDue = baseFee + adjustmentTotal;
  const balance = Math.max(0, totalDue - Number(settlement.amount_paid ?? 0));
  const vendorCredit = Math.max(0, Number(settlement.amount_paid ?? 0) - totalDue);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 text-slate-900">
      <div className="flex items-center justify-between print:hidden">
        <a href="/settlements" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to settlements</a>
        <PrintInvoiceButton />
      </div>
      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Nashemann</p>
            <h1 className="mt-2 text-3xl font-bold">Platform fee invoice</h1>
            <p className="mt-2 text-sm text-slate-500">Invoice ref: {settlement.id}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Billing period</p>
            <p className="font-semibold">{monthLabel(settlement.month)}</p>
            <p className="mt-3 text-sm text-slate-500">Status</p>
            <p className="font-semibold capitalize">{settlement.status.replace("_", " ")}</p>
          </div>
        </div>
        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Bill to</h2>
            <p className="mt-2 text-lg font-semibold">{vendor?.name ?? "Vendor"}</p>
            {vendor?.contact_email && <p className="text-sm text-slate-600">{vendor.contact_email}</p>}
          </section>
          <section className="sm:text-right">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Due date</h2>
            <p className="mt-2 text-lg font-semibold">{settlement.due_date ?? "Not set"}</p>
            <p className="text-sm text-slate-600">Plan: {plan === "monthly" ? "Monthly" : "Per order"}</p>
          </section>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead><tr className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500"><th className="py-3">Description</th><th className="py-3 text-right">Quantity</th><th className="py-3 text-right">Unit price</th><th className="py-3 text-right">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-slate-100"><td className="py-4 font-semibold">{description}</td><td className="py-4 text-right">{quantity}</td><td className="py-4 text-right">{formatPKR(unitFee)}</td><td className="py-4 text-right font-semibold">{formatPKR(baseFee)}</td></tr>
            {adjustmentTotal !== 0 && <tr className="border-b border-slate-100"><td className="py-4">Refund/cancellation credits and adjustments</td><td className="py-4 text-right">—</td><td className="py-4 text-right">—</td><td className="py-4 text-right">{formatPKR(adjustmentTotal)}</td></tr>}
          </tbody>
        </table>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Eligible orders: {settlement.orders_count} · Gross sales (informational): {formatPKR(Number(settlement.gross_revenue))}</div>
        <div className="ml-auto mt-6 max-w-sm space-y-3">
          <div className="flex justify-between text-sm text-slate-600"><span>Invoice total</span><span>{formatPKR(totalDue)}</span></div>
          <div className="flex justify-between text-sm text-slate-600"><span>Payments confirmed</span><span>{formatPKR(Number(settlement.amount_paid ?? 0))}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold"><span>Balance due</span><span>{formatPKR(balance)}</span></div>
          {vendorCredit > 0 && <div className="flex justify-between text-sm font-semibold text-emerald-700"><span>Credit on account</span><span>{formatPKR(vendorCredit)}</span></div>}
        </div>
        <p className="mt-10 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">This invoice reflects the platform fee recorded for this billing period. Payments are recognized only after verification by Nashemann Superadmin. Please include the invoice reference when contacting support about this bill.</p>
      </article>
    </main>
  );
}
