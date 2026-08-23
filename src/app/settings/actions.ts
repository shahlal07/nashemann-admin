"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/authz";

export async function saveSettingsAction(input: {
  platformName: string;
  supportEmail: string;
  tagline: string;
  applicationSlaHours: number;
  defaultApplicantPlan: "per_order" | "monthly";
}) {
  const { supabase, user, staffProfile } = await requireSuperAdmin();

  const platformName = input.platformName.trim();
  const supportEmail = input.supportEmail.trim();
  const tagline = input.tagline.trim();
  if (!platformName) throw new Error("Platform name cannot be empty.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) throw new Error("Enter a valid support email.");
  if (!tagline) throw new Error("Tagline cannot be empty.");
  if (!Number.isFinite(input.applicationSlaHours) || input.applicationSlaHours <= 0) throw new Error("Auto-review SLA must be greater than zero.");

  const { error } = await supabase
    .from("platform_settings")
    .update({
      platform_name: platformName,
      support_email: supportEmail,
      tagline,
      application_sla_hours: input.applicationSlaHours,
      default_applicant_plan: input.defaultApplicantPlan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "platform_settings_updated",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: "Platform Settings",
    detail: `Name: ${platformName}, support email: ${supportEmail}, SLA: ${input.applicationSlaHours}h, default plan: ${input.defaultApplicantPlan === "per_order" ? "Pay Per Order" : "Monthly"}`,
  });

  revalidatePath("/settings");
  revalidatePath("/audit-log");
}

export async function setApplicationsPausedAction(paused: boolean) {
  const { supabase, user, staffProfile } = await requireSuperAdmin();

  const { error } = await supabase
    .from("platform_settings")
    .update({ applications_paused: paused, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: paused ? "applications_paused" : "applications_resumed",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: "Platform Settings",
    detail: paused ? "New vendor applications hidden from /apply." : "New vendor applications reopened on /apply.",
  });

  revalidatePath("/settings");
  revalidatePath("/audit-log");
}
