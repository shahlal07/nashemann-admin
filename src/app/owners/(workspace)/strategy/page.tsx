import { Compass, FileText } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";
import { DecisionCreateForm } from "../decisions/DecisionCreateForm";

export const dynamic = "force-dynamic";

type StrategyDecision = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
};

export default async function FounderStrategyPage() {
  const { supabase, membership } = await requireFounder("strategy.read", "business_strategy");
  const { data, error } = await (supabase.from("owner_decisions") as any)
    .select("id, title, summary, status, created_at")
    .eq("domain", "business_strategy")
    .order("created_at", { ascending: false })
    .limit(100);

  const canCreate = membership.responsibilities.includes("business_strategy") && membership.capabilities.includes("strategy.manage");

  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Business & strategy</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Strategy register</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">Live company strategy decisions for your assigned business-strategy domain. Records are persisted in Supabase and protected by domain-specific row-level security.</p>

      {canCreate && <DecisionCreateForm domains={["business_strategy"]} />}

      {error ? (
        <div className="mt-7 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7">
          <Compass size={22} />
          <h2 className="mt-3 font-semibold">Strategy data unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">The owner-domain migration may not be deployed yet. No sample strategy records are substituted.</p>
        </div>
      ) : !data?.length ? (
        <div className="mt-7 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7">
          <FileText size={22} />
          <h2 className="mt-3 font-semibold">No strategy decisions recorded</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Create the first record when your account has strategy-management capability.</p>
        </div>
      ) : (
        <div className="mt-7 space-y-3">
          {(data as StrategyDecision[]).map((decision) => (
            <article key={decision.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{decision.title}</h2><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs">{decision.status}</span></div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{decision.summary || "No rationale recorded."}</p>
              <p className="mt-3 text-xs text-[var(--text-faint)]">Created {new Date(decision.created_at).toLocaleDateString()}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
