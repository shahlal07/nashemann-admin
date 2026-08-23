"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

const RANGES = ["Last 7 days", "Last 30 days", "Last year", "All time"] as const;

type ReportKind = "vendors" | "applications" | "settlements";

function DownloadButton({ label, kind, query }: { label: string; kind: ReportKind; query?: string }) {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${kind}${query ?? ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Couldn't export ${label}.`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `${kind}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Couldn't export ${label}.`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
    >
      <FileDown size={12} /> {busy ? "Exporting…" : "CSV"}
    </button>
  );
}

export function ReportsClient({
  vendorCount,
  applicationCount,
  settlementCount,
}: {
  vendorCount: number;
  applicationCount: number;
  settlementCount: number;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("Last 30 days");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  function selectRange(r: (typeof RANGES)[number]) {
    setRange(r);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (r === "All time") {
      setFrom("");
      setTo(todayStr);
      return;
    }
    const days = r === "Last 7 days" ? 7 : r === "Last 30 days" ? 30 : 365;
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    setFrom(start.toISOString().slice(0, 10));
    setTo(todayStr);
  }

  const vendorsQuery = from || to ? `?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}` : "";

  return (
    <div>
      <PageHeader title="Reports" description="Export platform data as CSV." />

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Vendors report"
            description={`Every vendor with status, plan, orders, and revenue for the selected range. ${vendorCount} vendor(s) available.`}
          />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => selectRange(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r ? "text-black" : "border border-[var(--border)] text-[var(--text-muted)]"
                }`}
                style={range === r ? { background: "var(--accent-gradient)" } : undefined}
              >
                {r}
              </button>
            ))}
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setRange("All time"); }}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
            />
            <span className="text-xs text-[var(--text-faint)]">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setRange("All time"); }}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
            />
          </div>
          <DownloadButton label="Vendors report" kind="vendors" query={vendorsQuery} />
        </Card>

        <Card>
          <CardHeader
            title="Applications report"
            description={`Every vendor application with status and decision date. ${applicationCount} application(s) available.`}
          />
          <DownloadButton label="Applications report" kind="applications" />
        </Card>

        <Card>
          <CardHeader
            title="Settlements report"
            description={`Monthly platform-fee reconciliation across every vendor. ${settlementCount} settlement record(s) available.`}
          />
          <DownloadButton label="Settlements report" kind="settlements" />
        </Card>
      </div>
    </div>
  );
}
