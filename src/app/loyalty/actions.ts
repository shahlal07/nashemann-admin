"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";

export async function adjustLoyaltyPointsAction(vendorId: string, vendorName: string, delta: number, nextPoints: number) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("vendor_loyalty").update({ lifetime_points: nextPoints }).eq("vendor_id", vendorId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "loyalty_points_adjusted",
    actor,
    entity: vendorName,
    detail: `${delta > 0 ? "+" : ""}${delta} points (now ${nextPoints.toLocaleString()})`,
  });

  revalidatePath("/loyalty");
  revalidatePath("/audit-log");
}

export async function resetLoyaltyLeaderboardEntryAction(vendorId: string, vendorName: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("vendor_loyalty").update({ lifetime_points: 0, credits: 0 }).eq("vendor_id", vendorId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "loyalty_leaderboard_reset",
    actor,
    entity: vendorName,
    detail: "Points and credits reset to 0",
  });

  revalidatePath("/loyalty");
  revalidatePath("/audit-log");
}
