"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";

export async function bulkSetVendorStatusAction(vendorIds: string[], vendorNames: string[], status: "active" | "suspended") {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("vendors").update({ status }).in("id", vendorIds);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: status === "suspended" ? "vendor_suspended" : "vendor_reactivated",
    actor,
    entity: vendorNames.length <= 3 ? vendorNames.join(", ") : `${vendorNames.length} vendors`,
    detail: `Bulk ${status === "suspended" ? "suspend" : "reactivate"} (${vendorIds.length} vendor${vendorIds.length === 1 ? "" : "s"})`,
  });

  revalidatePath("/vendors");
  revalidatePath("/audit-log");
}

export async function createVendorStoreAction(input: {
  businessName: string;
  subdomain: string;
  category: string;
  city: string;
  plan: "per_order" | "monthly";
  themeAccentFrom: string;
  themeAccentTo: string;
  themeLogoEmoji: string;
  themeLogoUrl: string | null;
  ownerName: string;
  ownerEmail: string;
}) {
  const { supabase, actor } = await requireMutatingStaff();

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert({
      name: input.businessName,
      subdomain: input.subdomain,
      category: input.category,
      city: input.city,
      plan: input.plan,
      status: "active",
      theme_accent_from: input.themeAccentFrom,
      theme_accent_to: input.themeAccentTo,
      theme_logo_emoji: input.themeLogoEmoji,
      theme_logo_url: input.themeLogoUrl,
    })
    .select("id")
    .single();

  if (vendorError || !vendor) {
    throw new Error(
      vendorError?.code === "23505"
        ? `Subdomain "${input.subdomain}" is already taken — pick another one.`
        : `Couldn't create the store: ${vendorError?.message ?? "unknown error"}`
    );
  }

  const { error: adminError } = await supabase.from("vendor_admins").insert({
    vendor_id: vendor.id,
    name: input.ownerName,
    email: input.ownerEmail,
    role: "owner",
  });
  if (adminError) throw new Error(`Store created, but couldn't add the owner account: ${adminError.message}`);

  await supabase.from("audit_log").insert({
    action: "vendor_created",
    actor,
    entity: input.businessName,
    detail: `Store provisioned directly (subdomain: ${input.subdomain}, plan: ${input.plan}, owner: ${input.ownerName})`,
  });

  revalidatePath("/vendors");
  revalidatePath("/audit-log");

  return vendor.id as string;
}
