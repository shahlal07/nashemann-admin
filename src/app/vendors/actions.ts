"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin, requireMutatingStaff } from "@/lib/authz";

export async function createVendorStoreAction(input: { businessName: string; subdomain: string; category: string; city: string; plan: "per_order" | "monthly"; themeAccentFrom: string; themeAccentTo: string; themeLogoEmoji: string; themeLogoUrl: string | null; ownerName: string; ownerEmail: string; ownerPassword: string }) {
  const { supabase, actor } = await requireSuperAdmin();
  const { data, error } = await supabase.functions.invoke("platform-vendor-admin", {
    body: { action: "create_store", ...input },
  });
  if (error) throw new Error(error.message || "Couldn't create the vendor store.");
  if (!data?.vendorId || data.error) throw new Error(data?.error ?? "Couldn't create the vendor store.");
  await supabase.from("audit_log").insert({ action: "vendor_created", actor, entity: input.businessName, detail: `Store provisioned through the Super Admin panel (subdomain: ${input.subdomain}, plan: ${input.plan}, owner: ${input.ownerName})` });
  revalidatePath("/vendors"); revalidatePath("/audit-log");
  return data.vendorId as string;
}

export async function bulkSetVendorStatusAction(vendorIds: string[], vendorNames: string[], status: "active" | "suspended") {
  const { supabase, actor } = await requireMutatingStaff();
  if (!vendorIds.length) return;
  const { error } = await supabase.from("vendors").update({ status }).in("id", vendorIds);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: status === "suspended" ? "vendor_suspended" : "vendor_reactivated", actor, entity: vendorNames.length <= 3 ? vendorNames.join(", ") : `${vendorNames.length} vendors`, detail: `Bulk ${status === "suspended" ? "suspend" : "reactivate"} (${vendorIds.length} vendors)` });
  revalidatePath("/vendors"); revalidatePath("/audit-log");
}
