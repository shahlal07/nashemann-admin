import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfluencersClient, type InfluencerApplicationRow, type InfluencerRow } from "./InfluencersClient";

export default async function InfluencersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const [{ data: applications }, { data: influencers }, { data: settings }, { data: pricing }, { data: referred }] =
    await Promise.all([
      supabase.from("influencer_applications").select("*").order("submitted_at", { ascending: false }),
      supabase.from("influencers").select("*").order("joined_at", { ascending: false }),
      supabase.from("influencer_program_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("platform_pricing").select("per_order_fee, monthly_fee").eq("id", true).maybeSingle(),
      supabase.from("influencer_referred_vendors").select("influencer_id, vendors(id, plan, orders_last_30d)"),
    ]);

  const perOrderFee = Number(pricing?.per_order_fee ?? 15);
  const monthlyFee = Number(pricing?.monthly_fee ?? 7000);

  function platformRevenueFromVendor(vendor: { plan: string; orders_last_30d: number }) {
    return vendor.plan === "monthly" ? monthlyFee : vendor.orders_last_30d * perOrderFee;
  }

  const revenueByInfluencer = new Map<string, number>();
  const countByInfluencer = new Map<string, number>();
  for (const row of referred ?? []) {
    const vendor = row.vendors as unknown as { id: string; plan: string; orders_last_30d: number } | null;
    if (!vendor) continue;
    const revenue = platformRevenueFromVendor(vendor);
    revenueByInfluencer.set(row.influencer_id, (revenueByInfluencer.get(row.influencer_id) ?? 0) + revenue);
    countByInfluencer.set(row.influencer_id, (countByInfluencer.get(row.influencer_id) ?? 0) + 1);
  }

  const influencerRows: InfluencerRow[] = (influencers ?? []).map((inf) => {
    const platformRevenueGenerated = revenueByInfluencer.get(inf.id) ?? 0;
    const cutPercent = Number(inf.cut_percent);
    return {
      id: inf.id,
      name: inf.name,
      socialHandle: inf.social_handle,
      referralCode: inf.referral_code,
      cutPercent,
      status: inf.status,
      referredCount: countByInfluencer.get(inf.id) ?? 0,
      platformRevenueGenerated,
      influencerEarnings: Math.round(platformRevenueGenerated * (cutPercent / 100)),
    };
  });

  const applicationRows: InfluencerApplicationRow[] = (applications ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    socialHandle: a.social_handle,
    platform: a.platform,
    followerCount: a.follower_count,
    pitch: a.pitch,
    status: a.status,
    submittedAt: a.submitted_at,
  }));

  const totalEarningsOwed = influencerRows
    .filter((i) => i.status === "active")
    .reduce((sum, i) => sum + i.influencerEarnings, 0);
  const activeCount = influencerRows.filter((i) => i.status === "active").length;

  return (
    <InfluencersClient
      initialApplications={applicationRows}
      influencers={influencerRows}
      initialSettings={{
        enabled: settings?.enabled ?? true,
        defaultCutPercent: Number(settings?.default_cut_percent ?? 30),
        minFollowerCount: settings?.min_follower_count ?? 5000,
        cutDurationMonths: settings?.cut_duration_months ?? 12,
      }}
      totalEarningsOwed={totalEarningsOwed}
      activeCount={activeCount}
    />
  );
}
