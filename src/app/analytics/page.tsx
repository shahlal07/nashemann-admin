import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsClient, type MonthlyTrendPoint, type VendorRevenuePoint, type CityCount } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const [{ data: settlementRows }, { data: vendors }] = await Promise.all([
    supabase.from("settlements").select("month, orders_count").order("month", { ascending: true }),
    supabase.from("vendors").select("name, city, revenue_last_30d"),
  ]);

  const trendByMonth = new Map<string, number>();
  for (const row of settlementRows ?? []) {
    trendByMonth.set(row.month, (trendByMonth.get(row.month) ?? 0) + row.orders_count);
  }
  const monthlyTrend: MonthlyTrendPoint[] = [...trendByMonth.entries()].map(([month, orders]) => ({
    month: new Date(month).toLocaleDateString("en-PK", { month: "short" }),
    orders,
  }));

  const vendorRevenue: VendorRevenuePoint[] = [...(vendors ?? [])]
    .sort((a, b) => Number(b.revenue_last_30d) - Number(a.revenue_last_30d))
    .map((v) => ({ name: v.name, revenue: Number(v.revenue_last_30d) }));

  const cityCountMap = new Map<string, number>();
  for (const v of vendors ?? []) {
    cityCountMap.set(v.city, (cityCountMap.get(v.city) ?? 0) + 1);
  }
  const cityCounts: CityCount[] = [...cityCountMap.entries()].map(([city, count]) => ({ city, count }));

  return <AnalyticsClient monthlyTrend={monthlyTrend} vendorRevenue={vendorRevenue} cityCounts={cityCounts} />;
}
