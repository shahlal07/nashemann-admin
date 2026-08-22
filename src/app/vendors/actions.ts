"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin, requireMutatingStaff } from "@/lib/authz";

function generateTemporaryPassword() {
  return `Ns${randomBytes(9).toString("base64url")}!`;
}

export async function createVendorStoreAction(input: { businessName: string; subdomain: string; category: string; city: string; plan: "per_order" | "monthly"; themeAccentFrom: string; themeAccentTo: string; themeLogoEmoji: string; themeLogoUrl: string | null; ownerName: string; ownerEmail: string; ownerPassword: string }) {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();

  const email = input.ownerEmail.trim().toLowerCase();
  const password = input.ownerPassword.trim() || generateTemporaryPassword();
  const { data: existingUserData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existingUserData.users.some((u) => u.email?.toLowerCase() === email)) {
    throw new Error(`An Auth account already exists for ${email}. Use the vendor's admin controls to update that account instead.`);
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert({
      name: input.businessName.trim(),
      slug: input.subdomain.trim().toLowerCase(),
      subdomain: input.subdomain.trim().toLowerCase(),
      custom_domain: `${input.subdomain.trim().toLowerCase()}.nashemann.store`,
      category: input.category.trim() || null,
      city: input.city.trim() || null,
      plan: input.plan,
      status: "active",
      active: true,
      theme_accent_from: input.themeAccentFrom,
      theme_accent_to: input.themeAccentTo,
      theme_logo_emoji: input.themeLogoEmoji,
      theme_logo_url: input.themeLogoUrl,
      joined_at: new Date().toISOString(),
    })
    .select("id, name, subdomain")
    .single();
  if (vendorError || !vendor) throw new Error(vendorError?.message || "Couldn't create the vendor store.");

  const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: input.ownerName.trim() },
  });

  if (authError || !createdAuth.user) {
    await supabase.from("vendors").delete().eq("id", vendor.id);
    throw new Error(authError?.message || "Couldn't create the vendor admin account.");
  }

  const userId = createdAuth.user.id;
  const cleanup = async () => {
    await admin.auth.admin.deleteUser(userId);
    await supabase.from("vendors").delete().eq("id", vendor.id);
  };

  const { error: platformError } = await admin.from("platform_accounts").upsert({
    id: userId,
    name: input.ownerName.trim(),
    email,
    provider: "email",
  });
  if (platformError) {
    await cleanup();
    throw new Error(platformError.message);
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    role: "admin",
    name: input.ownerName.trim(),
    email,
    vendor_id: vendor.id,
  });
  if (profileError) {
    await cleanup();
    throw new Error(profileError.message);
  }

  const { error: vendorAdminError } = await admin.from("vendor_admins").insert({
    vendor_id: vendor.id,
    name: input.ownerName.trim(),
    email,
    role: "owner",
  });
  if (vendorAdminError) {
    await cleanup();
    throw new Error(vendorAdminError.message);
  }

  await supabase.from("audit_log").insert({ action: "vendor_created", actor, entity: input.businessName, detail: `Store provisioned through the Super Admin panel (subdomain: ${input.subdomain}, plan: ${input.plan}, owner: ${input.ownerName})` });
  revalidatePath("/vendors");
  revalidatePath("/audit-log");
  return { vendorId: vendor.id as string, temporaryPassword: input.ownerPassword.trim() ? undefined : password };
}

export async function bulkSetVendorStatusAction(vendorIds: string[], vendorNames: string[], status: "active" | "suspended") {
  const { supabase, actor } = await requireMutatingStaff();
  if (!vendorIds.length) return;
  const { error } = await supabase.from("vendors").update({ status }).in("id", vendorIds);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: status === "suspended" ? "vendor_suspended" : "vendor_reactivated", actor, entity: vendorNames.length <= 3 ? vendorNames.join(", ") : `${vendorNames.length} vendors`, detail: `Bulk ${status === "suspended" ? "suspend" : "reactivate"} (${vendorIds.length} vendors)` });
  revalidatePath("/vendors"); revalidatePath("/audit-log");
}
