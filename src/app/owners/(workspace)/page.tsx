import Link from "next/link";
import { Activity, ArrowUpRight, CheckSquare, CircleDollarSign, FileText, ShieldCheck, Workflow, Compass } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";
import { getRepositoryHealth } from "@/lib/founders/github-health";

const MODULES = [
  { href: "/owners/decisions", title: "Founder decisions", description: "Record decisions, context, ownership, and the rationale that should remain visible to the founders.", capability: "governance.read", icon: FileText, group: "Governance" },
  { href: "/owners/approvals", title: "Approval center", description: "Review live requests and see what still requires an authorized founder's attention.", capability: "approvals.read", icon: CheckSquare, group: "Governance" },
  { href: "/owners/finance", title: "Finance & settlements", description: "Inspect stored billing and settlement records with liabilities kept separate from platform revenue.", capability: "finance.read", responsibility: "finance_governance", icon: CircleDollarSign, group: "Finance" },
  { href: "/owners/technology", title: "Product & technology", description: "Review active repositories and workflow health from live GitHub metadata when configured.", capability: "technology.read", responsibility: "product_technology", icon: Workflow, group: "Product & technology" },
  { href: "/owners/strategy", title: "Business & strategy", description: "Maintain strategic decisions and track what is recorded in the live founder register.", capability: "strategy.read", responsibility: "business_strategy", icon: Compass, group: "Company" },
  { href: "/owners/operations", title: "Operations", description: "Access operational decisions and approvals within your assigned domain.", capability: "governance.read", responsibility: "operations", icon: Activity, group: "Company" },
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
  const visibleModules = MODULES.filter((item) => can(item.capability) && (!("responsibility" in item) || membership.responsibilities.includes(item.responsibility as (typeof membership.responsibilities)[number])));

  const [decisionResult, approvalResult, settlementResult] = await Promise.all([
    can("governance.read")
      ? (supabase.from("owner_decisions") as any).select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null, error: null }),
    can("approvals.read")
      ? (supabase.from("owner_approvals") as any).select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: null, error: null }),
    (can("finance.read") && membership.responsibilities.includes("finance_governance"))
      ? (supabase.from("settlements") as any).select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null, error: null }),
  ]);

  const repositoryHealth = can("technology.read") && membership.responsibilities.includes("product_technology") ? await getRepositoryHealth() : null;
  const countLabel = (result: { count: number | null; error: unknown }) =>
    result.error ? "Unavailable" : result.count === null ? "—" : result.count.toLocaleString("en-PK");

  const metrics = [
    ...(can("governance.read") ? [{ label: "Decision records", value: countLabel(decisionResult), note: "Live owner register", icon: FileText }] : []),
    ...(can("approvals.read") ? [{ label: "Pending approvals", value: countLabel(approvalResult), note: "Awaiting review", icon: CheckSquare }] : []),
    ...(can("finance.read") && membership.responsibilities.includes("finance_governance") ? [{ label: "Settlement records", value: countLabel(settlementResult), note: "Visible to your domain", icon: CircleDollarSign }] : []),
    ...(repositoryHealth ? [{ label: "Repository metadata", value: repositoryHealth.configured ? `${repositoryHealth.repositories.filter((repo) => !repo.error).length} / ${repositoryHealth.repositories.length}` : "Not configured", note: repositoryHealth.configured ? "Repositories responding" : "Server token not configured", icon: Activity }] : []),
  ];

  return (
    <div className="space-y-8">
      <section className="relative isolate overflow-hidden rounded-[24px] border border-white/[0.09] bg-[linear-gradient(120deg,rgba(216,180,90,0.09),rgba(255,255,255,0.025)_48%,rgba(61,214,192,0.045))] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.16)] sm:p-8 lg:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-28 -z-10 size-80 rounded-full bg-[#d8b45a]/[0.08] blur-3xl" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(61,214,192,0.2)] bg-[rgba(61,214,192,0.07)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#78e5d5]"><span className="size-1.5 rounded-full bg-[#3dd6c0]" /> Private owner session</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9aa5b8]">Capability scoped</span>
        </div>
        <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8b45a]">Executive workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#f1f3f7] sm:text-4xl">Welcome back, <span className="bg-gradient-to-r from-[#f0d492] to-[#d8b45a] bg-clip-text text-transparent">{membership.display_name || user.email || "Owner"}</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#a0aabd] sm:text-[15px]">Your company overview, decisions, and domain work in one place. Each module is checked against your active owner membership in the server and database.</p>
          </div>
          <Link href="/owners/approvals" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f0d492] to-[#d8b45a] px-4 py-3 text-sm font-bold text-[#151108] shadow-[0_8px_24px_rgba(216,180,90,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(216,180,90,0.22)]">Review approvals <ArrowUpRight size={16} /></Link>
        </div>
        <div className="mt-7 flex flex-wrap gap-2 border-t border-white/[0.08] pt-5">
          {membership.responsibilities.map((domain) => (
            <span key={domain} className="rounded-lg border border-white/[0.09] bg-[#0a0e16]/40 px-3 py-2 text-xs text-[#c0c8d5]">{DOMAIN_LABELS[domain] ?? domain}</span>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#e8ecf4]">Live workspace indicators</h2>
            <p className="mt-1 text-xs text-[#8994a8]">Read from the connected database or GitHub. Missing sources are shown as unavailable, not replaced with sample values.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#788499]"><ShieldCheck size={13} className="text-[#3dd6c0]" /> Source-backed</span>
        </div>
        {metrics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-[#8994a8]">No indicators are assigned to this account yet.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, note, icon: Icon }, index) => (
              <div key={label} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.15] hover:bg-white/[0.04]" style={{ animationDelay: `${index * 60}ms` }}>
                <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-[#d8b45a]/[0.045] blur-2xl transition group-hover:bg-[#d8b45a]/[0.09]" />
                <div className="relative flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl border border-[rgba(216,180,90,0.16)] bg-[rgba(216,180,90,0.08)] text-[#e7c879]"><Icon size={17} strokeWidth={1.8} /></span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#68758a]">Live</span>
                </div>
                <p className="relative mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c98ac]">{label}</p>
                <p className="relative mt-1 text-2xl font-semibold tracking-tight text-[#f1f3f7] tabular-nums">{value}</p>
                <p className="relative mt-2 text-[11px] text-[#788499]">{note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d8b45a]">Your assigned areas</p>
          <h2 className="mt-1 text-base font-semibold text-[#e8ecf4]">Workspace modules</h2>
          <p className="mt-1 text-xs text-[#8994a8]">Only modules granted by your Super Admin appear here.</p>
        </div>
        {visibleModules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <h3 className="font-medium text-[#e8ecf4]">No modules assigned yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#8994a8]">Your membership is active, but no workspace modules have been assigned. Ask the existing Super Admin to review your founder capabilities.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleModules.map(({ href, title, description, icon: Icon, group }) => (
              <Link key={href} href={href} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(216,180,90,0.25)] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8b45a] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl border border-[rgba(216,180,90,0.15)] bg-[rgba(216,180,90,0.075)] text-[#e7c879]"><Icon size={20} strokeWidth={1.8} /></span>
                  <ArrowUpRight size={17} className="text-[#6f7b90] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f0d492]" />
                </div>
                <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#7f8ba0]">{group}</p>
                <h3 className="mt-1.5 font-semibold text-[#e8ecf4]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#8994a8]">{description}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
