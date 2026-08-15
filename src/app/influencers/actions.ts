"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff as requireStaff } from "@/lib/authz";

function generateReferralCode(name: string, cutPercent: number) {
  const base =
    name
      .split(" ")[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, "") || "PARTNER";
  return `${base}${Math.round(cutPercent)}`;
}

export async function decideApplicationAction(applicationId: string, decision: "approved" | "rejected") {
  const { supabase, actor } = await requireStaff();

  const { data: application, error: fetchError } = await supabase
    .from("influencer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  if (fetchError || !application) throw new Error(fetchError?.message ?? "Application not found");

  const { error: updateError } = await supabase
    .from("influencer_applications")
    .update({ status: decision })
    .eq("id", applicationId);
  if (updateError) throw new Error(updateError.message);

  if (decision === "approved") {
    const { data: settings } = await supabase
      .from("influencer_program_settings")
      .select("default_cut_percent")
      .eq("id", true)
      .maybeSingle();
    const cutPercent = Number(settings?.default_cut_percent ?? 30);

    let referralCode = generateReferralCode(application.name, cutPercent);
    const { data: existing } = await supabase
      .from("influencers")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();
    if (existing) referralCode = `${referralCode}${Math.floor(Math.random() * 90 + 10)}`;

    const { error: insertError } = await supabase.from("influencers").insert({
      name: application.name,
      email: application.email,
      social_handle: application.social_handle,
      platform: application.platform,
      follower_count: application.follower_count,
      referral_code: referralCode,
      cut_percent: cutPercent,
      status: "active",
    });
    if (insertError) throw new Error(insertError.message);
  }

  await supabase.from("audit_log").insert({
    action: decision === "approved" ? "influencer_application_approved" : "influencer_application_rejected",
    actor,
    entity: application.name,
    detail: decision === "approved" ? "Approved from applications queue" : "Rejected from applications queue",
  });

  revalidatePath("/influencers");
  revalidatePath("/audit-log");
}

export async function saveProgramSettingsAction(input: {
  enabled: boolean;
  defaultCutPercent: number;
  minFollowerCount: number;
  cutDurationMonths: number;
}) {
  const { supabase, actor } = await requireStaff();

  const { error } = await supabase
    .from("influencer_program_settings")
    .update({
      enabled: input.enabled,
      default_cut_percent: input.defaultCutPercent,
      min_follower_count: input.minFollowerCount,
      cut_duration_months: input.cutDurationMonths,
    })
    .eq("id", true);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "influencer_program_settings_updated",
    actor,
    entity: "Influencer Program",
    detail: `Default cut ${input.defaultCutPercent}%, min followers ${input.minFollowerCount}, duration ${input.cutDurationMonths}mo`,
  });

  revalidatePath("/influencers");
  revalidatePath("/audit-log");
}

export async function updateInfluencerCutAction(influencerId: string, name: string, cutPercent: number) {
  const { supabase, actor } = await requireStaff();

  const { error } = await supabase.from("influencers").update({ cut_percent: cutPercent }).eq("id", influencerId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "influencer_cut_updated",
    actor,
    entity: name,
    detail: `Cut of platform revenue set to ${cutPercent}%`,
  });

  revalidatePath(`/influencers/${influencerId}`);
  revalidatePath("/influencers");
  revalidatePath("/audit-log");
}

export async function setInfluencerStatusAction(
  influencerId: string,
  name: string,
  status: "active" | "suspended"
) {
  const { supabase, actor } = await requireStaff();

  const { error } = await supabase.from("influencers").update({ status }).eq("id", influencerId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: status === "suspended" ? "influencer_suspended" : "influencer_reactivated",
    actor,
    entity: name,
    detail: status === "suspended" ? "Suspended by staff" : "Reactivated by staff",
  });

  revalidatePath(`/influencers/${influencerId}`);
  revalidatePath("/influencers");
  revalidatePath("/audit-log");
}
