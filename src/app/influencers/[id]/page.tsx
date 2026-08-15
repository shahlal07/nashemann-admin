import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfluencerDetailClient, type ReferredVendorRow } from "./InfluencerDetailClient";

export default async function InfluencerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data: influencer } = await supabase.from("influencers").select("*").eq("id", id).maybeSingle();
  if (!influencer) notFound();

  const [{ data: pricing }, { data: referred }] = await Promise.all([
    supabase.from("platform_pricing").select("per_order_fee, monthly_fee").eq("id", true).maybeSingle(),
    supabase
      .from("influencer_referred_vendors")
      .select("vendors(id, name, status, joined_at, plan, orders_last_30d, theme_logo_emoji)")
      .eq("influencer_id", id),
  ]);

  const perOrderFee = Number(pricing?.per_order_fee ?? 15);
  const monthlyFee = Number(pricing?.monthly_fee ?? 7000);

  let platformRevenueGenerated = 0;
  const referredVendors: ReferredVendorRow[] = [];
  for (const row of referred ?? []) {
    const vendor = row.vendors as unknown as {
      id: string;
      name: string;
      status: string;
      joined_at: string;
      plan: string;
      orders_last_30d: number;
      theme_logo_emoji: string;
    } | null;
    if (!vendor) continue;
    const revenue = vendor.plan === "monthly" ? monthlyFee : vendor.orders_last_30d * perOrderFee;
    platformRevenueGenerated += revenue;
    referredVendors.push({
      id: vendor.id,
      name: vendor.name,
      status: vendor.status,
      joinedAt: vendor.joined_at,
      logoEmoji: vendor.theme_logo_emoji,
      platformRevenue: revenue,
    });
  }

  return (
    <InfluencerDetailClient
      influencerId={influencer.id}
      name={influencer.name}
      socialHandle={influencer.social_handle}
      platform={influencer.platform}
      followerCount={influencer.follower_count}
      initialStatus={influencer.status}
      initialCutPercent={Number(influencer.cut_percent)}
      referredVendors={referredVendors}
      platformRevenueGenerated={platformRevenueGenerated}
    />
  );
}
