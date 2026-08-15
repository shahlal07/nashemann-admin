"use client";

import { useMemo, useState } from "react";
import { Download, Wallet, CheckCircle2, Clock, Ban } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { useToast } from "@/components/ui/Toast";
import { formatPKR, formatDate } from "@/lib/utils";
import { formatInCurrency, type CurrencyRate } from "@/lib/currency";

export type FeeStatus = "pending" | "partially_paid" | "paid" | "waived" | "reversed";

export type PlatformFeeRow = {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorCurrency: string;
  month: string;
  platformFee: number;
  amountPaid: number;
  status: FeeStatus;
  dueDate: string | null;
};

const STATUS_TONE: Record<FeeStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  partially_paid: "info",
  paid: "success",
  waived: "neutral",
  reversed: "danger",
};

const STATUS_LABEL: Record<FeeStatus, string> = {
  pending: "Pending",
  partially_paid: "Partially paid",
  paid: "Paid",
  waived: "Waived",
  reversed: "Reversed",
};

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

function isOverdue(row: PlatformFeeRow) {
  if (row.status !== "pending" && row.status !== "partially_paid") return false;
  if (!row.dueDate) return false;
  return new Date(row.dueDate) < new Date(new Date().toDateString());
}

function toCSV(rows: PlatformFeeRow[]) {
  const header = ["Vendor", "Month", "Platform fee", "Amount paid", "Status", "Due date"];
  const lines = rows.map((r) =>
    [
      r.vendorName,
      monthLabel(r.month),
      r.platformFee.toFixed(2),
      r.amountPaid.toFixed(2),
      STATUS_LABEL[r.status] + (isOverdue(r) ? " (Overdue)" : ""),
      r.dueDate ? formatDate(r.dueDate) : "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function PlatformFeesClient({
  rows,
  vendorOptions,
  rates = [],
}: {
  rows: PlatformFeeRow[];
  vendorOptions: { id: string; name: string }[];
  rates?: CurrencyRate[];
}) {
  const { showToast } = useToast();
  const [vendorFilter, setVendorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (vendorFilter !== "all" && r.vendorId !== vendorFilter) return false;
      if (statusFilter === "overdue") {
        if (!isOverdue(r)) return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      if (fromDate && r.month < fromDate) return false;
      if (toDate && r.month > toDate) return false;
      return true;
    });
  }, [rows, vendorFilter, statusFilter, fromDate, toDate]);

  const totals = useMemo(() => {
    const pending = rows
      .filter((r) => r.status === "pending" || r.status === "partially_paid")
      .reduce((sum, r) => sum + Math.max(0, r.platformFee - r.amountPaid), 0);
    const paid = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amountPaid, 0);
    const reversed = rows.filter((r) => r.status === "reversed").length;
    const waived = rows.filter((r) => r.status === "waived").length;
    return { pending, paid, reversed, waived };
  }, [rows]);

  function handleExport() {
    if (filtered.length === 0) {
      showToast("Nothing to export for the current filters.", "info");
      return;
    }
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-fees-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} row${filtered.length === 1 ? "" : "s"} to CSV.`, "success");
  }

  return (
    <div>
      <StaggerGroup className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label="Pending fees" value={totals.pending} prefix="Rs " icon={Clock} accent="amber" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Paid fees" value={totals.paid} prefix="Rs " icon={CheckCircle2} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Reversed settlements" value={totals.reversed} icon={Ban} accent="amber" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Waived settlements" value={totals.waived} icon={Wallet} />
        </StaggerItem>
      </StaggerGroup>

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Vendor</label>
            <select className={inputClass} value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
              <option value="all">All vendors</option>
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Status</label>
            <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
              <option value="reversed">Reversed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">From month</label>
            <input type="month" className={inputClass} value={fromDate} onChange={(e) => setFromDate(e.target.value ? `${e.target.value}-01` : "")} />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">To month</label>
            <input type="month" className={inputClass} value={toDate} onChange={(e) => setToDate(e.target.value ? `${e.target.value}-01` : "")} />
          </div>
          <Button variant="secondary" size="md" onClick={handleExport} className="shrink-0">
            <Download size={15} /> Export CSV
          </Button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                <th className="pb-3 pr-4">Vendor</th>
                <th className="pb-3 pr-4">Month</th>
                <th className="pb-3 pr-4">Platform fee</th>
                <th className="pb-3 pr-4">Paid</th>
                <th className="pb-3 pr-4">Due date</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 pr-4 font-medium text-[var(--text)]">{r.vendorName}</td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">{monthLabel(r.month)}</td>
                  <td className="py-3 pr-4 font-semibold text-[var(--text)]">
                    {formatPKR(r.platformFee)}
                    {r.vendorCurrency !== "PKR" && (
                      <span className="ml-1.5 font-normal text-[var(--text-faint)]">(~{formatInCurrency(r.platformFee, r.vendorCurrency, rates)})</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">{formatPKR(r.amountPaid)}</td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">{r.dueDate ? formatDate(r.dueDate) : "—"}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={STATUS_TONE[r.status]} dot>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                      {isOverdue(r) && <Badge tone="danger">Overdue</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-faint)]">
                    {rows.length === 0 ? "No platform fees recorded yet." : "No rows match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
