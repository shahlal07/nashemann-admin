"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";

export type SiteContentPayload = {
  hero: unknown;
  how_it_works: unknown;
  features: unknown;
  testimonials: unknown;
  rewards: unknown;
  contact: unknown;
  social_links: unknown;
  promo_popup: unknown;
  ai_support: unknown;
  terms: unknown;
};

export async function saveSiteContentAction(payload: Partial<SiteContentPayload>) {
  const { supabase, user, staffProfile } = await requireMutatingStaff();

  const rows = Object.entries(payload).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("platform_site_content").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "website_content_updated",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: "Website Content",
    detail: `Updated: ${Object.keys(payload).join(", ")}`,
  });

  revalidatePath("/website");
  revalidatePath("/audit-log");
}
