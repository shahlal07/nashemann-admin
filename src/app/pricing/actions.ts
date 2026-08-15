"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function savePricingAction(input: {
  perOrderFee: number;
  monthlyFee: number;
  customDomainFee: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) throw new Error("Not authorized");

  const breakEven = Math.ceil(input.monthlyFee / input.perOrderFee);

  const { error } = await supabase
    .from("platform_pricing")
    .update({
      per_order_fee: input.perOrderFee,
      monthly_fee: input.monthlyFee,
      custom_domain_fee: input.customDomainFee,
      monthly_break_even_orders: breakEven,
    })
    .eq("id", true);
  if (error) throw new Error(error.message);

  const { data: staffProfile } = await supabase
    .from("staff_profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.from("audit_log").insert({
    action: "platform_fee_updated",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: "Platform Settings",
    detail: `Per-order Rs ${input.perOrderFee}, monthly Rs ${input.monthlyFee}, custom domain Rs ${input.customDomainFee}`,
  });

  revalidatePath("/pricing");
  revalidatePath("/audit-log");
}
