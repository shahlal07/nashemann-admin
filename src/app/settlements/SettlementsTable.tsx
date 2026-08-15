"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPKR } from "@/lib/utils";
import { markSettledAction } from "./actions";

export type SettlementRow = {
  vendorId: string;
  vendorName: string;
  month: string;
  ordersCount: number;
  grossRevenue: number;
  platformFee: number;
  status: "unsettled" | "settled";
};

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

export function SettlementsTable({ initialSettlements }: { initialSettlements: SettlementRow[] }) {
  const [settlements, setSettlements] = useState(initialSettlements);
  const [pending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  function markSettled(vendorId: string, vendorName: string, month: string) {
    const key = `${vendorId}-${month}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await markSettledAction(vendorId, vendorName, month);
        setSettlements((prev) =>
          prev.map((s) => (s.vendorId === vendorId && s.month === month ? { ...s, status: "settled" as const } : s))
        );
      } finally {
        setPendingKey(null);
      }
    });
  }

  const totalUnsettled = settlements
    .filter((s) => s.status === "unsettled")
    .reduce((sum, s) => sum + s.platformFee, 0);

  return (
    <>
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Outstanding this cycle</p>
            <p className="font-display mt-1 text-2xl font-semibold text-[var(--text)]">{formatPKR(totalUnsettled)}</p>
          </div>
          <Badge tone="warning">{settlements.filter((s) => s.status === "unsettled").length} unsettled</Badge>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                <th className="pb-3 pr-4">Vendor</th>
                <th className="pb-3 pr-4">Month</th>
                <th className="pb-3 pr-4">Orders</th>
                <th className="pb-3 pr-4">Gross revenue</th>
                <th className="pb-3 pr-4">Platform fee</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={`${s.vendorId}-${s.month}`} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 pr-4 font-medium text-[var(--text)]">{s.vendorName}</td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">{monthLabel(s.month)}</td>
                  <td className="py-3 pr-4 text-[var(--text)]">{s.ordersCount}</td>
                  <td className="py-3 pr-4 text-[var(--text)]">{formatPKR(s.grossRevenue)}</td>
                  <td className="py-3 pr-4 font-semibold text-[var(--text)]">{formatPKR(s.platformFee)}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={s.status === "settled" ? "success" : "warning"}>{s.status}</Badge>
                  </td>
                  <td className="py-3 text-right">
                    {s.status === "unsettled" && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={pending && pendingKey === `${s.vendorId}-${s.month}`}
                        onClick={() => markSettled(s.vendorId, s.vendorName, s.month)}
                      >
                        {pending && pendingKey === `${s.vendorId}-${s.month}` ? "Saving…" : "Mark settled"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[var(--text-faint)]">
                    No settlements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
