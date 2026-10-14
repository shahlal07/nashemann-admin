import { requireSuperAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function BillingMonitoringPage() {
  const { supabase } = await requireSuperAdmin();
  const [{ data: runs, error: runsError }, { data: reminders, error: remindersError }] = await Promise.all([
    supabase.from("billing_job_runs").select("id, job_name, status, started_at, completed_at, result, error_message").order("started_at", { ascending: false }).limit(100),
    supabase.from("billing_reminder_log").select("id, settlement_id, reminder_stage, status, attempts, last_error, sent_at, updated_at, settlements(month, vendors(name))").order("updated_at", { ascending: false }).limit(100),
  ]);
  if (runsError) throw new Error(runsError.message);
  if (remindersError) throw new Error(remindersError.message);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <a href="/settlements/billing-settings" className="text-sm text-[var(--text-muted)] hover:underline">← Back to billing policy</a>
      <header>
        <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Billing automation monitor</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Latest scheduled job runs and reminder delivery attempts. Email failures may indicate that the email provider is not configured or rejected a message.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text)]">Scheduled job runs</h2>
        {(runs ?? []).map((run) => (
          <article key={run.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold text-[var(--text)]">{run.job_name}</p><p className="mt-1 break-all text-xs text-[var(--text-muted)]">{run.id}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Started {new Date(run.started_at).toLocaleString("en-PK")} · Completed {run.completed_at ? new Date(run.completed_at).toLocaleString("en-PK") : "not completed"}</p></div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${run.status === "succeeded" ? "border-emerald-300 text-emerald-700" : run.status === "failed" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}`}>{run.status}</span>
            </div>
            {run.error_message && <p className="mt-3 whitespace-pre-wrap text-sm text-red-700">{run.error_message}</p>}
            {run.result && <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--surface-hover)] p-3 text-xs">{JSON.stringify(run.result, null, 2)}</pre>}
          </article>
        ))}
        {(runs ?? []).length === 0 && <p className="rounded-xl border border-[var(--border)] p-5 text-sm text-[var(--text-muted)]">No scheduled runs have been recorded yet.</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text)]">Reminder delivery history</h2>
        {(reminders ?? []).map((reminder) => {
          const settlement = reminder.settlements as unknown as { month: string; vendors: { name: string } | null } | null;
          return (
            <article key={reminder.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-[var(--text)]">{settlement?.vendors?.name ?? "Vendor"} · {settlement?.month ?? "Invoice"}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Stage: {reminder.reminder_stage.replaceAll("_", " ")} · Attempts: {reminder.attempts}</p><p className="mt-1 break-all text-xs text-[var(--text-muted)]">Settlement {reminder.settlement_id}</p></div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${reminder.status === "sent" ? "border-emerald-300 text-emerald-700" : reminder.status === "failed" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}`}>{reminder.status}</span>
              </div>
              {reminder.last_error && <p className="mt-2 whitespace-pre-wrap text-sm text-red-700">{reminder.last_error}</p>}
              {reminder.sent_at && <p className="mt-2 text-xs text-[var(--text-muted)]">Provider accepted message at {new Date(reminder.sent_at).toLocaleString("en-PK")}</p>}
            </article>
          );
        })}
        {(reminders ?? []).length === 0 && <p className="rounded-xl border border-[var(--border)] p-5 text-sm text-[var(--text-muted)]">No reminder attempts have been recorded yet.</p>}
      </section>
    </main>
  );
}
