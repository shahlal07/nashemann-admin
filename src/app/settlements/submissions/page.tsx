import { requireSuperAdmin } from "@/lib/authz";
import { formatPKR } from "@/lib/utils";
import { reviewVendorPaymentSubmissionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PaymentSubmissionsPage() {
  const { supabase } = await requireSuperAdmin();
  const { data: submissions, error } = await supabase
    .from("vendor_payment_submissions")
    .select("id, vendor_id, settlement_id, submitted_by, amount, method, reference, notes, status, review_note, created_at, vendors(name), settlements(month, platform_fee, amount_paid, due_date)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <a href="/settlements" className="text-sm text-[var(--text-muted)] hover:underline">← Back to settlements</a>
        <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Vendor payment submissions</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Only Superadmin can confirm or reject submissions. Confirmation records the payment and updates the invoice balance in one database transaction.</p>
      </header>

      <section className="space-y-3">
        {(submissions ?? []).map((s) => {
          const vendor = s.vendors as unknown as { name: string } | null;
          const settlement = s.settlements as unknown as { month: string; platform_fee: number; amount_paid: number; due_date: string | null } | null;
          const balance = Math.max(0, Number(settlement?.platform_fee ?? 0) - Number(settlement?.amount_paid ?? 0));
          return (
            <article key={s.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text)]">{vendor?.name ?? "Unknown vendor"} · {settlement?.month ?? "Unknown period"}</h2>
                  <p className="mt-1 break-all text-xs text-[var(--text-muted)]">Submission {s.id}</p>
                  <p className="mt-1 break-all text-xs text-[var(--text-muted)]">Invoice {s.settlement_id} · Due {settlement?.due_date ?? "not set"}</p>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold capitalize">{s.status}</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div><p className="text-xs text-[var(--text-muted)]">Submitted amount</p><p className="font-semibold">{formatPKR(Number(s.amount))}</p></div>
                <div><p className="text-xs text-[var(--text-muted)]">Current balance</p><p className="font-semibold">{formatPKR(balance)}</p></div>
                <div><p className="text-xs text-[var(--text-muted)]">Method</p><p className="font-semibold capitalize">{s.method.replace("_", " ")}</p></div>
                <div><p className="text-xs text-[var(--text-muted)]">Submitted</p><p className="font-semibold">{new Date(s.created_at).toLocaleString("en-PK")}</p></div>
              </div>
              <div className="mt-3 rounded-xl bg-[var(--surface-hover)] p-3 text-sm">
                <p><strong>Reference:</strong> {s.reference}</p>
                {s.notes && <p className="mt-1 whitespace-pre-wrap"><strong>Vendor notes:</strong> {s.notes}</p>}
                {s.review_note && <p className="mt-1 whitespace-pre-wrap"><strong>Review note:</strong> {s.review_note}</p>}
              </div>
              {s.status === "submitted" && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form action={reviewVendorPaymentSubmissionAction.bind(null, s.id, "confirmed")} className="space-y-2 rounded-xl border border-emerald-200 p-3">
                    <p className="text-sm font-semibold">Confirm payment</p>
                    <label className="block text-xs text-[var(--text-muted)]">Verification note (optional)<textarea name="reviewNote" rows={2} maxLength={1000} className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" placeholder="Verified against bank transaction" /></label>
                    <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Confirm and apply payment</button>
                  </form>
                  <form action={reviewVendorPaymentSubmissionAction.bind(null, s.id, "rejected")} className="space-y-2 rounded-xl border border-red-200 p-3">
                    <p className="text-sm font-semibold">Reject submission</p>
                    <label className="block text-xs text-[var(--text-muted)]">Reason (required)<textarea required name="reviewNote" rows={2} maxLength={1000} className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" placeholder="Explain what needs to be corrected" /></label>
                    <button type="submit" className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">Reject submission</button>
                  </form>
                </div>
              )}
            </article>
          );
        })}
        {(submissions ?? []).length === 0 && <div className="rounded-2xl border border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">No vendor payment submissions have been received.</div>}
      </section>
    </main>
  );
}
