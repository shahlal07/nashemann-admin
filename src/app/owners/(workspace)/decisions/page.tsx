import { FileText } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";
import { DecisionCreateForm } from "./DecisionCreateForm";

const domainLabels: Record<string, string> = {
  shared_governance: "Shared governance",
  finance_governance: "Finance & governance",
  product_technology: "Product & technology",
  business_strategy: "Business & strategy",
  operations: "Operations",
};

export default async function FounderDecisionsPage() {
  const { supabase, membership } = await requireFounder("governance.read");
  const creatableDomains = membership.responsibilities.filter((domain) =>
    domain === "product_technology"
      ? membership.capabilities.includes("technology.manage")
      : domain === "business_strategy"
        ? membership.capabilities.includes("strategy.manage")
        : membership.capabilities.includes("governance.manage"),
  );
  const { data, error } = await (supabase.from("owner_decisions") as any)
    .select("id, title, summary, domain, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Governance</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Company decisions</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
        Decisions are filtered by database row-level security to the domains assigned to your active owner membership.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {membership.responsibilities.map((domain) => (
          <span key={domain} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {domainLabels[domain] ?? domain}
          </span>
        ))}
      </div>

      <DecisionCreateForm domains={creatableDomains} />

      {error ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
          <FileText size={24} className="text-[var(--text-muted)]" />
          <h2 className="mt-4 font-semibold">Decision register unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            The reviewed owner-domain migration may not be deployed yet, or this account may not have the required database access. No fallback data is shown.
          </p>
        </div>
      ) : !data?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
          <FileText size={24} className="text-[var(--text-muted)]" />
          <h2 className="mt-4 font-semibold">No decisions in your assigned domains</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">When authorized decision records exist, they will appear here.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {data.map((decision: { id: string; title: string; summary: string | null; domain: string; status: string; created_at: string }) => (
            <article key={decision.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{decision.title}</h2>
                <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)]">{decision.status}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{decision.summary || "No summary provided."}</p>
              <p className="mt-3 text-xs text-[var(--text-faint)]">{domainLabels[decision.domain] ?? decision.domain} · {new Date(decision.created_at).toLocaleDateString()}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
