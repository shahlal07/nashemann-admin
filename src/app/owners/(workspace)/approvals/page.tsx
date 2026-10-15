import { CheckSquare } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";

const domainLabels: Record<string, string> = {
  shared_governance: "Shared governance",
  finance_governance: "Finance & governance",
  product_technology: "Product & technology",
  business_strategy: "Business & strategy",
  operations: "Operations",
};

export default async function FounderApprovalsPage() {
  const { supabase, membership } = await requireFounder("approvals.read");
  const { data, error } = await (supabase.from("owner_approvals") as any)
    .select("id, title, description, domain, status, requested_at")
    .order("requested_at", { ascending: false })
    .limit(100);

  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Governance</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Approval center</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
        Requests are scoped by the database to your assigned owner domains. Review actions remain disabled until the founders approve the final quorum, thresholds, and conflict rules.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {membership.responsibilities.map((domain) => (
          <span key={domain} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {domainLabels[domain] ?? domain}
          </span>
        ))}
      </div>

      {error ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
          <CheckSquare size={24} className="text-[var(--text-muted)]" />
          <h2 className="mt-4 font-semibold">Approval queue unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            The reviewed owner-domain migration may not be deployed yet, or this account may not have the required database access. No fallback data is shown.
          </p>
        </div>
      ) : !data?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
          <CheckSquare size={24} className="text-[var(--text-muted)]" />
          <h2 className="mt-4 font-semibold">No approval requests in your assigned domains</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Authorized requests will appear here once the workflow is enabled.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {data.map((approval: { id: string; title: string; description: string | null; domain: string; status: string; requested_at: string }) => (
            <article key={approval.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{approval.title}</h2>
                <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)]">{approval.status}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{approval.description || "No description provided."}</p>
              <p className="mt-3 text-xs text-[var(--text-faint)]">{domainLabels[approval.domain] ?? approval.domain} · Requested {new Date(approval.requested_at).toLocaleDateString()}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
