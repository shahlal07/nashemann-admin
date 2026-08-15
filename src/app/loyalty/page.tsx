import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoyaltyClient, type LeaderboardEntry, type TopReferrer, type RewardRedemption } from "./LoyaltyClient";

export default async function LoyaltyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const [{ data: loyaltyRows }, { data: redemptionRows }, { data: referralRows }] = await Promise.all([
    supabase
      .from("vendor_loyalty")
      .select("vendor_id, lifetime_points, credits, vendors(name)")
      .order("lifetime_points", { ascending: false }),
    supabase
      .from("reward_redemptions")
      .select("tier, coupon_code, credits, vendors(name)")
      .order("redeemed_at", { ascending: false })
      .limit(10),
    supabase
      .from("influencer_referred_vendors")
      .select("influencer_id, influencers(name)"),
  ]);

  const leaderboard: LeaderboardEntry[] = (loyaltyRows ?? []).map((r) => ({
    id: r.vendor_id,
    name: (r.vendors as unknown as { name: string } | null)?.name ?? "Unknown vendor",
    email: "",
    lifetimePoints: r.lifetime_points,
    credits: Number(r.credits),
  }));

  const redemptions: RewardRedemption[] = (redemptionRows ?? []).map((r) => ({
    name: (r.vendors as unknown as { name: string } | null)?.name ?? "Unknown vendor",
    tier: r.tier,
    couponCode: r.coupon_code,
    credits: Number(r.credits),
  }));

  const conversionCounts = new Map<string, number>();
  for (const row of referralRows ?? []) {
    const name = (row.influencers as unknown as { name: string } | null)?.name ?? "Unknown";
    conversionCounts.set(name, (conversionCounts.get(name) ?? 0) + 1);
  }
  const topReferrers: TopReferrer[] = [...conversionCounts.entries()]
    .map(([name, conversions]) => ({ name, conversions }))
    .sort((a, b) => b.conversions - a.conversions);

  return <LoyaltyClient initialLeaderboard={leaderboard} topReferrers={topReferrers} redemptions={redemptions} />;
}
