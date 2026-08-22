"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sendAccountEmailChangedNotice, sendVendorAdminCredentialsChangedEmail, sendVendorAdminStoreNoticeEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
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

function generateTemporaryPassword() {
  return `Ns${randomBytes(9).toString("base64url")}!`;
}

async function syncVendorAdminProfile(admin: ReturnType<typeof createAdminClient>, userId: string, vendorId: string, name: string, email: string) {
  const [{ error: accountError }, { error: profileError }] = await Promise.all([
    admin.from("platform_accounts").upsert({ id: userId, name, email, provider: "email" }),
    admin.from("profiles").upsert({ id: userId, role: "admin", name, email, vendor_id: vendorId }),
  ]);
  if (accountError) throw new Error(accountError.message);
  if (profileError) throw new Error(profileError.message);
}

export async function getVendorAdminsAction(vendorId: string): Promise<VendorAdminRow[]> {
  const { supabase } = await requireMutatingStaff();
  const { data, error } = await supabase.from("vendor_admins").select("id,name,email,role,added_at").eq("vendor_id", vendorId).order("added_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VendorAdminRow[];
}

export async function addVendorAdminAction(vendorId: string, vendorName: string, name: string, email: string, role: "admin" | "staff" = "staff", vendorSubdomain?: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanName || !cleanEmail) throw new Error("Name and email are required.");

  const { data: existingAdmins, error: existingAdminError } = await supabase.from("vendor_admins").select("id").eq("vendor_id", vendorId).ilike("email", cleanEmail);
  if (existingAdminError) throw new Error(existingAdminError.message);
  if (existingAdmins?.length) throw new Error(`${cleanEmail} is already assigned to this vendor.`);

  const password = generateTemporaryPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email: cleanEmail, password, email_confirm: true, user_metadata: { name: cleanName, vendor_id: vendorId } });
  if (createError || !created.user) throw new Error(createError?.message || "Couldn't create the vendor admin Auth account.");

  try {
    await syncVendorAdminProfile(admin, created.user.id, vendorId, cleanName, cleanEmail);
    const { data: row, error: rowError } = await admin.from("vendor_admins").insert({ vendor_id: vendorId, name: cleanName, email: cleanEmail, role }).select("id,name,email,role,added_at").single();
    if (rowError || !row) throw new Error(rowError?.message || "Couldn't save the vendor admin record.");

    await supabase.from("audit_log").insert({ action: "vendor_admin_added", actor, entity: vendorName, detail: `Added ${cleanName} (${cleanEmail}) as ${role} in the live vendor admin system` });
    await sendVendorAdminCredentialsChangedEmail({ to: row.email, name: row.name, storeName: vendorName, storeUrl: `https://${vendorSubdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendorSubdomain ?? "store"}.nashemann.store`, passwordChanged: true, temporaryPassword: password });
    revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
    return { ...row, temporaryPassword: password };
  } catch (error) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw error;
  }
}

export async function updateVendorAdminAction(vendorId: string, vendorName: string, adminId: string, input: { name: string; email: string; password?: string; previousEmail?: string }, vendorSubdomain?: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const cleanName = input.name.trim();
  const cleanEmail = input.email.trim().toLowerCase();
  const previousEmail = input.previousEmail?.trim().toLowerCase();
  const password = input.password?.trim();
  if (!cleanName || !cleanEmail) throw new Error("Name and email are required.");

  const { data: target } = await admin.auth.admin.getUserById(adminId);
  if (!target.user) throw new Error("Vendor admin Auth account not found.");

  const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, unknown>; email_confirm?: boolean } = {
    user_metadata: { ...(target.user.user_metadata ?? {}), name: cleanName, vendor_id: vendorId },
  };
  if (cleanEmail !== (target.user.email ?? "").toLowerCase()) {
    authUpdate.email = cleanEmail;
    authUpdate.email_confirm = true;
  }
  if (password) authUpdate.password = password;

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(adminId, authUpdate);
  if (updateError || !updated.user) throw new Error(updateError?.message || "Couldn't update the vendor admin Auth account.");

  await syncVendorAdminProfile(admin, adminId, vendorId, cleanName, cleanEmail);
  const { data: row, error: rowError } = await admin.from("vendor_admins").update({ name: cleanName, email: cleanEmail }).eq("vendor_id", vendorId).eq("id", adminId).select("id,name,email,role,added_at").maybeSingle();
  if (rowError) throw new Error(rowError.message);
  if (!row) {
    const { data: byEmail, error: emailRowError } = await admin.from("vendor_admins").update({ name: cleanName, email: cleanEmail }).eq("vendor_id", vendorId).ilike("email", previousEmail ?? target.user.email ?? "").select("id,name,email,role,added_at").maybeSingle();
    if (emailRowError || !byEmail) throw new Error(emailRowError?.message || "Vendor admin record not found.");
  }

  await supabase.from("audit_log").insert({ action: "vendor_admin_credentials_updated", actor, entity: vendorName, detail: `Updated ${cleanName} (${cleanEmail})${password ? " and password" : ""}` });
  await sendVendorAdminCredentialsChangedEmail({ to: cleanEmail, name: cleanName, storeName: vendorName, storeUrl: `https://${vendorSubdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendorSubdomain ?? "store"}.nashemann.store`, passwordChanged: Boolean(password) });
  if (previousEmail && previousEmail !== cleanEmail) {
    await sendAccountEmailChangedNotice({ to: previousEmail, newEmail: cleanEmail, isOldAddress: true });
    await sendAccountEmailChangedNotice({ to: cleanEmail, newEmail: cleanEmail, isOldAddress: false });
  }
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return { id: adminId, name: cleanName, email: cleanEmail };
}

export async function sendVendorAdminResetLinkAction(vendorId: string, vendorName: string, adminId: string, adminEmail: string, adminName: string, vendorSubdomain: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const password = generateTemporaryPassword();
  const { data, error } = await admin.auth.admin.updateUserById(adminId, { password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message || "Couldn't generate a temporary password.");

  await supabase.from("audit_log").insert({ action: "vendor_admin_temporary_password_generated", actor, entity: vendorName, detail: `Generated a new temporary password for ${data.user.email ?? adminEmail} (${adminName})` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return { temporaryPassword: password, email: data.user.email ?? adminEmail, name: adminName };
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
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.signOut(adminId, "global");
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: "vendor_admin_sessions_revoked", actor, entity: vendorName, detail: `Revoked all active sessions for ${adminLabel}` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function removeVendorAdminAction(vendorId: string, vendorName: string, adminId: string, adminLabel: string, adminEmail?: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const { error: signOutError } = await admin.auth.admin.signOut(adminId, "global");
  if (signOutError) throw new Error(signOutError.message);
  const { error: deleteError } = await admin.from("vendor_admins").delete().eq("vendor_id", vendorId).or(`id.eq.${adminId},email.eq.${adminEmail ?? ""}`);
  if (deleteError) throw new Error(deleteError.message);
  await Promise.all([
    admin.from("profiles").delete().eq("id", adminId),
    admin.from("platform_accounts").delete().eq("id", adminId),
    admin.auth.admin.deleteUser(adminId),
  ]);
  await supabase.from("audit_log").insert({ action: "vendor_admin_removed", actor, entity: vendorName, detail: `Removed ${adminLabel} from the live vendor admin system` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}
