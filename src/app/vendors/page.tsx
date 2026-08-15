"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, PlusCircle, Globe } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { VendorStatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { createClient } from "@/lib/supabase/client";
import { formatPKR } from "@/lib/utils";

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

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("vendors")
      .select(
        "id, name, subdomain, category, status, plan, orders_last_30d, revenue_last_30d, theme_accent_from, theme_accent_to, theme_logo_emoji"
      )
      .order("joined_at", { ascending: false })
      .then(({ data }) => {
        setVendors((data as Vendor[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.subdomain.toLowerCase().includes(query.toLowerCase()) ||
      (v.category ?? "").toLowerCase().includes(query.toLowerCase())
  );

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

      <div className="mb-5 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm sm:max-w-sm">
        <Search size={15} className="text-[var(--text-faint)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vendors…"
          className="w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
        />
      </div>

      <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v) => (
          <StaggerItem key={v.id}>
            <Link href={`/vendors/${v.id}`}>
              <Card className="h-full transition-transform hover:-translate-y-0.5 hover:border-[var(--border-strong)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
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

                <div className="mt-3">
                  <Badge tone="neutral">{PLAN_LABEL[v.plan]}</Badge>
                </div>
              </Card>
            </Link>
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
