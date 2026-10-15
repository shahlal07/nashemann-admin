/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema types are not generated in this repository yet; query boundaries are guarded by server authorization and database RLS. */
import { Activity, FileText } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";
import { DecisionCreateForm } from "../decisions/DecisionCreateForm";

export const dynamic = "force-dynamic";

type OperationsDecision = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
};

export default async function FounderOperationsPage() {
  const { supabase, membership } = await requireFounder("governance.read", "operations");
  const { data, error } = await (supabase.from("owner_decisions") as any)
    .select("id, title, summary, status, created_at")
    .eq("domain", "operations")
    .order("created_at", { ascending: false })
    .limit(100);
  const canCreate = membership.capabilities.includes("governance.manage");

  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Operations</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Operations register</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">Live operational decisions for your assigned operations domain.</p>
      {canCreate && <DecisionCreateForm domains={["operations"]} />}
      {error ? (
        <div className="mt-7 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7"><Activity size={22} /><h2 className="mt-3 font-semibold">Operations data unavailable</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">The owner-domain migration may not be deployed. No sample records are substituted.</p></div>
      ) : !data?.length ? (
        <div className="mt-7 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7"><FileText size={22} /><h2 className="mt-3 font-semibold">No operations decisions recorded</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Authorized owners can record the first operational decision.</p></div>
      ) : (
        <div className="mt-7 space-y-3">{(data as OperationsDecision[]).map((decision) => <article key={decision.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{decision.title}</h2><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs">{decision.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{decision.summary || "No rationale recorded."}</p><p className="mt-3 text-xs text-[var(--text-faint)]">{new Date(decision.created_at).toLocaleDateString()}</p></article>)}</div>
      )}
    </section>
  );
}
