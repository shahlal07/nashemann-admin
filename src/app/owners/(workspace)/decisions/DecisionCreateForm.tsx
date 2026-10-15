"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createOwnerDecisionAction } from "../../actions";
import type { FounderResponsibility } from "@/lib/founders/capabilities";

const LABELS: Record<FounderResponsibility, string> = {
  shared_governance: "Shared governance",
  finance_governance: "Finance & governance",
  product_technology: "Product & technology",
  business_strategy: "Business & strategy",
  operations: "Operations",
};

export function DecisionCreateForm({ domains }: { domains: FounderResponsibility[] }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!domains.length) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    setSuccess(false);
    startSaving(async () => {
      try {
        await createOwnerDecisionAction({
          title: String(form.get("title") ?? ""),
          summary: String(form.get("summary") ?? ""),
          domain: String(form.get("domain") ?? ""),
        });
        formElement.reset();
        setSuccess(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save the decision.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-semibold">Record a company decision</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Title</span><input name="title" required minLength={3} maxLength={240} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm" placeholder="Decision title" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Domain</span><select name="domain" required defaultValue={domains[0]} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm">{domains.map((domain) => <option key={domain} value={domain}>{LABELS[domain]}</option>)}</select></label>
      </div>
      <label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Summary / rationale</span><textarea name="summary" rows={3} maxLength={5000} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm" placeholder="Capture the decision, context, and rationale…" /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="text-sm text-emerald-700">Decision saved to the live register.</p>}
      <button type="submit" disabled={saving} className="rounded-xl bg-[var(--accent-violet)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save decision"}</button>
    </form>
  );
}
