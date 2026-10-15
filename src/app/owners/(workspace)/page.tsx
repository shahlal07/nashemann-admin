import Link from "next/link";
import {
  ArrowRight,
  CheckSquare,
  CircleDollarSign,
  FileText,
  Workflow,
} from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";

const MODULES = [
  {
    href: "/owners/decisions",
    title: "Company decisions",
    description: "Review documented decisions and the reasoning behind them.",
    capability: "governance.read",
    icon: FileText,
  },
  {
    href: "/owners/approvals",
    title: "Approvals",
    description: "A central place for requests that require founder review.",
    capability: "approvals.read",
    icon: CheckSquare,
  },
  {
    href: "/owners/finance",
    title: "Finance & governance",
    description: "Separate platform revenue, marketplace GMV, liabilities, and profit.",
    capability: "finance.read",
    icon: CircleDollarSign,
  },
  {
    href: "/owners/technology",
    title: "Product & technology",
    description: "Track technical priorities, risks, releases, and delivery.",
    capability: "technology.read",
    icon: Workflow,
  },
] as const;

export default async function FounderOverviewPage() {
  const { membership } = await requireFounder("workspace.read");
  const visibleModules = MODULES.filter((item) =>
    membership.capabilities.includes(item.capability as (typeof membership.capabilities)[number]),
  );

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-[var(--accent-violet)]/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">
            Shared company workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Good to have you here.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            A role-aware home for company decisions, approvals, financial visibility,
            and execution. Only modules assigned to your founder membership appear here.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--text-muted)]">
            <span className="size-2 rounded-full bg-amber-500" />
            Foundation stage · Live data integrations are not connected yet
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Your workspace</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Available areas are determined by your assigned capabilities.
            </p>
          </div>
        </div>

        {visibleModules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <h3 className="font-medium">No modules assigned yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-muted)]">
              Your membership is active, but no workspace modules have been assigned.
              Ask the existing Super Admin to review your founder capabilities.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleModules.map(({ href, title, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent-violet)]/40 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)] sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-[var(--surface-hover)] text-[var(--accent-violet-deep)]">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <ArrowRight size={18} className="text-[var(--text-muted)] transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
                <p className="mt-4 text-xs text-[var(--text-muted)]">Data connection pending</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="font-semibold">Guardrails currently in place</h2>
        <ul className="mt-4 grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
          <li className="flex gap-2"><span className="text-emerald-600">✓</span> Founder membership is separate from staff roles.</li>
          <li className="flex gap-2"><span className="text-emerald-600">✓</span> Missing or inactive membership is denied by default.</li>
          <li className="flex gap-2"><span className="text-emerald-600">✓</span> Existing Super Admin authorization remains separate.</li>
          <li className="flex gap-2"><span className="text-amber-600">!</span> Approval rules and live data sources still require integration.</li>
        </ul>
      </section>
    </div>
  );
}
