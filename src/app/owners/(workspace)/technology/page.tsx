import { Activity, AlertTriangle, GitBranch, GitCommit, Workflow } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";
import { DecisionCreateForm } from "../decisions/DecisionCreateForm";
import { getRepositoryHealth } from "@/lib/founders/github-health";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

export default async function FounderTechnologyPage() {
  const { supabase, membership } = await requireFounder("technology.read");
  const [health, decisionResult] = await Promise.all([
    getRepositoryHealth(),
    (supabase.from("owner_decisions") as any)
      .select("id, title, summary, status, created_at")
      .eq("domain", "product_technology")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const techDecisions = decisionResult.data ?? [];
  const canCreateDecision = membership.responsibilities.includes("product_technology") && membership.capabilities.includes("technology.manage");

  return (
    <section className="mx-auto max-w-6xl space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Product & technology</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Delivery and platform health</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Live repository and GitHub Actions metadata for the four active implementation repositories. The separate nashemann repository is intentionally excluded.
        </p>
      </div>

      {!health.configured && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>
            <h2 className="font-semibold">GitHub integration needs a server token</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{health.message}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {health.repositories.map((repo) => (
          <article key={repo.fullName} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{repo.name}</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{repo.fullName}</p>
              </div>
              <a href={repo.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-hover)]">Open repository</a>
            </div>

            {repo.error ? (
              <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-4">
                <p className="text-sm font-medium">Live data unavailable</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{repo.error}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <GitBranch size={17} className="mt-0.5 text-[var(--accent-violet-deep)]" />
                  <div><p className="text-xs text-[var(--text-muted)]">Default branch</p><p className="mt-1 text-sm font-medium">{repo.defaultBranch || "Unavailable"}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <GitCommit size={17} className="mt-0.5 text-[var(--accent-violet-deep)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-muted)]">Latest commit</p>
                    {repo.latestCommit ? (
                      <>
                        <a href={repo.latestCommit.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm font-medium hover:underline">{repo.latestCommit.sha} · {repo.latestCommit.message}</a>
                        <p className="mt-1 text-xs text-[var(--text-faint)]">{formatDate(repo.latestCommit.date)}</p>
                      </>
                    ) : <p className="mt-1 text-sm">No commit data returned.</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Workflow size={17} className="mt-0.5 text-[var(--accent-violet-deep)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-muted)]">Latest workflow run</p>
                    {repo.latestWorkflow ? (
                      <>
                        <a href={repo.latestWorkflow.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm font-medium hover:underline">{repo.latestWorkflow.name}</a>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Status: {repo.latestWorkflow.status} · Conclusion: {repo.latestWorkflow.conclusion || "not concluded"}</p>
                        <p className="mt-1 text-xs text-[var(--text-faint)]">{formatDate(repo.latestWorkflow.updatedAt)}</p>
                      </>
                    ) : <p className="mt-1 text-sm">No workflow run returned.</p>}
                  </div>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="font-semibold">Product & technology decisions</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Live records for the product-technology domain.</p>
        {canCreateDecision && <DecisionCreateForm domains={["product_technology"]} />}
        {decisionResult.error ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Decision records are unavailable until the reviewed domain migration is deployed.</p>
        ) : techDecisions.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">No product-technology decisions have been recorded.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {techDecisions.map((decision: { id: string; title: string; summary: string | null; status: string; created_at: string }) => (
              <article key={decision.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{decision.title}</h3><span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs">{decision.status}</span></div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{decision.summary || "No rationale recorded."}</p>
                <p className="mt-2 text-xs text-[var(--text-faint)]">{new Date(decision.created_at).toLocaleDateString()}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]"><Activity size={14} className="mt-0.5 shrink-0" /> Repository status is sourced from GitHub at request time. It does not imply a production deployment is healthy; deployment-provider integration must be configured separately before deployment status can be reported.</p>
    </section>
  );
}
