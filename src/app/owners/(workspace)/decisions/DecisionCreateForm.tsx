"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DecisionDomain = "product_technology" | "business_strategy";

export function DecisionCreateForm({ domains }: { domains: DecisionDomain[] }) {
  const router = useRouter();
  const [domain, setDomain] = useState<DecisionDomain>(domains[0] ?? "business_strategy");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/owners/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, title: title.trim(), summary: summary.trim() || null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save this decision.");
      setTitle("");
      setSummary("");
      setSuccess("Decision saved as proposed.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this decision.");
    } finally {
      setSaving(false);
    }
  }

  if (!domains.length) return null;

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-xl border border-[var(--border)] p-4">
      <h3 className="font-medium">Record a decision</h3>
      {domains.length > 1 && (
        <label className="block text-sm">
          Domain
          <select value={domain} onChange={(event) => setDomain(event.target.value as DecisionDomain)} className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            {domains.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
      )}
      <label className="block text-sm">
        Title
        <input required minLength={3} maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2" />
      </label>
      <label className="block text-sm">
        Rationale / summary
        <textarea rows={3} maxLength={5000} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2" />
      </label>
      <p className="text-xs text-[var(--text-muted)]">New records start as proposed. Approval and rejection are handled separately through governance review.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      <button type="submit" disabled={saving} className="rounded-lg bg-[var(--accent-violet-deep)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving…" : "Save decision"}</button>
    </form>
  );
}
