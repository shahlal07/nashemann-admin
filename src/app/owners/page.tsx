import { Activity, CheckCircle2, Clock3, ShieldAlert, Users } from "lucide-react";
import { requireOwner } from "@/lib/owner-authz";

export const dynamic = "force-dynamic";

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Activity }) {
  return (
    <section className="glass-panel rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">{label}</p>
        <Icon size={18} className="text-[var(--accent-violet)]" />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-faint)]">{detail}</p>
    </section>
  );
}

export default async function OwnersOverviewPage() {
  const { supabase, membership, user } = await requireOwner();
  const canReadGovernance = membership.capabilities.includes("governance.read");
  const canReadApprovals = membership.capabilities.includes("approvals.read");

  const [decisionsResult, approvalsResult, ownersResult] = await Promise.all([
    canReadGovernance
      ? supabase.from("owner_decisions").select("id, title, summary, domain, status, created_at").order("created_at", { ascending: false }).limit(6)
      : Promise.resolve({ data: [], error: null }),
    canReadApprovals
      ? supabase.from("owner_approvals").select("id, title, description, domain, status, requested_at").eq("status", "pending").order("requested_at", { ascending: false }).limit(6)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("owner_memberships").select("user_id, display_name, username, status, responsibilities, capabilities").eq("status", "active"),
  ]);

  const decisions = decisionsResult.data ?? [];
  const approvals = approvalsResult.data ?? [];
  const activeOwners = ownersResult.data?.length ?? 0;
  const dataWarnings = [decisionsResult.error, approvalsResult.error, ownersResult.error].filter(Boolean).length;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet)]">Shared governance</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--text)] sm:text-3xl">Founder workspace</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Welcome, {membership.display_name || membership.username || user.email || "Founder"}. Your view is limited to the capabilities assigned to your account.</p>
      </div>

      {dataWarnings > 0 && <div role="status" className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]"><ShieldAlert size={17} className="mt-0.5 shrink-0" />Some live workspace data could not be loaded under your current permissions. Counts below may be incomplete.</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Active founder accounts" value={ownersResult.error ? "—" : activeOwners} detail="Visible under your database permissions" icon={Users} />
        <Metric label="Pending approvals" value={canReadApprovals ? approvalsResult.error ? "—" : approvals.length : "Restricted"} detail={canReadApprovals ? "Live requests awaiting review" : "Requires approvals.read"} icon={Clock3} />
        <Metric label="Recent decisions" value={canReadGovernance ? decisionsResult.error ? "—" : decisions.length : "Restricted"} detail={canReadGovernance ? "Latest recorded governance decisions" : "Requires governance.read"} icon={CheckCircle2} />
      </div>

      <section className="glass-panel rounded-[var(--radius-lg)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--text)]">Recent decisions</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Read directly from the governance database; no seeded demo records.</p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)]">{canReadGovernance ? "Live data" : "Access restricted"}</span>
        </div>
        {!canReadGovernance ? (
          <p className="mt-5 text-sm text-[var(--text-muted)]">Your account does not currently have permission to read governance decisions.</p>
        ) : decisionsResult.error ? (
          <p className="mt-5 text-sm text-[var(--danger)]">Could not load decisions. Please try again later or contact an administrator.</p>
        ) : decisions.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-muted)]">No decisions have been recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {decisions.map((decision) => <li key={decision.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-[var(--text)]">{decision.title}</h3>
                <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)]">{decision.status.replaceAll("_", " ")}</span>
              </div>
              {decision.summary && <p className="mt-1 text-sm text-[var(--text-muted)]">{decision.summary}</p>}
              <p className="mt-2 text-xs text-[var(--text-faint)]">{decision.domain.replaceAll("_", " ")} · {new Date(decision.created_at).toLocaleDateString()}</p>
            </li>)}
          </ul>
        )}
      </section>

      <section className="glass-panel rounded-[var(--radius-lg)] p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Pending approvals</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Requests visible to your assigned approval capabilities.</p>
        {!canReadApprovals ? <p className="mt-4 text-sm text-[var(--text-muted)]">Your account does not currently have approvals.read.</p>
          : approvalsResult.error ? <p className="mt-4 text-sm text-[var(--danger)]">Could not load approval requests.</p>
          : approvals.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-muted)]">No pending approvals are visible to your account.</p>
          : <ul className="mt-4 divide-y divide-[var(--border)]">{approvals.map((approval) => <li key={approval.id} className="py-4 first:pt-0 last:pb-0"><div className="font-medium text-[var(--text)]">{approval.title}</div>{approval.description && <p className="mt-1 text-sm text-[var(--text-muted)]">{approval.description}</p>}<p className="mt-2 text-xs text-[var(--text-faint)]">{approval.domain.replaceAll("_", " ")} · Requested {new Date(approval.requested_at).toLocaleDateString()}</p></li>)}</ul>}
      </section>
    </div>
  );
}
