import { Workflow } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";

export default async function FounderTechnologyPage() {
  await requireFounder("technology.read");

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Product & technology</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Delivery and platform health</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        A founder-level view of roadmap priorities, security work, release readiness,
        incidents, and delivery ownership.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
        <Workflow size={24} className="text-[var(--text-muted)]" />
        <h2 className="mt-4 font-semibold">Repository and deployment integrations pending</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Status indicators will only be shown when backed by verified repository,
          CI, or deployment data. No mocked green health status is shown here.
        </p>
      </div>
    </section>
  );
}
