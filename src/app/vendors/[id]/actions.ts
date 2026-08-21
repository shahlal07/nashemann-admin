"use server";

import { revalidatePath } from "next/cache";
import { sendAccountEmailChangedNotice, sendVendorAdminCredentialsChangedEmail, sendVendorAdminStoreNoticeEmail } from "@/lib/email";
import { requireFinanceStaff, requireMutatingStaff, requireSuperAdmin } from "@/lib/authz";

export async function setVendorWhiteLabelAction(vendorId: string, vendorName: string, enabled: boolean) {
  const { supabase, actor } = await requireFinanceStaff();
  const { error } = await supabase.from("vendors").update({ white_label_enabled: enabled }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: "vendor_white_label_toggled", actor, entity: vendorName, detail: enabled ? "White-label enabled — 'Powered by Nashemann' hidden" : "White-label disabled — 'Powered by Nashemann' restored" });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function saveVendorThemeAction(vendorId: string, vendorName: string, theme: { accentFrom: string; accentTo: string; logoEmoji: string; logoUrl: string | null; font: string }) {
  const { supabase, actor } = await requireMutatingStaff();
  const { error } = await supabase.from("vendors").update({ theme_accent_from: theme.accentFrom, theme_accent_to: theme.accentTo, theme_logo_emoji: theme.logoEmoji, theme_logo_url: theme.logoUrl, theme_font: theme.font }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: "vendor_theme_updated", actor, entity: vendorName, detail: `Updated storefront theme: accent ${theme.accentFrom} → ${theme.accentTo}, font ${theme.font}` });
  const { data: vendor } = await supabase.from("vendors").select("subdomain").eq("id", vendorId).single();
  const admins = await getVendorAdminsAction(vendorId);
  await Promise.all(admins.filter((a) => a.email).map((a) => sendVendorAdminStoreNoticeEmail({ to: a.email, name: a.name, storeName: vendorName, subject: `${vendorName} storefront design updated`, message: "The Nashemann Super Admin updated your storefront branding. The new design is now available on the live store.", storeUrl: `https://${vendor?.subdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendor?.subdomain ?? "store"}.nashemann.store` })));
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function toggleVendorStatusAction(vendorId: string, vendorName: string, nextStatus: "active" | "suspended") {
  const { supabase, actor } = await requireMutatingStaff();
  const { error } = await supabase.from("vendors").update({ status: nextStatus }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: nextStatus === "suspended" ? "vendor_suspended" : "vendor_reactivated", actor, entity: vendorName, detail: nextStatus === "suspended" ? "Suspended on platform and storefront" : "Reactivated on platform and storefront" });
  const { data: vendor } = await supabase.from("vendors").select("subdomain").eq("id", vendorId).single();
  const admins = await getVendorAdminsAction(vendorId);
  await Promise.all(admins.filter((a) => a.email).map((a) => sendVendorAdminStoreNoticeEmail({ to: a.email, name: a.name, storeName: vendorName, subject: `${vendorName} store ${nextStatus === "suspended" ? "suspended" : "reactivated"}`, message: nextStatus === "suspended" ? "The Nashemann Super Admin has temporarily suspended this storefront. Customer access is disabled until it is reactivated." : "The Nashemann Super Admin has reactivated this storefront. Customer access is live again.", storeUrl: `https://${vendor?.subdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendor?.subdomain ?? "store"}.nashemann.store` })));
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/vendors"); revalidatePath("/audit-log");
}

export async function changeVendorPlanAction(vendorId: string, vendorName: string, nextPlan: "per_order" | "monthly") {
  const { supabase, actor } = await requireMutatingStaff();
  const { error } = await supabase.from("vendors").update({ plan: nextPlan }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: "vendor_plan_changed", actor, entity: vendorName, detail: `Plan changed to ${nextPlan === "monthly" ? "Monthly" : "Pay Per Order"}` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function changeVendorCurrencyAction(vendorId: string, vendorName: string, currency: string) {
  const { supabase, actor } = await requireFinanceStaff();
  const { error } = await supabase.from("vendors").update({ currency }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: "vendor_currency_changed", actor, entity: vendorName, detail: `Display currency set to ${currency}` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function updateVendorCustomDomainAction(vendorId: string, vendorName: string, subdomain: string, customDomain: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const domain = customDomain.trim().toLowerCase();
  if (domain && domain.includes("nashemann.store")) throw new Error("Use the vendor subdomain for nashemann.store domains; custom domains must be external.");
  if (domain && !/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) throw new Error("Enter a valid custom domain.");
  const activeDomain = domain || `${subdomain}.nashemann.store`;
  const { error } = await supabase.from("vendors").update({ custom_domain: activeDomain }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: "vendor_custom_domain_changed", actor, entity: vendorName, detail: `Custom domain set to ${activeDomain}. DNS/Vercel verification is required before traffic can use it.` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/vendors"); revalidatePath("/audit-log");
  return activeDomain;
}

export async function updateVendorSlugAction(vendorId: string, vendorName: string, currentSlug: string, nextSlug: string) {
  const { supabase, actor } = await requireMutatingStaff();
  const slug = nextSlug.trim().toLowerCase();
  const previousSlug = currentSlug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) throw new Error("Slug must be lowercase letters, numbers, and single hyphens only (e.g. mina-cafe).");
  if (["www", "admin", "api", "app", "mail", "support", "status"].includes(slug)) throw new Error("That subdomain is reserved.");
  if (slug === previousSlug) return slug;
  const { data: conflict } = await supabase.from("vendors").select("id").eq("subdomain", slug).neq("id", vendorId).maybeSingle();
  if (conflict) throw new Error(`"${slug}" is already taken by another store.`);
  const { error } = await supabase.from("vendors").update({ subdomain: slug, custom_domain: `${slug}.nashemann.store` }).eq("id", vendorId);
  if (error) throw new Error(error.code === "23505" ? `"${slug}" is already taken by another store.` : error.message);
  await supabase.from("audit_log").insert({ action: "vendor_slug_changed", actor, entity: vendorName, detail: `Store subdomain changed from "${previousSlug}" to "${slug}" (storefront: ${slug}.nashemann.store, admin: admin.${slug}.nashemann.store)` });
  const admins = await getVendorAdminsAction(vendorId);
  await Promise.all(admins.filter((a) => a.email).map((a) => sendVendorAdminStoreNoticeEmail({ to: a.email, name: a.name, storeName: vendorName, subject: `${vendorName} store URL changed`, message: `The Nashemann Super Admin changed your store URL from ${previousSlug}.nashemann.store to ${slug}.nashemann.store.`, storeUrl: `https://${slug}.nashemann.store`, adminUrl: `https://admin.${slug}.nashemann.store` })));
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/vendors"); revalidatePath("/audit-log");
  return slug;
}

export type VendorAdminRow = { id: string; name: string; email: string; role: "owner" | "admin" | "staff"; added_at: string };

async function vendorAdminRpc(supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("platform-vendor-admin", { body });
  if (error) throw new Error(error.message || "Vendor admin service failed.");
  if (!data || data.error) throw new Error(data?.error ?? "Vendor admin operation failed.");
  return data as any;
}

export async function getVendorAdminsAction(vendorId: string): Promise<VendorAdminRow[]> {
  const { supabase } = await requireMutatingStaff();
  const data = await vendorAdminRpc(supabase, { action: "list", vendorId });
  return data.admins ?? [];
}

export async function addVendorAdminAction(vendorId: string, vendorName: string, name: string, email: string, role: "admin" | "staff" = "staff", vendorSubdomain?: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const data = await vendorAdminRpc(supabase, { action: "add", vendorId, name: name.trim(), email: email.trim(), role });
  await supabase.from("audit_log").insert({ action: "vendor_admin_added", actor, entity: vendorName, detail: `Added ${name.trim()} (${email.trim()}) as ${role === "admin" ? "admin" : "staff"} in the live vendor admin system` });
  await sendVendorAdminCredentialsChangedEmail({ to: data.admin.email, name: data.admin.name, storeName: vendorName, storeUrl: `https://${vendorSubdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendorSubdomain ?? "store"}.nashemann.store`, passwordChanged: true, temporaryPassword: data.temporaryPassword });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return { ...data.admin, temporaryPassword: data.temporaryPassword };
}

export async function updateVendorAdminAction(vendorId: string, vendorName: string, adminId: string, input: { name: string; email: string; password?: string; previousEmail?: string }, vendorSubdomain?: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const data = await vendorAdminRpc(supabase, { action: "update", vendorId, userId: adminId, name: input.name.trim(), email: input.email.trim(), previousEmail: input.previousEmail?.trim(), password: input.password?.trim() || undefined });
  await supabase.from("vendor_admins").update({ name: data.admin.name, email: data.admin.email }).eq("vendor_id", vendorId).eq("email", input.previousEmail?.trim() || input.email.trim());
  await supabase.from("audit_log").insert({ action: "vendor_admin_credentials_updated", actor, entity: vendorName, detail: `Updated ${data.admin.name} (${data.admin.email})${data.passwordChanged ? " and password" : ""}` });
  await sendVendorAdminCredentialsChangedEmail({ to: data.admin.email, name: data.admin.name, storeName: vendorName, storeUrl: `https://${vendorSubdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendorSubdomain ?? "store"}.nashemann.store`, passwordChanged: Boolean(data.passwordChanged) });
  if (input.previousEmail && input.previousEmail.trim().toLowerCase() !== data.admin.email.trim().toLowerCase()) {
    await sendAccountEmailChangedNotice({ to: input.previousEmail.trim(), newEmail: data.admin.email, isOldAddress: true });
    await sendAccountEmailChangedNotice({ to: data.admin.email, newEmail: data.admin.email, isOldAddress: false });
  }
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return data.admin;
}

export async function sendVendorAdminResetLinkAction(vendorId: string, vendorName: string, adminId: string, adminEmail: string, adminName: string, vendorSubdomain: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const data = await vendorAdminRpc(supabase, { action: "temporary_password", vendorId, userId: adminId });
  await supabase.from("audit_log").insert({ action: "vendor_admin_temporary_password_generated", actor, entity: vendorName, detail: `Generated a new temporary password for ${data.admin?.name ?? adminName} (${data.admin?.email ?? adminEmail})` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return { temporaryPassword: data.temporaryPassword, email: data.admin?.email ?? adminEmail, name: data.admin?.name ?? adminName };
}

export async function updateVendorControlProfileAction(vendorId: string, vendorName: string, input: { description: string; contactEmail: string; contactPhone: string; instagramUrl: string; youtubeUrl: string; feeType: "percent" | "fixed"; feeOverridePercent: number | null; feeOverrideFixedAmount: number | null }) {
  const { supabase, actor } = await requireSuperAdmin();
  const isPercent = input.feeType === "percent";
  if (isPercent && input.feeOverridePercent !== null && (!Number.isFinite(input.feeOverridePercent) || input.feeOverridePercent < 0 || input.feeOverridePercent > 100)) throw new Error("Fee override must be between 0 and 100 percent.");
  if (!isPercent && input.feeOverrideFixedAmount !== null && (!Number.isFinite(input.feeOverrideFixedAmount) || input.feeOverrideFixedAmount < 0)) throw new Error("Fixed fee amount must be zero or a positive number.");
  const { error } = await supabase.from("vendors").update({ description: input.description.trim(), contact_email: input.contactEmail.trim() || null, contact_phone: input.contactPhone.trim() || null, instagram_url: input.instagramUrl.trim() || null, youtube_url: input.youtubeUrl.trim() || null, fee_type: input.feeType, fee_override_percent: isPercent ? input.feeOverridePercent : null, fee_override_fixed_amount: !isPercent ? input.feeOverrideFixedAmount : null }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  const feeLabel = input.feeOverridePercent === null && input.feeOverrideFixedAmount === null ? "standard" : isPercent ? `${input.feeOverridePercent ?? 0}%` : `Rs ${input.feeOverrideFixedAmount ?? 0}/order`;
  await supabase.from("audit_log").insert({ action: "vendor_control_profile_updated", actor, entity: vendorName, detail: `Updated contact, social, description and fee override (${feeLabel})` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function revokeVendorAdminSessionsAction(vendorId: string, vendorName: string, adminId: string, adminLabel: string, adminEmail: string) {
  const { supabase, actor } = await requireSuperAdmin();
  await vendorAdminRpc(supabase, { action: "revoke_sessions", vendorId, userId: adminId });
  await supabase.from("audit_log").insert({ action: "vendor_admin_sessions_revoked", actor, entity: vendorName, detail: `Revoked all active sessions for ${adminLabel}` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function removeVendorAdminAction(vendorId: string, vendorName: string, adminId: string, adminLabel: string, adminEmail?: string) {
  const { supabase, actor } = await requireSuperAdmin();
  await vendorAdminRpc(supabase, { action: "remove", vendorId, userId: adminId });
  await supabase.from("audit_log").insert({ action: "vendor_admin_removed", actor, entity: vendorName, detail: `Removed ${adminLabel} from the live vendor admin system` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}
