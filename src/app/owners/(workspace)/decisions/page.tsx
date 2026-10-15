import { FileText } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";

export default async function FounderDecisionsPage() {
  await requireFounder("governance.read");

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Governance</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Company decisions</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        The decision register will hold the approved decision, rationale, accountable owner,
        date, and linked actions.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
        <FileText size={24} className="text-[var(--text-muted)]" />
        <h2 className="mt-4 font-semibold">Decision register not connected</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          No decisions are displayed as live records yet. The governance data model and
          write/approval rules must be reviewed before this module can create or change records.
        </p>
      </div>
    </section>
  );
}
