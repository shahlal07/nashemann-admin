"use server";

import { revalidatePath } from "next/cache";
import { sendAccountEmailChangedNotice, sendVendorAdminCredentialsChangedEmail, sendVendorAdminStoreNoticeEmail } from "@/lib/email";
import { requireFinanceStaff, requireMutatingStaff, requireSuperAdmin } from "@/lib/authz";
import { syncVendorStatus } from "@/lib/vendor-provisioning";

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
  theme: { accentFrom: string; accentTo: string; logoEmoji: string; logoUrl: string | null; font: string }
) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase
    .from("vendors")
    .update({
      theme_accent_from: theme.accentFrom,
      theme_accent_to: theme.accentTo,
      theme_logo_emoji: theme.logoEmoji,
      theme_logo_url: theme.logoUrl,
      theme_font: theme.font,
    })
    .eq("id", vendorId);
  if (error) throw new Error(error.message);

  const response = await fetch(vendorPlatformUrl("/api/platform/theme"), {
    method: "POST",
    headers: { "content-type": "application/json", "x-nashemann-provisioning-secret": vendorPlatformSecret() },
    body: JSON.stringify({ vendorId, accentFrom: theme.accentFrom, accentTo: theme.accentTo, logoEmoji: theme.logoEmoji, logoUrl: theme.logoUrl, font: theme.font }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Couldn't sync the storefront theme.");

  await supabase.from("audit_log").insert({
    action: "vendor_theme_updated",
    actor,
    entity: vendorName,
    detail: `Synced storefront theme: accent ${theme.accentFrom} → ${theme.accentTo}, font ${theme.font}`,
  });
  const { data: themedVendor } = await supabase.from("vendors").select("subdomain").eq("id", vendorId).single();
  const themedAdmins = await getVendorAdminsAction(vendorId);
  const themedSubdomain = themedVendor?.subdomain ?? "store";
  await Promise.all(themedAdmins.filter((a) => a.email).map((a) => sendVendorAdminStoreNoticeEmail({
    to: a.email, name: a.name, storeName: vendorName, subject: `${vendorName} storefront design updated`,
    message: "The Nashemann Super Admin updated your storefront branding. The new design is now available on the live store.",
    storeUrl: `https://${themedSubdomain}.nashemann.store`, adminUrl: `https://admin.${themedSubdomain}.nashemann.store`,
  })));

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}

export async function toggleVendorStatusAction(vendorId:string,vendorName:string,nextStatus:"active"|"suspended"){
 const {supabase,actor}=await requireMutatingStaff(); await syncVendorStatus(vendorId,nextStatus);
 const {error}=await supabase.from("vendors").update({status:nextStatus}).eq("id",vendorId); if(error) throw new Error(error.message);
 await supabase.from("audit_log").insert({action:nextStatus==="suspended"?"vendor_suspended":"vendor_reactivated",actor,entity:vendorName,detail:nextStatus==="suspended"?"Suspended on platform and storefront":"Reactivated on platform and storefront"});
 const { data: statusVendor } = await supabase.from("vendors").select("subdomain").eq("id", vendorId).single();
 const statusAdmins = await getVendorAdminsAction(vendorId);
 const statusSubdomain = statusVendor?.subdomain ?? "store";
 await Promise.all(statusAdmins.filter((a) => a.email).map((a) => sendVendorAdminStoreNoticeEmail({
   to:a.email,name:a.name,storeName:vendorName,subject:`${vendorName} store ${nextStatus === "suspended" ? "suspended" : "reactivated"}`,
   message: nextStatus === "suspended" ? "The Nashemann Super Admin has temporarily suspended this storefront. Customer access is disabled until it is reactivated." : "The Nashemann Super Admin has reactivated this storefront. Customer access is live again.",
   storeUrl:`https://${statusSubdomain}.nashemann.store`,adminUrl:`https://admin.${statusSubdomain}.nashemann.store`
 })));
 revalidatePath(`/vendors/${vendorId}`); revalidatePath("/vendors"); revalidatePath("/audit-log");
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

export async function updateVendorCustomDomainAction(vendorId: string, vendorName: string, subdomain: string, customDomain: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const domain = customDomain.trim().toLowerCase();
  if (domain && domain.includes("nashemann.store")) throw new Error("Use the vendor subdomain for nashemann.store domains; custom domains must be external.");
  if (domain && !/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) throw new Error("Enter a valid custom domain.");
  const response = await fetch(vendorPlatformUrl("/api/platform/domain"), { method: "POST", headers: { "content-type": "application/json", "x-nashemann-provisioning-secret": vendorPlatformSecret() }, body: JSON.stringify({ vendorId, subdomain, customDomain: domain || null }), cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as { error?: string; customDomain?: string };
  if (!response.ok) throw new Error(payload.error ?? "The vendor storefront rejected the custom domain.");
  const { error } = await supabase.from("vendors").update({ custom_domain: payload.customDomain ?? (domain || `${subdomain}.nashemann.store`) }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: "vendor_custom_domain_changed", actor, entity: vendorName, detail: `Custom domain set to ${payload.customDomain ?? (domain || `${subdomain}.nashemann.store`)}. DNS/Vercel verification is required before traffic can use it.` });
  const admins = await getVendorAdminsAction(vendorId);
  const activeDomain = payload.customDomain ?? (domain || `${subdomain}.nashemann.store`);
  await Promise.all(admins.filter((a) => a.email).map((a) => sendVendorAdminStoreNoticeEmail({ to: a.email, name: a.name, storeName: vendorName, subject: `${vendorName} custom domain updated`, message: `The Nashemann Super Admin updated your custom storefront domain to ${activeDomain}. DNS and SSL verification may be required before it becomes active.`, storeUrl: `https://${activeDomain}`, adminUrl: `https://admin.${subdomain}.nashemann.store` })));
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

  const domainResponse = await fetch(vendorPlatformUrl("/api/platform/domain"), {
    method: "POST",
    headers: { "content-type": "application/json", "x-nashemann-provisioning-secret": vendorPlatformSecret() },
    body: JSON.stringify({ vendorId, subdomain: slug }),
    cache: "no-store",
  });
  const domainPayload = (await domainResponse.json().catch(() => ({}))) as { error?: string };
  if (!domainResponse.ok) throw new Error(domainPayload.error ?? "The vendor storefront rejected the new subdomain.");

  const { error } = await supabase.from("vendors").update({ subdomain: slug, custom_domain: `${slug}.nashemann.store` }).eq("id", vendorId);
  if (error) {
    await fetch(vendorPlatformUrl("/api/platform/domain"), {
      method: "POST",
      headers: { "content-type": "application/json", "x-nashemann-provisioning-secret": vendorPlatformSecret() },
      body: JSON.stringify({ vendorId, subdomain: previousSlug }),
      cache: "no-store",
    }).catch(() => undefined);
    throw new Error(error.code === "23505" ? `"${slug}" is already taken by another store.` : error.message);
  }

  await supabase.from("audit_log").insert({
    action: "vendor_slug_changed",
    actor,
    entity: vendorName,
    detail: `Store subdomain changed from "${previousSlug}" to "${slug}" (storefront: ${slug}.nashemann.store, admin: admin.${slug}.nashemann.store)`,
  });
  const slugAdmins = await getVendorAdminsAction(vendorId);
  await Promise.all(slugAdmins.filter((a) => a.email).map((a) => sendVendorAdminStoreNoticeEmail({
    to:a.email,name:a.name,storeName:vendorName,subject:`${vendorName} store URL changed`,
    message:`The Nashemann Super Admin changed your store URL from ${previousSlug}.nashemann.store to ${slug}.nashemann.store.`,
    storeUrl:`https://${slug}.nashemann.store`,adminUrl:`https://admin.${slug}.nashemann.store`
  })));
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/vendors");
  revalidatePath("/audit-log");
  return slug;
}

function vendorPlatformUrl(path: string): string {
  const configured = process.env.VENDOR_PROVISION_URL;
  if (!configured) {
    throw new Error("Vendor provisioning is not configured. Set VENDOR_PROVISION_URL on nashemann-admin.");
  }
  const url = new URL(configured);
  url.pathname = path;
  url.search = "";
  return url.toString();
}

function vendorPlatformSecret(): string {
  const secret = process.env.VENDOR_PROVISION_SECRET;
  if (!secret) throw new Error("Vendor provisioning is not configured. Set VENDOR_PROVISION_SECRET on nashemann-admin.");
  return secret;
}

export type VendorAdminRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  added_at: string;
};

export async function getVendorAdminsAction(vendorId: string): Promise<VendorAdminRow[]> {
  await requireMutatingStaff();
  const response = await fetch(vendorPlatformUrl("/api/platform/admins") + `?vendorId=${encodeURIComponent(vendorId)}`, {
    cache: "no-store",
    headers: { "x-nashemann-provisioning-secret": vendorPlatformSecret() },
  });
  const payload = (await response.json().catch(() => ({}))) as { admins?: VendorAdminRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Couldn't load vendor admins.");
  return payload.admins ?? [];
}

export async function addVendorAdminAction(vendorId: string, vendorName: string, name: string, email: string, role: "admin" | "staff" = "staff", vendorSubdomain?: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const response = await fetch(vendorPlatformUrl("/api/platform/admins"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nashemann-provisioning-secret": vendorPlatformSecret(),
    },
    body: JSON.stringify({ action: "add", vendorId, name: name.trim(), email: email.trim(), role }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    admin?: VendorAdminRow;
    temporaryPassword?: string;
    error?: string;
  };
  if (!response.ok || !payload.admin) throw new Error(payload.error ?? "Couldn't add vendor admin.");

  // vendor_admins is a platform contact cache only (notifications/settlement
  // emails). It is NOT the source of truth for vendor authentication.
  await supabase.from("vendor_admins").insert({
    vendor_id: vendorId,
    name: payload.admin.name,
    email: payload.admin.email,
    role: role === "admin" ? "owner" : "staff",
  });

  await supabase.from("audit_log").insert({
    action: "vendor_admin_added",
    actor,
    entity: vendorName,
    detail: `Added ${name.trim()} (${email.trim()}) as ${role === "admin" ? "admin" : "staff"} in the live vendor admin system`,
  });

  await sendVendorAdminCredentialsChangedEmail({ to: payload.admin.email, name: payload.admin.name, storeName: vendorName, storeUrl: `https://${vendorSubdomain ?? "store"}.nashemann.store`, adminUrl: `https://admin.${vendorSubdomain ?? "store"}.nashemann.store`, passwordChanged: true, temporaryPassword: payload.temporaryPassword });
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
  return { ...payload.admin, temporaryPassword: payload.temporaryPassword };
}

export async function updateVendorAdminAction(
  vendorId: string,
  vendorName: string,
  adminId: string,
  input: { name: string; email: string; password?: string; previousEmail?: string },
  vendorSubdomain?: string,
) {
  const { actor, supabase } = await requireSuperAdmin();
  const response = await fetch(vendorPlatformUrl('/api/platform/admins'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-nashemann-provisioning-secret': vendorPlatformSecret() },
    body: JSON.stringify({ action: 'update', vendorId, userId: adminId, name: input.name.trim(), email: input.email.trim(), password: input.password?.trim() || undefined }),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as { admin?: VendorAdminRow; passwordChanged?: boolean; error?: string };
  if (!response.ok || !payload.admin) throw new Error(payload.error ?? "Couldn't update vendor admin credentials.");

  await supabase.from('vendor_admins').update({ name: payload.admin!.name, email: payload.admin!.email }).eq('vendor_id', vendorId).eq('email', input.previousEmail?.trim() || input.email.trim());
  await supabase.from('audit_log').insert({
    action: 'vendor_admin_credentials_updated', actor, entity: vendorName,
    detail: `Updated ${payload.admin!.name} (${payload.admin!.email})${payload.passwordChanged ? ' and password' : ''}`,
  });
  await sendVendorAdminCredentialsChangedEmail({
    to: payload.admin.email, name: payload.admin.name, storeName: vendorName,
    storeUrl: `https://${vendorSubdomain ?? "store"}.nashemann.store`,
    adminUrl: `https://admin.${vendorSubdomain ?? "store"}.nashemann.store`,
    passwordChanged: Boolean(payload.passwordChanged),
  });
  if (input.previousEmail && input.previousEmail.trim().toLowerCase() !== payload.admin.email.trim().toLowerCase()) {
    await sendAccountEmailChangedNotice({ to: input.previousEmail.trim(), newEmail: payload.admin.email, isOldAddress: true });
  }
  if (input.previousEmail && input.previousEmail.trim().toLowerCase() !== payload.admin.email.trim().toLowerCase()) {
    await sendAccountEmailChangedNotice({ to: payload.admin.email, newEmail: payload.admin.email, isOldAddress: false });
  }
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath('/audit-log');
  return payload.admin;
}


export async function updateVendorControlProfileAction(
  vendorId: string,
  vendorName: string,
  input: { description: string; contactEmail: string; contactPhone: string; instagramUrl: string; youtubeUrl: string; feeOverridePercent: number | null },
) {
  const { supabase, actor } = await requireSuperAdmin();
  if (input.feeOverridePercent !== null && (!Number.isFinite(input.feeOverridePercent) || input.feeOverridePercent < 0 || input.feeOverridePercent > 100)) {
    throw new Error("Fee override must be between 0 and 100 percent.");
  }
  const { error } = await supabase.from("vendors").update({
    description: input.description.trim(),
    contact_email: input.contactEmail.trim() || null,
    contact_phone: input.contactPhone.trim() || null,
    instagram_url: input.instagramUrl.trim() || null,
    youtube_url: input.youtubeUrl.trim() || null,
    fee_override_percent: input.feeOverridePercent,
  }).eq("id", vendorId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ action: "vendor_control_profile_updated", actor, entity: vendorName, detail: `Updated contact, social, description and fee override (${input.feeOverridePercent === null ? "standard" : `${input.feeOverridePercent}%`})` });
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}

export async function revokeVendorAdminSessionsAction(vendorId: string, vendorName: string, adminId: string, adminLabel: string, adminEmail: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const response = await fetch(vendorPlatformUrl("/api/platform/admins"), {
    method: "POST",
    headers: { "content-type": "application/json", "x-nashemann-provisioning-secret": vendorPlatformSecret() },
    body: JSON.stringify({ action: "revoke_sessions", vendorId, userId: adminId }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Couldn't revoke admin sessions.");
  await supabase.from("audit_log").insert({ action: "vendor_admin_sessions_revoked", actor, entity: vendorName, detail: `Revoked all active sessions for ${adminLabel}` });
  await sendVendorAdminStoreNoticeEmail({ to: adminEmail, name: adminLabel, storeName: vendorName, subject: `${vendorName} admin sessions revoked`, message: "A Nashemann Super Admin revoked all active sessions for this vendor admin account. You will need to sign in again.", storeUrl: "https://store.nashemann.store", adminUrl: "https://admin.nashemann.store" }).catch(() => {});
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}

export async function removeVendorAdminAction(vendorId: string, vendorName: string, adminId: string, adminLabel: string, adminEmail?: string) {
  const { supabase, actor } = await requireSuperAdmin();
  const response = await fetch(vendorPlatformUrl("/api/platform/admins"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nashemann-provisioning-secret": vendorPlatformSecret(),
    },
    body: JSON.stringify({ action: "remove", vendorId, userId: adminId }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Couldn't remove vendor admin.");

  if (adminEmail) {
    await supabase.from("vendor_admins").delete().eq("vendor_id", vendorId).eq("email", adminEmail);
  }

  await supabase.from("audit_log").insert({
    action: "vendor_admin_removed",
    actor,
    entity: vendorName,
    detail: `Removed ${adminLabel} from the live vendor admin system`,
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/audit-log");
}
