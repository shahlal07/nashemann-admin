"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: staffProfile } = await supabase
    .from("staff_profiles")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!staffProfile || staffProfile.role !== "super_admin") throw new Error("Only a super admin can manage staff.");

  return { supabase, actor: staffProfile.name ?? user.email ?? "Unknown" };
}

export async function inviteStaffAction(input: { name: string; email: string; role: "super_admin" | "platform_staff" }) {
  const { supabase, actor } = await requireSuperAdmin();

  const { error: inviteError } = await supabase.functions.invoke("invite-staff", {
    body: input,
  });
  if (inviteError) {
    const message =
      "context" in inviteError && inviteError.context instanceof Response
        ? ((await inviteError.context.json().catch(() => null)) as { error?: string } | null)?.error
        : undefined;
    throw new Error(message ?? inviteError.message);
  }

  await supabase.from("audit_log").insert({
    action: "staff_invited",
    actor,
    entity: input.name,
    detail: `Invited as ${input.role === "super_admin" ? "Super Admin" : "Platform Staff"}`,
  });

  revalidatePath("/staff");
  revalidatePath("/audit-log");
}

export async function updateStaffRoleAction(staffId: string, name: string, role: "super_admin" | "platform_staff") {
  const { supabase, actor } = await requireSuperAdmin();

  const { error } = await supabase.from("staff_profiles").update({ role }).eq("id", staffId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "staff_role_updated",
    actor,
    entity: name,
    detail: `Role changed to ${role === "super_admin" ? "Super Admin" : "Platform Staff"}`,
  });

  revalidatePath("/staff");
  revalidatePath("/audit-log");
}

export async function removeStaffAction(staffId: string, name: string) {
  const { supabase, actor } = await requireSuperAdmin();

  const { error } = await supabase.from("staff_profiles").delete().eq("id", staffId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "staff_removed",
    actor,
    entity: name,
    detail: "Removed from platform staff",
  });

  revalidatePath("/staff");
  revalidatePath("/audit-log");
}
