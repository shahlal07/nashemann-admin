import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { VendorStatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

type HealthRow = {
  vendorId: string;
  vendorName: string;
  status: string;
  totalOrders: number;
  failedOrders: number;
  failureRate: number;
  stockWarnings: number;
  authFailedAttempts: number;
  lastOrderAt: string | null;
};

function isElevated(row: HealthRow) {
  return row.failureRate >= 30 || row.stockWarnings > 0 || row.authFailedAttempts >= 5;
}

export default async function TenantHealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data } = await supabase
    .from("tenant_health")
    .select(
      "vendor_id, total_orders, failed_orders, failure_rate, stock_warnings, auth_failed_attempts, last_order_at, vendors(name, status)"
    );

  const rows: HealthRow[] = (data ?? []).map((r) => {
    const vendor = r.vendors as unknown as { name: string; status: string } | null;
    return {
      vendorId: r.vendor_id,
      vendorName: vendor?.name ?? "Unknown vendor",
      status: vendor?.status ?? "provisioning",
      totalOrders: r.total_orders,
      failedOrders: r.failed_orders,
      failureRate: Number(r.failure_rate),
      stockWarnings: r.stock_warnings,
      authFailedAttempts: r.auth_failed_attempts,
      lastOrderAt: r.last_order_at,
    };
  });

  return (
    <div>
      <PageHeader
        title="Tenant health"
        description="Order failure rate, inventory conflicts, and login failures — per vendor, last 30 days."
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                <th className="pb-3 pr-4">Vendor</th>
                <th className="pb-3 pr-4">Orders</th>
                <th className="pb-3 pr-4">Failure rate</th>
                <th className="pb-3 pr-4">Stock warnings</th>
                <th className="pb-3 pr-4">Failed logins</th>
                <th className="pb-3">Last order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.vendorId}
                  className={`border-b border-[var(--border)] last:border-0 ${isElevated(r) ? "bg-[var(--danger-bg)]" : ""}`}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text)]">{r.vendorName}</span>
                      <VendorStatusBadge status={r.status} />
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-[var(--text)]">{r.totalOrders}</td>
                  <td className="py-3 pr-4 text-[var(--text)]">
                    {r.failureRate}%{" "}
                    <span className="text-xs text-[var(--text-faint)]">
                      ({r.failedOrders}/{r.totalOrders})
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[var(--text)]">{r.stockWarnings}</td>
                  <td className="py-3 pr-4 text-[var(--text)]">{r.authFailedAttempts}</td>
                  <td className="py-3 text-[var(--text-faint)]">{formatDateTime(r.lastOrderAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-[var(--text-faint)]">
                    No tenant health data yet.
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
