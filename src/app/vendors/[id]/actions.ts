"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sendAccountEmailChangedNotice, sendVendorAdminCredentialsChangedEmail, sendVendorAdminStoreNoticeEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFinanceStaff, requireMutatingStaff, requireSuperAdmin } from "@/lib/authz";

export type VendorAdminRow = { id: string; name: string; email: string; role: "owner" | "admin" | "staff"; added_at: string };
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function generateTemporaryPassword() {
  return `Ns${randomBytes(9).toString("base64url")}!`;
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = data.users.find((u) => u.email?.toLowerCase() === target);
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

// Next.js redacts thrown Server Action errors to a generic
// "Server Components render" message + digest in production (by design, so
// server internals never leak to the client) -- a plain `throw` here would
// mean the caller's try/catch always sees that generic message, never the
// real "not found"/"no auth account" text a superadmin actually needs to
// act on. Returning a discriminated result instead of throwing is how this
// stays informative in production, not just in dev.
type Resolved = { ok: true; row: VendorAdminRow; user: Awaited<ReturnType<typeof findAuthUserByEmail>> & object };
type ResolveFailure = { ok: false; error: string };

async function resolveVendorAdmin(admin: ReturnType<typeof createAdminClient>, vendorId: string, vendorAdminId: string): Promise<Resolved | ResolveFailure> {
  const { data: row, error } = await admin.from("vendor_admins").select("id,name,email,role,added_at").eq("vendor_id", vendorId).eq("id", vendorAdminId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "Vendor admin record not found. Refresh the page and try again." };
  const user = await findAuthUserByEmail(admin, row.email);
  if (!user) return { ok: false, error: `No Supabase Auth account exists for ${row.email}. Use Edit Credentials to recreate/sync this vendor admin.` };
  return { ok: true, row: row as VendorAdminRow, user };
}

async function syncVendorAdminProfile(admin: ReturnType<typeof createAdminClient>, userId: string, vendorId: string, name: string, email: string) {
  const [{ error: accountError }, { error: profileError }] = await Promise.all([
    admin.from("platform_accounts").upsert({ id: userId, name, email, provider: "email" }),
    admin.from("profiles").upsert({ id: userId, role: "admin", name, email, vendor_id: vendorId }),
  ]);
  if (accountError) throw new Error(accountError.message);
  if (profileError) throw new Error(profileError.message);
}

// Every vendors UPDATE below asserts the affected row count -- RLS silently
// matches 0 rows on a permission mismatch instead of erroring (this bit a
// real staff-role/RLS mismatch here once, see the fixed
// fix_vendors_update_rls_staff_mismatch migration), so a plain
// `if (error) throw` alone would report success on a no-op write.
function assertUpdated(rows: unknown[] | null, what: string) {
  if (!rows?.length) throw new Error(`Couldn't update ${what} -- you may not have permission for this vendor.`);
}

export async function setVendorWhiteLabelAction(vendorId: string, vendorName: string, enabled: boolean) {
  const { supabase, actor } = await requireFinanceStaff();
  const { data, error } = await supabase.from("vendors").update({ white_label_enabled: enabled }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "white-label setting");
  await supabase.from("audit_log").insert({ action: "vendor_white_label_toggled", actor, entity: vendorName, detail: enabled ? "White-label enabled" : "White-label disabled" });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function saveVendorThemeAction(vendorId: string, vendorName: string, theme: { accentFrom: string; accentTo: string; logoEmoji: string; logoUrl: string | null; font: string }) {
  const { supabase, actor } = await requireMutatingStaff();
  const { data, error } = await supabase.from("vendors").update({ theme_accent_from: theme.accentFrom, theme_accent_to: theme.accentTo, theme_logo_emoji: theme.logoEmoji, theme_logo_url: theme.logoUrl, theme_font: theme.font }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "storefront theme");
  await supabase.from("audit_log").insert({ action: "vendor_theme_updated", actor, entity: vendorName, detail: `Updated storefront theme: ${theme.font}` });
  const { data: vendor } = await supabase.from("vendors").select("subdomain").eq("id", vendorId).single();
  const admins = await getVendorAdminsAction(vendorId);
  await Promise.all(admins.filter((a) => a.email).map((a) => sendVendorAdminStoreNoticeEmail({ to: a.email, name: a.name, storeName: vendorName, subject: `${vendorName} storefront design updated`, message: "The Super Admin updated your storefront branding.", storeUrl: `https://${vendor?.subdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendor?.subdomain ?? "store"}.nashemann.store` })));
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function toggleVendorStatusAction(vendorId: string, vendorName: string, nextStatus: "active" | "suspended") {
  const { supabase, actor } = await requireMutatingStaff();
  const { data, error } = await supabase.from("vendors").update({ status: nextStatus }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "vendor status");
  await supabase.from("audit_log").insert({ action: nextStatus === "suspended" ? "vendor_suspended" : "vendor_reactivated", actor, entity: vendorName, detail: nextStatus });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/vendors"); revalidatePath("/audit-log");
}

export async function changeVendorPlanAction(vendorId: string, vendorName: string, nextPlan: "per_order" | "monthly") {
  const { supabase, actor } = await requireMutatingStaff();
  const { data, error } = await supabase.from("vendors").update({ plan: nextPlan }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "billing plan");
  await supabase.from("audit_log").insert({ action: "vendor_plan_changed", actor, entity: vendorName, detail: nextPlan });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function changeVendorCategoryAction(vendorId: string, vendorName: string, category: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const { data: schema } = await supabase.from("category_product_schemas").select("category").eq("category", category).maybeSingle();
  if (!schema) throw new Error("Unknown category.");
  const { data, error } = await supabase.from("vendors").update({ category }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "category");
  await supabase.from("audit_log").insert({ action: "vendor_category_changed", actor, entity: vendorName, detail: category });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/vendors"); revalidatePath("/audit-log");
}

export async function changeVendorCurrencyAction(vendorId: string, vendorName: string, currency: string) {
  const { supabase, actor } = await requireFinanceStaff();
  const { data, error } = await supabase.from("vendors").update({ currency }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "currency");
  await supabase.from("audit_log").insert({ action: "vendor_currency_changed", actor, entity: vendorName, detail: currency });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function updateVendorCustomDomainAction(vendorId: string, vendorName: string, subdomain: string, customDomain: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const domain = customDomain.trim().toLowerCase();
  if (domain && domain.includes("nashemann.store")) throw new Error("Use the vendor subdomain for nashemann.store domains; custom domains must be external.");
  if (domain && !/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) throw new Error("Enter a valid custom domain.");
  const activeDomain = domain || `${subdomain}.nashemann.store`;
  const { data, error } = await supabase.from("vendors").update({ custom_domain: activeDomain }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "custom domain");
  await supabase.from("audit_log").insert({ action: "vendor_custom_domain_changed", actor, entity: vendorName, detail: activeDomain });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/vendors"); revalidatePath("/audit-log");
  return activeDomain;
}

export async function updateVendorSlugAction(vendorId: string, vendorName: string, currentSlug: string, nextSlug: string) {
  const { supabase, actor } = await requireMutatingStaff();
  const slug = nextSlug.trim().toLowerCase();
  const previousSlug = currentSlug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) throw new Error("Slug must be lowercase letters, numbers, and single hyphens only.");
  if (["www", "admin", "api", "app", "mail", "support", "status"].includes(slug)) throw new Error("That subdomain is reserved.");
  if (slug === previousSlug) return slug;
  const { data: conflict } = await supabase.from("vendors").select("id").eq("subdomain", slug).neq("id", vendorId).maybeSingle();
  if (conflict) throw new Error(`"${slug}" is already taken by another store.`);
  const { data, error } = await supabase.from("vendors").update({ subdomain: slug, custom_domain: `${slug}.nashemann.store` }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "subdomain");
  await supabase.from("audit_log").insert({ action: "vendor_slug_changed", actor, entity: vendorName, detail: `${previousSlug} → ${slug}` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/vendors"); revalidatePath("/audit-log");
  return slug;
}

export async function getVendorAdminsAction(vendorId: string): Promise<VendorAdminRow[]> {
  const { supabase } = await requireMutatingStaff();
  const { data, error } = await supabase.from("vendor_admins").select("id,name,email,role,added_at").eq("vendor_id", vendorId).order("added_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VendorAdminRow[];
}

type ActionError = { error: string };

export async function addVendorAdminAction(vendorId: string, vendorName: string, name: string, email: string, role: "admin" | "staff" = "staff", vendorSubdomain?: string): Promise<(VendorAdminRow & { temporaryPassword: string }) | ActionError> {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanName || !cleanEmail) return { error: "Name and email are required." };
  const { data: existingAdmins, error: existingAdminError } = await supabase.from("vendor_admins").select("id").eq("vendor_id", vendorId).ilike("email", cleanEmail);
  if (existingAdminError) return { error: existingAdminError.message };
  if (existingAdmins?.length) return { error: `${cleanEmail} is already assigned to this vendor.` };
  const existingAuth = await findAuthUserByEmail(admin, cleanEmail);
  if (existingAuth) return { error: `An Auth account already exists for ${cleanEmail}. Edit that account from this vendor's admin controls.` };
  const password = generateTemporaryPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email: cleanEmail, password, email_confirm: true, user_metadata: { name: cleanName, vendor_id: vendorId } });
  if (createError || !created.user) return { error: createError?.message || "Couldn't create the vendor admin Auth account." };
  try {
    await syncVendorAdminProfile(admin, created.user.id, vendorId, cleanName, cleanEmail);
    const { data: row, error: rowError } = await admin.from("vendor_admins").insert({ vendor_id: vendorId, name: cleanName, email: cleanEmail, role }).select("id,name,email,role,added_at").single();
    if (rowError || !row) throw new Error(rowError?.message || "Couldn't save the vendor admin record.");
    await supabase.from("audit_log").insert({ action: "vendor_admin_added", actor, entity: vendorName, detail: `${cleanName} (${cleanEmail}) as ${role}` });
    await sendVendorAdminCredentialsChangedEmail({ to: row.email, name: row.name, storeName: vendorName, storeUrl: `https://${vendorSubdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendorSubdomain ?? "store"}.nashemann.store`, passwordChanged: true, temporaryPassword: password });
    revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
    return { ...(row as VendorAdminRow), temporaryPassword: password };
  } catch (error) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("profiles").delete().eq("id", created.user.id);
    await admin.from("platform_accounts").delete().eq("id", created.user.id);
    await admin.from("vendor_admins").delete().eq("vendor_id", vendorId).eq("email", cleanEmail);
    return { error: error instanceof Error ? error.message : "Couldn't add the vendor admin." };
  }
}

export async function updateVendorAdminAction(vendorId: string, vendorName: string, adminId: string, input: { name: string; email: string; password?: string; previousEmail?: string }, vendorSubdomain?: string): Promise<{ row: VendorAdminRow } | ActionError> {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const resolved = await resolveVendorAdmin(admin, vendorId, adminId);
  if (!resolved.ok) return { error: resolved.error };
  const { row: currentRow, user: target } = resolved;
  const cleanName = input.name.trim();
  const cleanEmail = input.email.trim().toLowerCase();
  const previousEmail = input.previousEmail?.trim().toLowerCase() ?? currentRow.email.toLowerCase();
  const password = input.password?.trim();
  if (!cleanName || !cleanEmail) return { error: "Name and email are required." };
  const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, unknown>; email_confirm?: boolean } = { user_metadata: { ...(target.user_metadata ?? {}), name: cleanName, vendor_id: vendorId } };
  if (cleanEmail !== (target.email ?? "").toLowerCase()) { authUpdate.email = cleanEmail; authUpdate.email_confirm = true; }
  if (password) authUpdate.password = password;
  const { error: updateError } = await admin.auth.admin.updateUserById(target.id, authUpdate);
  if (updateError) return { error: updateError.message };
  await syncVendorAdminProfile(admin, target.id, vendorId, cleanName, cleanEmail);
  const { data: row, error: rowError } = await admin.from("vendor_admins").update({ name: cleanName, email: cleanEmail }).eq("id", currentRow.id).eq("vendor_id", vendorId).select("id,name,email,role,added_at").single();
  if (rowError || !row) return { error: rowError?.message || "Couldn't update the vendor admin record." };
  await supabase.from("audit_log").insert({ action: "vendor_admin_credentials_updated", actor, entity: vendorName, detail: `Updated ${cleanName} (${cleanEmail})${password ? " and password" : ""}` });
  await sendVendorAdminCredentialsChangedEmail({ to: cleanEmail, name: cleanName, storeName: vendorName, storeUrl: `https://${vendorSubdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendorSubdomain ?? "store"}.nashemann.store`, passwordChanged: Boolean(password) });
  if (previousEmail !== cleanEmail) {
    await sendAccountEmailChangedNotice({ to: previousEmail, newEmail: cleanEmail, isOldAddress: true });
    await sendAccountEmailChangedNotice({ to: cleanEmail, newEmail: cleanEmail, isOldAddress: false });
  }
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return { row };
}

export async function sendVendorAdminResetLinkAction(vendorId: string, vendorName: string, adminId: string, adminEmail: string, adminName: string, vendorSubdomain: string): Promise<{ temporaryPassword: string; email: string; name: string } | ActionError> {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const resolved = await resolveVendorAdmin(admin, vendorId, adminId);
  if (!resolved.ok) return { error: resolved.error };
  const { row, user } = resolved;
  const password = generateTemporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) return { error: error.message };
  await supabase.from("audit_log").insert({ action: "vendor_admin_temporary_password_generated", actor, entity: vendorName, detail: `Generated a new temporary password for ${user.email ?? adminEmail} (${row.name || adminName})` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return { temporaryPassword: password, email: user.email ?? row.email ?? adminEmail, name: row.name || adminName };
}

export async function updateVendorControlProfileAction(vendorId: string, vendorName: string, input: { description: string; contactEmail: string; contactPhone: string; instagramUrl: string; youtubeUrl: string; feeType: "percent" | "fixed"; feeOverridePercent: number | null; feeOverrideFixedAmount: number | null }) {
  const { supabase, actor } = await requireSuperAdmin();
  const isPercent = input.feeType === "percent";
  if (isPercent && input.feeOverridePercent !== null && (!Number.isFinite(input.feeOverridePercent) || input.feeOverridePercent < 0 || input.feeOverridePercent > 100)) throw new Error("Fee override must be between 0 and 100 percent.");
  if (!isPercent && input.feeOverrideFixedAmount !== null && (!Number.isFinite(input.feeOverrideFixedAmount) || input.feeOverrideFixedAmount < 0)) throw new Error("Fixed fee amount must be zero or a positive number.");
  const { data, error } = await supabase.from("vendors").update({ description: input.description.trim(), contact_email: input.contactEmail.trim() || null, contact_phone: input.contactPhone.trim() || null, instagram_url: input.instagramUrl.trim() || null, youtube_url: input.youtubeUrl.trim() || null, fee_type: input.feeType, fee_override_percent: isPercent ? input.feeOverridePercent : null, fee_override_fixed_amount: !isPercent ? input.feeOverrideFixedAmount : null }).eq("id", vendorId).select("id");
  if (error) throw new Error(error.message);
  assertUpdated(data, "Super Admin controls");
  await supabase.from("audit_log").insert({ action: "vendor_control_profile_updated", actor, entity: vendorName, detail: "Updated Super Admin controls" });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
}

export async function revokeVendorAdminSessionsAction(vendorId: string, vendorName: string, adminId: string, adminLabel: string, adminEmail: string): Promise<{ ok: true } | ActionError> {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const resolved = await resolveVendorAdmin(admin, vendorId, adminId);
  if (!resolved.ok) return { error: resolved.error };
  const { error } = await admin.auth.admin.signOut(resolved.user.id, "global");
  if (error) return { error: error.message };
  await supabase.from("audit_log").insert({ action: "vendor_admin_sessions_revoked", actor, entity: vendorName, detail: `Revoked sessions for ${adminLabel}` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return { ok: true as const };
}

export async function removeVendorAdminAction(vendorId: string, vendorName: string, adminId: string, adminLabel: string, adminEmail?: string): Promise<{ ok: true } | ActionError> {
  const { supabase, actor } = await requireSuperAdmin();
  const admin = createAdminClient();
  const resolved = await resolveVendorAdmin(admin, vendorId, adminId);
  if (!resolved.ok) return { error: resolved.error };
  const { row, user } = resolved;
  await admin.from("vendor_admins").delete().eq("id", row.id).eq("vendor_id", vendorId);
  await Promise.all([
    admin.from("profiles").delete().eq("id", user.id),
    admin.from("platform_accounts").delete().eq("id", user.id),
    admin.auth.admin.deleteUser(user.id),
  ]);
  await supabase.from("audit_log").insert({ action: "vendor_admin_removed", actor, entity: vendorName, detail: `Removed ${adminLabel} (${adminEmail ?? row.email})` });
  revalidatePath(`/vendors/${vendorId}`); revalidatePath("/audit-log");
  return { ok: true as const };
}
