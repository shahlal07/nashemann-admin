"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/authz";

export async function saveBillingGraceDaysAction(formData: FormData) {
  const { supabase, user, staffProfile } = await requireSuperAdmin();
  const raw = String(formData.get("graceDays") ?? "");
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 0 || days > 30) {
    throw new Error("Grace period must be a whole number between 0 and 30 days.");
  }

  const { error } = await supabase
    .from("platform_settings")
    .update({ billing_grace_days: days, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "billing_grace_period_updated",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: "Platform Billing Policy",
    detail: `Overdue store suspension grace period set to ${days} day(s).`,
  });
  revalidatePath("/settlements/billing-settings");
  revalidatePath("/settlements");
}
