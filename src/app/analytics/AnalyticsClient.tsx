"use client";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatPKR } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const tooltipStyle = {
  contentStyle: {
    background: "#131318",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 13,
  },
  labelStyle: { color: "#f3f3f6" },
};

export type MonthlyTrendPoint = { month: string; orders: number };
export type VendorRevenuePoint = { name: string; revenue: number };
export type CityCount = { city: string; count: number };

export function AnalyticsClient({
  monthlyTrend,
  vendorRevenue,
  cityCounts,
}: {
  monthlyTrend: MonthlyTrendPoint[];
  vendorRevenue: VendorRevenuePoint[];
  cityCounts: CityCount[];
}) {
  return (
    <div>
      <PageHeader title="Analytics" description="Platform-wide trends across every vendor." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Orders per month" description="Across all vendors" />
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrend} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#66666f", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#66666f", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v) => [Number(v), "Orders"]} />
              <Line type="monotone" dataKey="orders" stroke="#ffb020" strokeWidth={2.5} dot={{ fill: "#ffb020", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          {monthlyTrend.length === 0 && (
            <p className="mt-2 text-center text-xs text-[var(--text-faint)]">No settlement history yet.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Revenue by vendor" description="Last 30 days, gross" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vendorRevenue} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#66666f", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#9a9aa6", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip {...tooltipStyle} formatter={(v) => [formatPKR(Number(v)), "Revenue"]} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} fill="#8b6bff" />
            </BarChart>
          </ResponsiveContainer>
          {vendorRevenue.length === 0 && (
            <p className="mt-2 text-center text-xs text-[var(--text-faint)]">No vendors yet.</p>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Vendors by city" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cityCounts} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="city" tick={{ fill: "#66666f", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#66666f", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={(v) => [Number(v), "Vendors"]} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#ffb020" />
            </BarChart>
          </ResponsiveContainer>
          {cityCounts.length === 0 && (
            <p className="mt-2 text-center text-xs text-[var(--text-faint)]">No vendors yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
