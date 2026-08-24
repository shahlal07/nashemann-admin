"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin, requireMutatingStaff } from "@/lib/authz";
import { provisionVendorStore, type ProvisionResult } from "@/lib/vendor-provisioning";

function generateTemporaryPassword() {
  return `Ns${randomBytes(9).toString("base64url")}!`;
}

// Was a second, independently-written copy of provisionVendorStore()'s
// entire body -- diverged from it over time (different validation, no
// category check, wrong rollback order deleting the Auth user before its
// FK-referencing rows). A vendor created manually here could silently come
// out different from one approved through Applications. Now just the thin
// wrapper: resolve a password, delegate the real work, audit-log it.
export async function createVendorStoreAction(input: { businessName: string; subdomain: string; category: string; city: string; plan: "per_order" | "monthly"; themeAccentFrom: string; themeAccentTo: string; themeLogoEmoji: string; themeLogoUrl: string | null; ownerName: string; ownerEmail: string; ownerPassword: string }): Promise<ProvisionResult> {
  const { supabase, actor } = await requireSuperAdmin();

  const password = input.ownerPassword.trim() || generateTemporaryPassword();
  const result = await provisionVendorStore(supabase, { ...input, ownerPassword: password });
  if ("error" in result) return result;

  await supabase.from("audit_log").insert({ action: "vendor_created", actor, entity: input.businessName, detail: `Store provisioned through the Super Admin panel (subdomain: ${input.subdomain}, plan: ${input.plan}, owner: ${input.ownerName})` });
  revalidatePath("/vendors");
  revalidatePath("/audit-log");
  return result;
}

export async function bulkSetVendorStatusAction(vendorIds: string[], vendorNames: string[], status: "active" | "suspended") {
  const { supabase, actor } = await requireMutatingStaff();
  if (!vendorIds.length) return;
  const { data, error } = await supabase.from("vendors").update({ status }).in("id", vendorIds).select("id");
  if (error) throw new Error(error.message);
  // RLS silently matches 0 rows on a permission mismatch instead of
  // erroring -- a plain `if (error) throw` alone would report success on a
  // no-op bulk write (see the fixed fix_vendors_update_rls_staff_mismatch
  // migration for the exact bug this class already caused once here).
  if (!data?.length) throw new Error("Couldn't update vendor status -- you may not have permission for these vendors.");
  await supabase.from("audit_log").insert({ action: status === "suspended" ? "vendor_suspended" : "vendor_reactivated", actor, entity: vendorNames.length <= 3 ? vendorNames.join(", ") : `${vendorNames.length} vendors`, detail: `Bulk ${status === "suspended" ? "suspend" : "reactivate"} (${vendorIds.length} vendors)` });
  revalidatePath("/vendors"); revalidatePath("/audit-log");
}
