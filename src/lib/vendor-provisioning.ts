import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type ProvisionInput = {
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
  ownerPassword: string;
};

export type ProvisionResult = { vendorId: string } | { error: string };

const RESERVED_SUBDOMAINS = ["www", "admin", "api", "app", "mail", "support", "status", "superadmin"];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function temporaryVendorPassword() {
  return `Ns-${crypto.randomUUID()}-Aa1!`;
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = data.users.find((u: { email?: string }) => u.email?.toLowerCase() === target);
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

// The vendor-application form takes a free-text business_type, not a picker
// bound to category_product_schemas -- so it can't be trusted to already be
// one of the 12 real category names. A vendor provisioned with an invalid
// category can NEVER create a product (vendor-admins' product form requires
// a real category_product_schemas lookup, and blocks product creation
// outright when it fails). Rather than either hard-rejecting the approval
// (which would break most approvals tonight, since applicants type
// anything) or silently leaving a broken category, this does a
// case-insensitive exact match and falls back to 'Other' -- always a valid,
// working category; the superadmin can correct it afterward from the
// vendor detail page's existing category editor.
async function resolveCategory(admin: ReturnType<typeof createAdminClient>, requested: string): Promise<string> {
  const { data: schemas } = await admin.from("category_product_schemas").select("category");
  const names = (schemas ?? []).map((s) => s.category as string);
  const trimmed = requested.trim();
  const exact = names.find((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  return names.includes("Other") ? "Other" : names[0];
}

// Everything a brand-new vendor needs to actually work end-to-end, done
// directly against the canonical Supabase project with the service-role
// client -- this used to call a "platform-vendor-admin" edge function with
// action "create_store", but that function only exists on the old/unused
// mztayodmvdpzzwzznsvu project (production is eznxsosvsgkhexbjoolh) and,
// even there, its deployed version never actually implemented a
// "create_store" action (only list/add/update/remove for admins of an
// ALREADY-EXISTING vendor). Every application approval was silently
// failing -- the four "failed"-status rows already sitting in `vendors`
// (bloom-batter, sabz-basket, nashemann-cafe-test, pakistan) are the
// wreckage of that. Rolls back every row it created (and the auth user)
// if any step fails, so a failed attempt never again leaves an orphaned
// half-provisioned vendor.
//
// Returns { error } instead of throwing -- Next.js redacts a thrown Server
// Action error to an opaque digest in production, which would make any real
// failure during tonight's onboarding invisible to the operator.
export async function provisionVendorStore(_supabase: SupabaseClient, input: ProvisionInput): Promise<ProvisionResult> {
  const admin = createAdminClient();

  const subdomain = input.subdomain.trim().toLowerCase();
  if (!SLUG_PATTERN.test(subdomain)) {
    return { error: "Subdomain must be lowercase letters, numbers, and single hyphens only." };
  }
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return { error: `"${subdomain}" is a reserved subdomain.` };
  }

  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerName = input.ownerName.trim();
  const businessName = input.businessName.trim();
  if (!ownerName || !ownerEmail || !businessName) {
    return { error: "Business name, owner name, and owner email are required." };
  }

  const { data: subdomainConflict } = await admin.from("vendors").select("id").eq("subdomain", subdomain).maybeSingle();
  if (subdomainConflict) return { error: `"${subdomain}" is already taken by another store.` };

  const existingAuth = await findAuthUserByEmail(admin, ownerEmail);
  if (existingAuth) return { error: `An account already exists for ${ownerEmail}. Use a different owner email.` };

  const category = await resolveCategory(admin, input.category);

  const { data: vendor, error: vendorError } = await admin
    .from("vendors")
    .insert({
      slug: subdomain,
      subdomain,
      custom_domain: `${subdomain}.nashemann.store`,
      name: businessName,
      category,
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
  if (vendorError || !vendor) return { error: vendorError?.message ?? "Couldn't create the vendor record." };

  const vendorId = vendor.id as string;

  const rollbackVendor = async () => {
    await admin.from("business_settings").delete().eq("vendor_id", vendorId);
    await admin.from("site_content").delete().eq("vendor_id", vendorId);
    await admin.from("vendors").delete().eq("id", vendorId);
  };

  const { error: settingsError } = await admin
    .from("business_settings")
    .insert({ vendor_id: vendorId, business_name: businessName });
  if (settingsError) {
    await rollbackVendor();
    return { error: `Couldn't create business settings: ${settingsError.message}` };
  }

  const { error: contentError } = await admin
    .from("site_content")
    .insert({ vendor_id: vendorId, content: {} });
  if (contentError) {
    await rollbackVendor();
    return { error: `Couldn't create storefront content: ${contentError.message}` };
  }

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: input.ownerPassword,
    email_confirm: true,
    user_metadata: { name: ownerName, vendor_id: vendorId },
  });
  if (createUserError || !createdUser.user) {
    await rollbackVendor();
    return { error: createUserError?.message ?? "Couldn't create the vendor owner's account." };
  }

  const rollbackUser = async () => {
    // platform_accounts/profiles reference auth.users with no ON DELETE
    // CASCADE -- deleting the Auth user first (the old order) left the FK-
    // constrained delete failing, which aborted the auth-user delete itself
    // and permanently burned the owner's email (the retry precheck above
    // would then find the orphaned Auth user forever). Delete the
    // referencing rows first, then the Auth user.
    await admin.from("platform_accounts").delete().eq("id", createdUser.user.id);
    await admin.from("profiles").delete().eq("id", createdUser.user.id);
    await admin.from("vendor_admins").delete().eq("vendor_id", vendorId).eq("email", ownerEmail);
    await admin.auth.admin.deleteUser(createdUser.user.id);
  };

  const { error: vendorAdminError } = await admin
    .from("vendor_admins")
    .insert({ vendor_id: vendorId, name: ownerName, email: ownerEmail, role: "owner" });
  if (vendorAdminError) {
    await rollbackUser();
    await rollbackVendor();
    return { error: `Couldn't save the vendor admin record: ${vendorAdminError.message}` };
  }

  const [{ error: accountError }, { error: profileError }] = await Promise.all([
    admin.from("platform_accounts").upsert({ id: createdUser.user.id, name: ownerName, email: ownerEmail, provider: "email" }),
    admin.from("profiles").upsert({ id: createdUser.user.id, role: "admin", name: ownerName, email: ownerEmail, vendor_id: vendorId }),
  ]);
  if (accountError || profileError) {
    await rollbackUser();
    await rollbackVendor();
    return { error: accountError?.message ?? profileError?.message ?? "Couldn't finish setting up the vendor admin account." };
  }

  return { vendorId };
}

export async function syncVendorStatus(supabase: SupabaseClient, vendorId: string, status: "active" | "suspended") {
  const { error } = await supabase.from("vendors").update({ status }).eq("id", vendorId);
  if (error) throw new Error(error.message);
}
