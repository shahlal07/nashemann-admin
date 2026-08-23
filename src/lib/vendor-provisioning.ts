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
export async function provisionVendorStore(_supabase: SupabaseClient, input: ProvisionInput) {
  const admin = createAdminClient();

  const subdomain = input.subdomain.trim().toLowerCase();
  if (!SLUG_PATTERN.test(subdomain)) {
    throw new Error("Subdomain must be lowercase letters, numbers, and single hyphens only.");
  }
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    throw new Error(`"${subdomain}" is a reserved subdomain.`);
  }

  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerName = input.ownerName.trim();
  const businessName = input.businessName.trim();
  if (!ownerName || !ownerEmail || !businessName) {
    throw new Error("Business name, owner name, and owner email are required.");
  }

  const { data: subdomainConflict } = await admin.from("vendors").select("id").eq("subdomain", subdomain).maybeSingle();
  if (subdomainConflict) throw new Error(`"${subdomain}" is already taken by another store.`);

  const existingAuth = await findAuthUserByEmail(admin, ownerEmail);
  if (existingAuth) throw new Error(`An account already exists for ${ownerEmail}. Use a different owner email.`);

  const { data: vendor, error: vendorError } = await admin
    .from("vendors")
    .insert({
      slug: subdomain,
      subdomain,
      custom_domain: `${subdomain}.nashemann.store`,
      name: businessName,
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
  if (vendorError || !vendor) throw new Error(vendorError?.message ?? "Couldn't create the vendor record.");

  const vendorId = vendor.id as string;

  const rollbackVendor = async () => {
    await admin.from("business_settings").delete().eq("vendor_id", vendorId);
    await admin.from("site_content").delete().eq("vendor_id", vendorId);
    await admin.from("vendors").delete().eq("id", vendorId);
  };

  try {
    const { error: settingsError } = await admin
      .from("business_settings")
      .insert({ vendor_id: vendorId, business_name: businessName });
    if (settingsError) throw new Error(`Couldn't create business settings: ${settingsError.message}`);

    const { error: contentError } = await admin
      .from("site_content")
      .insert({ vendor_id: vendorId, content: {} });
    if (contentError) throw new Error(`Couldn't create storefront content: ${contentError.message}`);

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: input.ownerPassword,
      email_confirm: true,
      user_metadata: { name: ownerName, vendor_id: vendorId },
    });
    if (createUserError || !createdUser.user) {
      throw new Error(createUserError?.message ?? "Couldn't create the vendor owner's account.");
    }

    try {
      const { error: vendorAdminError } = await admin
        .from("vendor_admins")
        .insert({ vendor_id: vendorId, name: ownerName, email: ownerEmail, role: "owner" });
      if (vendorAdminError) throw new Error(`Couldn't save the vendor admin record: ${vendorAdminError.message}`);

      const [{ error: accountError }, { error: profileError }] = await Promise.all([
        admin.from("platform_accounts").upsert({ id: createdUser.user.id, name: ownerName, email: ownerEmail, provider: "email" }),
        admin.from("profiles").upsert({ id: createdUser.user.id, role: "admin", name: ownerName, email: ownerEmail, vendor_id: vendorId }),
      ]);
      if (accountError) throw new Error(`Couldn't sync platform account: ${accountError.message}`);
      if (profileError) throw new Error(`Couldn't sync admin profile: ${profileError.message}`);
    } catch (error) {
      await admin.auth.admin.deleteUser(createdUser.user.id).catch(() => undefined);
      try {
        await admin.from("vendor_admins").delete().eq("vendor_id", vendorId).eq("email", ownerEmail);
      } catch {
        // best-effort cleanup only
      }
      throw error;
    }

    return { vendorId };
  } catch (error) {
    await rollbackVendor();
    throw error;
  }
}

export async function syncVendorStatus(supabase: SupabaseClient, vendorId: string, status: "active" | "suspended") {
  const { error } = await supabase.from("vendors").update({ status }).eq("id", vendorId);
  if (error) throw new Error(error.message);
}
