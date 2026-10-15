import { CheckSquare } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";

export default async function FounderApprovalsPage() {
  await requireFounder("approvals.read");

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Governance</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Approval center</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        A single queue for decisions that need explicit founder review, with a recorded
        actor, outcome, timestamp, and rationale.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
        <CheckSquare size={24} className="text-[var(--text-muted)]" />
        <h2 className="mt-4 font-semibold">Approval workflow not enabled</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Approval quorum, financial thresholds, self-approval, and conflict-of-interest
          rules have not been approved. No approval action is available until those rules
          and the database audit trail are implemented.
        </p>
      </div>
    </section>
  );
}
