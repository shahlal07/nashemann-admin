import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/owner/Reveal";
import { requireOwner } from "@/lib/owner-authz";

export const dynamic = "force-dynamic";

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <section className="group h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--accent-violet-deep)] transition group-hover:border-[rgba(139,107,255,.25)]">
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-5 font-display text-3xl font-semibold tracking-[-0.045em] text-[var(--text)]">{value}</p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--text-faint)]">{detail}</p>
    </section>
  );
}

function SectionHeading({
  title,
  description,
  label,
}: {
  title: string;
  description: string;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-[var(--text)]">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      </div>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

export default async function OwnersOverviewPage() {
  const { supabase, membership, user } = await requireOwner();
  const canReadGovernance = membership.capabilities.includes("governance.read");
  const canReadApprovals = membership.capabilities.includes("approvals.read");

  const [decisionsResult, approvalsResult, ownersResult] = await Promise.all([
    canReadGovernance
      ? supabase.from("owner_decisions").select("id, title, summary, domain, status, created_at").order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
    canReadApprovals
      ? supabase.from("owner_approvals").select("id, title, description, domain, status, requested_at").eq("status", "pending").order("requested_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("owner_memberships").select("user_id, status").eq("status", "active"),
  ]);

  const decisions = decisionsResult.data ?? [];
  const approvals = approvalsResult.data ?? [];
  const dataWarnings = [decisionsResult.error, approvalsResult.error, ownersResult.error].filter(Boolean).length;
  const displayName = membership.display_name || membership.username || user.email?.split("@")[0] || "Founder";

  return (
    <div className="space-y-8 pb-8">
      <Reveal>
        <div className="flex flex-col justify-between gap-5 border-b border-[var(--border)] pb-7 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Executive overview
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
              Good to have you back, <span className="accent-text">{displayName}</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
              Your company at a glance. Focus on decisions, commitments, and the few things that need your attention.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-muted)]">
            <ShieldAlert size={15} className="text-[var(--accent-violet-deep)]" />
            Access scoped to your role
          </div>
        </div>
      </Reveal>

      {dataWarnings > 0 && (
        <Reveal>
          <div role="status" className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-sm text-[var(--text-muted)]">
            <ShieldAlert size={17} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            Some workspace records could not be loaded. Affected values are shown as unavailable rather than estimated.
          </div>
        </Reveal>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Reveal delay={0.02}>
          <Metric
            label="Active founders"
            value={ownersResult.error ? "—" : ownersResult.data?.length ?? 0}
            detail={ownersResult.error ? "Data temporarily unavailable" : "Authorized active memberships"}
            icon={Users}
          />
        </Reveal>
        <Reveal delay={0.08}>
          <Metric
            label="Awaiting approval"
            value={!canReadApprovals ? "Restricted" : approvalsResult.error ? "—" : approvals.length}
            detail={!canReadApprovals ? "Not included in your access" : approvalsResult.error ? "Data temporarily unavailable" : "Requests visible to your account"}
            icon={Clock3}
          />
        </Reveal>
        <Reveal delay={0.14}>
          <Metric
            label="Recorded decisions"
            value={!canReadGovernance ? "Restricted" : decisionsResult.error ? "—" : decisions.length}
            detail={!canReadGovernance ? "Not included in your access" : decisionsResult.error ? "Data temporarily unavailable" : "Most recent entries shown below"}
            icon={FileCheck2}
          />
        </Reveal>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <Reveal delay={0.05}>
          <section className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <SectionHeading
              title="Decision register"
              description="The latest recorded company decisions."
              label={canReadGovernance ? "Live records" : "Restricted"}
            />
            {!canReadGovernance ? (
              <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center">
                <ShieldAlert size={20} className="mx-auto text-[var(--text-faint)]" />
                <p className="mt-3 text-sm font-medium text-[var(--text)]">Governance access required</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Your assigned capabilities do not include decision visibility.</p>
              </div>
            ) : decisionsResult.error ? (
              <p className="mt-6 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--danger)]">Decision records are temporarily unavailable.</p>
            ) : decisions.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] px-4 py-9 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-solid)] text-[var(--text-faint)]"><CheckCircle2 size={19} /></div>
                <p className="mt-3 text-sm font-medium text-[var(--text)]">A clean slate</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">No decisions have been recorded yet.</p>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--border)]">
                {decisions.map((decision) => (
                  <li key={decision.id} className="group flex gap-3 py-4 first:pt-0 last:pb-0">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--accent-violet-deep)]"><CheckCircle2 size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[var(--text)]">{decision.title}</h3>
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--text-muted)]">{decision.status.replaceAll("_", " ")}</span>
                      </div>
                      {decision.summary && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{decision.summary}</p>}
                      <p className="mt-2 text-[11px] capitalize text-[var(--text-faint)]">{decision.domain.replaceAll("_", " ")} · {new Date(decision.created_at).toLocaleDateString()}</p>
                    </div>
                    <ArrowUpRight size={15} className="mt-1 shrink-0 text-[var(--text-faint)] opacity-0 transition group-hover:opacity-100" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>

        <Reveal delay={0.11}>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <SectionHeading
              title="Needs your attention"
              description="Items currently awaiting approval."
              label={canReadApprovals ? "Approval queue" : "Restricted"}
            />
            {!canReadApprovals ? (
              <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">Approval visibility is not enabled for your account.</div>
            ) : approvalsResult.error ? (
              <p className="mt-6 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--danger)]">Approval records are temporarily unavailable.</p>
            ) : approvals.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-solid)] text-[var(--success)]"><CheckCircle2 size={19} /></div>
                <p className="mt-3 text-sm font-medium text-[var(--text)]">You’re all caught up</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">No pending approvals are visible to your account.</p>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--border)]">
                {approvals.map((approval) => (
                  <li key={approval.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--warning-bg)] text-[var(--warning)]"><Clock3 size={15} /></span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--text)]">{approval.title}</h3>
                        {approval.description && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{approval.description}</p>}
                        <p className="mt-2 text-[11px] capitalize text-[var(--text-faint)]">{approval.domain.replaceAll("_", " ")} · Requested {new Date(approval.requested_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>
      </div>

      <Reveal delay={0.08}>
        <div className="flex items-center gap-3 border-t border-[var(--border)] pt-5 text-xs leading-5 text-[var(--text-faint)]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]"><ShieldAlert size={14} /></span>
          <p>Workspace activity reflects records your account is permitted to read. Financial and operational metrics will appear only when connected to verified source data.</p>
        </div>
      </Reveal>
    </div>
  );
}
