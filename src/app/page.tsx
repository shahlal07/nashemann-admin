"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Inbox, ShoppingBag, Wallet, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { VendorStatusBadge } from "@/components/ui/Badge";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { createClient } from "@/lib/supabase/client";
import { formatPKR, timeAgo, formatDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PLAN_COLORS = ["#8b6bff", "#ffb020"];

type PendingApplication = {
  id: string;
  business_name: string;
  business_type: string;
  city: string;
  submitted_at: string;
};

type RecentVendor = {
  id: string;
  name: string;
  status: string;
  joined_at: string;
  theme_logo_emoji: string;
};

type RevenuePoint = { month: string; revenue: number };
type PlanPoint = { name: string; value: number };

type Stats = {
  activeVendors: number;
  pendingApplications: number;
  totalOrders30d: number;
  platformFeeThisMonth: number;
};

const MONTH_LABEL = new Intl.DateTimeFormat("en-US", { month: "short" });

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    activeVendors: 0,
    pendingApplications: 0,
    totalOrders30d: 0,
    platformFeeThisMonth: 0,
  });
  const [pending, setPending] = useState<PendingApplication[]>([]);
  const [recentVendors, setRecentVendors] = useState<RecentVendor[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanPoint[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const monthStartStr = monthStart.toISOString().slice(0, 10);

      const [
        allVendorsRes,
        allApplicationsRes,
        monthlyFeeRes,
        pendingListRes,
        recentVendorsRes,
        settlementsRes,
      ] = await Promise.all([
        supabase.from("vendors").select("status, plan, orders_last_30d"),
        supabase.from("vendor_applications").select("status"),
        supabase.from("settlements").select("platform_fee").eq("month", monthStartStr),
        supabase
          .from("vendor_applications")
          .select("id, business_name, business_type, city, submitted_at")
          .eq("status", "pending")
          .order("submitted_at", { ascending: false })
          .limit(4),
        supabase
          .from("vendors")
          .select("id, name, status, joined_at, theme_logo_emoji")
          .order("joined_at", { ascending: false })
          .limit(5),
        supabase.from("settlements").select("month, gross_revenue"),
      ]);

      const vendorRows = allVendorsRes.data ?? [];
      const activeVendors = vendorRows.filter((v) => v.status === "active").length;
      const totalOrders30d = vendorRows.reduce((sum, v) => sum + (v.orders_last_30d ?? 0), 0);
      const pendingApplications = (allApplicationsRes.data ?? []).filter((a) => a.status === "pending").length;
      const platformFeeThisMonth = (monthlyFeeRes.data ?? []).reduce((sum, s) => sum + Number(s.platform_fee ?? 0), 0);

      setStats({
        activeVendors,
        pendingApplications,
        totalOrders30d,
        platformFeeThisMonth,
      });
      setPending(pendingListRes.data ?? []);
      setRecentVendors(recentVendorsRes.data ?? []);

      const byMonth = new Map<string, number>();
      for (const row of settlementsRes.data ?? []) {
        const label = MONTH_LABEL.format(new Date(row.month));
        byMonth.set(label, (byMonth.get(label) ?? 0) + Number(row.gross_revenue ?? 0));
      }
      setRevenueTrend(Array.from(byMonth, ([month, revenue]) => ({ month, revenue })));

      const planCounts: Record<"per_order" | "monthly", number> = { per_order: 0, monthly: 0 };
      for (const row of vendorRows) {
        if (row.plan === "per_order" || row.plan === "monthly") planCounts[row.plan as "per_order" | "monthly"]++;
      }
      setPlanDistribution([
        { name: "Pay Per Order", value: planCounts.per_order },
        { name: "Monthly", value: planCounts.monthly },
      ]);

      setLoading(false);
    }

    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Every vendor, application, and fee flowing through Nashemann — at a glance."
      />

      <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label="Active vendors" value={stats.activeVendors} icon={Store} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Pending applications" value={stats.pendingApplications} icon={Inbox} accent="amber" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Orders (30d)" value={stats.totalOrders30d} icon={ShoppingBag} />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Platform fees (this month)"
            value={stats.platformFeeThisMonth}
            prefix="Rs "
            icon={Wallet}
            accent="amber"
          />
        </StaggerItem>
      </StaggerGroup>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue across the platform" description="Gross vendor revenue, by settlement month" />
          {revenueTrend.length === 0 ? (
            <p className="flex h-[260px] items-center justify-center text-sm text-[var(--text-faint)]">
              {loading ? "Loading…" : "No settlement data yet."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueTrend} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b6bff" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#8b6bff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#66666f", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#66666f", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#131318",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                  labelStyle={{ color: "#f3f3f6" }}
                  formatter={(v) => [formatPKR(Number(v)), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8b6bff" strokeWidth={2.5} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader title="Plan mix" description="How vendors are paying" />
          {planDistribution.every((p) => p.value === 0) ? (
            <p className="flex h-[180px] items-center justify-center text-sm text-[var(--text-faint)]">
              {loading ? "Loading…" : "No vendors yet."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                  strokeWidth={0}
                >
                  {planDistribution.map((_, i) => (
                    <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#131318",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 space-y-2">
            {planDistribution.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[var(--text-muted)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: PLAN_COLORS[i] }} />
                  {p.name}
                </span>
                <span className="font-medium text-[var(--text)]">{p.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Applications awaiting review"
            description={`${stats.pendingApplications} pending`}
            action={
              <Link href="/applications" className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-violet)] hover:underline">
                View all <ArrowUpRight size={13} />
              </Link>
            }
          />
          <div className="space-y-1">
            {pending.map((app) => (
              <Link
                key={app.id}
                href="/applications"
                className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]">{app.business_name}</p>
                  <p className="truncate text-xs text-[var(--text-faint)]">
                    {app.business_type} · {app.city}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--text-faint)]">{timeAgo(app.submitted_at)}</span>
              </Link>
            ))}
            {!loading && pending.length === 0 && <p className="py-4 text-center text-sm text-[var(--text-faint)]">All caught up.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recently onboarded"
            description="Newest stores on the platform"
            action={
              <Link href="/vendors" className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-violet)] hover:underline">
                View all <ArrowUpRight size={13} />
              </Link>
            }
          />
          <div className="space-y-1">
            {recentVendors.map((v) => (
              <Link
                key={v.id}
                href={`/vendors/${v.id}`}
                className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-lg">{v.theme_logo_emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text)]">{v.name}</p>
                    <p className="truncate text-xs text-[var(--text-faint)]">{formatDate(v.joined_at)}</p>
                  </div>
                </div>
                <VendorStatusBadge status={v.status} />
              </Link>
            ))}
            {!loading && recentVendors.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-faint)]">No vendors yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
