"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Copy, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Category = "notifications" | "marketing" | "support" | "security" | "staff";
type Domain = {
  id: string;
  name: string;
  status: string;
  region?: string;
  records?: Array<{ record?: string; type?: string; name?: string; value?: string; ttl?: string | number; status?: string; priority?: number }>;
  created_at?: string;
};
type EmailRow = {
  id: string;
  created_at: string;
  category: Category;
  source: string;
  recipient_domain: string | null;
  subject: string;
  status: "sent" | "failed" | "skipped";
  provider_id?: string | null;
  error_message?: string | null;
};
type Payload = {
  settings: { categoryEnabled: Record<Category, boolean>; senderFrom: Record<Category, string>; updatedAt: string | null };
  domains: Domain[];
  metrics: { sentTotal: number; sentToday: number; sentMonth: number; failedMonth: number; skippedMonth: number; byCategory: Record<Category, number>; bySource: Record<string, number> };
  recent: EmailRow[];
};

const CATEGORIES: { key: Category; title: string; description: string }[] = [
  { key: "notifications", title: "Transactional notifications", description: "Order, payment, account, and platform updates." },
  { key: "marketing", title: "Marketing & announcements", description: "Announcements and promotional messages." },
  { key: "support", title: "Customer support", description: "Support replies and support-related communication." },
  { key: "security", title: "Security", description: "Password, credential, and account-security messages." },
  { key: "staff", title: "Staff", description: "Staff invitations and administrative messages." },
];

const inputClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

async function apiRequest(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch("/api/platform/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Request failed.");
  return result;
}

export function EmailCenterClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/email", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load email settings.");
      setData(result as Payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load email settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveSettings() {
    if (!data) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest("save-settings", {
        categoryEnabled: data.settings.categoryEnabled,
        senderFrom: data.settings.senderFrom,
      });
      setNotice("Email controls saved. The central mailer will apply these settings to new sends.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save email settings.");
    } finally {
      setBusy(false);
    }
  }

  async function addDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest("add-domain", { name: domainName });
      setDomainName("");
      setNotice("Domain added in Resend. Add the DNS records shown below at your DNS provider, then verify it here.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add domain.");
    } finally {
      setBusy(false);
    }
  }

  async function domainAction(action: "verify-domain" | "remove-domain", domain: Domain) {
    const message = action === "remove-domain"
      ? `Remove ${domain.name} from Resend? This does not remove DNS records at your DNS provider.`
      : `Ask Resend to verify DNS records for ${domain.name} now?`;
    if (!window.confirm(message)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(action, { domainId: domain.id });
      setNotice(action === "remove-domain" ? `Removed ${domain.name} from Resend.` : `Verification requested for ${domain.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Domain action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied DNS value.");
    } catch {
      setNotice("Select and copy the DNS value manually.");
    }
  }

  const metrics = data?.metrics;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Email Control Center"
        description="Manage sender domains, pause email categories, and monitor sends across the platform."
        action={<Button type="button" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={15} /> Refresh</Button>}
      />

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[rgba(251,113,133,0.35)] bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger)]"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] p-3 text-sm text-[var(--text)]"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />{notice}</div>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          ["Accepted sends", metrics?.sentTotal],
          ["Accepted today (UTC)", metrics?.sentToday],
          ["Accepted this month (UTC)", metrics?.sentMonth],
          ["Failed (30 days)", metrics?.failedMonth],
          ["Skipped in 30 days", metrics?.skippedMonth],
        ].map(([label, value]) => (
          <Card key={String(label)} className="!p-4">
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-[var(--text)]">{loading ? "—" : Number(value ?? 0).toLocaleString()}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Accepted sends by app" description="All logged sends since this control center was enabled, grouped by the app that requested them." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            ["Super Admin", "nashemann-admin"],
            ["Platform website", "nashemann-web"],
            ["Vendor admin", "vendor-admins"],
            ["Storefront", "vendor-storefronts"],
            ["Other / unidentified", "external"],
          ].map(([label, source]) => (
            <div key={source} className="rounded-xl border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <p className="mt-2 font-display text-xl font-semibold text-[var(--text)]">{loading ? "—" : Number(metrics?.bySource?.[source] ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Email categories" description="Turning a category off blocks new sends across all apps using the central mailer. Security and support can be controlled independently." />
        <div className="space-y-3">
          {CATEGORIES.map((category) => {
            const enabled = data?.settings.categoryEnabled[category.key] ?? true;
            return (
              <div key={category.key} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text)]">{category.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{category.description}</p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">{(metrics?.byCategory?.[category.key] ?? 0).toLocaleString()} accepted sends logged</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!data || busy}
                    onChange={(event) => setData((current) => current ? {
                      ...current,
                      settings: { ...current.settings, categoryEnabled: { ...current.settings.categoryEnabled, [category.key]: event.target.checked } },
                    } : current)}
                    className="h-4 w-4 accent-[var(--accent-violet)]"
                  />
                  {enabled ? "Enabled" : "Paused"}
                </label>
                <div className="w-full sm:w-64">
                  <label className={labelClass} htmlFor={`sender-${category.key}`}>Sender email (optional)</label>
                  <input
                    id={`sender-${category.key}`}
                    className={inputClass}
                    type="email"
                    placeholder={category.key === "marketing" ? "marketing@yourdomain.com" : `${category.key}@yourdomain.com`}
                    value={data?.settings.senderFrom[category.key] ?? ""}
                    disabled={!data || busy}
                    onChange={(event) => setData((current) => current ? {
                      ...current,
                      settings: { ...current.settings, senderFrom: { ...current.settings.senderFrom, [category.key]: event.target.value } },
                    } : current)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--text-faint)]">Custom sender addresses must belong to a Resend-verified domain. Leave blank to use the current Nashemann sender.</p>
          <Button type="button" variant="primary" onClick={() => void saveSettings()} disabled={!data || busy}>{busy ? "Working…" : "Save email controls"}</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Sending domains" description="Add domains through Resend, publish the requested DNS records, then verify them before selecting a sender address." />
        <form onSubmit={addDomain} className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className={labelClass}>Domain name</span>
            <input className={inputClass} value={domainName} onChange={(event) => setDomainName(event.target.value)} placeholder="mail.yourdomain.com" required disabled={busy} />
          </label>
          <div className="flex items-end"><Button type="submit" variant="primary" disabled={busy || !domainName.trim()}><Plus size={15} /> Add domain</Button></div>
        </form>
        {!data?.domains?.length && !loading && <p className="text-sm text-[var(--text-muted)]">No domains returned from Resend.</p>}
        <div className="space-y-4">
          {data?.domains?.map((domain) => (
            <div key={domain.id} className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-all text-sm font-semibold text-[var(--text)]">{domain.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Region: {domain.region ?? "—"} · Status: <span className={domain.status === "verified" ? "font-semibold text-emerald-500" : "font-semibold text-amber-500"}>{domain.status}</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {domain.status !== "verified" && <Button type="button" size="sm" onClick={() => void domainAction("verify-domain", domain)} disabled={busy}><ShieldCheck size={14} /> Verify DNS</Button>}
                  <Button type="button" size="sm" variant="danger" onClick={() => void domainAction("remove-domain", domain)} disabled={busy}><Trash2 size={14} /> Remove</Button>
                </div>
              </div>
              {domain.records?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-xs">
                    <thead className="text-[var(--text-faint)]"><tr><th className="pb-2 pr-3 font-medium">Type</th><th className="pb-2 pr-3 font-medium">Name</th><th className="pb-2 pr-3 font-medium">Value</th><th className="pb-2 pr-3 font-medium">Status</th><th className="pb-2 font-medium">Copy</th></tr></thead>
                    <tbody>
                      {domain.records.map((record, index) => (
                        <tr key={`${domain.id}-${index}`} className="border-t border-[var(--border)] align-top">
                          <td className="py-2 pr-3 text-[var(--text)]">{record.type ?? record.record ?? "—"}</td>
                          <td className="max-w-48 break-all py-2 pr-3 text-[var(--text-muted)]">{record.name ?? "@"}</td>
                          <td className="max-w-80 break-all py-2 pr-3 font-mono text-[var(--text-muted)]">{record.value ?? "—"}</td>
                          <td className="py-2 pr-3 text-[var(--text-muted)]">{record.status ?? "—"}</td>
                          <td className="py-2"><button type="button" className="inline-flex items-center gap-1 text-[var(--accent-violet)]" onClick={() => void copyValue(record.value ?? "")}><Copy size={13} /> Copy</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="mt-3 text-xs text-[var(--text-faint)]">DNS records are not available in the current response. Refresh after adding the domain in Resend.</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent email activity" description="Each row represents one recipient attempt through the central mailer. A Resend-accepted message is not a guarantee of inbox delivery." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="text-[var(--text-faint)]"><tr>
              <th className="pb-3 pr-3 font-medium">Time</th><th className="pb-3 pr-3 font-medium">Category</th><th className="pb-3 pr-3 font-medium">Source</th><th className="pb-3 pr-3 font-medium">Recipient domain</th><th className="pb-3 pr-3 font-medium">Subject</th><th className="pb-3 font-medium">Status</th>
            </tr></thead>
            <tbody>
              {data?.recent?.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)] align-top">
                  <td className="whitespace-nowrap py-3 pr-3 text-[var(--text-muted)]">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-3 capitalize text-[var(--text)]">{row.category}</td>
                  <td className="py-3 pr-3 text-[var(--text-muted)]">{row.source}</td>
                  <td className="py-3 pr-3 text-[var(--text-muted)]">{row.recipient_domain ?? "—"}</td>
                  <td className="max-w-80 py-3 pr-3 text-[var(--text)]">{row.subject}{row.error_message && <p className="mt-1 break-words text-[var(--danger)]">{row.error_message}</p>}</td>
                  <td className="py-3"><span className={row.status === "sent" ? "rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-500" : row.status === "failed" ? "rounded-full bg-rose-500/10 px-2 py-1 text-rose-500" : "rounded-full bg-amber-500/10 px-2 py-1 text-amber-500"}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !data?.recent?.length && <p className="py-5 text-center text-sm text-[var(--text-muted)]">No email activity has been logged yet.</p>}
        </div>
        <p className="mt-3 text-xs text-[var(--text-faint)]">Historical emails sent before this control center was enabled are not backfilled. Customer password-recovery emails sent directly by Supabase Auth are also outside this log unless separately integrated.</p>
      </Card>
    </div>
  );
}
