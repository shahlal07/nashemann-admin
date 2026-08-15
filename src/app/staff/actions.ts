"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin, ROLE_LABELS, type StaffRole } from "@/lib/authz";

export async function inviteStaffAction(input: { name: string; email: string; role: StaffRole }) {
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
    detail: `Invited as ${ROLE_LABELS[input.role]}`,
  });

  revalidatePath("/staff");
  revalidatePath("/audit-log");
}

export async function updateStaffRoleAction(staffId: string, name: string, role: StaffRole) {
  const { supabase, actor, staffProfile } = await requireSuperAdmin();

  if (staffId === staffProfile?.id) throw new Error("You can't change your own role.");

  const { error } = await supabase.from("staff_profiles").update({ role }).eq("id", staffId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "staff_role_updated",
    actor,
    entity: name,
    detail: `Role changed to ${ROLE_LABELS[role]}`,
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
