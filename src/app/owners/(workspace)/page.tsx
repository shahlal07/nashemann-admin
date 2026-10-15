import Link from "next/link";
import { Activity, ArrowRight, CheckSquare, CircleDollarSign, FileText, Workflow } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";
import { getRepositoryHealth } from "@/lib/founders/github-health";

const MODULES = [
  { href: "/owners/decisions", title: "Company decisions", description: "Documented decisions and the reasoning behind them.", capability: "governance.read", icon: FileText },
  { href: "/owners/approvals", title: "Approvals", description: "Requests that require founder review.", capability: "approvals.read", icon: CheckSquare },
  { href: "/owners/finance", title: "Finance & governance", description: "Live billing records and financial reconciliation signals.", capability: "finance.read", icon: CircleDollarSign },
  { href: "/owners/technology", title: "Product & technology", description: "Live repository and workflow information.", capability: "technology.read", icon: Workflow },
] as const;

const DOMAIN_LABELS: Record<string, string> = {
  shared_governance: "Shared governance",
  finance_governance: "Finance & governance",
  product_technology: "Product & technology",
  business_strategy: "Business & strategy",
  operations: "Operations",
};

export const dynamic = "force-dynamic";

export default async function FounderOverviewPage() {
  const { supabase, user, membership } = await requireFounder("workspace.read");
  const can = (capability: string) => membership.capabilities.includes(capability as (typeof membership.capabilities)[number]);
  const visibleModules = MODULES.filter((item) => can(item.capability));

  const [decisionResult, approvalResult, settlementResult] = await Promise.all([
    can("governance.read")
      ? (supabase.from("owner_decisions") as any).select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null, error: null }),
    can("approvals.read")
      ? (supabase.from("owner_approvals") as any).select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: null, error: null }),
    can("finance.read")
      ? (supabase.from("settlements") as any).select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null, error: null }),
  ]);

  const repositoryHealth = can("technology.read") ? await getRepositoryHealth() : null;
  const countLabel = (result: { count: number | null; error: unknown }) =>
    result.error ? "Unavailable" : result.count === null ? "—" : result.count.toLocaleString("en-PK");

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-[var(--accent-violet)]/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Shared company workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {membership.display_name || user.email || "Owner"}.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Your workspace is determined by your active owner membership. Each data module enforces its assigned capability and domain in the server and database.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {membership.responsibilities.map((domain) => (
              <span key={domain} className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--text-muted)]">{DOMAIN_LABELS[domain] ?? domain}</span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Live workspace indicators</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Counts are read from the connected database or GitHub. Errors are shown as unavailable, never replaced with sample values.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {can("governance.read") && <Metric icon={<FileText size={18} />} label="Decision records" value={countLabel(decisionResult)} />}
          {can("approvals.read") && <Metric icon={<CheckSquare size={18} />} label="Pending approvals" value={countLabel(approvalResult)} />}
          {can("finance.read") && <Metric icon={<CircleDollarSign size={18} />} label="Visible settlements" value={countLabel(settlementResult)} />}
          {repositoryHealth && <Metric icon={<Activity size={18} />} label="Repositories with live metadata" value={repositoryHealth.configured ? `${repositoryHealth.repositories.filter((r) => !r.error).length} / ${repositoryHealth.repositories.length}` : "Not configured"} />}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Your workspace</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Only modules assigned to your capabilities appear here.</p>
        </div>
        {visibleModules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <h3 className="font-medium">No modules assigned yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-muted)]">Your membership is active, but no workspace modules have been assigned. Ask the existing Super Admin to review your founder capabilities.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleModules.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent-violet)]/40 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-[var(--surface-hover)] text-[var(--accent-violet-deep)]"><Icon size={20} strokeWidth={1.8} /></span>
                  <ArrowRight size={18} className="text-[var(--text-muted)] transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <span className="text-[var(--accent-violet-deep)]">{icon}</span>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
