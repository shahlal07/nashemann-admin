"use client";

import { Fragment, useState, useTransition } from "react";
import { ChevronDown, Receipt } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPKR, formatDateTime } from "@/lib/utils";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { ReasonModal } from "./ReasonModal";
import { waiveSettlementAction, reverseSettlementAction } from "./actions";

export type SettlementStatus = "pending" | "partially_paid" | "paid" | "waived" | "reversed";

export type SettlementPaymentRow = {
  id: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  paidAt: string;
  paidByName: string | null;
};

export type SettlementRow = {
  id: string;
  vendorId: string;
  vendorName: string;
  month: string;
  ordersCount: number;
  grossRevenue: number;
  platformFee: number;
  status: SettlementStatus;
  amountPaid: number;
  dueDate: string | null;
  waivedReason: string | null;
  reversedReason: string | null;
  payments: SettlementPaymentRow[];
};

const STATUS_TONE: Record<SettlementStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  partially_paid: "info",
  paid: "success",
  waived: "neutral",
  reversed: "danger",
};

const STATUS_LABEL: Record<SettlementStatus, string> = {
  pending: "Pending",
  partially_paid: "Partially paid",
  paid: "Paid",
  waived: "Waived",
  reversed: "Reversed",
};

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
};

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

function isOverdue(row: SettlementRow) {
  if (row.status !== "pending" && row.status !== "partially_paid") return false;
  if (!row.dueDate) return false;
  return new Date(row.dueDate) < new Date(new Date().toDateString());
}

export function SettlementsTable({ initialSettlements }: { initialSettlements: SettlementRow[] }) {
  const [settlements, setSettlements] = useState(initialSettlements);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<SettlementRow | null>(null);
  const [waiveTarget, setWaiveTarget] = useState<SettlementRow | null>(null);
  const [reverseTarget, setReverseTarget] = useState<SettlementRow | null>(null);
  const [, startTransition] = useTransition();

  const totalOutstanding = settlements
    .filter((s) => s.status === "pending" || s.status === "partially_paid")
    .reduce((sum, s) => sum + Math.max(0, s.platformFee - s.amountPaid), 0);
  const outstandingCount = settlements.filter((s) => s.status === "pending" || s.status === "partially_paid").length;

  function refreshRow(id: string, amount: number) {
    setSettlements((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const amountPaid = s.amountPaid + amount;
        const status: SettlementStatus =
          s.platformFee > 0 && amountPaid >= s.platformFee ? "paid" : amountPaid > 0 ? "partially_paid" : s.status;
        return {
          ...s,
          amountPaid,
          status,
          payments: [
            {
              id: crypto.randomUUID(),
              amount,
              method: "bank_transfer",
              reference: "",
              notes: "",
              paidAt: new Date().toISOString(),
              paidByName: "You",
            },
            ...s.payments,
          ],
        };
      })
    );
  }

  return (
    <>
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Outstanding this cycle</p>
            <p className="font-display mt-1 text-2xl font-semibold text-[var(--text)]">{formatPKR(totalOutstanding)}</p>
          </div>
          <Badge tone="warning">{outstandingCount} outstanding</Badge>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                <th className="pb-3 pr-4">Vendor</th>
                <th className="pb-3 pr-4">Month</th>
                <th className="pb-3 pr-4">Orders</th>
                <th className="pb-3 pr-4">Gross revenue</th>
                <th className="pb-3 pr-4">Platform fee</th>
                <th className="pb-3 pr-4">Paid</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => {
                const overdue = isOverdue(s);
                const expanded = expandedId === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3 pr-4 font-medium text-[var(--text)]">{s.vendorName}</td>
                      <td className="py-3 pr-4 text-[var(--text-muted)]">{monthLabel(s.month)}</td>
                      <td className="py-3 pr-4 text-[var(--text)]">{s.ordersCount}</td>
                      <td className="py-3 pr-4 text-[var(--text)]">{formatPKR(s.grossRevenue)}</td>
                      <td className="py-3 pr-4 font-semibold text-[var(--text)]">{formatPKR(s.platformFee)}</td>
                      <td className="py-3 pr-4 text-[var(--text-muted)]">{formatPKR(s.amountPaid)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={STATUS_TONE[s.status]} dot>
                            {STATUS_LABEL[s.status]}
                          </Badge>
                          {overdue && <Badge tone="danger">Overdue</Badge>}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {(s.status === "pending" || s.status === "partially_paid") && (
                            <Button size="sm" variant="primary" onClick={() => setPaymentTarget(s)}>
                              Record payment
                            </Button>
                          )}
                          {s.status === "pending" && (
                            <Button size="sm" variant="ghost" onClick={() => setWaiveTarget(s)}>
                              Waive
                            </Button>
                          )}
                          {(s.status === "paid" || s.status === "partially_paid") && (
                            <Button size="sm" variant="ghost" onClick={() => setReverseTarget(s)}>
                              Reverse
                            </Button>
                          )}
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                            onClick={() => setExpandedId(expanded ? null : s.id)}
                            aria-label="Toggle payment history"
                          >
                            <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-[var(--border)] bg-[var(--surface)]/40">
                        <td colSpan={8} className="px-4 py-3">
                          {s.status === "waived" && s.waivedReason && (
                            <p className="mb-2 text-xs text-[var(--text-muted)]">
                              <span className="font-semibold text-[var(--text)]">Waived:</span> {s.waivedReason}
                            </p>
                          )}
                          {s.status === "reversed" && s.reversedReason && (
                            <p className="mb-2 text-xs text-[var(--text-muted)]">
                              <span className="font-semibold text-[var(--text)]">Reversed:</span> {s.reversedReason}
                            </p>
                          )}
                          {s.payments.length === 0 ? (
                            <p className="flex items-center gap-2 py-2 text-xs text-[var(--text-faint)]">
                              <Receipt size={14} /> No payments recorded yet.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {s.payments.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[var(--text)]">{formatPKR(p.amount)}</span>
                                    <span className="text-[var(--text-faint)]">
                                      {METHOD_LABEL[p.method] ?? p.method}
                                      {p.reference ? ` · ${p.reference}` : ""}
                                    </span>
                                  </div>
                                  <span className="text-[var(--text-faint)]">
                                    {formatDateTime(p.paidAt)} {p.paidByName ? `· ${p.paidByName}` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-[var(--text-faint)]">
                    No settlements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {paymentTarget && (
        <RecordPaymentModal
          open={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          settlementId={paymentTarget.id}
          vendorName={paymentTarget.vendorName}
          month={paymentTarget.month}
          outstanding={Math.max(0, paymentTarget.platformFee - paymentTarget.amountPaid)}
          onRecorded={(amount) => refreshRow(paymentTarget.id, amount)}
        />
      )}

      {waiveTarget && (
        <ReasonModal
          open={!!waiveTarget}
          onClose={() => setWaiveTarget(null)}
          title={`Waive settlement — ${waiveTarget.vendorName}`}
          actionLabel="Waive"
          successMessage={`Settlement for ${waiveTarget.vendorName} marked as waived.`}
          onSubmit={async (reason) => {
            const target = waiveTarget;
            await waiveSettlementAction(target.id, target.vendorName, target.month, reason);
            startTransition(() => {
              setSettlements((prev) =>
                prev.map((s) => (s.id === target.id ? { ...s, status: "waived", waivedReason: reason } : s))
              );
            });
          }}
        />
      )}

      {reverseTarget && (
        <ReasonModal
          open={!!reverseTarget}
          onClose={() => setReverseTarget(null)}
          title={`Reverse settlement — ${reverseTarget.vendorName}`}
          actionLabel="Reverse"
          successMessage={`Settlement for ${reverseTarget.vendorName} marked as reversed.`}
          onSubmit={async (reason) => {
            const target = reverseTarget;
            await reverseSettlementAction(target.id, target.vendorName, target.month, reason);
            startTransition(() => {
              setSettlements((prev) =>
                prev.map((s) => (s.id === target.id ? { ...s, status: "reversed", reversedReason: reason } : s))
              );
            });
          }}
        />
      )}
    </>
  );
}
