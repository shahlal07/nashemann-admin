import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { requireOwner } from "@/lib/owner-authz";
import { createFeatureRequest, updateFeatureRequestStatus } from "./actions";

export const dynamic = "force-dynamic";

const targetLabels: Record<string, string> = {
  whole_panel: "Whole panel",
  technology: "Technology",
  finance: "Finance",
  marketing: "Marketing",
};
const statusLabels: Record<string, string> = {
  proposed: "Proposed",
  approved: "Approved",
  in_progress: "In progress",
  shipped: "Shipped",
  declined: "Declined",
};
const statusTone: Record<string, string> = {
  proposed: "border-[var(--border)] text-[var(--text-muted)]",
  approved: "border-[rgba(139,107,255,.3)] text-[var(--accent-violet-deep)]",
  in_progress: "border-[rgba(234,179,8,.35)] text-[var(--warning)]",
  shipped: "border-[rgba(34,197,94,.3)] text-[var(--success)]",
  declined: "border-[var(--border)] text-[var(--text-faint)]",
};

export default async function OwnerFeaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { supabase, membership } = await requireOwner();
  const canManage = membership.capabilities.includes("technology.manage");
  const [{ data, error }, params] = await Promise.all([
    supabase
      .from("owner_feature_requests")
      .select("id, title, description, target_platform, status, created_at")
      .order("created_at", { ascending: false }),
    searchParams,
  ]);
  const requests = data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-10">
      <Link href="/owners" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]">
        <ArrowLeft size={16} /> Executive overview
      </Link>

      <header className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <Sparkles size={13} /> Platform governance
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">Feature requests</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">A shared, database-backed register for features across Technology, Finance, Marketing, or the entire panel.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-muted)]">
          <ShieldCheck size={15} className="text-[var(--success)]" />
          {canManage ? "Technology owner: manage access" : "Read-only preview"}
        </div>
      </header>

      {params.error && (
        <div role="alert" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          {params.error === "invalid" ? "Please check the title, description, and target platform." : "The change could not be saved. Your access may not permit this action; refresh and try again."}
        </div>
      )}
      {params.saved && <div role="status" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--success)]">Feature register updated.</div>}
      {error && <div role="status" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--warning)]">Feature requests could not be loaded. Refresh the page or check database access.</div>}

      {canManage && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-[var(--text)]">Propose a feature</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Only the Technology owner can create requests or change their status.</p>
          <form action={createFeatureRequest} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--text)]">Feature title
              <input name="title" required minLength={3} maxLength={160} placeholder="e.g. Shared launch checklist" className="mt-2 h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]" />
            </label>
            <label className="block text-sm font-medium text-[var(--text)]">Target workspace
              <select name="target_platform" required defaultValue="whole_panel" className="mt-2 h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]">
                <option value="whole_panel">Whole panel</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="marketing">Marketing</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--text)] md:col-span-2">Description
              <textarea name="description" maxLength={4000} rows={3} placeholder="What should change, and why?" className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-solid)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]" />
            </label>
            <div className="md:col-span-2"><button type="submit" className="rounded-xl bg-[var(--accent-violet)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Add feature request</button></div>
          </form>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold text-[var(--text)]">Shared register</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Changes are stored in Supabase and visible to active founders.</p></div>
          <span className="text-xs text-[var(--text-faint)]">{requests.length} {requests.length === 1 ? "request" : "requests"}</span>
        </div>
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] px-5 py-12 text-center text-sm text-[var(--text-muted)]">No feature requests yet.</div>
        ) : requests.map((request) => (
          <article key={request.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[var(--text)]">{request.title}</h3><span className={"rounded-full border px-2.5 py-1 text-[11px] font-medium " + (statusTone[request.status] ?? statusTone.proposed)}>{statusLabels[request.status] ?? request.status}</span></div><p className="mt-2 text-xs text-[var(--text-faint)]">Target: {targetLabels[request.target_platform] ?? request.target_platform} · Added {new Date(request.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p>{request.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{request.description}</p>}</div>
              {canManage && <form action={updateFeatureRequestStatus} className="flex shrink-0 items-center gap-2"><input type="hidden" name="id" value={request.id} /><label className="sr-only" htmlFor={"status-" + request.id}>Update status</label><select id={"status-" + request.id} name="status" defaultValue={request.status} className="h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-solid)] px-2 text-xs text-[var(--text)]">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="submit" className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]">Save</button></form>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
