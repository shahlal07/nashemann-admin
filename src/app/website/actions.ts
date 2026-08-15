"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
};

export async function saveSiteContentAction(payload: Partial<SiteContentPayload>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) throw new Error("Not authorized");

  const rows = Object.entries(payload).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);

  const { data: staffProfile } = await supabase
    .from("staff_profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.from("audit_log").insert({
    action: "website_content_updated",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: "Website Content",
    detail: `Updated: ${Object.keys(payload).join(", ")}`,
  });

  revalidatePath("/website");
  revalidatePath("/audit-log");
}
