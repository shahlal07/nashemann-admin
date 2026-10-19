"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/owner-authz";

const targets = new Set(["whole_panel", "technology", "finance", "marketing"]);
const statuses = new Set(["proposed", "approved", "in_progress", "shipped", "declined"]);

export async function createFeatureRequest(formData: FormData) {
  const { supabase, user } = await requireOwner("technology.manage");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const target = String(formData.get("target_platform") ?? "");

  if (title.length < 3 || title.length > 160 || description.length > 4000 || !targets.has(target)) {
    redirect("/owners/features?error=invalid");
  }

  const { error } = await supabase.from("owner_feature_requests").insert({
    title,
    description,
    target_platform: target,
    created_by: user.id,
  });
  if (error) redirect("/owners/features?error=save");
  revalidatePath("/owners/features");
  revalidatePath("/owners");
  redirect("/owners/features?saved=1");
}

export async function updateFeatureRequestStatus(formData: FormData) {
  const { supabase } = await requireOwner("technology.manage");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !statuses.has(status)) {
    redirect("/owners/features?error=invalid");
  }

  const { error } = await supabase
    .from("owner_feature_requests")
    .update({ status })
    .eq("id", id);
  if (error) redirect("/owners/features?error=save");
  revalidatePath("/owners/features");
  revalidatePath("/owners");
  redirect("/owners/features?saved=1");
}
