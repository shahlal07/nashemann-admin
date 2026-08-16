"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceStaff, requireMutatingStaff } from "@/lib/authz";

/**
 * Toggles a vendor's white-label flag. Gated to Finance/Super Admin (billing
 * & plan-adjacent setting), mirroring is_finance_staff() in the DB.
 */
export async function setVendorWhiteLabelAction(vendorId: string, vendorName: string, enabled: boolean) {
  const { supabase, actor } = await requireFinanceStaff();

  const { error } = await supabase.from("vendors").update({ white_label_enabled: enabled }).eq("id", vendorId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "vendor_white_label_toggled",
    actor,
    entity: vendorName,
    detail: enabled ? "White-label enabled — 'Powered by Nashemann' hidden" : "White-label disabled — 'Powered by Nashemann' restored",
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}

export async function saveVendorThemeAction(
  vendorId: string,
  vendorName: string,
  theme: { accentFrom: string; accentTo: string; logoEmoji: string; font: string }
) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase
    .from("vendors")
    .update({
      theme_accent_from: theme.accentFrom,
      theme_accent_to: theme.accentTo,
      theme_logo_emoji: theme.logoEmoji,
      theme_font: theme.font,
    })
    .eq("id", vendorId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "vendor_theme_updated",
    actor,
    entity: vendorName,
    detail: `Accent ${theme.accentFrom} → ${theme.accentTo}, font ${theme.font}`,
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}

export async function toggleVendorStatusAction(vendorId: string, vendorName: string, nextStatus: "active" | "suspended") {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("vendors").update({ status: nextStatus }).eq("id", vendorId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: nextStatus === "suspended" ? "vendor_suspended" : "vendor_reactivated",
    actor,
    entity: vendorName,
    detail: nextStatus === "suspended" ? "Suspended from vendor detail page" : "Reactivated from vendor detail page",
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/vendors");
  revalidatePath("/audit-log");
}

export async function changeVendorPlanAction(vendorId: string, vendorName: string, nextPlan: "per_order" | "monthly") {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("vendors").update({ plan: nextPlan }).eq("id", vendorId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "vendor_plan_changed",
    actor,
    entity: vendorName,
    detail: `Plan changed to ${nextPlan === "monthly" ? "Monthly" : "Pay Per Order"}`,
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}

export async function changeVendorCurrencyAction(vendorId: string, vendorName: string, currency: string) {
  const { supabase, actor } = await requireFinanceStaff();

  const { error } = await supabase.from("vendors").update({ currency }).eq("id", vendorId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "vendor_currency_changed",
    actor,
    entity: vendorName,
    detail: `Display currency set to ${currency}`,
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function updateVendorSlugAction(vendorId: string, vendorName: string, nextSlug: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const slug = nextSlug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and single hyphens only (e.g. mina-cafe).");
  }

  const { data: conflict } = await supabase
    .from("vendors")
    .select("id")
    .eq("subdomain", slug)
    .neq("id", vendorId)
    .maybeSingle();
  if (conflict) throw new Error(`"${slug}" is already taken by another store.`);

  const { error } = await supabase.from("vendors").update({ subdomain: slug }).eq("id", vendorId);
  if (error) {
    throw new Error(error.code === "23505" ? `"${slug}" is already taken by another store.` : error.message);
  }

  await supabase.from("audit_log").insert({
    action: "vendor_slug_changed",
    actor,
    entity: vendorName,
    detail: `Store slug changed to "${slug}" (storefront: ${slug}.nashemann.store, admin: admin.${slug}.nashemann.store)`,
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/vendors");
  revalidatePath("/audit-log");
  return slug;
}

export async function addVendorAdminAction(vendorId: string, vendorName: string, name: string, email: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const { data, error } = await supabase
    .from("vendor_admins")
    .insert({ vendor_id: vendorId, name: name.trim(), email: email.trim(), role: "staff" })
    .select("id, name, email, role, added_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't add admin.");

  await supabase.from("audit_log").insert({
    action: "vendor_admin_added",
    actor,
    entity: vendorName,
    detail: `Added ${name.trim()} (${email.trim()}) as store staff`,
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
  return data;
}

export async function removeVendorAdminAction(vendorId: string, vendorName: string, adminId: string, adminLabel: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("vendor_admins").delete().eq("id", adminId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "vendor_admin_removed",
    actor,
    entity: vendorName,
    detail: `Removed ${adminLabel} from store admins`,
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}
