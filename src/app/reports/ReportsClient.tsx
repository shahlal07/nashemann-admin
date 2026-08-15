"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";

const RANGES = ["Last 7 days", "Last 30 days", "Last year", "All time"] as const;

function DownloadButtons({ label }: { label: string }) {
  function download(format: string) {
    alert(`Frontend demo — would download ${label} as ${format.toUpperCase()}. No backend wired up yet.`);
  }
  return (
    <div className="flex gap-2">
      <button
        onClick={() => download("csv")}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]"
      >
        <FileDown size={12} /> CSV
      </button>
      <button
        onClick={() => download("xlsx")}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]"
      >
        <FileSpreadsheet size={12} /> Excel
      </button>
      <button
        onClick={() => download("pdf")}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]"
      >
        <FileText size={12} /> PDF
      </button>
    </div>
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

  return (
    <div>
      <PageHeader title="Reports" description="Export platform data as CSV, Excel, or PDF." />

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
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r ? "text-black" : "border border-[var(--border)] text-[var(--text-muted)]"
                }`}
                style={range === r ? { background: "var(--accent-gradient)" } : undefined}
              >
                {r}
              </button>
            ))}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]" />
            <span className="text-xs text-[var(--text-faint)]">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]" />
          </div>
          <DownloadButtons label="Vendors report" />
        </Card>

        <Card>
          <CardHeader
            title="Applications report"
            description={`Every vendor application with status and decision date. ${applicationCount} application(s) available.`}
          />
          <DownloadButtons label="Applications report" />
        </Card>

        <Card>
          <CardHeader
            title="Settlements report"
            description={`Monthly platform-fee reconciliation across every vendor. ${settlementCount} settlement record(s) available.`}
          />
          <DownloadButtons label="Settlements report" />
        </Card>
      </div>
    </div>
  );
}
