import Link from "next/link";

export default function FounderForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Nashemann · Access control</p>
        <h1 className="mt-3 text-2xl font-semibold">This area is not assigned to your role</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Your founder membership does not include the capability required for this area.
          If you need access, ask the existing Super Admin to review your assigned capabilities.
        </p>
        <Link className="mt-6 inline-flex rounded-xl bg-[var(--accent-violet)] px-4 py-2.5 text-sm font-medium text-white" href="/owners">
          Return to workspace
        </Link>
      </section>
    </main>
  );
}
