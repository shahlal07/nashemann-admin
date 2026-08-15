"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, PlusCircle, Globe, TrendingDown, PauseCircle, PlayCircle, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { VendorStatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { createClient } from "@/lib/supabase/client";
import { formatPKR } from "@/lib/utils";
import { computeChurnRisk, type SettlementSignal, type TenantHealthSignal } from "@/lib/vendor-signals";

type PricingPlan = "per_order" | "monthly";

type Vendor = {
  id: string;
  name: string;
  subdomain: string;
  category: string | null;
  status: string;
  plan: PricingPlan;
  orders_last_30d: number;
  revenue_last_30d: number;
  theme_accent_from: string;
  theme_accent_to: string;
  theme_logo_emoji: string;
};

const PLAN_LABEL: Record<PricingPlan, string> = { per_order: "Per Order", monthly: "Monthly" };

export default function VendorsPage() {
  const [query, setQuery] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [atRisk, setAtRisk] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [{ data: vendorRows }, { data: settlementRows }, { data: healthRows }] = await Promise.all([
        supabase
          .from("vendors")
          .select(
            "id, name, subdomain, category, status, plan, orders_last_30d, revenue_last_30d, theme_accent_from, theme_accent_to, theme_logo_emoji"
          )
          .order("joined_at", { ascending: false }),
        supabase.from("settlements").select("vendor_id, month, status, gross_revenue, orders_count, due_date"),
        supabase
          .from("tenant_health")
          .select("vendor_id, total_orders, failed_orders, failure_rate, stock_warnings, auth_failed_attempts, last_order_at"),
      ]);

      const list = (vendorRows as Vendor[]) ?? [];
      setVendors(list);

      const settlementsByVendor = new Map<string, SettlementSignal[]>();
      for (const row of settlementRows ?? []) {
        const arr = settlementsByVendor.get(row.vendor_id) ?? [];
        arr.push(row);
        settlementsByVendor.set(row.vendor_id, arr);
      }
      const healthByVendor = new Map<string, TenantHealthSignal>();
      for (const row of healthRows ?? []) {
        healthByVendor.set(row.vendor_id, row);
      }

      const risk: Record<string, string[]> = {};
      for (const v of list) {
        const result = computeChurnRisk({
          status: v.status,
          ordersLast30d: v.orders_last_30d,
          settlements: settlementsByVendor.get(v.id) ?? [],
          tenantHealth: healthByVendor.get(v.id) ?? null,
        });
        if (result.atRisk) risk[v.id] = result.reasons;
      }
      setAtRisk(risk);
      setLoading(false);
    }

    load();
  }, []);

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.subdomain.toLowerCase().includes(query.toLowerCase()) ||
      (v.category ?? "").toLowerCase().includes(query.toLowerCase())
  );

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkSetStatus(status: "suspended" | "active") {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const supabase = createClient();
    const ids = Array.from(selected);
    const { error } = await supabase.from("vendors").update({ status }).in("id", ids);
    setBulkBusy(false);
    if (error) return;
    setVendors((prev) => prev.map((v) => (selected.has(v.id) ? { ...v, status } : v)));
    setSelected(new Set());
  }

  return (
    <div>
      <PageHeader
        title="All vendors"
        description={`${vendors.length} store${vendors.length === 1 ? "" : "s"} running on Nashemann's infrastructure.`}
        action={
          <Link href="/vendors/new">
            <Button variant="primary">
              <PlusCircle size={16} /> Create store
            </Button>
          </Link>
        }
      />

      {Object.keys(atRisk).length > 0 && (
        <Card className="mb-5 border-[rgba(251,113,133,0.25)]">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text)]">
            <TrendingDown size={14} className="text-[var(--danger)]" /> {Object.keys(atRisk).length} vendor
            {Object.keys(atRisk).length === 1 ? "" : "s"} showing churn risk signals
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(atRisk).map(([id, reasons]) => {
              const v = vendors.find((vv) => vv.id === id);
              if (!v) return null;
              return (
                <Link key={id} href={`/vendors/${id}`} title={reasons.join(" · ")}>
                  <Badge tone="danger">{v.name}</Badge>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm sm:max-w-sm">
          <Search size={15} className="text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors…"
            className="w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5">
            <span className="text-xs font-medium text-[var(--text-muted)]">{selected.size} selected</span>
            <Button variant="secondary" size="sm" disabled={bulkBusy} onClick={() => bulkSetStatus("suspended")}>
              <PauseCircle size={13} /> Suspend
            </Button>
            <Button variant="secondary" size="sm" disabled={bulkBusy} onClick={() => bulkSetStatus("active")}>
              <PlayCircle size={13} /> Reactivate
            </Button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-full p-1 text-[var(--text-faint)] hover:text-[var(--text)]"
              aria-label="Clear selection"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v) => (
          <StaggerItem key={v.id}>
            <Card className="h-full transition-transform hover:-translate-y-0.5 hover:border-[var(--border-strong)]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(v.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelected(v.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 accent-[var(--accent-violet)]"
                    aria-label={`Select ${v.name}`}
                  />
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                    style={{
                      background: `linear-gradient(135deg, ${v.theme_accent_from}33, ${v.theme_accent_to}33)`,
                    }}
                  >
                    {v.theme_logo_emoji}
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-[var(--text)]">{v.name}</h3>
                    <p className="text-xs text-[var(--text-faint)]">{v.category ?? "Uncategorized"}</p>
                  </div>
                </div>
                <VendorStatusBadge status={v.status} />
              </div>

              <Link href={`/vendors/${v.id}`} className="block">
                <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                  <Globe size={12} /> {v.subdomain}.nashemann.com
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-[var(--text-faint)]">Orders (30d)</p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">{v.orders_last_30d}</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-[var(--text-faint)]">Revenue (30d)</p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">{formatPKR(v.revenue_last_30d)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{PLAN_LABEL[v.plan]}</Badge>
                  {atRisk[v.id] && (
                    <span title={atRisk[v.id].join(" · ")}>
                      <Badge tone="danger">
                        <TrendingDown size={11} /> Churn risk
                      </Badge>
                    </span>
                  )}
                </div>
              </Link>
            </Card>
          </StaggerItem>
        ))}
        {!loading && filtered.length === 0 && (
          <Card className="col-span-full py-12 text-center text-sm text-[var(--text-faint)]">
            {vendors.length === 0 ? "No vendors yet. Approve an application or create a store to get started." : "No vendors match your search."}
          </Card>
        )}
      </StaggerGroup>
    </div>
  );
}
