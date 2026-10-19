import { AlertTriangle, Wallet } from "lucide-react";
import { requireOwner } from "@/lib/owner-authz";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EmptyPanel,
  PageStat,
  PanelCard,
  SoftNote,
  StatusPill,
  WarningPanel,
  WorkspaceHero,
  WorkspacePage,
} from "@/components/owners/workspace-ui";
import { getWorkspaceAccess } from "@/lib/founders/workspaces";

export const dynamic = "force-dynamic";

type Settlement = {
  id: string;
  vendor_id: string;
  month: string;
  orders_count: number;
  gross_revenue: number | string;
  platform_fee: number | string;
  amount_paid: number | string;
  adjustment_total: number | string;
  status: string;
  plan_snapshot: string | null;
  unit_fee: number | string | null;
  fee_rate_mixed: boolean;
  due_date: string | null;
  updated_at: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value);

export default async function FounderFinancePage() {
  const { supabase, membership } = await requireOwner();
  const access = getWorkspaceAccess(membership, "finance");
  const isFinanceOwner = access.isOwner;

  const [settlementResult, pricingResult] = await Promise.all([
    supabase
      .from("settlements")
      .select("id, vendor_id, month, orders_count, gross_revenue, platform_fee, amount_paid, adjustment_total, status, plan_snapshot, unit_fee, fee_rate_mixed, due_date, updated_at")
      .order("month", { ascending: false })
      .limit(200),
    supabase
      .from("platform_pricing")
      .select("per_order_fee, monthly_fee, monthly_break_even_orders")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (settlementResult.error || pricingResult.error) {
    return (
      <WorkspacePage workspaceKey="finance" access={access} viewerLabel={membership.display_name || membership.username || "founder"}>
        <WorkspaceHero
          crumb="Finance workspace · CASH · CONTROLS · REPORTING"
          title="Know where every"
          accentTitle="rupee goes."
          description="Read-only reporting from the connected Supabase billing records for the finance-governance domain."
        />
        <WarningPanel
          title="Live finance data is unavailable"
          message="The owner finance RLS migration may not be deployed, or the connected schema is unavailable. No mock balances are substituted."
        />
      </WorkspacePage>
    );
  }

  const settlements = (settlementResult.data ?? []) as Settlement[];
  const pricing = pricingResult.data as { per_order_fee: number | string; monthly_fee: number | string; monthly_break_even_orders: number } | null;
  const vendorIds = [...new Set(settlements.map((row) => row.vendor_id))];

  // Server-only, sanitized vendor labels. Resolved with the service-role client
  // ONLY for the finance-workspace owner: founders previewing this workspace
  // see the ledger without vendor identity enrichment.
  let vendorNames = new Map<string, string>();
  if (isFinanceOwner && vendorIds.length) {
    const admin = createAdminClient();
    const { data: vendors } = await admin.from("vendors").select("id, name, slug").in("id", vendorIds);
    vendorNames = new Map(((vendors ?? []) as { id: string; name: string; slug: string }[]).map((vendor) => [vendor.id, vendor.name || vendor.slug]));
  }

  const billedFees = settlements.reduce((sum, row) => sum + Number(row.platform_fee || 0) + Number(row.adjustment_total || 0), 0);
  const cashCollected = settlements.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0);
  const outstanding = settlements.reduce((sum, row) => sum + Math.max(0, Number(row.platform_fee || 0) + Number(row.adjustment_total || 0) - Number(row.amount_paid || 0)), 0);
  const billedGross = settlements.reduce((sum, row) => sum + Number(row.gross_revenue || 0), 0);
  const anomalyCount = settlements.filter((row) => !row.plan_snapshot || (row.status === "pending" && Number(row.orders_count) === 0)).length;

  return (
    <WorkspacePage workspaceKey="finance" access={access} viewerLabel={membership.display_name || membership.username || "founder"}>
      <WorkspaceHero
        crumb="Finance workspace · CASH · CONTROLS · REPORTING"
        title="Know where every"
        accentTitle="rupee goes."
        description="Read-only reporting from the connected Supabase billing records. Settlement gross revenue is historical billing volume, not a substitute for a verified all-time marketplace GMV ledger."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PageStat label="Fees billed in settlement records" value={money(billedFees)} foot="FROM LIVE RECORDS" />
        <PageStat label="Cash recorded as collected" value={money(cashCollected)} foot="FROM LIVE RECORDS" />
        <PageStat label="Outstanding settlement balance" value={money(outstanding)} foot="CHECK BEFORE APPROVAL" />
        <PageStat label="Gross volume in settlement records" value={money(billedGross)} foot="NOT VERIFIED GMV" />
      </div>

      {!isFinanceOwner && (
        <SoftNote>
          Read-only preview: vendor identity labels are resolved only for the finance owner and are hidden in this
          preview. All figures shown are limited to what your account&apos;s row-level security permits.
        </SoftNote>
      )}

      <PanelCard
        title="Current platform pricing configuration"
        badge={<StatusPill tone={access.canEdit ? "violet" : "neutral"}>{access.canEdit ? "Editable when connected" : "Read-only"}</StatusPill>}
      >
        {pricing ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-[var(--text-muted)]">Eligible order fee</p><p className="mt-1 text-xl font-semibold">{money(Number(pricing.per_order_fee))}</p></div>
            <div><p className="text-xs text-[var(--text-muted)]">Monthly subscription</p><p className="mt-1 text-xl font-semibold">{money(Number(pricing.monthly_fee))}</p></div>
            <div><p className="text-xs text-[var(--text-muted)]">Monthly break-even orders</p><p className="mt-1 text-xl font-semibold">{Number(pricing.monthly_break_even_orders).toLocaleString("en-PK")}</p></div>
          </div>
        ) : <p className="mt-1 text-sm text-[var(--text-muted)]">No pricing configuration row is available.</p>}
      </PanelCard>

      {anomalyCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(251,191,36,.3)] bg-[var(--warning-bg)] p-5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--warning)]" />
          <div>
            <h2 className="text-sm font-semibold">Billing records need reconciliation</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {anomalyCount} settlement record(s) have a missing plan snapshot or are pending with zero orders.
              Historical records are displayed as stored; this page does not recalculate, collect, waive, or reverse any fee.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="font-semibold">Settlement ledger</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Latest {settlements.length} settlement record(s) visible to this account.</p>
        </div>
        {settlements.length === 0 ? (
          <div className="p-6">
            <EmptyPanel title="No settlement records visible" message="Settlement rows appear here once records exist and your account's access permits reading them." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[var(--surface-hover)] text-xs text-[var(--text-muted)]">
                <tr><th className="px-5 py-3 font-medium">Vendor</th><th className="px-5 py-3 font-medium">Billing month</th><th className="px-5 py-3 font-medium">Plan snapshot</th><th className="px-5 py-3 text-right font-medium">Orders</th><th className="px-5 py-3 text-right font-medium">Gross</th><th className="px-5 py-3 text-right font-medium">Fee</th><th className="px-5 py-3 text-right font-medium">Paid</th><th className="px-5 py-3 text-right font-medium">Balance</th><th className="px-5 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {settlements.map((row) => {
                  const fee = Number(row.platform_fee || 0) + Number(row.adjustment_total || 0);
                  const balance = Math.max(0, fee - Number(row.amount_paid || 0));
                  return (
                    <tr key={row.id}>
                      <td className="px-5 py-3 font-medium">{vendorNames.get(row.vendor_id) ?? (isFinanceOwner ? "Vendor unavailable" : "Hidden in preview")}</td>
                      <td className="px-5 py-3">{new Date(row.month + "T00:00:00").toLocaleDateString("en-PK", { month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-3">{row.plan_snapshot ?? "Missing snapshot"}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{Number(row.orders_count).toLocaleString("en-PK")}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(Number(row.gross_revenue || 0))}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(fee)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(Number(row.amount_paid || 0))}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(balance)}</td>
                      <td className="px-5 py-3"><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs">{row.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <PanelCard title="Finance controls">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3"><span className="text-[var(--text-muted)]">Transaction records</span><StatusPill tone="good">Live ledger</StatusPill></div>
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3"><span className="text-[var(--text-muted)]">Approval workflow</span><StatusPill tone="warn">Governance approvals</StatusPill></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[var(--text-muted)]">Bank reconciliation</span><StatusPill>Not connected</StatusPill></div>
          </div>
        </PanelCard>
        <PanelCard title="What this view does not claim">
          <p className="text-xs leading-5 text-[var(--text-muted)]">
            This view does not claim company profit, expenses, reserves, or founder distributions: no verified
            expense/reserve ledger is currently connected to this page. Vendor settlement funds are liabilities until
            reconciled and must not be counted as company profit.
          </p>
        </PanelCard>
      </div>

      <p className="flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]">
        <Wallet size={14} className="mt-0.5 shrink-0" />
        Expense tracking, profit modeling and founder distribution calculators will appear here once a verified ledger
        source is connected. Sample numbers are never substituted for real records.
      </p>
    </WorkspacePage>
  );
}
