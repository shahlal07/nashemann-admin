"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markSettledAction(vendorId: string, vendorName: string, month: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) throw new Error("Not authorized");

  const { error } = await supabase
    .from("settlements")
    .update({ status: "settled" })
    .eq("vendor_id", vendorId)
    .eq("month", month);
  if (error) throw new Error(error.message);

  const { data: staffProfile } = await supabase
    .from("staff_profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const monthLabel = new Date(month).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
  await supabase.from("audit_log").insert({
    action: "settlement_marked_settled",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: `${vendorName} · ${monthLabel}`,
    detail: "Marked settled via Settlements page",
  });

  revalidatePath("/settlements");
  revalidatePath("/audit-log");
}
