import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

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

export function temporaryVendorPassword() {
  return `Ns-${crypto.randomUUID()}-Aa1!`;
}

export async function provisionVendorStore(supabase: SupabaseClient, input: ProvisionInput) {
  const { data, error } = await supabase.functions.invoke("platform-vendor-admin", { body: { action: "create_store", ...input } });
  if (error) throw new Error(error.message || "Vendor provisioning failed.");
  if (!data?.vendorId || data.error) throw new Error(data?.error ?? "Vendor provisioning failed.");
  return { vendorId: data.vendorId as string };
}

export async function syncVendorStatus(supabase: SupabaseClient, vendorId: string, status: "active" | "suspended") {
  const { error } = await supabase.from("vendors").update({ status }).eq("id", vendorId);
  if (error) throw new Error(error.message);
}
